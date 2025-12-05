/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Disable source maps in production to reduce memory usage during build
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    // Reduce memory usage during build
    webpackMemoryOptimizations: true,
  },

  // Rewrite legacy /uploads/* URLs to /api/uploads/* for dynamic file serving
  // This ensures files uploaded at runtime are served correctly
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default config;
