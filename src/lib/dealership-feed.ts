import { load } from "cheerio/slim";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { Vehicle } from "../../app/catalog";
import { CAR_MAKES, chassisFromTitle, modelsFor } from "../data/car-catalog";
import { normalizeLocation } from "../data/croatia-locations";

export const maxFeedBytes = 8 * 1024 * 1024;

type RecordValue = Record<string, unknown>;
export type FeedDealer = {
  id: string;
  name: string;
  city: string;
  county?: string;
  phone: string;
  address?: string;
};
export type FeedVehicle = Vehicle & { externalId?: string };

const key = (value: string) => normalizeLocation(value.split(":").at(-1) ?? value).replace(/[^a-z0-9]/g, "");
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const object = record(value);
  return text(object["#text"] ?? object.value ?? object.name ?? object["@value"] ?? "");
};
function fields(value: unknown) {
  return new Map(Object.entries(record(value)).map(([name, value]) => [key(name), value]));
}
function first(values: Map<string, unknown>, ...names: string[]) {
  return names.map(name => values.get(key(name))).find(value => value != null && value !== "");
}
function amount(value: unknown): number | undefined {
  const clean = text(value).replace(/[^\d.,-]/g, "");
  if (!clean || clean.startsWith("-")) return;
  const normalized = clean.replace(/[.,](?=\d{3}(?:[.,]|$))/g, "").replace(",", ".");
  const valueNumber = Number(normalized);
  if (Number.isFinite(valueNumber)) return valueNumber;
}
const isTrue = (value: unknown) => value === true || /^(1|true|yes|da|potvrdeno)$/i.test(normalizeLocation(text(value)));
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function vehicleFields(value: unknown) {
  const values = fields(value);
  for (const section of ["vehicle-data", "vehicleDetails", "specifications", "technicalData", "pricing", "commercialData", "podaciVozila"]) {
    for (const [name, field] of fields(values.get(key(section)))) {
      if (!values.has(name)) values.set(name, field);
    }
  }
  return values;
}

function collectRecords(source: unknown): RecordValue[] {
  const results: RecordValue[] = [];
  const queue: unknown[] = [source];
  for (let index = 0; index < queue.length; index++) {
    const value = queue[index];
    if (Array.isArray(value)) {
      for (const child of value) queue.push(child);
      continue;
    }
    const row = record(value);
    const data = vehicleFields(row);
    const types = [row["@type"]].flat().map(type => String(type).split(/[\/#]/).at(-1));
    const structured = types.some(type => type === "Vehicle" || type === "Car" || type === "Product");
    const hasIdentity = Boolean(first(data, "make", "manufacturer", "brand", "marka", "mfr", "model", "title", "naslov"));
    const hasPrice = Boolean(first(data, "price", "priceEur", "cijena", "cijenaEur", "grossPrice", "publicPrice", "retailPrice", "priceGross", "offers"));
    if ((structured || hasIdentity) && hasPrice) {
      results.push(row);
      continue;
    }
    for (const child of Object.values(row)) queue.push(child);
  }
  return results;
}

function sourceRows(content: string): RecordValue[] {
  const input = content.replace(/^\uFEFF/, "").trim();
  if (/^[{\[]/.test(input)) return collectRecords(JSON.parse(input));
  if (!/^<(?:!doctype\s+html\b|html\b|head\b|body\b|article\b|script\b|div\b|meta\b)/i.test(input) && XMLValidator.validate(input) === true) {
    if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error("XML deklaracije entiteta nisu podržane.");
    return collectRecords(new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true, processEntities: false, parseTagValue: false }).parse(input));
  }
  if (!/<(?:html|head|body|article|script|div|meta)\b/i.test(input)) throw new Error("Datoteka mora sadržavati valjani XML, JSON ili HTML.");
  const $ = load(input);
  const items = $("script[type='application/ld+json']").toArray().flatMap(script => {
    try { return collectRecords(JSON.parse($(script).text())); }
    catch { return []; }
  });
  const meta = (property: string) => $("meta[property='" + property + "']").first().attr("content");
  if (meta("product:price:amount")) items.push({
    title: meta("og:title"), image: meta("og:image"), url: meta("og:url"),
    price: meta("product:price:amount"), priceCurrency: meta("product:price:currency"),
    make: meta("vehicle:make") ?? meta("product:brand"), model: meta("vehicle:model"),
    year: meta("vehicle:year"), mileage: meta("vehicle:mileage"), kw: meta("vehicle:power_kw"),
    fuel: meta("vehicle:fuel"), transmission: meta("vehicle:transmission"), vin: meta("vehicle:vin"),
  });
  $("[data-vehicle], [data-listing-id], .vehicle-card, .listing-card, [itemtype$='/Car']").each((_, node) => {
    const card = $(node);
    const prop = (name: string) => {
      const match = card.find("[itemprop='" + name + "']").first();
      return match.attr("content") ?? match.text();
    };
    items.push({
      title: card.attr("data-title") ?? (prop("name") || card.find("h2, h3").first().text()),
      make: card.attr("data-make") ?? prop("brand"), model: card.attr("data-model") ?? prop("model"),
      price: card.attr("data-price") ?? (prop("price") || card.find(".price").first().text()),
      year: card.attr("data-year") ?? (prop("vehicleModelDate") || prop("dateVehicleFirstRegistered")),
      mileage: card.attr("data-mileage") ?? prop("mileageFromOdometer"),
      kw: card.attr("data-kw"), power: prop("enginePower"), fuel: card.attr("data-fuel") ?? prop("fuelType"),
      gear: card.attr("data-gear") ?? prop("vehicleTransmission"),
      vin: card.attr("data-vin") ?? prop("vehicleIdentificationNumber"),
      id: card.attr("data-listing-id"),
      image: card.find("img").first().attr("data-src") ?? card.find("img").first().attr("src"),
      url: card.find("a[href]").first().attr("href"),
    });
  });
  return items;
}

function images(value: unknown, base?: string): Vehicle["photos"] {
  const photos = new Set<string>();
  function visit(item: unknown) {
    if (item == null || photos.size >= 6) return;
    if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (typeof item === "string") {
      try {
        const url = new URL(item, base);
        if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048) photos.add(url.href);
      } catch { /* Skip malformed image links. */ }
    } else {
      const data = fields(item);
      visit(first(data, "url", "src", "href", "contentUrl", "imageUrl", "image", "photo", "picture", "#text"));
    }
  }
  visit(value);
  return [...photos].map(src => ({ src }));
}

function equipment(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(equipment);
  if (typeof value === "string") return value.split(/[|;\n]/).map(item => item.trim()).filter(Boolean);
  return Object.values(record(value)).flatMap(equipment);
}

function normalize(row: RecordValue, dealer: FeedDealer, base?: string): Omit<FeedVehicle, "id"> {
  const data = vehicleFields(row);
  const offer = fields([first(data, "offers")].flat()[0]);
  const val = (...names: string[]) => first(data, ...names);
  const string = (...names: string[]) => text(val(...names));
  const title = string("title", "name", "naslov", "vehicleTitle");
  const sourceMake = string("make", "manufacturer", "brand", "marka", "mfr");
  const titleKey = normalizeLocation(title);
  const make = CAR_MAKES.find(make => normalizeLocation(make) === normalizeLocation(sourceMake))
    ?? (sourceMake || CAR_MAKES.find(make => new RegExp("^" + escapePattern(normalizeLocation(make)) + "(?:\\s|$)").test(titleKey)));
  const sourceModel = string("model", "modelName", "modelDescription");
  const models = make ? [...modelsFor(make)].sort((a, b) => b.length - a.length) : [];
  const modelText = normalizeLocation(sourceModel || title);
  const bmwSeries = make === "BMW" && /(?:^|\s)([1-8])\d{2}[a-z]*(?:\s|$)/.exec(modelText);
  const model = models.find(model => new RegExp("(?:^|\\s)" + escapePattern(normalizeLocation(model)) + "(?:\\s|$)").test(modelText))
    ?? (bmwSeries ? "Serija " + bmwSeries[1] : sourceModel || (sourceMake ? title : title.split(/\s+/).slice(make?.split(/\s+/).length ?? 0, (make?.split(/\s+/).length ?? 0) + 1).join(" ")));
  const rawPrice = val("price", "priceEur", "cijena", "cijenaEur", "grossPrice", "publicPrice", "retailPrice", "priceGross") ?? first(offer, "price", "lowPrice");
  const currency = string("currency", "priceCurrency", "valuta") || text(first(fields(rawPrice), "currency", "priceCurrency")) || text(first(offer, "priceCurrency"));
  const price = amount(rawPrice);
  const registration = string("dateVehicleFirstRegistered", "firstRegistration", "firstRegistrationDate", "vehicleModelDate", "productionDate", "date", "year", "godiste", "godinaProizvodnje");
  const year = /\b(?:19|20)\d{2}\b/.exec(registration || title)?.[0];
  const month = /^(?:19|20)\d{2}[-./](0?[1-9]|1[0-2])(?:\b|$)/.exec(registration)?.[1] ?? string("month", "mjesec");
  const km = amount(val("mileageFromOdometer", "mileage", "kilometraza", "odometer", "km"));
  const engine = fields(val("vehicleEngine", "engine"));
  const power = val("power", "enginePower") ?? first(engine, "enginePower", "power");
  const hp = amount(val("hp", "ks", "powerHp"));
  const powerUnit = text(first(fields(power), "unitText", "unitCode"));
  const kw = amount(val("kw", "powerKw", "snagaKw")) ?? (hp === undefined
    ? (amount(power) ?? 0) / (/^(?:hp|ks|ps|bhp)$/i.test(powerUnit) || /\b(?:hp|ks|ps)\b/i.test(text(power)) ? 1.35962 : 1)
    : hp / 1.35962);
  const fuelName = normalizeLocation(string("fuel", "fuelType", "gorivo") || text(first(engine, "fuelType")));
  const fuel: Vehicle["fuel"] | undefined = /hybrid|hibrid|phev/.test(fuelName) ? "Hibrid"
    : /electric|elektr|struj|\bev\b/.test(fuelName) ? "Struja" : /diesel|dizel/.test(fuelName) ? "Dizel"
    : /petrol|gasoline|benzin|otto/.test(fuelName) ? "Benzin" : undefined;
  const transmission = normalizeLocation(string("transmission", "vehicleTransmission", "gear", "mjenjac", "gearbox"));
  const gear: Vehicle["gear"] | undefined = /auto|dsg|cvt|direct.drive/.test(transmission) ? "Automatski"
    : /manual|rucn|mehan/.test(transmission) ? "Ručni" : undefined;
  if (!make || !model || !price || price > 100_000_000 || (currency && !/^EUR$|^€$/i.test(currency)) ||
      !year || Number(year) > new Date().getFullYear() + 1 || km === undefined || !kw || !fuel || !gear) {
    throw new Error("Nedostaju valjani podaci za objavu (marka, model, cijena u EUR, godište, km, kW, gorivo i mjenjač).");
  }
  const flags: Vehicle["flags"] = [];
  if (isTrue(val("vatDeductible", "vatReclaimable", "vat", "pdv", "r1"))) flags.push("pdv");
  if (isTrue(val("cvhVerified", "verifiedMileage", "cvh", "potvrdeniKm"))) flags.push("cvh");
  const vin = string("vin", "vehicleIdentificationNumber", "brojSasije").toUpperCase();
  const destination = string("url", "href", "link", "listingUrl") || text(first(offer, "url"));
  let listingPath = destination;
  if (destination) {
    try { const url = new URL(destination, base); listingPath = url.pathname + url.search; } catch { /* Keep relative identifiers. */ }
  }
  const externalId = string("externalId", "id", "sku", "stockNumber", "vehicleId", "listingId", "oglasId", "internalNumber", "slug") || listingPath;
  const drivetrain = normalizeLocation(string("drive", "driveWheelConfiguration", "drivetrain", "pogon"));
  const drive = /4x4|awd|4wd|allwheel|quattro|xdrive|sve/.test(drivetrain) ? "Svi kotači"
    : /rwd|rear|straz/.test(drivetrain) ? "Stražnji" : /fwd|front|pred/.test(drivetrain) ? "Prednji" : "";
  const monthNumber = Number(month);
  const trim = string("trim", "vehicleConfiguration", "opremaPaket", "variant").slice(0, 100);
  return {
    make: make.slice(0, 80), model: model.slice(0, 80), title: (title || [make, model, trim].filter(Boolean).join(" ")).slice(0, 100),
    trim, generation: (string("generation", "generacija", "chassis") || chassisFromTitle(make, model, title) || "").slice(0, 100),
    bodyType: string("bodyType", "bodyStyle", "karoserija").slice(0, 40),
    externalId: externalId.slice(0, 300) || undefined,
    date: year + "-" + String(monthNumber >= 1 && monthNumber <= 12 ? monthNumber : 1).padStart(2, "0"),
    km: Math.round(km), price: Math.round(price), kw: Math.round(kw), cc: amount(val("cc", "engineCc", "displacement")) ?? 0,
    co2: amount(val("co2", "co2Emissions")) ?? 0, fuel, gear, drive,
    vin: /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : "",
    city: dealer.city, county: dealer.county, seller: dealer.name, phone: dealer.phone, sellerAddress: dealer.address,
    dealer: true, verified: false, dealershipId: dealer.id, flags,
    photos: images(val("images", "image", "photos", "pictures", "photo", "picture"), base),
    color: string("color", "boja").slice(0, 60) || undefined,
    sellerNote: string("description", "opis").slice(0, 400),
    equipment: { Sigurnost: [], Udobnost: [], Multimedija: [], Eksterijer: [...new Set(equipment(val("equipment", "features", "oprema")))].slice(0, 40).map(item => item.slice(0, 150)) },
  };
}

export function feedIdentity(vehicle: Pick<FeedVehicle, "externalId" | "vin" | "title" | "date">) {
  return vehicle.vin || vehicle.externalId || normalizeLocation(vehicle.title) + "/" + vehicle.date;
}

async function stableId(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const hex = Array.from(hash.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-5" + hex.slice(13, 16) + "-8" + hex.slice(17, 20) + "-" + hex.slice(20);
}

export async function parseDealershipFeed(content: string, dealer: FeedDealer, base?: string) {
  if (new TextEncoder().encode(content).byteLength > maxFeedBytes) throw new Error("Feed je veći od 8 MB.");
  const rows = sourceRows(content);
  const entries = new Map<string, FeedVehicle>();
  const vins = new Set<string>();
  const externalIds = new Set<string>();
  const issues: string[] = [];
  let skipped = 0;
  for (const [index, row] of rows.entries()) {
    let details: ReturnType<typeof normalize>;
    try {
      details = normalize(row, dealer, base);
    } catch (error) {
      skipped++;
      if (issues.length < 12) issues.push("Zapis " + (index + 1) + ": " + (error as Error).message);
      continue;
    }
    const identity = feedIdentity(details);
    if ((details.vin && vins.has(details.vin)) || (details.externalId && externalIds.has(details.externalId)) || entries.has(identity)) {
      skipped++;
      continue;
    }
    const id = await stableId(dealer.id + "/" + identity);
    entries.set(identity, { ...details, id });
    if (details.vin) vins.add(details.vin);
    if (details.externalId) externalIds.add(details.externalId);
  }
  if (!entries.size) throw new Error(issues[0] ?? "U feedu nisu pronađeni oglasi vozila.");
  return { vehicles: [...entries.values()], skipped, issues };
}

export async function readFeedResponse(response: Response) {
  if (!response.ok || !response.body) throw new Error("Feed nije dostupan (HTTP " + response.status + ").");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let content = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return content + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxFeedBytes) throw new Error("Feed je veći od 8 MB.");
      content += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

