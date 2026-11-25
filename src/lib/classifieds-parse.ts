import { load } from "cheerio/slim";
import { normalizeImportedVehicle } from "../../app/search";

const labels = ["Lokacija vozila", "Marka automobila", "Model automobila", "Tip automobila", "Marka", "Model",
  "Godina proizvodnje", "Godište", "Registriran do", "Prva registracija", "Prijeđeni kilometri", "Kilometraža",
  "Motor", "Gorivo", "Snaga motora", "Radni obujam", "Mjenjač", "Pogon", "Karoserija", "Stanje", "Cijena", "Boja", "Prodavatelj", "VIN"];
const labelPattern = new RegExp("^(" + labels.join("|") + ")(?:\\s*[:\\t]\\s*|\\s+|$)(.*)$", "i");
type Data = Record<string, unknown>;
const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
function scalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "string") return String(value).trim();
  const data = object(value);
  return scalar(data.name ?? data.value ?? data["@value"] ?? "");
}

export function parseClassifieds(content: string, base?: string) {
  const fields: Record<string, string> = {};
  const images: { url: string; fallback?: string; caption: string }[] = [];
  const seen = new Set<string>();
  const put = (label: string, value: unknown) => {
    const text = scalar(value);
    if (text) fields[label] ??= text.slice(0, 500);
  };
  const addImage = (source: unknown, caption = "") => {
    if (images.length >= 50) return;
    if (Array.isArray(source)) { source.forEach(item => addImage(item, caption)); return; }
    if (typeof source !== "string") {
      const row = object(source);
      if (row.contentUrl || row.url) addImage(row.contentUrl ?? row.url, scalar(row.caption) || caption);
      return;
    }
    try {
      const url = new URL(source, base);
      if (url.protocol !== "https:" || url.username || url.password ||
          /(?:^|[/_.\s-])(?:logo|banner|placeholder|avatar|favicon|sprite)(?:[/_.\s-]|$)|\bauto centar\b|^ac\s+\S+$/i.test(caption + " " + url.pathname)) return;
      url.hash = "";
      const original = url.href;
      if (/(?:^|\.)njuskalo\.hr$/i.test(url.hostname)) url.pathname = url.pathname.replace(/\/image-(?:small|medium|big|large|full|xxlsize|[a-z]size)\//i, "/image-xlsize/");
      const id = url.hostname + url.pathname;
      if (seen.has(id)) return;
      seen.add(id);
      images.push({ url: url.href, fallback: original === url.href ? undefined : original, caption });
    } catch { /* Invalid gallery source. */ }
  };
  let title = "", description = "", pageText = content;
  const equipment: string[] = [];
  if (/<(?:!doctype|html|head|body|meta|script|div|article|main|section|table|dl|p|h1|ul)\b/i.test(content)) {
    const $ = load(content);
    const candidates: Data[] = [];
    $("script[type='application/ld+json']").each((_, node) => {
      try {
        const queue: unknown[] = [JSON.parse($(node).text())];
        for (let index = 0; index < queue.length && index < 4000; index++) {
          const value = queue[index];
          if (Array.isArray(value)) { queue.push(...value.slice(0, 4000)); continue; }
          const row = object(value);
          if ([row["@type"]].flat().some(type => /(?:^|[/#])(?:Car|Vehicle|Product)$/i.test(String(type)))) candidates.push(row);
          queue.push(...Object.values(row).filter(item => item && typeof item === "object"));
        }
      } catch { /* Continue with HTML fields. */ }
    });
    const data = candidates.find(row => [row["@type"]].flat().some(type => /(?:Car|Vehicle)$/i.test(String(type)))) ?? candidates[0] ?? {};
    const offer = object([data.offers].flat()[0]);
    const seller = object(offer.seller ?? data.seller);
    const engine = object(data.vehicleEngine);
    const condition = scalar(offer.itemCondition ?? data.itemCondition).split("/").at(-1)?.replace(/Condition$/, "");
    const unitValue = (value: unknown) => [scalar(value), scalar(object(value).unitText) || ({ KMT: "km", KWT: "kW", CMQ: "cm3" } as Record<string, string>)[scalar(object(value).unitCode)]].filter(Boolean).join(" ");
    const meta = (name: string) => $("meta").filter((_, node) => [$(node).attr("property"), $(node).attr("name")].includes(name)).first().attr("content");
    title = scalar(data.name) || $("h1").first().text().trim() || meta("og:title") || "";
    const described = $("[itemprop='description'], .description, .ad-description, .oglas-opis, [class*='Description-description'], [data-testid='description']").first();
    described.find("br").replaceWith("\n");
    described.find("p,li").append("\n");
    description = described.attr("content") || described.text().trim() || scalar(data.description) || meta("og:description") || "";
    $("tr, dl dt, [class*='BasicDetails'] dt, .table-display--row").each((_, node) => {
      const item = $(node);
      const cells = item.children();
      if (item.is("dt")) put(item.text().trim(), item.next("dd").text());
      else if (cells.length === 2) put(cells.first().text().trim(), cells.last().text());
    });
    const props: Record<string, unknown> = {
      make: data.brand ?? data.manufacturer ?? meta("vehicle:make") ?? meta("product:brand"), model: data.model ?? meta("vehicle:model"),
      bodyType: data.bodyType, year: data.productionDate ?? data.vehicleModelDate ?? meta("vehicle:year"), firstRegistration: data.dateVehicleFirstRegistered,
      mileage: unitValue(data.mileageFromOdometer) || meta("vehicle:mileage"),
      kw: unitValue(engine.enginePower) || meta("vehicle:power_kw"), cc: unitValue(engine.engineDisplacement),
      fuel: engine.fuelType ?? data.fuelType, gear: data.vehicleTransmission, drive: data.driveWheelConfiguration,
      price: offer.price ?? offer.lowPrice ?? meta("product:price:amount"), currency: offer.priceCurrency ?? meta("product:price:currency"),
      color: data.color, seller: seller.name, city: object(seller.address).addressLocality, condition: condition === "Used" ? "Rabljeno" : condition === "New" ? "Novo" : condition,
      vin: data.vehicleIdentificationNumber,
    };
    Object.entries(props).forEach(([label, value]) => put(label, value));
    for (const property of [data.additionalProperty].flat()) put(scalar(object(property).name), object(property).value);
    addImage(data.image);
    $("meta[property='og:image'], meta[property='og:image:secure_url']").each((_, node) => addImage($(node).attr("content")));
    $("[class*='gallery' i] img, [class*='gallery' i] source, [data-testid*='gallery' i] img, img[itemprop='image'], a[href*='/image-']").each((_, node) => {
      const item = $(node);
      const set = item.attr("data-srcset") ?? item.attr("srcset");
      const best = set?.split(",").map(entry => entry.trim().split(/\s+/)).sort((a, b) => parseFloat(b[1] || "0") - parseFloat(a[1] || "0"))[0]?.[0];
      addImage(item.attr("data-full") ?? item.attr("data-large") ?? best ?? item.attr("data-src") ?? item.attr("src") ?? item.attr("href"), item.attr("alt"));
    });
    $("[class*='equipment' i] li, [class*='oprema' i] li").each((_, node) => { if (equipment.length < 60) equipment.push($(node).text().trim().slice(0, 100)); });
    $("script,style,header,footer,nav").remove();
    $("br").replaceWith("\n");
    $("h1,h2,h3,p,td,th,dt,dd,li,div").append("\n");
    pageText = $("body").text();
  }
  const lines = pageText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(labelPattern);
    if (match) put(match[1], match[2] || (lines[i + 1] && !labelPattern.test(lines[i + 1]) ? lines[i + 1] : ""));
  }
  if (!title) {
    title = lines.slice(0, 80).find(line => line.length <= 100 && !labelPattern.test(line) &&
      normalizeImportedVehicle({ title: line }).model) ?? "";
  }
  const descriptionStart = lines.findIndex(line => /^opis(?: oglasa| vozila)?\s*:?$/i.test(line));
  if (descriptionStart >= 0) {
    const section = lines.slice(descriptionStart + 1);
    const end = section.findIndex(line => /^(?:slični oglasi|kontaktiraj|pošalji poruku|prijavi oglas|ostali oglasi|podijeli oglas)\b/i.test(line));
    const visible = section.slice(0, end < 0 ? undefined : end).join("\n");
    if (visible && (!description || description.length < 160)) description = visible;
  }
  if (!description && !/<[a-z][^>]*>/i.test(content)) description = lines.join("\n");
  return { vehicle: normalizeImportedVehicle({ title, description, fields, equipment }), images };
}

