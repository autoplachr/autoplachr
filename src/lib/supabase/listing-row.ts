import { normalizeVehicleCategory } from "../../../app/vehicle-category";
import type { ListingStatus, OwnedListing } from "../../../app/account-api";
import { emptyEquipment, modelPhotos, type Vehicle } from "../../../app/catalog";
import { canonicalEquipmentLabel, equipmentCategoryFor } from "../../../app/search";
import { formatHours, validHours, type WorkingHours } from "../../data/working-hours";

export function mapListingRow(row: Record<string, unknown>, profileRow?: Record<string, unknown>): OwnedListing {
  const year = Number(row.year) || 2021;
  const month = String(Number(row.month) || 6).padStart(2, "0");
  const rawEquip = Array.isArray(row.equipment) ? row.equipment : [];
  const rawImages = Array.isArray(row.images)
    ? row.images.flatMap((image: unknown) => {
        const src = typeof image === "string" ? image : (image as { src?: unknown } | null)?.src;
        return typeof src === "string" && src.trim() ? [{ src }] : [];
      })
    : [];
  const eq = emptyEquipment();
  for (const raw of rawEquip) {
    const label = typeof raw === "string" ? raw : (raw as { label?: unknown } | null)?.label;
    if (typeof label !== "string") continue;
    const clean = typeof label === "string" && label.startsWith("eq:") ? label.slice(3) : label;
    if (!clean) continue;
    const canonical = canonicalEquipmentLabel(clean);
    const storedCategory = typeof raw === "object" ? String((raw as { category?: unknown })?.category ?? "") : "";
    const category = (Object.hasOwn(eq, storedCategory) ? storedCategory : equipmentCategoryFor(canonical)) as keyof typeof eq;
    if (!eq[category].includes(canonical)) eq[category].push(canonical);
  }
  const flags: Vehicle["flags"] = [];
  if (row.vat_deductible) flags.push("pdv");
  if (row.on_buyer_name) flags.push("kupac");
  if (row.cvh_verified) flags.push("cvh");
  if (row.in_transit) flags.push("dolazak");
  if (row.warranty_12m) flags.push("jamstvo");
  const history: string[] = [];
  if (row.first_owner) history.push("1. vlasnik");
  if (row.service_book) history.push("Servisna knjiga");

  const sellerName =
    String(profileRow?.company_name || profileRow?.full_name || "Prodavač");
  const wh = profileRow?.working_hours as WorkingHours | undefined;

  return {
    id: String(row.id),
    make: String(row.make || ""),
    model: String(row.model || ""),
    generation: row.generation ? String(row.generation) : undefined,
    variant: typeof row.variant === "string" ? row.variant || undefined : row.trim ? String(row.trim) : undefined,
    category: normalizeVehicleCategory(row.category ?? row.kategorija),
    bodyType: row.body_style ? String(row.body_style) : undefined,
    title: String(row.title || ""),
    trim: String(row.trim || ""),
    price: Number(row.price_eur) || 0,
    previousPriceEur: row.previous_price_eur ? Number(row.previous_price_eur) : undefined,
    date: `${year}-${month}`,
    isBoosted: row.is_boosted === true,
    boostTier: row.boost_tier === "boost_72h" || row.boost_tier === "top_7d" ? row.boost_tier : "none",
    boostExpiresAt: typeof row.boost_expires_at === "string" ? row.boost_expires_at : null,
    listedAt: typeof row.created_at === "string" ? row.created_at : undefined,
    km: Number(row.mileage) || 0,
    kw: Number(row.power_kw) || 0,
    cc: Number(row.engine_cc) || 0,
    co2: Number(row.co2) || 0,
    cylinders: typeof row.cylinders === "number" ? row.cylinders : undefined,
    doors: typeof row.doors === "number" ? row.doors : undefined,
    seats: typeof row.seats === "number" ? row.seats : undefined,
    ownership: typeof row.ownership === "string" ? row.ownership : undefined,
    registrationUntil: typeof row.registration_until === "string" ? row.registration_until : undefined,
    fuel: (String(row.fuel || "Dizel") as Vehicle["fuel"]),
    gear: (String(row.transmission || "Automatski") as Vehicle["gear"]),
    drive: String(row.drivetrain || "Prednji"),
    vin: String(row.vin || ""),
    city: String(row.city || profileRow?.city || "Zagreb"),
    county: String(row.county || profileRow?.county || "Grad Zagreb"),
    seller: sellerName,
    dealer: profileRow?.account_type === "dealer",
    verified: Boolean(profileRow?.is_verified),
    dealershipId: profileRow?.account_type === "dealer" ? String(row.user_id) : undefined,
    sellerAddress: profileRow?.address ? String(profileRow.address) : undefined,
    sellerWorkingHours: wh && validHours(wh) ? wh : undefined,
    sellerHours: wh && validHours(wh) ? formatHours(wh) : undefined,
    phone: String(profileRow?.phone || ""),
    contactAvailable: Boolean(profileRow?.contact_available ?? profileRow),
    email: String(profileRow?.email || ""),
    flags,
    history,
    showPriceBadge: row.show_price_badge === true,
    valueProofs: Array.isArray(row.value_proofs) ? row.value_proofs.filter(item => typeof item === "string") : undefined,
    makeEquipment: Array.isArray(row.make_equipment) ? row.make_equipment.filter(item => typeof item === "string") : undefined,
    sellerNote: row.description ? String(row.description) : undefined,
    color: row.color ? String(row.color) : undefined,
    photos: rawImages.length ? rawImages : modelPhotos("bmw-g20").slice(0, 1),
    equipment: eq,
    catalogEquipment: rawEquip.filter(x => typeof x === "string" && x.startsWith("eq:")),
    status: (String(row.status || "active") as ListingStatus),
    views: Number(row.views_count) || 0,
    reveals: 0,
  };
}

