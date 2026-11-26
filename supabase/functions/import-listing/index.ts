import { corsHeaders, error, isPreflight, json, preflight } from "../_shared/cors.ts";
import { analyzeListing } from "../_shared/analyze.ts";
import { parseListing, type ParsedImage } from "../_shared/parse.ts";

const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const MAX_FEED_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PHOTOS = 20;

const env = () => Deno.env.toObject();
const projectUrl = () => (env().SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceKey = () => env().SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = () => env().SUPABASE_ANON_KEY ?? "";

async function hash(value: string | Uint8Array) {
  const bytes = await crypto.subtle.digest("SHA-256", (typeof value === "string"
    ? new TextEncoder().encode(value) : value) as BufferSource);
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function requireUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !projectUrl() || !anonKey()) return null;
  try {
    const response = await fetch(`${projectUrl()}/auth/v1/user`, {
      headers: { apikey: anonKey(), authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const user = await response.json() as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

function validateUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.port || url.username || url.password ||
      url.href.length > 2048 || !url.hostname.includes(".") || /^(?:localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.)/i.test(url.hostname)) {
    throw new Error("Unesite javnu HTTPS poveznicu.");
  }
  return url;
}

async function readLimited(response: Response, maxBytes: number): Promise<string | Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Datoteka je prevelika.");
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error("Datoteka je prevelika."); }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

async function fetchPage(url: URL, signal: AbortSignal, image: boolean) {
  let current = url;
  for (let redirects = 0; redirects < 5; redirects++) {
    const response = await fetch(current.href, {
      redirect: "manual",
      signal,
      headers: {
        "Accept-Language": "hr-HR,hr;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Accept: image ? "image/avif,image/webp,image/png,image/jpeg,image/*" : "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.5",
        Referer: "https://www.google.hr/",
        "Accept-Encoding": "identity",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) {
      current = validateUrl(new URL(response.headers.get("location")!, current).href);
      continue;
    }
    return { response, url: current };
  }
  throw new Error("Previše preusmjeravanja.");
}

async function scoreImage(image: ParsedImage, bytes: Uint8Array) {
  const path = new URL(image.url).pathname;
  const caption = `${image.caption} ${path}`;
  return (/\b(?:front|exterior|prednj\w*|vanjsk\w*|3.?4)\b/i.test(caption) ? 3 : 0)
    - (/\b(?:interior|interijer|cockpit|headlight|detalj|logo|banner)\b/i.test(caption) ? 4 : 0)
    + Math.min(bytes.byteLength / 1_000_000, 1);
}

async function uploadPhoto(path: string, bytes: Uint8Array, contentType: string): Promise<string | null> {
  const url = projectUrl();
  const key = serviceKey();
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url}/storage/v1/object/vehicle-images/${path}`, {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": contentType,
        "x-upsert": "true",
      },
      body: bytes as BodyInit,
    });
    if (!response.ok) return null;
    return `${url}/storage/v1/object/public/vehicle-images/${path}`;
  } catch {
    return null;
  }
}

Deno.serve(async request => {
  if (isPreflight(request)) return preflight();
  if (request.method !== "POST") return error("Koristite POST.", 405);

  const userId = await requireUser(request);
  if (!userId) return error("Prijavite se za uvoz oglasa.", 401);

  let body: { url?: unknown; rawContent?: unknown; feed?: boolean; userId?: unknown };
  try { body = await request.json(); } catch { return error("Neispravan zahtjev.", 400); }
  if (!body || typeof body !== "object") return error("Neispravan zahtjev.", 400);

  const signal = AbortSignal.timeout(50_000);
  try {
    if (typeof body.rawContent === "string" && body.rawContent.trim()) {
      const { vehicle } = parseListing(body.rawContent.slice(0, 500_000));
      return json({ vehicle, photos: [], requestedPhotos: 0 });
    }
    if (typeof body.url !== "string" || !body.url.trim()) return error("Unesite poveznicu oglasa.", 400);
    const url = validateUrl(body.url.trim());
    const { response, url: finalUrl } = await fetchPage(url, signal, false);
    const contentBytes = await readLimited(response, body.feed ? MAX_FEED_BYTES : MAX_PAGE_BYTES);
    const content = new TextDecoder().decode(contentBytes as Uint8Array);
    const isBlocked = [403, 429].includes(response.status) ||
      /just a moment|access denied|attention required|captcha/i.test(content.slice(0, 4000));
    if (isBlocked) return json({ blocked: true, message: "Stranica je ograničila preuzimanje. Otvorite oglas, kopirajte cijelu stranicu (Ctrl+A, Ctrl+C) i zalijepite tekst ispod." });
    if (response.status !== 200) return error("Stranica oglasa nije dostupna.", 422);
    if (body.feed) return json({ content, source: finalUrl.href });

    const parsed = parseListing(content, finalUrl.href);
    if (!parsed.vehicle.make || !parsed.vehicle.model) return error("Podaci o vozilu nisu pronađeni. Zalijepite tekst oglasa.", 422);

    const slug = `${String(parsed.vehicle.make)}-${String(parsed.vehicle.model)}`.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)
      + "-" + (await hash(finalUrl.hostname + finalUrl.pathname)).slice(0, 12);
    const candidates = parsed.images.slice(0, 32);
    const downloaded: Array<{ bytes: Uint8Array; contentType: string; score: number; fingerprint: string; nearKey: string }> = [];
    for (let index = 0; index < candidates.length; index += 4) {
      const batch = await Promise.all(candidates.slice(index, index + 4).map(async image => {
        for (const source of [image.url, image.fallback].filter(Boolean) as string[]) {
          try {
            const { response: photoResponse } = await fetchPage(validateUrl(source), signal, true);
            if (photoResponse.status !== 200) continue;
            const type = (photoResponse.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
            if (!/^image\/(?:jpeg|png|webp|heic|avif)$/.test(type)) continue;
            const bytes = await readLimited(photoResponse, MAX_IMAGE_BYTES) as Uint8Array;
            if (bytes.byteLength < 4000) continue;
            const fingerprint = (await hash(bytes)).slice(0, 24);
            // Njuškalo often serves the same angle twice (one copy with a white
            // dealer banner). Same dimensions + same header bytes => near duplicate.
            const nearKey = `${type}:${bytes.byteLength}:${(await hash(bytes.slice(0, 512))).slice(0, 16)}`;
            return { bytes, contentType: type, score: await scoreImage(image, bytes), fingerprint, nearKey };
          } catch { /* Try the fallback resolution. */ }
        }
        return undefined;
      }));
      downloaded.push(...batch.filter((item): item is NonNullable<typeof item> => Boolean(item)));
    }
    // Keep the seller's original gallery order: photo 0 stays the default cover.
    // Remove exact duplicates first, then same-angle near duplicates (prefer the
    // higher-scoring copy, i.e. the one without a dealer banner).
    type DownloadedPhoto = (typeof downloaded)[number];
    const byFingerprint = new Map<string, DownloadedPhoto>();
    const byNear = new Map<string, DownloadedPhoto>();
    for (const item of downloaded) {
      if (byFingerprint.has(item.fingerprint)) continue;
      const existingNear = byNear.get(item.nearKey);
      if (existingNear) {
        if (item.score > existingNear.score) {
          byNear.set(item.nearKey, item);
          byFingerprint.delete(existingNear.fingerprint);
          byFingerprint.set(item.fingerprint, item);
        }
        continue;
      }
      byNear.set(item.nearKey, item);
      byFingerprint.set(item.fingerprint, item);
    }
    const unique = [...byFingerprint.values()].slice(0, MAX_PHOTOS);

    const photos: Array<{ src: string }> = [];
    let storageMisses = 0;
    for (const image of unique) {
      const extension = image.contentType === "image/png" ? "png" : image.contentType === "image/webp" ? "webp"
        : image.contentType === "image/heic" ? "heic" : image.contentType === "image/avif" ? "avif" : "jpg";
      const path = `imported/${slug}/${image.fingerprint}.${extension}`;
      const publicUrl = await uploadPhoto(path, image.bytes, image.contentType);
      if (publicUrl) photos.push({ src: publicUrl }); else storageMisses++;
    }

    let bannerOnFirst = false;
    let bestCoverIndex: number | undefined;
    if (photos.length > 1) {
      try {
        const analysis = await analyzeListing({ imageUrls: photos.slice(0, 8).map(photo => photo.src), rawText: String(parsed.vehicle.description ?? "") }, env());
        bannerOnFirst = Boolean(analysis.bannerOnFirst);
        bestCoverIndex = analysis.bestCoverIndex;
        if (bannerOnFirst && typeof bestCoverIndex === "number" && bestCoverIndex > 0 && photos[bestCoverIndex]) {
          photos.unshift(...photos.splice(bestCoverIndex, 1));
        }
      } catch { /* Keep the locally ranked cover. */ }
    }

    return json({ vehicle: parsed.vehicle, photos, source: finalUrl.href, requestedPhotos: Math.min(MAX_PHOTOS, candidates.length), storageMisses, bannerOnFirst, bestCoverIndex });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Uvoz nije uspio.";
    return /javnu HTTPS|prevelika/i.test(message) ? error(message, 400) : json({ blocked: true, message: "Uvoz nije uspio. Provjerite javnu HTTPS poveznicu ili zalijepite tekst oglasa." }, 422);
  }
});
