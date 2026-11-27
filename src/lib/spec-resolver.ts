export const KW_TO_KS = 1.3596;

export function kwToKs(kw: number): number {
  if (!Number.isFinite(kw) || kw <= 0) return 0;
  return Math.round(kw * KW_TO_KS);
}

export function ksToKw(ks: number): number {
  if (!Number.isFinite(ks) || ks <= 0) return 0;
  return Math.max(1, Math.round(ks / KW_TO_KS));
}

export type SpecFuel = "Dizel" | "Benzin" | "Hibrid" | "Plug-in hibrid" | "Električni" | "LPG";
export type CatalogFuel = "Dizel" | "Benzin" | "Hibrid" | "Plug-in hibrid" | "Struja";
export type ResolvedBodyType =
  | "Hatchback / Kompakt"
  | "Limuzina"
  | "Karavan"
  | "SUV / Terenac"
  | "Coupé"
  | "Cabrio / Roadster"
  | "Monovolumen (MPV)"
  | "Kombi / Dostavno"
  | "Pick-up";

export type SpecResolverInput = {
  make?: string;
  model?: string;
  generation?: string;
  variant?: string;
  title?: string;
  year?: number;
  date?: string;
  fuel?: string;
  kw?: number;
  cc?: number;
  gear?: string;
  drive?: string;
  bodyType?: string;
};

export type ResolvedVehicleSpecs = {
  fuel: SpecFuel;
  catalogFuel: CatalogFuel;
  bodyType: ResolvedBodyType;
  kw: number;
  ks: number;
  cc: number;
  co2: number;
  drive?: "Prednji" | "Stražnji" | "4×4";
  gear?: "Automatski" | "Ručni";
  isPlugIn: boolean;
  matchedPreset?: string;
};

type EnginePreset = {
  pattern: RegExp;
  fuel: SpecFuel;
  kw: number;
  cc: number;
  drive?: "Prednji" | "Stražnji" | "4×4";
  gear?: "Automatski" | "Ručni";
  makes?: RegExp;
};

const ENGINE_PRESETS: readonly EnginePreset[] = [
  // === Electric vehicles / EV trims ===
  { pattern: /\bnevera\b/i, fuel: "Električni", kw: 1408, cc: 0, drive: "4×4", gear: "Automatski" },
  { pattern: /\bplaid\b/i, fuel: "Električni", kw: 750, cc: 0, drive: "4×4", gear: "Automatski" },
  { pattern: /\bcyberbeast\b/i, fuel: "Električni", kw: 630, cc: 0, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(i7|ix m60|eqs 580|taycan turbo s)\b/i, fuel: "Električni", kw: 460, cc: 0, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(e-208|ë-c3|ë-c4|e-2008|e-3008|e-5008|e-rifter|e-partner|e-doblo|e-berlingo|spring|electric 45|electric 65|zoe|t03|dolphin surf)\b/i, fuel: "Električni", kw: 100, cc: 0, drive: "Prednji", gear: "Automatski" },
  { pattern: /\b(id\.3|id\.4|id\.5|id\.7|enyaq|born|tavascan|elroq|ev3|ev6|ev9|ioniq 5|ioniq 6|model 3|model y|model s|model x|atto 2|atto 3|seal|sealion|ex30|ex90|mg4|mg5|polestar|leaf|ariya|bZ4X|eqa|eqb|eqc|eqe|eqs|i3|i4|i5|ix1|ix2|ix3|ix|taycan|electr|elektri|struj|ev\d*|kwh)\b/i, fuel: "Električni", kw: 150, cc: 0, gear: "Automatski" },

  // === Plug-in hybrids (PHEV) ===
  { pattern: /\b(330e|530e|xdrive30e)\b/i, fuel: "Plug-in hibrid", kw: 215, cc: 1998, gear: "Automatski" },
  { pattern: /\b(225e|xdrive25e)\b/i, fuel: "Plug-in hibrid", kw: 180, cc: 1499, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(xdrive45e|xdrive50e|750e|m760e)\b/i, fuel: "Plug-in hibrid", kw: 360, cc: 2998, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(300\s*de|350\s*de)\b/i, fuel: "Plug-in hibrid", kw: 225, cc: 1950, gear: "Automatski" },
  { pattern: /\b(250\s*e|300\s*e)\b/i, fuel: "Plug-in hibrid", kw: 160, cc: 1332, gear: "Automatski" },
  { pattern: /\b(580\s*e)\b/i, fuel: "Plug-in hibrid", kw: 375, cc: 2999, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(40 tfsi e|45 tfsi e)\b/i, fuel: "Plug-in hibrid", kw: 180, cc: 1395, gear: "Automatski" },
  { pattern: /\b(50 tfsi e|55 tfsi e|60 tfsi e)\b/i, fuel: "Plug-in hibrid", kw: 270, cc: 2995, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(gte|e-hybrid|ehybrid|iv|e-tense)\b/i, fuel: "Plug-in hibrid", kw: 160, cc: 1395, gear: "Automatski" },
  { pattern: /\b(t6 recharge|t8 recharge)\b/i, fuel: "Plug-in hibrid", kw: 257, cc: 1969, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(450h\+|p300e|p400e|p460e|4xe|dm-i|shs|em-i|reev|phev|plug-in)\b/i, fuel: "Plug-in hibrid", kw: 180, cc: 1498, gear: "Automatski" },

  // === Full Hybrids ===
  { pattern: /\b(1\.5 hybrid|hybrid 116|hybrid 130|hybrid 140|hybrid 155|e-tech full hybrid 145)\b/i, fuel: "Hibrid", kw: 85, cc: 1490, gear: "Automatski" },
  { pattern: /\b(1\.8 hybrid)\b/i, fuel: "Hibrid", kw: 103, cc: 1798, gear: "Automatski" },
  { pattern: /\b(2\.0 hybrid|2\.0 e:hev|e-tech full hybrid 200)\b/i, fuel: "Hibrid", kw: 144, cc: 1987, gear: "Automatski" },
  { pattern: /\b(2\.5 hybrid|2\.5 fhev|300h|350h|400h|450h)\b/i, fuel: "Hibrid", kw: 163, cc: 2487, gear: "Automatski" },
  { pattern: /\b(200h|250h)\b/i, fuel: "Hibrid", kw: 135, cc: 1987, gear: "Automatski" },
  { pattern: /\b(e-power|hybrid\+|e:hev|fhev|ibrida|e-skyactiv x|e-boxer)\b/i, fuel: "Hibrid", kw: 115, cc: 1598, gear: "Automatski" },

  // === BMW Diesel & Petrol ===
  { pattern: /\b(114d|214d)\b/i, fuel: "Dizel", kw: 70, cc: 1496, makes: /BMW/i },
  { pattern: /\b(116d|216d|316d)\b/i, fuel: "Dizel", kw: 85, cc: 1496, makes: /BMW/i },
  { pattern: /\b(118d|218d|318d|418d|518d|sdrive18d)\b/i, fuel: "Dizel", kw: 110, cc: 1995, makes: /BMW/i },
  { pattern: /\b(120d|220d|320d|420d|520d|xdrive20d)\b/i, fuel: "Dizel", kw: 140, cc: 1995, makes: /BMW/i },
  { pattern: /\b(325d|425d|525d|xdrive25d)\b/i, fuel: "Dizel", kw: 160, cc: 1995, makes: /BMW/i },
  { pattern: /\b(330d|430d|530d|630d|730d|xdrive30d|3\.0d)\b/i, fuel: "Dizel", kw: 195, cc: 2993, makes: /BMW/i },
  { pattern: /\b(335d|435d|535d|640d|740d|xdrive40d)\b/i, fuel: "Dizel", kw: 235, cc: 2993, drive: "4×4", gear: "Automatski", makes: /BMW/i },
  { pattern: /\b(m340d|m550d|m50d)\b/i, fuel: "Dizel", kw: 250, cc: 2993, drive: "4×4", gear: "Automatski", makes: /BMW/i },
  { pattern: /\b(116i|316i)\b/i, fuel: "Benzin", kw: 85, cc: 1598, makes: /BMW/i },
  { pattern: /\b(118i|218i|318i|sdrive18i)\b/i, fuel: "Benzin", kw: 100, cc: 1499, makes: /BMW/i },
  { pattern: /\b(120i|220i|320i|420i|520i|sdrive20i)\b/i, fuel: "Benzin", kw: 135, cc: 1998, makes: /BMW/i },
  { pattern: /\b(330i|430i|530i|sdrive30i)\b/i, fuel: "Benzin", kw: 185, cc: 1998, gear: "Automatski", makes: /BMW/i },
  { pattern: /\b(m135i|m140i|m240i|m340i|m440i|540i|640i|740i|m40i)\b/i, fuel: "Benzin", kw: 265, cc: 2998, gear: "Automatski", makes: /BMW/i },

  // === Mercedes-Benz ===
  { pattern: /\b(180\s*d|180\s*cdi|109\s*cdi|110\s*cdi)\b/i, fuel: "Dizel", kw: 85, cc: 1461, makes: /Mercedes/i },
  { pattern: /\b(200\s*d|200\s*cdi|111\s*cdi|114\s*cdi)\b/i, fuel: "Dizel", kw: 110, cc: 1950, makes: /Mercedes/i },
  { pattern: /\b(220\s*d|220\s*cdi|116\s*cdi)\b/i, fuel: "Dizel", kw: 143, cc: 1950, makes: /Mercedes/i },
  { pattern: /\b(250\s*d|250\s*cdi|270\s*cdi)\b/i, fuel: "Dizel", kw: 150, cc: 2143, makes: /Mercedes/i },
  { pattern: /\b(300\s*d|320\s*cdi|350\s*cdi|350\s*d)\b/i, fuel: "Dizel", kw: 190, cc: 2925, gear: "Automatski", makes: /Mercedes/i },
  { pattern: /\b(400\s*d|450\s*d)\b/i, fuel: "Dizel", kw: 243, cc: 2925, drive: "4×4", gear: "Automatski", makes: /Mercedes/i },
  { pattern: /\b(180|160)\b/i, fuel: "Benzin", kw: 100, cc: 1332, makes: /Mercedes/i },
  { pattern: /\b(200)\b/i, fuel: "Benzin", kw: 120, cc: 1496, makes: /Mercedes/i },
  { pattern: /\b(450\s*4matic|500|g\s*500)\b/i, fuel: "Benzin", kw: 310, cc: 2999, drive: "4×4", gear: "Automatski", makes: /Mercedes/i },

  // === VAG (VW / Audi / Škoda / Seat / Cupra) ===
  { pattern: /\b1\.9\s*sdi\b/i, fuel: "Dizel", kw: 50, cc: 1896 },
  { pattern: /\b1\.9\s*tdi\b/i, fuel: "Dizel", kw: 77, cc: 1896 },
  { pattern: /\b1\.4\s*tdi\b/i, fuel: "Dizel", kw: 66, cc: 1422 },
  { pattern: /\b1\.6\s*tdi\b/i, fuel: "Dizel", kw: 85, cc: 1598 },
  { pattern: /\b(2\.0\s*tdi|30\s*tdi|35\s*tdi)\b/i, fuel: "Dizel", kw: 110, cc: 1968 },
  { pattern: /\b(40\s*tdi|gtd|rs\s*2\.0\s*tdi)\b/i, fuel: "Dizel", kw: 147, cc: 1968, gear: "Automatski" },
  { pattern: /\b2\.0\s*bitdi\b/i, fuel: "Dizel", kw: 176, cc: 1968, drive: "4×4", gear: "Automatski" },
  { pattern: /\b(2\.5\s*tdi|2\.5\s*r5\s*tdi)\b/i, fuel: "Dizel", kw: 120, cc: 2461 },
  { pattern: /\b(2\.7\s*tdi)\b/i, fuel: "Dizel", kw: 140, cc: 2698 },
  { pattern: /\b(3\.0\s*v6\s*tdi|3\.0\s*tdi|45\s*tdi|50\s*tdi)\b/i, fuel: "Dizel", kw: 210, cc: 2967, drive: "4×4", gear: "Automatski" },
  { pattern: /\b1\.0\s*mpi\b/i, fuel: "Benzin", kw: 59, cc: 999 },
  { pattern: /\b(1\.0\s*tsi|25\s*tfsi|30\s*tfsi)\b/i, fuel: "Benzin", kw: 81, cc: 999 },
  { pattern: /\b1\.2\s*tsi\b/i, fuel: "Benzin", kw: 77, cc: 1197 },
  { pattern: /\b1\.4\s*tsi\b/i, fuel: "Benzin", kw: 103, cc: 1395 },
  { pattern: /\b(1\.5\s*tsi|1\.5\s*etsi|35\s*tfsi)\b/i, fuel: "Benzin", kw: 110, cc: 1498 },
  { pattern: /\b1\.8\s*t(fsi)?\b/i, fuel: "Benzin", kw: 118, cc: 1781 },
  { pattern: /\b(2\.0\s*tsi|40\s*tfsi)\b/i, fuel: "Benzin", kw: 140, cc: 1984, gear: "Automatski" },
  { pattern: /\b(gti|rs\s*2\.0\s*tsi|45\s*tfsi|2\.0\s*tsi\s*vz)\b/i, fuel: "Benzin", kw: 180, cc: 1984, gear: "Automatski" },
  { pattern: /\b(r$|golf r|s3|vz5|2\.5\s*tsi)\b/i, fuel: "Benzin", kw: 235, cc: 1984, drive: "4×4", gear: "Automatski" },

  // === French / Dacia / Nissan ===
  { pattern: /\b0\.9\s*tce\b/i, fuel: "Benzin", kw: 66, cc: 898 },
  { pattern: /\b(1\.0\s*tce|tce\s*90|tce\s*110)\b/i, fuel: "Benzin", kw: 74, cc: 999 },
  { pattern: /\beco-g\s*100\b/i, fuel: "LPG", kw: 74, cc: 999 },
  { pattern: /\b1\.2\s*tce\b/i, fuel: "Benzin", kw: 88, cc: 1197 },
  { pattern: /\b(1\.3\s*tce|1\.3\s*dig-t|tce\s*130|tce\s*140|tce\s*160)\b/i, fuel: "Benzin", kw: 103, cc: 1332 },
  { pattern: /\b1\.5\s*dci\b/i, fuel: "Dizel", kw: 81, cc: 1461 },
  { pattern: /\b1\.6\s*dci\b/i, fuel: "Dizel", kw: 96, cc: 1598 },
  { pattern: /\b(2\.0\s*dci|2\.0\s*blue\s*dci)\b/i, fuel: "Dizel", kw: 118, cc: 1995 },
  { pattern: /\b(1\.2\s*puretech|puretech\s*110|puretech\s*130)\b/i, fuel: "Benzin", kw: 96, cc: 1199 },
  { pattern: /\b(1\.5\s*bluehdi|bluehdi\s*110|bluehdi\s*130|1\.5\s*diesel)\b/i, fuel: "Dizel", kw: 96, cc: 1499 },
  { pattern: /\b1\.6\s*(hdi|bluehdi)\b/i, fuel: "Dizel", kw: 85, cc: 1560 },
  { pattern: /\b2\.0\s*(hdi|bluehdi)\b/i, fuel: "Dizel", kw: 110, cc: 1997 },

  // === Opel ===
  { pattern: /\b1\.3\s*cdti\b/i, fuel: "Dizel", kw: 66, cc: 1248 },
  { pattern: /\b1\.6\s*cdti\b/i, fuel: "Dizel", kw: 100, cc: 1598 },
  { pattern: /\b1\.7\s*(cdti|dti)\b/i, fuel: "Dizel", kw: 81, cc: 1686 },
  { pattern: /\b2\.0\s*cdti\b/i, fuel: "Dizel", kw: 120, cc: 1956 },

  // === Ford ===
  { pattern: /\b1\.0\s*ecoboost\b/i, fuel: "Benzin", kw: 92, cc: 999 },
  { pattern: /\b1\.5\s*ecoboost\b/i, fuel: "Benzin", kw: 110, cc: 1498 },
  { pattern: /\b1\.4\s*tdci\b/i, fuel: "Dizel", kw: 50, cc: 1399 },
  { pattern: /\b1\.5\s*(tdci|ecoblue)\b/i, fuel: "Dizel", kw: 88, cc: 1499 },
  { pattern: /\b1\.6\s*tdci\b/i, fuel: "Dizel", kw: 85, cc: 1560 },
  { pattern: /\b2\.0\s*(tdci|ecoblue)\b/i, fuel: "Dizel", kw: 110, cc: 1997 },

  // === Fiat / Alfa Romeo ===
  { pattern: /\b1\.2\s*fire\b/i, fuel: "Benzin", kw: 51, cc: 1242 },
  { pattern: /\b1\.4\s*fire\b/i, fuel: "Benzin", kw: 70, cc: 1368 },
  { pattern: /\b0\.9\s*twinair\b/i, fuel: "Benzin", kw: 63, cc: 875 },
  { pattern: /\b1\.3\s*(multijet|jtdm)\b/i, fuel: "Dizel", kw: 66, cc: 1248 },
  { pattern: /\b1\.6\s*(multijet|jtdm)\b/i, fuel: "Dizel", kw: 88, cc: 1598 },
  { pattern: /\b1\.9\s*(jtd|jtdm)\b/i, fuel: "Dizel", kw: 88, cc: 1910 },
  { pattern: /\b2\.0\s*(jtdm|multijet)\b/i, fuel: "Dizel", kw: 125, cc: 1956 },
  { pattern: /\b2\.2\s*diesel\b/i, fuel: "Dizel", kw: 140, cc: 2143, makes: /Alfa Romeo/i },

  // === Japanese / Korean / Volvo ===
  { pattern: /\b2\.0\s*skyactiv-g\b/i, fuel: "Benzin", kw: 110, cc: 1998 },
  { pattern: /\b2\.2\s*skyactiv-d\b/i, fuel: "Dizel", kw: 129, cc: 2191 },
  { pattern: /\b2\.2\s*(i-ctdi|i-dtec)\b/i, fuel: "Dizel", kw: 110, cc: 2199 },
  { pattern: /\b1\.6\s*i-dtec\b/i, fuel: "Dizel", kw: 88, cc: 1597 },
  { pattern: /\b1\.6\s*crdi\b/i, fuel: "Dizel", kw: 85, cc: 1598 },
  { pattern: /\b2\.2\s*crdi\b/i, fuel: "Dizel", kw: 147, cc: 2199, gear: "Automatski" },
  { pattern: /\b1\.0\s*t-gdi\b/i, fuel: "Benzin", kw: 88, cc: 998 },
  { pattern: /\b1\.5\s*t-gdi\b/i, fuel: "Benzin", kw: 118, cc: 1482 },
  { pattern: /\b1\.6\s*t-gdi\b/i, fuel: "Benzin", kw: 132, cc: 1598 },
  { pattern: /\b(1\.0\s*vvt-i)\b/i, fuel: "Benzin", kw: 53, cc: 998 },
  { pattern: /\b(1\.4\s*d-4d)\b/i, fuel: "Dizel", kw: 66, cc: 1364 },
  { pattern: /\b(2\.0\s*d-4d)\b/i, fuel: "Dizel", kw: 93, cc: 1998 },
  { pattern: /\b(d2)\b/i, fuel: "Dizel", kw: 88, cc: 1969, makes: /Volvo/i },
  { pattern: /\b(d3)\b/i, fuel: "Dizel", kw: 110, cc: 1969, makes: /Volvo/i },
  { pattern: /\b(d4)\b/i, fuel: "Dizel", kw: 140, cc: 1969, makes: /Volvo/i },
  { pattern: /\b(d5)\b/i, fuel: "Dizel", kw: 173, cc: 1969, drive: "4×4", gear: "Automatski", makes: /Volvo/i },
  { pattern: /\b(b4)\b/i, fuel: "Dizel", kw: 145, cc: 1969, gear: "Automatski", makes: /Volvo/i },
  { pattern: /\b(b5)\b/i, fuel: "Benzin", kw: 184, cc: 1969, drive: "4×4", gear: "Automatski", makes: /Volvo/i },

  // === Eastern European Classics ===
  { pattern: /\b(45|750)\b/i, fuel: "Benzin", kw: 33, cc: 903, gear: "Ručni", makes: /Zastava/i },
  { pattern: /\b(55|1\.1)\b/i, fuel: "Benzin", kw: 40, cc: 1116, gear: "Ručni", makes: /Zastava/i },
  { pattern: /\b(60|65|1\.3)\b/i, fuel: "Benzin", kw: 48, cc: 1299, gear: "Ručni", makes: /Zastava/i },
];

const EXACT_CC_BY_LITERS: Readonly<Record<string, number>> = {
  "0.6": 599,
  "0.7": 698,
  "0.8": 796,
  "0.9": 898,
  "1.0": 999,
  "1.1": 1124,
  "1.2": 1197,
  "1.25": 1242,
  "1.3": 1299,
  "1.33": 1329,
  "1.4": 1395,
  "1.5": 1498,
  "1.6": 1598,
  "1.7": 1686,
  "1.8": 1796,
  "1.9": 1896,
  "2.0": 1995,
  "2.1": 2143,
  "2.2": 2198,
  "2.3": 2299,
  "2.4": 2387,
  "2.5": 2494,
  "2.7": 2698,
  "2.8": 2793,
  "3.0": 2993,
  "3.2": 3189,
  "3.3": 3283,
  "3.5": 3498,
  "3.6": 3597,
  "3.7": 3726,
  "4.0": 3996,
  "4.2": 4163,
  "4.4": 4395,
  "4.6": 4601,
  "4.7": 4691,
  "5.0": 4999,
  "5.2": 5204,
  "5.3": 5328,
  "5.7": 5654,
  "6.0": 5998,
  "6.2": 6162,
  "6.4": 6417,
  "6.5": 6498,
  "6.7": 6690,
  "6.75": 6749,
};

export function toCatalogFuel(fuel: string): CatalogFuel {
  const f = fuel.toLowerCase();
  if (f.includes("struj") || f.includes("elektr") || f === "ev") return "Struja";
  if (f.includes("plug") || f === "phev") return "Plug-in hibrid";
  if (f.includes("hibrid") || f.includes("hybrid")) return "Hibrid";
  if (f.includes("dizel") || f.includes("diesel")) return "Dizel";
  return "Benzin";
}

function extractYear(year?: number, date?: string): number {
  if (year && year >= 1970 && year <= 2030) return year;
  if (date && /^\d{4}/.test(date)) {
    const parsed = Number(date.slice(0, 4));
    if (parsed >= 1970 && parsed <= 2030) return parsed;
  }
  return new Date().getFullYear() - 5;
}

export function normalizeSpecFuel(fuel?: string, textHint = ""): { fuel: SpecFuel; isPlugIn: boolean } {
  const f = (fuel ?? "").toLowerCase();
  const t = textHint.toLowerCase();
  if (f.includes("struj") || f.includes("elektr") || f === "ev") {
    return { fuel: "Električni", isPlugIn: false };
  }
  if (
    f.includes("plug") ||
    f.includes("phev") ||
    (f.includes("hibrid") && /\b(phev|plug-in|gte|e-hybrid|ehybrid|recharge|tfsi e|330e|530e|750e|300e|300de|250e|580e|4xe|dm-i|shs|em-i|45e|50e)\b/i.test(t))
  ) {
    return { fuel: "Plug-in hibrid", isPlugIn: true };
  }
  if (f.includes("hibrid") || f.includes("hybrid")) return { fuel: "Hibrid", isPlugIn: false };
  if (f.includes("lpg") || f.includes("plin") || f.includes("eco-g")) return { fuel: "LPG", isPlugIn: false };
  if (f.includes("dizel") || f.includes("diesel")) return { fuel: "Dizel", isPlugIn: false };
  if (f.includes("benzin") || f.includes("petrol")) return { fuel: "Benzin", isPlugIn: false };
  return { fuel: "Benzin", isPlugIn: false };
}

export function calculateCo2(params: {
  fuel: string;
  kw: number;
  cc?: number;
  year?: number;
  date?: string;
  gear?: string;
  drive?: string;
  bodyType?: string;
  variant?: string;
  title?: string;
}): number {
  const { fuel, isPlugIn } = normalizeSpecFuel(params.fuel, `${params.variant ?? ""} ${params.title ?? ""}`);
  if (fuel === "Električni") return 0;

  const kw = Math.max(25, Math.min(1500, Number.isFinite(params.kw) && params.kw > 0 ? params.kw : 95));
  const cc = Math.max(0, Number.isFinite(params.cc) ? Number(params.cc) : 0);
  const year = extractYear(params.year, params.date);
  const isAwd = /4×4|4x4|awd|4wd|quattro|xdrive|4matic|4motion|all4|allgrip/i.test(
    `${params.drive ?? ""} ${params.variant ?? ""}`,
  );
  const isAuto = /automat/i.test(params.gear ?? "");
  const isHeavyBody = /suv-large|suv|mpv|kombi|dostav|pick-up|pickup|van|monovolumen/i.test(
    `${params.bodyType ?? ""} ${params.title ?? ""}`,
  );

  if (fuel === "Plug-in hibrid" || isPlugIn) {
    const raw = 24 + (kw - 110) * 0.14 + (isAwd ? 5 : 0) + (isHeavyBody ? 4 : 0);
    return Math.round(Math.max(22, Math.min(49, raw)));
  }

  if (fuel === "Hibrid") {
    const raw = 88 + (kw - 70) * 0.24 + (isAwd ? 7 : 0) + (isHeavyBody ? 6 : 0);
    return Math.round(Math.max(88, Math.min(128, raw)));
  }

  if (fuel === "Dizel") {
    // Era emission profile: Euro 3/4/5/6 NEDC vs WLTP
    let eraOffset = 0;
    if (year <= 1999) eraOffset = 34;
    else if (year <= 2005) eraOffset = 26;
    else if (year <= 2010) eraOffset = 14;
    else if (year <= 2014) eraOffset = 2;
    else if (year <= 2018) eraOffset = -4;
    else if (year <= 2020) eraOffset = 8; // WLTP transition
    else eraOffset = 0;

    const ccTerm = cc > 0 ? (cc - 1600) * 0.012 : 0;
    const awdBonus = isAwd ? 8 : 0;
    const oldAutoBonus = isAuto && year < 2016 ? 4 : 0;
    const bodyBonus = isHeavyBody ? 10 : 0;
    const raw = 76 + kw * 0.3 + ccTerm + eraOffset + awdBonus + oldAutoBonus + bodyBonus;
    return Math.round(Math.max(88, Math.min(340, raw)));
  }

  // Benzin / LPG
  let eraOffset = 2;
  if (year <= 1999) eraOffset = 40;
  else if (year <= 2005) eraOffset = 32;
  else if (year <= 2010) eraOffset = 18;
  else if (year <= 2014) eraOffset = 4;
  else if (year <= 2018) eraOffset = -2;
  else if (year <= 2020) eraOffset = 10;

  const ccTerm = cc > 0 ? (cc - 1400) * 0.014 : 0;
  const awdBonus = isAwd ? 10 : 0;
  const oldAutoBonus = isAuto && year < 2016 ? 4 : 0;
  const bodyBonus = isHeavyBody ? 10 : 0;
  let raw = 86 + kw * 0.33 + ccTerm + eraOffset + awdBonus + oldAutoBonus + bodyBonus;
  if (fuel === "LPG") raw *= 0.9;
  return Math.round(Math.max(92, Math.min(410, raw)));
}

function inferFuelFromString(text: string, fallbackFuel?: string): SpecFuel {
  const t = text.toLowerCase();
  if (/\b(electric|elektri|struj|ev\d*|kwh|e-208|ë-c3|ë-c4|e-2008|e-3008|e-5008|e-rifter|e-partner|e-berlingo|e-doblo|e-up|eqa|eqb|eqc|eqe|eqs|taycan|id\.3|id\.4|id\.5|id\.7|id\. buzz|enyaq|elroq|born|tavascan|ioniq 5|ioniq 6|ev3|ev6|ev9|model 3|model y|model s|model x|cybertruck|atto|dolphin|seal|sealion|ex30|ex90|leaf|ariya|zoe|spring|solterra|nevera|spectre)\b/i.test(t)) {
    return "Električni";
  }
  if (/\b(phev|plug-in|gte|e-hybrid|ehybrid|recharge|tfsi e|330e|530e|750e|225e|250e|300e|300de|580e|4xe|dm-i|shs|em-i|reev|450h\+|45e|50e|e-tense)\b/i.test(t)) {
    return "Plug-in hibrid";
  }
  if (/\b(hybrid|hibrid|e:hev|e-hev|fhev|mhev|e-tech|e-power|e-skyactiv x|e-boxer|ibrida|200h|250h|300h|350h|400h|450h|500h)\b/i.test(t)) {
    return "Hibrid";
  }
  if (/\b(lpg|eco-g|plin|bifuel|bi-fuel|cng)\b/i.test(t)) {
    return "LPG";
  }
  if (
    /\b(tdi|dci|hdi|bluehdi|jtd|jtdm|cdti|cdi|crdi|tdci|ecoblue|d-4d|di-d|sdi|tds|dti|ddis|skyactiv-d|i-ctdi|i-dtec|multijet|diesel|dizel|d\b|\d{3}d\b|d[2-5]\b|sdv\d*|tdv\d*|td4|td5|crd|ecodiesel|cummins|duramax|mhawk|xdi|dicor|mjet|idt|cdt)\b/i.test(
      t,
    )
  ) {
    return "Dizel";
  }
  if (fallbackFuel) {
    return normalizeSpecFuel(fallbackFuel, text).fuel;
  }
  return "Benzin";
}

function parseDisplacementCc(text: string, fuel: SpecFuel): number | undefined {
  if (fuel === "Električni") return 0;
  // Match patterns like "2.2", "1,5", "1.25", "6.75"
  const literMatch = text.match(/(?:^|[^\d.])([0-7][.,]\d{1,2})(?=\s|[a-zA-Z]|$)/);
  if (literMatch) {
    const normalized = literMatch[1].replace(",", ".");
    if (Object.hasOwn(EXACT_CC_BY_LITERS, normalized)) {
      return EXACT_CC_BY_LITERS[normalized];
    }
    const liters = Number(normalized);
    if (liters >= 0.5 && liters <= 8.5) return Math.round(liters * 990);
  }
  // Match explicit ccm e.g. "1995 ccm" or "1598 cm3"
  const ccmMatch = text.match(/\b(\d{3,4})\s*(?:ccm|cm3|cm³)\b/i);
  if (ccmMatch) return Number(ccmMatch[1]);
  // Match classic engine codes like "1750 TBi"
  if (/\b1750\b/.test(text)) return 1742;
  return undefined;
}

function inferKwFromDisplacementAndText(cc: number, fuel: SpecFuel, text: string, year: number): number {
  if (fuel === "Električni") {
    const kwhMatch = text.match(/(\d{2,3}(?:[.,]\d)?)\s*kwh/i);
    if (kwhMatch) {
      const kwh = Number(kwhMatch[1].replace(",", "."));
      if (kwh <= 45) return 85;
      if (kwh <= 62) return 150;
      if (kwh <= 82) return 210;
      return 280;
    }
    if (/\b(awd|4matic|quattro|xdrive|dual|performance|gt\b|brabus|xpower)\b/i.test(text)) return 260;
    return 150;
  }

  const liters = Math.max(0.7, (cc || 1598) / 1000);
  const isTurbo =
    fuel === "Dizel"
      ? !/\b(sdi|\b1\.9\s*d\b|\b1\.7\s*d\b|\b1\.5\s*d\b|\b2\.4\s*d\b)\b/i.test(text)
      : /\b(t\b|turbo|tsi|tfsi|t-gdi|t-jet|ecoboost|tce|puretech|boosterjet|firefly|tgdi|multiair|tbi|kompressor|supercharg|biturbo|twin)\b/i.test(
          text,
        );
  const isPerf = /\b(gti|gtd|rs\b|amg|m\d{2,3}|srt|hellcat|hemi|quadrifoglio|type r|cupra|vz|sti|wrx|v6|v8|v10|v12|brabus|svr)\b/i.test(
    text,
  );

  let kwPerLiter = 48;
  if (fuel === "Dizel") {
    kwPerLiter = isTurbo ? (year >= 2014 ? 66 : year >= 2005 ? 58 : 48) : 34;
  } else if (fuel === "Plug-in hibrid") {
    kwPerLiter = 112;
  } else if (fuel === "Hibrid") {
    kwPerLiter = 74;
  } else {
    kwPerLiter = isTurbo ? (year >= 2014 ? 78 : 70) : year >= 2005 ? 52 : 44;
  }

  if (isPerf) kwPerLiter *= 1.32;
  const raw = liters * kwPerLiter;
  return Math.round(Math.max(33, Math.min(550, raw)));
}

function parseExplicitKw(text: string): number | undefined {
  const kwMatch = text.match(/\b(\d{2,4})\s*kw\b/i);
  if (kwMatch) {
    const val = Number(kwMatch[1]);
    if (val >= 20 && val <= 1800) return val;
  }
  const ksMatch = text.match(/\b(\d{2,4})\s*(?:ks|ps|hp|ch)\b/i);
  if (ksMatch) {
    const val = ksToKw(Number(ksMatch[1]));
    if (val >= 20 && val <= 1800) return val;
  }
  return undefined;
}

export function inferBodyType(params: {
  make?: string;
  model?: string;
  generation?: string;
  variant?: string;
  title?: string;
}): ResolvedBodyType {
  const gen = (params.generation ?? "").trim().toUpperCase();
  const model = (params.model ?? "").trim();
  const make = (params.make ?? "").trim();
  const combined = `${make} ${model} ${params.generation ?? ""} ${params.variant ?? ""} ${params.title ?? ""}`.toLowerCase();
  const detail = `${params.generation ?? ""} ${params.variant ?? ""} ${params.title ?? ""}`.toLowerCase();

  // 1. Explicit chassis / trim body-style overrides
  if (/^(e91|f31|g21|e61|f11|g31|g61|s202|s203|s204|s205|s206|s210|s211|s212|s213|s214|x117|x118|y1b|y1c)$/i.test(gen)) {
    return "Karavan";
  }
  if (/^(e88|e93|f23|f33|g23|f83|g83|a205|a236|r52|r57|f57|f67)$/i.test(gen)) {
    return "Cabrio / Roadster";
  }
  if (/^(e82|e92|f22|f32|g22|g42|f82|g82|c204|c205|c236)$/i.test(gen)) {
    return "Coupé";
  }
  if (/^(f45|f46|u06)$/i.test(gen)) {
    return "Monovolumen (MPV)";
  }
  if (/^(f34|f36|g26|f44|f74)$/i.test(gen)) {
    return gen === "f34" ? "Hatchback / Kompakt" : "Limuzina";
  }
  if (/^(x294|x296|xab)$/i.test(gen)) {
    return "SUV / Terenac";
  }
  if (/^(v295|v297|y1a)$/i.test(gen)) {
    return "Limuzina";
  }
  if (/\b(touring|avant|variant|sportwagon|shooting brake|sports tourer|sport tourer|alltrack|combi|karavan|\bsw\b)\b/i.test(detail)) {
    return "Karavan";
  }
  if (/\b(cabrio|cabriolet|roadster|spider|spyder|targa)\b/i.test(detail)) {
    return "Cabrio / Roadster";
  }

  // 2. Model-level body classes
  if (/\b(hilux|ranger|amarok|navara|l200|d-max|musso|gladiator|cybertruck|quartermaster|t90|goa|xenon|sierra|pik-up|pick-up)\b|\bram\s*(1500|2500|3500)\b/i.test(combined)) {
    return "Pick-up";
  }
  if (/\b(sprinter|ducato|daily|crafter|master|boxer|jumper|transporter|trafic|vivaro|movano|vito|scudo|expert|traveller|jumpy|transit|edeliver|proace|citan|kangoo|partner|doblo|doblò|combo|dokker|nv200|townstar|caddy)\b/i.test(combined)) {
    return "Kombi / Dostavno";
  }
  if (/\b(touran|sharan|multivan|caravelle|california|v-klasa|b-klasa|zafira|meriva|scénic|scenic|modus|rifter|picasso|s-max|galaxy|c-max|b-max|alhambra|altea|jogger|lodgy|carens|venga|ix20|mazda5|fr-v|orlando|voyager|musa|phedra|u-tour|euniq|pregio|previa|multipla|ulysse|806|807|c8|roomster|grandis|space wagon|matrix|trajet)\b/i.test(combined)) {
    return "Monovolumen (MPV)";
  }
  if (/\b(cabrio|roadster|spider|spyder|boxster|z3|z4|slk|slc|\bsl\b|mx-5|s2000|cascada|eos|124 spider|wraith|dawn)\b/i.test(combined)) {
    return "Cabrio / Roadster";
  }
  if (/\b(911|cayman|a110|gt86|gr86|supra|brz|350z|370z|gt-r|\btt\b|\br8\b|rcz|scirocco|corrado|calibra|tigra|celica|mr2|prelude|cr-z|f-type|vantage|db9|dbs|db11|db12|continental gt|granturismo|mc20|360|f430|458|488|\bf8\b|296|sf90|roma|huracán|huracan|aventador|revuelto|570s|720s|artura|camaro|challenger|mustang(?!\s*mach-e)|corvette|crossfire|cyberster|944|968|clk|serija 4|serija 8|elise|exige|evora|emira|coupe|coupé|probe|cougar|brera|\bgt\b)\b/i.test(combined)) {
    return "Coupé";
  }
  if (/\b(x1|x2|x3|x4|x5|x6|x7|xm|ix\b|ix1|ix2|ix3|q2|q3|q4|q5|q6|q7|q8|gla|glb|glk|glc|gle|gls|g-klasa|eqa|eqb|eqc|tiguan|t-roc|t-cross|taigo|tayron|touareg|id\.4|id\.5|id\. buzz|karoq|kamiq|kodiaq|yeti|enyaq|elroq|arona|ateca|tarraco|formentor|tavascan|terramar|mokka|crossland|grandland|frontera|antara|macan|cayenne|captur|kadjar|austral|arkana|symbioz|rafale|koleos|2008|3008|5008|4007|4008|c3 aircross|c4 cactus|c5 aircross|c-crosser|ds 3|ds 7|duster|bigster|500x|600|freemont|sedici|stelvio|tonale|junior|grecale|levante|purosangue|urus|yaris cross|corolla cross|c-hr|rav4|highlander|land cruiser|urban cruiser|bz4x|cx-3|cx-30|mx-30|cx-5|cx-60|cx-80|cx-7|hr-v|zr-v|cr-v|juke|qashqai|x-trail|murano|pathfinder|patrol|terrano|ariya|ignis|sx4|s-cross|vitara|grand vitara|jimny|across|asx|eclipse cross|outlander|pajero|outback|forester|xv|crosstrek|solterra|ux|lbx|nx|rx|rz|qx30|fx|qx70|ex|qx50|terios|feroza|trooper|tucson|kona|bayon|santa fe|terracan|ioniq 5|stonic|xceed|soul|niro|sportage|sorento|ev3|ev6|ev9|tivoli|korando|torres|actyon|kyron|rexton|gv60|gv70|gv80|xc40|xc60|xc90|ex30|ex90|c40|ec40|defender|freelander|discovery|range rover|e-pace|f-pace|i-pace|dbx|bentayga|cullinan|countryman|paceman|aceman|#1|#3|#5|ecosport|kuga|edge|explorer|mach-e|avenger|renegade|compass|patriot|cherokee|grand cherokee|wrangler|model y|model x|trax|captiva|tahoe|journey|nitro|durango|xt4|xt5|escalade|lyriq|hummer|yukon|atto|seal u|sealion|tang|coolray|cityray|starray|atlas pro|ex5|omoda|jaecoo|t5 evo|friday|glory|fengon|mage|huge|lynk & co|el6|el7|el8|g6|g9|c10|b10|tiggo|free|courage|seres|7x|eletre|niva|safari|xuv500|kuv100|thar)\b/i.test(combined)) {
    return "SUV / Terenac";
  }
  if (/ford.*puma/i.test(combined)) {
    return /199\d|200[0-2]|^i$/i.test(detail) ? "Coupé" : "SUV / Terenac";
  }
  if (/\b(golf|polo|up!|lupo|fox|id\.3|serija 1|i3|a1|a2|a3|a-klasa|corsa|astra|adam|agila|karl|fabia|scala|citigo|ibiza|leon|mii|born|hatch|fortwo|forfour|twingo|clio|mégane|megane|zoe|5 e-tech|106|107|108|206|207|208|306|307|308|ax\b|zx\b|saxo|c1|c2|c3|c4|c-zero|ds 4|sandero|spring|a290|panda|grande panda|uno|seicento|cinquecento|punto|bravo|stilo|tipo|500\b|500e|595|695|145|146|147|mito|giulietta|ypsilon|delta|starlet|iq|aygo|yaris|corolla|auris|mazda2|mazda3|323|jazz|civic|honda e|micra|note|pulsar|almera|pixo|tiida|leaf|alto|splash|swift|baleno|liana|wagon r\+|space star|colt|justy|impreza|ct\b|q30|cuore|sirion|materia|atos|i10|getz|i20|i30|veloster|picanto|rio|ceed|proceed|sephia|shuma|v40|c30|25\s*\/\s*200|mg3|mg4|mg5|fiesta|ka\b|focus|fusion|spark|aveo|cruze|caliber|dolphin|t03|samara|yugo|koral|skala|750|indica)\b/i.test(combined)) {
    return "Hatchback / Kompakt";
  }
  return "Limuzina";
}

export function resolveVehicleSpecs(params: SpecResolverInput): ResolvedVehicleSpecs {
  const text = `${params.make ?? ""} ${params.model ?? ""} ${params.generation ?? ""} ${params.variant ?? ""} ${params.title ?? ""}`.trim();
  const variantOrModel = `${params.model ?? ""} ${params.variant ?? ""}`.trim();
  const year = extractYear(params.year, params.date);
  const bodyType = inferBodyType(params);

  // 1. Check rich catalog presets first (matching variant/model against preset)
  let matched: EnginePreset | undefined;
  for (const preset of ENGINE_PRESETS) {
    if (preset.makes && params.make && !preset.makes.test(params.make)) continue;
    if (preset.pattern.test(params.variant ?? "") || preset.pattern.test(variantOrModel)) {
      matched = preset;
      break;
    }
  }

  const parsedFuel = matched?.fuel ?? inferFuelFromString(text, params.fuel);
  const isPlugIn = parsedFuel === "Plug-in hibrid";
  const parsedCc =
    parsedFuel === "Električni"
      ? 0
      : matched?.cc ??
        parseDisplacementCc(params.variant || variantOrModel || text, parsedFuel) ??
        (params.cc && params.cc > 0 ? params.cc : parsedFuel === "Dizel" ? 1968 : 1498);

  const explicitKw = parseExplicitKw(params.variant || text);
  const inferredKw =
    explicitKw ??
    matched?.kw ??
    (params.kw && params.kw > 0 ? params.kw : inferKwFromDisplacementAndText(parsedCc, parsedFuel, text, year));

  const awdHint = /\b(4x4|4×4|awd|4wd|quattro|xdrive|4matic|4motion|4drive|all4|allgrip|q4|e-4orce|awd-i|symmetrical|4xe)\b/i.test(
    text,
  );
  const rwdHint = /BMW|Mercedes-Benz|Porsche|Ferrari|Lamborghini|Aston Martin|Maserati|Lexus|Jaguar|Corvette/i.test(
    params.make ?? "",
  );
  const drive: ResolvedVehicleSpecs["drive"] =
    matched?.drive ?? (awdHint ? "4×4" : params.drive === "4×4" || params.drive === "Stražnji" || params.drive === "Prednji" ? params.drive : rwdHint ? "Stražnji" : "Prednji");

  const gear: ResolvedVehicleSpecs["gear"] =
    matched?.gear ??
    (parsedFuel === "Električni" || parsedFuel === "Hibrid" || parsedFuel === "Plug-in hibrid"
      ? "Automatski"
      : params.gear === "Automatski" || params.gear === "Ručni"
      ? params.gear
      : undefined);

  const co2 = calculateCo2({
    fuel: parsedFuel,
    kw: inferredKw,
    cc: parsedCc,
    year,
    date: params.date,
    gear: gear ?? params.gear,
    drive,
    bodyType: params.bodyType,
    variant: params.variant,
    title: params.title,
  });

  return {
    fuel: parsedFuel,
    catalogFuel: toCatalogFuel(parsedFuel),
    bodyType,
    kw: inferredKw,
    ks: kwToKs(inferredKw),
    cc: parsedCc,
    co2,
    drive,
    gear,
    isPlugIn,
    matchedPreset: matched ? matched.pattern.source : undefined,
  };
}
