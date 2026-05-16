import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/anilist';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url));
  }

  try {
    const { access_token } = await exchangeCodeForToken(code);

    // Store the access token in an httpOnly cookie
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('anilist_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year (AniList tokens don't expire)
    });

    return response;
  } catch (err) {
    console.error('[AniList Callback Error]', err);
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  }
}
