import { CAR_CATALOG, chassisFromTitle, clampYearToRange, generationRange, modelFor } from "../data/car-catalog";
import type { Vehicle } from "../../app/catalog";
import { vehicleMakeOptions } from "../../app/make-equipment";
import { estimateTax } from "../../app/tax";
import { calculateCo2 } from "./spec-resolver";

export type PriceRatingTier = {
  bars: 1 | 2 | 3 | 4 | 5;
  label: "Top prilika" | "Tržišna cijena" | "Viši cjenovni rang" | "";
  type: "good" | "fair" | "high";
  rank: 0 | 1 | 2 | 3;
  /** Above +18% over median the public badge is hidden; only the seller sees a private advisory. */
  hidden?: boolean;
};

export type ValuationFactor = {
  id: string;
  label: string;
  impactEur: number;
};

/** Seller-checkable value proofs (Step 3): each raises the live fair valuation by a fixed amount. */
export const VALUE_PROOFS: readonly { id: string; label: string; bonusEur: number }[] = [
  { id: "service-major", label: "Upravo napravljen veliki servis", bonusEur: 450 },
  { id: "tyres-new", label: "Novi set ljetnih/zimskih guma", bonusEur: 400 },
  { id: "warranty-12m", label: "Pisano jamstvo 12 mjeseci", bonusEur: 600 },
  { id: "kasko-reg", label: "Full kasko / Registracija 12 mj.", bonusEur: 500 },
];

export type AuditCategory =
  | "Vozilo i starost"
  | "Kilometraža"
  | "Pogon i snaga"
  | "Oprema"
  | "Povijest, porez i tržište";

export type AuditFactor = {
  id: string;
  category: AuditCategory;
  parameterLabel: string;
  userValue: string;
  benchmarkValue: string;
  impactEur: number;
  explanation: string;
};

export type MarketValuationInput = {
  make: string;
  model: string;
  generation?: string;
  variant?: string;
  title?: string;
  trim?: string;
  year?: number;
  date?: string;
  km: number;
  kw: number;
  co2?: number;
  fuel: string;
  gear: string;
  drive?: string;
  bodyType?: string;
  registrationUntil?: string;
  city?: string;
  county?: string;
  askingPrice?: number;
  equipment?: string[] | Record<string, string[]>;
  makeEquipment?: string[];
  catalogEquipment?: string[];
  flags?: string[];
  history?: string[];
  dealer?: boolean;
  verified?: boolean;
  firstOwner?: boolean;
  serviceBook?: boolean;
  /** Checked Step 3 value proofs (ids from VALUE_PROOFS) that lift the live fair range. */
  valueProofs?: string[];
  referenceDate?: Date;
};

export type ValuationBreakdownRow = {
  id: string;
  label: string;
  detail?: string;
  amountEur: number;
  isTotal?: boolean;
};

export type MarketValuationResult = {
  excellentMax: number;
  goodMax: number;
  fairMin: number;
  fairMax: number;
  highMax: number;
  medianMarketPrice: number;
  deltaEur: number;
  deltaPercent: number;
  rating: PriceRatingTier;
  factors: ValuationFactor[];
  auditFactors: AuditFactor[];
  baseModelValueEur: number;
  mileageImpactEur: number;
  equipmentValueEur: number;
  equipmentCount: number;
  historyBonusEur: number;
  sampleCount: number;
  breakdown: ValuationBreakdownRow[];
  ageYears: number;
  ageMonths: number;
  expectedKm: number;
  estimatedNewPriceHr: number;
  deEstimatedPriceEur: number;
  estimatedPpmvEur: number;
  estimatedImportTotalEur: number;
};

type Segment =
  | "city"
  | "compact"
  | "midsize"
  | "executive"
  | "luxury"
  | "suv-compact"
  | "suv-mid"
  | "suv-large"
  | "mpv"
  | "van"
  | "pickup"
  | "sports";

type ModelSpec = {
  baseNew: number;
  refKw: number;
  segment: Segment;
  retention?: number;
  generations?: Record<string, number>;
};

const SEGMENT_DEFAULTS: Record<Segment, { baseNew: number; refKw: number; floor: number; rate1: number; rateMid: number; rateLate: number }> = {
  city: { baseNew: 19500, refKw: 66, floor: 950, rate1: 0.165, rateMid: 0.105, rateLate: 0.095 },
  compact: { baseNew: 27500, refKw: 96, floor: 1300, rate1: 0.17, rateMid: 0.105, rateLate: 0.095 },
  midsize: { baseNew: 39000, refKw: 120, floor: 1750, rate1: 0.18, rateMid: 0.112, rateLate: 0.098 },
  executive: { baseNew: 55000, refKw: 150, floor: 2200, rate1: 0.195, rateMid: 0.118, rateLate: 0.10 },
  luxury: { baseNew: 94000, refKw: 220, floor: 3500, rate1: 0.215, rateMid: 0.135, rateLate: 0.115 },
  "suv-compact": { baseNew: 30500, refKw: 100, floor: 1900, rate1: 0.165, rateMid: 0.102, rateLate: 0.09 },
  "suv-mid": { baseNew: 44000, refKw: 135, floor: 2500, rate1: 0.17, rateMid: 0.104, rateLate: 0.092 },
  "suv-large": { baseNew: 74000, refKw: 200, floor: 3600, rate1: 0.19, rateMid: 0.118, rateLate: 0.102 },
  mpv: { baseNew: 31500, refKw: 105, floor: 1650, rate1: 0.175, rateMid: 0.11, rateLate: 0.095 },
  van: { baseNew: 36500, refKw: 105, floor: 2400, rate1: 0.15, rateMid: 0.095, rateLate: 0.082 },
  pickup: { baseNew: 46000, refKw: 140, floor: 3600, rate1: 0.14, rateMid: 0.088, rateLate: 0.075 },
  sports: { baseNew: 82000, refKw: 220, floor: 4800, rate1: 0.145, rateMid: 0.09, rateLate: 0.075 },
};

const BRAND_PROFILES: Record<string, { tier: number; retention: number }> = {
  // German & VAG
  Porsche: { tier: 1.45, retention: 1.12 },
  Maybach: { tier: 2.6, retention: 1.06 },
  "Mercedes-Benz": { tier: 1.18, retention: 1.04 },
  BMW: { tier: 1.16, retention: 1.03 },
  Audi: { tier: 1.14, retention: 1.03 },
  Volkswagen: { tier: 1.0, retention: 1.06 },
  Cupra: { tier: 1.02, retention: 1.01 },
  Mini: { tier: 1.03, retention: 1.0 },
  "Škoda": { tier: 0.95, retention: 1.05 },
  Seat: { tier: 0.92, retention: 0.99 },
  Opel: { tier: 0.89, retention: 0.93 },
  Smart: { tier: 0.86, retention: 0.92 },

  // French
  Alpine: { tier: 1.25, retention: 1.08 },
  "DS Automobiles": { tier: 0.98, retention: 0.89 },
  Peugeot: { tier: 0.93, retention: 0.95 },
  Renault: { tier: 0.9, retention: 0.94 },
  "Citroën": { tier: 0.89, retention: 0.92 },
  Dacia: { tier: 0.78, retention: 1.03 },

  // Italian
  Ferrari: { tier: 2.8, retention: 1.18 },
  Lamborghini: { tier: 2.9, retention: 1.18 },
  Maserati: { tier: 1.45, retention: 0.88 },
  "Alfa Romeo": { tier: 1.0, retention: 0.92 },
  Abarth: { tier: 1.04, retention: 1.02 },
  Lancia: { tier: 0.88, retention: 0.9 },
  Fiat: { tier: 0.84, retention: 0.93 },
  Iveco: { tier: 0.96, retention: 0.98 },

  // Japanese
  Lexus: { tier: 1.15, retention: 1.03 },
  Infiniti: { tier: 1.05, retention: 0.9 },
  Toyota: { tier: 0.98, retention: 1.07 },
  Honda: { tier: 0.97, retention: 1.03 },
  Subaru: { tier: 0.97, retention: 0.98 },
  Mazda: { tier: 0.96, retention: 1.02 },
  Nissan: { tier: 0.92, retention: 0.95 },
  Isuzu: { tier: 0.94, retention: 1.02 },
  Mitsubishi: { tier: 0.91, retention: 0.95 },
  Suzuki: { tier: 0.88, retention: 1.02 },
  Daihatsu: { tier: 0.78, retention: 0.94 },

  // Korean
  Genesis: { tier: 1.12, retention: 0.95 },
  Hyundai: { tier: 0.92, retention: 0.99 },
  Kia: { tier: 0.92, retention: 0.99 },
  "SsangYong / KGM": { tier: 0.84, retention: 0.92 },
  Daewoo: { tier: 0.65, retention: 0.86 },

  // Swedish & British
  "Rolls-Royce": { tier: 3.2, retention: 1.08 },
  Bentley: { tier: 2.4, retention: 1.05 },
  "Aston Martin": { tier: 2.1, retention: 1.04 },
  McLaren: { tier: 2.6, retention: 1.1 },
  Lotus: { tier: 1.35, retention: 1.04 },
  "Land Rover": { tier: 1.24, retention: 0.98 },
  Ineos: { tier: 1.32, retention: 1.04 },
  Jaguar: { tier: 1.12, retention: 0.9 },
  Volvo: { tier: 1.1, retention: 0.99 },
  Saab: { tier: 0.88, retention: 0.94 },
  MG: { tier: 0.84, retention: 0.91 },
  Vauxhall: { tier: 0.85, retention: 0.91 },
  Rover: { tier: 0.72, retention: 0.88 },

  // American
  Corvette: { tier: 1.48, retention: 1.08 },
  Cadillac: { tier: 1.18, retention: 0.92 },
  RAM: { tier: 1.2, retention: 1.03 },
  GMC: { tier: 1.18, retention: 0.99 },
  Hummer: { tier: 1.25, retention: 1.02 },
  Tesla: { tier: 1.08, retention: 0.91 },
  Jeep: { tier: 1.02, retention: 0.96 },
  Dodge: { tier: 1.0, retention: 0.96 },
  Ford: { tier: 0.92, retention: 0.95 },
  Chrysler: { tier: 0.88, retention: 0.9 },
  Chevrolet: { tier: 0.82, retention: 0.92 },

  // New EV & Chinese
  Polestar: { tier: 1.08, retention: 0.91 },
  Nio: { tier: 1.06, retention: 0.9 },
  Zeekr: { tier: 1.04, retention: 0.91 },
  Voyah: { tier: 1.02, retention: 0.89 },
  Xpeng: { tier: 0.98, retention: 0.9 },
  "Lynk & Co": { tier: 0.95, retention: 0.93 },
  BYD: { tier: 0.88, retention: 0.91 },
  Jaecoo: { tier: 0.87, retention: 0.92 },
  Omoda: { tier: 0.85, retention: 0.91 },
  Geely: { tier: 0.85, retention: 0.91 },
  Chery: { tier: 0.84, retention: 0.9 },
  Forthing: { tier: 0.82, retention: 0.89 },
  Maxus: { tier: 0.85, retention: 0.91 },
  Seres: { tier: 0.82, retention: 0.89 },
  Dongfeng: { tier: 0.8, retention: 0.89 },
  Leapmotor: { tier: 0.79, retention: 0.9 },
  DFSK: { tier: 0.78, retention: 0.88 },

  // Eastern European & Other
  Rimac: { tier: 6.0, retention: 1.15 },
  Mahindra: { tier: 0.78, retention: 0.91 },
  Tata: { tier: 0.72, retention: 0.88 },
  Lada: { tier: 0.65, retention: 0.95 },
  "Zastava / Yugo": { tier: 0.45, retention: 0.92 },
};

const MODEL_SPECS: Record<string, Record<string, ModelSpec>> = {
  BMW: {
    "Serija 1": { baseNew: 30000, refKw: 105, segment: "compact", retention: 1.03, generations: { E81: 0.88, E82: 0.92, E87: 0.88, E88: 0.93, F20: 0.99, F21: 0.99, F40: 1.04, F70: 1.08 } },
    "Serija 2": { baseNew: 33000, refKw: 115, segment: "compact", retention: 1.01, generations: { F22: 1.03, F23: 1.05, F45: 0.93, F46: 0.94, F44: 1.0, G42: 1.08, U06: 1.02 } },
    "Serija 3": { baseNew: 35000, refKw: 135, segment: "midsize", retention: 1.04, generations: { E46: 0.96, E90: 0.96, E91: 0.97, E92: 1.03, E93: 1.05, F30: 0.99, F31: 1.0, F34: 0.97, G20: 1.04, G21: 1.05 } },
    "Serija 4": { baseNew: 42500, refKw: 140, segment: "midsize", retention: 1.04, generations: { F32: 1.0, F33: 1.03, F36: 1.01, G22: 1.07, G23: 1.08, G26: 1.06 } },
    "Serija 5": { baseNew: 49500, refKw: 145, segment: "executive", retention: 1.02, generations: { E60: 0.92, E61: 0.93, F10: 0.97, F11: 0.99, F07: 0.93, G30: 1.04, G31: 1.05, G60: 1.09, G61: 1.1 } },
    "Serija 7": { baseNew: 92000, refKw: 210, segment: "luxury", retention: 0.93, generations: { E65: 0.85, E66: 0.85, F01: 0.91, F02: 0.91, G11: 1.0, G12: 1.01, G70: 1.08 } },
    X1: { baseNew: 35000, refKw: 110, segment: "suv-compact", retention: 1.03, generations: { E84: 0.93, F48: 1.01, U11: 1.08 } },
    X2: { baseNew: 36000, refKw: 110, segment: "suv-compact", retention: 1.0, generations: { F39: 0.99, U10: 1.06 } },
    X3: { baseNew: 46500, refKw: 140, segment: "suv-mid", retention: 1.04, generations: { E83: 0.89, F25: 0.96, G01: 1.05, G45: 1.1 } },
    X4: { baseNew: 50500, refKw: 145, segment: "suv-mid", retention: 1.03, generations: { F26: 0.97, G02: 1.05 } },
    X5: { baseNew: 72000, refKw: 200, segment: "suv-large", retention: 1.02, generations: { E53: 0.88, E70: 0.93, F15: 0.99, G05: 1.06 } },
    X6: { baseNew: 77000, refKw: 210, segment: "suv-large", retention: 1.01, generations: { E71: 0.92, F16: 0.99, G06: 1.06 } },
  },
  Audi: {
    A1: { baseNew: 23500, refKw: 81, segment: "city", retention: 1.04, generations: { "8X": 0.96, GB: 1.04 } },
    A3: { baseNew: 29000, refKw: 105, segment: "compact", retention: 1.04, generations: { "8L": 0.86, "8P": 0.95, "8V": 1.01, "8Y": 1.06 } },
    A4: { baseNew: 36000, refKw: 125, segment: "midsize", retention: 1.03, generations: { B5: 0.85, B6: 0.89, B7: 0.92, B8: 0.98, B9: 1.03 } },
    A5: { baseNew: 41000, refKw: 140, segment: "midsize", retention: 1.04, generations: { "8T": 0.96, "8F": 0.98, F5: 1.04, B10: 1.09 } },
    A6: { baseNew: 52500, refKw: 165, segment: "executive", retention: 1.02, generations: { C5: 0.85, C6: 0.91, C7: 0.97, C8: 1.05, C9: 1.1 } },
    A7: { baseNew: 60000, refKw: 185, segment: "executive", retention: 1.01, generations: { "4G": 0.98, "4K": 1.05 } },
    Q2: { baseNew: 28500, refKw: 96, segment: "suv-compact", retention: 1.03, generations: { GA: 1.02 } },
    Q3: { baseNew: 36000, refKw: 110, segment: "suv-compact", retention: 1.05, generations: { "8U": 0.96, F3: 1.05, FJ: 1.09 } },
    Q5: { baseNew: 47000, refKw: 140, segment: "suv-mid", retention: 1.04, generations: { "8R": 0.95, FY: 1.05, GU: 1.09 } },
    Q7: { baseNew: 71000, refKw: 200, segment: "suv-large", retention: 1.01, generations: { "4L": 0.9, "4M": 1.04 } },
    "Q4 e-tron": { baseNew: 42000, refKw: 150, segment: "suv-compact", retention: 0.94, generations: { F4: 1.0 } },
  },
  Volkswagen: {
    Polo: { baseNew: 19500, refKw: 70, segment: "city", retention: 1.06, generations: { "9N": 0.88, "6R": 0.97, "6C": 0.99, AW: 1.05 } },
    Golf: { baseNew: 25200, refKw: 100, segment: "compact", retention: 1.07, generations: { "1K": 0.93, "5K": 0.97, "5G": 1.03, "5G facelift": 1.06, CD: 1.04, "CD facelift": 1.07 } },
    Passat: { baseNew: 34000, refKw: 115, segment: "midsize", retention: 1.05, generations: { B5: 0.87, B6: 0.91, B7: 0.96, B8: 1.03, B9: 1.08 } },
    Tiguan: { baseNew: 35500, refKw: 110, segment: "suv-mid", retention: 1.06, generations: { "5N": 0.95, AD: 1.04, BW: 1.05, CT: 1.09 } },
    "T-Roc": { baseNew: 26500, refKw: 96, segment: "suv-compact", retention: 1.05, generations: { A1: 1.03, II: 1.07 } },
    "T-Cross": { baseNew: 22000, refKw: 81, segment: "suv-compact", retention: 1.04, generations: { C1: 1.03 } },
    Arteon: { baseNew: 40000, refKw: 140, segment: "midsize", retention: 1.02, generations: { "3H": 1.04 } },
    Touran: { baseNew: 31000, refKw: 110, segment: "mpv", retention: 1.05, generations: { "1T": 0.93, "5T": 1.04 } },
    Touareg: { baseNew: 68000, refKw: 210, segment: "suv-large", retention: 1.0, generations: { "7L": 0.88, "7P": 0.96, CR: 1.05 } },
    "ID.3": { baseNew: 32500, refKw: 150, segment: "compact", retention: 0.88, generations: { E1: 0.98 } },
    "ID.4": { baseNew: 38000, refKw: 150, segment: "suv-mid", retention: 0.9, generations: { E2: 1.0 } },
    Caddy: { baseNew: 26500, refKw: 85, segment: "mpv", retention: 1.05, generations: { "2K": 0.95, SB: 1.05 } },
  },
  "Mercedes-Benz": {
    "A-klasa": { baseNew: 30000, refKw: 100, segment: "compact", retention: 1.03, generations: { W168: 0.78, W169: 0.85, W176: 0.98, W177: 1.05, V177: 1.05 } },
    "B-klasa": { baseNew: 30500, refKw: 100, segment: "mpv", retention: 0.98, generations: { W245: 0.85, W246: 0.95, W247: 1.03 } },
    "C-klasa": { baseNew: 39500, refKw: 135, segment: "midsize", retention: 1.04, generations: { W203: 0.86, S203: 0.86, W204: 0.96, S204: 0.97, C204: 0.99, W205: 1.02, S205: 1.03, W206: 1.08, S206: 1.08 } },
    "E-klasa": { baseNew: 52000, refKw: 145, segment: "executive", retention: 1.04, generations: { W211: 0.88, S211: 0.89, W212: 0.96, S212: 0.97, W213: 1.04, S213: 1.05, W214: 1.1 } },
    "S-klasa": { baseNew: 102000, refKw: 235, segment: "luxury", retention: 0.95, generations: { W220: 0.82, W221: 0.9, W222: 1.02, V222: 1.03, W223: 1.09, V223: 1.09 } },
    CLA: { baseNew: 35000, refKw: 110, segment: "compact", retention: 1.04, generations: { C117: 0.99, X117: 0.99, C118: 1.06, X118: 1.06 } },
    GLA: { baseNew: 35500, refKw: 110, segment: "suv-compact", retention: 1.03, generations: { X156: 0.97, H247: 1.05 } },
    GLB: { baseNew: 39500, refKw: 110, segment: "suv-mid", retention: 1.02, generations: { X247: 1.03 } },
    GLC: { baseNew: 50000, refKw: 145, segment: "suv-mid", retention: 1.05, generations: { X253: 1.02, C253: 1.04, X254: 1.09, C254: 1.1 } },
    GLE: { baseNew: 74000, refKw: 200, segment: "suv-large", retention: 1.04, generations: { W166: 0.97, C292: 0.99, V167: 1.07, C167: 1.08 } },
    "V-klasa": { baseNew: 56000, refKw: 140, segment: "mpv", retention: 1.08, generations: { W638: 0.82, W447: 1.07 } },
  },
  Škoda: {
    Fabia: { baseNew: 18500, refKw: 66, segment: "city", retention: 1.04, generations: { "6Y": 0.86, "5J": 0.94, NJ: 1.02, PJ: 1.07 } },
    Octavia: { baseNew: 24500, refKw: 105, segment: "compact", retention: 1.06, generations: { "1U": 0.85, "1Z": 0.93, "5E": 1.02, NX: 1.06 } },
    Superb: { baseNew: 34500, refKw: 120, segment: "midsize", retention: 1.05, generations: { "3U": 0.84, "3T": 0.93, "3V": 1.03, "3Y": 1.08 } },
    Karoq: { baseNew: 27500, refKw: 100, segment: "suv-compact", retention: 1.04, generations: { NU: 1.03 } },
    Kodiaq: { baseNew: 36500, refKw: 125, segment: "suv-mid", retention: 1.05, generations: { NS: 1.03, PS: 1.08 } },
    Scala: { baseNew: 21000, refKw: 81, segment: "compact", retention: 1.01, generations: { NW1: 1.01 } },
    Kamiq: { baseNew: 21500, refKw: 81, segment: "suv-compact", retention: 1.03, generations: { NW4: 1.02 } },
    Enyaq: { baseNew: 39000, refKw: 150, segment: "suv-mid", retention: 0.92, generations: { NY: 1.0 } },
    Rapid: { baseNew: 17500, refKw: 70, segment: "compact", retention: 0.98, generations: { NH: 0.97 } },
  },
  Porsche: {
    Macan: { baseNew: 72500, refKw: 195, segment: "suv-mid", retention: 1.12, generations: { "95B": 1.04, XAB: 1.02 } },
    Cayenne: { baseNew: 98000, refKw: 250, segment: "suv-large", retention: 1.08, generations: { "9PA": 0.88, "92A": 0.98, E3: 1.07 } },
    "911": { baseNew: 145000, refKw: 283, segment: "sports", retention: 1.2, generations: { "996": 0.95, "997": 1.08, "991": 1.12, "992": 1.18 } },
    "718 Boxster": { baseNew: 78000, refKw: 220, segment: "sports", retention: 1.14, generations: { "982": 1.08 } },
    "718 Cayman": { baseNew: 77000, refKw: 220, segment: "sports", retention: 1.15, generations: { "982": 1.09 } },
    Panamera: { baseNew: 112000, refKw: 243, segment: "luxury", retention: 1.02, generations: { "970": 0.92, "971": 1.05, "976": 1.1 } },
    Taycan: { baseNew: 102000, refKw: 300, segment: "executive", retention: 0.87, generations: { Y1A: 0.98, Y1B: 1.02, Y1C: 1.02 } },
  },
  Toyota: {
    Yaris: { baseNew: 22000, refKw: 85, segment: "city", retention: 1.08, generations: { XP130: 0.98, XP210: 1.07 } },
    "Yaris Cross": { baseNew: 26500, refKw: 85, segment: "suv-compact", retention: 1.08, generations: { XP210: 1.06 } },
    Corolla: { baseNew: 28500, refKw: 90, segment: "compact", retention: 1.07, generations: { E210: 1.06 } },
    Auris: { baseNew: 24000, refKw: 90, segment: "compact", retention: 1.03, generations: { E15: 0.94, E18: 1.02 } },
    "C-HR": { baseNew: 30500, refKw: 90, segment: "suv-compact", retention: 1.06, generations: { AX10: 1.02, AX20: 1.07 } },
    RAV4: { baseNew: 38200, refKw: 130, segment: "suv-mid", retention: 1.08, generations: { XA40: 0.98, XA50: 1.06, XA60: 1.1 } },
    Aygo: { baseNew: 15500, refKw: 53, segment: "city", retention: 1.04 },
    "Aygo X": { baseNew: 18500, refKw: 53, segment: "city", retention: 1.05 },
  },
  Hyundai: {
    i10: { baseNew: 16500, refKw: 49, segment: "city", retention: 1.0 },
    i20: { baseNew: 20500, refKw: 74, segment: "city", retention: 1.0 },
    i30: { baseNew: 24500, refKw: 88, segment: "compact", retention: 1.01 },
    Tucson: { baseNew: 32500, refKw: 110, segment: "suv-mid", retention: 1.03, generations: { TL: 0.99, NX4: 1.05 } },
    Kona: { baseNew: 27500, refKw: 95, segment: "suv-compact", retention: 1.0, generations: { OS: 0.98, SX2: 1.05 } },
    "Santa Fe": { baseNew: 45500, refKw: 147, segment: "suv-large", retention: 0.98 },
    "IONIQ 5": { baseNew: 44000, refKw: 160, segment: "suv-mid", retention: 0.9 },
  },
  Kia: {
    Picanto: { baseNew: 16000, refKw: 49, segment: "city", retention: 1.0 },
    Rio: { baseNew: 20000, refKw: 74, segment: "city", retention: 1.0 },
    Ceed: { baseNew: 24500, refKw: 88, segment: "compact", retention: 1.01 },
    ProCeed: { baseNew: 27500, refKw: 110, segment: "compact", retention: 1.02, generations: { CD: 1.03 } },
    Sportage: { baseNew: 33000, refKw: 110, segment: "suv-mid", retention: 1.03, generations: { QL: 0.99, NQ5: 1.06 } },
    Niro: { baseNew: 32000, refKw: 104, segment: "suv-compact", retention: 0.99 },
    Sorento: { baseNew: 46500, refKw: 147, segment: "suv-large", retention: 0.99 },
    EV6: { baseNew: 47000, refKw: 168, segment: "suv-mid", retention: 0.9 },
  },
  Renault: {
    Clio: { baseNew: 19800, refKw: 67, segment: "city", retention: 0.99, generations: { IV: 0.95, V: 1.03 } },
    "Mégane": { baseNew: 25500, refKw: 85, segment: "compact", retention: 0.98, generations: { III: 0.92, IV: 1.02 } },
    Captur: { baseNew: 24000, refKw: 85, segment: "suv-compact", retention: 0.98 },
    Kadjar: { baseNew: 28000, refKw: 96, segment: "suv-mid", retention: 0.95 },
    Austral: { baseNew: 33500, refKw: 116, segment: "suv-mid", retention: 0.98 },
    Talisman: { baseNew: 33000, refKw: 118, segment: "midsize", retention: 0.94 },
  },
  Peugeot: {
    "208": { baseNew: 21000, refKw: 74, segment: "city", retention: 0.98, generations: { A9: 0.94, P21: 1.05 } },
    "2008": { baseNew: 25500, refKw: 81, segment: "suv-compact", retention: 0.99, generations: { A94: 0.94, P24: 1.05 } },
    "308": { baseNew: 26500, refKw: 96, segment: "compact", retention: 0.97, generations: { T9: 0.97, P5: 1.05 } },
    "3008": { baseNew: 32500, refKw: 96, segment: "suv-mid", retention: 1.01, generations: { P84: 1.03, P64: 1.07 } },
    "5008": { baseNew: 37000, refKw: 110, segment: "suv-mid", retention: 0.99 },
    "508": { baseNew: 36500, refKw: 118, segment: "midsize", retention: 0.97, generations: { "8D/8E": 0.92, R8: 1.04 } },
  },
  Opel: {
    Corsa: { baseNew: 19800, refKw: 74, segment: "city", retention: 0.96 },
    Astra: { baseNew: 25800, refKw: 96, segment: "compact", retention: 0.95 },
    Insignia: { baseNew: 33500, refKw: 125, segment: "midsize", retention: 0.93 },
    Mokka: { baseNew: 25500, refKw: 88, segment: "suv-compact", retention: 0.96 },
    Grandland: { baseNew: 33000, refKw: 96, segment: "suv-mid", retention: 0.95 },
  },
  Ford: {
    Fiesta: { baseNew: 19500, refKw: 70, segment: "city", retention: 0.96 },
    Focus: { baseNew: 26500, refKw: 92, segment: "compact", retention: 0.98, generations: { Mk3: 0.93, Mk4: 1.03 } },
    Mondeo: { baseNew: 34500, refKw: 110, segment: "midsize", retention: 0.93 },
    Puma: { baseNew: 25500, refKw: 92, segment: "suv-compact", retention: 0.99 },
    Kuga: { baseNew: 32500, refKw: 110, segment: "suv-mid", retention: 0.97 },
  },
  Mazda: {
    Mazda2: { baseNew: 20500, refKw: 66, segment: "city", retention: 1.0 },
    Mazda3: { baseNew: 26500, refKw: 90, segment: "compact", retention: 1.03 },
    Mazda6: { baseNew: 35500, refKw: 121, segment: "midsize", retention: 1.01 },
    "CX-30": { baseNew: 29500, refKw: 90, segment: "suv-compact", retention: 1.03 },
    "CX-5": { baseNew: 36500, refKw: 121, segment: "suv-mid", retention: 1.04 },
    "CX-60": { baseNew: 49500, refKw: 187, segment: "suv-large", retention: 0.98 },
  },
  Volvo: {
    V40: { baseNew: 29500, refKw: 88, segment: "compact", retention: 0.98 },
    V60: { baseNew: 46500, refKw: 140, segment: "midsize", retention: 1.0 },
    XC40: { baseNew: 39500, refKw: 115, segment: "suv-compact", retention: 1.02 },
    XC60: { baseNew: 53500, refKw: 145, segment: "suv-mid", retention: 1.03 },
    XC90: { baseNew: 76000, refKw: 173, segment: "suv-large", retention: 1.01 },
  },
  Dacia: {
    Sandero: { baseNew: 15800, refKw: 67, segment: "city", retention: 1.05 },
    Duster: { baseNew: 21500, refKw: 85, segment: "suv-compact", retention: 1.07 },
    Jogger: { baseNew: 20500, refKw: 81, segment: "mpv", retention: 1.04 },
    Spring: { baseNew: 18500, refKw: 48, segment: "city", retention: 0.88 },
  },
  Tesla: {
    "Model 3": { baseNew: 39500, refKw: 208, segment: "midsize", retention: 0.92, generations: { I: 0.96, Highland: 1.05 } },
    "Model Y": { baseNew: 42500, refKw: 220, segment: "suv-mid", retention: 0.94, generations: { I: 0.98, Juniper: 1.06 } },
    "Model S": { baseNew: 88000, refKw: 380, segment: "executive", retention: 0.87 },
    "Model X": { baseNew: 96000, refKw: 380, segment: "suv-large", retention: 0.87 },
  },
  "Alfa Romeo": {
    Giulia: { baseNew: 38000, refKw: 140, segment: "midsize", retention: 0.96, generations: { "952": 1.03 } },
    Stelvio: { baseNew: 42500, refKw: 147, segment: "suv-mid", retention: 0.97, generations: { "949": 1.03 } },
  },
  Cupra: {
    Formentor: { baseNew: 36500, refKw: 175, segment: "suv-compact", retention: 1.03, generations: { KM: 1.03 } },
  },
  Honda: {
    Civic: { baseNew: 26800, refKw: 105, segment: "compact", retention: 1.07, generations: { "FC/FK (X)": 1.05, "FL (XI)": 1.08 } },
  },
  "Land Rover": {
    "Range Rover Evoque": { baseNew: 52500, refKw: 132, segment: "suv-compact", retention: 1.0, generations: { L538: 0.92, L551: 1.03 } },
  },
};

function inferSegment(make: string, modelName: string, kw: number, bodyType = ""): Segment {
  const text = `${make} ${modelName}`.toLowerCase();
  const body = bodyType.toLowerCase();
  if (/pick-up|pickup/.test(body) || /\b(hilux|ranger|amarok|navara|l200|d-max|musso|gladiator|cybertruck|quartermaster|t90|goa|xenon|sierra)\b|ram (1500|2500|3500)/i.test(text)) return "pickup";
  if (/kombi|dostav/.test(body) || /\b(sprinter|ducato|daily|crafter|master|boxer|jumper|transporter|multivan|trafic|vivaro|movano|vito|scudo|expert|traveller|jumpy|transit|edeliver|staria|proace|citan|kangoo|partner|doblo|doblò|combo|dokker|nv200|townstar)\b/i.test(text)) return "van";
  if (/911|boxster|cayman|mx-5|a110|f-type|corvette|emira|elise|exige|458|488|f8|296|sf90|roma|huracan|huracán|aventador|revuelto|gallardo|mc20|570s|720s|artura|cyberster|s2000|brz|gt86|gr86|supra|z3|z4|slk|slc|tt\b|r8|vantage|db9|db11|db12|mustang|camaro|challenger|roadster/i.test(text)) return "sports";
  if (/s-klasa|serija 7|serija 8|a8|panamera|taycan|eqs|i7|ls\b|ghost|phantom|cullinan|spectre|bentayga|flying spur|continental|57|62|nevera|concept_one|purosangue|xj\b|quattroporte|maybach/i.test(text)) return "luxury";
  if (/x5|x6|x7|xm|ix\b|q7|q8|gle|gls|g-klasa|touareg|cayenne|xc90|ex90|santa fe|sorento|range rover|defender|discovery|cx-60|cx-80|urus|dbx|model x|land cruiser|patrol|pajero|grand cherokee|escalade|tahoe|yukon|durango|hummer|rexton|ev9|tang|el8|g9|free|dream|mifa 9|7x\b|sealion/i.test(text)) return "suv-large";
  if (/x3|x4|q5|q6|glc|glb|eqc|eqb|tiguan|tayron|kodiaq|rav4|highlander|tucson|sportage|cx-5|cx-7|xc60|macan|3008|5008|kuga|edge|explorer|grandland|austral|koleos|espace|rafale|model y|enyaq|id\.4|id\.5|ioniq 5|ev6|torres|korando|freelander|discovery sport|evoque|velar|f-pace|i-pace|wrangler|cherokee|compass|x-trail|outlander|forester|outback|nx|rx|gv70|gv80|seal u|starray|jaecoo 7|jaecoo 8|omoda 7|omoda 9|t5 evo|fengon|tiggo 7|tiggo 8|polestar 3|polestar 4|c10|c5 aircross|grenadier|niva/i.test(text)) return "suv-mid";
  if (/x1|x2|ix1|ix2|q2|q3|q4|gla|eqa|t-roc|t-cross|taigo|karoq|kamiq|elroq|yaris cross|corolla cross|c-hr|kona|bayon|niro|stonic|captur|arkana|symbioz|2008|mokka|crossland|frontera|puma|ecosport|cx-3|cx-30|mx-30|xc40|ex30|juke|qashqai|vitara|s-cross|sx4|jimny|ignis|arona|ateca|tarraco|duster|bigster|avenger|renegade|e-pace|tivoli|hr-v|zr-v|asx|eclipse|xv|crosstrek|ux|lbx|atto|dolphin|zs|hs|coolray|cityray|omoda 5|jaecoo 5|glory|box|mage|01|02|tiggo 4|seres|ev3|500x|600|c3 aircross|c4 cactus|ds 3|ds 7/i.test(text)) return "suv-compact";
  if (/monovolumen|mpv/.test(body) || /touran|sharan|v-klasa|b-klasa|zafira|meriva|scénic|scenic|modus|rifter|berlingo|picasso|s-max|galaxy|c-max|b-max|alhambra|altea|jogger|lodgy|carens|venga|ix20|mazda5|fr-v|orlando|voyager|musa|phedra|u-tour|euniq/i.test(text)) return "mpv";
  if (/serija 5|serija 6|a6|a7|e-klasa|cls|eqe|i5|xf|s-type|model s|es\b|gs\b|s80|s90|v90|9-5|ghibli|panamera|300c|cts|g80|han|et7|001/i.test(text)) return "executive";
  if (/karavan|limuzina|coupé|cabrio/.test(body) || /serija 3|serija 4|a4|a5|passat|arteon|id\.7|c-klasa|cle|clk|superb|insignia|vectra|omega|talisman|laguna|508|406|407|408|607|mondeo|mazda6|v60|s60|v70|156|159|166|giulia|model 3|accord|camry|avensis|sonata|optima|stinger|i40|xe|q50|q70|9-3|75|c5|c6|lybra|thesis|seal\b|et5|p7|shine max|polestar 2|i4/i.test(text)) return "midsize";
  if (/polo|fabia|felicia|citigo|yaris|aygo|i10|i20|getz|atos|picanto|rio|clio|twingo|106|107|108|206|207|208|corsa|adam|tigra|fiesta|ka\b|c1|c2|c3|saxo|panda|uno|punto|500\b|micra|swift|alto|splash|ibiza|mii|sandero|logan|spring|up!|lupo|fox|a1|a2|jazz|colt|space star|justy|cuore|sirion|fortwo|forfour|matiz|tico|spark|aveo|ypsilon|mito|yugo|koral|skala|750|fićo|samara|granta|kalina|t03|dolphin surf|5 e-tech|a290/i.test(text)) return "city";
  if (/suv|teren/.test(body)) return kw >= 145 ? "suv-mid" : "suv-compact";
  if (kw >= 210) return "executive";
  if (kw >= 145) return "midsize";
  if (kw <= 65) return "city";
  return "compact";
}

function resolveModelSpec(make: string, modelName: string, kw: number, bodyType = ""): ModelSpec {
  const direct = MODEL_SPECS[make]?.[modelName];
  if (direct && (!bodyType || /hatch|limuz|karavan/i.test(bodyType))) return direct;
  if (direct && /suv|teren|mpv|kombi|pick/i.test(bodyType)) {
    const bodySeg = inferSegment(make, modelName, kw, bodyType);
    if (bodySeg !== direct.segment && (bodySeg === "van" || bodySeg === "pickup")) {
      return { ...direct, segment: bodySeg };
    }
    return direct;
  }
  const segment = inferSegment(make, modelName, kw, bodyType);
  const seg = SEGMENT_DEFAULTS[segment];
  const brand = BRAND_PROFILES[make] ?? { tier: 0.94, retention: 0.96 };
  return {
    baseNew: Math.round(seg.baseNew * brand.tier),
    refKw: seg.refKw,
    segment,
    retention: brand.retention,
  };
}

function generationFactor(make: string, modelName: string, generation: string | undefined, spec: ModelSpec): number {
  if (!generation) return 1;
  const clean = generation.trim();
  if (spec.generations) {
    if (Object.hasOwn(spec.generations, clean)) return spec.generations[clean];
    const parts = clean.split(/[\s/]+/);
    for (const part of parts) {
      if (Object.hasOwn(spec.generations, part)) return spec.generations[part];
    }
  }
  const families = modelFor(make, modelName)?.generations;
  if (!families?.length) return 1;
  const idx = families.findIndex(f => f.codes.includes(clean) || f.codes.join("/") === clean);
  if (idx === -1) return 1;
  if (families.length === 1) return 1.02;
  const pos = idx / (families.length - 1);
  return 0.9 + pos * 0.16;
}

function resolveClampedRegYear(input: MarketValuationInput, generation: string | undefined, refDate: Date): { year: number; month: number } {
  const refYear = refDate.getFullYear();
  const parsedYear =
    input.date && /^\d{4}/.test(input.date)
      ? Number(input.date.slice(0, 4))
      : input.year && input.year >= 1955 && input.year <= refYear + 1
      ? input.year
      : undefined;
  const parsedMonth = input.date && /^\d{4}-\d{2}/.test(input.date) ? Number(input.date.slice(5, 7)) || 6 : 6;
  const genSpan = generation ? generationRange(input.make, input.model, generation) : undefined;
  if (parsedYear !== undefined) {
    return {
      year: genSpan ? clampYearToRange(parsedYear, genSpan) : parsedYear,
      month: parsedMonth,
    };
  }
  if (genSpan) {
    const mid = Math.min(refYear, Math.round((genSpan.yearFrom + Math.min(refYear, genSpan.yearTo)) / 2));
    return { year: mid, month: 6 };
  }
  return { year: refYear - 5, month: 6 };
}

function extractAgeYears(input: MarketValuationInput, generation: string | undefined, refDate: Date): number {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth() + 1;
  const { year, month } = resolveClampedRegYear(input, generation, refDate);
  return Math.max(0.2, Math.min(45, refYear - year + (refMonth - month) / 12));
}

function ageRetentionMultiplier(ageYears: number, segment: Segment, retention: number): number {
  const cfg = SEGMENT_DEFAULTS[segment];
  let factor = 1;
  const y1 = Math.min(ageYears, 1);
  factor *= Math.pow(1 - cfg.rate1, y1);
  if (ageYears > 1) {
    const yMid = Math.min(ageYears - 1, 7);
    factor *= Math.pow(1 - cfg.rateMid, yMid);
  }
  if (ageYears > 8) {
    const yLate = Math.min(ageYears - 8, 7);
    factor *= Math.pow(1 - cfg.rateLate, yLate);
  }
  if (ageYears > 15) {
    const yOld = ageYears - 15;
    factor *= Math.pow(0.905, yOld);
  }
  const retentionTilt = Math.pow(retention, Math.min(ageYears, 9) * 0.2);
  return Math.max(0.04, factor * retentionTilt);
}

function normalizeFuel(fuel: string, variant = "", title = ""): "diesel" | "petrol" | "lpg" | "hybrid" | "phev" | "ev" {
  const f = fuel.toLowerCase();
  const vt = `${variant} ${title}`.toLowerCase();
  if (f.includes("struj") || f.includes("elektr") || f === "ev") return "ev";
  if (f.includes("plug") || f.includes("phev") || (f.includes("hibrid") && /\bgte\b|\b330e\b|\b530e\b|\b300e\b|\b300de\b|\b250e\b|\bt6 recharge\b|\bt8 recharge\b|\b45e\b|\b50e\b|\bphev\b|\be-hybrid\b|\behybrid\b|\btfsi e\b|\b4xe\b|\bdm-i\b|\bshs\b|\bem-i\b|\breev\b/i.test(vt))) {
    return "phev";
  }
  if (f.includes("hibrid") || f.includes("hybrid")) return "hybrid";
  if (f.includes("lpg") || f.includes("plin") || /\beco-g\b/i.test(vt)) return "lpg";
  if (f.includes("dizel") || f.includes("diesel")) return "diesel";
  return "petrol";
}

function ageEquipmentWeight(ageYears: number): number {
  if (ageYears <= 3) return 1.0;
  if (ageYears <= 6) return 1.0 - ((ageYears - 3) / 3) * 0.22;
  if (ageYears <= 9) return 0.78 - ((ageYears - 6) / 3) * 0.23;
  if (ageYears <= 12) return 0.55 - ((ageYears - 9) / 3) * 0.2;
  return 0.35;
}

function collectTokens(input: MarketValuationInput): string {
  const equipList: string[] = [];
  if (Array.isArray(input.equipment)) equipList.push(...input.equipment);
  else if (input.equipment && typeof input.equipment === "object") {
    for (const items of Object.values(input.equipment)) if (Array.isArray(items)) equipList.push(...items);
  }
  if (Array.isArray(input.makeEquipment)) equipList.push(...input.makeEquipment);
  if (Array.isArray(input.catalogEquipment)) equipList.push(...input.catalogEquipment);
  return [
    input.variant ?? "",
    input.trim ?? "",
    input.title ?? "",
    input.drive ?? "",
    ...equipList,
  ]
    .join(" | ")
    .toLowerCase();
}

type EquipRule = { slot: string; label: string; value: number; pattern: RegExp };

/** Factory sport packages: a single +9.0% multiplier on the base value (best package counts once). */
const SPORT_PACKAGES: Array<{ label: string; pattern: RegExp }> = [
  { label: "M Sport paket", pattern: /m[\s-]*sport|bmw-m-sport/i },
  { label: "AMG Line", pattern: /amg[\s-]*line|mercedes-amg-line/i },
  { label: "S-Line", pattern: /s[\s-]*line|audi-s-line/i },
  { label: "R-Line", pattern: /r[\s-]*line|vw-r-line/i },
  { label: "RS / GTI / GTD / VRS", pattern: /(?:^|[|\s·•-])(rs|gti|gtd|vrs|skoda-rs|rs paket|cupra vz)(?=$|[|\s·•-])/i },
  { label: "Laurin & Klement", pattern: /laurin|l&k/i },
  { label: "Sport Chrono", pattern: /sport[\s-]*chrono|porsche-sport-chrono/i },
  { label: "Sport / GT / ST-Line paket", pattern: /r-design|gt[\s-]*line|st[\s-]*line|n[\s-]*line|fr paket|sportline|veloce|f sport|gs line|monte carlo/i },
];

/** High-value tech/comfort options valued proportionally (+2.5% … +3.5% each, combined cap +22%). */
const TECH_OPTIONS: Array<{ slot: string; label: string; pct: number; pattern: RegExp }> = [
  { slot: "roof-pano", label: "Panoramski krov", pct: 0.03, pattern: /panoram|stakleni krov|porsche-panorama/i },
  { slot: "lights-top", label: "LED Matrix / Adaptivna LED svjetla", pct: 0.03, pattern: /laserlight|hd matrix|matrix led|multibeam|digital light|iq\.?light|pdls|intellilux|audi-matrix-led|vw-iq-light|skoda-matrix-led/i },
  { slot: "hud", label: "Head-Up Display", pct: 0.03, pattern: /head-up|\bhud\b|projekcijski zaslon/i },
  { slot: "cam-360", label: "360° kamera", pct: 0.03, pattern: /360\s*°?\s*kamere?|area[\s-]*view|parking assistant plus|around view/i },
  { slot: "cockpit", label: "Virtual / Live Cockpit Pro", pct: 0.025, pattern: /virtual[\s-]*cockpit|live[\s-]*cockpit|digital[\s-]*cockpit|digitalni kokpit|mbux|widescreen|openr/i },
  { slot: "audio-top", label: "Harman Kardon / Burmester / Canton", pct: 0.025, pattern: /harman[\s-]*kardon|burmester|bang\s*&\s*olufsen|bowers\s*&\s*wilkins|canton|dynaudio|meridian|mark levinson|focal/i },
  { slot: "seats-memory", label: "Kožna sjedala s memorijom", pct: 0.025, pattern: /(?:kožna|kozna)\s+sjedal\w*\s+s\s*memorijom|memorija sjedala/i },
];

const EQUIPMENT_RULES: EquipRule[] = [
  { slot: "webasto", label: "Webasto grijanje", value: 550, pattern: /webasto|neovisno grijanje/i },
  { slot: "susp-air", label: "Zračni ovjes / DCC / PASM", value: 800, pattern: /zračni ovjes|airmatic|adaptive air|pasm|\bdcc\b|adaptivni ovjes/i },
  { slot: "parking", label: "Prednji i stražnji parking senzori", value: 220, pattern: /parkirni senzori|parking senzori|parkirni senzor/i },
  { slot: "lights-led", label: "LED svjetla", value: 300, pattern: /led svjetla|adaptivna led|bmw-adaptive-led/i },
  { slot: "seats-msport", label: "M Sport sjedala", value: 260, pattern: /m[\s-]*sport\s+sjedal\w*|m-sport-sjedala/i },
  { slot: "m-wheel", label: "M Sport upravljač", value: 180, pattern: /m[\s-]*volan|m[\s-]*sport[\s-]*upravljač|m[\s-]*sport[\s-]*volan/i },
  { slot: "paddles", label: "F1 ručice na volanu", value: 220, pattern: /f1\s*(?:saltarice|ručice)|polugice za promjenu stupnja/i },
  { slot: "headliner", label: "Crna obloga krova", value: 240, pattern: /crna obloga krova|crno nebo/i },
  { slot: "mirrors-fold", label: "Električno sklopivi retrovizori", value: 180, pattern: /el\.?\s*sklopivi retrovizori|električno sklopivi retrovizori/i },
  { slot: "seats-vent", label: "Grijanje i ventilacija sjedala", value: 350, pattern: /ventilacija sjedala|hlađenje sjedala|ventilirana/i },
  { slot: "seats-heat", label: "Grijana sjedala", value: 180, pattern: /grijan[ae]\s+sjedala/i },
  { slot: "wheel-heat", label: "Grijanje volana", value: 160, pattern: /grijanje volana|grijani upravljač/i },
  { slot: "tow-elec", label: "Električna kuka", value: 300, pattern: /električna kuka|kuka na izvlačenje/i },
  { slot: "tow-std", label: "Kuka za vuču", value: 180, pattern: /kuka za vuču/i },
  { slot: "acc", label: "Adaptivni tempomat (ACC)", value: 260, pattern: /adaptivni tempomat|\bacc\b|distronic|travel assist|pilot assist|autopilot/i },
  { slot: "cruise", label: "Tempomat", value: 180, pattern: /tempomat/i },
  { slot: "leather-sport", label: "Kožna / sportska sjedala", value: 280, pattern: /kožna sjedala|nappa|m sport sjedala|sportska sjedala|bmw-sport-seats|ergoactive/i },
  { slot: "keyless", label: "Keyless / Pristup bez ključa", value: 200, pattern: /keyless|kessy|pristup bez ključa/i },
  { slot: "tailgate", label: "Električna vrata prtljažnika", value: 200, pattern: /električna vrata prtljažnika/i },
  { slot: "cam-rear", label: "Kamera za vožnju unatrag", value: 180, pattern: /kamera za vožnju unatrag|stražnja kamera/i },
  { slot: "navi", label: "Navigacija Professional", value: 220, pattern: /navigacij|apple carplay|android auto/i },
  { slot: "alloys20", label: 'Alu naplatci 20"', value: 240, pattern: /alu (?:felge|naplatci) 20/i },
  { slot: "alloys", label: "Aluminijski naplatci", value: 180, pattern: /aluminijski naplatci|alu naplatci|alu felge/i },
  { slot: "tinted", label: "Zatamnjena stražnja stakla", value: 160, pattern: /zatamnjena stražnja stakla|zatamnjena straznja stakla|zatamnjena stakla/i },
];

function parseRemainingRegMonths(registrationUntil: string | undefined, refDate: Date): number {
  if (!registrationUntil) return 0;
  const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(registrationUntil.trim());
  if (!match) return 0;
  const regMonth = Number(match[1]);
  const regYear = Number(match[2]);
  const diff = (regYear - refDate.getFullYear()) * 12 + (regMonth - (refDate.getMonth() + 1));
  return Math.max(0, Math.min(14, diff));
}

function regionalDemandMeta(city: string | undefined, county: string | undefined): { pct: number; label: string; note: string } {
  const loc = `${city ?? ""} ${county ?? ""}`.toLowerCase();
  if (/zagreb|velika gorica|samobor/.test(loc)) {
    return { pct: 0.015, label: city || "Zagreb i okolica", note: "Najveća likvidnost i potražnja na tržištu RH (+1,5%)" };
  }
  if (/split|dubrovnik|zadar|pula|istra|rijeka|primor|istars|splitsk/.test(loc)) {
    return { pct: 0.01, label: city || county || "Jadran", note: "Stabilna obalna potražnja i manja ponuda na tržištu (+1,0%)" };
  }
  if (/osijek|vinkov|slavon|sisak|bjelovar|karlovac|koprivn|varažd|čakov/.test(loc)) {
    return { pct: -0.005, label: city || county || "Kontinentalna RH", note: "Kontinentalno tržište s umjerenijom cjenovnom elastičnošću (-0,5%)" };
  }
  return { pct: 0, label: city || county || "Prosjek RH", note: "Nacionalni prosjek potražnje u RH" };
}

function performanceEngineFactor(tokens: string): { mult: number; label: string } {
  const text = tokens.toLowerCase();
  if (/\b(?:435d|335d|535d|m550d|m40d|450d|50\s*tdi|3\.0\s*tdi|4\.0\s*tdi|v8)\b/.test(text)) {
    return { mult: 1.16, label: "6-/8-cilindarska performansna izvedba (ukupno +25% vs 4-cil.)" };
  }
  if (/\b(?:430d|330d|530d|350d|45\s*tdi|3\.0d|535i|340i|440i|540i)\b/.test(text)) {
    return { mult: 1.05, label: "6-cilindarska izvedba (ukupno ~+19% vs 420d/320d)" };
  }
  if (/\b(?:gti|gtd|gte|\br\b|s3|s4|s5|cupra|rs3|rs4|rs5|m2|m3|m4)\b/.test(text)) {
    return { mult: 1.12, label: "Sportska performansna izvedba" };
  }
  if (/\b(?:320d|220d|318d|418d|420d|2\.0\s*tdi|30\s*tdi|35\s*tdi)\b/.test(text)) {
    return { mult: 1.0, label: "" };
  }
  return { mult: 1.0, label: "" };
}

function specialtyTrimFactor(make: string, modelName: string, tokens: string): { mult: number; label: string } {
  const full = `${make} ${modelName} ${tokens}`.toLowerCase();
  if (/m[eé]gane[\s\S]*r\.?s\.?\s*trophy|r\.?s\.?\s*trophy/.test(full)) return { mult: 1.24, label: "Limitirana R.S. Trophy izvedba" };
  if (/m[eé]gane[\s\S]*\br\.?s\.?\b/.test(full)) return { mult: 1.16, label: "Renault Sport (R.S.) izvedba" };
  if (/focus[\s\S]*\bst\b/.test(full)) return { mult: 1.1, label: "Ford Performance ST izvedba" };
  if (/formentor[\s\S]*\bvz\b/.test(full)) return { mult: 1.04, label: "Cupra VZ 310 KS izvedba" };
  if (/giulia[\s\S]*veloce/.test(full)) return { mult: 1.03, label: "Giulia Veloce Q4 sportska izvedba" };
  if (/civic[\s\S]*(1\.5\s*vtec|1\.5\s*turbo).*sport|\bcivic\b[\s\S]*\bsport\b/.test(full)) return { mult: 1.11, label: "Civic 1.5 Turbo Sport izvedba" };
  return { mult: 1.0, label: "" };
}

export function evaluateMarketPrice(input: MarketValuationInput): MarketValuationResult {
  const refDate = input.referenceDate ?? new Date();
  const kw = Math.max(25, Number.isFinite(input.kw) && input.kw > 0 ? input.kw : 100);
  const km = Math.max(0, Number.isFinite(input.km) ? input.km : 100000);
  const generation = input.generation || chassisFromTitle(input.make, input.model, input.title ?? "");
  const spec = resolveModelSpec(input.make, input.model, kw, input.bodyType);
  const clampedReg = resolveClampedRegYear(input, generation, refDate);
  const ageYears = extractAgeYears(input, generation, refDate);
  const ageMonths = Math.max(2, Math.round(ageYears * 12));
  const fuelKind = normalizeFuel(input.fuel, input.variant, input.title);
  const tokens = collectTokens(input);

  // 1. Base Reference & Chassis Generation Curves
  const genMult = generationFactor(input.make, input.model, generation, spec);
  const specialty = specialtyTrimFactor(input.make, input.model, tokens);
  const powerRatio = Math.max(0.55, Math.min(2.2, kw / spec.refKw));
  const powerScale = Math.pow(powerRatio, 0.42);

  let fuelNewScale = 1.0;
  let fuelAgeScale = 1.0;
  let fuelExplain = "Standardno zadržavanje vrijednosti za benzinski pogon";
  if (fuelKind === "diesel") {
    fuelNewScale = 1.035;
    fuelAgeScale = spec.segment === "city" ? 0.98 : ageYears > 2 ? 1.03 : 1.01;
    fuelExplain = spec.segment === "city"
      ? "Gradski dizel: nešto niža potražnja nego u višoj klasi"
      : "Dizelski pogon: snažno zadržavanje vrijednosti na rabljenom tržištu u RH";
  } else if (fuelKind === "phev") {
    fuelNewScale = 1.05;
    fuelAgeScale = ageYears > 3 ? 0.86 : 0.94;
    fuelExplain = "Plug-in hibrid: brži pad cijene nakon isteka tvorničkog jamstva baterije";
  } else if (fuelKind === "hybrid") {
    fuelNewScale = 1.05;
    fuelAgeScale = input.make === "Toyota" || input.make === "Lexus" ? 1.06 : 1.0;
    fuelExplain = input.make === "Toyota" || input.make === "Lexus"
      ? "Samopunjivi hibrid s dokazanom trajnošću (+6% zadržavanje vrijednosti)"
      : "Hibridni pogon: uravnotežena potrošnja i potražnja";
  } else if (fuelKind === "lpg") {
    fuelNewScale = 1.01;
    fuelAgeScale = ageYears > 5 ? 1.02 : 0.99;
    fuelExplain = "Tvornički / atestirani LPG smanjuje trošak goriva u starijim godištima";
  } else if (fuelKind === "ev") {
    fuelNewScale = 1.12;
    fuelAgeScale = ageYears > 2 ? Math.max(0.72, 0.92 - (ageYears - 2) * 0.03) : 0.95;
    fuelExplain = "Električno vozilo: izraženija deprecijacija zbog degradacije i tehnološkog napretka baterija";
  }

  const round50 = (n: number) => Math.max(500, Math.round(n / 50) * 50);
  const engine = performanceEngineFactor(tokens);

  const estimatedNewPriceHr = Math.round((spec.baseNew * genMult * specialty.mult * powerScale * fuelNewScale) / 100) * 100;
  const retention = spec.retention ?? BRAND_PROFILES[input.make]?.retention ?? 1.0;
  const curveFactor = ageRetentionMultiplier(ageYears, spec.segment, retention);
  const segFloor = Math.max(550, SEGMENT_DEFAULTS[spec.segment].floor * (BRAND_PROFILES[input.make]?.tier ?? 1) * (ageYears > 22 ? 0.65 : 0.9));

  const baseAtRefKw = round50(Math.max(segFloor, spec.baseNew * genMult * specialty.mult * curveFactor));
  const baseModelValueEur = round50(Math.max(segFloor, estimatedNewPriceHr * curveFactor * fuelAgeScale));
  const baseWithPower = round50(Math.max(segFloor, spec.baseNew * genMult * specialty.mult * powerScale * curveFactor));
  const powerDeltaEur = baseWithPower - baseAtRefKw;
  const fuelDeltaEur = baseModelValueEur - baseWithPower;

  const factors: ValuationFactor[] = [];
  const auditFactors: AuditFactor[] = [
    {
      id: "audit-base",
      category: "Vozilo i starost",
      parameterLabel: "Osnovna krivulja starosti i generacije",
      userValue: `${clampedReg.year}. (${String(clampedReg.month).padStart(2, "0")}/${clampedReg.year}, ${ageMonths} mj.)`,
      benchmarkValue: `Nova cijena osnove: ${Math.round(spec.baseNew * genMult).toLocaleString("hr-HR")} €`,
      impactEur: baseAtRefKw,
      explanation: `Mjesečna amortizacijska krivulja za segment (${spec.segment}) i marku ${input.make || "vozila"} uz indeks zadržavanja ${Math.round(retention * 100)}%.`,
    },
  ];

  if (Math.abs(powerDeltaEur) >= 50) {
    auditFactors.push({
      id: "audit-power",
      category: "Pogon i snaga",
      parameterLabel: "Snaga motora (kW)",
      userValue: `${kw} kW (${Math.round(kw * 1.35962)} KS)`,
      benchmarkValue: `Referentna snaga modela: ${spec.refKw} kW`,
      impactEur: powerDeltaEur,
      explanation: powerDeltaEur >= 0
        ? `Jača motorizacija (+${kw - spec.refKw} kW iznad bazne izvedbe) podiže tržišnu vrijednost u klasi.`
        : `Slabija ulazna motorizacija (${kw - spec.refKw} kW u odnosu na referentni model) snižava cijenu.`,
    });
  }

  if (Math.abs(fuelDeltaEur) >= 50) {
    auditFactors.push({
      id: "audit-fuel",
      category: "Pogon i snaga",
      parameterLabel: "Vrsta pogona i tržišna potražnja",
      userValue: input.fuel || "Benzin",
      benchmarkValue: "Standardna benzinska krivulja",
      impactEur: fuelDeltaEur,
      explanation: fuelExplain,
    });
  }

  // 2. Non-Linear Mileage Elasticity Curve
  const segKmAdjust = spec.segment === "executive" || spec.segment === "suv-mid" || spec.segment === "suv-large" ? 1500 : 0;
  const kmPerYear =
    fuelKind === "diesel"
      ? 18500 + segKmAdjust
      : fuelKind === "hybrid" || fuelKind === "phev" || fuelKind === "ev"
      ? 15000
      : fuelKind === "lpg"
      ? 16500
      : 13500;
  const expectedKm = Math.round(Math.max(12000, ageYears * kmPerYear));
  const kmDiff = km - expectedKm;

  let mileagePct = 0;
  // Mid-band relative adjustment
  if (kmDiff < 0) {
    mileagePct += Math.min(0.095, (-kmDiff / 1000) * 0.00085);
  } else {
    mileagePct -= Math.min(0.16, (kmDiff / 1000) * 0.0007);
  }
  // Low-mileage threshold bonus (< 70.000 km)
  if (km < 70000 && ageYears >= 2) {
    const lowKmStrength = (70000 - km) / 70000;
    mileagePct += lowKmStrength * Math.min(0.06, 0.02 + ageYears * 0.006);
  }
  // Smooth, capped depreciation above 180k: the curve flattens past 220k so
  // well-maintained high-mileage premium cars do not collapse to base prices.
  if (km > 180000) {
    const band1 = Math.min(km - 180000, 40000) / 1000;
    mileagePct -= band1 * 0.0007;
  }
  if (km > 220000) {
    const band2 = Math.min(km - 220000, 130000) / 1000;
    mileagePct -= band2 * 0.00042;
  }
  mileagePct = Math.max(-0.26, Math.min(0.145, mileagePct));

  // Croatian psychological round-mileage step-penalties: buyers re-price a car
  // the moment it crosses 100k / 150k / 200k, beyond the smooth curve.
  let stepPenaltyPct = 0;
  const crossedSteps: number[] = [];
  if (km > 100000) { stepPenaltyPct += 0.045; crossedSteps.push(100); }
  if (km > 150000) { stepPenaltyPct += 0.04; crossedSteps.push(150); }
  if (km > 200000) { stepPenaltyPct += 0.055; crossedSteps.push(200); }
  const stepPenaltyEur = -Math.round((baseModelValueEur * stepPenaltyPct) / 50) * 50;

  const mileageImpactEur = Math.round((baseModelValueEur * mileagePct) / 50) * 50 + stepPenaltyEur;
  const postMileageValue = Math.max(500, baseModelValueEur + mileageImpactEur);
  if (Math.abs(mileageImpactEur) >= 150) {
    factors.push({
      id: "mileage",
      label:
        mileageImpactEur > 0
          ? km < 70000
            ? "Niska kilometraža (< 70.000 km)"
            : "Kilometraža ispod prosjeka za godište"
          : crossedSteps.length
          ? `Psihološki prag kilometraže (preko ${crossedSteps.map(step => step + ".000").join(" / ")})`
          : km > 180000
          ? "Kilometraža iznad 180.000 km"
          : "Kilometraža iznad prosjeka za godište",
      impactEur: mileageImpactEur,
    });
  }

  auditFactors.push({
    id: "audit-mileage",
    category: "Kilometraža",
    parameterLabel: "Elastičnost kilometraže",
    userValue: `${km.toLocaleString("hr-HR")} km`,
    benchmarkValue: `Očekivano za ${Math.round(ageYears * 10) / 10} god. (${input.fuel}): ${expectedKm.toLocaleString("hr-HR")} km`,
    impactEur: mileageImpactEur,
    explanation:
      mileageImpactEur > 0
        ? km < 70000
          ? `Kilometraža ispod 70.000 km i ${Math.abs(kmDiff).toLocaleString("hr-HR")} km ispod godišnjeg prosjeka daje premiju očuvanosti.`
          : `Vozilo ima ${Math.abs(kmDiff).toLocaleString("hr-HR")} km manje od hrvatskog prosjeka za ovu starost i gorivo.`
        : mileageImpactEur < 0
        ? crossedSteps.length
          ? `Prelazak psiholoških pragova (${crossedSteps.map(step => step.toLocaleString("hr-HR") + ".000 km").join(" / ")}) dodatno snižava cijenu jer kupci u RH preusmjeravaju pregled na vozila ispod praga.`
          : km > 180000
          ? `Kilometraža iznad praga od 180.000 km aktivira dodatni faktor amortizacije za velike servise.`
          : `Vozilo ima ${Math.abs(kmDiff).toLocaleString("hr-HR")} km više od prosjeka za godište (${kmPerYear.toLocaleString("hr-HR")} km/god).`
        : "Kilometraža točno prati očekivani hrvatski prosjek za odabrano gorivo i starost.",
  });

  // 3. Equipment & Drivetrain Valuation Matrix
  const eqWeight = ageEquipmentWeight(ageYears);
  let rawEquipmentValue = 0;
  const matchedLabels: string[] = [];
  const matchedSlots = new Set<string>();
  const rawMatchedItems: Array<{ id: string; category: AuditCategory; label: string; rawEur: number; explanation: string }> = [];

  // 3a. Proportional trim & transmission multipliers — real Croatian market
  // percentages on the base value instead of flat € bonuses.
  const isAuto = /automat/i.test(input.gear) || /\b(dsg|pdk|steptronic|tiptronic|s tronic|multitronic|7g|9g|8hp)\b/i.test(tokens);
  const sportPackage = SPORT_PACKAGES.find(option => option.pattern.test(tokens));
  let techUpliftPct = 0;
  const techItems: Array<{ slot: string; label: string; pct: number }> = [];
  for (const option of TECH_OPTIONS) {
    if (option.pattern.test(tokens)) {
      matchedSlots.add(option.slot);
      techUpliftPct += option.pct;
      techItems.push(option);
    }
  }
  techUpliftPct = Math.min(0.22, techUpliftPct); // realistic combined equipment uplift cap (+22%)
  const proportionalMult = (isAuto ? 1.065 : 1) * (sportPackage ? 1.09 : 1) * (1 + techUpliftPct);
  const proportionalUpliftEur = Math.round((postMileageValue * (proportionalMult - 1)) / 50) * 50;

  if (isAuto) {
    matchedLabels.push("Automatski mjenjač");
    auditFactors.push({
      id: "audit-gear-auto",
      category: "Pogon i snaga",
      parameterLabel: "Automatski mjenjač",
      userValue: "Automatik / DSG / S-Tronic",
      benchmarkValue: "Ručni mjenjač (baza)",
      impactEur: Math.round(postMileageValue * 0.065),
      explanation: "Automatski mjenjač na tržištu rabljenih vozila u RH donosi +6,5% na osnovnu vrijednost — standardna doplata koja ostaje u cijeni.",
    });
  } else {
    auditFactors.push({
      id: "audit-gear-manual",
      category: "Pogon i snaga",
      parameterLabel: "Mjenjač",
      userValue: "Ručni mjenjač",
      benchmarkValue: "Bazni mjenjač",
      impactEur: 0,
      explanation: "Ručni mjenjač čini osnovnu referencu modela bez doplate za automatik.",
    });
  }
  if (sportPackage) {
    matchedLabels.push(sportPackage.label);
    auditFactors.push({
      id: "audit-pkg-sport",
      category: "Oprema",
      parameterLabel: sportPackage.label,
      userValue: "Tvornički sportski paket",
      benchmarkValue: "Standardna linija",
      impactEur: Math.round(postMileageValue * 0.09),
      explanation: `${sportPackage.label} donosi +9,0% na osnovnu vrijednost — sportski ovjes, estetika i pomoćnici ostaju u cijeni pri preprodaji.`,
    });
  }
  for (const option of techItems) {
    matchedLabels.push(option.label);
    auditFactors.push({
      id: `audit-tech-${option.slot}`,
      category: "Oprema",
      parameterLabel: option.label,
      userValue: "Ugrađeno",
      benchmarkValue: `+${Math.round(option.pct * 1000) / 10}% osnovne vrijednosti`,
      impactEur: Math.round(postMileageValue * option.pct),
      explanation: `${option.label}: proporcionalna tržišna doplata (ukupni tehnološki paket ograničen na +22%).`,
    });
  }

  const isAwd =
    /4×4|4x4|awd|4wd/i.test(input.drive ?? "") ||
    /\b(xdrive|quattro|4matic|4motion|allgrip|all4|q4|e-4orce|awd-i|sync|symmetrical awd)\b/i.test(tokens);
  if (isAwd) {
    rawEquipmentValue += 1350;
    matchedLabels.push("4×4 pogon");
    rawMatchedItems.push({
      id: "drive-awd",
      category: "Pogon i snaga",
      label: "Pogon na sve kotače (4×4 / AWD)",
      rawEur: 1350,
      explanation: `Sustav pogona na sve kotače ponderiran faktorom starosti (${Math.round(eqWeight * 100)}%).`,
    });
  }

  for (const rule of EQUIPMENT_RULES) {
    if (matchedSlots.has(rule.slot)) continue;
    if (rule.slot === "lights-led" && matchedSlots.has("lights-top")) continue;
    if (rule.slot === "seats-heat" && matchedSlots.has("seats-vent")) continue;
    if (rule.slot === "tow-std" && matchedSlots.has("tow-elec")) continue;
    if (rule.slot === "alloys" && matchedSlots.has("alloys20")) continue;
    if (rule.slot === "cruise" && matchedSlots.has("acc")) continue;
    if (rule.slot === "leather-sport" && (matchedSlots.has("seats-memory") || matchedSlots.has("seats-msport"))) continue;
    if (rule.pattern.test(tokens)) {
      matchedSlots.add(rule.slot);
      rawEquipmentValue += rule.value;
      matchedLabels.push(rule.label);
      rawMatchedItems.push({
        id: `eq-${rule.slot}`,
        category: "Oprema",
        label: rule.label,
        rawEur: rule.value,
        explanation: `Dodatna oprema (${rule.value.toLocaleString("hr-HR")} € bazne vrijednosti) skalirana težinskim faktorom starosti (${Math.round(eqWeight * 100)}%).`,
      });
    }
  }

  const equipmentValueEur = Math.round((rawEquipmentValue * eqWeight) / 50) * 50 + proportionalUpliftEur;
  for (const item of rawMatchedItems) {
    const weightedItemEur = Math.round(item.rawEur * eqWeight);
    auditFactors.push({
      id: `audit-${item.id}`,
      category: item.category,
      parameterLabel: item.label,
      userValue: "Ugrađeno",
      benchmarkValue: `Starosni ponder: ${Math.round(eqWeight * 100)}%`,
      impactEur: weightedItemEur,
      explanation: item.explanation,
    });
  }

  if (equipmentValueEur >= 150) {
    const head = matchedLabels.slice(0, 2).join(", ");
    const rest = matchedLabels.length > 2 ? ` + ${matchedLabels.length - 2} stavki` : "";
    factors.push({
      id: "equipment",
      label: `Oprema i pogon (${head}${rest})`,
      impactEur: equipmentValueEur,
    });
  }

  const preEngineValue = postMileageValue + equipmentValueEur;
  const enginePremiumEur = Math.round((preEngineValue * (engine.mult - 1)) / 50) * 50;
  const preTrustValue = preEngineValue + enginePremiumEur;
  if (engine.label && enginePremiumEur >= 50) {
    factors.push({ id: "performance-engine", label: engine.label, impactEur: enginePremiumEur });
    auditFactors.push({
      id: "audit-performance-engine",
      category: "Pogon i snaga",
      parameterLabel: "Motorizacija / broj cilindara",
      userValue: input.variant || input.title || "Performansna izvedba",
      benchmarkValue: "Bazna 4-cilindarska izvedba (418d/420d/318d/320d)",
      impactEur: enginePremiumEur,
      explanation: `${engine.label} na hrvatskom tržištu rabljenih vozila u odnosu na baznu 4-cilindarsku izvedbu.`,
    });
  }

  // 4. Croatian Market, Tax, Registration & Regional Factors
  const flagSet = new Set(input.flags ?? []);
  const historyText = (input.history ?? []).join(" | ");
  const hasCvh = flagSet.has("cvh");
  const isFirstOwner = Boolean(input.firstOwner) || /1\.\s*vlasnik|prvi vlasnik/i.test(historyText);
  const hasServiceBook = Boolean(input.serviceBook) || /servisn/i.test(historyText);
  const isVerifiedDealer = Boolean(input.verified || input.dealer);
  const isArriving = flagSet.has("dolazak");
  const hasPdv = flagSet.has("pdv");
  const hasKupac = flagSet.has("kupac");
  const hasWarranty = flagSet.has("jamstvo");
  const remRegMonths = parseRemainingRegMonths(input.registrationUntil, refDate);
  const regional = regionalDemandMeta(input.city, input.county);

  let trustImpactSum = 0;
  const trustTags: string[] = [];
  const addTrustFactor = (id: string, label: string, pct: number, shortTag: string, userVal: string, benchVal: string, explanation: string) => {
    const eur = Math.round((preTrustValue * pct) / 50) * 50;
    if (eur !== 0) {
      trustImpactSum += eur;
      trustTags.push(shortTag);
      factors.push({ id, label, impactEur: eur });
      auditFactors.push({
        id: `audit-${id}`,
        category: "Povijest, porez i tržište",
        parameterLabel: label,
        userValue: userVal,
        benchmarkValue: benchVal,
        impactEur: eur,
        explanation,
      });
    }
  };

  if (hasCvh) addTrustFactor("cvh", "Potvrđeni kilometri (CVH)", 0.035, "CVH", "Potvrda CVH", "Bez potvrde", "Službena potvrda stanja brojila kilometara u RH povećava povjerenje kupaca (+3,5%).");
  if (isFirstOwner) addTrustFactor("owner", "1. vlasnik", 0.03, "1. vlasnik", "Prvi vlasnik", "Više vlasnika", "Vozilo od prvog vlasnika s jasnim podrijetlom ostvaruje veću prodajnu cijenu (+3,0%).");
  if (hasServiceBook) addTrustFactor("service", "Servisna knjiga", 0.025, "Servisna", "Priložena", "Nepoznata", "Dokumentirano redovno održavanje smanjuje rizik skrivenih troškova (+2,5%).");
  if (isVerifiedDealer) addTrustFactor("dealer", "Verificirana autokuća (pregled + jamstvo)", 0.06, "Autokuća", "Verificirani salon", "Privatna prodaja", "Poslovni prodavač pokriva prethodni pregled, detaliranje i zakonsko jamstvo uz maržu (+6,0%).");
  if (isArriving) addTrustFactor("arriving", "Vozilo u dolasku (čekanje isporuke)", -0.04, "U dolasku", "U dolasku", "Odmah dostupno", "Čekanje na isporuku i nemogućnost neposrednog pregleda snižavaju traženu cijenu (-4,0%).");
  if (hasPdv) addTrustFactor("pdv", "Sustav PDV-a (R1 račun)", 0.035, "PDV (R1)", "R1 račun", "Bez R1", "Mogućnost odbitka pretporeza za pravne osobe i obrtnike (+3,5%).");
  else if (hasKupac) addTrustFactor("kupac", "Na ime kupca (bez pristojbe)", 0.015, "Na ime kupca", "Oslobođeno pristojbe", "Upravna pristojba", "Kupac ne plaća upravnu pristojbu na prijenos vlasništva (+1,5%).");
  if (hasWarranty) addTrustFactor("jamstvo", "Pisano jamstvo 12 mjeseci", 0.035, "Jamstvo 12 mj.", "Pisano jamstvo", "Bez jamstva", "Pisano jamstvo od 12 mjeseci značajno smanjuje rizik kupca i podiže fer raspon (+3,5%).");

  if (remRegMonths > 2) {
    // Croatian registration reality: tehnički pregled + osiguranje stoje novcu, pa
    // 8+ preostalih mjeseci nose ~450 € vrijednosti (45 €/mj., najviše 540 € za 12 mj.).
    const regBonus = remRegMonths >= 8
      ? Math.min(540, 450 + Math.max(0, remRegMonths - 10) * 45)
      : Math.min(350, Math.round(((remRegMonths - 1) * 32) / 50) * 50);
    if (regBonus >= 50) {
      trustImpactSum += regBonus;
      trustTags.push(`Reg. ${input.registrationUntil}`);
      factors.push({ id: "registration", label: `Važeća registracija (${remRegMonths} mj.)`, impactEur: regBonus });
      auditFactors.push({
        id: "audit-reg",
        category: "Povijest, porez i tržište",
        parameterLabel: "Preostala registracija u RH",
        userValue: `Do ${input.registrationUntil} (${remRegMonths} mj.)`,
        benchmarkValue: remRegMonths >= 8 ? "Neregistrirano / pred istek" : "Kratki preostali rok",
        impactEur: regBonus,
        explanation: remRegMonths >= 8
          ? `Registracija s ${remRegMonths} mjeseci pokriva tehnički pregled i policu osiguranja: ~45 €/mjesec vrijednosti za kupca (do 540 €).`
          : "Važeći tehnički pregled i polica AO štede kupcu neposredne troškove registracije.",
      });
    }
  }

  if (regional.pct !== 0) {
    const regDemandEur = Math.round((preTrustValue * regional.pct) / 50) * 50;
    if (regDemandEur !== 0) {
      trustImpactSum += regDemandEur;
      auditFactors.push({
        id: "audit-region",
        category: "Povijest, porez i tržište",
        parameterLabel: "Regionalna potražnja (RH)",
        userValue: regional.label,
        benchmarkValue: "Prosjek RH",
        impactEur: regDemandEur,
        explanation: regional.note,
      });
    }
  }

  const clampedTrust = Math.max(-preTrustValue * 0.08, Math.min(preTrustValue * 0.18, trustImpactSum));
  const historyBonusEur = Math.round(clampedTrust / 50) * 50;

  // Step 3 value proofs: each checked proof lifts the live fair range by a fixed amount.
  const proofSet = new Set(input.valueProofs ?? []);
  const proofBonusEur = VALUE_PROOFS.reduce((sum, proof) => proofSet.has(proof.id) ? sum + proof.bonusEur : sum, 0);
  const matchedProofs = VALUE_PROOFS.filter(proof => proofSet.has(proof.id));
  if (matchedProofs.length) {
    factors.push({
      id: "value-proofs",
      label: `Dokazi vrijednosti (${matchedProofs.map(proof => proof.label).join(", ")})`,
      impactEur: proofBonusEur,
    });
    auditFactors.push({
      id: "audit-value-proofs",
      category: "Povijest, porez i tržište",
      parameterLabel: "Dokazi vrijednosti",
      userValue: matchedProofs.map(proof => proof.label).join(" · "),
      benchmarkValue: "Nepotvrđeno stanje",
      impactEur: proofBonusEur,
      explanation: "Prodavateljevi dokazi vrijednosti (servis, gume, jamstvo, kasko) direktno podižu fer tržišni raspon oglasa.",
    });
  }

  const medianMarketPrice = Math.max(500, preTrustValue + historyBonusEur + proofBonusEur);
  // Seller-friendly tiers: Top prilika ≤ -5%, Tržišna cijena do +8% (HR negotiation
  // buffer), Viši cjenovni rang do +18%, iznad toga javna značka se skriva.
  const excellentMax = round50(medianMarketPrice * 0.95);
  const goodMax = round50(medianMarketPrice);
  const fairMin = round50(medianMarketPrice * 0.95);
  const fairMax = round50(medianMarketPrice * 1.08);
  const highMax = round50(medianMarketPrice * 1.18);

  const asking = input.askingPrice && input.askingPrice > 0 ? input.askingPrice : medianMarketPrice;
  const deltaEur = Math.round(asking - medianMarketPrice);
  const deltaPercent = Math.round(((asking - medianMarketPrice) / medianMarketPrice) * 1000) / 10;

  const rating = classifyRating(asking, medianMarketPrice);

  // Top 3-5 human-readable factors sorted by absolute EUR impact
  const topFactors = factors
    .sort((a, b) => Math.abs(b.impactEur) - Math.abs(a.impactEur))
    .slice(0, 5);

  // Estimate PPMV & German import landed cost comparison
  const regYear = clampedReg.year;
  const regMonth = String(clampedReg.month).padStart(2, "0");
  const approxCo2 = Number.isFinite(input.co2) && (input.co2 ?? 0) > 0
    ? Number(input.co2)
    : calculateCo2({
        fuel: fuelKind === "ev" ? "Električni" : fuelKind === "phev" ? "Plug-in hibrid" : fuelKind === "hybrid" ? "Hibrid" : fuelKind === "lpg" ? "LPG" : fuelKind === "diesel" ? "Dizel" : "Benzin",
        kw,
        year: regYear,
        date: `${regYear}-${regMonth}`,
        gear: input.gear,
        drive: input.drive,
        bodyType: input.bodyType,
        variant: input.variant,
        title: input.title,
      });
  const ppmv =
    estimateTax(
      {
        price: estimatedNewPriceHr,
        co2: approxCo2,
        registration: `${Math.max(1995, Math.min(refDate.getFullYear(), regYear))}-${regMonth}-01`,
        diesel: fuelKind === "diesel",
        used: ageYears >= 0.5,
        plugInKm: fuelKind === "phev" ? 55 : undefined,
        electric: fuelKind === "ev",
      },
      refDate,
    ) ?? 0;

  const estimatedPpmvEur = Math.round(ppmv);
  // Typical DE classifieds price sits ~6-8% below HR domestic market before transport + homologation + PPMV
  const deEstimatedPriceEur = Math.max(500, Math.round((medianMarketPrice * 0.91 - estimatedPpmvEur * 0.45) / 50) * 50);
  const importLogistics = 850; // transport/zoll/homologacija/COC
  const estimatedImportTotalEur = Math.max(medianMarketPrice - 1500, deEstimatedPriceEur + estimatedPpmvEur + importLogistics);

  const sampleCount = estimateSampleCount(input.make, input.model, spec.segment, ageYears);
  const mileageDiffLabel =
    mileageImpactEur === 0
      ? "U okviru prosjeka za godište"
      : `${km.toLocaleString("hr-HR")} km (prosjek ${expectedKm.toLocaleString("hr-HR")} km)`;
  const breakdown: ValuationBreakdownRow[] = [
    {
      id: "base",
      label: "Osnovna tržišna vrijednost modela",
      detail: `${regYear}. god. • ${kw} kW • ${input.fuel}`,
      amountEur: baseModelValueEur,
    },
    {
      id: "mileage",
      label: "Odstupanje kilometraže",
      detail: mileageDiffLabel,
      amountEur: mileageImpactEur,
    },
    {
      id: "equipment",
      label: "Ugrađena tvornička oprema",
      detail: matchedLabels.length ? `${matchedLabels.length} stavki (${matchedLabels.slice(0, 2).join(", ")})` : "Standardna oprema",
      amountEur: equipmentValueEur,
    },
    {
      id: "history",
      label: "Povijest i status",
      detail: trustTags.length ? trustTags.join(" · ") : "Standardni uvjeti prodaje",
      amountEur: historyBonusEur,
    },
    ...(matchedProofs.length ? [{
      id: "proofs",
      label: "Dokazi vrijednosti",
      detail: matchedProofs.map(proof => proof.label).join(" · "),
      amountEur: proofBonusEur,
    }] : []),
    {
      id: "total",
      label: "Realna tržišna vrijednost u RH",
      amountEur: medianMarketPrice,
      isTotal: true,
    },
  ];

  return {
    excellentMax,
    goodMax,
    fairMin,
    fairMax,
    highMax,
    medianMarketPrice,
    deltaEur,
    deltaPercent,
    rating,
    factors: topFactors,
    auditFactors,
    baseModelValueEur,
    mileageImpactEur,
    equipmentValueEur,
    equipmentCount: matchedLabels.length,
    historyBonusEur,
    sampleCount,
    breakdown,
    ageYears: Math.round(ageYears * 10) / 10,
    ageMonths,
    expectedKm,
    estimatedNewPriceHr,
    deEstimatedPriceEur,
    estimatedPpmvEur,
    estimatedImportTotalEur,
  };
}

function estimateSampleCount(make: string, model: string, segment: Segment, ageYears: number): number {
  const massBrands = new Set(["Volkswagen", "BMW", "Audi", "Mercedes-Benz", "Škoda", "Renault", "Peugeot", "Opel", "Ford", "Toyota", "Hyundai", "Kia", "Dacia"]);
  const nicheSegments = new Set<Segment>(["luxury", "sports", "pickup"]);
  let base = massBrands.has(make) ? 68 : 26;
  if (nicheSegments.has(segment)) base = Math.round(base * 0.42);
  if (ageYears <= 2) base = Math.round(base * 0.65);
  else if (ageYears <= 6) base = Math.round(base * 1.15);
  else if (ageYears > 12) base = Math.round(base * 0.72);
  let hash = 0;
  for (const ch of `${make}:${model}`) hash = (hash * 31 + ch.charCodeAt(0)) % 37;
  return Math.max(12, Math.min(168, base + hash));
}

function classifyRating(asking: number, medianMarketPrice: number): PriceRatingTier {
  const pct = (asking - medianMarketPrice) / Math.max(1, medianMarketPrice);
  if (pct <= -0.05) return { bars: 5, label: "Top prilika", type: "good", rank: 0 };
  if (pct <= 0.08) return { bars: 4, label: "Tržišna cijena", type: "fair", rank: 1 };
  if (pct <= 0.18) return { bars: 2, label: "Viši cjenovni rang", type: "high", rank: 2 };
  // Above +18% the public badge is hidden so the portal never harms the seller;
  // the seller sees a private advisory in /racun and in the Step 3 preview.
  return { bars: 1, label: "", type: "high", rank: 3, hidden: true };
}

/** Private advisory shown only to the seller (dashboard / Step 3) when the public badge is hidden. */
export function sellerAdvisoryText(deltaPercent: number, upperFairPrice: number): string | null {
  if (deltaPercent <= 18) return null;
  return `Oglasi u tržišnom rasponu dobivaju 3,4× više poziva — preporučujemo cijenu do ${Math.round(upperFairPrice).toLocaleString("hr-HR")} €.`;
}

/** Estimated time-to-sell line below the Step 3 price slider. */
export function timeToSellLine(deltaPercent: number, upperFairPrice: number, formatEuro: (value: number) => string): string {
  if (deltaPercent <= 8) {
    return 'Procijenjeno vrijeme prodaje: ~14 dana · Dobivate značku "Tržišna cijena" i +40% više pregleda';
  }
  if (deltaPercent <= 18) {
    return 'Procijenjeno vrijeme prodaje: ~30–45 dana · Oznaka "Viši cjenovni rang"';
  }
  return `Procijenjeno vrijeme prodaje: 65+ dana · Javna značka cijene bit će skrivena (privatna preporuka: do ${formatEuro(upperFairPrice)})`;
}

export function valuationInputFromVehicle(vehicle: Partial<Vehicle> & Pick<Vehicle, "make" | "model" | "km" | "kw" | "fuel" | "gear">): MarketValuationInput {
  const makeEquip =
    vehicle.make && vehicle.model && "id" in vehicle
      ? vehicleMakeOptions(vehicle as Vehicle).map(o => o.label)
      : vehicle.makeEquipment ?? [];
  return {
    make: vehicle.make,
    model: vehicle.model,
    generation: vehicle.generation,
    variant: vehicle.variant,
    title: vehicle.title,
    trim: vehicle.trim,
    date: vehicle.date,
    km: vehicle.km,
    kw: vehicle.kw,
    co2: vehicle.co2,
    fuel: vehicle.fuel,
    gear: vehicle.gear,
    drive: vehicle.drive,
    bodyType: vehicle.bodyType,
    registrationUntil: vehicle.registrationUntil,
    city: vehicle.city,
    county: vehicle.county,
    askingPrice: vehicle.price,
    equipment: vehicle.equipment,
    makeEquipment: [...(vehicle.makeEquipment ?? []), ...makeEquip],
    catalogEquipment: vehicle.catalogEquipment,
    flags: vehicle.flags,
    history: vehicle.history,
    dealer: vehicle.dealer,
    verified: vehicle.verified,
  };
}

export function evaluateVehiclePrice(vehicle: Vehicle): MarketValuationResult {
  return evaluateMarketPrice(valuationInputFromVehicle(vehicle));
}

export function describeMarketDelta(
  deltaEur: number,
  deltaPercent: number,
  formatEuro: (value: number) => string,
): { text: string; tone: "good" | "neutral" | "high" } {
  if (deltaPercent <= -5) {
    return { text: `${formatEuro(Math.abs(deltaEur))} ispod prosjeka RH`, tone: "good" };
  }
  if (deltaPercent <= 8) {
    return { text: "U okviru tržišnog raspona", tone: "neutral" };
  }
  if (deltaPercent <= 18) {
    return { text: `+${formatEuro(deltaEur)} iznad tržišnog raspona`, tone: "neutral" };
  }
  return { text: `+${formatEuro(deltaEur)} iznad tržišnog raspona`, tone: "high" };
}
