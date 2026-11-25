/** Dependency-free HTML/Croatian listing parser for the import-listing Edge Function. */

import { deterministicAnalysis } from "./analyze.ts";

export type ParsedImage = { url: string; fallback?: string; caption: string };
export type ParsedListing = { vehicle: Record<string, unknown>; images: ParsedImage[]; fields: Record<string, string> };

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
  .replace(/&#0?39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&([a-z]+);/gi, (entity, name) => entity.length <= 8 ? name : entity);

const stripTags = (value: string) => decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
const scalar = (value: unknown): string => {
  if (typeof value === "number" || typeof value === "string") return String(value).trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return scalar(row.name ?? row.value ?? row["@value"] ?? "");
  }
  return "";
};
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u030f]/g, "")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const boundedInt = (value: number | undefined, min: number, max: number) =>
  value !== undefined && Number.isFinite(value) && value >= min && value <= max ? value : undefined;

function meta(html: string, name: string): string {
  const pattern = /<meta\b[^>]*>/gi;
  for (const tag of html.match(pattern) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (key?.toLowerCase() === name.toLowerCase()) return decodeEntities(tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "");
  }
  return "";
}

function jsonLdObjects(html: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const block of html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    try {
      const queue: unknown[] = [JSON.parse(block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, ""))];
      for (let index = 0; index < queue.length && index < 2000; index++) {
        const value = queue[index];
        if (Array.isArray(value)) { queue.push(...value.slice(0, 2000)); continue; }
        if (!value || typeof value !== "object") continue;
        const row = value as Record<string, unknown>;
        const types = [row["@type"]].flat().map(String);
        if (types.some(type => /(?:^|[/#])(?:Car|Vehicle|Product)$/i.test(type))) result.push(row);
        queue.push(...Object.values(row).filter(item => item && typeof item === "object"));
      }
    } catch { /* Keep parsing other metadata. */ }
  }
  return result;
}

function addImage(list: ParsedImage[], source: unknown, caption: string, base?: string) {
  if (list.length >= 60) return;
  if (Array.isArray(source)) { source.forEach(item => addImage(list, item, caption, base)); return; }
  let raw = typeof source === "string" ? source : "";
  if (!raw && source && typeof source === "object") {
    const row = source as Record<string, unknown>;
    raw = scalar(row.contentUrl ?? row.url);
  }
  if (!raw) return;
  try {
    const url = new URL(decodeEntities(raw), base);
    if (url.protocol !== "https:" || url.username || url.password ||
        /(?:^|[/_.\s-])(?:logo|banner|placeholder|avatar|favicon|sprite)(?:[/_.\s-]|$)/i.test(caption + " " + url.pathname)) return;
    url.hash = "";
    const original = url.href;
    if (/(?:^|\.)njuskalo\.hr$/i.test(url.hostname)) {
      url.pathname = url.pathname.replace(/\/image-(?:small|medium|big|large|full|xxlsize|[a-z]size)\//i, "/image-xlsize/");
    }
    const id = url.hostname + url.pathname;
    if (list.some(image => new URL(image.url).hostname + new URL(image.url).pathname === id)) return;
    list.push({ url: url.href, fallback: original === url.href ? undefined : original, caption: stripTags(caption).slice(0, 200) });
  } catch { /* Invalid gallery source. */ }
}

function imageSources(html: string, base?: string): ParsedImage[] {
  const images: ParsedImage[] = [];
  for (const block of html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    try {
      const data = JSON.parse(block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, ""));
      const queue: unknown[] = [data];
      for (let index = 0; index < queue.length && index < 1000; index++) {
        const value = queue[index];
        if (Array.isArray(value)) { queue.push(...value); continue; }
        if (!value || typeof value !== "object") continue;
        const row = value as Record<string, unknown>;
        if (row.image) addImage(images, row.image, "", base);
        queue.push(...Object.values(row).filter(item => item && typeof item === "object"));
      }
    } catch { /* Continue with HTML images. */ }
  }
  addImage(images, meta(html, "og:image") || meta(html, "og:image:secure_url"), "og-image", base);
  const attrPattern = /(?:data-srcset|srcset|data-full|data-large|data-src|src|href)\s*=\s*["']([^"']+)["']/gi;
  for (const tag of html.match(/<(?:img|source|a|div)\b[^>]*>/gi) ?? []) {
    if (!/gallery|image-|itemprop\s*=\s*["']image/i.test(tag)) continue;
    let best = "";
    for (const match of tag.matchAll(attrPattern)) {
      const candidate = match[1];
      if (/,/.test(candidate) && /\d+[wx]/.test(candidate)) {
        const entries = candidate.split(",").map(entry => entry.trim().split(/\s+/));
        entries.sort((a, b) => parseFloat(b[1] || "0") - parseFloat(a[1] || "0"));
        best = entries[0]?.[0] ?? best;
      } else if (!best || /data-full|data-large/.test(match[0])) best = candidate;
    }
    const caption = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    addImage(images, best, caption, base);
  }
  return images;
}

export function parseListing(content: string, base?: string): ParsedListing {
  const isHtml = /<(?:!doctype|html|head|body|meta|script|div|article|main|section|table|dl|p|h1|ul)\b/i.test(content);
  const fields: Record<string, string> = {};
  const put = (label: string, value: unknown) => {
    const text = scalar(value);
    if (text && !fields[norm(label)]) fields[norm(label)] = text.slice(0, 500);
  };
  const data = jsonLdObjects(isHtml ? content : "")[0] ?? {};
  const offer = ([data.offers].flat()[0] ?? {}) as Record<string, unknown>;
  const seller = (offer.seller ?? data.seller ?? {}) as Record<string, unknown>;
  const engine = (data.vehicleEngine ?? {}) as Record<string, unknown>;
  const unit = (value: unknown) => {
    const row = value as Record<string, unknown> ?? {};
    const unitText = scalar(row.unitText) || ({ KMT: "km", KWT: "kW", CMQ: "cm3" } as Record<string, string>)[scalar(row.unitCode)];
    return [scalar(value), unitText].filter(Boolean).join(" ");
  };
  const props: Record<string, unknown> = {
    "Marka automobila": data.brand ?? data.manufacturer ?? meta(isHtml ? content : "", "vehicle:make") ?? meta(isHtml ? content : "", "product:brand"),
    "Model automobila": data.model ?? meta(isHtml ? content : "", "vehicle:model"),
    "Tip automobila": data.bodyType,
    "Godina proizvodnje": data.productionDate ?? data.vehicleModelDate ?? meta(isHtml ? content : "", "vehicle:year"),
    "Prva registracija": data.dateVehicleFirstRegistered,
    "Prijeđeni kilometri": unit(data.mileageFromOdometer) || meta(isHtml ? content : "", "vehicle:mileage"),
    "Snaga motora": unit(engine.enginePower) || meta(isHtml ? content : "", "vehicle:power_kw"),
    "Radni obujam": unit(engine.engineDisplacement),
    Gorivo: engine.fuelType ?? data.fuelType,
    Mjenjač: data.vehicleTransmission,
    Pogon: data.driveWheelConfiguration,
    Cijena: offer.price ?? offer.lowPrice ?? meta(isHtml ? content : "", "product:price:amount"),
    Valuta: offer.priceCurrency ?? meta(isHtml ? content : "", "product:price:currency"),
    Boja: data.color,
    Prodavatelj: seller.name,
    "Lokacija vozila": (seller.address as Record<string, unknown> | undefined)?.addressLocality,
    VIN: data.vehicleIdentificationNumber,
  };
  Object.entries(props).forEach(([label, value]) => put(label, value));
  for (const property of [data.additionalProperty].flat()) {
    const row = property as Record<string, unknown> | undefined;
    if (row) put(scalar(row.name), row.value);
  }

  if (isHtml) {
    // "Osnovne informacije" tables and description blocks.
    for (const row of content.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi) ?? []) {
      const cells = [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(match => stripTags(match[1]));
      if (cells.length >= 2) put(cells[0], cells[1]);
    }
    for (const match of content.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) put(stripTags(match[1]), stripTags(match[2]));
  }

  const body = isHtml
    ? decodeEntities(content.replace(/<(script|style|header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(?:br|p|li|tr|h[1-6]|dt|dd|div)\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, " "))
    : content;
  const lines = body.split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const labelPattern = /^(Lokacija vozila|Marka automobila|Model automobila|Tip automobila|Marka|Model|Godina proizvodnje|Godište|Godiste|Registriran do|Prva registracija|Prijeđeni kilometri|Prijedeni kilometri|Kilometraža|Kilometraza|Motor|Motorizacija|Gorivo|Snaga motora|Radni obujam|Mjenjač|Mjenjac|Pogon|Karoserija|Stanje|Cijena|Boja|Prodavatelj|Prodavač|VIN|Cilindri)(?:\s*[:\t]\s*|\s+|$)(.*)$/i;
  const indexed = lines.map((line, index) => ({ line, next: lines[index + 1] ?? "" }));
  indexed.forEach(({ line, next }) => {
    const match = line.match(labelPattern);
    if (match) put(match[1], match[2] || (labelPattern.test(next) ? "" : next));
  });

  let title = scalar(data.name) || stripTags(content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") || meta(isHtml ? content : "", "og:title");
  if (!title && !isHtml) title = lines.slice(0, 60).find(line => line.length <= 100 && !labelPattern.test(line)) ?? "";
  let description = scalar(data.description) || meta(isHtml ? content : "", "og:description")
    || stripTags(content.match(/<[^>]*class\s*=\s*["'][^"']*(?:description|opis)[^"']*["'][^>]*>([\s\S]{0,12000}?)<\/(?:div|section|p)>/i)?.[1] ?? "");
  const descriptionStart = lines.findIndex(line => /^opis(?: oglasa| vozila)?\s*:?$/i.test(line));
  if (descriptionStart >= 0) {
    const section = lines.slice(descriptionStart + 1);
    const end = section.findIndex(line => /^(?:slični oglasi|kontaktiraj|pošalji poruku|prijavi oglas|ostali oglasi|podijeli oglas)\b/i.test(line));
    const visible = section.slice(0, end < 0 ? undefined : end).join("\n");
    if (visible && description.length < 160) description = visible;
  }
  if (!description && !isHtml) description = lines.join("\n");

  const text = [title, description, ...Object.values(fields)].join("\n");
  const analysis = deterministicAnalysis({ rawText: text });
  const field = (label: string) => fields[norm(label)] ?? "";
  const digits = (value: string) => value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const firstRegistration = field("Prva registracija");
  const registration = field("Registriran do");
  const priceText = field("Cijena");
  const currency = field("Valuta");
  const vehicle = {
    title: title.slice(0, 100),
    description: description.replace(/\n{3,}/g, "\n\n").slice(0, 12_000),
    make: field("Marka automobila") || field("Marka") || analysis.make || "",
    model: field("Model automobila") || field("Model") || analysis.model || "",
    variant: field("Motorizacija") || field("Motor") || analysis.variant || "",
    bodyType: field("Tip automobila") || field("Karoserija") || analysis.bodyType || "",
    color: field("Boja") || analysis.color || "",
    fuel: field("Gorivo") || analysis.fuel || "",
    gear: field("Mjenjač") || analysis.gear || "",
    drive: field("Pogon") || "",
    cylinders: boundedInt(Number(digits(field("Cilindri")) || analysis.cylinders), 2, 16),
    year: boundedInt(Number((field("Godina proizvodnje") || field("Godište") || "").match(/(?:19|20)\d{2}/)?.[0] ?? analysis.year), 1955, new Date().getFullYear() + 1),
    km: boundedInt(Number(digits(field("Prijeđeni kilometri") || field("Kilometraža")) || analysis.km), 0, 10_000_000),
    kw: boundedInt(Number(digits(field("Snaga motora")) || analysis.kw), 1, 2000),
    cc: boundedInt(Number(digits(field("Radni obujam")) || analysis.cc), 1, 20_000),
    price: /^(?:eur|€)?$/i.test(currency) ? boundedInt(Number(digits(priceText) || analysis.price), 1, 100_000_000) : boundedInt(Number(digits(priceText)), 1, 100_000_000),
    firstRegistration: /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])/.test(firstRegistration) ? firstRegistration.slice(0, 7) : analysis.year ? String(analysis.year) + "-01" : "",
    registrationUntil: /^(?:0[1-9]|1[0-2])\/\d{4}$/.test(registration) ? registration : "",
    vin: (field("VIN").match(/^[A-HJ-NPR-Z0-9]{17}$/i)?.[0] ?? "").toUpperCase(),
    city: field("Lokacija vozila") || "",
    seller: field("Prodavatelj") || field("Prodavač") || "",
    condition: field("Stanje") || "",
    equipment: analysis.equipment ?? [],
  };
  return { vehicle, images: imageSources(isHtml ? content : "", base), fields };
}
