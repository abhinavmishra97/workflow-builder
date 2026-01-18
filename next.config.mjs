/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
