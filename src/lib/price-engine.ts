import { CAR_CATALOG, chassisFromTitle, modelFor } from "../data/car-catalog";
import type { Vehicle } from "../../app/catalog";
import { vehicleMakeOptions } from "../../app/make-equipment";
import { estimateTax } from "../../app/tax";
import { calculateCo2 } from "./spec-resolver";

export type PriceRatingTier = {
  bars: 1 | 2 | 3 | 4 | 5;
  label: "Odlična cijena" | "Dobra cijena" | "Fer cijena" | "Viša cijena" | "Visoka cijena";
  type: "good" | "fair" | "high";
  rank: 0 | 1 | 2 | 3 | 4;
};

export type ValuationFactor = {
  id: string;
  label: string;
  impactEur: number;
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
  baseModelValueEur: number;
  mileageImpactEur: number;
  equipmentValueEur: number;
  equipmentCount: number;
  historyBonusEur: number;
  sampleCount: number;
  breakdown: ValuationBreakdownRow[];
  ageYears: number;
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
    "Serija 1": { baseNew: 32000, refKw: 105, segment: "compact", retention: 1.03, generations: { E81: 0.88, E82: 0.92, E87: 0.88, E88: 0.93, F20: 0.99, F21: 0.99, F40: 1.04, F70: 1.08 } },
    "Serija 2": { baseNew: 35000, refKw: 115, segment: "compact", retention: 1.01, generations: { F22: 1.03, F23: 1.05, F45: 0.93, F46: 0.94, F44: 1.0, G42: 1.08, U06: 1.02 } },
    "Serija 3": { baseNew: 40500, refKw: 135, segment: "midsize", retention: 1.04, generations: { E46: 0.96, E90: 0.96, E91: 0.97, E92: 1.03, E93: 1.05, F30: 0.99, F31: 1.0, F34: 0.97, G20: 1.04, G21: 1.05 } },
    "Serija 4": { baseNew: 46000, refKw: 140, segment: "midsize", retention: 1.04, generations: { F32: 1.0, F33: 1.03, F36: 1.01, G22: 1.07, G23: 1.08, G26: 1.06 } },
    "Serija 5": { baseNew: 53500, refKw: 145, segment: "executive", retention: 1.02, generations: { E60: 0.92, E61: 0.93, F10: 0.97, F11: 0.99, F07: 0.93, G30: 1.04, G31: 1.05, G60: 1.09, G61: 1.1 } },
    "Serija 7": { baseNew: 98000, refKw: 210, segment: "luxury", retention: 0.93, generations: { E65: 0.85, E66: 0.85, F01: 0.91, F02: 0.91, G11: 1.0, G12: 1.01, G70: 1.08 } },
    X1: { baseNew: 37500, refKw: 110, segment: "suv-compact", retention: 1.03, generations: { E84: 0.93, F48: 1.01, U11: 1.08 } },
    X2: { baseNew: 38500, refKw: 110, segment: "suv-compact", retention: 1.0, generations: { F39: 0.99, U10: 1.06 } },
    X3: { baseNew: 49500, refKw: 140, segment: "suv-mid", retention: 1.04, generations: { E83: 0.89, F25: 0.96, G01: 1.05, G45: 1.1 } },
    X4: { baseNew: 54000, refKw: 145, segment: "suv-mid", retention: 1.03, generations: { F26: 0.97, G02: 1.05 } },
    X5: { baseNew: 76000, refKw: 200, segment: "suv-large", retention: 1.02, generations: { E53: 0.88, E70: 0.93, F15: 0.99, G05: 1.06 } },
    X6: { baseNew: 81000, refKw: 210, segment: "suv-large", retention: 1.01, generations: { E71: 0.92, F16: 0.99, G06: 1.06 } },
  },
  Audi: {
    A1: { baseNew: 24500, refKw: 81, segment: "city", retention: 1.04, generations: { "8X": 0.96, GB: 1.04 } },
    A3: { baseNew: 31000, refKw: 105, segment: "compact", retention: 1.04, generations: { "8L": 0.86, "8P": 0.95, "8V": 1.01, "8Y": 1.06 } },
    A4: { baseNew: 39000, refKw: 125, segment: "midsize", retention: 1.03, generations: { B5: 0.85, B6: 0.89, B7: 0.92, B8: 0.98, B9: 1.03 } },
    A5: { baseNew: 44000, refKw: 140, segment: "midsize", retention: 1.04, generations: { "8T": 0.96, "8F": 0.98, F5: 1.04, B10: 1.09 } },
    A6: { baseNew: 55000, refKw: 165, segment: "executive", retention: 1.02, generations: { C5: 0.85, C6: 0.91, C7: 0.97, C8: 1.05, C9: 1.1 } },
    A7: { baseNew: 64000, refKw: 185, segment: "executive", retention: 1.01, generations: { "4G": 0.98, "4K": 1.05 } },
    Q2: { baseNew: 30500, refKw: 96, segment: "suv-compact", retention: 1.03, generations: { GA: 1.02 } },
    Q3: { baseNew: 38500, refKw: 110, segment: "suv-compact", retention: 1.05, generations: { "8U": 0.96, F3: 1.05, FJ: 1.09 } },
    Q5: { baseNew: 50000, refKw: 140, segment: "suv-mid", retention: 1.04, generations: { "8R": 0.95, FY: 1.05, GU: 1.09 } },
    Q7: { baseNew: 75000, refKw: 200, segment: "suv-large", retention: 1.01, generations: { "4L": 0.9, "4M": 1.04 } },
    "Q4 e-tron": { baseNew: 46000, refKw: 150, segment: "suv-compact", retention: 0.94, generations: { F4: 1.0 } },
  },
  Volkswagen: {
    Polo: { baseNew: 20500, refKw: 70, segment: "city", retention: 1.06, generations: { "9N": 0.88, "6R": 0.97, "6C": 0.99, AW: 1.05 } },
    Golf: { baseNew: 27500, refKw: 100, segment: "compact", retention: 1.07, generations: { "1K": 0.93, "5K": 0.97, "5G": 1.03, "5G facelift": 1.06, CD: 1.04, "CD facelift": 1.07 } },
    Passat: { baseNew: 36500, refKw: 115, segment: "midsize", retention: 1.05, generations: { B5: 0.87, B6: 0.91, B7: 0.96, B8: 1.03, B9: 1.08 } },
    Tiguan: { baseNew: 37500, refKw: 110, segment: "suv-mid", retention: 1.06, generations: { "5N": 0.95, AD: 1.04, BW: 1.05, CT: 1.09 } },
    "T-Roc": { baseNew: 28000, refKw: 96, segment: "suv-compact", retention: 1.05, generations: { A1: 1.03, II: 1.07 } },
    "T-Cross": { baseNew: 23000, refKw: 81, segment: "suv-compact", retention: 1.04, generations: { C1: 1.03 } },
    Arteon: { baseNew: 43000, refKw: 140, segment: "midsize", retention: 1.02, generations: { "3H": 1.04 } },
    Touran: { baseNew: 32500, refKw: 110, segment: "mpv", retention: 1.05, generations: { "1T": 0.93, "5T": 1.04 } },
    Touareg: { baseNew: 72000, refKw: 210, segment: "suv-large", retention: 1.0, generations: { "7L": 0.88, "7P": 0.96, CR: 1.05 } },
    "ID.3": { baseNew: 35000, refKw: 150, segment: "compact", retention: 0.88, generations: { E1: 0.98 } },
    "ID.4": { baseNew: 41000, refKw: 150, segment: "suv-mid", retention: 0.9, generations: { E2: 1.0 } },
    Caddy: { baseNew: 28000, refKw: 85, segment: "mpv", retention: 1.05, generations: { "2K": 0.95, SB: 1.05 } },
  },
  "Mercedes-Benz": {
    "A-klasa": { baseNew: 32000, refKw: 100, segment: "compact", retention: 1.03, generations: { W168: 0.78, W169: 0.85, W176: 0.98, W177: 1.05, V177: 1.05 } },
    "B-klasa": { baseNew: 32500, refKw: 100, segment: "mpv", retention: 0.98, generations: { W245: 0.85, W246: 0.95, W247: 1.03 } },
    "C-klasa": { baseNew: 42500, refKw: 135, segment: "midsize", retention: 1.04, generations: { W203: 0.86, S203: 0.86, W204: 0.96, S204: 0.97, C204: 0.99, W205: 1.02, S205: 1.03, W206: 1.08, S206: 1.08 } },
    "E-klasa": { baseNew: 55000, refKw: 145, segment: "executive", retention: 1.04, generations: { W211: 0.88, S211: 0.89, W212: 0.96, S212: 0.97, W213: 1.04, S213: 1.05, W214: 1.1 } },
    "S-klasa": { baseNew: 108000, refKw: 235, segment: "luxury", retention: 0.95, generations: { W220: 0.82, W221: 0.9, W222: 1.02, V222: 1.03, W223: 1.09, V223: 1.09 } },
    CLA: { baseNew: 37500, refKw: 110, segment: "compact", retention: 1.04, generations: { C117: 0.99, X117: 0.99, C118: 1.06, X118: 1.06 } },
    GLA: { baseNew: 38000, refKw: 110, segment: "suv-compact", retention: 1.03, generations: { X156: 0.97, H247: 1.05 } },
    GLB: { baseNew: 42500, refKw: 110, segment: "suv-mid", retention: 1.02, generations: { X247: 1.03 } },
    GLC: { baseNew: 53500, refKw: 145, segment: "suv-mid", retention: 1.05, generations: { X253: 1.02, C253: 1.04, X254: 1.09, C254: 1.1 } },
    GLE: { baseNew: 78000, refKw: 200, segment: "suv-large", retention: 1.04, generations: { W166: 0.97, C292: 0.99, V167: 1.07, C167: 1.08 } },
    "V-klasa": { baseNew: 59000, refKw: 140, segment: "mpv", retention: 1.08, generations: { W638: 0.82, W447: 1.07 } },
  },
  Škoda: {
    Fabia: { baseNew: 19000, refKw: 66, segment: "city", retention: 1.04, generations: { "6Y": 0.86, "5J": 0.94, NJ: 1.02, PJ: 1.07 } },
    Octavia: { baseNew: 27000, refKw: 105, segment: "compact", retention: 1.06, generations: { "1U": 0.85, "1Z": 0.93, "5E": 1.02, NX: 1.06 } },
    Superb: { baseNew: 37000, refKw: 120, segment: "midsize", retention: 1.05, generations: { "3U": 0.84, "3T": 0.93, "3V": 1.03, "3Y": 1.08 } },
    Karoq: { baseNew: 29500, refKw: 100, segment: "suv-compact", retention: 1.04, generations: { NU: 1.03 } },
    Kodiaq: { baseNew: 39500, refKw: 125, segment: "suv-mid", retention: 1.05, generations: { NS: 1.03, PS: 1.08 } },
    Scala: { baseNew: 22500, refKw: 81, segment: "compact", retention: 1.01, generations: { NW1: 1.01 } },
    Kamiq: { baseNew: 22500, refKw: 81, segment: "suv-compact", retention: 1.03, generations: { NW4: 1.02 } },
    Enyaq: { baseNew: 42000, refKw: 150, segment: "suv-mid", retention: 0.92, generations: { NY: 1.0 } },
    Rapid: { baseNew: 18500, refKw: 70, segment: "compact", retention: 0.98, generations: { NH: 0.97 } },
  },
  Porsche: {
    Macan: { baseNew: 79000, refKw: 195, segment: "suv-mid", retention: 1.13, generations: { "95B": 1.05, XAB: 1.02 } },
    Cayenne: { baseNew: 104000, refKw: 250, segment: "suv-large", retention: 1.08, generations: { "9PA": 0.88, "92A": 0.98, E3: 1.07 } },
    "911": { baseNew: 145000, refKw: 283, segment: "sports", retention: 1.2, generations: { "996": 0.95, "997": 1.08, "991": 1.12, "992": 1.18 } },
    "718 Boxster": { baseNew: 78000, refKw: 220, segment: "sports", retention: 1.14, generations: { "982": 1.08 } },
    "718 Cayman": { baseNew: 77000, refKw: 220, segment: "sports", retention: 1.15, generations: { "982": 1.09 } },
    Panamera: { baseNew: 118000, refKw: 243, segment: "luxury", retention: 1.02, generations: { "970": 0.92, "971": 1.05, "976": 1.1 } },
    Taycan: { baseNew: 108000, refKw: 300, segment: "executive", retention: 0.87, generations: { Y1A: 0.98, Y1B: 1.02, Y1C: 1.02 } },
  },
  Toyota: {
    Yaris: { baseNew: 23500, refKw: 85, segment: "city", retention: 1.08, generations: { XP130: 0.98, XP210: 1.07 } },
    "Yaris Cross": { baseNew: 28500, refKw: 85, segment: "suv-compact", retention: 1.08, generations: { XP210: 1.06 } },
    Corolla: { baseNew: 30500, refKw: 90, segment: "compact", retention: 1.07, generations: { E210: 1.06 } },
    Auris: { baseNew: 25500, refKw: 90, segment: "compact", retention: 1.03, generations: { E15: 0.94, E18: 1.02 } },
    "C-HR": { baseNew: 32500, refKw: 90, segment: "suv-compact", retention: 1.06, generations: { AX10: 1.02, AX20: 1.07 } },
    RAV4: { baseNew: 43500, refKw: 130, segment: "suv-mid", retention: 1.09, generations: { XA40: 0.98, XA50: 1.07, XA60: 1.1 } },
    Aygo: { baseNew: 16500, refKw: 53, segment: "city", retention: 1.04 },
    "Aygo X": { baseNew: 19500, refKw: 53, segment: "city", retention: 1.05 },
  },
  Hyundai: {
    i10: { baseNew: 17000, refKw: 49, segment: "city", retention: 1.0 },
    i20: { baseNew: 21500, refKw: 74, segment: "city", retention: 1.0 },
    i30: { baseNew: 26500, refKw: 88, segment: "compact", retention: 1.01 },
    Tucson: { baseNew: 36500, refKw: 110, segment: "suv-mid", retention: 1.03, generations: { TL: 0.99, NX4: 1.06 } },
    Kona: { baseNew: 29500, refKw: 95, segment: "suv-compact", retention: 1.0, generations: { OS: 0.98, SX2: 1.05 } },
    "Santa Fe": { baseNew: 48500, refKw: 147, segment: "suv-large", retention: 0.98 },
    "IONIQ 5": { baseNew: 48000, refKw: 160, segment: "suv-mid", retention: 0.9 },
  },
  Kia: {
    Picanto: { baseNew: 16800, refKw: 49, segment: "city", retention: 1.0 },
    Rio: { baseNew: 21000, refKw: 74, segment: "city", retention: 1.0 },
    Ceed: { baseNew: 26500, refKw: 88, segment: "compact", retention: 1.01 },
    Sportage: { baseNew: 36500, refKw: 110, segment: "suv-mid", retention: 1.03, generations: { QL: 0.99, NQ5: 1.06 } },
    Niro: { baseNew: 34500, refKw: 104, segment: "suv-compact", retention: 0.99 },
    Sorento: { baseNew: 49500, refKw: 147, segment: "suv-large", retention: 0.99 },
    EV6: { baseNew: 51000, refKw: 168, segment: "suv-mid", retention: 0.9 },
  },
  Renault: {
    Clio: { baseNew: 21000, refKw: 67, segment: "city", retention: 0.98, generations: { IV: 0.95, V: 1.03 } },
    "Mégane": { baseNew: 27000, refKw: 85, segment: "compact", retention: 0.96, generations: { III: 0.92, IV: 1.0 } },
    Captur: { baseNew: 25500, refKw: 85, segment: "suv-compact", retention: 0.98 },
    Kadjar: { baseNew: 30000, refKw: 96, segment: "suv-mid", retention: 0.95 },
    Austral: { baseNew: 35500, refKw: 116, segment: "suv-mid", retention: 0.98 },
    Talisman: { baseNew: 35000, refKw: 118, segment: "midsize", retention: 0.93 },
  },
  Peugeot: {
    "208": { baseNew: 22500, refKw: 74, segment: "city", retention: 0.98, generations: { A9: 0.94, P21: 1.05 } },
    "2008": { baseNew: 27500, refKw: 81, segment: "suv-compact", retention: 0.99, generations: { A94: 0.94, P24: 1.05 } },
    "308": { baseNew: 28500, refKw: 96, segment: "compact", retention: 0.97, generations: { T9: 0.97, P5: 1.05 } },
    "3008": { baseNew: 36500, refKw: 96, segment: "suv-mid", retention: 1.01, generations: { P84: 1.03, P64: 1.07 } },
    "5008": { baseNew: 40500, refKw: 110, segment: "suv-mid", retention: 0.99 },
    "508": { baseNew: 39500, refKw: 118, segment: "midsize", retention: 0.95 },
  },
  Opel: {
    Corsa: { baseNew: 21000, refKw: 74, segment: "city", retention: 0.96 },
    Astra: { baseNew: 28000, refKw: 96, segment: "compact", retention: 0.95 },
    Insignia: { baseNew: 35500, refKw: 125, segment: "midsize", retention: 0.92 },
    Mokka: { baseNew: 27500, refKw: 88, segment: "suv-compact", retention: 0.96 },
    Grandland: { baseNew: 35500, refKw: 96, segment: "suv-mid", retention: 0.95 },
  },
  Ford: {
    Fiesta: { baseNew: 20500, refKw: 70, segment: "city", retention: 0.96 },
    Focus: { baseNew: 28500, refKw: 92, segment: "compact", retention: 0.97 },
    Mondeo: { baseNew: 36500, refKw: 110, segment: "midsize", retention: 0.93 },
    Puma: { baseNew: 27500, refKw: 92, segment: "suv-compact", retention: 0.99 },
    Kuga: { baseNew: 36500, refKw: 110, segment: "suv-mid", retention: 0.97 },
  },
  Mazda: {
    Mazda2: { baseNew: 21500, refKw: 66, segment: "city", retention: 1.0 },
    Mazda3: { baseNew: 28500, refKw: 90, segment: "compact", retention: 1.03 },
    Mazda6: { baseNew: 37500, refKw: 121, segment: "midsize", retention: 1.01 },
    "CX-30": { baseNew: 31500, refKw: 90, segment: "suv-compact", retention: 1.03 },
    "CX-5": { baseNew: 39500, refKw: 121, segment: "suv-mid", retention: 1.04 },
    "CX-60": { baseNew: 53000, refKw: 187, segment: "suv-large", retention: 0.98 },
  },
  Volvo: {
    V40: { baseNew: 31500, refKw: 88, segment: "compact", retention: 0.98 },
    V60: { baseNew: 49500, refKw: 140, segment: "midsize", retention: 1.0 },
    XC40: { baseNew: 42500, refKw: 115, segment: "suv-compact", retention: 1.02 },
    XC60: { baseNew: 59500, refKw: 145, segment: "suv-mid", retention: 1.03 },
    XC90: { baseNew: 82000, refKw: 173, segment: "suv-large", retention: 1.01 },
  },
  Dacia: {
    Sandero: { baseNew: 16200, refKw: 67, segment: "city", retention: 1.05 },
    Duster: { baseNew: 22500, refKw: 85, segment: "suv-compact", retention: 1.07 },
    Jogger: { baseNew: 21500, refKw: 81, segment: "mpv", retention: 1.04 },
    Spring: { baseNew: 19500, refKw: 48, segment: "city", retention: 0.88 },
  },
  Tesla: {
    "Model 3": { baseNew: 43500, refKw: 208, segment: "midsize", retention: 0.92, generations: { I: 0.95, Highland: 1.05 } },
    "Model Y": { baseNew: 47500, refKw: 220, segment: "suv-mid", retention: 0.94, generations: { I: 0.97, Juniper: 1.06 } },
    "Model S": { baseNew: 94000, refKw: 380, segment: "executive", retention: 0.87 },
    "Model X": { baseNew: 102000, refKw: 380, segment: "suv-large", retention: 0.87 },
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

function extractAgeYears(input: MarketValuationInput, refDate: Date): number {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth() + 1;
  if (input.date && /^\d{4}/.test(input.date)) {
    const year = Number(input.date.slice(0, 4));
    const month = Number(input.date.slice(5, 7)) || 6;
    return Math.max(0.2, Math.min(35, refYear - year + (refMonth - month) / 12));
  }
  if (input.year && input.year >= 1985 && input.year <= refYear + 1) {
    return Math.max(0.2, Math.min(35, refYear - input.year + (refMonth - 6) / 12));
  }
  const families = modelFor(input.make, input.model)?.generations;
  const gen = input.generation?.trim();
  const matched = families?.find(f => gen && (f.codes.includes(gen) || f.codes.join("/") === gen));
  const yearMatch = matched?.description.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) {
    const approx = Number(yearMatch[1]) + 2;
    return Math.max(0.5, Math.min(30, refYear - approx));
  }
  return 5;
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

const EQUIPMENT_RULES: EquipRule[] = [
  { slot: "pkg-msport", label: "M Sport paket", value: 1450, pattern: /m[\s-]*sport|bmw-m-sport/i },
  { slot: "pkg-sline", label: "S-Line", value: 1350, pattern: /s[\s-]*line|audi-s-line/i },
  { slot: "pkg-amg", label: "AMG Line", value: 1500, pattern: /amg[\s-]*line|mercedes-amg-line/i },
  { slot: "pkg-rline", label: "R-Line", value: 1150, pattern: /r[\s-]*line|vw-r-line/i },
  { slot: "pkg-perf", label: "RS / GTI / GTD", value: 1800, pattern: /(?:^|[|\s·•-])(rs|gti|gtd|gti\s*\/\s*gtd|skoda-rs|rs paket|cupra vz)(?=$|[|\s·•-])/i },
  { slot: "pkg-lk", label: "Laurin & Klement", value: 1400, pattern: /laurin|l&k/i },
  { slot: "pkg-chrono", label: "Sport Chrono", value: 1600, pattern: /sport[\s-]*chrono|porsche-sport-chrono/i },
  { slot: "pkg-trim-mid", label: "Sport / GT / ST-Line paket", value: 750, pattern: /r-design|gt[\s-]*line|st[\s-]*line|n[\s-]*line|fr paket|sportline|veloce|f sport|gs line|monte carlo/i },

  { slot: "lights-top", label: "Matrix / Laser / MULTIBEAM LED", value: 750, pattern: /laserlight|hd matrix|matrix led|multibeam|digital light|iq\.?light|pdls|intellilux|audi-matrix-led|vw-iq-light|skoda-matrix-led/i },
  { slot: "lights-led", label: "LED / Adaptivna LED svjetla", value: 300, pattern: /led svjetla|adaptivna led|bmw-adaptive-led/i },

  { slot: "roof-pano", label: "Panorama stakleni krov", value: 650, pattern: /panoram|stakleni krov|porsche-panorama/i },
  { slot: "webasto", label: "Webasto grijanje", value: 550, pattern: /webasto|neovisno grijanje/i },
  { slot: "audio-top", label: "Harman Kardon / Burmester / B&O", value: 500, pattern: /harman[\s-]*kardon|burmester|bang\s*&\s*olufsen|bowers\s*&\s*wilkins|canton|dynaudio|bose|meridian|mark levinson|focal|beats|sennheiser|jbl/i },
  { slot: "cockpit", label: "Virtual / Live Cockpit Pro", value: 450, pattern: /virtual[\s-]*cockpit|live[\s-]*cockpit|digital[\s-]*cockpit|digitalni kokpit|mbux|widescreen|openr/i },
  { slot: "susp-air", label: "Zračni ovjes / DCC / PASM", value: 800, pattern: /zračni ovjes|airmatic|adaptive air|pasm|\bdcc\b|adaptivni ovjes/i },
  { slot: "cam-360", label: "360° kamera", value: 350, pattern: /360°|area[\s-]*view|parking assistant plus|around view/i },
  { slot: "hud", label: "Head-Up Display", value: 350, pattern: /head-up|\bhud\b|projekcijski zaslon/i },
  { slot: "seats-vent", label: "Grijanje i ventilacija sjedala", value: 350, pattern: /ventilacija sjedala|hlađenje sjedala|ventilirana/i },
  { slot: "seats-heat", label: "Grijana sjedala", value: 180, pattern: /grijan[ae]\s+sjedala|grijanje volana/i },
  { slot: "tow-elec", label: "Električna kuka", value: 300, pattern: /električna kuka|kuka na izvlačenje/i },
  { slot: "tow-std", label: "Kuka za vuču", value: 180, pattern: /kuka za vuču/i },
  { slot: "acc", label: "Adaptivni tempomat (ACC)", value: 260, pattern: /adaptivni tempomat|\bacc\b|distronic|travel assist|pilot assist|autopilot/i },
  { slot: "leather-sport", label: "Kožna / sportska sjedala", value: 280, pattern: /kožna sjedala|nappa|m sport sjedala|sportska sjedala|bmw-sport-seats|ergoactive/i },
  { slot: "keyless", label: "Keyless / Pristup bez ključa", value: 200, pattern: /keyless|kessy|pristup bez ključa/i },
  { slot: "tailgate", label: "Električna vrata prtljažnika", value: 200, pattern: /električna vrata prtljažnika/i },
];

export function evaluateMarketPrice(input: MarketValuationInput): MarketValuationResult {
  const refDate = input.referenceDate ?? new Date();
  const kw = Math.max(25, Number.isFinite(input.kw) && input.kw > 0 ? input.kw : 100);
  const km = Math.max(0, Number.isFinite(input.km) ? input.km : 100000);
  const generation = input.generation || chassisFromTitle(input.make, input.model, input.title ?? "");
  const spec = resolveModelSpec(input.make, input.model, kw, input.bodyType);
  const ageYears = extractAgeYears(input, refDate);
  const fuelKind = normalizeFuel(input.fuel, input.variant, input.title);
  const tokens = collectTokens(input);

  // 1. Base Reference & Chassis Generation Curves
  const genMult = generationFactor(input.make, input.model, generation, spec);
  const powerRatio = Math.max(0.55, Math.min(2.2, kw / spec.refKw));
  const powerScale = Math.pow(powerRatio, 0.44);

  let fuelNewScale = 1.0;
  let fuelAgeScale = 1.0;
  if (fuelKind === "diesel") {
    fuelNewScale = 1.035;
    fuelAgeScale = spec.segment === "city" ? 0.98 : ageYears > 2 ? 1.03 : 1.01;
  } else if (fuelKind === "phev") {
    fuelNewScale = 1.05;
    fuelAgeScale = ageYears > 3 ? 0.86 : 0.94;
  } else if (fuelKind === "hybrid") {
    fuelNewScale = 1.05;
    fuelAgeScale = input.make === "Toyota" || input.make === "Lexus" ? 1.06 : 1.0;
  } else if (fuelKind === "lpg") {
    fuelNewScale = 1.01;
    fuelAgeScale = ageYears > 5 ? 1.02 : 0.99;
  } else if (fuelKind === "ev") {
    fuelNewScale = 1.12;
    fuelAgeScale = ageYears > 2 ? Math.max(0.74, 0.92 - (ageYears - 2) * 0.028) : 0.95;
  }

  const round50 = (n: number) => Math.max(500, Math.round(n / 50) * 50);

  const estimatedNewPriceHr = Math.round((spec.baseNew * genMult * powerScale * fuelNewScale) / 100) * 100;
  const retention = spec.retention ?? BRAND_PROFILES[input.make]?.retention ?? 1.0;
  const curveFactor = ageRetentionMultiplier(ageYears, spec.segment, retention);
  const segFloor = Math.max(550, SEGMENT_DEFAULTS[spec.segment].floor * (BRAND_PROFILES[input.make]?.tier ?? 1) * (ageYears > 22 ? 0.65 : 0.9));

  const baseModelValueEur = round50(Math.max(segFloor, estimatedNewPriceHr * curveFactor * fuelAgeScale));

  const factors: ValuationFactor[] = [];

  // 2. Non-Linear Mileage Elasticity Curve
  const kmPerYear = fuelKind === "diesel" ? 18500 : 13500;
  const expectedKm = Math.round(Math.max(12000, ageYears * kmPerYear));
  const kmDiff = km - expectedKm;

  let mileagePct = 0;
  // Mid-band relative adjustment
  if (kmDiff < 0) {
    // Under expected km: reward up to +9%
    mileagePct += Math.min(0.095, (-kmDiff / 1000) * 0.00085);
  } else {
    // Over expected km: penalize linearly in mid-band
    mileagePct -= Math.min(0.16, (kmDiff / 1000) * 0.0007);
  }
  // Low-mileage threshold bonus (< 75.000 km)
  if (km < 75000 && ageYears >= 2) {
    const lowKmStrength = (75000 - km) / 75000;
    mileagePct += lowKmStrength * Math.min(0.06, 0.02 + ageYears * 0.006);
  }
  // Steeper depreciation thresholds above 180.000 km and 240.000 km
  if (km > 180000) {
    const band1 = Math.min(km - 180000, 60000) / 1000;
    mileagePct -= band1 * 0.00085;
  }
  if (km > 240000) {
    const band2 = Math.min(km - 240000, 140000) / 1000;
    mileagePct -= band2 * 0.0012;
  }
  mileagePct = Math.max(-0.34, Math.min(0.14, mileagePct));

  const mileageImpactEur = Math.round((baseModelValueEur * mileagePct) / 50) * 50;
  const postMileageValue = Math.max(500, baseModelValueEur + mileageImpactEur);
  if (Math.abs(mileageImpactEur) >= 150) {
    factors.push({
      id: "mileage",
      label:
        mileageImpactEur > 0
          ? km < 75000
            ? "Niska kilometraža (< 75.000 km)"
            : "Kilometraža ispod prosjeka za godište"
          : km > 180000
          ? "Kilometraža iznad 180.000 km"
          : "Kilometraža iznad prosjeka za godište",
      impactEur: mileageImpactEur,
    });
  }

  // 3. Equipment & Drivetrain Valuation Matrix
  const eqWeight = ageEquipmentWeight(ageYears);
  let rawEquipmentValue = 0;
  const matchedLabels: string[] = [];
  const matchedSlots = new Set<string>();

  const isAuto = /automat/i.test(input.gear) || /\b(dsg|pdk|steptronic|tiptronic|s tronic|multitronic|7g|9g|8hp)\b/i.test(tokens);
  if (isAuto) {
    rawEquipmentValue += 1250;
    matchedLabels.push("Automatski mjenjač");
  }

  const isAwd =
    /4×4|4x4|awd|4wd/i.test(input.drive ?? "") ||
    /\b(xdrive|quattro|4matic|4motion|allgrip|all4|q4|e-4orce|awd-i|sync|symmetrical awd)\b/i.test(tokens);
  if (isAwd) {
    rawEquipmentValue += 1350;
    matchedLabels.push("4×4 pogon");
  }

  for (const rule of EQUIPMENT_RULES) {
    if (matchedSlots.has(rule.slot)) continue;
    // Avoid double-counting base LED if Matrix/Laser already matched, or base seats if ventilated matched, or base tow if electric tow matched
    if (rule.slot === "lights-led" && matchedSlots.has("lights-top")) continue;
    if (rule.slot === "seats-heat" && matchedSlots.has("seats-vent")) continue;
    if (rule.slot === "tow-std" && matchedSlots.has("tow-elec")) continue;
    if (rule.pattern.test(tokens)) {
      matchedSlots.add(rule.slot);
      rawEquipmentValue += rule.value;
      matchedLabels.push(rule.label);
    }
  }

  const equipmentValueEur = Math.round((rawEquipmentValue * eqWeight) / 50) * 50;
  if (equipmentValueEur >= 150) {
    const head = matchedLabels.slice(0, 2).join(", ");
    const rest = matchedLabels.length > 2 ? ` + ${matchedLabels.length - 2} stavki` : "";
    factors.push({
      id: "equipment",
      label: `Oprema i pogon (${head}${rest})`,
      impactEur: equipmentValueEur,
    });
  }

  const preTrustValue = postMileageValue + equipmentValueEur;

  // 4. Croatian Market, Tax & Trust Factors
  const flagSet = new Set(input.flags ?? []);
  const historyText = (input.history ?? []).join(" | ");
  const hasCvh = flagSet.has("cvh");
  const isFirstOwner = Boolean(input.firstOwner) || /1\.\s*vlasnik|prvi vlasnik/i.test(historyText);
  const hasServiceBook = Boolean(input.serviceBook) || /servisn/i.test(historyText);
  const isVerifiedDealer = Boolean(input.verified || input.dealer);
  const isArriving = flagSet.has("dolazak");
  const hasPdv = flagSet.has("pdv");
  const hasKupac = flagSet.has("kupac");

  let trustImpactSum = 0;
  const trustTags: string[] = [];
  const addTrustFactor = (id: string, label: string, pct: number, shortTag: string) => {
    const eur = Math.round((preTrustValue * pct) / 50) * 50;
    if (eur !== 0) {
      trustImpactSum += eur;
      trustTags.push(shortTag);
      factors.push({ id, label, impactEur: eur });
    }
  };

  if (hasCvh) addTrustFactor("cvh", "Potvrđeni kilometri (CVH)", 0.035, "CVH");
  if (isFirstOwner) addTrustFactor("owner", "1. vlasnik", 0.03, "1. vlasnik");
  if (hasServiceBook) addTrustFactor("service", "Servisna knjiga", 0.025, "Servisna");
  if (isVerifiedDealer) addTrustFactor("dealer", "Verificirana autokuća (jamstvo)", 0.025, "Autokuća");
  if (isArriving) addTrustFactor("arriving", "Vozilo u dolasku (čekanje isporuke)", -0.04, "U dolasku");
  if (hasPdv) addTrustFactor("pdv", "Sustav PDV-a (R1 račun)", 0.02, "PDV (R1)");
  else if (hasKupac) addTrustFactor("kupac", "Na ime kupca (bez pristojbe)", 0.015, "Na ime kupca");

  const clampedTrust = Math.max(-preTrustValue * 0.08, Math.min(preTrustValue * 0.09, trustImpactSum));
  const historyBonusEur = Math.round(clampedTrust / 50) * 50;
  const medianMarketPrice = Math.max(500, preTrustValue + historyBonusEur);
  const excellentMax = round50(medianMarketPrice * 0.94);
  const goodMax = round50(medianMarketPrice * 0.99);
  const fairMin = round50(medianMarketPrice * 0.945);
  const fairMax = round50(medianMarketPrice * 1.055);
  const highMax = round50(medianMarketPrice * 1.13);

  const asking = input.askingPrice && input.askingPrice > 0 ? input.askingPrice : medianMarketPrice;
  const deltaEur = Math.round(asking - medianMarketPrice);
  const deltaPercent = Math.round(((asking - medianMarketPrice) / medianMarketPrice) * 1000) / 10;

  const rating = classifyRating(asking, excellentMax, goodMax, fairMax, highMax);

  // Top 3-5 human-readable factors sorted by absolute EUR impact
  const topFactors = factors
    .sort((a, b) => Math.abs(b.impactEur) - Math.abs(a.impactEur))
    .slice(0, 5);

  // Estimate PPMV & German import landed cost comparison
  const approxCo2 = Number.isFinite(input.co2) && (input.co2 ?? 0) > 0
    ? Number(input.co2)
    : calculateCo2({
        fuel: fuelKind === "ev" ? "Električni" : fuelKind === "phev" ? "Plug-in hibrid" : fuelKind === "hybrid" ? "Hibrid" : fuelKind === "lpg" ? "LPG" : fuelKind === "diesel" ? "Dizel" : "Benzin",
        kw,
        year: input.year,
        date: input.date,
        gear: input.gear,
        drive: input.drive,
        bodyType: input.bodyType,
        variant: input.variant,
        title: input.title,
      });
  const regYear = input.date && /^\d{4}/.test(input.date)
    ? Number(input.date.slice(0, 4))
    : input.year ?? Math.round(refDate.getFullYear() - ageYears);
  const regMonth = input.date && /^\d{4}-\d{2}/.test(input.date) ? input.date.slice(5, 7) : "06";
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
    baseModelValueEur,
    mileageImpactEur,
    equipmentValueEur,
    equipmentCount: matchedLabels.length,
    historyBonusEur,
    sampleCount,
    breakdown,
    ageYears: Math.round(ageYears * 10) / 10,
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

function classifyRating(
  asking: number,
  excellentMax: number,
  goodMax: number,
  fairMax: number,
  highMax: number,
): PriceRatingTier {
  if (asking <= excellentMax) return { bars: 5, label: "Odlična cijena", type: "good", rank: 0 };
  if (asking <= goodMax) return { bars: 4, label: "Dobra cijena", type: "good", rank: 1 };
  if (asking <= fairMax) return { bars: 3, label: "Fer cijena", type: "fair", rank: 2 };
  if (asking <= highMax) return { bars: 2, label: "Viša cijena", type: "high", rank: 3 };
  return { bars: 1, label: "Visoka cijena", type: "high", rank: 4 };
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
  if (Math.abs(deltaPercent) <= 3) {
    return { text: "U okviru tržišnog raspona", tone: "neutral" };
  }
  if (deltaEur < 0) {
    return { text: `${formatEuro(Math.abs(deltaEur))} ispod prosjeka HR`, tone: "good" };
  }
  return { text: `+${formatEuro(deltaEur)} iznad prosjeka HR`, tone: "high" };
}
