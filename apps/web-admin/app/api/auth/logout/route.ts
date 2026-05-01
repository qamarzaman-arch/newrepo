import { NextRequest, NextResponse } from 'next/server';

/**
 * QA C5 / C6: counterpart to /api/auth/login — clears the HttpOnly cookie.
 * The page can keep calling backend `/auth/logout` (to invalidate the
 * server-side session record) and then redirect, but the actual cookie
 * removal must happen in a Set-Cookie response from the same origin, which
 * is what this handler does.
 */
const COOKIE_NAME = 'auth_token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function apiBase(): string {
  const u = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  return u.replace(/\/+$/, '');
}

export async function POST(req: NextRequest) {
  // Best-effort upstream invalidation; ignore failure so logout always succeeds locally.
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    fetch(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
