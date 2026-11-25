import { croatianCounties } from "../src/data/croatia-locations";
import { equipmentFor, equipmentId } from "../src/data/equipment-catalog";
import { cities, countyByCity, flags, fuels, gears, marketValuation, type Flag, type Vehicle } from "./catalog";
import { legacySportOption, selectedMakeOptions, vehicleMakeOptions } from "./make-equipment";
import { CAR_MAKES, chassisFromTitle, matchesGeneration, modelsFor, validGeneration } from "../src/data/car-catalog";

export const prices = [5000, 10000, 15000, 20000, 30000, 50000];
export const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
export const distances = [50000, 100000, 150000, 200000];
export const sorts = {
  newest: "Najnovije",
  lowest: "Cijena: niža prema višoj",
  highest: "Cijena: viša prema nižoj",
  mileage: "Kilometraža: najmanja",
  rating: "Najbolja ocjena cijene",
} as const;
export const categories = [
  { id: "", label: "Sva vozila" },
  { id: "limuzina", label: "Limuzine" },
  { id: "karavan", label: "Karavani" },
  { id: "suv", label: "SUV / Terenci" },
  { id: "gradski", label: "Gradski" },
  { id: "sportski", label: "Sportski" },
  { id: "eko", label: "Električni i hibridi" },
] as const;
export type CategoryId = (typeof categories)[number]["id"];
export type Search = {
  kategorija: CategoryId;
  marka: string; model: string; generacija: string; cijena: string; godiste: string; km: string; gorivo: string;
  mjenjac: string; grad: string; opcije: Flag[]; oprema: string[]; sortiranje: keyof typeof sorts; prikaz: "grid" | "lista";
};
export const initialSearch: Search = {
  kategorija: "",
  marka: "", model: "", generacija: "", cijena: "", godiste: "", km: "", gorivo: "", mjenjac: "", grad: "",
  opcije: [], oprema: [], sortiranje: "newest", prikaz: "lista",
};
export function validEquipmentFilters(make: string, model: string, generation: string, ids: string[]) {
  const allowed = new Set(equipmentFor({make, model, generation},true).map(item => item.id));
  return [...new Set([...selectedMakeOptions(make,model,ids), ...ids.filter(id => allowed.has(id))])];
}
export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  function accept(key: string, values: readonly string[], fallback = "") {
    const value = params.get(key);
    return value !== null && values.includes(value) ? value : fallback;
  }
  const marka = accept("marka", CAR_MAKES);
  const model = accept("model", modelsFor(marka));
  const generation = params.get("generacija") ?? "";
  const generalOptions = params.getAll("opcije");
  const equipment = params.getAll("oprema");
  const legacyPackage = legacySportOption[marka];
  if (legacyPackage && generalOptions.includes("sport")) equipment.push(legacyPackage);
  return {
    kategorija: accept("kategorija", categories.map(c => c.id)) as CategoryId,
    marka, model, generacija: validGeneration(marka, model, generation) ? generation : "", cijena: accept("cijena", prices.map(String)),
    godiste: accept("godiste", years.map(String)), km: accept("km", distances.map(String)),
    gorivo: accept("gorivo", fuels), mjenjac: accept("mjenjac", gears), grad: accept("grad", [...cities, ...croatianCounties]),
    opcije: flags.filter(flag => generalOptions.includes(flag)),
    oprema: validEquipmentFilters(marka, model, generation, equipment),
    sortiranje: accept("sortiranje", Object.keys(sorts), "newest") as Search["sortiranje"],
    prikaz: accept("prikaz", ["grid", "lista"], initialSearch.prikaz) as Search["prikaz"],
  };
}
export function writeSearch(search: Search) {
  const params = new URLSearchParams(window.location.search);
  for (const key of Object.keys(initialSearch) as (keyof Search)[]) {
    params.delete(key);
    const value = search[key];
    if (Array.isArray(value)) value.forEach(option => params.append(key, option));
    else if (value !== initialSearch[key]) params.set(key, value);
  }
  const query = params.toString();
  const next = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
  if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, "", next);
}
function matchesCategory(v: Vehicle, category: CategoryId): boolean {
  if (!category) return true;
  switch (category) {
    case "limuzina":
      return v.bodyType === "Limuzina";
    case "karavan":
      return v.bodyType === "Karavan";
    case "suv":
      return v.bodyType === "SUV / Terenac";
    case "gradski":
      return v.bodyType === "Hatchback / Kompakt" && v.kw <= 145;
    case "sportski":
      return (
        v.bodyType === "Coupé" ||
        v.bodyType === "Cabrio / Roadster" ||
        /\b(r\.s\.|gtd|gti|rs|st|vz|cooper s|type r|jcw|amg|trophy)\b/i.test(`${v.variant ?? ""} ${v.title}`) ||
        v.kw >= 180
      );
    case "eko":
      return v.fuel === "Hibrid" || v.fuel === "Struja";
  }
}
export function matchVehicles(vehicles: Vehicle[], s: Search) {
  const result = vehicles.filter(v =>
    matchesCategory(v, s.kategorija) &&
    (!s.marka || v.make === s.marka) && (!s.model || v.model === s.model) &&
    (!s.generacija || matchesGeneration(v.make, v.model, s.generacija, v.generation ?? chassisFromTitle(v.make, v.model, v.title))) &&
    (!s.cijena || (s.cijena === "50000" ? v.price >= 50000 : v.price <= Number(s.cijena))) &&
    (!s.godiste || Number(v.date.slice(0, 4)) >= Number(s.godiste)) &&
    (!s.km || v.km <= Number(s.km)) && (!s.gorivo || v.fuel === s.gorivo) &&
    (!s.mjenjac || v.gear === s.mjenjac) && (!s.grad || v.city === s.grad || (v.county || countyByCity[v.city]) === s.grad) &&
    s.opcije.every(flag => v.flags.includes(flag))
  );
  const matching = s.oprema.length ? result.filter(vehicle => {
    const makeOptions = vehicleMakeOptions(vehicle);
    const declared = Object.values(vehicle.equipment).flat().map(equipmentId);
    const equipment = new Set([...makeOptions.map(option => option.id), ...declared, ...(vehicle.catalogEquipment ?? [])]);
    return s.oprema.every(id => equipment.has(id));
  }) : result;
  switch (s.sortiranje) {
    case "lowest": return matching.sort((a, b) => a.price - b.price);
    case "highest": return matching.sort((a, b) => b.price - a.price);
    case "mileage": return matching.sort((a, b) => a.km - b.km);
    case "rating":
      return matching.sort((a, b) => {
        const va = marketValuation(a);
        const vb = marketValuation(b);
        return va.rating.rank - vb.rating.rank || va.deltaPercent - vb.deltaPercent;
      });
    default: return matching;
  }
}
