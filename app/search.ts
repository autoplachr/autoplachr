import { normalizeSearchQuery, searchTerms } from "../src/lib/search-query";
import { normalizeVehicleCategory, vehicleCategory, type CategoryId } from "./vehicle-category";
import { boostPriority } from "./listing-boost";
import { croatianCounties, normalizeLocation } from "../src/data/croatia-locations";
import { equipmentFor, equipmentId } from "../src/data/equipment-catalog";
import { cities, countyByCity, flags, fuels, gears, marketValuation, type Flag, type Vehicle } from "./catalog";
import { legacySportOption, selectedMakeOptions, vehicleMakeOptions } from "./make-equipment";
import { CAR_MAKES, chassisFromTitle, matchesGeneration, modelsFor, validGeneration } from "../src/data/car-catalog";

type CanonicalHints = { model?: string; generation?: string; bodyType?: string };
const IMPORT_ALIASES: readonly (readonly [RegExp, string | ((match: RegExpMatchArray) => string), CanonicalHints])[] = [
  [/\ba4\s*(?:avant|allroad|kombi|touring)\b/i, "A4", { bodyType: "Karavan" }],
  [/\ba6\s*(?:avant|allroad|kombi)\b/i, "A6", { bodyType: "Karavan" }],
  [/\ba3\s*(?:sportback|kombi)\b/i, "A3", { bodyType: "Hatchback / Kompakt" }],
  [/\bq([23578])\b/i, (match) => "Q" + match[1], { bodyType: "SUV / Terenac" }],
  [/\bc\s*(?:klasa)?\s*\d{3}\s*(?:d|cdi|i|e)\b/i, "C-klasa", {}],
  [/\be\s*(?:klasa)?\s*\d{3}\s*(?:d|cdi|i|e)\b/i, "E-klasa", {}],
  [/\bgolf\s*[578]\b/i, "Golf", {}],
  [/\bpassat\s*(?:variant|combi|alltrack|sw)\b/i, "Passat", { bodyType: "Karavan" }],
  [/\btiguan\b/i, "Tiguan", { bodyType: "SUV / Terenac" }],
  [/\boctavia\s*(?:combi|estate|rs)\b/i, "Octavia", {}],
  [/\bsuperb\s*(?:combi|estate)\b/i, "Superb", { bodyType: "Karavan" }],
  [/\b308\s*(?:sw|estate|combi)\b/i, "308", { bodyType: "Karavan" }],
  [/\bastra\s*(?:sports tourer|combi|estate|sw)\b/i, "Astra", { bodyType: "Karavan" }],
  [/\bcorolla\s*(?:touring sports|combi|estate)\b/i, "Corolla", { bodyType: "Karavan" }],
  [/\brav4\b/i, "RAV4", { bodyType: "SUV / Terenac" }],
  [/\btucson\b/i, "Tucson", { bodyType: "SUV / Terenac" }],
  [/\bsportage\b/i, "Sportage", { bodyType: "SUV / Terenac" }],
  [/\bmacan\b|\bcayenne\b/i, (match) => match[0].charAt(0).toUpperCase() + match[0].slice(1), { bodyType: "SUV / Terenac" }],
];

export function canonicalizeImported(input: {
  make: string; model: string; title?: string; variant?: string; year?: number;
  bodyType?: string; cc?: number; drive?: string; text?: string;
}) {
  const text = normalizeLocation([input.make, input.model, input.title, input.variant, input.text].filter(Boolean).join(" "));
  const make = /mercedes/.test(text) ? "Mercedes-Benz" : /volkswagen|\bvw\b/.test(text) ? "Volkswagen"
    : /skoda/.test(text) ? "Škoda" : input.make;
  const badge = text.match(/\b(430d|435d|420d|330d|320d|318d|530d|520d|220d|116d|118d|120d|3\.0tdi|2\.0tdi|[1-8][0-5]\d[die])\b/)?.[0] ?? "";
  let model = input.model;
  let generation = "";
  let bodyType = input.bodyType ?? "";
  const dropdown = make ? modelsFor(make, false) : [];
  const pick = (candidate?: string) => candidate && dropdown.find(option => normalizeLocation(option) === normalizeLocation(candidate));

  if (make === "BMW") {
    const number = badge.match(/^([1-8])/)?.[1] ?? text.match(/\bserija\s*([1-8])\b/)?.[1];
    const series = number ? pick(`Serija ${number}`) ?? `Serija ${number}` : "";
    if (series) {
      model = series;
      const year = input.year ?? 2020;
      if (number === "1") generation = year <= 2013 ? "E81/E87" : year < 2019 ? "F20/F21" : "F40";
      if (number === "3") generation = year <= 2013 ? "E90/E91" : year < 2020 ? "F30/F31" : "G20/G21";
      if (number === "4") {
        const granCoupe = /grancoupe|gran\s*coupe/.test(text);
        const cabrio = /cabrio/.test(text);
        bodyType = cabrio ? "Cabrio / Roadster" : "Coupé";
        generation = granCoupe ? (year >= 2021 ? "G26" : "F36") : cabrio ? (year >= 2021 ? "G23" : "F33") : year >= 2021 ? "G22" : "F32";
      }
      if (number === "5") generation = year <= 2017 ? "F10/F11" : "G30/G31";
    }
    const exactX = ["X1", "X3", "X5", "X6"].find(x => normalizeLocation(x) === normalizeLocation(input.model));
    if (exactX && pick(exactX)) { model = exactX; bodyType = "SUV / Terenac"; }
  } else {
    for (const [pattern, mapped, hints] of IMPORT_ALIASES) {
      const match = text.match(pattern);
      if (!match) continue;
      const candidate = typeof mapped === "function" ? mapped(match) : mapped;
      const canonical = pick(candidate) ?? candidate;
      model = canonical;
      if (hints.bodyType) bodyType = hints.bodyType;
      if (hints.generation) generation = hints.generation;
      break;
    }
    if (/\bgolf\s*7\b/.test(text)) generation = /facelift|golf\s*7\.5/.test(text) ? "5G facelift" : "5G";
    if (/\bgolf\s*8\b/.test(text)) generation = "CD";
  }
  if (/\b(?:avant|variant|combi|touring|estate|sw|sportswagon|allroad)\b/.test(text) && !/\b(?:suv|terenac|x[13567]\b)/.test(text)) bodyType = "Karavan";

  const fuel = /\b(?:gte|ehybrid|plugin|phev)\b/.test(text) ? "Plug-in hibrid"
    : /hibrid|hybrid/.test(text) ? "Hibrid"
    : /\b(?:dizel|diesel|tdi|bluehdi|hdi|dci|cdti|crdi|jtdm?|430d|435d|420d|330d|320d|318d|530d|520d|220d|116d|118d|120d|[1-8][0-5]\d d)\b/.test(text) ? "Dizel"
    : /\b(?:elektri|electric|struja)\b/.test(text) ? "Električni"
    : /\b(?:benzin|petrol|gti|tsi|tfsi|ecoboost|tce)\b/.test(text) ? "Benzin" : undefined;
  const driveText = normalizeLocation(input.drive ?? "");
  const drive = /\b(?:xdrive|quattro|4matic|4motion|awd|4x4|svi)\b/.test(text + " " + driveText) ? "4x4"
    : /straznji|rear|rwd/.test(driveText) ? "Stražnji"
    : /prednji|front|fwd/.test(driveText) ? "Prednji"
    : make === "BMW" && ["Serija 3", "Serija 5"].includes(model) ? "Stražnji" : "Prednji";
  let cc = input.cc;
  if (/430d|435d|330d|530d|3\.0tdi/.test(text) && cc !== undefined && cc >= 1500 && cc <= 2400) cc = 2993;
  const cylinders = /v8|4\.0tdi/.test(text) ? 8
    : /430d|435d|330d|530d|3\.0tdi/.test(text) ? 6
    : /320d|220d|2\.0tdi/.test(text) ? 4
    : cc !== undefined && cc < 1100 ? 3
    : cc !== undefined && cc >= 2450 && cc <= 3400 ? 6
    : cc !== undefined && cc > 3800 ? 8
    : cc !== undefined && cc >= 1150 && cc <= 2250 ? 4 : undefined;
  return { make, model, generation, bodyType, badge, fuel, drive, cc, cylinders };
}

const IMPORT_EQUIPMENT_RULES: readonly (readonly [string, string, RegExp])[] = [
  ["Sigurnost", "360° kamera", /\b(?:360\s*°?\s*kamere?|kamera\s*360|area\s*view)\b/i],
  // Specific full-coverage sensors must be tested before the generic front+rear rule.
  ["Sigurnost", "Prednji, stražnji i bočni parking senzori", /\b(?:360\s*senzor\w*|senzor\w*\s+360|parkirni\s+senzori[^.\n]{0,40}bo[cč]n\w*|bo[cč]n\w*[^.\n]{0,40}parkirni\s+senzori)\b/i],
  ["Sigurnost", "Prednji i stražnji parking senzori", /\b(?:parkirni\s+senzori|parking\s+senzori)\b/i],
  ["Sigurnost", "Tempomat", /\b(?:tempomat|adaptivni\s+tempomat|\bacc\b)\b/i],
  ["Sigurnost", "Head-Up Display", /\b(?:head\s*up\s*display|projekcijski\s+zaslon|\bhud\b)\b/i],
  ["Udobnost", "Kožna sjedala s memorijom", /\b(?:memorija\s+sjedala|sjedal\w*\s+s\s*memorijom|full\s+struja)\b/i],
  ["Udobnost", "Kožna sjedala", /\b(?:kožna|kozna)\s+sjedal\w*\b/i],
  ["Udobnost", "El. podesiva sjedala", /\b(?:el\.?\s*pode[sš]avanje\s+sjedal\w*|pode[sš]avanje\s+sjedal\w*|el\.?\s*podesiv\w*\s+sjedal\w*|elektri[cč]n\w*\s+sjedal\w*|full\s+struja)\b/i],
  ["Udobnost", "Grijana sjedala", /\b(?:grijanje\s+sjedala|grijana\s+sjedala|grijan\w*\s+sjedal\w*)\b/i],
  ["Udobnost", "M Sport sjedala", /\bm[\s-]*sport\s+sjedal\w*\b/i],
  ["Udobnost", "M Sport upravljač", /\b(?:m[\s-]*volan|m[\s-]*sport[\s-]*(?:upravljač|volan))\b/i],
  ["Udobnost", "F1 ručice na volanu", /\b(?:f1\s*(?:saltarice|ru[cč]ice)|ru[cč]ice\s+na\s+volanu|polugice\s+za\s+promjenu\s+stupnja)\b/i],
  ["Udobnost", "Crna obloga krova", /\b(?:crna\s+obloga\s+krova|crno\s+nebo)\b/i],
  ["Udobnost", "Zatamnjena stražnja stakla", /\b(?:zatamnjena\s+(?:stražnja|straznja)\s+stakla|zatamnjena\s+stakla)\b/i],
  ["Multimedija", "Harman/Kardon ozvučenje", /\bharman\s*\/?\s*kardon\b/i],
  ["Multimedija", "Navigacija Professional", /\b(?:navigacija\s+professional|velika\s+navigacij\w*|navigacij\w*)\b/i],
  ["Multimedija", "Apple CarPlay", /\b(?:apple\s*)?carplay\b/i],
  ["Multimedija", "Android Auto", /\bandroid\s+auto\b/i],
  ["Eksterijer", "Kuka za vuču", /\b(?:kuka\s+za\s+vu[cč]u|kuka\s+na\s+izvla[cč]enje)\b/i],
  ["Eksterijer", "Adaptivna LED svjetla", /\b(?:led\s+adaptivn\w*\s+svijetla|adaptivna\s+led|led\s+svjetla)\b/i],
  ["Eksterijer", "LED osvjetljenje vanjskih kvaka", /\b(?:led\s+(?:kavk\w*|kvak\w*)|osvjetljenj\w*\s+kvak\w*|kvak\w*\s+s\s*led\s*osvjetljenj\w*)\b/i],
  ["Eksterijer", "El. sklopivi i zatamnjivi retrovizori", /\b(?:el\.?\s*sklopivi\s+retrovizori|sklopivi\s+retrovizori|fotosenzibiln\w*\s+retrovizor\w*|elektri[cč]no\s+sklapanj\w*\s+retrovizor\w*|zatamnjen\w*\s+retrovizor\w*)\b/i],
  ["Eksterijer", "M Sport paket", /\b(?:m[\s-]*sport\s+paket|m\s*paket|m[\s-]*branici|m[\s-]*pragovi|m[\s-]*lajsne|m[\s-]*sport)\b/i],
  ["Eksterijer", 'Alu naplatci 20"', /\b(?:alu\s+(?:felge|naplatci)\s*20|aluminijski\s+naplatci\s*20)\b/i],
];

export function canonicalEquipmentLabel(raw: string): string {
  const text = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [, label, pattern] of IMPORT_EQUIPMENT_RULES) {
    if (pattern.test(text)) return label;
  }
  return raw.trim().slice(0, 100);
}

/** Canonicalize a list once, dropping labels superseded by a more specific variant. */
export function canonicalEquipmentLabels(labels: string[]): string[] {
  const unique = [...new Set(labels.map(canonicalEquipmentLabel).filter(Boolean))];
  if (unique.includes("Prednji, stražnji i bočni parking senzori")) {
    const index = unique.indexOf("Prednji i stražnji parking senzori");
    if (index >= 0) unique.splice(index, 1);
  }
  if (unique.includes("El. sklopivi i zatamnjivi retrovizori")) {
    const index = unique.indexOf("Električno sklopivi retrovizori");
    if (index >= 0) unique.splice(index, 1);
  }
  return unique.includes("360° kamera") ? unique.filter(label => label !== "Kamera za vožnju unatrag") : unique;
}

/** Category for the 4-column detail layout of every inferred baseline item. */
const STANDARD_EQUIPMENT_CATEGORY: Record<string, "Sigurnost" | "Udobnost" | "Multimedija" | "Eksterijer"> = {
  "ABS": "Sigurnost",
  "Zračni jastuci": "Sigurnost",
  "ESP / Kontrola stabilnosti": "Sigurnost",
  "ISOFIX": "Sigurnost",
  "Senzor tlaka u gumama": "Sigurnost",
  "Servo upravljač": "Udobnost",
  "Daljinsko centralno zaključavanje": "Udobnost",
  "Električni podizači stakala": "Udobnost",
  "Automatska klima": "Udobnost",
  "Putno računalo": "Multimedija",
  "Bluetooth": "Multimedija",
  "Start-Stop sustav": "Multimedija",
};

const PREMIUM_EQUIPMENT_MAKES = new Set(["bmw", "audi", "mercedesbenz", "volkswagen", "volvo", "skoda", "porsche", "tesla", "mazda", "cupra"]);
const STANDARD_EQUIPMENT_EXCLUSIONS: readonly (readonly [string, RegExp])[] = [
  ["ABS", /\bbez\s*abs\b/],
  ["Zračni jastuci", /\bbez\s*jastuk\w*\b/],
  ["ESP / Kontrola stabilnosti", /\bbez\s*esp\b/],
  ["ISOFIX", /\bbez\s*isofix\b/],
  ["Senzor tlaka u gumama", /\bbez\s*senzor\w*\s*tlaka\b/],
  ["Start-Stop sustav", /\b(?:bez|isklju[cč]en)\s*start[\s-]*stop\b/],
  ["Automatska klima", /\b(?:bez\s*klime|manueln\w*\s*klima|ru[cč]n\w*\s*klima)\b/],
  ["Bluetooth", /\bbez\s*bluetooth\b/],
];

/**
 * Deterministic baseline factory equipment by year and segment, so an imported
 * 2017 BMW can never publish looking like it lacks ABS or airbags. Explicit
 * seller exclusions ("bez klime", …) always win.
 */
export function inferStandardEquipment(facts: { year?: number; make?: string; gear?: string; fuel?: string; text?: string }): string[] {
  const year = Number(facts.year);
  if (!Number.isInteger(year) || year < 2004) return [];
  const labels = ["ABS", "Zračni jastuci", "Servo upravljač", "Daljinsko centralno zaključavanje", "Električni podizači stakala"];
  if (year >= 2011) labels.push("ESP / Kontrola stabilnosti", "Putno računalo", "ISOFIX");
  if (year >= 2014) labels.push("Senzor tlaka u gumama", "Start-Stop sustav");
  if (year >= 2012 && PREMIUM_EQUIPMENT_MAKES.has(normalizeLocation(facts.make ?? "").replace(/[^a-z]/g, ""))) {
    labels.push("Automatska klima", "Bluetooth");
  }
  const signal = normalizeLocation(facts.text ?? "");
  return labels.filter(label => !STANDARD_EQUIPMENT_EXCLUSIONS.some(([excluded, pattern]) => excluded === label && pattern.test(signal)));
}

const EQUIPMENT_DETAIL_CATEGORY: Record<string, "Sigurnost" | "Udobnost" | "Multimedija" | "Eksterijer"> = {
  Sigurnost: "Sigurnost", Udobnost: "Udobnost", Multimedija: "Multimedija", Eksterijer: "Eksterijer",
};

export function equipmentCategoryFor(raw: string): "Sigurnost" | "Udobnost" | "Multimedija" | "Eksterijer" {
  const standard = STANDARD_EQUIPMENT_CATEGORY[raw.trim()];
  if (standard) return standard;
  const text = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [category, , pattern] of IMPORT_EQUIPMENT_RULES) {
    if (pattern.test(text)) return EQUIPMENT_DETAIL_CATEGORY[category];
  }
  return "Eksterijer";
}

export const prices = [5000, 10000, 15000, 20000, 25000, 30000, 50000];
export const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
export const distances = [50000, 100000, 150000, 200000];
export const cylinderCounts = [2, 3, 4, 5, 6, 8, 10, 12, 16];
export const colorFinishes = ["Metalik", "Obična", "Perla", "Mat"];
export const sorts = {
  newest: "Najnovije",
  lowest: "Cijena: niža prema višoj",
  highest: "Cijena: viša prema nižoj",
  mileage: "Kilometraža: najmanja",
  rating: "Najbolja ocjena cijene",
} as const;
export const bodyFilters = [
  { id: "limuzina", label: "Limuzina", types: ["Limuzina"] },
  { id: "karavan", label: "Karavan", types: ["Karavan"] },
  { id: "suv", label: "SUV / Terenac", types: ["SUV / Terenac"] },
  { id: "gradski", label: "Gradski", types: ["Hatchback / Kompakt"] },
  { id: "sportski", label: "Sportski / Coupé", types: ["Coupé"] },
  { id: "cabrio", label: "Cabrio / Roadster", types: ["Cabrio / Roadster"] },
  { id: "kombi", label: "Kombi / Monovolumen", types: ["Kombi / Dostavno", "Monovolumen (MPV)"] },
  { id: "ostalo", label: "Ostalo", types: [] },
] as const;
export const seatOptions = ["2", "4", "5", "7", "8"] as const;
export const doorOptions = ["2/3", "4/5", "6/7"] as const;
export const collections = ["prilike", "sport-paketi", "suv-obiteljski", "novo", "danas", "autokuce"] as const;
export type CollectionId = "" | (typeof collections)[number];
export type Search = {
  kategorija: CategoryId;
  kolekcija: CollectionId;
  marka: string; model: string; generacija: string; cijena: string; godiste: string; km: string; gorivo: string;
  mjenjac: string; grad: string; opcije: Flag[]; oprema: string[]; sortiranje: keyof typeof sorts; prikaz: "grid" | "lista";
  cilindri: string; zavrsnica: string; upit: string;
  varijanta: string; karoserija: (typeof bodyFilters)[number]["id"][];
  sjedalaOd: string; sjedalaDo: string; vrata: string; cijenaOd: string; samoPrilike: boolean;
};
export const initialSearch: Search = {
  kategorija: "automobili",
  kolekcija: "",
  marka: "", model: "", generacija: "", cijena: "", godiste: "", km: "", gorivo: "", mjenjac: "", grad: "",
  opcije: [], oprema: [], sortiranje: "newest", prikaz: "lista",
  cilindri: "", zavrsnica: "", upit: "",
  varijanta: "", karoserija: [], sjedalaOd: "", sjedalaDo: "", vrata: "", cijenaOd: "", samoPrilike: false,
};
export function searchFilterCount(search: Search) {
  const { sortiranje, prikaz, opcije, oprema, karoserija, varijanta, kategorija, ...filters } = search;
  return Number(kategorija !== initialSearch.kategorija) + Object.values(filters).filter(Boolean).length + opcije.length + oprema.length + karoserija.length + Number(!!varijanta.trim());
}

export function parseVehicleQuery(query: string, search: Search): Search {
  let words = normalizeSearchQuery(query);
  const next = { ...initialSearch, kategorija: search.kategorija, sortiranje: search.sortiranje, prikaz: search.prikaz };
  const take = (pattern: RegExp) => {
    const match = words.match(pattern);
    if (match) words = words.replace(pattern, " ");
    return match;
  };
  const budget = take(/\b(?:do|max\.?|ispod)\s+(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(?:€|eur\b|eura\b)/);
  const mileage = take(/\b(?:do|max\.?)\s+(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*km\b/);
  const year = take(/\b(?:od\s+)(19\d{2}|20\d{2})\b/);
  if (budget) next.cijena = budget[1].replace(/\D/g, "");
  if (mileage) next.km = mileage[1].replace(/\D/g, "");
  if (year) next.godiste = year[1];
  if (take(/\b(?:automat(?:ik|ski|skog)?|automatikom)\b/)) next.mjenjac = "Automatski";
  if (take(/\b(?:rucni|manualni)\b/)) next.mjenjac = "Ručni";
  if (take(/\b(?:s potvrdenim km\s*(?:\(cvh\))?|potvrdeni km|cvh)(?![a-z0-9])/)) next.opcije.push("cvh");
  if (take(/\b(?:leasing|r1)\b/)) next.opcije.push("pdv");
  const fuel = take(/\b(?:plug[ -]?in hibrid|phev)\b/) ? "Plug-in hibrid"
    : take(/\b(?:elektricni|elektricna|struja)\b/) ? "Struja"
    : fuels.find(fuel => take(new RegExp(`\\b${normalizeLocation(fuel)}\\b`)));
  if (fuel) next.gorivo = fuel;
  if (take(/\b(?:suv|terenac|terenci)\b/)) next.karoserija = ["suv"];
  else if (take(/\b(?:motocikli?|motori|skuteri?)\b/)) next.kategorija = "motocikli";
  else if (take(/\b(?:kombi|dostavna)\b/)) next.kategorija = "gospodarska";
  const city = cities.find(city => {
    const name = normalizeLocation(city);
    const stem = /[ae]$/.test(name) ? name.slice(0, -1) : name;
    return take(new RegExp(`\\bu\\s+(?:${name}|${stem}u|${stem}i)\\b`));
  });
  if (city) next.grad = city;
  const takeName = (name: string) => {
    const escaped = normalizeSearchQuery(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return take(new RegExp(`\\b${escaped}\\b`));
  };
  const make = CAR_MAKES.find(takeName);
  if (make) {
    next.marka = make;
    const models = [...modelsFor(make, false)].sort((a, b) => b.length - a.length);
    next.model = models.find(takeName) ?? "";
  }
  next.upit = words.replace(/[^\p{L}\d\s]/gu, " ").trim().replace(/\s+/g, " ");
  return next;
}
export function validEquipmentFilters(make: string, model: string, generation: string, ids: string[]) {
  const allowed = new Set(equipmentFor({make, model, generation},true).map(item => item.id));
  return [...new Set([...selectedMakeOptions(make,model,ids), ...ids.filter(id => allowed.has(id))])];
}
function canonicalLocation(value: string, values: readonly string[]): string {
  const normalized = normalizeLocation(value);
  return values.find(item => normalizeLocation(item) === normalized) ?? "";
}

export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  function accept(key: string, values: readonly string[], fallback = "") {
    const value = params.get(key);
    return value !== null && values.includes(value) ? value : fallback;
  }
  function positiveNumber(key: string) {
    const value = params.get(key) ?? "";
    return /^[1-9]\d{0,8}$/.test(value) ? value : "";
  }
  const queryMake = normalizeSearchQuery(params.get("marka") ?? "");
  const marka = CAR_MAKES.find(make => normalizeSearchQuery(make) === queryMake) ?? "";
  const queryModel = normalizeSearchQuery(params.get("model") ?? "");
  const model = modelsFor(marka).find(model => normalizeSearchQuery(model) === queryModel) ?? "";
  const generation = params.get("generacija") ?? "";
  const generalOptions = params.getAll("opcije");
  const equipment = params.getAll("oprema");
  const legacyPackage = legacySportOption[marka];
  if (legacyPackage && generalOptions.includes("sport")) equipment.push(legacyPackage);
  const legacyCategory = params.get("kategorija");
  const legacyFuel = legacyCategory === "elektricna" ? "Struja" : legacyCategory === "hibridi" ? "Hibrid" : "";
  const fuel = params.get("gorivo") === "Električni" ? "Struja" : accept("gorivo", fuels);
  return {
    kategorija: normalizeVehicleCategory(legacyCategory) ?? initialSearch.kategorija,
    kolekcija: accept("kolekcija", collections) as CollectionId,
    marka, model, generacija: validGeneration(marka, model, generation) ? generation : "", cijena: positiveNumber("cijena"),
    godiste: positiveNumber("godiste"), km: positiveNumber("km"),
    gorivo: fuel || legacyFuel, mjenjac: accept("mjenjac", gears), grad: canonicalLocation(params.get("grad") ?? "", [...cities, ...croatianCounties]),
    opcije: flags.filter(flag => generalOptions.includes(flag)),
    oprema: validEquipmentFilters(marka, model, generation, equipment),
    sortiranje: accept("sortiranje", Object.keys(sorts), "newest") as Search["sortiranje"],
    prikaz: accept("prikaz", ["grid", "lista"], initialSearch.prikaz) as Search["prikaz"],
    cilindri: accept("cilindri", cylinderCounts.map(String)),
    zavrsnica: accept("zavrsnica", colorFinishes),
    upit: (params.get("upit") ?? params.get("q") ?? "").slice(0, 200),
    varijanta: (params.get("varijanta") ?? "").slice(0, 100),
    karoserija: bodyFilters.filter(body => (params.getAll("karoserija").includes(body.id) || legacyCategory === body.id && body.id !== "ostalo")).map(body => body.id),
    sjedalaOd: accept("sjedalaOd", seatOptions), sjedalaDo: accept("sjedalaDo", seatOptions),
    vrata: accept("vrata", doorOptions), cijenaOd: positiveNumber("cijenaOd"),
    samoPrilike: params.get("samoPrilike") === "true",
  };
}
const NON_SEARCH_PARAMS = new Set(["tab", "razgovor", "tip", "salon", "oglas"]);

function writeSearchParams(search: Search): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (NON_SEARCH_PARAMS.has(key)) params.set(key, value);
  }
  for (const key of Object.keys(initialSearch) as (keyof Search)[]) {
    const value = search[key];
    if (Array.isArray(value)) value.forEach(option => params.append(key, option));
    else if (value !== initialSearch[key]) params.set(key, String(value));
  }
  return params;
}

export function writeSearch(search: Search) {
  const query = writeSearchParams(search).toString();
  const next = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
  if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, "", next);
}

/** Drop invalid/unknown query params on first paint so URLs reflect applied filters. */
export function normalizeSearchUrl() {
  const query = writeSearchParams(readSearch(window.location.search)).toString();
  const next = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
  if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(null, "", next);
}
const croatianDate = new Intl.DateTimeFormat("hr-HR", { timeZone: "Europe/Zagreb" });

export function matchesCollection(v: Vehicle, collection: CollectionId): boolean {
  if (!collection) return true;
  switch (collection) {
    case "prilike":
      // "Top prilika" (≤ -5% ispod prosjeka) plus every listing with a visible price drop.
      return marketValuation(v).rating.rank === 0 || Boolean(v.previousPriceEur && v.previousPriceEur > v.price);
    case "sport-paketi":
      return /\b(m[\s-]?sport|s[\s-]?line|amg|r[\s-]?line|gt[\s-]?line|st[\s-]?line|rs|gtd|gti|cupra|trophy|cooper s|sport line|vz)\b/i.test(
        `${v.title} ${v.trim} ${v.variant ?? ""}`,
      );
    case "suv-obiteljski":
      return v.bodyType === "SUV / Terenac" || v.bodyType === "Karavan" || v.bodyType === "Monovolumen (MPV)";
    case "autokuce":
      return v.dealer;
    case "danas": {
      if (!v.listedAt) return false;
      const listedAt = new Date(v.listedAt);
      return Number.isFinite(listedAt.getTime()) && croatianDate.format(listedAt) === croatianDate.format(Date.now());
    }
    case "novo":
      return Number(v.date.slice(0, 4)) >= 2022 || Boolean(v.isFeatured);
  }
}
function searchFuel(vehicle: Vehicle): string {
  if (vehicle.fuel === "Hibrid" && /plug[ -]?in|\bphev\b/i.test([vehicle.variant, vehicle.title, vehicle.trim].join(" "))) return "Plug-in hibrid";
  return /^(struja|električni|elektricni|electric)$/i.test(vehicle.fuel) ? "Struja" : vehicle.fuel;
}
export function matchVehicles(vehicles: Vehicle[], s: Search, now = Date.now()) {
  const queryTerms = searchTerms(s.upit);
  const queryMake = normalizeSearchQuery(s.marka);
  const queryModel = normalizeSearchQuery(s.model);
  const variantTerms = searchTerms(s.varijanta);
  const selectedBodies = bodyFilters.filter(body => s.karoserija.includes(body.id));
  const matchesBodies = (vehicle: Vehicle) => selectedBodies.some(body =>
    body.id === "ostalo"
      ? !bodyFilters.some(option => option.types.some(type => type === vehicle.bodyType))
      : body.types.some(type => type === vehicle.bodyType),
  );
  const matchesText = (vehicle: Vehicle) => {
    if (!queryTerms.length && !variantTerms.length) return true;
    const equipment = [
      ...Object.values(vehicle.equipment).flat(),
      ...vehicleMakeOptions(vehicle).map(option => option.label),
      ...(vehicle.catalogEquipment ?? []),
    ];
    const identity = [vehicle.make, vehicle.model, vehicle.generation, vehicle.title, vehicle.variant, vehicle.trim];
    const variantIndex = searchTerms([...identity, ...equipment].join(" "));
    if (!variantTerms.every(term => variantIndex.some(word => word.includes(term)))) return false;
    if (!queryTerms.length) return true;
    const index = [...variantIndex, ...searchTerms([
      vehicle.city, vehicle.county, vehicle.bodyType, vehicle.fuel, vehicle.gear, vehicle.drive, vehicle.sellerNote,
    ].join(" "))];
    return queryTerms.every(term => index.some(word => word.includes(term)));
  };
  const result = vehicles.filter(v =>
    vehicleCategory(v) === s.kategorija &&
    matchesCollection(v, s.kolekcija) &&
    (!s.samoPrilike || s.kolekcija === "prilike" || matchesCollection(v, "prilike")) &&
    (!selectedBodies.length || matchesBodies(v)) &&
    (!s.sjedalaOd || (v.seats !== undefined && v.seats >= Number(s.sjedalaOd))) &&
    (!s.sjedalaDo || (v.seats !== undefined && (s.sjedalaDo === "8" || v.seats <= Number(s.sjedalaDo)))) &&
    (!s.vrata || (v.doors !== undefined && s.vrata.split("/").includes(String(v.doors)))) &&
    (!queryMake || normalizeSearchQuery(v.make) === queryMake) && (!queryModel || normalizeSearchQuery(v.model) === queryModel) &&
    (!s.generacija || matchesGeneration(v.make, v.model, s.generacija, v.generation ?? chassisFromTitle(v.make, v.model, v.title))) &&
    (!s.cijena || v.price <= Number(s.cijena)) &&
    (!s.cijenaOd || v.price >= Number(s.cijenaOd)) &&
    (!s.godiste || Number(v.date.slice(0, 4)) >= Number(s.godiste)) &&
    (!s.km || v.km <= Number(s.km)) && (!s.gorivo || searchFuel(v) === s.gorivo) &&
    (!s.mjenjac || v.gear === s.mjenjac) && (!s.grad || v.city === s.grad || (v.county || countyByCity[v.city]) === s.grad) &&
    (!s.cilindri || v.cylinders === Number(s.cilindri)) &&
    (!s.zavrsnica || v.colorFinish === s.zavrsnica) &&
    s.opcije.every(flag => v.flags.includes(flag)) &&
    matchesText(v)
  );
  const matching = s.oprema.length ? result.filter(vehicle => {
    const makeOptions = vehicleMakeOptions(vehicle);
    const declared = Object.values(vehicle.equipment).flat().map(equipmentId);
    const equipment = new Set([...makeOptions.map(option => option.id), ...declared, ...(vehicle.catalogEquipment ?? [])]);
    return s.oprema.every(id => equipment.has(id));
  }) : result;
  switch (s.sortiranje) {
    case "lowest": return matching.sort((a, b) => a.price - b.price);
    case "highest": return matching.sort((a, b) => b.price - a.price);
    case "mileage": return matching.sort((a, b) => a.km - b.km);
    case "rating":
      return matching.sort((a, b) => {
        const va = marketValuation(a);
        const vb = marketValuation(b);
        return va.rating.rank - vb.rating.rank || va.deltaPercent - vb.deltaPercent;
      });
    default: {
      // "Top prilika" listings get a subtle search-priority boost next to boosts/featured.
      const rankCache = new Map<Vehicle, number>();
      const priceRank = (v: Vehicle) => {
        if (!rankCache.has(v)) rankCache.set(v, marketValuation(v).rating.rank);
        return rankCache.get(v)!;
      };
      const featuredRank = (v: Vehicle) =>
        boostPriority(v, now) * 100 + Number(Boolean(v.isFeatured)) * 10 + (priceRank(v) === 0 ? 1 : 0);
      return matching.sort((a, b) => featuredRank(b) - featuredRank(a));
    }
  }
}

export function parseListingText(rawText: string) {
  const text = normalizeLocation(rawText.replace(/_/g, " ").replace(/(?<=\p{L})-(?=\p{L}|\d)/gu, " "));
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = (value: string) => new RegExp("\\b" + escape(normalizeLocation(value)) + "\\b").test(text);
  const engine = text.match(/\b([345]30d|[1-8][0-5]\d[die])\b/)?.[1];
  const make = CAR_MAKES.find(matches) ?? (engine?.endsWith("d") ? "BMW" : undefined);
  const models = make ? modelsFor(make, false) : [];
  const model = [...models].sort((a, b) => b.length - a.length).find(matches)
    ?? (make === "BMW" && engine && models.includes("Serija " + engine[0]) ? "Serija " + engine[0] : undefined);
  const readNumber = (match: RegExpMatchArray | null) => match?.[1] ? Number(match[1].replace(/[.,\s]/g, "")) : undefined;
  const amount = String.raw`(\d{1,3}(?:[., \u00a0]\d{3})+|\d+)`;
  const expiry = /\b(?:reg(?:istriran[oa]?|istracija)?\.?)\s*[:=]?\s*(?:do\s*)?(0?[1-9]|1[0-2])\s*(?:[./]|\s)\s*(20\d{2})\b/i;
  const registration = text.match(expiry);
  const first = text.match(/\bprva registracija\s*[:=]?\s*(0?[1-9]|1[0-2])\s*[./]\s*((?:19|20)\d{2})\b/);
  const cleaned = text.replace(expiry, "");
  const year = readNumber(cleaned.match(/\b(?:godiste|godina (?:proizvodnje|vozila))\s*[:=-]?\s*((?:19|20)\d{2})\b/)
    ?? (first ? [first[0], first[2]] : null)
    ?? cleaned.match(/\b((?:19|20)\d{2})(?![\d.,]\d|\s*(?:km|tkm|kw|ks|cm[³3]|cc|eur\b|€|e\b))/));
  const mileage = text.match(new RegExp("\\b" + amount + "\\s*(t\\s*km|km)\\b"));
  const km = mileage ? readNumber(mileage)! * (typeof mileage[2] === "string" && mileage[2].startsWith("t") ? 1000 : 1)
    : readNumber(text.match(new RegExp("\\bkilometraza\\s*[:=-]?\\s*" + amount)));
  const kw = readNumber(text.match(new RegExp("\\b" + amount + "\\s*kw\\b")));
  const ks = readNumber(text.match(new RegExp("\\b" + amount + "\\s*ks\\b"))) ?? (kw === undefined ? undefined : Math.round(kw * 1.35962));
  const bodyType = [
    [/\b(?:coup[eé]|kupe)\b/, "Coupé"], [/\b(?:karavan|touring|avant)\b/, "Karavan"],
    [/\b(?:limuzina|sedan)\b/, "Limuzina"], [/\b(?:suv|terenac)\b/, "SUV / Terenac"],
    [/\b(?:cabrio|kabriolet|roadster)\b/, "Cabrio / Roadster"], [/\b(?:hatchback|kompakt)\b/, "Hatchback / Kompakt"],
  ].find(([pattern]) => (pattern as RegExp).test(text))?.[1] as string | undefined;
  const equipment = listingEquipmentPatterns.filter(([pattern]) => pattern.test(text)).map(([,label]) => label);
  const wheels = text.match(/\b(?:alu(?:minijske)?\s+felge|aluminijski naplatci)\s*(\d{2})\s*(?:"|”|cola)?/);
  if (wheels) equipment.push('Alu felge ' + wheels[1] + '"');
  const color = ["Bijela", "Crna", "Siva", "Srebrna", "Tamno plava", "Plava", "Crvena", "Zelena", "Žuta", "Narančasta"].find(matches);
  return {
    make, model, variant: engine, year, km, kw: kw ?? (ks === undefined ? undefined : Math.round(ks / 1.35962)), ks,
    cc: readNumber(text.match(new RegExp("\\b" + amount + "\\s*(?:cm\\s*[³3]|cc)(?!\\w)"))),
    price: readNumber(text.match(new RegExp("\\b" + amount + "\\s*(?:€|eur(?:a)?\\b|e\\b)"))
      ?? text.match(new RegExp("\\bcijena\\s*[:=-]?\\s*" + amount))),
    firstRegistration: first ? first[2] + "-" + first[1].padStart(2, "0") : undefined,
    registrationUntil: registration ? registration[1].padStart(2, "0") + "/" + registration[2] : undefined,
    gear: /\b(?:automatik|automatsk\w*|steptronic|dsg)\b/.test(text) ? "Automatski" : /\b(?:rucni|manualni)\b/.test(text) ? "Ručni" : undefined,
    fuel: /\b(?:dizel|diesel|tdi)\b/.test(text) || engine?.endsWith("d") ? "Dizel" : /\b(?:benzin|petrol)\b/.test(text) ? "Benzin" : undefined,
    cylinders: readNumber(text.match(/\b(\d{1,2})\s*cilind\w*\b/)) ?? (make === "BMW" && ["330d", "430d", "530d"].includes(engine ?? "") ? 6 : undefined),
    bodyType, color, equipment,
  };
}

const listingEquipmentPatterns: readonly (readonly [RegExp, string])[] = [
  [/\bm\s*(?:sport(?:\s+paket)?|paket)\b/, "M Sport paket"],
  [/\b(?:led\s+adaptivn\w*|adaptivn\w*\s+led)\b/, "Adaptivna LED svjetla"],
  [/\b(?:head[\s-]*up[\s-]*display|hud)\b/, "Head-Up Display"],
  [/\b(?:360\s*°?\s*kamera?\w*|kamer\w*\s+360)\b/, "Kamera 360°"],
  [/\bharman[\s/-]*kardon\b/, "Harman Kardon Surround"],
  [/\b(?:f1\s*(?:saltalic\w*|polugic\w*)|polugice za promjenu stupnja)\b/, "Polugice za promjenu stupnja"],
  [/\bkozn\w*\s+sjedal\w*\b/, "Kožna sjedala"],
  [/\bmemorij\w*\b/, "Memorija sjedala"],
  [/\bnavigacij\w*\b/, "Navigacija"],
  [/\btempomat\b/, "Tempomat"],
];


const DESCRIPTION_BOILERPLATE = [
  /karta\s*\n\s*napomena:\s*prikazana je približna lokacija/i,
  /dodatne informacije/i, /prati oglašivača/i, /korisnik je verificirao broj telefona/i,
  /nazovi oglašivača/i, /unatoč pažljivom unosu podataka moguće su pogreške/i,
  /oglas iz usluge/i, /mjesto sigurne i povoljne kupnje/i, /najbrzi put do vašeg/i,
  /auto\s*centar\s*bi[/\s-]*mer/i, /^cijena:\s*[\d.,\s]+e?\s*fix\b/im,
  // Dealer sales footers — never genuine vehicle notes.
  /ro[dđ]ajemo\s+provjeren\w*\s+vozila/i,
  /g\s*a\s*r\s*a\s*n\s*c\s*i\s*j\s*a\s*:/i,
  /garancij\w*\s*:\s*na\s+(?:ispravnost|tehni[cč]ku)/i,
  /mogu[ćc]nost\s+pla[ćc]anja\s+karticama/i,
  /visa\s+premium/i,
  /diners\s+\(?od/i,
  /radno\s+vrijeme\s+(?:salona|prodajnog)/i,
  /na[sš]im\s+(?:kupcima|klijentima)\s+nudimo/i,
  /besplatnu\s+procjenu\s+va[sš]eg\s+vozila/i,
  /zamjena\s+va[sš]eg\s+vozila\s+za\s+vozilo\s+iz\s+na[sš]e\s+ponude/i,
  /podaci\s+o\s+opremi\s+vozila\s+navedeni\s+u\s+oglasu\s+su\s+informativnog/i,
  /unaprijed\s+se\s+ispri[cč]avamo\s+za\s+eventualne\s+pogre[sš]ke/i,
];

/** Inline spec phrases repeated from the structured attributes ("Godište: 2016, Prijeđeni kilometri: 160000 km"). */
const INLINE_SPEC_PHRASES: Array<[RegExp, string]> = [
  [/\s*,?\s*god(?:ište|ina\s+proizvodnje)\s*[:=]?\s*(?:19|20)\d{2}\b\.?/gi, ""],
  [/\s*,?\s*prije[đd]eni\s+kilometri\s*[:=]?\s*[\d.,\s]*\s*km\b\.?/gi, ""],
  [/\s*,?\s*snaga\s+motora\s*[:=]?\s*[\d.,\s]*\s*kw\b\.?/gi, ""],
  [/\s*,?\s*radni\s+obujam\s*[:=]?\s*[\d.,\s]*\s*cm[³3]\b\.?/gi, ""],
  [/\s*,?\s*reg(?:istriran\s+do)?\.?\s*[:=]?\s*\d{1,2}\s*\/\s*(?:19|20)\d{2}\b\.?/gi, ""],
  [/\s*,?\s*cijena\s*[:=]?\s*[\d.,\s]*\s*(?:€|eur)\b\.?/gi, ""],
];

/** Bullet lines that only repeat specs already parsed into the form ("- 2017", "- 190kw", "- reg. 12/2026"). */
const SPEC_ONLY_BULLET = /^\s*[-•*]\s*(?:(?:19|20)\d{2}\b|(?:\d{1,3}(?:[.\s]\d{3})+|\d{2,7})\s*(?:t\s*km|km)\b|\d{2,4}\s*(?:kw|ks)\b|\d{3,5}\s*(?:cm[³3]|ccm|cc)\b|reg(?:istriran(?:\s*do)?)?\.?\s*(?:do\s*)?\d{1,2}\s*[./]\s*(?:19|20)\d{2}|(?:19|20)\d{2}\s*[./]\s*\d{1,2}|dizel|diesel|benzin(?:ski)?|gas\b|lpg|tdi|struja|elektri[cč]n\w*|hibrid|plug.?in|automatik|automatsk\w*|ru[cč]n\w*|manual\w*|steptronic|dsg|bijel\w*|crn\w*|siv\w*|srebrn\w*|plav\w*|crven\w*|zelen\w*|[žz]ut\w*|naran[cč]ast\w*|narandžast\w*|smeđ\w*|smeđast\w*|bež|\d\s*[/–-]\s*\d\s*(?:vrata|sjedala)|\d{3}\s*[die]\b|\d[.,]\d\s*(?:tdi|tsi|tfsi|dci|cdti|crdi|jtd))\s*$/i;

/** Strip raw equipment bullet blocks, spec-only bullets and dealer footers while keeping seller service notes. */
export function cleanImportedDescription(raw: string): string {
  let text = raw.replace(/\n{3,}/g, "\n\n");
  const opremaStart = text.search(/^\s*oprema\s*:/im);
  if (opremaStart >= 0) {
    const head = text.slice(0, opremaStart);
    const tail = text.slice(opremaStart).split("\n").filter(line => {
      const trimmed = line.trim();
      if (/^(?:oprema\s*:|[-•]\s*$)/i.test(trimmed)) return false;
      if (DESCRIPTION_BOILERPLATE.some(marker => marker.test(trimmed))) return false;
      // Genuine mechanical/service notes stay in the seller description.
      if (/(?:ugradjen|ugrađen|lanac|servis|koristi|pregled|motor sa|novi lanac)/i.test(trimmed)) return true;
      return !/^\s*[-•]\s*/.test(trimmed);
    }).join("\n");
    text = head + tail;
  }
  // Drop bullet lines that only repeat specs already structured into Step 2.
  text = text.split("\n").filter(line => !SPEC_ONLY_BULLET.test(line)).join("\n");
  // Drop inline spec phrases repeated from the structured attributes.
  for (const [pattern, replacement] of INLINE_SPEC_PHRASES) text = text.replace(pattern, replacement);
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map(line => line.replace(/^[,\s]+/, "").replace(/[,\s]+$/, "").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  let cut = text.length;
  for (const marker of DESCRIPTION_BOILERPLATE) {
    const index = text.search(marker);
    if (index > 0) cut = Math.min(cut, index);
  }
  return text.slice(0, cut).replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeImportedVehicle(source: {
  title?: string; description?: string; fields?: Record<string, string>; equipment?: string[];
}) {
  const clean = (value: string) => value.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim();
  const key = (value: string) => normalizeLocation(value).replace(/[^a-z0-9]/g, "");
  const fields = new Map(Object.entries(source.fields ?? {}).map(([label, value]) => [key(label), clean(value)]));
  const field = (...labels: string[]) => labels.map(label => fields.get(key(label))).find(Boolean);
  const title = clean(source.title ?? "").slice(0, 100);
  const rawDescription = clean(source.description ?? "").split(/\r?\n/).map(line => line.trim())
    .filter(line => !/^(?:najbolja ponuda|posjetite na[sš]|pratite nas|zadr[zž]avamo pravo na pogre[sš]ku|nazovite odmah)\b/i.test(line))
    .join("\n");
  const description = cleanImportedDescription(rawDescription).slice(0, 12000);
  const value = (unit: string, ...labels: string[]) => {
    const raw = field(...labels);
    return raw && (/^\d[\d.,\s]*$/.test(raw) ? raw + " " + unit : raw);
  };
  const makeName = field("Marka automobila", "Marka vozila", "Marka", "brand", "make");
  const modelName = field("Model automobila", "Model vozila", "Model", "model");
  const engineName = field("Motorizacija", "Motor", "engine", "variant");
  const bodyName = field("Karoserija", "Tip automobila", "bodyType");
  const fuelName = field("Gorivo", "fuel");
  const gearName = field("Mjenjač", "gear");
  const driveName = field("Pogon", "drive");
  const text = [makeName, modelName, engineName, bodyName, fuelName, gearName, driveName, title, description].filter(Boolean).join("\n");
  const parsed = parseListingText(text);
  const titleFacts = parseListingText(title);
  const currency = field("Valuta", "currency");
  const price = value("€", "Cijena EUR", "Cijena", "price")?.replace(/([.,]\d{2})(?=\s*(?:€|eur|e)\s*$)/i, "");
  const describedPrice = parseListingText(description.replace(/(\d)[.,]\d{2}(?=\s*(?:€|eur\b))/gi, "$1")).price;
  const facts = parseListingText([
    value("km", "Prijeđeni kilometri", "Kilometraža", "mileage"),
    value("kW", "Snaga motora", "Snaga kW", "kw"),
    value("cm3", "Radni obujam", "Obujam", "cc"),
    currency && !/^(?:eur|€)$/i.test(currency) ? undefined : price,
    field("Godina proizvodnje", "Godište", "year") && "Godište: " + field("Godina proizvodnje", "Godište", "year"),
    field("Registriran do", "registrationUntil") && "Registriran do " + field("Registriran do", "registrationUntil"),
    field("Prva registracija", "firstRegistration") && "Prva registracija " + field("Prva registracija", "firstRegistration"),
    field("Boja", "Boja vozila", "Vanjska boja", "color"),
  ].filter(Boolean).join("\n"));
  // Structured Njuškalo specs are extracted from the full raw text before stripping boilerplate.
  const rawText = [title, rawDescription, ...[...fields.values()]].filter(Boolean).join("\n");
  const registrationMatch = rawText.match(/\b(?:reg(?:istriran(?:o| do)?)?\.?)\s*[:=]?\s*(\d{1,2})\s*[./]\s*(20\d{2})\b/i);
  const registeredUntil = registrationMatch ? registrationMatch[1].padStart(2, "0") + "/" + registrationMatch[2] : undefined;
  const doors = Number((field("Broj vrata") ?? "").match(/\d+/)?.[0]) || undefined;
  const seats = Number((field("Broj sjedala") ?? "").match(/\d+/)?.[0]) || undefined;
  const makeKey = key(makeName ?? "");
  const make = CAR_MAKES.find(make => key(make) === makeKey)
    ?? ({ vw: "Volkswagen", mercedes: "Mercedes-Benz", benz: "Mercedes-Benz" } as Record<string, string>)[makeKey]
    ?? (/\bmercedes\b/i.test(title) ? "Mercedes-Benz" : /\bvw\b/i.test(title) ? "Volkswagen" : undefined)
    ?? titleFacts.make ?? parsed.make;
  const models = make ? [...modelsFor(make, false)].sort((a, b) => b.length - a.length) : [];
  const mercedesClass = make === "Mercedes-Benz" ? normalizeLocation([modelName, title].join(" ")).match(/\b([abces])\s*(?:klas[ae]|class|\d{3}\b)/)?.[1] : undefined;
  const model = models.find(model => key(model) === key(modelName ?? ""))
    ?? models.find(model => new RegExp("\\b" + normalizeLocation(model).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(normalizeLocation([modelName, title].join(" "))))
    ?? (mercedesClass ? mercedesClass.toUpperCase() + "-klasa" : undefined)
    ?? (titleFacts.make === make ? titleFacts.model : undefined)
    ?? (parsed.make === make ? parsed.model : undefined) ?? modelName;
  const canonical = canonicalizeImported({
    make: make ?? "", model: model ?? "", title, variant: engineName ?? "",
    year: facts.year ?? parsed.year,
    bodyType: field("Oblik karoserije") ?? bodyName,
    cc: facts.cc ?? parsed.cc,
    drive: field("Vrsta pogona") ?? driveName,
    text: rawText,
  });
  const badges = normalizeLocation([engineName, modelName, title].join(" "));
  const badge = badges.match(/\b(?:[1-8]\d{2}\s*[die]|[1-6]\.\d\s*(?:tdi|tsi|tfsi|hdi|dci|cdti|ecoboost)|gti|gte|bluehdi|ecoboost|e hybrid|tce|crdi|jtdm?)\b/i)?.[0];
  const signal = normalizeLocation(text);
  const fuelOf = (value: string) => /\b(?:gte|e hybrid|plug in|phev)\b/.test(value) ? "Plug-in hibrid"
    : /hibrid|hybrid/.test(value) ? "Hibrid" : /elektr|electric|struja/.test(value) ? "Električni"
    : /\b(?:dizel|diesel|tdi|bluehdi|hdi|dci|cdti|crdi|jtdm?|[1-8]\d{2}\s*d)\b/.test(value) ? "Dizel"
    : /\b(?:benzin|petrol|gasoline|gti|tsi|tfsi|ecoboost|tce)\b/.test(value) ? "Benzin" : undefined;
  const gearOf = (value: string): Vehicle["gear"] | undefined => /\b(?:automati\w*|dsg|s tronic|steptronic|[79]g tronic|edc|cvt)\b/.test(value) ? "Automatski"
    : /\b(?:rucn\w*|manual\w*|mehanicki)\b/.test(value) ? "Ručni" : undefined;
  const cylinders = parsed.cylinders ?? (/\b(?:3\.0\s*tdi|[345]30d|350d)\b/.test(badges) ? 6
    : /\b(?:320d|220d|2\.0\s*tdi|bluehdi)\b/.test(badges) ? 4 : undefined);
  const catalogEquipment = make && model ? equipmentFor({ make, model }, true) : [];
  const equipment = [...new Set([...parsed.equipment, ...catalogEquipment.filter(item => {
    const label = normalizeLocation(item.label);
    return label.length >= 3 && (" " + signal.replace(/[.,;:]/g, " ") + " ").includes(" " + label + " ");
  }).map(item => item.label), ...(source.equipment ?? []).map(clean).filter(Boolean)].map(canonicalEquipmentLabel))].slice(0, 60);
  const registration = field("firstRegistration");
  const equipmentByCategory: Record<string, string[]> = {
    "Sigurnost i asistencije": [], "Udobnost i interijer": [], "Multimedija i navigacija": [], "Eksterijer i ovjes": [],
  };
  const categoryNames: Record<string, string> = {
    Sigurnost: "Sigurnost i asistencije", Udobnost: "Udobnost i interijer",
    Multimedija: "Multimedija i navigacija", Eksterijer: "Eksterijer i ovjes",
  };
  for (const [category, label, pattern] of IMPORT_EQUIPMENT_RULES) {
    if (pattern.test(rawText)) {
      const target = categoryNames[category];
      if (!equipmentByCategory[target].includes(label)) equipmentByCategory[target].push(label);
    }
  }
  if (equipmentByCategory["Sigurnost i asistencije"].includes("360° kamera")) {
    equipmentByCategory["Sigurnost i asistencije"] = equipmentByCategory["Sigurnost i asistencije"].filter(label => label !== "Kamera za vožnju unatrag");
  }
  if (equipmentByCategory["Sigurnost i asistencije"].includes("Prednji, stražnji i bočni parking senzori")) {
    equipmentByCategory["Sigurnost i asistencije"] = equipmentByCategory["Sigurnost i asistencije"].filter(label => label !== "Prednji i stražnji parking senzori");
  }
  if (equipmentByCategory["Eksterijer i ovjes"].includes("El. sklopivi i zatamnjivi retrovizori")) {
    equipmentByCategory["Eksterijer i ovjes"] = equipmentByCategory["Eksterijer i ovjes"].filter(label => label !== "Električno sklopivi retrovizori");
  }
  // M Sport ovjes only when the M exterior package pairs with M interior parts.
  if (equipmentByCategory["Eksterijer i ovjes"].includes("M Sport paket")
    && (equipmentByCategory["Udobnost i interijer"].includes("M Sport sjedala") || equipmentByCategory["Udobnost i interijer"].includes("M Sport upravljač"))
    && !equipmentByCategory["Eksterijer i ovjes"].includes("M Sport ovjes")) {
    equipmentByCategory["Eksterijer i ovjes"].push("M Sport ovjes");
  }
  // Baseline factory equipment (ABS, airbags, ESP…) inferred from year and segment.
  const inferredEquipment = inferStandardEquipment({ year: facts.year ?? parsed.year, make: canonical.make || make, text: rawText });
  for (const label of inferredEquipment) {
    const target = categoryNames[STANDARD_EQUIPMENT_CATEGORY[label] ?? "Eksterijer"];
    if (target && !equipmentByCategory[target].includes(label)) equipmentByCategory[target].push(label);
  }
  return {
    ...parsed, make: canonical.make || make, model: canonical.model || model, title, description,
    equipment: [...new Set([...equipment, ...inferredEquipment])],
    cylinders: canonical.cylinders ?? cylinders,
    generation: canonical.generation || (make && model ? chassisFromTitle(make, model, title) : undefined),
    variant: canonical.badge || badge || parsed.variant,
    bodyType: canonical.bodyType || field("Oblik karoserije") || parsed.bodyType,
    doors, seats, drivetrain: canonical.drive, equipmentByCategory,
    fuel: canonical.fuel ?? fuelOf(normalizeLocation(fuelName ?? "")) ?? fuelOf(badges) ?? fuelOf(signal),
    gear: gearOf(normalizeLocation(gearName ?? "")) ?? gearOf(signal),
    drive: canonical.drive ?? (/\b(?:xdrive|quattro|4matic|4motion|4\s*[x×]\s*4|awd|allwheeldrive)\b/.test(normalizeLocation(driveName || text)) ? "4×4" : undefined),
    year: facts.year ?? parsed.year, km: facts.km ?? parsed.km, kw: facts.kw ?? parsed.kw, cc: canonical.cc ?? facts.cc ?? parsed.cc,
    price: currency && !/^(?:eur|€)$/i.test(currency) ? undefined : facts.price ?? describedPrice ?? parsed.price,
    firstRegistration: (registration && /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])/.test(registration) ? registration.slice(0, 7) : facts.firstRegistration) ?? parsed.firstRegistration,
    registrationUntil: registeredUntil ?? facts.registrationUntil ?? parsed.registrationUntil,
    color: facts.color ?? parsed.color,
    seller: field("Prodavatelj", "Prodavač", "seller"),
    city: field("Lokacija vozila", "Grad", "city"),
    condition: field("Stanje", "condition"),
    ownership: field("Vlasništvo", "Broj vlasnika", "owner") || (/\b1\.\s*vlasnik\b|\bprvi vlasnik\b/i.test(rawText) ? "1. vlasnik" : undefined),
    vin: field("VIN", "Broj šasije"),
  };
}

