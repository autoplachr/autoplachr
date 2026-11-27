import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { isListingUuid, staticCatalogVehicles } from "./seo";
import { mapListingRow } from "./supabase/listing-row";

function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (process.env.AUTOPLAC_STATIC_EXPORT === "1" || !url || !key) return;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(6000) }) },
  });
}

async function mapPublicListings(db: SupabaseClient, rows: Record<string, unknown>[]) {
  if (!rows.length) return [];
  const { data, error } = await db.rpc("public_listing_sellers", { listing_ids: rows.map(row => row.id) });
  if (error) console.error("public listing sellers", error.code);
  const sellers = new Map<string, Record<string, unknown>>((data ?? []).map((seller: Record<string, unknown>) => [String(seller.listing_id), seller]));
  return rows.map(row => mapListingRow(row, sellers.get(String(row.id))));
}

export const getPublicListing = cache(async (id: string) => {
  const db = publicDb();
  if (!db || !isListingUuid(id)) return;
  try {
    const { data, error } = await db.from("listings").select("*").eq("status", "active").eq("id", id).maybeSingle();
    if (error) {
      console.error("public listing", id, error.code);
      return;
    }
    return (await mapPublicListings(db, data ? [data] : []))[0];
  } catch (cause) {
    // A transient Supabase/network failure must render a clean 404, never a 500.
    console.error("public listing load failed", id, cause instanceof Error ? cause.message : cause);
    return;
  }
});

export const getPublicCatalog = cache(async () => {
  const seeds = staticCatalogVehicles();
  const db = publicDb();
  if (!db) return seeds;
  const live = [];
  const size = 200;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await db.from("listings").select("*").eq("status", "active")
      .order("created_at", { ascending: false }).order("id").range(offset, offset + size - 1);
    if (error) {
      console.error("public catalog", error.code);
      break;
    }
    live.push(...await mapPublicListings(db, data));
    if (data.length < size) break;
  }
  const combined = new Map([...seeds, ...live].map(vehicle => [vehicle.id, vehicle]));
  return [...combined.values()];
});

export const getPublicDealer = cache(async (id: string) => {
  const db = publicDb();
  if (!db || !isListingUuid(id)) return [];
  try {
    const { data, error } = await db.from("listings").select("*").eq("status", "active")
      .eq("user_id", id).order("created_at", { ascending: false });
    if (error) {
      console.error("public dealer listings", id, error.code);
      return [];
    }
    return (await mapPublicListings(db, data)).filter(vehicle => vehicle.dealer);
  } catch (cause) {
    console.error("public dealer load failed", id, cause instanceof Error ? cause.message : cause);
    return [];
  }
});

export async function getPublicFacet(column: "make" | "city", value: string) {
  const seeds = staticCatalogVehicles().filter(vehicle => vehicle[column] === value);
  const db = publicDb();
  if (!db) return seeds;
  const { data, error } = await db.from("listings").select("*").eq("status", "active").eq(column, value)
    .order("created_at", { ascending: false }).limit(24);
  if (error) {
    console.error("public catalog facet", error.code);
    return seeds;
  }
  const live = await mapPublicListings(db, data);
  return [...new Map([...seeds, ...live].map(vehicle => [vehicle.id, vehicle])).values()];
}
