import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  poweredByHeader: false,
  experimental: { inlineCss: true },
  images: { unoptimized: true },
};
export default config;
