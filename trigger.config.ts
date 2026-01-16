import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_rkfellasltygsjjeyznr",

  // Required by Trigger.dev v4+
  runtime: "node",

  // Maximum execution time for a task (in seconds)
  // Must be at least 5 seconds
  maxDuration: 300, // 5 minutes

  // Directories to search for trigger files (dedicated trigger directory)
  dirs: ["src/trigger"],

  // Build configuration to exclude frontend assets and Next.js code
  build: {
    external: [
      "tailwindcss",
      "*.css",
      "next/font/google",
      "@clerk/nextjs",
      "react",
      "react-dom",
      "next",
      "reactflow",
      "lucide-react",
    ],
    conditions: ["node"],
  },
});
