import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static", "fluent-ffmpeg"],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
