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

type CanonicalAlias = [RegExp, string | ((match: RegExpMatchArray) => string), { bodyType?: string; generation?: string }];
const CANONICAL_ALIASES: CanonicalAlias[] = [
  [/\ba4\s*(?:avant|allroad|kombi|touring)\b/, "A4", { bodyType: "Karavan" }],
  [/\ba6\s*(?:avant|allroad|kombi)\b/, "A6", { bodyType: "Karavan" }],
  [/\ba3\s*(?:sportback|kombi)\b/, "A3", { bodyType: "Hatchback / Kompakt" }],
  [/\bq([23578])\b/, (match) => "Q" + match[1], { bodyType: "SUV / Terenac" }],
  [/\bc\s*(?:klasa)?\s*\d{3}\s*(?:d|cdi|i|e)\b/, "C-klasa", {}],
  [/\be\s*(?:klasa)?\s*\d{3}\s*(?:d|cdi|i|e)\b/, "E-klasa", {}],
  [/\bgl[ce]\s*\d{3}\b/, (match) => match[0].split(/\s/)[0].toUpperCase(), { bodyType: "SUV / Terenac" }],
  [/\bgolf\s*[578]\b/, "Golf", {}],
  [/\bpassat\s*(?:variant|combi|alltrack|sw)\b/, "Passat", { bodyType: "Karavan" }],
  [/\btiguan\b/, "Tiguan", { bodyType: "SUV / Terenac" }],
  [/\boctavia\s*(?:combi|estate|rs)\b/, "Octavia", { bodyType: "Karavan" }],
  [/\bsuperb\s*(?:combi|estate)\b/, "Superb", { bodyType: "Karavan" }],
  [/\b308\s*(?:sw|estate|combi)\b/, "308", { bodyType: "Karavan" }],
  [/\b3008\b|\b5008\b/, (match) => match[0].toUpperCase(), { bodyType: "SUV / Terenac" }],
  [/\bastra\s*(?:sports tourer|combi|estate|sw)\b/, "Astra", { bodyType: "Karavan" }],
  [/\bmazda\s*6\s*(?:kombi|estate|wagon)\b/, "Mazda6", { bodyType: "Karavan" }],
  [/\bi30\s*(?:wagon|combi|estate)\b/, "i30", { bodyType: "Karavan" }],
  [/\btucson\b/, "Tucson", { bodyType: "SUV / Terenac" }],
  [/\bceed\s*(?:sportswagon|combi|estate)\b/, "Ceed", { bodyType: "Karavan" }],
  [/\bsportage\b/, "Sportage", { bodyType: "SUV / Terenac" }],
  [/\bcorolla\s*(?:touring sports|combi|estate)\b/, "Corolla", { bodyType: "Karavan" }],
  [/\brav4\b/, "RAV4", { bodyType: "SUV / Terenac" }],
  [/\bxc60\b|\bxc90\b|\bxc40\b/, (match) => match[0].toUpperCase(), { bodyType: "SUV / Terenac" }],
  [/\bmacan\b|\bcayenne\b/, (match) => match[0].charAt(0).toUpperCase() + match[0].slice(1), { bodyType: "SUV / Terenac" }],
];

const EQUIPMENT_CATEGORIES = ["Sigurnost i asistencije", "Udobnost i interijer", "Multimedija i navigacija", "Eksterijer i ovjes"] as const;
const EQUIPMENT_RULES: Array<[string, string, RegExp]> = [
  ["Sigurnost i asistencije", "360° kamera", /\b(?:360\s*°?\s*kamere?|kamera\s*360|area\s*view|around\s*view)\b/i],
  // Specific full-coverage sensors must be tested before the generic front+rear rule.
  ["Sigurnost i asistencije", "Prednji, stražnji i bočni parking senzori", /\b(?:360\s*senzor\w*|senzor\w*\s+360|parkirni\s+senzori[^.\n]{0,40}bo[cč]n\w*|bo[cč]n\w*[^.\n]{0,40}parkirni\s+senzori)\b/i],
  ["Sigurnost i asistencije", "Prednji i stražnji parking senzori", /\b(?:parkirni\s+senzori|parking\s+senzori|parking\s+sensors)\b/i],
  ["Sigurnost i asistencije", "Tempomat", /\b(?:tempomat|adaptivni\s+tempomat|\bacc\b)\b/i],
  ["Sigurnost i asistencije", "Head-Up Display", /\b(?:head\s*up\s*display|projekcijski\s+zaslon|\bhud\b)\b/i],
  ["Udobnost i interijer", "Kožna sjedala s memorijom", /\b(?:memorija\s+sjedala|sjedal\w*\s+s\s*memorijom|full\s+struja)\b/i],
  ["Udobnost i interijer", "Kožna sjedala", /\b(?:kožna|kozna)\s+sjedal\w*\b/i],
  ["Udobnost i interijer", "El. podesiva sjedala", /\b(?:el\.?\s*pode[sš]avanje\s+sjedal\w*|pode[sš]avanje\s+sjedal\w*|el\.?\s*podesiv\w*\s+sjedal\w*|elektri[cč]n\w*\s+sjedal\w*|full\s+struja)\b/i],
  ["Udobnost i interijer", "Grijana sjedala", /\b(?:grijanje\s+sjedala|grijana\s+sjedala|grijan\w*\s+sjedal\w*)\b/i],
  ["Udobnost i interijer", "M Sport sjedala", /\bm[\s-]*sport\s+sjedal\w*\b/i],
  ["Udobnost i interijer", "M Sport upravljač", /\b(?:m[\s-]*volan|m[\s-]*sport[\s-]*(?:upravljač|volan))\b/i],
  ["Udobnost i interijer", "F1 ručice na volanu", /\b(?:f1\s*(?:saltarice|ru[cč]ice)|ru[cč]ice\s+na\s+volanu|polugice\s+za\s+promjenu\s+stupnja)\b/i],
  ["Udobnost i interijer", "Crna obloga krova", /\b(?:crna\s+obloga\s+krova|crno\s+nebo)\b/i],
  ["Udobnost i interijer", "Zatamnjena stražnja stakla", /\b(?:zatamnjena\s+(?:stražnja|straznja)\s+stakla|zatamnjena\s+stakla)\b/i],
  ["Multimedija i navigacija", "Harman/Kardon ozvučenje", /\bharman\s*\/?\s*kardon\b/i],
  ["Multimedija i navigacija", "Navigacija Professional", /\b(?:navigacija\s+professional|velika\s+navigacij\w*|navigacij\w*)\b/i],
  ["Multimedija i navigacija", "Apple CarPlay", /\b(?:apple\s*)?carplay\b/i],
  ["Multimedija i navigacija", "Android Auto", /\bandroid\s+auto\b/i],
  ["Eksterijer i ovjes", "Kuka za vuču", /\b(?:kuka\s+za\s+vu[cč]u|kuka\s+na\s+izvla[cč]enje)\b/i],
  ["Eksterijer i ovjes", "Adaptivna LED svjetla", /\b(?:led\s+adaptivn\w*\s+svijetla|adaptivna\s+led|led\s+svjetla)\b/i],
  ["Eksterijer i ovjes", "LED osvjetljenje vanjskih kvaka", /\b(?:led\s+(?:kavk\w*|kvak\w*)|osvjetljenj\w*\s+kvak\w*|kvak\w*\s+s\s*led\s*osvjetljenj\w*)\b/i],
  ["Eksterijer i ovjes", "El. sklopivi i zatamnjivi retrovizori", /\b(?:el\.?\s*sklopivi\s+retrovizori|sklopivi\s+retrovizori|fotosenzibiln\w*\s+retrovizor\w*|elektri[cč]no\s+sklapanj\w*\s+retrovizor\w*|zatamnjen\w*\s+retrovizor\w*)\b/i],
  ["Eksterijer i ovjes", "M Sport paket", /\b(?:m[\s-]*sport\s+paket|m\s*paket|m[\s-]*branici|m[\s-]*pragovi|m[\s-]*lajsne|m[\s-]*sport)\b/i],
  ["Eksterijer i ovjes", 'Alu naplatci 20"', /\b(?:alu\s+(?:felge|naplatci)\s*20|aluminijski\s+naplatci\s*20)\b/i],
];

/** Category of every inferred baseline item in the 4-column detail layout. */
const STANDARD_EQUIPMENT_CATEGORY: Record<string, (typeof EQUIPMENT_CATEGORIES)[number]> = {
  "ABS": "Sigurnost i asistencije",
  "Zračni jastuci": "Sigurnost i asistencije",
  "ESP / Kontrola stabilnosti": "Sigurnost i asistencije",
  "ISOFIX": "Sigurnost i asistencije",
  "Senzor tlaka u gumama": "Sigurnost i asistencije",
  "Servo upravljač": "Udobnost i interijer",
  "Daljinsko centralno zaključavanje": "Udobnost i interijer",
  "Električni podizači stakala": "Udobnost i interijer",
  "Automatska klima": "Udobnost i interijer",
  "Putno računalo": "Multimedija i navigacija",
  "Bluetooth": "Multimedija i navigacija",
  "Start-Stop sustav": "Multimedija i navigacija",
};

const PREMIUM_EQUIPMENT_MAKES = new Set(["bmw", "audi", "mercedesbenz", "volkswagen", "volvo", "skoda", "porsche", "tesla", "mazda", "cupra"]);
const STANDARD_EQUIPMENT_EXCLUSIONS: Array<[string, RegExp]> = [
  ["ABS", /bezabs/],
  ["Zračni jastuci", /bezjastuk/],
  ["ESP / Kontrola stabilnosti", /bezesp/],
  ["ISOFIX", /bezisofix/],
  ["Senzor tlaka u gumama", /bezsenzoratlaka/],
  ["Start-Stop sustav", /bezstartstop|startstopiskljucen/],
  ["Automatska klima", /bezklime|manuelnaklima|rucnaklima/],
  ["Bluetooth", /bezbluetooth/],
];

/**
 * Deterministic baseline factory equipment by year and segment, so an imported
 * 2017 BMW can never publish looking like it lacks ABS or airbags. Explicit
 * seller exclusions ("bez klime", …) always win. Shared contract with
 * `inferStandardEquipment` in app/search.ts.
 */
export function inferStandardEquipment(facts: { year?: number; make?: string; gear?: string; fuel?: string; text?: string }): string[] {
  const year = Number(facts.year);
  if (!Number.isInteger(year) || year < 2004) return [];
  const labels = ["ABS", "Zračni jastuci", "Servo upravljač", "Daljinsko centralno zaključavanje", "Električni podizači stakala"];
  if (year >= 2011) labels.push("ESP / Kontrola stabilnosti", "Putno računalo", "ISOFIX");
  if (year >= 2014) labels.push("Senzor tlaka u gumama", "Start-Stop sustav");
  if (year >= 2012 && PREMIUM_EQUIPMENT_MAKES.has(norm(facts.make ?? ""))) {
    labels.push("Automatska klima", "Bluetooth");
  }
  const signal = norm(facts.text ?? "");
  return labels.filter(label => !STANDARD_EQUIPMENT_EXCLUSIONS.some(([excluded, pattern]) => excluded === label && pattern.test(signal)));
}

export function canonicalEquipmentLabel(raw: string): string {
  const text = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [, label, pattern] of EQUIPMENT_RULES) {
    if (pattern.test(text)) return label;
  }
  return raw.trim().slice(0, 100);
}

function categorizeEquipment(text: string, extra: string[] = []) {
  const grouped: Record<string, string[]> = Object.fromEntries(EQUIPMENT_CATEGORIES.map(category => [category, [] as string[]]));
  const push = (category: string, label: string) => {
    if (label && !grouped[category].includes(label)) grouped[category].push(label);
  };
  for (const [category, label, pattern] of EQUIPMENT_RULES) {
    if (pattern.test(text)) push(category, label);
  }
  for (const item of extra) {
    const canonical = canonicalEquipmentLabel(item);
    const rule = EQUIPMENT_RULES.find(([, label]) => label === canonical);
    if (rule) push(rule[0], canonical);
    else if (STANDARD_EQUIPMENT_CATEGORY[canonical]) push(STANDARD_EQUIPMENT_CATEGORY[canonical], canonical);
  }
  if (grouped["Sigurnost i asistencije"].includes("360° kamera")) {
    grouped["Sigurnost i asistencije"] = grouped["Sigurnost i asistencije"].filter(label => label !== "Kamera za vožnju unatrag");
  }
  if (grouped["Sigurnost i asistencije"].includes("Prednji, stražnji i bočni parking senzori")) {
    grouped["Sigurnost i asistencije"] = grouped["Sigurnost i asistencije"].filter(label => label !== "Prednji i stražnji parking senzori");
  }
  if (grouped["Eksterijer i ovjes"].includes("El. sklopivi i zatamnjivi retrovizori")) {
    grouped["Eksterijer i ovjes"] = grouped["Eksterijer i ovjes"].filter(label => label !== "Električno sklopivi retrovizori");
  }
  // M Sport ovjes only when the M exterior package pairs with M interior parts.
  if (grouped["Eksterijer i ovjes"].includes("M Sport paket")
    && (grouped["Udobnost i interijer"].includes("M Sport sjedala") || grouped["Udobnost i interijer"].includes("M Sport upravljač"))) {
    push("Eksterijer i ovjes", "M Sport ovjes");
  }
  const flat = [...new Set(Object.values(grouped).flat())];
  return { flat, grouped };
}

function canonicalize(input: {
  make: string; model: string; title: string; variant: string; year?: number;
  bodyType: string; cc?: number; drive: string; fields: Record<string, string>; text?: string;
}) {
  const text = [input.make, input.model, input.title, input.variant, input.text, Object.values(input.fields).join(" ")]
    .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const badge = text.match(/\b(430d|435d|420d|330d|320d|318d|530d|520d|220d|116d|118d|120d|3\.0tdi|2\.0tdi|[1-8][0-5]\d[die])\b/)?.[0] ?? "";
  let make = input.make;
  if (!make) {
    make = /mercedes/.test(text) ? "Mercedes-Benz" : /audi/.test(text) ? "Audi" : /volkswagen|\bvw\b/.test(text) ? "Volkswagen"
      : /skoda/.test(text) ? "Škoda" : /toyota/.test(text) ? "Toyota" : /bmw|430d|435d|330d|320d|530d|520d|1[1-8]\d[die]/i.test(text) ? "BMW" : "";
  }
  let model = input.model || (/430d|435d|420d/.test(text) ? "Serija 4" : /330d|320d|318d/.test(text) ? "Serija 3" : /530d|520d/.test(text) ? "Serija 5" : /1[1-8]\d[die]/.test(text) ? "Serija 1" : "");
  let generation = "", bodyType = input.bodyType;
  if (make === "BMW") {
    const number = badge.match(/^([1-8])/)?.[1] ?? text.match(/\bserija\s*([1-8])\b/)?.[1];
    const series = number ? `Serija ${number}` : "";
    if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(number ?? "")) {
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
      if (["X1", "X3", "X5", "X6"].some(x => norm(x) === norm(input.model))) {
        model = ["X1", "X3", "X5", "X6"].find(x => norm(x) === norm(input.model))!;
        bodyType = "SUV / Terenac";
      }
    }
  } else {
    for (const [pattern, mapped, hints] of CANONICAL_ALIASES) {
      const match = text.match(pattern);
      if (!match) continue;
      model = typeof mapped === "function" ? mapped(match) : mapped;
      if (hints.bodyType) bodyType = hints.bodyType;
      if (hints.generation) generation = hints.generation;
      break;
    }
    if (/\bgolf\s*7\b/.test(text)) generation = /facelift|golf\s*7\.5/.test(text) ? "5G facelift" : "5G";
    if (/\bgolf\s*8\b/.test(text)) generation = /golf\s*8\.5/.test(text) ? "CD facelift" : "CD";
  }
  if (/\b(?:avant|variant|combi|touring|estate|sw|sportswagon|allroad)\b/.test(text) && !/suv|terenc|x[13567]\b/.test(text)) bodyType = "Karavan";
  if (/\b(?:xdrive|quattro|4matic|4motion|awd|4x4)\b/.test(text)) bodyType = bodyType || "SUV / Terenac";

  const fuel = /\b(?:gte|ehybrid|plugin|phev)\b/.test(text) ? "Plug-in hibrid"
    : /hibrid|hybrid/.test(text) ? "Hibrid"
    : /\b(?:dizel|diesel|tdi|bluehdi|hdi|dci|cdti|crdi|jtdm?|430d|435d|420d|330d|320d|318d|530d|520d|220d|116d|118d|120d|[1-8][0-5]\d d)\b/.test(text) ? "Dizel"
    : /\b(?:elektri|electric|struja)\b/.test(text) ? "Električni"
    : /\b(?:benzin|petrol|gti|tsi|tfsi|ecoboost|tce)\b/.test(text) ? "Benzin" : undefined;

  const drivetrainRaw = norm(input.drive || input.fields["vrstapogona"] || "");
  const drive = /\b(?:xdrive|quattro|4matic|4motion|awd|4x4|svi)\b/.test(text + " " + drivetrainRaw) ? "4x4"
    : /straznji|rear|rwd/.test(drivetrainRaw) ? "Stražnji"
    : /prednji|front|fwd/.test(drivetrainRaw) ? "Prednji"
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

/** Bullet lines that only repeat specs already parsed into structured fields ("- 2017", "- 190kw", "- reg. 12/2026"). */
const SPEC_ONLY_BULLET = /^\s*[-•*]\s*(?:(?:19|20)\d{2}\b|(?:\d{1,3}(?:[.\s]\d{3})+|\d{2,7})\s*(?:t\s*km|km)\b|\d{2,4}\s*(?:kw|ks)\b|\d{3,5}\s*(?:cm[³3]|ccm|cc)\b|reg(?:istriran(?:\s*do)?)?\.?\s*(?:do\s*)?\d{1,2}\s*[./]\s*(?:19|20)\d{2}|(?:19|20)\d{2}\s*[./]\s*\d{1,2}|dizel|diesel|benzin(?:ski)?|gas\b|lpg|tdi|struja|elektri[cč]n\w*|hibrid|plug.?in|automatik|automatsk\w*|ru[cč]n\w*|manual\w*|steptronic|dsg|bijel\w*|crn\w*|siv\w*|srebrn\w*|plav\w*|crven\w*|zelen\w*|[žz]ut\w*|naran[cč]ast\w*|narandžast\w*|smeđ\w*|smeđast\w*|bež|\d\s*[/–-]\s*\d\s*(?:vrata|sjedala)|\d{3}\s*[die]\b|\d[.,]\d\s*(?:tdi|tsi|tfsi|dci|cdti|crdi|jtd))\s*$/i;

/** Canonical exterior colors matching the publish form options. */
const CANONICAL_COLORS: Array<[RegExp, string]> = [
  [/\btamno\s*plav\w*\b/i, "Tamno plava"],
  [/\bbijel\w*\b/i, "Bijela"],
  [/\bcrn\w*\b/i, "Crna"],
  [/\bsrebrn\w*\b/i, "Srebrna"],
  [/\bsiv\w*\b/i, "Siva"],
  [/\bplav\w*\b/i, "Plava"],
  [/\bcrven\w*\b/i, "Crvena"],
  [/\bzelen\w*\b/i, "Zelena"],
  [/\bžut\w*\b/i, "Žuta"],
  [/\bnaran[cč]ast\w*\b/i, "Narančasta"],
  [/\bsmeđ\w*\b/i, "Smeđa / Bež"],
  [/\bbež\b/i, "Smeđa / Bež"],
];

export function canonicalColor(value: string): string {
  if (!value.trim()) return "";
  return CANONICAL_COLORS.find(([pattern]) => pattern.test(value))?.[1] ?? value.trim().slice(0, 40);
}

function colorFromText(text: string): string {
  const described = text.match(/\bboj\w*(?:\s+(?:vozila|vanjska))?\s*[:=]?\s*(bijel\w*|crn\w*|siv\w*|srebrn\w*|tamno\s*plav\w*|plav\w*|crven\w*|zelen\w*|žut\w*|naran[čc]ast\w*|narandžast\w*|smeđ\w*|bež)\b/i);
  return described ? canonicalColor(described[1]) : "";
}

function cleanDescription(description: string) {
  let text = description.replace(/\n{3,}/g, "\n\n");
  const opremaStart = text.search(/^\s*oprema\s*:/im);
  if (opremaStart >= 0) {
    const head = text.slice(0, opremaStart);
    const tail = text.slice(opremaStart).split("\n").filter(line => {
      const trimmed = line.trim();
      if (/^(?:oprema\s*:|[-•]\s*$)/i.test(trimmed)) return false;
      if (DESCRIPTION_BOILERPLATE.some(marker => marker.test(trimmed))) return false;
      // Keep genuine service / mechanical notes written by the seller.
      if (/(?:ugradjen|ugrađen|lanac|servis|koristi|pregled|motor sa|novi lanac)/i.test(trimmed)) return true;
      return !/^\s*[-•]\s*/.test(trimmed);
    }).join("\n");
    text = head + tail;
  }
  // Drop bullet lines that only repeat specs already parsed into structured fields.
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
  const labelPattern = /^(Lokacija vozila|Marka automobila|Model automobila|Tip automobila|Marka|Model|Godina proizvodnje|Godište|Godiste|Registriran do|Registracija do|Prva registracija|Prijeđeni kilometri|Prijedeni kilometri|Kilometraža|Kilometraza|Motor|Motorizacija|Gorivo|Snaga motora|Radni obujam|Mjenjač|Mjenjac|Pogon|Vrsta pogona|Oblik karoserije|Broj vrata|Broj sjedala|Karoserija|Stanje|Cijena|Boja|Boja vozila|Vanjska boja|Prodavatelj|Prodavač|VIN|Cilindri)(?:\s*[:\t]\s*|\s+|$)(.*)$/i;
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

  const text = [title, body, ...Object.values(fields)].join("\n");
  const analysis = deterministicAnalysis({ rawText: text });
  const field = (label: string) => fields[norm(label)] ?? "";
  const digits = (value: string) => value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const firstRegistration = field("Prva registracija");
  // Structured specs are read from the full raw text before any boilerplate is stripped.
  const extractedRegistration = text.match(/\b(?:reg(?:istriran(?:o| do)?)?\.?)\s*[:=]?\s*(\d{1,2})\s*[./]\s*(20\d{2})\b/i);
  const registration = extractedRegistration
    ? extractedRegistration[1].padStart(2, "0") + "/" + extractedRegistration[2]
    : field("Registriran do") || field("Registracija do") || "";
  const doors = Number(field("Broj vrata").match(/\d+/)?.[0]) || undefined;
  const seats = Number(field("Broj sjedala").match(/\d+/)?.[0]) || undefined;
  const year = boundedInt(Number((field("Godina proizvodnje") || field("Godište") || "").match(/(?:19|20)\d{2}/)?.[0] ?? analysis.year), 1955, new Date().getFullYear() + 1);
  const cc = boundedInt(Number((field("Radni obujam").match(/(\d[\d.,]*)/)?.[1] ?? "").replace(/\./g, "").replace(",", ".") || analysis.cc), 1, 20_000);
  const canonical = canonicalize({
    make: field("Marka automobila") || field("Marka") || analysis.make || "",
    model: field("Model automobila") || field("Model") || analysis.model || "",
    title, variant: field("Motorizacija") || field("Motor") || "", year,
    bodyType: field("Oblik karoserije") || field("Tip automobila") || field("Karoserija") || analysis.bodyType || "",
    cc, drive: field("Vrsta pogona") || field("Pogon") || "", fields,
  });
  const { flat: equipmentFlat, grouped: equipmentByCategory } = categorizeEquipment(text,
    inferStandardEquipment({ year, make: canonical.make, gear: field("Mjenjač"), fuel: canonical.fuel, text }));
  const priceText = field("Cijena");
  const currency = field("Valuta");
  const vehicle = {
    title: title.slice(0, 100),
    description: cleanDescription(description).slice(0, 12_000),
    make: canonical.make || field("Marka automobila") || field("Marka") || analysis.make || "",
    model: canonical.model || field("Model automobila") || field("Model") || analysis.model || "",
    generation: canonical.generation || "",
    variant: canonical.badge || field("Motorizacija") || field("Motor") || analysis.variant || "",
    bodyType: canonical.bodyType || field("Oblik karoserije") || field("Tip automobila") || "",
    color: canonicalColor(field("Boja") || field("Boja vozila") || field("Vanjska boja")) || analysis.color || colorFromText(description),
    fuel: canonical.fuel || field("Gorivo") || analysis.fuel || "",
    gear: field("Mjenjač") || analysis.gear || "",
    drive: canonical.drive || field("Pogon") || "",
    drivetrain: canonical.drive,
    doors, seats,
    cylinders: canonical.cylinders ?? boundedInt(Number(digits(field("Cilindri")) || analysis.cylinders), 2, 16),
    year,
    km: boundedInt(Number(digits(field("Prijeđeni kilometri") || field("Kilometraža")) || analysis.km), 0, 10_000_000),
    kw: boundedInt(Number(digits(field("Snaga motora")) || analysis.kw), 1, 2000),
    cc: canonical.cc ?? cc,
    price: /^(?:eur|€)?$/i.test(currency) ? boundedInt(Number(digits(priceText) || analysis.price), 1, 100_000_000) : boundedInt(Number(digits(priceText)), 1, 100_000_000),
    firstRegistration: /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])/.test(firstRegistration) ? firstRegistration.slice(0, 7) : year ? String(year) + "-01" : "",
    registrationUntil: /^(?:0[1-9]|1[0-2])\/\d{4}$/.test(registration) ? registration : "",
    vin: (field("VIN").match(/^[A-HJ-NPR-Z0-9]{17}$/i)?.[0] ?? "").toUpperCase(),
    city: field("Lokacija vozila") || "",
    seller: field("Prodavatelj") || field("Prodavač") || "",
    condition: field("Stanje") || "",
    ownership: field("Vlasništvo") || field("Broj vlasnika") || (/\b(?:1\.\s*vlasnik|prvi vlasnik)\b/i.test(text) ? "1. vlasnik" : ""),
    equipment: [...new Set([...(analysis.equipment ?? []).map(canonicalEquipmentLabel), ...equipmentFlat])],
    equipmentByCategory,
  };
  return { vehicle, images: imageSources(isHtml ? content : "", base), fields };
}
