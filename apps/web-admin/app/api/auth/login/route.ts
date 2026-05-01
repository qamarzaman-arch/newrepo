import { NextRequest, NextResponse } from 'next/server';

/**
 * QA C5 / C6: server-side login handler. The login page POSTs to this route
 * (same-origin) instead of calling the backend directly. The handler proxies
 * the credentials to the backend, then issues a TRUE HttpOnly cookie on the
 * response — JS can never read this token, so an XSS payload can't exfiltrate
 * it.
 *
 * The cookie is set with HttpOnly + Secure (when on HTTPS) + SameSite=Strict
 * + Path=/. Lifetime mirrors the backend JWT expiry (24h default).
 */
const COOKIE_NAME = 'auth_token';
const DEFAULT_TTL_SEC = 24 * 60 * 60;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function apiBase(): string {
  const u = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  return u.replace(/\/+$/, '');
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Invalid JSON', code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const upstream = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));

  // Pass through the upstream error verbatim — page wants to render its message.
  if (!upstream.ok || !data?.data?.token) {
    return NextResponse.json(data || { success: false }, { status: upstream.status });
  }

  // Strip the token from the body before returning — client must not see it
  // (defense in depth; the user object still ships).
  const { token, expiresIn, ...rest } = data.data;
  const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : DEFAULT_TTL_SEC;

  const res = NextResponse.json({ success: true, data: rest });
  const isHttps = (process.env.NODE_ENV === 'production') || req.nextUrl.protocol === 'https:';
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'strict',
    path: '/',
    maxAge: ttl,
  });
  return res;
}
