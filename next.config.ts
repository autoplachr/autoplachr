import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  experimental: { inlineCss: true },
  images: { unoptimized: true },
};
export default config;
