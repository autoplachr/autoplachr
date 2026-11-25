import photoData from "./photos.json";

import type { CAR_CATALOG } from "../src/data/car-catalog";

export const cities = ["Zagreb", "Osijek", "Slavonski Brod", "Split", "Rijeka", "Varaždin"];
export const countyByCity: Readonly<Record<string, string>> = {
  Zagreb: "Grad Zagreb",
  Osijek: "Osječko-baranjska",
  "Slavonski Brod": "Brodsko-posavska",
  Split: "Splitsko-dalmatinska",
  Rijeka: "Primorsko-goranska",
  Varaždin: "Varaždinska",
};
export const fuels = ["Dizel", "Benzin", "Hibrid", "Struja"] as const;
export type Fuel = typeof fuels[number];
export const gears = ["Automatski", "Ručni"] as const;
export const quick = {
  kupac: "Na ime kupca",
  pdv: "Sustav PDV-a (R1)",
  dolazak: "Vozilo u dolasku",
  cvh: "Potvrđeni km (CVH)",
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

export type Photo = { src: string; backup?: string; credit?: string; link?: string; license?: string; licenseUrl?: string };
export type Vehicle = {
  id: string; make: string; model: string; title: string; trim: string; price: number;
  generation?: string; variant?: string;
  date: string; km: number; kw: number; cc: number; co2: number; fuel: Fuel;
  gear: typeof gears[number]; drive: string; vin: string; city: string; seller: string;
  dealer: boolean; verified: boolean; phone: string; email?: string; flags: Flag[];
  photos: Photo[]; equipment: Equipment; makeEquipment?: string[]; range?: [number, number]; demo?: boolean; history?: string[]; sellerNote?: string;
};

const photos = photoData as Record<string, Photo[]>;
export function modelPhotos(key: string) { return photos[key] ?? []; }
export function restoreListingPhotos(vehicle: Vehicle): Vehicle {
  const restored = (vehicle.photos ?? []).flatMap(photo => {
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
export function rating(vehicle: Vehicle) {
  if (!vehicle.range) return null;
  if (vehicle.price <= vehicle.range[0]) return { label: "Odlična cijena", type: "good", rank: 0 } as const;
  if (vehicle.price <= vehicle.range[1]) return { label: "Fer cijena", type: "fair", rank: 1 } as const;
  return { label: "Viša cijena", type: "high", rank: 2 } as const;
}

const seedMakeEquipment: Record<string, string[]> = {
  g20: ["bmw-m-sport", "bmw-adaptive-led", "bmw-live-cockpit", "bmw-harman-kardon", "bmw-sport-seats"],
  a4: ["audi-s-line", "audi-matrix-led", "audi-virtual-cockpit"],
  golf: ["vw-iq-light", "vw-digital-cockpit-pro"],
  c220: ["mercedes-amg-line", "mercedes-mbux", "mercedes-burmester"],
  macan: ["porsche-sport-chrono", "porsche-panorama"],
  octavia: ["skoda-rs", "skoda-matrix-led", "skoda-canton"],
  a6: ["audi-s-line", "audi-bang-olufsen"],
  passat: ["vw-r-line"],
  tiguan: ["vw-area-view"],
  f30: ["bmw-sport-seats"],
  "118": ["bmw-m-sport", "bmw-sport-seats"],
  e220: ["mercedes-widescreen"],
  touring: ["bmw-live-cockpit"],
  passatgte: [],
};

const seedHistory: Record<string, string[]> = {
  g20: ["1. vlasnik", "Servisna knjiga"],
  a4: ["Servisna knjiga"],
  golf: ["1. vlasnik"],
  c220: ["Servisna knjiga", "Garancija 12 mj."],
  macan: ["Servisni računi", "Dva ključa"],
  octavia: ["Servisna knjiga"],
  a6: ["Servisna knjiga"],
  passat: ["Drugi vlasnik"],
  tiguan: ["Servisna knjiga"],
  f30: ["Servisni računi"],
  "118": ["Servisna knjiga", "Dva ključa"],
  e220: ["Servisna knjiga"],
  touring: ["1. vlasnik"],
  passatgte: ["Kabel za punjenje"],
};

type Seed = [id: string, key: string, make: keyof typeof CAR_CATALOG, model: string, generation: string, variant: string, title: string, trim: string, price: number,
  date: string, km: number, kw: number, cc: number, co2: number, city: number, seller: string,
  flag: Flag[], range: [number, number], drive?: string, gear?: Vehicle["gear"], fuel?: Fuel];
const seed: Seed[] = [
  ["g20", "bmw-g20", "BMW", "Serija 3", "G20", "320d xDrive", "BMW 320d G20 M-Sport xDrive", "M Sport · Harman Kardon · LED", 24900, "2021-05", 114500, 140, 1995, 138, 0, "Sjever Auto", ["pdv","cvh"], [25200,26900], "4×4"],
  ["a4", "audi-a4", "Audi", "A4", "B9", "40 TDI S line", "Audi A4 B9 40 TDI S line", "S-Line · Matrix LED · Virtual Cockpit", 22750, "2020-09", 132000, 140, 1968, 118, 4, "Kvarner Motors", ["kupac"], [21800,23900]],
  ["golf", "golf-mk8", "Volkswagen", "Golf", "CD", "GTD", "Volkswagen Golf 8 (CD) GTD", "GTD · IQ.Light · Digital Cockpit Pro", 23490, "2021-11", 98500, 147, 1968, 137, 1, "Drava Auto", ["dolazak","cvh"], [23500,25400]],
  ["c220", "mercedes-c-class", "Mercedes-Benz", "C-klasa", "W206", "220 d AMG Line", "Mercedes-Benz C 220 d W206 AMG Line", "AMG Line · Burmester · MBUX", 32900, "2022-03", 74600, 147, 1993, 125, 3, "Jadran Auto", ["pdv"], [30200,33900], "Stražnji"],
  ["macan", "porsche-macan", "Porsche", "Macan", "95B", "S", "Porsche Macan S 95B", "Sport Chrono · PDK · Panoramski krov", 56900, "2020-07", 88900, 260, 2995, 204, 0, "Sjever Auto", ["pdv"], [49500,55000], "4×4", "Automatski", "Benzin"],
  ["octavia", "skoda-octavia", "Škoda", "Octavia", "NX", "RS 2.0 TSI", "Škoda Octavia RS NX 2.0 TSI", "RS · Canton · Matrix LED", 26900, "2022-06", 78400, 180, 1984, 163, 5, "Varaždin Auto", ["kupac","cvh"], [26000,28000], "Prednji", "Automatski", "Benzin"],
  ["a6", "audi-a6", "Audi", "A6", "C8", "50 TDI quattro", "Audi A6 C8 50 TDI quattro", "S-Line · Bang & Olufsen · 360°", 36900, "2019-10", 141000, 210, 2967, 147, 0, "Sjever Auto", ["pdv"], [34500,36700], "4×4"],
  ["passat", "volkswagen-passat", "Volkswagen", "Passat", "B8", "2.0 TDI R-Line", "Volkswagen Passat B8 2.0 TDI R-Line", "R-Line · Discover Pro · ACC", 19990, "2020-04", 148700, 110, 1968, 113, 2, "", ["cvh"], [20100,21700]],
  ["tiguan", "volkswagen-tiguan", "Volkswagen", "Tiguan", "AD", "2.0 TDI 4Motion", "Volkswagen Tiguan AD 2.0 TDI 4Motion", "Elegance · Area View · 4Motion", 27450, "2021-08", 105200, 110, 1968, 162, 5, "Varaždin Auto", ["dolazak","pdv"], [26400,28500], "4×4"],
  ["f30", "bmw-f30", "BMW", "Serija 3", "F30", "320d", "BMW 320d F30 Sport Line", "Sport Line · LED · Navigacija", 15400, "2017-06", 183200, 140, 1995, 119, 2, "", ["cvh"], [14800,15800], "Stražnji", "Ručni"],
  ["118", "bmw-1-series", "BMW", "Serija 1", "F20", "118d M Sport", "BMW 118d F20 M-Sport", "M Sport · Aluminijski naplatci · LED", 14850, "2018-03", 139400, 110, 1995, 111, 1, "", [], [14900,16100], "Stražnji", "Ručni"],
  ["e220", "mercedes-e-class", "Mercedes-Benz", "E-klasa", "W213", "220 d Avantgarde", "Mercedes-Benz E 220 d W213 Avantgarde", "Avantgarde · Widescreen · LED", 25900, "2019-08", 156900, 143, 1950, 129, 4, "Kvarner Motors", ["pdv","kupac"], [24700,26900], "Stražnji"],
  ["touring", "bmw-touring", "BMW", "Serija 3", "G21", "320d", "BMW 320d G21 Touring", "Sport Line · Live Cockpit · LED", 23900, "2020-02", 129650, 140, 1995, 125, 3, "Jadran Auto", ["dolazak","kupac"], [23100,24800], "Stražnji"],
  ["passatgte", "passat-gte", "Volkswagen", "Passat", "B8", "GTE", "Volkswagen Passat B8 GTE Variant", "GTE · Adaptivni tempomat · CarPlay", 22400, "2021-12", 95400, 160, 1395, 32, 0, "", ["cvh"], [20900,22200], "Prednji", "Automatski", "Hibrid"],
];
export const vehicles: Vehicle[] = seed.map(([
  id, key, make, model, generation, variant, title, trim, price, date, km, kw, cc, co2, city, seller, flags, range,
  drive = "Prednji", gear = "Automatski", fuel = "Dizel",
], index) => ({
  id, make, model, generation, variant, title, trim, price, date, km, kw, cc, co2, city: cities[city], drive, gear, fuel,
  history: seedHistory[id], makeEquipment: seedMakeEquipment[id],
  vin: "EXAMPLE0000" + String(100001 + index), seller, dealer: Boolean(seller), verified: Boolean(seller),
  phone: "+385 00 000 000", flags, range, demo: true, photos: modelPhotos(key),
  equipment: {
    Sigurnost: ["ABS / ESP", "ISOFIX", index % 2 ? "Adaptivni tempomat" : "Kamera za vožnju unatrag"],
    Udobnost: ["Automatska klima", "Grijana sjedala"],
    Multimedija: ["Navigacija", trim.includes("Harman") ? "Harman Kardon" : trim.includes("Bang") ? "Bang & Olufsen" : "Apple CarPlay"],
    Eksterijer: [trim.includes("Matrix") ? "Matrix LED" : "LED svjetla", "Aluminijski naplatci"],
  },
}));

export function taxStatus(vehicle: Vehicle) {
  return [vehicle.flags.includes("kupac") && quick.kupac, vehicle.flags.includes("pdv") && quick.pdv].filter(Boolean).join(" · ") || "Prema dokumentaciji";
}
