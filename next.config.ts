import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also disable TypeScript type checking during builds for speed
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
