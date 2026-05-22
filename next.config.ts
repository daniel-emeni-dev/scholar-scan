import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.app.github.dev"],
      bodySizeLimit: "10mb", // To fix the 1mb error i encountered 
    },
  },
};

export default nextConfig;
