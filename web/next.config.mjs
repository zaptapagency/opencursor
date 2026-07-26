import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */

// Security response headers applied to every route. A strict Content-Security
// -Policy is deliberately deferred to Phase G (it needs per-page nonce wiring
// to avoid breaking Next's inline runtime); the headers below are safe to ship
// today and cover clickjacking, MIME sniffing, referrer leakage, and HTTPS
// enforcement.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Never advertise the framework/version to attackers.
  poweredByHeader: false,
  // Pin the file-tracing root to this app so Next doesn't wrongly infer a
  // parent directory as the workspace root (an unrelated lockfile elsewhere on
  // the machine can mislead detection); keeps Railway/Nixpacks traces correct.
  outputFileTracingRoot: appDir,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
