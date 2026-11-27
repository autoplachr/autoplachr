export const categories = [
  { id: "automobili", label: "Automobili" },
  { id: "gospodarska", label: "Kombi i dostavna" },
  { id: "motocikli", label: "Motori" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export function normalizeVehicleCategory(value: unknown): CategoryId | undefined {
  switch (value) {
    case "automobili": case "elektricna": case "hibridi": case "eko": return "automobili";
    case "gospodarska": case "dostavna": case "ostalo": return "gospodarska";
    case "motocikli": case "motori": return "motocikli";
  }
}

export function vehicleCategory(vehicle: { category?: string; bodyType?: string }): CategoryId | undefined {
  const category = normalizeVehicleCategory(vehicle.category);
  if (category) return category;
  const body = vehicle.bodyType ?? "";
  if (/kamper|motorhome|kamion|truck|autobus/i.test(body)) return;
  if (/motocikl|motorcycle|skuter|scooter/i.test(body)) return "motocikli";
  if (/kombi|dostavn|pick.up|\bvan\b/i.test(body)) return "gospodarska";
  return "automobili";
}
