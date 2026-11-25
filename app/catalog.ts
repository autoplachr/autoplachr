import photoData from "./photos.json";

export const makes = {
  BMW: ["Serija 3", "Serija 1"],
  Audi: ["A4", "A6"],
  Volkswagen: ["Golf", "Passat", "Tiguan"],
  "Mercedes-Benz": ["C-klasa", "E-klasa"],
  "Škoda": ["Octavia"],
  Porsche: ["Macan"],
} as const;

export const cities = ["Zagreb", "Osijek", "Slavonski Brod", "Split", "Rijeka", "Varaždin"];
export const fuels = ["Dizel", "Benzin", "Hibrid", "Struja"] as const;
export type Fuel = typeof fuels[number];
export const gears = ["Automatski", "Ručni"] as const;
export const quick = {
  kupac: "Na ime kupca",
  pdv: "Sustav PDV-a (R1)",
  dolazak: "Vozilo u dolasku",
  cvh: "Potvrđeni km (CVH)",
  sport: "M-Paket / S-Line / AMG",
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
  Eksterijer: ["LED svjetla", "Matrix LED", "Aluminijski naplatci", "Panoramski krov", "Sportski paket", "Metallic boja"],
};
export function emptyEquipment(): Equipment {
  return { Sigurnost: [], Udobnost: [], Multimedija: [], Eksterijer: [] };
}

export type Photo = { src: string; credit?: string; link?: string };
export type Vehicle = {
  id: string; make: string; model: string; title: string; trim: string; price: number;
  date: string; km: number; kw: number; cc: number; co2: number; fuel: Fuel;
  gear: typeof gears[number]; drive: string; vin: string; city: string; seller: string;
  dealer: boolean; verified: boolean; phone: string; email?: string; flags: Flag[];
  photos: Photo[]; equipment: Equipment; range?: [number, number]; demo?: boolean;
};

const photos = photoData as Record<string, Photo[]>;
export function modelPhotos(key: string) { return photos[key] ?? []; }
const num = new Intl.NumberFormat("hr-HR", { useGrouping: "always" });
const decimals = new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
export const number = (value: number) => num.format(value);
export const euro = (value: number, cents = false) => (cents ? decimals : num).format(value) + " €";
export const registered = (date: string) => date.slice(5, 7) + "/" + date.slice(0, 4);
export const power = (kw: number) => kw + " kW (" + Math.round(kw * 1.35962) + " KS)";
export function rating(vehicle: Vehicle) {
  if (!vehicle.range) return null;
  if (vehicle.price <= vehicle.range[0]) return { label: "Odlična cijena", type: "good", rank: 0 };
  if (vehicle.price <= vehicle.range[1]) return { label: "Fer cijena", type: "fair", rank: 1 };
  return { label: "Viša cijena", type: "high", rank: 2 };
}

type Seed = [id: string, key: string, make: keyof typeof makes, model: string, title: string, trim: string, price: number,
  date: string, km: number, kw: number, cc: number, co2: number, city: number, seller: string,
  flag: Flag[], range: [number, number], drive?: string, gear?: Vehicle["gear"], fuel?: Fuel];
const seed: Seed[] = [
  ["g20", "bmw-g20", "BMW", "Serija 3", "BMW 320d M-Sport xDrive", "M Sport · Harman Kardon · LED", 24900, "2021-05", 114500, 140, 1995, 138, 0, "Sjever Auto", ["pdv","cvh","sport"], [25200,26900], "4×4"],
  ["a4", "audi-a4", "Audi", "A4", "Audi A4 40 TDI S-Line", "S-Line · Matrix LED · Virtual Cockpit", 22750, "2020-09", 132000, 140, 1968, 118, 4, "Kvarner Motors", ["kupac","sport"], [21800,23900]],
  ["golf", "golf-mk8", "Volkswagen", "Golf", "Volkswagen Golf 8 GTD", "GTD · IQ.Light · Digital Cockpit Pro", 23490, "2021-11", 98500, 147, 1968, 137, 1, "Drava Auto", ["dolazak","cvh"], [23500,25400]],
  ["c220", "mercedes-c-class", "Mercedes-Benz", "C-klasa", "Mercedes-Benz C 220 d AMG Line", "AMG Line · Burmester · MBUX", 32900, "2022-03", 74600, 147, 1993, 125, 3, "Jadran Auto", ["pdv","sport"], [30200,33900], "Stražnji"],
  ["macan", "porsche-macan", "Porsche", "Macan", "Porsche Macan S", "Sport Chrono · PDK · Panoramski krov", 56900, "2020-07", 88900, 260, 2995, 204, 0, "Sjever Auto", ["pdv"], [49500,55000], "4×4", "Automatski", "Benzin"],
  ["octavia", "skoda-octavia", "Škoda", "Octavia", "Škoda Octavia RS 2.0 TSI", "RS · Canton · Matrix LED", 26900, "2022-06", 78400, 180, 1984, 163, 5, "Varaždin Auto", ["kupac","cvh"], [26000,28000], "Prednji", "Automatski", "Benzin"],
  ["a6", "audi-a6", "Audi", "A6", "Audi A6 50 TDI quattro", "S-Line · Bang & Olufsen · 360°", 36900, "2019-10", 141000, 210, 2967, 147, 0, "Sjever Auto", ["pdv","sport"], [34500,36700], "4×4"],
  ["passat", "volkswagen-passat", "Volkswagen", "Passat", "Volkswagen Passat 2.0 TDI R-Line", "R-Line · Discover Pro · ACC", 19990, "2020-04", 148700, 110, 1968, 113, 2, "", ["cvh"], [20100,21700]],
  ["tiguan", "volkswagen-tiguan", "Volkswagen", "Tiguan", "Volkswagen Tiguan 2.0 TDI 4Motion", "Elegance · Area View · 4Motion", 27450, "2021-08", 105200, 110, 1968, 162, 5, "Varaždin Auto", ["dolazak","pdv"], [26400,28500], "4×4"],
  ["f30", "bmw-f30", "BMW", "Serija 3", "BMW 320d F30 Sport Line", "Sport Line · LED · Navigacija", 15400, "2017-06", 183200, 140, 1995, 119, 2, "", ["cvh"], [14800,15800], "Stražnji", "Ručni"],
  ["118", "bmw-1-series", "BMW", "Serija 1", "BMW 118d F20 M Sport", "M Sport · Aluminijski naplatci · LED", 14850, "2018-03", 139400, 110, 1995, 111, 1, "", ["sport"], [14900,16100], "Stražnji", "Ručni"],
  ["e220", "mercedes-e-class", "Mercedes-Benz", "E-klasa", "Mercedes-Benz E 220 d Avantgarde", "Avantgarde · Widescreen · LED", 25900, "2019-08", 156900, 143, 1950, 129, 4, "Kvarner Motors", ["pdv","kupac"], [24700,26900], "Stražnji"],
  ["touring", "bmw-touring", "BMW", "Serija 3", "BMW 320d G21 Touring", "Sport Line · Live Cockpit · LED", 23900, "2020-02", 129650, 140, 1995, 125, 3, "Jadran Auto", ["dolazak","kupac"], [23100,24800], "Stražnji"],
  ["passatgte", "volkswagen-passat", "Volkswagen", "Passat", "Volkswagen Passat GTE Variant", "GTE · Adaptivni tempomat · CarPlay", 22400, "2021-12", 95400, 160, 1395, 32, 0, "", ["cvh"], [20900,22200], "Prednji", "Automatski", "Hibrid"],
];
export const vehicles: Vehicle[] = seed.map(([
  id, key, make, model, title, trim, price, date, km, kw, cc, co2, city, seller, flags, range,
  drive = "Prednji", gear = "Automatski", fuel = "Dizel",
], index) => ({
  id, make, model, title, trim, price, date, km, kw, cc, co2, city: cities[city], drive, gear, fuel,
  vin: "EXAMPLE0000" + String(100001 + index), seller, dealer: Boolean(seller), verified: Boolean(seller),
  phone: "+385 00 000 000", flags, range, demo: true, photos: modelPhotos(key),
  equipment: {
    Sigurnost: ["ABS / ESP", "ISOFIX", index % 2 ? "Adaptivni tempomat" : "Kamera za vožnju unatrag"],
    Udobnost: ["Automatska klima", flags.includes("sport") ? "Sportska sjedala" : "Grijana sjedala"],
    Multimedija: ["Navigacija", trim.includes("Harman") ? "Harman Kardon" : trim.includes("Bang") ? "Bang & Olufsen" : "Apple CarPlay"],
    Eksterijer: [trim.includes("Matrix") ? "Matrix LED" : "LED svjetla", "Aluminijski naplatci", ...(flags.includes("sport") ? ["Sportski paket"] : [])],
  },
}));

export function taxStatus(vehicle: Vehicle) {
  return [vehicle.flags.includes("kupac") && quick.kupac, vehicle.flags.includes("pdv") && quick.pdv].filter(Boolean).join(" · ") || "Prema dokumentaciji";
}

