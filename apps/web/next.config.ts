import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ["@inkt/shared"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@inkt/shared": path.join(root, "../../packages/shared/src/index.ts"),
    };
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
