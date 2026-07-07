import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Turbopack config — kosong supaya Next.js 16 happy
  turbopack: {},
};

export default nextConfig;
