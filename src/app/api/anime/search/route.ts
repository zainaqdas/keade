import { NextRequest, NextResponse } from 'next/server';
import { searchAnime } from '@/lib/anilist/queries';
import { getCachedSearch, setCachedSearch, isCacheValid } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const bypassCache = searchParams.get('nocache') === 'true';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const cacheKey = `search_${query.toLowerCase()}_${page}_${perPage}`;

    if (!bypassCache) {
      const cached = getCachedSearch(cacheKey);
      if (isCacheValid(cached, 24 * 60 * 60 * 1000)) {
        return NextResponse.json({
          ...JSON.parse(cached!.data),
          cached: true,
          cachedAt: cached!.cached_at,
        });
      }
    }

    const data = await searchAnime(query, page, perPage);
    
    setCachedSearch(cacheKey, JSON.stringify(data));

    return NextResponse.json({
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error('Anime search error:', error);
    return NextResponse.json(
      { error: 'Failed to search anime' },
      { status: 500 }
    );
  }
}
