import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The web app shares pure contracts and URL validation with the worker.
  turbopack: {
    root: path.join(__dirname, ".."),
    // Shared worker modules retain .js imports for compiled Node ESM. In the
    // web server these exact modules are compiled directly from TypeScript.
    resolveAlias: {
      "./geminiFiles.js": "../src/services/geminiFiles.ts",
      "./geminiVideo.js": "../src/services/geminiVideo.ts",
      "./uploadStore.js": "../src/services/uploadStore.ts",
    },
  },
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static", "sharp", "pdf-lib"],
  // Local rehearsal/capture state and credentials must never enter deploy traces.
  outputFileTracingExcludes: { "/*": ["../.contextdrop/**/*", ".env*", "../.env*"] },
};

export default nextConfig;
