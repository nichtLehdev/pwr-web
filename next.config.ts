import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for smaller Docker images
  output: "standalone",

  // Disable source maps in production to reduce memory usage during build
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    // Reduce memory usage during build
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
