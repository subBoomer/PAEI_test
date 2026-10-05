import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep module resolution and output tracing anchored to this project,
  // even when a parent directory contains its own lockfile.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
