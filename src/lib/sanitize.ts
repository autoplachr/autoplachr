const ALLOWED_DATA_IMAGE_PREFIX = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function sanitizeText(input: unknown, maxLength: number, multiline = false): string {
  if (typeof input !== "string") return "";
  let cleaned = input
    // Remove script/style/iframe blocks first
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, " ")
    // Neutralize dangerous URI schemes and inline event handlers
    .replace(/\b(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, "")
    .replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  if (multiline) {
    cleaned = cleaned
      .replace(/\r\n?/g, "\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    cleaned = cleaned.replace(/\s+/g, " ");
  }

  return cleaned.trim().slice(0, maxLength);
}

export function sanitizeStringArray(input: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const entry of input) {
    if (out.length >= maxItems) break;
    const clean = sanitizeText(entry, maxLength);
    if (clean) out.push(clean);
  }
  return out;
}

export function isAllowedBase64ImageDataUrl(src: unknown): src is string {
  return typeof src === "string" && src.length > 0 && ALLOWED_DATA_IMAGE_PREFIX.test(src);
}
