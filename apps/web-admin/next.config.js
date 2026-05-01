/** @type {import('next').NextConfig} */

// QA C68: serverActions.allowedOrigins is env-driven so production deploys
// don't ship a hardcoded localhost.
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS || 'localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// QA C69: refuse plain HTTP for the API URL in production unless the caller
// explicitly opts in via ALLOW_INSECURE_API=true (e.g. for a local preview).
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
if (
  process.env.NODE_ENV === 'production' &&
  apiUrl.startsWith('http://') &&
  !apiUrl.includes('localhost') &&
  process.env.ALLOW_INSECURE_API !== 'true'
) {
  throw new Error(
    `[next.config] NEXT_PUBLIC_API_URL must be HTTPS in production (got ${apiUrl}). ` +
    `Set ALLOW_INSECURE_API=true to override.`
  );
}

// QA C1, C73: per-request CSP with nonce is set in middleware.ts. The static
// header below is intentionally absent — keeping a global CSP here would
// override the middleware's nonce-aware policy.

const nextConfig = {
  transpilePackages: ['@poslytic/ui-components'],
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
