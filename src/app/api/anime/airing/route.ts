import { NextRequest, NextResponse } from 'next/server';
import { getAiringAnime } from '@/lib/anilist/queries';
import { getCachedSearch, setCachedSearch, isCacheValid } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');
    const bypassCache = searchParams.get('nocache') === 'true';

    const cacheKey = `airing_${page}_${perPage}`;

    if (!bypassCache) {
      const cached = getCachedSearch(cacheKey);
      if (isCacheValid(cached, 2 * 60 * 60 * 1000)) {
        return NextResponse.json({
          ...JSON.parse(cached!.data),
          cached: true,
          cachedAt: cached!.cached_at,
        });
      }
    }

    const data = await getAiringAnime(page, perPage);
    
    setCachedSearch(cacheKey, JSON.stringify(data));

    return NextResponse.json({
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error('Airing anime error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airing anime' },
      { status: 500 }
    );
  }
}
