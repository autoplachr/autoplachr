import type { NextConfig } from "next";

const staticExport = process.env.AUTOPLAC_STATIC_EXPORT === "1";
const config: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  ...(staticExport ? { pageExtensions: ["export.tsx", "tsx", "jsx", "js"] } : {}),
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  experimental: { inlineCss: staticExport },
  env: { NEXT_PUBLIC_AUTOPLAC_STATIC_EXPORT: staticExport ? "1" : "0" },
  images: {
    unoptimized: staticExport,
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};
export default config;
