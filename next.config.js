import "./src/env.js";

const isDev = process.env.NODE_ENV === "development";

/** @type {import("next").NextConfig} */
const config = {
  productionBrowserSourceMaps: false,
  crossOrigin: "anonymous",
  allowedDevOrigins: ["192.168.6.*"],

  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },

  images: {
    formats: ["image/avif", "image/webp"],
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
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://static.cloudflareinsights.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' https: data:;
              connect-src 'self' https://static.cloudflareinsights.com;
              object-src 'self' https://posaunenwerk-rheinland.de https://www.posaunenwerk-rheinland.de https://next.posaunenwerk-rheinland.de https://pwr.lehdev.de;
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
        ],
      },
    ];
  },
};

export default config;
