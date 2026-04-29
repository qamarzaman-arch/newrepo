import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NOTE: Client-side RBAC in Sidebar.tsx is UX-only. Route-level access control
// must also be enforced at the API level for each protected endpoint.

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

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/_next', '/api', '/favicon.ico', '/qr/'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based route protection for admin-only routes
  if (token && ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role as string | undefined;
    if (!role || !['ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
