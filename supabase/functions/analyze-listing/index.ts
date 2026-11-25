import { analyzeListing, type AnalysisInput } from "../_shared/analyze.ts";
import { error, isPreflight, json, preflight } from "../_shared/cors.ts";

const MAX_IMAGES = 6;
const MAX_RAW_TEXT = 20_000;
const MAX_JSON_BYTES = 6 * 1024 * 1024;

async function requireUser(request: Request): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!token || !url || !anonKey) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

Deno.serve(async request => {
  if (isPreflight(request)) return preflight();
  if (request.method !== "POST") return error("Koristite POST.", 405);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) return error("Zahtjev je prevelik.", 413);
  if (!(await requireUser(request))) return error("Prijavite se za analizu oglasa.", 401);

  let body: AnalysisInput & { photos?: Array<{ src?: unknown; name?: unknown }> };
  try {
    const text = await request.text();
    if (text.length > MAX_JSON_BYTES) return error("Zahtjev je prevelik.", 413);
    body = JSON.parse(text);
  } catch {
    return error("Neispravan zahtjev.", 400);
  }
  if (!body || typeof body !== "object") return error("Neispravan zahtjev.", 400);

  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url)).slice(0, MAX_IMAGES)
    : [];
  const photos = Array.isArray(body.photos)
    ? body.photos.filter(photo => photo && typeof photo === "object" && typeof photo.src === "string" &&
        (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.src) || /^https:\/\//.test(photo.src)))
      .slice(0, MAX_IMAGES).map(photo => ({ src: photo.src as string, name: typeof photo.name === "string" ? photo.name : "" }))
    : [];
  if (!imageUrls.length && !photos.length) return json(await analyzeListing({ rawText: String(body.rawText ?? body.description ?? "").slice(0, MAX_RAW_TEXT) }, Deno.env.toObject()));

  const result = await analyzeListing({
    imageUrls,
    photos,
    rawText: String(body.rawText ?? body.description ?? "").slice(0, MAX_RAW_TEXT),
    hint: body.hint && typeof body.hint === "object" ? body.hint : undefined,
  }, Deno.env.toObject());
  return json(result);
});
