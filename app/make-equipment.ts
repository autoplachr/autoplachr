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
    { id: "bmw-live-cockpit", label: "BMW Live Cockpit", legacyNames: ["Live Cockpit"], models: ["Serija 1", "Serija 2", "Serija 3", "Serija 4", "Serija 5", "Serija 7", "X1", "X3", "X5", "i4", "i5", "iX"] },
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
    { id: "mercedes-mbux", label: "MBUX", models: ["A-klasa", "B-klasa", "C-klasa", "CLA", "GLA", "GLB", "GLC", "EQA", "EQB"] },
    { id: "mercedes-widescreen", label: "Widescreen Cockpit", legacyNames: ["Widescreen"] },
    { id: "mercedes-burmester", label: "Burmester" },
  ],
  "Škoda": [
    { id: "skoda-rs", label: "RS" },
    { id: "skoda-laurin-klement", label: "Laurin & Klement", legacyNames: ["L&K"] },
    { id: "skoda-matrix-led", label: "Matrix LED svjetla", legacyNames: ["Matrix LED"] },
    { id: "skoda-canton", label: "Canton audio", legacyNames: ["Canton"] },
  ],
  Porsche: [
    { id: "porsche-sport-chrono", label: "Sport Chrono" },
    { id: "porsche-panorama", label: "Panoramski krov" },
    { id: "porsche-pasm", label: "PASM zračni ovjes" },
  ],
  Opel: [
    { id: "opel-gs-line", label: "GS Line / OPC Line" },
    { id: "opel-intellilux", label: "IntelliLux LED" },
    { id: "opel-agr", label: "AGR ergonomska sjedala" },
  ],
  Seat: [
    { id: "seat-fr", label: "FR paket" },
    { id: "seat-cockpit", label: "Digital Cockpit" },
  ],
  Cupra: [
    { id: "cupra-vz", label: "VZ paket" },
    { id: "cupra-dcc", label: "DCC adaptivni ovjes" },
  ],
  Renault: [
    { id: "renault-esprit-alpine", label: "Esprit Alpine / R.S. Line", legacyNames: ["GT-Line"] },
    { id: "renault-4control", label: "4Control" },
    { id: "renault-bose", label: "Bose audio" },
  ],
  Peugeot: [
    { id: "peugeot-gt", label: "GT Line / GT Pack" },
    { id: "peugeot-icockpit", label: "i-Cockpit 3D" },
    { id: "peugeot-focal", label: "Focal Hi-Fi" },
  ],
  "Citroën": [
    { id: "citroen-comfort", label: "Advanced Comfort sjedala" },
    { id: "citroen-headup", label: "Head-Up Display" },
  ],
  Dacia: [
    { id: "dacia-extreme", label: "Extreme / Stepway paket" },
    { id: "dacia-medianav", label: "Media Nav" },
  ],
  Toyota: [
    { id: "toyota-gr-sport", label: "GR Sport" },
    { id: "toyota-safety-sense", label: "Toyota Safety Sense" },
    { id: "toyota-jbl", label: "JBL Audio" },
  ],
  Mazda: [
    { id: "mazda-takumi", label: "Takumi / Revolution Top" },
    { id: "mazda-bose", label: "Bose Sound System" },
  ],
  Honda: [
    { id: "honda-sensing", label: "Honda SENSING" },
    { id: "honda-sport", label: "Sport / Advance paket" },
  ],
  Nissan: [
    { id: "nissan-propilot", label: "ProPILOT" },
    { id: "nissan-360", label: "Around View 360°" },
  ],
  Suzuki: [
    { id: "suzuki-allgrip", label: "ALLGRIP 4×4" },
    { id: "suzuki-glx", label: "GLX / Elegance" },
  ],
  Hyundai: [
    { id: "hyundai-n-line", label: "N Line" },
    { id: "hyundai-smartsense", label: "SmartSense ADAS" },
  ],
  Kia: [
    { id: "kia-gt-line", label: "GT-Line" },
    { id: "kia-harman", label: "Harman Kardon / Meridian" },
  ],
  Volvo: [
    { id: "volvo-r-design", label: "R-Design / Inscription" },
    { id: "volvo-pilot", label: "Pilot Assist" },
    { id: "volvo-bowers", label: "Bowers & Wilkins" },
  ],
  Ford: [
    { id: "ford-st-line", label: "ST-Line / Vignale" },
    { id: "ford-bo", label: "B&O Sound System" },
    { id: "ford-quickclear", label: "Grijano vjetrobransko staklo" },
  ],
  "Alfa Romeo": [
    { id: "alfa-veloce", label: "Veloce / Ti" },
    { id: "alfa-harman", label: "Harman Kardon" },
  ],
  Fiat: [
    { id: "fiat-cross", label: "Cross / Sport paket" },
    { id: "fiat-uconnect", label: "Uconnect navigacija" },
  ],
  Jeep: [
    { id: "jeep-trailhawk", label: "Overland / Trailhawk" },
    { id: "jeep-alpine", label: "Alpine Audio" },
  ],
  "Land Rover": [
    { id: "lr-r-dynamic", label: "R-Dynamic / Autobiography" },
    { id: "lr-meridian", label: "Meridian Surround" },
  ],
  Tesla: [
    { id: "tesla-autopilot", label: "Enhanced Autopilot / FSD" },
    { id: "tesla-premium", label: "Premium Connectivity & Audio" },
  ],
  BYD: [
    { id: "byd-design", label: "Design / Excellence paket" },
    { id: "byd-v2l", label: "V2L napajanje" },
  ],
  MG: [
    { id: "mg-luxury", label: "Luxury / Trophy paket" },
    { id: "mg-pilot", label: "MG Pilot 360°" },
  ],
  Geely: [
    { id: "geely-gf", label: "GF+ / Flagship paket" },
    { id: "geely-360", label: "360° kamera" },
  ],
  Omoda: [
    { id: "omoda-premium", label: "Premium paket" },
    { id: "omoda-sony", label: "Sony audio" },
  ],
  Jaecoo: [
    { id: "jaecoo-exclusive", label: "Exclusive AWD" },
    { id: "jaecoo-540", label: "540° kamera" },
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
