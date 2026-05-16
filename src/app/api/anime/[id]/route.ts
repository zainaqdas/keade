import { NextRequest, NextResponse } from 'next/server';
import { getAnimeDetail } from '@/lib/anilist/queries';
import { getCachedAnime, setCachedAnime, isCacheValid } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get('nocache') === 'true';

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid anime ID' },
        { status: 400 }
      );
    }

    if (!bypassCache) {
      const cached = getCachedAnime(id);
      if (isCacheValid(cached, 24 * 60 * 60 * 1000)) {
        return NextResponse.json({
          data: JSON.parse(cached!.data),
          cached: true,
          cachedAt: cached!.cached_at,
        });
      }
    }

    const data = await getAnimeDetail(id);
    
    setCachedAnime(id, JSON.stringify(data));

    return NextResponse.json({
      data,
      cached: false,
    });
  } catch (error) {
    console.error('Anime detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anime details' },
      { status: 500 }
    );
  }
}
