import { analyzeCarPhotos, UpstreamVisionError, type VisionHint, type VisionPhotoInput } from "../../../lib/car-vision";
import { getServerEnv, maskSecrets } from "../../../lib/env";
import { checkGeneralApiLimit, checkVisionApiLimit, rateLimitHeaders } from "../../../lib/rate-limit";
import { isAllowedBase64ImageDataUrl, sanitizeText } from "../../../lib/sanitize";

if (typeof window !== "undefined") {
  throw new Error("Server-only module: /api/analyze-car-photos cannot run in browser bundles.");
}

const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_IMAGES = 8;

type AnalyzeRequestBody = {
  photos?: Array<{ src?: unknown; name?: unknown }>;
  hint?: Record<string, unknown>;
};

export async function POST(request: Request): Promise<Response> {
  const generalLimit = checkGeneralApiLimit(request);
  if (!generalLimit.allowed) {
    return Response.json(
      { error: "Previše zahtjeva. Pokušajte ponovno za nekoliko minuta." },
      { status: 429, headers: { "cache-control": "no-store", ...rateLimitHeaders(generalLimit) } },
    );
  }

  const visionLimit = checkVisionApiLimit(request);
  const rlHeaders = rateLimitHeaders(visionLimit);
  if (!visionLimit.allowed) {
    return Response.json(
      { error: "Previše zahtjeva. Pokušajte ponovno za nekoliko minuta." },
      { status: 429, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    return Response.json(
      { error: "Zahtjev je prevelik (maksimalno 6 MB)." },
      { status: 413, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return Response.json(
      { error: "Neispravan zahtjev." },
      { status: 400, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  const byteLength = new TextEncoder().encode(rawBody).length;
  if (byteLength > MAX_PAYLOAD_BYTES) {
    return Response.json(
      { error: "Zahtjev je prevelik (maksimalno 6 MB)." },
      { status: 413, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  let body: AnalyzeRequestBody;
  try {
    body = JSON.parse(rawBody) as AnalyzeRequestBody;
  } catch {
    return Response.json(
      { error: "Neispravan JSON format zahtjeva." },
      { status: 400, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  if (!body || typeof body !== "object" || !Array.isArray(body.photos) || body.photos.length === 0 || body.photos.length > MAX_IMAGES) {
    return Response.json(
      { error: "Pošaljite između 1 i 8 fotografija vozila." },
      { status: 400, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }

  const photos: VisionPhotoInput[] = [];
  for (const photo of body.photos) {
    if (!photo || typeof photo !== "object" || !isAllowedBase64ImageDataUrl(photo.src)) {
      return Response.json(
        { error: "Podržane su samo JPEG, PNG i WebP slike u base64 formatu." },
        { status: 400, headers: { "cache-control": "no-store", ...rlHeaders } },
      );
    }
    photos.push({
      src: photo.src,
      name: sanitizeText(photo.name, 120),
    });
  }

  const rawHint = body.hint && typeof body.hint === "object" ? body.hint : {};
  const hint: VisionHint = {
    make: sanitizeText(rawHint.make, 80) || undefined,
    model: sanitizeText(rawHint.model, 80) || undefined,
    generation: sanitizeText(rawHint.generation, 80) || undefined,
    variant: sanitizeText(rawHint.variant, 100) || undefined,
    date: sanitizeText(rawHint.date, 16) || undefined,
    fuel: sanitizeText(rawHint.fuel, 40) || undefined,
    bodyType: sanitizeText(rawHint.bodyType, 40) || undefined,
    title: sanitizeText(rawHint.title, 100) || undefined,
    trim: sanitizeText(rawHint.trim, 100) || undefined,
  };

  try {
    const serverEnv = getServerEnv();
    const result = await analyzeCarPhotos({
      photos,
      hint,
      openRouterApiKey: serverEnv.OPENROUTER_API_KEY || undefined,
      openRouterModel: serverEnv.OPENROUTER_VISION_MODEL,
    });

    return Response.json(result, {
      status: 200,
      headers: { "cache-control": "no-store", ...rlHeaders },
    });
  } catch (err) {
    console.error("[/api/analyze-car-photos] error:", maskSecrets(err));
    const status = err instanceof UpstreamVisionError ? 502 : 500;
    return Response.json(
      { error: "Analiza slika trenutno nije dostupna." },
      { status, headers: { "cache-control": "no-store", ...rlHeaders } },
    );
  }
}
