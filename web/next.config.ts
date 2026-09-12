import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Share contracts/readers that do not load the Mac media runtime. Upload
  // inspection crosses a subprocess boundary only in the local development app.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  // Local worker entrypoints, captures and credentials are not hosted features.
  outputFileTracingExcludes: { "/*": ["../scripts/**/*", "../tests/**/*", "../.contextdrop/**/*", ".env*", "../.env*"] },
};

export default nextConfig;
