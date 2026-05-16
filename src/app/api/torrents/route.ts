import { NextRequest, NextResponse } from 'next/server';
import { searchTorrentsByAnime, searchTorrentsByEpisode } from '@/lib/nyaa/scraper';
import { getCachedTorrents, setCachedTorrents, isCacheValid } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const episodeParam = searchParams.get('episode') || '';
    const bypassCache = searchParams.get('nocache') === 'true';
    const synonymsParam = searchParams.get('synonyms') || '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const synonyms = synonymsParam ? synonymsParam.split(',').map(s => s.trim()) : [];

    // Episode-specific search (on-demand, targeted)
    if (episodeParam) {
      const episode = parseInt(episodeParam);
      if (isNaN(episode) || episode < 1) {
        return NextResponse.json(
          { error: 'Invalid episode number' },
          { status: 400 }
        );
      }

      const cacheKey = `episode_${query.toLowerCase()}_${episode}`;

      if (!bypassCache) {
        const cached = getCachedTorrents(cacheKey);
        if (isCacheValid(cached, 30 * 60 * 1000)) {
          return NextResponse.json({
            torrents: JSON.parse(cached!.data),
            episode,
            cached: true,
          });
        }
      }

      const torrents = await searchTorrentsByEpisode(query, episode, synonyms);
      setCachedTorrents(cacheKey, JSON.stringify(torrents));

      return NextResponse.json({
        torrents,
        episode,
        cached: false,
        total: torrents.length,
      });
    }

    // Full anime search (used for batch/initial load)
    const cacheKey = `torrents_${query.toLowerCase()}`;

    if (!bypassCache) {
      const cached = getCachedTorrents(cacheKey);
      if (isCacheValid(cached, 30 * 60 * 1000)) {
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
