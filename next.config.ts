import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static", "fluent-ffmpeg"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
