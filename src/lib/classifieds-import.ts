import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";
import { fetchClassifieds } from "./classifieds-fetch";
import { checkRateLimit, rateLimitHeaders } from "./rate-limit";
import { parseClassifieds } from "./classifieds-parse";

const maxPhotos = 20;
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex").slice(0, 24);

type Vision = (photos: { src: string }[]) => Promise<{ bestCoverIndex?: number }>;
let activeImports = 0;

export async function importClassifieds(request: Request, env: NodeJS.ProcessEnv, vision?: Vision) {
  if (request.method !== "POST") return json({ message: "Koristite POST." }, 405);
  const contentType = request.headers.get("content-type");
  if (request.headers.get("origin") !== new URL(request.url).origin || typeof contentType !== "string" || !contentType.startsWith("application/json")) {
    return json({ message: "Neispravan zahtjev." }, 403);
  }
  const rate = checkRateLimit("classifieds:global", 50, 60_000);
  if (!rate.allowed) return Response.json({ message: "Previše zahtjeva za uvoz." }, { status: 429, headers: rateLimitHeaders(rate) });
  let body: { url?: unknown; rawContent?: unknown; feed?: boolean };
  try { body = await request.json(); } catch { return json({ message: "Neispravan zahtjev." }, 400); }
  if (!body || typeof body !== "object") return json({ message: "Neispravan zahtjev." }, 400);
  const project = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sessionClient = project && anonKey ? createServerClient(project, anonKey, {
    cookies: {
      getAll: () => (request.headers.get("cookie") ?? "").split(/;\s*/).filter(cookie => cookie.includes("=")).map(cookie => {
        const split = cookie.indexOf("=");
        const value = cookie.slice(split + 1);
        try { return { name: cookie.slice(0, split), value: decodeURIComponent(value) }; }
        catch { return { name: cookie.slice(0, split), value }; }
      }),
      setAll: () => {},
    },
  }) : undefined;
  const user = sessionClient ? (await sessionClient.auth.getUser()).data.user : null;
  if (project && !user) return json({ message: "Prijavite se za uvoz oglasa." }, 401);
  if (typeof body.rawContent === "string" && body.rawContent.trim()) {
    const { vehicle } = parseClassifieds(body.rawContent.slice(0, 500_000));
    return json({ vehicle, photos: [], requestedPhotos: 0 });
  }
  if (typeof body.url !== "string" || !body.url.trim()) return json({ message: "Unesite poveznicu oglasa." }, 400);
  if (activeImports >= 2) return json({ message: "Uvoz je zauzet. Pokušajte ponovno." }, 429);
  activeImports++;
  try {
    const signal = AbortSignal.timeout(45000);
    const page = await fetchClassifieds(body.url.trim(), body.feed ? 8 * 1024 * 1024 : 3 * 1024 * 1024, signal);
    const content = page.body.toString("utf8");
    if ([403, 429].includes(page.status) || /<title>[^<]*(?:just a moment|access denied|attention required)/i.test(content)) {
      return json({ blocked: true, message: "Stranica je ograničila preuzimanje. Otvorite oglas, kopirajte cijelu stranicu (Ctrl+A, Ctrl+C) i zalijepite tekst ispod." });
    }
    if (page.status !== 200 || /^(?:image|video|audio)\//i.test(page.type)) return json({ message: "Stranica oglasa nije dostupna." }, 422);
    if (body.feed) return json({ content, source: page.url });
    const parsed = parseClassifieds(content, page.url);
    if (!parsed.vehicle.make || !parsed.vehicle.model) return json({ message: "Podaci o vozilu nisu pronađeni. Zalijepite tekst oglasa." }, 422);

    const slug = (parsed.vehicle.make + "-" + parsed.vehicle.model).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)
      + "-" + hash(new URL(page.url).hostname + new URL(page.url).pathname).slice(0, 12);
    const directory = join(process.cwd(), "public", "uploads", "imported", slug);
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    const storageClient = key && project ? createClient(project, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
    }) : sessionClient;
    const storage = storageClient?.storage.from("vehicle-images");
    const results: Awaited<ReturnType<typeof downloadPhoto>>[] = [];
    for (let index = 0; index < parsed.images.length && new Set(results.map(photo => photo?.fingerprint).filter(Boolean)).size < maxPhotos; index += 4) {
      results.push(...await Promise.all(parsed.images.slice(index, index + 4).map(image => downloadPhoto(image, signal))));
      if (signal.aborted) break;
    }
    const unique = [...new Map(results.filter(photo => photo !== undefined).map(photo => [photo.fingerprint, photo])).values()]
      .slice(0, maxPhotos).sort((a, b) => b.score - a.score);
    if (vision && unique.length > 1 && !signal.aborted) {
      try {
        const candidates = unique.slice(0, 8);
        const thumbnails = await Promise.all(candidates.map(async photo => ({
          src: "data:image/webp;base64," + (await sharp(photo.output).resize({ width: 540, withoutEnlargement: true }).webp({ quality: 65 }).toBuffer()).toString("base64"),
        })));
        const result = await vision(thumbnails);
        if (typeof result.bestCoverIndex === "number" && candidates[result.bestCoverIndex]) {
          unique.unshift(...unique.splice(result.bestCoverIndex, 1));
        }
      } catch { /* Keep the locally ranked cover. */ }
    }
    if (unique.length && !env.VERCEL) await mkdir(directory, { recursive: true });
    const photos = await Promise.all(unique.map(async ({ output }) => {
      const file = hash(output) + ".webp";
      if (!env.VERCEL) await writeFile(join(directory, file), output, { flag: "wx" }).catch(error => {
        if (error.code !== "EEXIST") throw error;
      });
      if (storage) {
        const path = (user ? user.id + "/" : "") + "imported/" + slug + "/" + file;
        try {
          const { error } = await storage.upload(path, output, { contentType: "image/webp", upsert: true });
          if (!error) return { src: storage.getPublicUrl(path).data.publicUrl, stored: true };
        } catch { /* The local copy is available if storage is offline. */ }
      }
      return { src: env.VERCEL ? "" : "/uploads/imported/" + slug + "/" + file, stored: false };
    }));
    return json({ vehicle: parsed.vehicle, photos: photos.filter(photo => photo.src).map(({ src }) => ({ src })),
      source: page.url, requestedPhotos: Math.min(maxPhotos, parsed.images.length), storageMisses: storage ? photos.filter(photo => !photo.stored).length : 0 });
  } catch {
    return json({ message: "Uvoz nije uspio. Provjerite javnu HTTPS poveznicu ili zalijepite tekst oglasa." }, 422);
  } finally { activeImports--; }
}

async function downloadPhoto(image: ReturnType<typeof parseClassifieds>["images"][number], signal: AbortSignal) {
  try {
    let source = await fetchClassifieds(image.url, 12 * 1024 * 1024, signal, true);
    if (source.status !== 200 && image.fallback && ![403, 429].includes(source.status)) {
      source = await fetchClassifieds(image.fallback, 12 * 1024 * 1024, signal, true);
    }
    if (source.status !== 200) return;
    const pipeline = sharp(source.body, { limitInputPixels: 30_000_000 }).rotate();
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height || !["jpeg", "png", "webp", "heif"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1) return;
    const rotated = meta.orientation && meta.orientation >= 5;
    const width = rotated ? meta.height : meta.width, height = rotated ? meta.width : meta.height;
    const aspect = width / height;
    if (width < 400 || height < 260 || aspect > 2.8) return;
    const pixels = await pipeline.clone().resize(48, 32, { fit: "fill" }).greyscale().raw().toBuffer();
    let light = 0, edges = 0;
    for (let i = 0; i < pixels.length; i++) {
      light += pixels[i];
      if (i % 48) edges += Math.abs(pixels[i] - pixels[i - 1]);
    }
    const caption = image.caption + " " + new URL(image.url).pathname;
    const score = (aspect >= 1.2 && aspect <= 2.2 ? 4 : aspect >= 1 ? 2 : 0)
      + Math.min(width * height / 2_000_000, 1) + Math.max(0, 1 - Math.abs(light / pixels.length - 135) / 135)
      + Math.min(edges / pixels.length / 30, 1)
      + (/\b(front|exterior|prednja|vanjski)\b/i.test(caption) ? 2 : 0)
      - (/\b(interior|interijer|cockpit|headlight|detalj)\b/i.test(caption) ? 4 : 0);
    const output = await pipeline.resize({ width: 1920, height: 1440, fit: "inside", withoutEnlargement: true }).webp({ quality: 83 }).toBuffer();
    const thumbnail = await sharp(output).resize(16, 16, { fit: "fill" }).greyscale().raw().toBuffer();
    const fingerprint = hash(Buffer.from(thumbnail.map(value => Math.round(value / 24))));
    return { output, score, fingerprint };
  } catch { return undefined; }
}

