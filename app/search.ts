import { cities, flags, fuels, gears, makes, rating, type Flag, type Vehicle } from "./catalog";

export const prices = [5000, 10000, 15000, 20000, 30000, 50000];
export const years = Array.from({ length: 12 }, (_, index) => 2026 - index);
export const distances = [50000, 100000, 150000, 200000];
export const sorts = {
  newest: "Najnovije",
  lowest: "Cijena: niža prema višoj",
  highest: "Cijena: viša prema nižoj",
  mileage: "Kilometraža: najmanja",
  rating: "Najbolja AI ocjena cijene",
} as const;
export type Search = {
  marka: string; model: string; cijena: string; godiste: string; km: string; gorivo: string;
  mjenjac: string; grad: string; opcije: Flag[]; sortiranje: keyof typeof sorts; prikaz: "grid" | "lista";
};
export const initialSearch: Search = {
  marka: "", model: "", cijena: "", godiste: "", km: "", gorivo: "", mjenjac: "", grad: "",
  opcije: [], sortiranje: "newest", prikaz: "grid",
};
export function modelsFor(make: string): readonly string[] {
  return Object.hasOwn(makes, make) ? makes[make as keyof typeof makes] : [];
}
export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  function accept(key: string, values: readonly string[], fallback = "") {
    const value = params.get(key);
    return value !== null && values.includes(value) ? value : fallback;
  }
  const marka = accept("marka", Object.keys(makes));
  return {
    marka, model: accept("model", modelsFor(marka)), cijena: accept("cijena", prices.map(String)),
    godiste: accept("godiste", years.map(String)), km: accept("km", distances.map(String)),
    gorivo: accept("gorivo", fuels), mjenjac: accept("mjenjac", gears), grad: accept("grad", cities),
    opcije: flags.filter(flag => params.getAll("opcije").includes(flag)),
    sortiranje: accept("sortiranje", Object.keys(sorts), "newest") as Search["sortiranje"],
    prikaz: accept("prikaz", ["grid", "lista"], "grid") as Search["prikaz"],
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
export function matchVehicles(vehicles: Vehicle[], s: Search) {
  const result = vehicles.filter(v =>
    (!s.marka || v.make === s.marka) && (!s.model || v.model === s.model) &&
    (!s.cijena || (s.cijena === "50000" ? v.price >= 50000 : v.price <= Number(s.cijena))) &&
    (!s.godiste || Number(v.date.slice(0, 4)) >= Number(s.godiste)) &&
    (!s.km || v.km <= Number(s.km)) && (!s.gorivo || v.fuel === s.gorivo) &&
    (!s.mjenjac || v.gear === s.mjenjac) && (!s.grad || v.city === s.grad) &&
    s.opcije.every(flag => v.flags.includes(flag))
  );
  switch (s.sortiranje) {
    case "lowest": return result.sort((a, b) => a.price - b.price);
    case "highest": return result.sort((a, b) => b.price - a.price);
    case "mileage": return result.sort((a, b) => a.km - b.km);
    case "rating": return result.sort((a, b) => (rating(a)?.rank ?? 3) - (rating(b)?.rank ?? 3));
    default: return result;
  }
}
