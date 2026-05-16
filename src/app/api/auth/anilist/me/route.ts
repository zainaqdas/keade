import { NextRequest, NextResponse } from 'next/server';
import { fetchUser } from '@/lib/anilist';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('anilist_token')?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await fetchUser(token);
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[AniList Me Error]', err);
    // Token may be expired/invalid — clear it
    const response = NextResponse.json({ user: null });
    response.cookies.set('anilist_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }
}
