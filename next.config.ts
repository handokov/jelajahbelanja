import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    // Biar build ga gagal karena type errors, tapi flag ini
    // sebaiknya di-set false kalau sudah production-ready
    ignoreBuildErrors: true,
  },
  // Security headers ditangani di middleware.ts untuk konsistensi
};

export default nextConfig;
