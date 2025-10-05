import type { NextConfig } from "next";

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! DANGEROUS !! — disables type checking during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Optional: also ignore ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
