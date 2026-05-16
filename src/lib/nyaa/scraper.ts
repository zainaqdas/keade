import axios from 'axios';
import * as cheerio from 'cheerio';
import { NyaaTorrent } from '@/lib/types';
import { extractEpisodeNumber, isBatchTorrent } from './parser';

const BASE_URL = 'https://nyaa.si';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
});

function extractTorrentsFromHTML(data: string): NyaaTorrent[] {
  const $ = cheerio.load(data);
  const results: NyaaTorrent[] = [];

  $('tr').slice(1).each(function () {
    const getCell = (n: number) => $(this).find(`td:nth-child(${n})`);

    // Get magnet link and hash
    let magnetLink = getCell(3).find('a:nth-child(2)').attr('href');
    if (!magnetLink) {
      magnetLink = getCell(3).find('a:nth-child(1)').attr('href');
    }

    if (!magnetLink) return; // Skip if no magnet link

    const hashMatch = magnetLink.match(/btih:([a-fA-F0-9]+)/);
    if (!hashMatch) return;

    const hash = hashMatch[1].toLowerCase();
    const name = getCell(2).find('a:not(.comments)').text().trim();
    const torrentLink = getCell(3).find('a:nth-child(1)').attr('href');

    const torrent: NyaaTorrent = {
      id: getCell(2).find('a:not(.comments)').attr('href')?.replace('/view/', '') || '',
      name,
      hash,
      date: new Date(parseInt(getCell(5).attr('data-timestamp') || '0') * 1000).toISOString(),
      filesize: getCell(4).text().trim(),
      category: getCell(1).find('a').attr('href')?.replace('/?c=', '')?.replace(/\d{1,2}$/, '0') || '',
      sub_category: getCell(1).find('a').attr('href')?.replace('/?c=', '') || '',
      magnet: magnetLink,
      torrent: torrentLink ? (torrentLink.startsWith('http') ? torrentLink : BASE_URL + torrentLink) : '',
      seeders: getCell(6).text().trim(),
      leechers: getCell(7).text().trim(),
      completed: getCell(8).text().trim(),
      status: $(this).attr('class') || '',
      episode: extractEpisodeNumber(name),
    };

    results.push(torrent);
  });

  return results;
}

export async function searchTorrents(
  query: string,
  options: {
    category?: string;
    filter?: number;
    page?: number;
    maxResults?: number;
  } = {}
): Promise<{ torrents: NyaaTorrent[]; totalPages: number }> {
  const { category = '1_0', filter = 0, page = 1, maxResults = 200 } = options;

  const allTorrents: NyaaTorrent[] = [];
  let currentPage = page;
  let totalPages = 1;

  while (allTorrents.length < maxResults) {
    const { data } = await client.get('/', {
      params: {
        f: filter,
        c: category,
        q: query,
        p: currentPage,
        s: 'id',
        o: 'desc',
      },
    });

    const $ = cheerio.load(data);
    
    // Get total pages from pagination
    const paginationText = $('ul.pagination li:nth-last-child(2) a').text();
    totalPages = parseInt(paginationText) || 1;

    const pageTorrents = extractTorrentsFromHTML(data);
    if (pageTorrents.length === 0) break;

    allTorrents.push(...pageTorrents);

    if (currentPage >= totalPages || currentPage >= 5) break;
    currentPage++;
  }

  return {
    torrents: allTorrents.slice(0, maxResults),
    totalPages,
  };
}

export async function searchTorrentsByEpisode(
  animeTitle: string,
  episode: number,
  synonyms: string[] = []
): Promise<NyaaTorrent[]> {
  const seenHashes = new Set<string>();
  const results: NyaaTorrent[] = [];

  // Build targeted search queries for this specific episode
  const titles = [animeTitle, ...synonyms.slice(0, 3)];
  
  for (const title of titles) {
    const cleanTitle = title
      .replace(/[!@#$%^&*(),.?":{}|<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanTitle) continue;

    // Try different query formats
    const queries = [
      `${cleanTitle} ${episode}`,
      `${cleanTitle} Episode ${episode}`,
      `${cleanTitle} - ${episode}`,
    ];

    for (const q of queries) {
      try {
        const { torrents } = await searchTorrents(q, { maxResults: 30 });
        
        for (const torrent of torrents) {
          if (!seenHashes.has(torrent.hash)) {
            seenHashes.add(torrent.hash);
            // Verify the episode number matches
            const ep = torrent.episode ?? extractEpisodeNumber(torrent.name);
            if (ep === episode && !isBatchTorrent(torrent.name)) {
              results.push(torrent);
            }
          }
        }
      } catch (error) {
        console.warn(`Episode search failed for "${q}":`, error);
      }
    }

    if (results.length > 0) break; // Found results for this title, stop trying
  }

  return results;
}

export async function searchTorrentsByAnime(
  animeTitle: string,
  synonyms: string[] = []
): Promise<NyaaTorrent[]> {
  // Build search queries - try the main title first
  const searchTerms = [
    animeTitle,
    ...synonyms.slice(0, 3), // Try some synonyms
  ];

  // Remove special characters and common suffixes
  const cleanTitle = animeTitle
    .replace(/[!@#$%^&*(),.?":{}|<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Try different search strategies
  const searches = [
    { q: cleanTitle, maxResults: 100 },
    { q: cleanTitle.replace(/['']/g, ''), maxResults: 100 },
  ];

  const allTorrents: NyaaTorrent[] = [];
  const seenHashes = new Set<string>();

  for (const search of searches) {
    try {
      const { torrents } = await searchTorrents(search.q, { maxResults: search.maxResults });
      
      for (const torrent of torrents) {
        if (!seenHashes.has(torrent.hash)) {
          seenHashes.add(torrent.hash);
          allTorrents.push(torrent);
        }
      }
    } catch (error) {
      console.warn(`Search failed for "${search.q}":`, error);
    }

    if (allTorrents.length >= 50) break;
  }

  // Sort by episode number (null/undefined episodes/batches at the end)
  allTorrents.sort((a, b) => {
    const epA = a.episode ?? -1;
    const epB = b.episode ?? -1;
    if (epA === -1 && epB === -1) return 0;
    if (epA === -1) return 1;
    if (epB === -1) return -1;
    return epA - epB;
  });

  return allTorrents;
}

