import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The web app shares pure contracts and URL validation with the worker.
  turbopack: { root: path.join(__dirname, "..") },
  // Local rehearsal/capture state and credentials must never enter deploy traces.
  outputFileTracingExcludes: { "/*": ["../.contextdrop/**/*", ".env*", "../.env*"] },
};

export default nextConfig;
