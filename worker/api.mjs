import { normalizePhone, profileErrors } from "../src/data/profile-validation.ts";
import { croatianCounties, croatianLocations, normalizeLocation } from "../src/data/croatia-locations.ts";
import { formatHours, validHours } from "../src/data/working-hours.ts";
import { checkGeneralApiLimit, checkVisionApiLimit, rateLimitHeaders } from "../src/lib/rate-limit.ts";
import { analyzeListing } from "./analyze-listing.mjs";
import { isAllowedBase64ImageDataUrl, sanitizeStringArray, sanitizeText } from "../src/lib/sanitize.ts";
export const LEGAL_VERSION = "2026-11-25";
const MAX_VISION_PAYLOAD_BYTES = 6 * 1024 * 1024;
const MAX_VISION_IMAGES = 8;
const maskWorkerSecrets = input => String(input ?? "")
  .replace(/(Authorization\s*:\s*Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
  .replace(/\bBearer\s+[A-Za-z0-9._\-+=]+/gi, "Bearer [REDACTED]")
  .replace(/\bsk-or-v1-[A-Za-z0-9_-]{8,}/g, "sk-or-v1-[REDACTED]")
  .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]");
const day = 86400;
const encoder = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
const bytes = n => crypto.getRandomValues(new Uint8Array(n));
const hex = data => Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, "0")).join("");
const unhex = value => Uint8Array.from(value.match(/../g), b => parseInt(b, 16));
const digest = async value => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
const value = (obj, key, size) => typeof obj[key] === "string" ? obj[key].trim().slice(0, size) : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[\da-f-]{36}$/i;
const reasons = ["Sumnja na skidanje kilometara", "Lažni oglas / prevara", "Vozilo je već prodano", "Krivi podaci / cijena", "Drugi nezakonit sadržaj"];

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const requireValue = (condition, message, status = 400) => {
  if (!condition) throw new ApiError(status, message);
};
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
const parse = str => JSON.parse(str);
const stmt = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);

const passwordIterations = 100000; // Cloudflare Workers Web Crypto ceiling.
const passwordVersion = "pbkdf2-sha256-100000";
const dummyPassword = passwordVersion + "." + "a".repeat(32) + "." + "a".repeat(64);

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(salt), iterations }, key, 256));
}

async function passwordHash(password) {
  const salt = hex(bytes(16));
  return passwordVersion + "." + salt + "." + await derivePassword(password, salt, passwordIterations);
}

async function passwordMatches(password, stored) {
  const [first, second, third] = stored.split(".");
  const legacy = third === undefined;
  if (!legacy && first !== passwordVersion) return false;
  const [salt, expected] = legacy ? [first, second] : [second, third];
  if (!/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{64}$/.test(expected ?? "")) return false;
  let computed;
  try {
    computed = await derivePassword(password, salt, legacy ? 600000 : passwordIterations);
  } catch (error) {
    if (legacy && error?.name === "NotSupportedError") return false;
    throw error;
  }
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

const cookie = (request, token, age) => "autoplac_session=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + age +
  (new URL(request.url).protocol === "https:" ? "; Secure" : "");

async function startSession(request, env, accountId) {
  const raw = hex(bytes(32));
  await stmt(env, "INSERT INTO session VALUES (?,?,?)", await digest(raw), accountId, now() + 14 * day).run();
  return json({ ok: true }, 200, { "set-cookie": cookie(request, raw, 14 * day) });
}

async function accountFor(request, env) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)autoplac_session=([\da-f]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return stmt(env, "SELECT a.*,s.token FROM account a JOIN session s ON a.id=s.account_id WHERE s.token=? AND s.expires>?", await digest(token), now()).first();
}

async function rate(env, key, limit, seconds) {
  const hits = await stmt(env, "INSERT INTO rate_limit VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires<=? THEN 1 ELSE hits+1 END, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING hits", key, now() + seconds, now(), now()).first();
  requireValue(hits.hits <= limit, "Previše pokušaja. Pokušajte kasnije.", 429);
}

function locationFrom(body) {
  const city = value(body,"city",100);
  const known = croatianLocations.find(place => normalizeLocation(place.city) === normalizeLocation(city));
  const supplied = value(body,"postalCode",20);
  requireValue(!supplied || /^\d{5}$/.test(supplied), "Poštanski broj mora imati pet znamenki.");
  const postalCode = supplied || known?.postalCode || "";
  const county = known?.county || value(body,"county",100);
  requireValue(city && croatianCounties.includes(county), "Unesite grad i županiju.");
  const postalPlaces = croatianLocations.filter(place => place.postalCode === postalCode);
  requireValue(!known || !postalPlaces.length || postalPlaces.includes(known), "Grad i poštanski broj se ne podudaraju.");
  return {city:known?.city || city,postalCode,county};
}

function readHours(input) {
  let hours = input;
  if (typeof input === "string") {
    try { hours = JSON.parse(input); } catch { hours = null; }
  }
  requireValue(validHours(hours), "Provjerite radno vrijeme.");
  return { appointmentOnly:hours.appointmentOnly, afterHours:hours.afterHours, days:hours.days.map(({open,from,to}) => ({open,from,to})) };
}

function profileFrom(body, type) {
  const profile = {
    type, name: value(body, "name", 100), ...locationFrom(body),
    phone: normalizePhone(value(body, "phone", 40)), alerts: body.alerts === true, analytics: body.analytics === true,
  };
  const errors = profileErrors({...body,...profile},type === "dealer");
  if (!body.postalCode && !profile.postalCode && body.accepted) delete errors.postalCode;
  if (Object.keys(errors).length) throw Object.assign(new ApiError(400,"Provjerite označena polja."),{fields:errors});
  if (type === "dealer") {
    const tier = ["starter", "pro", "ai_partner"].includes(body.subscriptionTier) ? body.subscriptionTier : "starter";
    Object.assign(profile, {
      oib: value(body, "oib", 11),
      address: value(body, "address", 200),
      hours: value(body, "hours", 260),
      importUrl: value(body, "importUrl", 500),
      subscriptionTier: tier,
    });
    if (body.workingHours) {
      profile.workingHours = readHours(body.workingHours);
      profile.hours = formatHours(profile.workingHours);
    }
    requireValue(profile.hours, "Odaberite radno vrijeme.");
    if (profile.importUrl) {
      let url;
      try { url = new URL(profile.importUrl); } catch {}
      requireValue(url?.protocol === "https:" && !url.username && !url.password, "XML adresa mora biti HTTPS poveznica bez pristupnih podataka.");
    }
  }
  return profile;
}

function readListing(row) {
  const vehicle = parse(row.vehicle);
  return { ...vehicle, id: row.id, status: row.status, views: row.views, reveals: row.reveals,
    listedAt: new Date(row.created * 1000).toISOString(), boostedUntil: row.boosted_until,
    isBoosted: row.boosted_until != null,
    boostTier: row.boosted_until == null ? "none" : vehicle.boostTier ?? "top_7d",
    boostExpiresAt: row.boosted_until == null ? null : new Date(row.boosted_until * 1000).toISOString(),
  };
}

function publicListing(row) {
  const { status, views, reveals, ...listing } = readListing(row);
  return { ...listing, phone: "", contactAvailable: true, dealershipId: listing.dealer ? row.account_id : undefined };
}

function safePhoto(source, dealer, storageProject) {
  if (/^\/uploads\/imported\/[a-z0-9-]+\/[a-f0-9]{24}\.webp$/.test(source)) return true;
  if (storageProject) {
    try {
      const url = new URL(source);
      if (url.protocol === "https:" && url.origin === new URL(storageProject).origin &&
          /^\/storage\/v1\/object\/public\/vehicle-images\/imported\/[a-z0-9-]+\/[a-f0-9]{24}\.webp$/.test(url.pathname)) return true;
    } catch { /* Continue with existing photo validation. */ }
  }
  if (dealer && source.length <= 2048) {
    try {
      const url = new URL(source);
      if (url.protocol === "https:" && !url.username && !url.password) return true;
    } catch { /* Continue with existing photo validation. */ }
  }
  if (/^https:\/\/thumb\.wikimedia\.org\//.test(source)) return true;
  if (!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(source)) return false;
  try {
    const data = atob(source.slice("data:image/webp;base64,".length));
    if (data.slice(0,4) !== "RIFF" || data.slice(8,12) !== "WEBP") return false;
    const size = at => (data.charCodeAt(at) | data.charCodeAt(at+1)<<8 | data.charCodeAt(at+2)<<16 | data.charCodeAt(at+3)<<24) >>> 0;
    if (size(4)+8 !== data.length) return false;
    let offset = 12, image = false;
    while (offset+8 <= data.length) {
      const kind = data.slice(offset,offset+4), length = size(offset+4);
      if (!["VP8 ","VP8L","VP8X","ALPH","ICCP"].includes(kind)) return false;
      if (kind === "VP8 " || kind === "VP8L") image = true;
      offset += 8 + length + (length % 2);
    }
    return image && offset === data.length;
  } catch { return false; }
}

async function saveListing(env, account, body) {
  const profile = parse(account.profile);
  const vehicle = body.vehicle;
  const status = body.status;
  requireValue(vehicle && typeof vehicle === "object" && ["active","paused","draft","sold"].includes(status), "Oglas nije valjan.");
  requireValue(uuidPattern.test(vehicle.id) && value(vehicle, "title", 100) && value(vehicle, "make", 80) && value(vehicle, "model", 80), "Unesite vozilo i naslov.");
  requireValue(Number.isFinite(vehicle.price) && vehicle.price > 0 && vehicle.price <= 100000000 && Number.isFinite(vehicle.km) &&
    vehicle.km >= 0 && /^\d{4}-(0[1-9]|1[0-2])$/.test(vehicle.date) && Number.isFinite(vehicle.kw) && vehicle.kw > 0 &&
    Number.isFinite(vehicle.co2) && Number.isFinite(vehicle.cc) && (!vehicle.vin || /^[A-HJ-NPR-Z0-9]{17}$/.test(vehicle.vin)), "Provjerite cijenu, tehničke podatke i VIN.");
  requireValue(Array.isArray(vehicle.photos) && vehicle.photos.length <= 20 && vehicle.photos.every(photo => typeof photo?.src === "string" && photo.src.length <= 550000 &&
    safePhoto(photo.src, profile.type === "dealer", env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL)), "Fotografije nisu valjane.");
  requireValue(Array.isArray(vehicle.flags) && vehicle.flags.every(flag => ["kupac","pdv","dolazak","cvh"].includes(flag)) &&
    vehicle.equipment && ["Sigurnost","Udobnost","Multimedija","Eksterijer"].every(key => Array.isArray(vehicle.equipment[key]) && vehicle.equipment[key].every(item => typeof item === "string")), "Oprema ili status oglasa nisu valjani.");
  const location = locationFrom({ ...profile, ...Object.fromEntries(["city","postalCode","county"].filter(key => vehicle[key] !== undefined).map(key => [key,vehicle[key]])) });
  const dealerAddress = profile.address && [profile.address, [profile.postalCode, profile.city].filter(Boolean).join(" ")].join(", ");
  const id = vehicle.id;
  const existing = await stmt(env, "SELECT status,moderated,vehicle FROM listing WHERE id=? AND account_id=?", id, account.id).first();
  const prevVehicle = existing?.vehicle ? parse(existing.vehicle) : null;
  const previousPriceEur =
    prevVehicle && prevVehicle.price > 0 && vehicle.price > 0 && prevVehicle.price > vehicle.price
      ? prevVehicle.price
      : Number.isFinite(vehicle.previousPriceEur) && vehicle.previousPriceEur > vehicle.price
      ? vehicle.previousPriceEur
      : prevVehicle?.previousPriceEur;
  const clean = {
    id: vehicle.id, title: sanitizeText(vehicle.title, 100), make: sanitizeText(vehicle.make, 80), model: sanitizeText(vehicle.model, 80),
    generation: sanitizeText(vehicle.generation, 100), variant: sanitizeText(vehicle.variant, 100), bodyType: sanitizeText(vehicle.bodyType, 40), trim: sanitizeText(vehicle.trim, 100),
    category: ["automobili","gospodarska","motocikli"].includes(vehicle.category) ? vehicle.category : undefined,
    date: vehicle.date, registrationUntil: /^(0[1-9]|1[0-2])\/\d{4}$/.test(vehicle.registrationUntil) ? vehicle.registrationUntil : undefined, price:vehicle.price, ...(previousPriceEur ? { previousPriceEur } : {}), km:vehicle.km, kw:vehicle.kw, cc:vehicle.cc, co2:vehicle.co2,
    ...(Number.isFinite(vehicle.cylinders) ? { cylinders: vehicle.cylinders } : {}),
    ...(vehicle.color ? { color: sanitizeText(vehicle.color, 60) } : {}),
    ...(vehicle.colorFinish ? { colorFinish: sanitizeText(vehicle.colorFinish, 40) } : {}),
    gear:sanitizeText(vehicle.gear, 30), fuel:sanitizeText(vehicle.fuel, 30), drive:sanitizeText(vehicle.drive, 30), vin:sanitizeText(vehicle.vin, 17),
    sellerNote:sanitizeText(vehicle.sellerNote, 12000, true), flags:vehicle.flags,
    showPriceBadge: vehicle.showPriceBadge === true,
    ...(Array.isArray(vehicle.valueProofs) ? { valueProofs: sanitizeStringArray(vehicle.valueProofs, 4, 30) } : {}),
    photos:vehicle.photos.map(photo => ({src:photo.src})),
    equipment:Object.fromEntries(["Sigurnost","Udobnost","Multimedija","Eksterijer"].map(key => [key, sanitizeStringArray(vehicle.equipment[key], 40, 150)])),
    makeEquipment:sanitizeStringArray(vehicle.makeEquipment, 60, 100),
    catalogEquipment:sanitizeStringArray(vehicle.catalogEquipment, 160, 120).filter(item => item.startsWith("eq:")),
    phone: profile.phone, email: account.email, ...location, seller: sanitizeText(profile.name, 100),
    dealer: profile.type === "dealer", verified: false, sellerAddress: dealerAddress, sellerHours: profile.hours, sellerWorkingHours: profile.workingHours,
    demo: false };
  requireValue(clean.title && clean.make && clean.model, "Unesite vozilo i naslov.");
  requireValue(["Dizel","Benzin","Hibrid","Plug-in hibrid","Struja"].includes(clean.fuel) && ["Automatski","Ručni"].includes(clean.gear), "Odaberite gorivo i mjenjač.");
  const data = JSON.stringify(clean);
  requireValue(encoder.encode(data).length <= 1500000, "Fotografije su prevelike. Uklonite jednu ili više fotografija.");
  requireValue(existing || status !== "sold", "Najprije spremite oglas.");
  const updatedVehicle = "CASE WHEN listing.boosted_until IS NULL THEN excluded.vehicle ELSE json_set(excluded.vehicle,'$.boostTier',COALESCE(json_extract(listing.vehicle,'$.boostTier'),'top_7d')) END";
  if (status === "active") {
    requireValue(!existing?.moderated, "Oglas je povučen odlukom moderatora.", 403);
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Zagreb" }).format(new Date()));
    const ledger = stmt(env, "INSERT INTO publication SELECT ?,?,? WHERE ?='dealer' OR (SELECT COUNT(*) FROM publication WHERE account_id=? AND year=?)<2 ON CONFLICT(id) DO NOTHING", id, account.id, year, profile.type, account.id, year);
    const listing = stmt(env, "INSERT INTO listing(id,account_id,vehicle,status,created) SELECT ?,?,?,'active',? WHERE EXISTS (SELECT 1 FROM publication WHERE id=? AND account_id=?)" +
      " ON CONFLICT(id) DO UPDATE SET vehicle=" + updatedVehicle + ",status='active' WHERE listing.account_id=excluded.account_id AND listing.moderated=0", id, account.id, data, now(), id, account.id);
    const response = await env.DB.batch([ledger, listing]);
    requireValue(response[1].meta.changes, "Iskoristili ste dva besplatna oglasa za ovu kalendarsku godinu ili oglas nije moguće objaviti.", 409);
  } else {
    await stmt(env, "INSERT INTO listing(id,account_id,vehicle,status,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET vehicle=" + updatedVehicle + ",status=excluded.status WHERE listing.account_id=excluded.account_id", id, account.id, data, status, now()).run();
  }
}

async function analyzeCarPhotosHandler(body, env, listing = false) {
  requireValue(Array.isArray(body?.photos) && body.photos.length >= 1 && body.photos.length <= MAX_VISION_IMAGES, "Pošaljite između 1 i 8 fotografija vozila.");
  const photos = [];
  for (const p of body.photos) {
    requireValue(p && typeof p === "object" && isAllowedBase64ImageDataUrl(p.src), "Podržane su samo JPEG, PNG i WebP slike u base64 formatu.");
    photos.push({ src: p.src, name: sanitizeText(p.name, 120) });
  }
  if (listing) return analyzeListing({ ...body, photos }, env);
  const rawHint = body?.hint && typeof body.hint === "object" ? body.hint : {};
  const hint = {
    make: sanitizeText(rawHint.make, 80),
    model: sanitizeText(rawHint.model, 80),
    generation: sanitizeText(rawHint.generation, 80),
    variant: sanitizeText(rawHint.variant, 100),
    bodyType: sanitizeText(rawHint.bodyType, 40),
    title: sanitizeText(rawHint.title, 100),
  };

  if (env?.OPENROUTER_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const prompt = [
        "Analyze these car photos for AUTOPLAC.HR (Croatian vehicle marketplace).",
        "Return ONLY valid JSON:",
        '{"detectedMake":"","detectedModel":"","detectedGeneration":"","detectedTrim":"","detectedBodyStyle":"","detectedColor":"","detectedFuel":"","detectedGear":"","detectedYear":null,"detectedEquipment":[]}',
        hint.make ? `Hint: ${hint.make} ${hint.model || ""} ${hint.generation || ""}` : "",
      ].filter(Boolean).join("\n");
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: "Bearer " + env.OPENROUTER_API_KEY,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://autoplac.hr",
          "X-Title": "AUTOPLAC.HR Vision",
        },
        body: JSON.stringify({
          model: env.OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...photos.slice(0, 4).map(p => ({ type: "image_url", image_url: { url: p.src } })),
            ],
          }],
        }),
      });
      if (!resp.ok) {
        console.error("[/api/analyze-car-photos] upstream error status:", resp.status);
        throw new ApiError(502, "Analiza slika trenutno nije dostupna.");
      }
      const data = await resp.json();
      const rawText = data?.choices?.[0]?.message?.content?.trim();
      if (!rawText) throw new ApiError(502, "Analiza slika trenutno nije dostupna.");
      const parsed = JSON.parse(rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      return { source: "openrouter-vision", ...parsed };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error("[/api/analyze-car-photos] error:", maskWorkerSecrets(err?.message || err?.name || "Vision failed"));
      throw new ApiError(502, "Analiza slika trenutno nije dostupna.");
    } finally {
      clearTimeout(timer);
    }
  }

  const fileNames = photos.map(p => typeof p.name === "string" ? p.name : "").join(" ").toLowerCase();
  const context = `${fileNames} ${hint.make || ""} ${hint.model || ""} ${hint.generation || ""} ${hint.variant || ""} ${hint.title || ""}`.toLowerCase();

  let detectedMake = hint.make || "";
  if (!detectedMake) {
    if (/bmw|g20|f30|e90|320d|330d|m340i|xdrive/.test(fileNames)) detectedMake = "BMW";
    else if (/audi|b9|a4|a6|q5|s-?line|quattro/.test(fileNames)) detectedMake = "Audi";
    else if (/vw|volkswagen|golf|passat|tiguan|r-?line/.test(fileNames)) detectedMake = "Volkswagen";
    else if (/mercedes|benz|w205|w213|amg/.test(fileNames)) detectedMake = "Mercedes-Benz";
    else if (/skoda|škoda|octavia|superb|kodiaq/.test(fileNames)) detectedMake = "Škoda";
    else if (/porsche|macan|cayenne|911/.test(fileNames)) detectedMake = "Porsche";
    else if (/peugeot|3008|308|208/.test(fileNames)) detectedMake = "Peugeot";
    else if (/toyota|corolla|rav4|yaris/.test(fileNames)) detectedMake = "Toyota";
  }

  let detectedModel = hint.model || "";
  if (!detectedModel && detectedMake === "BMW") {
    if (/g20|f30|e90|318d|320d|330d|m340i|serija[\s-]*3/.test(fileNames)) detectedModel = "Serija 3";
    else if (/g30|f10|520d|530d|serija[\s-]*5/.test(fileNames)) detectedModel = "Serija 5";
    else if (/x3|g01/.test(fileNames)) detectedModel = "X3";
    else if (/x5|g05/.test(fileNames)) detectedModel = "X5";
  } else if (!detectedModel && detectedMake === "Volkswagen") {
    if (/golf/.test(fileNames)) detectedModel = "Golf";
    else if (/passat/.test(fileNames)) detectedModel = "Passat";
    else if (/tiguan/.test(fileNames)) detectedModel = "Tiguan";
  } else if (!detectedModel && detectedMake === "Audi") {
    if (/a4|b9|b8/.test(fileNames)) detectedModel = "A4";
    else if (/a6|c8/.test(fileNames)) detectedModel = "A6";
    else if (/q5/.test(fileNames)) detectedModel = "Q5";
  }

  const detectedGeneration = hint.generation || (fileNames.match(/\b(g20|g21|f30|e90|b9|b8|c8|w205|w206|w213|5e|nx|95b|p84)\b/i)?.[1]?.toUpperCase() ?? "");
  const trimTag = /m[\s-]*sport/i.test(context) ? "M Sport" : /s[\s-]*line/i.test(context) ? "S line" : /amg[\s-]*line/i.test(context) ? "AMG Line" : /r[\s-]*line/i.test(context) ? "R-Line" : "";
  const detectedEquipment = trimTag
    ? [{ label: trimTag === "M Sport" ? "M Sport paket" : trimTag, visualReason: "Podatak iz naziva ili opisa" }]
    : [];

  return {
    source: "multi-signal-fallback",
    detectedMake,
    detectedModel,
    detectedGeneration,
    detectedTrim: trimTag,
    detectedBodyStyle: hint.bodyType || "",
    detectedColor: "",
    detectedEquipment,
  };
}

function withHeaders(response, extraHeaders) {
  if (!extraHeaders || !Object.keys(extraHeaders).length) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function api(request, env) {
  const url = new URL(request.url);
  const endpoint = url.pathname.slice("/api/".length);
  const method = request.method;
  const visionEndpoint = endpoint === "analyze-car-photos" || endpoint === "analyze-listing";
  const generalLimit = checkGeneralApiLimit(request);
  let activeLimit = generalLimit;
  if (!generalLimit.allowed) {
    return json({ error: "Previše zahtjeva. Pokušajte ponovno za nekoliko minuta." }, 429, rateLimitHeaders(generalLimit));
  }
  if (visionEndpoint && method === "POST") {
    const visionLimit = checkVisionApiLimit(request);
    activeLimit = visionLimit;
    if (!visionLimit.allowed) {
      return json({ error: "Previše zahtjeva. Pokušajte ponovno za nekoliko minuta." }, 429, rateLimitHeaders(visionLimit));
    }
  }
  const rlHeaders = rateLimitHeaders(activeLimit);
  try {
    if (endpoint === "config" && method === "GET") return json({ operator: env.OPERATOR_NAME || "", address: env.OPERATOR_ADDRESS || "", email: env.OPERATOR_EMAIL || "" }, 200, rlHeaders);
    if (method !== "GET") {
      requireValue(request.headers.get("origin") === url.origin && request.headers.get("content-type")?.startsWith("application/json"), "Neispravan zahtjev.", 403);
    }
    const maxBodyBytes = visionEndpoint ? MAX_VISION_PAYLOAD_BYTES : 1800000;
    const contentLength = Number(request.headers.get("content-length") || "0");
    requireValue(!Number.isFinite(contentLength) || contentLength <= maxBodyBytes, "Zahtjev je prevelik.", 413);
    const raw = method === "GET" ? "{}" : await request.text();
    requireValue(encoder.encode(raw).length <= maxBodyBytes, "Zahtjev je prevelik.", 413);
    let body;
    try { body = parse(raw); } catch { throw new ApiError(400, "Neispravan zahtjev."); }
    requireValue(body && typeof body === "object" && !Array.isArray(body), "Neispravan zahtjev.");
    const ip = request.headers.get("cf-connecting-ip") || "local";
    const client = (endpoint.endsWith("register") || endpoint.endsWith("login") || endpoint === "report") ? await digest(ip) : "";
    if (endpoint === "inventory" && method === "GET") {
      const rows = await stmt(env, "SELECT * FROM listing WHERE status='active' ORDER BY COALESCE(boosted_until>?,0) DESC, created DESC", now()).all();
      return json(rows.results.map(publicListing), 200, rlHeaders);
    }
    if (visionEndpoint && method === "POST") {
      return json(await analyzeCarPhotosHandler(body, env, endpoint === "analyze-listing"), 200, rlHeaders);
    }
    if (endpoint === "auth/register" && method === "POST") {
      await rate(env, "register:" + client, 8, 3600);
      requireValue(body.terms === true && body.declaration === true && ["private","dealer"].includes(body.type), "Prihvatite uvjete i potvrdite status prodavača.");
      const email = value(body, "email", 254).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      requireValue(emailPattern.test(email) && password.length >= 8 && password.length <= 128, "Unesite valjanu e-poštu i lozinku od 8 do 128 znakova.");
      const profile = { ...profileFrom(body, body.type), accepted: { version: LEGAL_VERSION, date: now(), declaration: body.type } };
      requireValue(!await stmt(env, "SELECT id FROM account WHERE email=?", email).first(), "Račun s tom e-poštom već postoji.", 409);
      const id = crypto.randomUUID();
      const inserted = await stmt(env, "INSERT INTO account(id,email,password,profile,created) VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING", id, email, await passwordHash(password), JSON.stringify(profile), now()).run();
      requireValue(inserted.meta.changes, "Račun s tom e-poštom već postoji.", 409);
      return startSession(request, env, id);
    }
    if (endpoint === "auth/login" && method === "POST") {
      const email = value(body, "email", 254).toLowerCase();
      await rate(env, "login:" + client, 24, 900);
      await rate(env, "email:" + await digest(email), 8, 900);
      const account = await stmt(env, "SELECT id,password FROM account WHERE email=?", email).first();
      const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
      const matches = await passwordMatches(password, account?.password ?? dummyPassword);
      requireValue(account && matches, "E-pošta ili lozinka nije ispravna.", 401);
      return startSession(request, env, account.id);
    }
    if (endpoint === "report/status" && method === "GET") {
      const row = await stmt(env, "SELECT status,decision FROM report WHERE id=?", url.searchParams.get("id") || "").first();
      requireValue(row, "Prijava nije pronađena.", 404);
      return json(row);
    }
    if (endpoint === "report" && method === "POST") {
      await rate(env, "report:" + client, 8, 3600);
      const id = crypto.randomUUID(), listing = value(body,"listing",100), rawUrl = value(body,"url",1000), reason = value(body,"reason",100), details = value(body,"details",2500);
      const name = value(body,"name",120), email = value(body,"email",254);
      let reportedUrl;
      try { reportedUrl = new URL(rawUrl); } catch {}
      requireValue(reportedUrl?.origin === url.origin && reportedUrl.searchParams.get("oglas") === listing && listing && reasons.includes(reason) &&
        details.length >= 15 && body.goodFaith === true && (emailPattern.test(email) && name || body.exception === true && !email && !name), "Dopunite poveznicu, obrazloženje i podatke prijavitelja.");
      await stmt(env, "INSERT INTO report(id,listing_id,url,reason,details,name,email,created) VALUES (?,?,?,?,?,?,?,?)", id, listing, rawUrl, reason, details, name || null, email || null, now()).run();
      return json({ id });
    }
    if ((endpoint === "view" || endpoint === "phone") && method === "POST") {
      const id = value(body, "id", 100);
      requireValue(uuidPattern.test(id), "Oglas nije dostupan.", 404);
      if (endpoint === "view") {
        await stmt(env, "UPDATE listing SET views=views+1 WHERE id=? AND status='active'", id).run();
        return json({ ok: true });
      }
      const row = await stmt(env, "UPDATE listing SET reveals=reveals+1 WHERE id=? AND status='active' RETURNING vehicle", id).first();
      requireValue(row, "Oglas nije dostupan.", 404);
      return json({ phone: parse(row.vehicle).phone });
    }
    const account = await accountFor(request, env);
    if (endpoint === "account" && method === "GET" && !account) return json(null);
    requireValue(account, "Prijavite se kako biste nastavili.", 401);
    const profile = parse(account.profile);
    if (endpoint === "account" && method === "GET") {
      const [listings, favorites] = await env.DB.batch([
        stmt(env, "SELECT * FROM listing WHERE account_id=? ORDER BY created DESC", account.id),
        stmt(env, "SELECT listing_id AS id,price FROM favorite WHERE account_id=?", account.id),
      ]);
      return json({ id: account.id, email: account.email, profile, verified: Boolean(account.verified), listings: listings.results.map(readListing), favorites: favorites.results, moderator: env.MODERATOR_ACCOUNT_ID === account.id });
    }
    requireValue(method === "POST" || (endpoint === "moderation" && method === "GET"), "Neispravan zahtjev.", 405);
    switch (endpoint) {
      case "auth/logout":
        await stmt(env, "DELETE FROM session WHERE token=?", account.token).run();
        return json({ ok: true }, 200, { "set-cookie": cookie(request, "", 0) });
      case "profile": {
        const next = { ...profileFrom({ ...profile, ...body }, profile.type), accepted: profile.accepted };
        const samePhone = next.phone === profile.phone;
        const changes = [stmt(env, "UPDATE account SET profile=?,verified=? WHERE id=?", JSON.stringify(next), samePhone ? account.verified : 0, account.id)];
        const address = next.address ? [next.address,[next.postalCode,next.city].filter(Boolean).join(" ")].join(", ") : null;
        changes.push(stmt(env, "UPDATE listing SET vehicle=json_set(vehicle,'$.seller',?,'$.phone',?,'$.sellerAddress',?,'$.sellerHours',?,'$.sellerWorkingHours',json(?)) WHERE account_id=?", next.name, next.phone, address, next.hours ?? null, JSON.stringify(next.workingHours ?? null), account.id));
        await env.DB.batch(changes);
        break;
      }
      case "password": {
        await rate(env, "password:" + account.id, 8, 900);
        requireValue(typeof body.current === "string" && body.current.length <= 128 && await passwordMatches(body.current, account.password), "Trenutačna lozinka nije ispravna.");
        requireValue(typeof body.password === "string" && body.password.length >= 8 && body.password.length <= 128, "Nova lozinka mora imati 8 do 128 znakova.");
        await env.DB.batch([stmt(env, "UPDATE account SET password=? WHERE id=?", await passwordHash(body.password), account.id),
          stmt(env, "DELETE FROM session WHERE account_id=? AND token<>?", account.id, account.token)]);
        break;
      }
      case "account/delete":
        await rate(env, "delete:" + account.id, 8, 900);
        requireValue(typeof body.password === "string" && body.password.length <= 128 && await passwordMatches(body.password, account.password), "Lozinka nije ispravna.");
        await env.DB.batch([stmt(env, "UPDATE report SET name=NULL,email=NULL WHERE email=?", account.email), stmt(env, "DELETE FROM account WHERE id=?", account.id)]);
        return json({ ok: true }, 200, { "set-cookie": cookie(request, "", 0) });
      case "listing/save":
        await saveListing(env, account, body);
        break;
      case "listing/delete":
        await stmt(env, "DELETE FROM listing WHERE id=? AND account_id=?", value(body,"id",100), account.id).run();
        break;
      case "listing/boost": {
        requireValue(env.DEMO_BOOST !== "off", "Naplata isticanja trenutačno nije dostupna.", 503);
        const tier = body.tier;
        requireValue(tier === "boost_72h" || tier === "top_7d", "Odaberite valjanu opciju isticanja.");
        const at = now();
        const id = value(body,"id",100);
        const result = await stmt(env, "UPDATE listing SET boosted_until=?, vehicle=json_set(vehicle,'$.boostTier',?) WHERE id=? AND account_id=? AND status='active' AND (boosted_until IS NULL OR boosted_until<=?)",
          at+(tier === "top_7d" ? 7 : 3)*day, tier, id, account.id, at).run();
        if (!result.meta.changes) {
          const listing = await stmt(env, "SELECT status, vehicle, boosted_until FROM listing WHERE id=? AND account_id=?", id, account.id).first();
          requireValue(listing?.status === "active", "Samo aktivni oglasi mogu se istaknuti.", 409);
          const activeTier = parse(listing.vehicle).boostTier ?? "top_7d";
          requireValue(listing.boosted_until > at && activeTier === tier, "Oglas već ima aktivno isticanje.", 409);
        }
        break;
      }
      case "favorite": {
        const id = value(body,"id",100);
        requireValue(id && Number.isFinite(body.price) && body.price >= 0, "Oglas nije valjan.");
        if (body.saved === true) await stmt(env, "INSERT INTO favorite VALUES (?,?,?) ON CONFLICT DO NOTHING", account.id, id, body.price).run();
        else await stmt(env, "DELETE FROM favorite WHERE account_id=? AND listing_id=?", account.id, id).run();
        break;
      }
      case "moderation": {
        requireValue(env.MODERATOR_ACCOUNT_ID === account.id, "Nemate pristup.", 403);
        if (method === "GET") return json((await stmt(env, "SELECT * FROM report ORDER BY created DESC LIMIT 200").all()).results);
        const id = value(body,"id",100), decision = value(body,"decision",2000);
        requireValue(decision.length >= 10 && ["dismissed","removed"].includes(body.status), "Unesite obrazloženje odluke.");
        const report = await stmt(env, "SELECT listing_id FROM report WHERE id=? AND status='pending'", id).first();
        requireValue(report, "Prijava je već obrađena.", 409);
        const changes = [stmt(env, "UPDATE report SET status=?,decision=? WHERE id=? AND status='pending'", body.status, decision, id)];
        if (body.status === "removed") changes.unshift(stmt(env, "UPDATE listing SET status='draft',moderated=1 WHERE id=? AND EXISTS (SELECT 1 FROM report WHERE id=? AND status='pending')", report.listing_id, id));
        await env.DB.batch(changes);
        break;
      }
      default: throw new ApiError(404, "Stranica nije pronađena.");
    }
    return withHeaders(json({ ok: true }), rlHeaders);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message, fields: error.fields }, error.status, rlHeaders);
    console.error("Marketplace request failed", endpoint, maskWorkerSecrets(error?.name || "Error"));
    return json({ error: "Zahtjev trenutačno nije moguće obraditi." }, 500, rlHeaders);
  }
}
