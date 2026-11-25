import { normalizePhone, profileErrors } from "../src/data/profile-validation.ts";
import { croatianCounties, croatianLocations, normalizeLocation } from "../src/data/croatia-locations.ts";
import { formatHours, validHours } from "../src/data/working-hours.ts";
export const LEGAL_VERSION = "2026-11-25";
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

async function passwordHash(password, salt = hex(bytes(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(salt), iterations: 600000 }, key, 256);
  return salt + "." + hex(hash);
}

async function passwordMatches(password, stored) {
  const computed = await passwordHash(password, stored.split(".")[0]);
  let difference = 0;
  for (let i = 0; i < stored.length; i++) difference |= computed.charCodeAt(i) ^ stored.charCodeAt(i);
  return difference === 0;
}

const cookie = (request, token, age) => "sasija_session=" + token + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + age +
  (new URL(request.url).protocol === "https:" ? "; Secure" : "");

async function startSession(request, env, accountId) {
  const raw = hex(bytes(32));
  await stmt(env, "INSERT INTO session VALUES (?,?,?)", await digest(raw), accountId, now() + 14 * day).run();
  return json({ ok: true }, 200, { "set-cookie": cookie(request, raw, 14 * day) });
}

async function accountFor(request, env) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)sasija_session=([\da-f]{64})(?:;|$)/)?.[1];
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
    Object.assign(profile, { oib: value(body, "oib", 11), address: value(body, "address", 200), hours: value(body, "hours", 260), importUrl: value(body, "importUrl", 500) });
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
  return { ...parse(row.vehicle), id: row.id, status: row.status, views: row.views, reveals: row.reveals, boostedUntil: row.boosted_until };
}

function publicListing(row) {
  const { status, views, reveals, ...listing } = readListing(row);
  return { ...listing, phone: "", contactAvailable: true, dealershipId: listing.dealer ? row.account_id : undefined };
}

function safePhoto(source) {
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
  requireValue(vehicle && typeof vehicle === "object" && ["active","draft","sold"].includes(status), "Oglas nije valjan.");
  requireValue(uuidPattern.test(vehicle.id) && value(vehicle, "title", 100) && value(vehicle, "make", 80) && value(vehicle, "model", 80), "Unesite vozilo i naslov.");
  requireValue(Number.isFinite(vehicle.price) && vehicle.price > 0 && vehicle.price <= 100000000 && Number.isFinite(vehicle.km) &&
    vehicle.km >= 0 && /^\d{4}-(0[1-9]|1[0-2])$/.test(vehicle.date) && Number.isFinite(vehicle.kw) && vehicle.kw > 0 &&
    Number.isFinite(vehicle.co2) && Number.isFinite(vehicle.cc) && (!vehicle.vin || /^[A-HJ-NPR-Z0-9]{17}$/.test(vehicle.vin)), "Provjerite cijenu, tehničke podatke i VIN.");
  requireValue(Array.isArray(vehicle.photos) && vehicle.photos.length <= 6 && vehicle.photos.every(photo => typeof photo?.src === "string" && photo.src.length <= 550000 &&
    safePhoto(photo.src)), "Fotografije nisu valjane.");
  requireValue(Array.isArray(vehicle.flags) && vehicle.flags.every(flag => ["kupac","pdv","dolazak","cvh"].includes(flag)) &&
    vehicle.equipment && ["Sigurnost","Udobnost","Multimedija","Eksterijer"].every(key => Array.isArray(vehicle.equipment[key]) && vehicle.equipment[key].every(item => typeof item === "string")), "Oprema ili status oglasa nisu valjani.");
  const location = locationFrom({ ...profile, ...Object.fromEntries(["city","postalCode","county"].filter(key => vehicle[key] !== undefined).map(key => [key,vehicle[key]])) });
  const dealerAddress = profile.address && [profile.address, [profile.postalCode, profile.city].filter(Boolean).join(" ")].join(", ");
  const clean = {
    id: vehicle.id, title: value(vehicle,"title",100), make: value(vehicle,"make",80), model: value(vehicle,"model",80),
    generation: value(vehicle,"generation",100), variant: value(vehicle,"variant",100), trim: value(vehicle,"trim",100),
    date: vehicle.date, price:vehicle.price, km:vehicle.km, kw:vehicle.kw, cc:vehicle.cc, co2:vehicle.co2,
    gear:value(vehicle,"gear",30), fuel:value(vehicle,"fuel",30), drive:value(vehicle,"drive",30), vin:value(vehicle,"vin",17),
    sellerNote:value(vehicle,"sellerNote",400), flags:vehicle.flags,
    photos:vehicle.photos.map(photo => ({src:photo.src})),
    equipment:Object.fromEntries(["Sigurnost","Udobnost","Multimedija","Eksterijer"].map(key => [key,vehicle.equipment[key].slice(0,40).map(item=>item.slice(0,150))])),
    makeEquipment:Array.isArray(vehicle.makeEquipment) ? vehicle.makeEquipment.filter(item=>typeof item==="string").slice(0,60) : [],
    catalogEquipment:Array.isArray(vehicle.catalogEquipment) ? vehicle.catalogEquipment.filter(item=>typeof item==="string" && item.startsWith("eq:")).slice(0,160) : [],
    phone: profile.phone, email: account.email, ...location, seller: profile.name,
    dealer: profile.type === "dealer", verified: false, sellerAddress: dealerAddress, sellerHours: profile.hours, sellerWorkingHours: profile.workingHours,
    demo: false };
  requireValue(["Dizel","Benzin","Hibrid","Struja"].includes(clean.fuel) && ["Automatski","Ručni"].includes(clean.gear), "Odaberite gorivo i mjenjač.");
  const id = vehicle.id;
  const data = JSON.stringify(clean);
  requireValue(encoder.encode(data).length <= 1500000, "Fotografije su prevelike. Uklonite jednu ili više fotografija.");
  const existing = await stmt(env, "SELECT status,moderated FROM listing WHERE id=? AND account_id=?", id, account.id).first();
  requireValue(existing || status !== "sold", "Najprije spremite oglas.");
  if (status === "active") {
    requireValue(!existing?.moderated, "Oglas je povučen odlukom moderatora.", 403);
    requireValue(account.verified || profile.type === "dealer", "Potvrdite telefon prije objave.", 403);
    const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Zagreb" }).format(new Date()));
    const ledger = stmt(env, "INSERT INTO publication SELECT ?,?,? WHERE ?='dealer' OR (SELECT COUNT(*) FROM publication WHERE account_id=? AND year=?)<2 ON CONFLICT(id) DO NOTHING", id, account.id, year, profile.type, account.id, year);
    const verifiedNow = "EXISTS (SELECT 1 FROM account WHERE id=? AND (verified=1 OR ?='dealer'))";
    const listing = stmt(env, "INSERT INTO listing(id,account_id,vehicle,status,created) SELECT ?,?,?,'active',? WHERE EXISTS (SELECT 1 FROM publication WHERE id=? AND account_id=?) AND " + verifiedNow +
      " ON CONFLICT(id) DO UPDATE SET vehicle=excluded.vehicle,status='active' WHERE listing.account_id=excluded.account_id AND listing.moderated=0", id, account.id, data, now(), id, account.id, account.id, profile.type);
    const response = await env.DB.batch([ledger, listing]);
    requireValue(response[1].meta.changes, "Iskoristili ste dva besplatna oglasa za ovu kalendarsku godinu ili oglas nije moguće objaviti.", 409);
  } else {
    await stmt(env, "INSERT INTO listing(id,account_id,vehicle,status,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET vehicle=excluded.vehicle,status=excluded.status WHERE listing.account_id=excluded.account_id", id, account.id, data, status, now()).run();
  }
}

export async function api(request, env) {
  const url = new URL(request.url);
  const endpoint = url.pathname.slice("/api/".length);
  const method = request.method;
  try {
    if (endpoint === "config" && method === "GET") return json({ operator: env.OPERATOR_NAME || "", address: env.OPERATOR_ADDRESS || "", email: env.OPERATOR_EMAIL || "", demoOtp: env.DEMO_OTP !== "off" });
    if (method !== "GET") {
      requireValue(request.headers.get("origin") === url.origin && request.headers.get("content-type")?.startsWith("application/json"), "Neispravan zahtjev.", 403);
    }
    const raw = method === "GET" ? "{}" : await request.text();
    requireValue(raw.length <= 1800000, "Zahtjev je prevelik.", 413);
    let body;
    try { body = parse(raw); } catch { throw new ApiError(400, "Neispravan zahtjev."); }
    requireValue(body && typeof body === "object" && !Array.isArray(body), "Neispravan zahtjev.");
    const ip = request.headers.get("cf-connecting-ip") || "local";
    const client = (endpoint.endsWith("register") || endpoint.endsWith("login") || endpoint === "report") ? await digest(ip) : "";
    if (endpoint === "inventory" && method === "GET") {
      const rows = await stmt(env, "SELECT * FROM listing WHERE status='active' ORDER BY COALESCE(boosted_until>?,0) DESC, created DESC", now()).all();
      return json(rows.results.map(publicListing));
    }
    if (endpoint === "auth/register" && method === "POST") {
      await rate(env, "register:" + client, 8, 3600);
      requireValue(body.terms === true && body.declaration === true && ["private","dealer"].includes(body.type), "Prihvatite uvjete i potvrdite status prodavača.");
      const email = value(body, "email", 254).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      requireValue(emailPattern.test(email) && password.length >= 12 && password.length <= 128, "Unesite valjanu e-poštu i lozinku od 12 do 128 znakova.");
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
      const matches = await passwordMatches(password, account?.password ?? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa." + "a".repeat(64));
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
      case "otp/start": {
        requireValue(env.DEMO_OTP !== "off", "SMS pružatelj nije konfiguriran.", 503);
        await rate(env, "otp:" + account.id, 4, 3600);
        const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
        await stmt(env, "INSERT INTO otp VALUES (?,?,?,0) ON CONFLICT(account_id) DO UPDATE SET code=excluded.code, expires=excluded.expires, attempts=0", account.id, await digest(account.id + code), now()+300).run();
        return json({ demoCode: code });
      }
      case "otp/verify": {
        const code = value(body,"code",6);
        const hash = await digest(account.id + code);
        const consume = stmt(env, "DELETE FROM otp WHERE account_id=? AND code=? AND expires>? AND attempts<5", account.id, hash, now());
        const verify = stmt(env, "UPDATE account SET verified=1 WHERE id=? AND changes()=1", account.id);
        const attempt = stmt(env, "UPDATE otp SET attempts=attempts+1 WHERE account_id=? AND expires>? AND attempts<5", account.id, now());
        const [consumed] = await env.DB.batch([consume, verify, attempt]);
        requireValue(consumed.meta.changes, "Kod nije ispravan ili je istekao.");
        break;
      }
      case "profile": {
        const next = { ...profileFrom({ ...profile, ...body }, profile.type), accepted: profile.accepted };
        const samePhone = next.phone === profile.phone;
        const changes = [stmt(env, "UPDATE account SET profile=?,verified=? WHERE id=?", JSON.stringify(next), samePhone ? account.verified : 0, account.id)];
        if (!samePhone) {
          changes.push(stmt(env, "DELETE FROM otp WHERE account_id=?", account.id));
          if (profile.type === "private") changes.push(stmt(env, "UPDATE listing SET status='draft' WHERE account_id=? AND status='active'", account.id));
        }
        const address = next.address ? [next.address,[next.postalCode,next.city].filter(Boolean).join(" ")].join(", ") : null;
        changes.push(stmt(env, "UPDATE listing SET vehicle=json_set(vehicle,'$.seller',?,'$.phone',?,'$.sellerAddress',?,'$.sellerHours',?,'$.sellerWorkingHours',json(?)) WHERE account_id=?", next.name, next.phone, address, next.hours ?? null, JSON.stringify(next.workingHours ?? null), account.id));
        await env.DB.batch(changes);
        break;
      }
      case "password": {
        await rate(env, "password:" + account.id, 8, 900);
        requireValue(typeof body.current === "string" && body.current.length <= 128 && await passwordMatches(body.current, account.password), "Trenutačna lozinka nije ispravna.");
        requireValue(typeof body.password === "string" && body.password.length >= 12 && body.password.length <= 128, "Nova lozinka mora imati 12 do 128 znakova.");
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
        const result = await stmt(env, "UPDATE listing SET boosted_until=? WHERE id=? AND account_id=? AND status='active'", now()+7*day, value(body,"id",100), account.id).run();
        requireValue(result.meta.changes, "Samo aktivni oglasi mogu se istaknuti.", 409);
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
    return json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message, fields: error.fields }, error.status);
    console.error("Marketplace request failed", endpoint, error?.name);
    return json({ error: "Zahtjev trenutačno nije moguće obraditi." }, 500);
  }
}
