import { evaluateMarketPrice, valuationInputFromVehicle, type MarketValuationInput } from "./price-engine";
import type { Vehicle } from "../../app/catalog";

const textFields = {
  generation: "gen", variant: "variant", trim: "trim", title: "title", date: "date",
  bodyType: "body", drive: "drivetrain", registrationUntil: "registrationUntil",
  city: "city", county: "county",
} as const;
const listFields = ["equipment", "makeEquipment", "catalogEquipment", "flags", "history", "valueProofs"] as const;

export function listingValuationParams(vehicle: Vehicle): URLSearchParams {
  const input = valuationInputFromVehicle(vehicle);
  const params = new URLSearchParams({
    listing: "1", make: input.make, model: input.model, km: String(input.km), kw: String(input.kw),
    fuel: input.fuel, gear: input.gear, year: vehicle.date.slice(0, 4), price: String(vehicle.price),
    dealer: input.dealer ? "1" : "0", verified: input.verified ? "1" : "0",
    vat: input.flags?.includes("pdv") ? "1" : "0", cvh: input.flags?.includes("cvh") ? "1" : "0",
    warranty: input.flags?.includes("jamstvo") ? "1" : "0",
    firstOwner: input.firstOwner ? "1" : "0", serviceBook: input.serviceBook ? "1" : "0",
  });
  if (input.co2 !== undefined && Number.isFinite(input.co2)) params.set("co2", String(input.co2));
  for (const [field, key] of Object.entries(textFields) as [keyof typeof textFields, string][]) {
    const value = input[field];
    if (value !== undefined) params.set(key, value);
  }
  for (const field of listFields) {
    const value = input[field];
    if (value) params.set(field, JSON.stringify(Array.isArray(value) ? value : Object.values(value).flat()));
  }
  return params;
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function readListingValuationParams(params: URLSearchParams): MarketValuationInput | undefined {
  if (params.get("listing") !== "1") return;
  const make = params.get("make"), model = params.get("model"), fuel = params.get("fuel"), gear = params.get("gear");
  const km = readNumber(params, "km"), kw = readNumber(params, "kw");
  if (!make || !model || fuel === null || gear === null || km === undefined || kw === undefined) return;
  const input: MarketValuationInput = {
    make, model, km, kw, fuel, gear, co2: readNumber(params, "co2"), askingPrice: readNumber(params, "price"),
    dealer: params.get("dealer") === "1", verified: params.get("verified") === "1",
    firstOwner: params.get("firstOwner") === "1", serviceBook: params.get("serviceBook") === "1",
  };
  for (const [field, key] of Object.entries(textFields) as [keyof typeof textFields, string][]) {
    const value = params.get(key);
    if (value !== null) input[field] = value;
  }
  for (const field of listFields) {
    const raw = params.get(field);
    if (!raw) continue;
    try {
      const value: unknown = JSON.parse(raw);
      if (Array.isArray(value)) input[field] = value.filter(item => typeof item === "string");
    } catch { /* An incomplete link can still use the remaining fields. */ }
  }
  const flags = new Set(input.flags);
  for (const [key, flag] of [["vat", "pdv"], ["cvh", "cvh"], ["warranty", "jamstvo"]]) {
    if (params.get(key) === "1") flags.add(flag);
  }
  input.flags = [...flags];
  return input;
}

export function evaluateCalculatorPrice(form: MarketValuationInput, linked?: MarketValuationInput) {
  return evaluateMarketPrice(linked ?? form);
}
