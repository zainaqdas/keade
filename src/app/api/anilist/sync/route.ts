import { NextRequest, NextResponse } from 'next/server';
import { syncProgress } from '@/lib/anilist';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('anilist_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated with AniList' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mediaId, progress, totalEpisodes } = body;

    if (typeof mediaId !== 'number' || typeof progress !== 'number') {
      return NextResponse.json({ error: 'mediaId and progress are required' }, { status: 400 });
    }

    const result = await syncProgress(token, mediaId, progress, totalEpisodes);
    return NextResponse.json({ entry: result });
  } catch (err) {
    console.error('[AniList Sync Error]', err);
    const message = err instanceof Error ? err.message : 'Failed to sync with AniList';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
