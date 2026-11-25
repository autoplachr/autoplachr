import type { Photo, Vehicle } from "./catalog";
import { equipmentFor, equipmentId } from "../src/data/equipment-catalog";
import type { normalizeImportedVehicle } from "./search";
import type { FeedDealer, FeedVehicle } from "../src/lib/dealership-feed";

export type ImportedFacts = ReturnType<typeof normalizeImportedVehicle>;
type ImportResult = {
  vehicle?: ImportedFacts;
  photos?: Photo[];
  requestedPhotos?: number;
  storageMisses?: number;
  blocked?: boolean;
  message?: string;
  content?: string;
  source?: string;
};

export async function importClassifieds(payload: { url: string; feed?: boolean } | { rawContent: string }): Promise<ImportResult> {
  const response = await fetch("/api/import-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(70000),
  });
  const result = await response.json().catch(() => ({})) as ImportResult;
  if (!response.ok) throw new Error(result.message || "Uvoz trenutno nije dostupan.");
  return result;
}

export async function importedDealerVehicle(result: ImportResult, source: string, dealer: FeedDealer): Promise<FeedVehicle> {
  const data = result.vehicle;
  if (!data?.make || !data.model || !data.year || !data.price || !data.kw || data.km === undefined || !data.fuel || !data.gear) {
    throw new Error(result.message || "Nedostaju podaci za objavu (marka, model, godište, cijena, kW, km, gorivo i mjenjač).");
  }
  const normalized = new URL(source);
  normalized.hash = "";
  normalized.searchParams.sort();
  const externalId = normalized.href;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dealer.id + "\n" + externalId))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const token = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  const id = [token.slice(0, 8), token.slice(8, 12), token.slice(12, 16), token.slice(16, 20), token.slice(20)].join("-");
  const fuel: Vehicle["fuel"] = /plug.in|hibrid/i.test(data.fuel) ? "Hibrid" : data.fuel === "Električni" ? "Struja" : data.fuel as Vehicle["fuel"];
  const date = data.firstRegistration ?? data.year + "-01";
  const catalogIds = new Set(equipmentFor({ make: data.make, model: data.model, generation: data.generation, variant: data.variant, date, fuel }).map(item => item.id));
  const parsedIds = data.equipment.map(equipmentId);
  return {
    id, externalId, make: data.make, model: data.model, generation: data.generation, variant: data.variant, trim: data.variant ?? "",
    bodyType: data.bodyType, color: data.color, title: (data.title || [data.make, data.model, data.variant].filter(Boolean).join(" ")).slice(0, 100),
    date, price: data.price, kw: data.kw, km: data.km, cc: data.cc ?? 0, co2: 0, cylinders: data.cylinders,
    registrationUntil: data.registrationUntil, gear: data.gear, fuel, drive: data.drive ?? "",
    vin: data.vin && /^[A-HJ-NPR-Z0-9]{17}$/i.test(data.vin) ? data.vin.toUpperCase() : "",
    city: dealer.city, county: dealer.county, seller: dealer.name, phone: dealer.phone, sellerAddress: dealer.address,
    dealer: true, dealershipId: dealer.id, verified: false, flags: [], photos: result.photos ?? [],
    sellerNote: data.description || undefined, catalogEquipment: parsedIds.filter(id => catalogIds.has(id)),
    equipment: { Sigurnost: [], Udobnost: [], Multimedija: [], Eksterijer: data.equipment.filter((_, index) => !catalogIds.has(parsedIds[index])).slice(0, 40) },
  };
}

