import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The web app shares pure contracts and URL validation with the worker.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
