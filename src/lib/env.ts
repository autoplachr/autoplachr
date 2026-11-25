if (typeof window !== "undefined") {
  throw new Error("Server-only module: src/lib/env.ts cannot be imported in client code.");
}

export type ServerEnv = {
  OPENROUTER_API_KEY: string;
  OPENROUTER_VISION_MODEL: string;
  GEMINI_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
};

export function getServerEnv(): ServerEnv {
  return {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.trim() ?? "",
    OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL?.trim() || "google/gemini-2.5-flash",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
  };
}

export function maskSecrets(input: unknown): string {
  const raw = input instanceof Error ? `${input.name}: ${input.message}` : String(input ?? "");
  return raw
    .replace(/(Authorization\s*:\s*Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._\-+=]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-or-v1-[A-Za-z0-9_-]{8,}/g, "sk-or-v1-[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{16,}/g, "AIza[REDACTED]")
    .replace(/\b(?:rk_live|rk_test|sk_live|sk_test|whsec)_[A-Za-z0-9]{10,}/g, "[STRIPE_REDACTED]");
}
