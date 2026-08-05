/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const isDev = process.env.NODE_ENV === "development";

/** @type {import("next").NextConfig} */
const config = {
  productionBrowserSourceMaps: false,
  crossOrigin: "anonymous",
  allowedDevOrigins: ["192.168.6.*"],

  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded assets are immutable (timestamped filenames), so optimized
    // variants can be cached aggressively.
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      "recharts",
      "@tiptap/react",
      "@tiptap/starter-kit",
    ],
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline' stays for Next's inline bootstrap scripts;
            // 'unsafe-eval' is only needed by dev tooling (React refresh)
            // and must not ship in production.
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://static.cloudflareinsights.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' https: data:;
              connect-src 'self' https://static.cloudflareinsights.com;
              object-src 'none';
              frame-ancestors 'self';
              base-uri 'self';
              form-action 'self';
            `.replace(/\s{2,}/g, " "),
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // The former Access-Control-Allow-* headers were removed on
          // purpose: the Cloudflare Insights beacon does not need CORS on
          // this origin, and blanket CORS headers on /api/* would expose the
          // API to cross-origin calls if the (malformed) origin value were
          // ever "fixed" to a real one.
        ],
      },
    ];
  },
};

export default config;
