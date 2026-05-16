import { NextRequest, NextResponse } from 'next/server';
import { searchTorrentsByAnime } from '@/lib/nyaa/scraper';
import { getCachedTorrents, setCachedTorrents, isCacheValid } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const bypassCache = searchParams.get('nocache') === 'true';
    const synonymsParam = searchParams.get('synonyms') || '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const synonyms = synonymsParam ? synonymsParam.split(',').map(s => s.trim()) : [];
    const cacheKey = `torrents_${query.toLowerCase()}`;

    if (!bypassCache) {
      const cached = getCachedTorrents(cacheKey);
      if (isCacheValid(cached, 30 * 60 * 1000)) { // 30 min cache for torrents
        return NextResponse.json({
          torrents: JSON.parse(cached!.data),
          cached: true,
          cachedAt: cached!.cached_at,
        });
      }
    }

    const torrents = await searchTorrentsByAnime(query, synonyms);
    
    setCachedTorrents(cacheKey, JSON.stringify(torrents));

    return NextResponse.json({
      torrents,
      cached: false,
      total: torrents.length,
    });
  } catch (error) {
    console.error('Torrent search error:', error);
    return NextResponse.json(
      { error: 'Failed to search torrents' },
      { status: 500 }
    );
  }
}
