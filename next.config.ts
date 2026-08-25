import type { NextConfig } from "next";

const configuredBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetBase = configuredBase && configuredBase !== "/"
  ? `/${configuredBase.replace(/^\/+|\/+$/g, "")}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: assetBase || undefined,
  reactStrictMode: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: assetBase },
};

export default nextConfig;
