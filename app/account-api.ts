import { localApi, localDemo } from "./local-demo";
import type { WorkingHours } from "../src/data/working-hours";
import type { Vehicle } from "./catalog";

export type Profile = {
  type: "private" | "dealer"; name: string; city: string; county: string; phone: string;
  postalCode?: string; workingHours?: WorkingHours; oib?: string; address?: string; hours?: string; importUrl?: string; alerts: boolean; analytics: boolean;
};
export type ListingStatus = "active" | "draft" | "sold";
export type OwnedListing = Vehicle & { status: ListingStatus; views: number; reveals: number };
export type Account = { id: string; email: string; profile: Profile; verified: boolean; listings: OwnedListing[];
  favorites: { id: string; price: number }[]; moderator: boolean };
export type Report = { id: string; listing_id: string; url: string; reason: string; details: string; name?: string; email?: string; status: string; decision?: string };
export async function api<T = unknown>(endpoint: string, data?: object): Promise<T> {
  if (localDemo()) return await localApi(endpoint,data) as T;
  const response = await fetch("/api/" + endpoint, data ? {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
  } : undefined);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(body?.error || "Usluga trenutačno nije dostupna."), { fields:body?.fields });
  return body as T;
}
