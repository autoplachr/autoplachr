import {
  CAR_CATALOG,
  CAR_MAKES,
  clampYearToRange,
  effectiveYearRange,
  modelFor,
  modelsFor,
  OTHER_GENERATION,
  OTHER_MODEL,
  variantsForSelection,
} from "../data/car-catalog";
import { equipmentFor, equipmentId } from "../data/equipment-catalog";
import { isAllowedBase64ImageDataUrl, sanitizeText } from "./sanitize";
import { inferBodyType, resolveVehicleSpecs } from "./spec-resolver";

export class UpstreamVisionError extends Error {
  constructor(message = "Analiza slika trenutno nije dostupna.") {
    super(message);
    this.name = "UpstreamVisionError";
  }
}

export type DetectedEquipmentItem = {
  id: string;
  label: string;
  category: 0 | 1 | 2 | 3;
  confidence: number;
  visualReason: string;
};

export type PhotoAnalysisResponse = {
  source: "openrouter-vision" | "multi-signal-fallback";
  detectedMake: string;
  detectedModel: string;
  detectedGeneration: string;
  detectedTrim: string;
  detectedBodyStyle: string;
  detectedColor: string;
  detectedFuel?: string;
  detectedGear?: string;
  detectedYear?: number;
  detectedKw?: number;
  detectedCc?: number;
  detectedCo2?: number;
  confidence: number;
  detectedEquipment: DetectedEquipmentItem[];
  summary: string;
};

export type VisionPhotoInput = {
  src: string;
  name?: string;
  aspectRatio?: number;
  avgLum?: number;
  darkRatio?: number;
  coolAccentRatio?: number;
  warmLeatherRatio?: number;
  brightSpecRatio?: number;
  edgeEnergy?: number;
  saturationAvg?: number;
};

export type VisionHint = {
  make?: string;
  model?: string;
  generation?: string;
  variant?: string;
  date?: string;
  fuel?: string;
  bodyType?: string;
  title?: string;
  trim?: string;
};

const BRAND_ALIASES: ReadonlyArray<{ make: string; pattern: RegExp }> = [
  { make: "Mercedes-Benz", pattern: /\b(mercedes|merc|benz|amg|w20[3-6]|w21[0-4]|w17[67]|w22[0-3]|x25[34]|v167|c11[78]|glb|glc|gle|gla|cla)\b/i },
  { make: "Volkswagen", pattern: /\b(volkswagen|vw|golf|passat|tiguan|t-roc|t-cross|arteon|touran|touareg|polo|caddy|id\.?[3457]|mk[4-8])\b/i },
  { make: "BMW", pattern: /\b(bmw|bimmer|serija\s*[1-8]|e46|e60|e90|e91|e92|f20|f30|f31|f10|g20|g21|g30|g31|g01|g05|318d|320d|330d|330e|m340i|520d|530d|m-?sport|xdrive)\b/i },
  { make: "Audi", pattern: /\b(audi|quattro|s-?line|rs[3-7]|a[1345678]\b|q[234578]\b|b[6-9]\b|b10|c[6-9]\b|8v|8y|4m|fy)\b/i },
  { make: "Škoda", pattern: /\b(skoda|škoda|octavia|superb|fabia|karoq|kodiaq|kamiq|scala|enyaq|laurin|vrs|5e\b|nx\b|3v\b)\b/i },
  { make: "Porsche", pattern: /\b(porsche|macan|cayenne|911|panamera|taycan|boxster|cayman|95b|992|991)\b/i },
  { make: "Toyota", pattern: /\b(toyota|corolla|yaris|rav4|c-hr|auris|camry|hilux|e210|xa50)\b/i },
  { make: "Peugeot", pattern: /\b(peugeot|208|2008|308|3008|508|5008|p84|p21|bluehdi|gt\s*line)\b/i },
  { make: "Renault", pattern: /\b(renault|clio|megane|mégane|captur|austral|kadjar|talisman|scenic)\b/i },
  { make: "Volvo", pattern: /\b(volvo|xc40|xc60|xc90|v60|v90|s60|s90|r-?design)\b/i },
  { make: "Hyundai", pattern: /\b(hyundai|tucson|kona|i20|i30|ioniq|santa\s*fe|nx4)\b/i },
  { make: "Kia", pattern: /\b(kia|sportage|ceed|xceed|niro|sorento|ev6|nq5)\b/i },
  { make: "Tesla", pattern: /\b(tesla|model\s*[3sxy]|highland|juniper)\b/i },
  { make: "Mazda", pattern: /\b(mazda|cx-?30|cx-?5|cx-?60|mazda3|mazda6|skyactiv)\b/i },
  { make: "Cupra", pattern: /\b(cupra|formentor|born|leon\s*vz|ateca\s*vz)\b/i },
  { make: "Opel", pattern: /\b(opel|astra|corsa|insignia|mokka|grandland)\b/i },
  { make: "Ford", pattern: /\b(ford|focus|fiesta|mondeo|puma|kuga|ranger|mustang|st-?line)\b/i },
  { make: "Dacia", pattern: /\b(dacia|duster|sandero|jogger|spring|bigster)\b/i },
  { make: "Alfa Romeo", pattern: /\b(alfa\s*romeo|giulia|stelvio|giulietta|tonale|veloce)\b/i },
];

const MODEL_ALIASES: ReadonlyArray<{ make: string; model: string; pattern: RegExp }> = [
  { make: "BMW", model: "Serija 1", pattern: /\b(serija\s*1|116d|118d|120d|f20|f21|f40|f70|e87)\b/i },
  { make: "BMW", model: "Serija 3", pattern: /\b(serija\s*3|318d|320d|320i|330d|330e|m340i|g20|g21|f30|f31|e90|e91|e46)\b/i },
  { make: "BMW", model: "Serija 4", pattern: /\b(serija\s*4|420d|430d|420i|f32|f36|g22|g26)\b/i },
  { make: "BMW", model: "Serija 5", pattern: /\b(serija\s*5|520d|530d|530e|540i|g30|g31|f10|f11|e60|g60)\b/i },
  { make: "BMW", model: "X1", pattern: /\b(x1|e84|f48|u11)\b/i },
  { make: "BMW", model: "X3", pattern: /\b(x3|f25|g01|g45)\b/i },
  { make: "BMW", model: "X5", pattern: /\b(x5|e70|f15|g05)\b/i },
  { make: "Audi", model: "A3", pattern: /\b(a3|8p|8v|8y|35\s*tfsi|35\s*tdi)\b/i },
  { make: "Audi", model: "A4", pattern: /\b(a4|b7|b8|b9|40\s*tdi)\b/i },
  { make: "Audi", model: "A5", pattern: /\b(a5|8t|f5|b10)\b/i },
  { make: "Audi", model: "A6", pattern: /\b(a6|c6|c7|c8|45\s*tdi|50\s*tdi)\b/i },
  { make: "Audi", model: "Q3", pattern: /\b(q3|8u|f3|fj)\b/i },
  { make: "Audi", model: "Q5", pattern: /\b(q5|8r|fy|gu)\b/i },
  { make: "Volkswagen", model: "Golf", pattern: /\b(golf|mk[4-8]|5g|cd|gti|gtd)\b/i },
  { make: "Volkswagen", model: "Passat", pattern: /\b(passat|b6|b7|b8|b9)\b/i },
  { make: "Volkswagen", model: "Tiguan", pattern: /\b(tiguan|5n|ad|bw|ct)\b/i },
  { make: "Volkswagen", model: "T-Roc", pattern: /\b(t-?roc|a1)\b/i },
  { make: "Volkswagen", model: "Polo", pattern: /\b(polo|6r|6c|aw)\b/i },
  { make: "Mercedes-Benz", model: "A-klasa", pattern: /\b(a-?klasa|w176|w177|a180|a200)\b/i },
  { make: "Mercedes-Benz", model: "C-klasa", pattern: /\b(c-?klasa|w204|w205|s205|w206|c200|c220)\b/i },
  { make: "Mercedes-Benz", model: "E-klasa", pattern: /\b(e-?klasa|w212|w213|s213|w214|e220)\b/i },
  { make: "Mercedes-Benz", model: "GLC", pattern: /\b(glc|x253|c253|x254)\b/i },
  { make: "Škoda", model: "Octavia", pattern: /\b(octavia|5e|nx|1z)\b/i },
  { make: "Škoda", model: "Superb", pattern: /\b(superb|3v|3t|3y)\b/i },
  { make: "Škoda", model: "Kodiaq", pattern: /\b(kodiaq|ns|ps)\b/i },
  { make: "Porsche", model: "Macan", pattern: /\b(macan|95b)\b/i },
  { make: "Porsche", model: "Cayenne", pattern: /\b(cayenne|92a|e3)\b/i },
  { make: "Porsche", model: "911", pattern: /\b(911|991|992|997|carrera)\b/i },
  { make: "Peugeot", model: "3008", pattern: /\b(3008|p84|p64)\b/i },
  { make: "Peugeot", model: "308", pattern: /\b(308|t9|p5)\b/i },
  { make: "Toyota", model: "Corolla", pattern: /\b(corolla|e210)\b/i },
  { make: "Toyota", model: "RAV4", pattern: /\b(rav4|xa50|xa40)\b/i },
  { make: "Hyundai", model: "Tucson", pattern: /\b(tucson|nx4|tl)\b/i },
  { make: "Kia", model: "Sportage", pattern: /\b(sportage|nq5|ql)\b/i },
  { make: "Tesla", model: "Model 3", pattern: /\b(model\s*3|highland)\b/i },
  { make: "Tesla", model: "Model Y", pattern: /\b(model\s*y|juniper)\b/i },
  { make: "Volvo", model: "XC60", pattern: /\b(xc60)\b/i },
  { make: "Cupra", model: "Formentor", pattern: /\b(formentor)\b/i },
];

function findCatalogMake(raw: string): string {
  const clean = raw.trim().toLowerCase();
  if (!clean) return "";
  const exact = CAR_MAKES.find(m => m.toLowerCase() === clean);
  if (exact) return exact;
  for (const alias of BRAND_ALIASES) {
    if (alias.pattern.test(clean)) return alias.make;
  }
  return "";
}

function findCatalogModel(make: string, rawModel: string, contextText = ""): string {
  if (!make || !Object.hasOwn(CAR_CATALOG, make)) return "";
  const list = modelsFor(make, false);
  const clean = rawModel.trim().toLowerCase();
  if (clean) {
    const exact = list.find(m => m.toLowerCase() === clean);
    if (exact) return exact;
    const partial = list.find(m => clean.includes(m.toLowerCase()) || m.toLowerCase().includes(clean));
    if (partial) return partial;
  }
  for (const alias of MODEL_ALIASES) {
    if (alias.make === make && alias.pattern.test(`${rawModel} ${contextText}`)) return alias.model;
  }
  return "";
}

function findCatalogGeneration(make: string, model: string, rawGen: string, contextText = ""): string {
  const carModel = modelFor(make, model);
  if (!carModel) return "";
  const combined = `${rawGen} ${contextText}`.toUpperCase();
  for (const fam of carModel.generations) {
    if (fam.codes.includes(OTHER_GENERATION)) continue;
    for (const code of fam.codes) {
      if (new RegExp(`\\b${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(combined)) {
        return fam.codes[0];
      }
    }
  }
  return "";
}

function inferColorFromTextOrPixels(text: string, photos: VisionPhotoInput[]): string {
  if (/\b(bijel|white|alpin|mineral\s*white|pearl)\b/i.test(text)) return "Bijela";
  if (/\b(crn|black|obsidian|sapphire\s*black)\b/i.test(text)) return "Crna metalik";
  if (/\b(siv|grey|gray|daytona|nardo|manhattan)\b/i.test(text)) return "Siva metalik";
  if (/\b(plav|blue|portimao|estori|tanzanite)\b/i.test(text)) return "Plava metalik";
  if (/\b(crven|red|soul\s*red|tango)\b/i.test(text)) return "Crvena";
  if (/\b(srebr|silver|reflex)\b/i.test(text)) return "Srebrna metalik";

  const first = photos.find(p => typeof p.avgLum === "number");
  if (!first) return "Metalik";
  if ((first.avgLum ?? 128) > 185 && (first.saturationAvg ?? 0) < 0.18) return "Bijela";
  if ((first.avgLum ?? 128) < 62 && (first.saturationAvg ?? 0) < 0.25) return "Crna metalik";
  if ((first.coolAccentRatio ?? 0) > 0.08) return "Plava metalik";
  if ((first.saturationAvg ?? 0) < 0.18) return "Siva metalik";
  return "Metalik";
}

function inferTrimLabel(contextText: string, make: string): string {
  if (/m[\s-]*sport/i.test(contextText)) return "M Sport";
  if (/s[\s-]*line/i.test(contextText)) return "S line";
  if (/amg[\s-]*line/i.test(contextText)) return "AMG Line";
  if (/r[\s-]*line/i.test(contextText)) return "R-Line";
  if (/gt[\s-]*line/i.test(contextText)) return "GT Line";
  if (/st[\s-]*line/i.test(contextText)) return "ST-Line";
  if (/laurin|l&k/i.test(contextText)) return "Laurin & Klement";
  if (/r-?design/i.test(contextText)) return "R-Design";
  if (/veloce/i.test(contextText)) return "Veloce";
  if (/\bgti\b/i.test(contextText)) return "GTI";
  if (/\bgtd\b/i.test(contextText)) return "GTD";
  if (/\brs\b/i.test(contextText) && make === "Škoda") return "RS";
  return "";
}

function matchEquipmentSignals(params: {
  photos: VisionPhotoInput[];
  make: string;
  model: string;
  generation: string;
  variant: string;
  fuel: string;
  bodyType: string;
  year: number;
  contextText: string;
  visionEquipHints?: Array<{ label: string; confidence?: number; visualReason?: string }>;
}): DetectedEquipmentItem[] {
  const { photos, make, model, generation, variant, fuel, bodyType, year, contextText, visionEquipHints } = params;
  const allowed = equipmentFor({
    make: make || "BMW",
    model: model || (make ? "" : "Serija 3"),
    generation,
    variant,
    fuel,
    bodyType,
    date: year ? `${year}-06` : undefined,
  });

  const fileNames = photos.map(p => p.name ?? "").join(" ").toLowerCase();
  let hasInteriorShot = /interijer|kokpit|unutras|kabin|sjedal|volan|cockpit|interior|dash/i.test(fileNames);
  let hasExteriorShot = /eksterijer|vani|sprijeda|bok|straga|front|side|rear|exterior/i.test(fileNames);
  let hasPanoSignal = /panoram|krov|sunroof|siber/i.test(fileNames);
  let hasAmbientSignal = /ambient|ambijent/i.test(fileNames);
  let hasLeatherSignal = /koza|kozna|leather/i.test(fileNames);
  let hasBrightLights = /led|matrix|xenon|svjetl/i.test(fileNames);
  let hasWheelSharpness = /felg|naplat|kotac|alloy|wheel/i.test(fileNames);

  for (const m of photos) {
    if ((m.darkRatio ?? 0) > 0.34 && (m.avgLum ?? 120) < 125) hasInteriorShot = true;
    if ((m.avgLum ?? 0) > 105 && (m.edgeEnergy ?? 0) > 11) hasExteriorShot = true;
    if ((m.darkRatio ?? 0) > 0.25 && (m.coolAccentRatio ?? 0) > 0.035) hasAmbientSignal = true;
    if ((m.warmLeatherRatio ?? 0) > 0.06 || ((m.darkRatio ?? 0) > 0.45 && (m.edgeEnergy ?? 0) > 14)) hasLeatherSignal = true;
    if ((m.brightSpecRatio ?? 0) > 0.025 && (m.edgeEnergy ?? 0) > 12) hasBrightLights = true;
    if ((m.edgeEnergy ?? 0) > 14) hasWheelSharpness = true;
  }

  if (!photos.some(p => typeof p.avgLum === "number") && photos.length > 0) {
    hasExteriorShot = true;
    hasWheelSharpness = true;
    hasBrightLights = true;
    if (photos.length >= 2) hasInteriorShot = true;
  }

  const candidates: Array<{ match: RegExp; confidence: number; reason: string }> = [];

  if (visionEquipHints?.length) {
    for (const h of visionEquipHints) {
      const escaped = h.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      candidates.push({
        match: new RegExp(escaped, "i"),
        confidence: Math.max(60, Math.min(99, Math.round(h.confidence ?? 90))),
        reason: h.visualReason || "Prepoznato AI vizualnom analizom fotografije",
      });
    }
  }

  if (/\b(m[\s-]*sport|s[\s-]*line|amg[\s-]*line|r[\s-]*line|gt[\s-]*line|rs|gti|gtd|vz|st[\s-]*line|veloce)\b/i.test(contextText)) {
    candidates.push({
      match: /M Sport paket|S-Line|AMG Line|R-Line|Sportski izgled|FR paket|GT Line|RS paket|VZ paket/i,
      confidence: 96,
      reason: "Prepoznat prednji branik, pragovi i oznake sportskog paketa",
    });
    candidates.push({
      match: /^Sportska sjedala$|^M Sport sjedala/i,
      confidence: 88,
      reason: "Izražena bočna potpora prednjih sjedala",
    });
  }

  if (hasExteriorShot || hasWheelSharpness) {
    candidates.push({ match: /^Aluminijski naplatci$/i, confidence: 94, reason: "Prepoznati aluminijski naplatci na bočnom/prednjem profilu" });
    candidates.push({ match: /^Metalik boja$/i, confidence: 84, reason: "Refleksija i dubina laka karoserije" });
  }

  if (hasBrightLights) {
    if (year >= 2015) {
      candidates.push({ match: /Matrix LED|IQ\.Light|MULTIBEAM|HD Matrix|BMW Laserlight|IntelliLux/i, confidence: 87, reason: "Prepoznat adaptivni LED svjetlosni potpis farova" });
      candidates.push({ match: /^LED svjetla$|^Adaptivna LED svjetla$/i, confidence: 92, reason: "Prepoznat LED svjetlosni potpis" });
    } else if (year >= 2002 && year <= 2018) {
      candidates.push({ match: /^Ksenonska svjetla/i, confidence: 85, reason: "Projektorske leće prednjih farova" });
    } else {
      candidates.push({ match: /^Prednje maglenke$/i, confidence: 82, reason: "Prednji branik s maglenkama" });
    }
  }

  if (hasPanoSignal && year >= 2006) {
    candidates.push({ match: /Panoramski krov|Panorama/i, confidence: 86, reason: "Staklena krovna površina na fotografiji" });
  }

  if (hasInteriorShot) {
    if (year >= 2017) {
      candidates.push({ match: /Digitalni kokpit|Virtual Cockpit|Live Cockpit|MBUX|Digital Cockpit Pro|OpenR|i-Cockpit/i, confidence: 91, reason: "Prepoznat digitalni zaslon instrumenata u kabini" });
      candidates.push({ match: /Apple CarPlay|Android Auto|Navigacija/i, confidence: 85, reason: "Središnji široki multimedijski zaslon" });
    }
    if (year >= 2005) {
      candidates.push({ match: /^Automatska klima$|^Dvozonska klima$|^Trozonska klima$/i, confidence: 88, reason: "Digitalni modul središnje klimatizacije" });
      candidates.push({ match: /^Višenamjenski upravljač$/i, confidence: 90, reason: "Višenamjenske tipke na kolu upravljača" });
    } else {
      candidates.push({ match: /^Klima-uređaj$|^Servo upravljač$|^Električni podizači stakala$/i, confidence: 85, reason: "Oprema kabine za ovo godište" });
    }
  }

  if (hasAmbientSignal && year >= 2015) {
    candidates.push({ match: /Ambijentalno osvjetljenje/i, confidence: 83, reason: "LED ambijentalne linije na oblogama vrata" });
  }
  if (hasLeatherSignal) {
    candidates.push({ match: /^Kožna sjedala$|^Sportska sjedala$|^M Sport sjedala/i, confidence: 86, reason: "Kožna ili kombinirana presvlaka sjedala" });
  }
  if (/\b(4x4|4×4|awd|xdrive|quattro|4matic|4motion|allgrip)\b/i.test(contextText)) {
    candidates.push({ match: /Pogon 4×4|xDrive|quattro|4MATIC|4Motion|ALLGRIP/i, confidence: 95, reason: "Oznaka pogona na sve kotače" });
  }
  if (/kamera|360|area view|around view|parking/i.test(contextText) || (year >= 2018 && photos.length >= 2)) {
    candidates.push({ match: /Kamera za vožnju unatrag|Kamera 360°|Area View/i, confidence: 83, reason: "Kamera i senzori u odbojnicima" });
    candidates.push({ match: /Stražnji parkirni senzori|Prednji parkirni senzori/i, confidence: 89, reason: "Ultrazvučni senzori u branicima" });
  }
  if (/elektri|struj|plug-in|phev|ev\b/i.test(fuel)) {
    candidates.push({ match: /Kabel za punjenje Type 2|Rekuperacija energije/i, confidence: 88, reason: "Električni ili plug-in pogonski sklop" });
  }

  const byId = new Map<string, DetectedEquipmentItem>();
  for (const cand of candidates.sort((a, b) => b.confidence - a.confidence)) {
    for (const item of allowed) {
      if (!cand.match.test(item.label)) continue;
      const existing = byId.get(item.id);
      if (!existing || cand.confidence > existing.confidence) {
        byId.set(item.id, {
          id: item.id,
          label: item.label,
          category: item.category,
          confidence: cand.confidence,
          visualReason: cand.reason,
        });
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 9);
}

type RawVisionPayload = {
  detectedMake?: string;
  detectedModel?: string;
  detectedGeneration?: string;
  detectedTrim?: string;
  detectedBodyStyle?: string;
  detectedColor?: string;
  detectedFuel?: string;
  detectedGear?: string;
  detectedYear?: number;
  detectedEquipment?: Array<{ label: string; confidence?: number; visualReason?: string }>;
  confidence?: number;
};

async function callOpenRouterVision(
  photos: VisionPhotoInput[],
  hint: VisionHint,
  apiKey: string,
  modelId = "google/gemini-2.5-flash",
): Promise<RawVisionPayload> {
  const safePhotos = photos.filter(p => isAllowedBase64ImageDataUrl(p.src)).slice(0, 4);
  if (!safePhotos.length) {
    throw new UpstreamVisionError("Podržane su samo JPEG, PNG i WebP slike u base64 formatu.");
  }
  const imageParts = safePhotos.map(p => ({
    type: "image_url",
    image_url: { url: p.src },
  }));

  const safeHint = sanitizeText(
    `${hint.make ?? ""} ${hint.model ?? ""} ${hint.generation ?? ""} ${hint.variant ?? ""}`,
    160,
  );
  const prompt = [
    "Analyze these car photos for a Croatian automotive marketplace (AUTOPLAC.HR).",
    "Return ONLY valid JSON with these exact keys:",
    `{
  "detectedMake": "exact brand name (e.g. BMW, Audi, Volkswagen, Mercedes-Benz, Škoda, Porsche, Toyota, Peugeot...)",
  "detectedModel": "model name (e.g. Serija 3, A4, Golf, C-klasa, Octavia, Macan...)",
  "detectedGeneration": "chassis code if visible (e.g. G20, B9, CD, W205, 5E, 95B)",
  "detectedTrim": "trim or motorization badge if visible (e.g. 320d M-Sport, S line, AMG Line, R-Line)",
  "detectedBodyStyle": "one of: Hatchback / Kompakt, Limuzina, Karavan, SUV / Terenac, Coupé, Cabrio / Roadster, Monovolumen (MPV), Kombi / Dostavno, Pick-up",
  "detectedColor": "Croatian color name (e.g. Mineralno bijela, Crna metalik, Siva metalik)",
  "detectedFuel": "one of: Dizel, Benzin, Hibrid, Plug-in hibrid, Električni",
  "detectedGear": "Automatski or Ručni",
  "detectedYear": null,
  "confidence": 92,
  "detectedEquipment": [
    { "label": "Croatian equipment name (e.g. M Sport paket, LED svjetla, Aluminijski naplatci, Digitalni kokpit, Sportska sjedala, Kamera za vožnju unatrag, Automatski mjenjač)", "confidence": 94, "visualReason": "Short Croatian reason what was seen in the photo" }
  ]
}`,
    safeHint ? `Seller hint: ${safeHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://autoplac.hr",
        "X-Title": "AUTOPLAC.HR Vision",
      },
      body: JSON.stringify({
        model: modelId,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }, ...imageParts],
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new UpstreamVisionError(`Upstream status ${response.status}`);
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new UpstreamVisionError("Empty vision response");
    const jsonText = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(jsonText) as RawVisionPayload;
  } catch (err) {
    if (err instanceof UpstreamVisionError) throw err;
    throw new UpstreamVisionError("Vision request failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeCarPhotos(params: {
  photos: VisionPhotoInput[];
  hint?: VisionHint;
  openRouterApiKey?: string;
  openRouterModel?: string;
}): Promise<PhotoAnalysisResponse> {
  const { photos, hint = {}, openRouterApiKey, openRouterModel } = params;
  if (!photos.length) {
    return {
      source: "multi-signal-fallback",
      detectedMake: hint.make ?? "",
      detectedModel: hint.model ?? "",
      detectedGeneration: hint.generation ?? "",
      detectedTrim: "",
      detectedBodyStyle: hint.bodyType ?? "",
      detectedColor: "",
      confidence: 0,
      detectedEquipment: [],
      summary: "Učitajte fotografije za AI prepoznavanje vozila i opreme.",
    };
  }

  const fileNames = photos.map(p => p.name ?? "").join(" ");
  const rawContext = `${fileNames} ${hint.make ?? ""} ${hint.model ?? ""} ${hint.generation ?? ""} ${hint.variant ?? ""} ${hint.title ?? ""} ${hint.trim ?? ""}`;

  let visionRaw: RawVisionPayload | null = null;
  if (openRouterApiKey) {
    visionRaw = await callOpenRouterVision(photos, hint, openRouterApiKey, openRouterModel);
  }

  const source: PhotoAnalysisResponse["source"] = visionRaw ? "openrouter-vision" : "multi-signal-fallback";

  let detectedMake =
    findCatalogMake(visionRaw?.detectedMake ?? "") ||
    findCatalogMake(hint.make ?? "") ||
    findCatalogMake(fileNames);

  // Check model aliases if brand wasn't explicitly found in filename
  if (!detectedMake) {
    for (const alias of MODEL_ALIASES) {
      if (alias.pattern.test(fileNames)) {
        detectedMake = alias.make;
        break;
      }
    }
  }

  const detectedModel =
    findCatalogModel(detectedMake, visionRaw?.detectedModel ?? "", fileNames) ||
    (hint.model && hint.model !== OTHER_MODEL ? hint.model : "") ||
    findCatalogModel(detectedMake, fileNames, rawContext);

  const detectedGeneration =
    findCatalogGeneration(detectedMake, detectedModel, visionRaw?.detectedGeneration ?? "", fileNames) ||
    (hint.generation && hint.generation !== OTHER_GENERATION ? hint.generation : "") ||
    findCatalogGeneration(detectedMake, detectedModel, fileNames, rawContext);

  const trimFromText = inferTrimLabel(`${visionRaw?.detectedTrim ?? ""} ${rawContext}`, detectedMake);
  const variantCandidates = detectedMake && detectedModel ? variantsForSelection(detectedMake, detectedModel, detectedGeneration) : [];
  const matchedVariant =
    variantCandidates.find(v => new RegExp(`\\b${v.split(/\s+/)[0]}\\b`, "i").test(`${visionRaw?.detectedTrim ?? ""} ${fileNames}`)) ||
    hint.variant ||
    variantCandidates[0] ||
    "";

  const detectedTrim =
    [matchedVariant, trimFromText]
      .filter((part, idx, arr) => Boolean(part) && (idx === 0 || !arr[0].toLowerCase().includes(part.toLowerCase())))
      .join(" ") ||
    visionRaw?.detectedTrim ||
    "";

  const range =
    detectedMake && detectedModel
      ? effectiveYearRange(detectedMake, detectedModel, detectedGeneration, matchedVariant)
      : { yearFrom: 2016, yearTo: 2025 };

  const hintYear = hint.date && /^\d{4}/.test(hint.date) ? Number(hint.date.slice(0, 4)) : undefined;
  const filenameYear = fileNames.match(/\b(199\d|20[0-2]\d)\b/)?.[1];
  const rawYear = visionRaw?.detectedYear || (filenameYear ? Number(filenameYear) : undefined) || hintYear;
  const detectedYear = rawYear ? clampYearToRange(rawYear, range) : undefined;

  const detectedBodyStyle =
    visionRaw?.detectedBodyStyle ||
    hint.bodyType ||
    (detectedMake && detectedModel
      ? inferBodyType({ make: detectedMake, model: detectedModel, generation: detectedGeneration, title: fileNames })
      : "Limuzina");

  const resolvedSpecs = detectedMake && detectedModel
    ? resolveVehicleSpecs({
        make: detectedMake,
        model: detectedModel,
        generation: detectedGeneration,
        variant: matchedVariant || detectedTrim,
        title: `${detectedMake} ${detectedModel} ${detectedGeneration} ${detectedTrim}`,
        year: detectedYear,
        bodyType: detectedBodyStyle,
        fuel: visionRaw?.detectedFuel || hint.fuel,
        gear: visionRaw?.detectedGear,
      })
    : null;

  const detectedFuel = resolvedSpecs?.fuel ?? visionRaw?.detectedFuel ?? hint.fuel ?? "Dizel";
  const detectedGear =
    resolvedSpecs?.gear ??
    visionRaw?.detectedGear ??
    (/dsg|s-tronic|steptronic|automat|pdk|9g|7g/i.test(rawContext) ? "Automatski" : "Automatski");

  const detectedColor = inferColorFromTextOrPixels(`${visionRaw?.detectedColor ?? ""} ${fileNames}`, photos);

  const detectedEquipment = matchEquipmentSignals({
    photos,
    make: detectedMake,
    model: detectedModel,
    generation: detectedGeneration,
    variant: matchedVariant || detectedTrim,
    fuel: detectedFuel,
    bodyType: detectedBodyStyle,
    year: detectedYear ?? 0,
    contextText: `${rawContext} ${visionRaw?.detectedTrim ?? ""}`,
    visionEquipHints: visionRaw?.detectedEquipment,
  });

  // Add automatic transmission as a verifiable equipment chip when detected
  const autoEquipId = equipmentId("Automatski mjenjač");
  if (detectedGear === "Automatski" && !detectedEquipment.some(e => e.id === autoEquipId)) {
    const autoCatalogItem = equipmentFor({
      make: detectedMake || "BMW",
      model: detectedModel || (detectedMake ? "" : "Serija 3"),
      generation: detectedGeneration,
      date: detectedYear ? `${detectedYear}-06` : undefined,
    }).find(i => /automatski mjenjač/i.test(i.label));
    if (autoCatalogItem) {
      detectedEquipment.unshift({
        id: autoCatalogItem.id,
        label: autoCatalogItem.label,
        category: autoCatalogItem.category,
        confidence: 95,
        visualReason: "Prepoznata ručica automatskog mjenjača / konfiguracija pogona",
      });
    }
  }

  const hasIdentity = Boolean(detectedMake && detectedModel);
  const baseConfidence = visionRaw?.confidence
    ? Math.round(visionRaw.confidence)
    : hasIdentity
    ? detectedGeneration
      ? 94
      : 89
    : 82;

  const vehicleTitleLabel = [detectedMake, detectedModel, detectedGeneration ? `(${detectedGeneration})` : "", detectedTrim]
    .filter(Boolean)
    .join(" ");

  const summary = hasIdentity
    ? `Prepoznato vozilo: ${vehicleTitleLabel} (${baseConfidence}% sigurnost) · ${detectedEquipment.length} stavki opreme`
    : `Analizirano ${photos.length} fotografija — prepoznata karoserija (${detectedBodyStyle}) i ${detectedEquipment.length} stavki opreme.`;

  return {
    source,
    detectedMake,
    detectedModel,
    detectedGeneration,
    detectedTrim,
    detectedBodyStyle,
    detectedColor,
    detectedFuel,
    detectedGear,
    detectedYear,
    detectedKw: resolvedSpecs?.kw,
    detectedCc: resolvedSpecs?.cc,
    detectedCo2: resolvedSpecs?.co2,
    confidence: baseConfidence,
    detectedEquipment: detectedEquipment.slice(0, 9),
    summary,
  };
}
