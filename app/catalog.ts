import type { BoostTier } from "./listing-boost";
import { evaluateVehiclePrice, type MarketValuationResult, type PriceRatingTier } from "../src/lib/price-engine";
import type { WorkingHours } from "../src/data/working-hours";
import { buildMockVehicles } from "../src/data/mock-vehicles";
import photoData from "./photos.json";
import importedListings from "../data/imported-listings.json";

export const cities = [
  "Zagreb",
  "Osijek",
  "Slavonski Brod",
  "Split",
  "Rijeka",
  "Varaždin",
  "Zadar",
  "Pula",
  "Karlovac",
  "Sisak",
  "Šibenik",
  "Dubrovnik",
  "Čakovec",
  "Koprivnica",
  "Bjelovar",
  "Vinkovci",
];

export const countyByCity: Readonly<Record<string, string>> = {
  Zagreb: "Grad Zagreb",
  Osijek: "Osječko-baranjska",
  "Slavonski Brod": "Brodsko-posavska",
  Split: "Splitsko-dalmatinska",
  Rijeka: "Primorsko-goranska",
  Varaždin: "Varaždinska",
  Zadar: "Zadarska",
  Pula: "Istarska",
  Karlovac: "Karlovačka",
  Sisak: "Sisačko-moslavačka",
  Šibenik: "Šibensko-kninska",
  Dubrovnik: "Dubrovačko-neretvanska",
  Čakovec: "Međimurska",
  Koprivnica: "Koprivničko-križevačka",
  Bjelovar: "Bjelovarsko-bilogorska",
  Vinkovci: "Vukovarsko-srijemska",
};

export const fuels = ["Dizel", "Benzin", "Hibrid", "Struja"] as const;
export type Fuel = typeof fuels[number];
export const gears = ["Automatski", "Ručni"] as const;
export const bodyTypes = [
  "Hatchback / Kompakt",
  "Limuzina",
  "Karavan",
  "SUV / Terenac",
  "Coupé",
  "Cabrio / Roadster",
  "Monovolumen (MPV)",
  "Kombi / Dostavno",
  "Pick-up",
] as const;
export type BodyType = typeof bodyTypes[number];
export const quick = {
  kupac: "Na ime kupca",
  pdv: "Sustav PDV-a (R1)",
  dolazak: "Vozilo u dolasku",
  cvh: "Potvrđeni km (CVH)",
  jamstvo: "Pisano jamstvo 12 mj.",
} as const;
export type Flag = keyof typeof quick;
export const flags = Object.keys(quick) as Flag[];

export const groups = ["Sigurnost", "Udobnost", "Multimedija", "Eksterijer"] as const;
export type Group = typeof groups[number];
export type Equipment = Record<Group, string[]>;
export const equipmentOptions: Equipment = {
  Sigurnost: ["ABS / ESP", "Adaptivni tempomat", "Asistent trake", "Nadzor mrtvog kuta", "ISOFIX", "Kamera za vožnju unatrag"],
  Udobnost: ["Automatska klima", "Grijana sjedala", "Sportska sjedala", "Električna sjedala", "Keyless", "Trozonska klima"],
  Multimedija: ["Navigacija", "Apple CarPlay", "Android Auto", "Digitalni kokpit", "Harman Kardon", "Bang & Olufsen"],
  Eksterijer: ["LED svjetla", "Matrix LED", "Aluminijski naplatci", "Panoramski krov", "Metallic boja"],
};
export function emptyEquipment(): Equipment {
  return { Sigurnost: [], Udobnost: [], Multimedija: [], Eksterijer: [] };
}

export type Photo = { src: string; preview?: string; backup?: string; credit?: string; link?: string; license?: string; licenseUrl?: string };
export type Vehicle = {
  id: string; make: string; model: string; title: string; trim: string; price: number;
  generation?: string; variant?: string; bodyType?: string;
  date: string; listedAt?: string; km: number; kw: number; cc: number; co2: number; fuel: Fuel;
  gear: typeof gears[number]; drive: string; vin: string; city: string; seller: string;
  dealer: boolean; verified: boolean; phone: string; email?: string; flags: Flag[];
  doors?: number; seats?: number; cylinders?: number; color?: string; colorFinish?: string; registrationUntil?: string; ownership?: string;
  postalCode?: string; county?: string; sellerWorkingHours?: WorkingHours; dealershipId?: string; sellerAddress?: string; sellerHours?: string; sellerRating?: { score: number; reviews: number };
  photos: Photo[]; photoCount?: number; previousPriceEur?: number; isFeatured?: boolean; isBoosted?: boolean; boostTier?: BoostTier; boostExpiresAt?: string | null; equipment: Equipment; makeEquipment?: string[]; catalogEquipment?: string[]; contactAvailable?: boolean; boostedUntil?: number | null; range?: [number, number]; demo?: boolean; history?: string[]; sellerNote?: string;
};

const photos = photoData as Record<string, Photo[]>;
export function modelPhotos(key: string) { return photos[key] ?? []; }
export function restoreListingPhotos(vehicle: Vehicle): Vehicle {
  const restored = (Array.isArray(vehicle.photos) ? vehicle.photos : []).flatMap(photo => {
    if (typeof photo?.src !== "string") return [];
    const match = /^\/cars\/([a-z0-9-]+)-(\d+)\.webp$/.exec(photo.src);
    if (!match || !photos[match[1]]) return [photo];
    const replacement = photos[match[1]][Number(match[2]) - 1];
    return replacement ? [replacement] : [];
  });
  return { ...vehicle, photos: restored };
}
const num = new Intl.NumberFormat("hr-HR", { useGrouping: "always" });
const decimals = new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
export const number = (value: number) => num.format(value);
export const euro = (value: number, cents = false) => (cents ? decimals : num).format(value) + " €";
export const registered = (date: string) => date.slice(5, 7) + "/" + date.slice(0, 4);
export const power = (kw: number) => kw + " kW (" + Math.round(kw * 1.35962) + " KS)";
export function marketValuation(vehicle: Vehicle): MarketValuationResult {
  return evaluateVehiclePrice(vehicle);
}
export function rating(vehicle: Vehicle): PriceRatingTier {
  return evaluateVehiclePrice(vehicle).rating;
}

export const vehicles: Vehicle[] = [...buildMockVehicles(modelPhotos), ...(importedListings as Vehicle[])];

export function taxStatus(vehicle: Vehicle) {
  return [vehicle.flags.includes("kupac") && quick.kupac, vehicle.flags.includes("pdv") && quick.pdv].filter(Boolean).join(" · ") || "Prema dokumentaciji";
}
