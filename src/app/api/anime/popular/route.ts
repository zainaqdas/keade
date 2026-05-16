import { NextRequest, NextResponse } from 'next/server';
import { getPopularAnime } from '@/lib/anilist/queries';
import { getCachedSearch, setCachedSearch, isCacheValid } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');
    const bypassCache = searchParams.get('nocache') === 'true';

    const cacheKey = `popular_${page}_${perPage}`;

    if (!bypassCache) {
      const cached = getCachedSearch(cacheKey);
      if (isCacheValid(cached, 4 * 60 * 60 * 1000)) {
        return NextResponse.json({
          ...JSON.parse(cached!.data),
          cached: true,
          cachedAt: cached!.cached_at,
        });
      }
    }

    const data = await getPopularAnime(page, perPage);
    
    setCachedSearch(cacheKey, JSON.stringify(data));

    return NextResponse.json({
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error('Popular anime error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular anime' },
      { status: 500 }
    );
  }
}
