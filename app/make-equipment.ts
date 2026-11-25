import type { Vehicle } from "./catalog";

type MakeOption = {
  id: string;
  label: string;
  models?: readonly string[];
  legacyNames?: readonly string[];
};

const equipmentByMake: Readonly<Record<string, readonly MakeOption[]>> = {
  BMW: [
    { id: "bmw-m-sport", label: "M Sport", legacyNames: ["M-Paket", "M paket"] },
    { id: "bmw-adaptive-led", label: "Adaptivna LED svjetla" },
    { id: "bmw-live-cockpit", label: "BMW Live Cockpit", legacyNames: ["Live Cockpit"], models: ["Serija 3"] },
    { id: "bmw-harman-kardon", label: "Harman Kardon" },
    { id: "bmw-sport-seats", label: "Sportska sjedala" },
  ],
  Audi: [
    { id: "audi-s-line", label: "S line" },
    { id: "audi-matrix-led", label: "Matrix LED svjetla", legacyNames: ["Matrix LED"] },
    { id: "audi-virtual-cockpit", label: "Audi virtual cockpit", legacyNames: ["Virtual Cockpit"] },
    { id: "audi-bang-olufsen", label: "Bang & Olufsen" },
  ],
  Volkswagen: [
    { id: "vw-r-line", label: "R-Line" },
    { id: "vw-iq-light", label: "IQ.LIGHT Matrix LED", legacyNames: ["IQ.Light"] },
    { id: "vw-digital-cockpit-pro", label: "Digital Cockpit Pro" },
    { id: "vw-area-view", label: "Area View (360°)", legacyNames: ["Area View"] },
  ],
  "Mercedes-Benz": [
    { id: "mercedes-amg-line", label: "AMG Line" },
    { id: "mercedes-mbux", label: "MBUX", models: ["C-klasa"] },
    { id: "mercedes-widescreen", label: "Widescreen Cockpit", legacyNames: ["Widescreen"], models: ["E-klasa"] },
    { id: "mercedes-burmester", label: "Burmester" },
  ],
  Škoda: [
    { id: "skoda-rs", label: "RS" },
    { id: "skoda-matrix-led", label: "Matrix LED svjetla", legacyNames: ["Matrix LED"] },
    { id: "skoda-canton", label: "Canton audio", legacyNames: ["Canton"] },
  ],
  Porsche: [
    { id: "porsche-sport-chrono", label: "Sport Chrono" },
    { id: "porsche-panorama", label: "Panoramski krov" },
  ],
};

export function makeOptions(make: string, model = "") {
  const options = Object.hasOwn(equipmentByMake, make) ? equipmentByMake[make] : [];
  return options.filter(option => !model || !option.models || option.models.includes(model));
}

export function selectedMakeOptions(make: string, model: string, ids: string[]) {
  const allowed = new Set(makeOptions(make, model).map(option => option.id));
  return ids.filter(id => allowed.has(id));
}

const normalize = (label: string) => label.trim().toLowerCase().replace(/[-–]+/g, " ");

export function vehicleMakeOptions(vehicle: Vehicle) {
  const options = makeOptions(vehicle.make, vehicle.model);
  if (vehicle.makeEquipment) return options.filter(option => vehicle.makeEquipment?.includes(option.id));

  // Listings saved before make-specific equipment used display labels.
  const labels = new Set([
    ...vehicle.trim.split("·"),
    ...Object.values(vehicle.equipment).flat(),
  ].map(normalize));
  const legacySport = vehicle.flags.some(flag => String(flag) === "sport") ? legacySportOption[vehicle.make] : undefined;
  return options.filter(option => option.id === legacySport ||
    [option.label, ...(option.legacyNames ?? [])].some(label => labels.has(normalize(label))));
}

export const legacySportOption: Readonly<Record<string, string>> = {
  BMW: "bmw-m-sport", Audi: "audi-s-line", "Mercedes-Benz": "mercedes-amg-line",
};
