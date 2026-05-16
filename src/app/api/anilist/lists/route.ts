import { NextRequest, NextResponse } from 'next/server';
import { fetchUser, fetchUserWithLists } from '@/lib/anilist';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('anilist_token')?.value;
  if (!token) {
    return NextResponse.json({ user: null, lists: [], error: 'Not connected to AniList' });
  }

  // First try to get user info — if this fails, the token is invalid
  let user;
  try {
    user = await fetchUser(token);
  } catch (err) {
    console.error('[AniList Lists Error - invalid token]', err);
    // Token is invalid — clear it
    const response = NextResponse.json({ user: null, lists: [], error: 'AniList session expired. Please reconnect.' });
    response.cookies.set('anilist_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  // Try to fetch lists — if this fails, return user info + empty lists
  try {
    const { user: userWithStats, lists } = await fetchUserWithLists(token);
    return NextResponse.json({ user: userWithStats, lists });
  } catch (err) {
    console.error('[AniList Lists Error - failed to load lists]', err);
    // Token is still valid, but lists failed — return what we have
    return NextResponse.json({
      user, // basic AniListUser from fetchUser() — no stats, but good for degraded mode
      lists: [],
      warning: 'Could not load your anime lists. Please try again later.',
    });
  }
}
