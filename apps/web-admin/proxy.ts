import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 unified edge handler. Combines:
 *   - QA C70: server-side auth gate (used to be middleware.ts)
 *   - QA C1 follow-up: per-request CSP nonce (used to be middleware.ts)
 *   - Original RBAC route protection for ADMIN/MANAGER-only paths
 *
 * In Next 16 the file MUST be named `proxy.ts` (not `middleware.ts`).
 */

const PUBLIC_ROUTES = ['/login', '/qr'];
const ADMIN_ONLY_ROUTES = ['/staff', '/reports'];

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function buildCspWithNonce(nonce: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src 'self' ${apiUrl} ws: wss:`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

function withCspNonce(req: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  const out = NextResponse.next({ request: { headers: requestHeaders } });
  out.headers.set('content-security-policy', buildCspWithNonce(nonce));
  out.headers.set('x-nonce', nonce);
  return out;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const isPublic = PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (token && ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role as string | undefined;
    if (!role || !['ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return withCspNonce(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
