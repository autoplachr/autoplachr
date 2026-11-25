/**
 * Single source of truth for auth/build redirect URLs.
 *
 * Production always resolves to the public Vercel origin. Only an explicit
 * localhost / 127.0.0.1 page uses its own origin, so confirmation emails and
 * OAuth callbacks can never fall back to http://localhost:3000.
 */
export const PRODUCTION_SITE_URL = "https://autoplachr.vercel.app";

export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return origin;
  }
  return (configured || PRODUCTION_SITE_URL).replace(/\/+$/, "");
}

export function getAuthCallbackUrl(): string {
  return `${getSiteOrigin()}/auth/callback`;
}
