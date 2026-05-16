import { NextRequest, NextResponse } from 'next/server';
import { fetchMediaListEntry, saveMediaListEntry, fetchUser } from '@/lib/anilist';

/** GET /api/anilist/entry?mediaId=X — check if anime is in user's list */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('anilist_token')?.value;
  if (!token) {
    return NextResponse.json({ entry: null });
  }

  const mediaId = parseInt(req.nextUrl.searchParams.get('mediaId') || '');
  if (!mediaId || isNaN(mediaId)) {
    return NextResponse.json({ error: 'Invalid mediaId' }, { status: 400 });
  }

  // Verify token is valid first
  try {
    await fetchUser(token);
  } catch {
    const response = NextResponse.json({ entry: null, error: 'Session expired' });
    response.cookies.set('anilist_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  try {
    const entry = await fetchMediaListEntry(token, mediaId);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error('[AniList Entry Error]', err);
    return NextResponse.json({ entry: null, error: 'Failed to fetch list entry' });
  }
}

/** POST /api/anilist/entry — add/update anime in user's list */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('anilist_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not connected to AniList' }, { status: 401 });
  }

  let body: { mediaId: number; status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { mediaId, status } = body;
  if (!mediaId || !status) {
    return NextResponse.json({ error: 'mediaId and status are required' }, { status: 400 });
  }

  const validStatuses = ['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REPEATING'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Verify token is valid first
  try {
    await fetchUser(token);
  } catch {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
    response.cookies.set('anilist_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  try {
    const entry = await saveMediaListEntry(token, mediaId, status);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error('[AniList Save Entry Error]', err);
    return NextResponse.json({ error: 'Failed to save list entry' }, { status: 500 });
  }
}
