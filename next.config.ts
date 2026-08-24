import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves static files and cannot run the Vinext server bundle.
  output: "export",
  assetPrefix: process.env.ASSET_PREFIX ?? "",
  env: {
    NEXT_PUBLIC_ASSET_PREFIX: process.env.ASSET_PREFIX ?? "",
  },
  trailingSlash: true,
};

export default nextConfig;
