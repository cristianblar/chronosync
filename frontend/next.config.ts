import type { NextConfig } from "next";

/**
 * BACKEND_URL is a server-side env var used for the API proxy rewrite.
 * When NEXT_PUBLIC_API_URL is empty, all /api/** requests are proxied by Next.js
 * to BACKEND_URL. This avoids CORS issues and works in Docker environments where
 * the backend hostname is only resolvable from the Next.js server (not the browser).
 *
 * Local dev:  NEXT_PUBLIC_API_URL=http://localhost:8000  → direct browser calls
 * Docker:     NEXT_PUBLIC_API_URL=  + BACKEND_URL=http://api:8000 → proxied via Next.js
 */
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Cross-origin isolation hardening (safe defaults for same-origin app).
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            // CSP: still compatible with Next inline scripts, but less "wildcard" than minimal.
            // (Full nonce-based CSP is out of scope.)
            key: "Content-Security-Policy",
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http: https: ws: wss:",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy /api/** → backend when NEXT_PUBLIC_API_URL is not set (Docker mode)
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
