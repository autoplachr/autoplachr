import { marketValuation, type Vehicle } from "./catalog";

/** Real Croatian B2B pricing (founder offer: 0 € until 31.05.2027 for the first 50 dealerships). */
export const B2B_PACKAGES = [
  { id: "starter", name: "Start", priceEur: 29, desc: "Do 30 aktivnih vozila, XML uvoz i A4 cjenik za staklo." },
  { id: "pro", name: "Pro Salon", priceEur: 49, desc: "Do 100 vozila, web-izlog salona, AI opisi i 10 × Top prilika mjesečno." },
  { id: "ai_partner", name: "Partner Plus", priceEur: 89, desc: "Neograničen lager, županijski doseg i prioritetna podrška." },
] as const;

export const B2B_FOUNDER_OFFER = "0 € do 31. 5. 2027. za prvih 50 autokuća";

/** Private seller post-publish highlight upsells (promo: 0 €). */
export const boostPlans = {
  boost_72h: { name: "Istakni 72h", price: 2.9, description: "Prioritet u gornjem redu i pretrazi 3 dana." },
  top_7d: { name: "Istaknuto 7 dana", price: 6.9, description: "Najviši prioritet u gornjem redu 7 dana." },
  fast_sale: { name: "Paket Brza prodaja", price: 9.9, description: "Istaknuto na naslovnici 7 dana + automatski skok na vrh." },
  bump: { name: "Skok na vrh", price: 2.5, description: "Kratki skok na vrh oglasnika (2 sata)." },
} as const;

export type PaidBoostTier = keyof typeof boostPlans;
export type BoostTier = PaidBoostTier | "none";

export function hasActiveBoost(vehicle: Vehicle, now = Date.now()) {
  if (vehicle.isBoosted === undefined) return (vehicle.boostedUntil ?? 0) * 1000 > now;
  return vehicle.isBoosted && (vehicle.boostExpiresAt == null || Date.parse(vehicle.boostExpiresAt) > now);
}

/** Tier 1: top_7d / fast_sale. Tier 2: boost_72h / bump. Tier 3: organic (0). */
export function boostTierRank(vehicle: Vehicle, now = Date.now()): number {
  if (!hasActiveBoost(vehicle, now)) return 0;
  const tier = vehicle.boostTier ?? "none";
  if (tier === "top_7d" || tier === "fast_sale") return 2;
  if (tier === "boost_72h" || tier === "bump") return 1;
  return 1;
}

export function boostPriority(vehicle: Vehicle, now: number) {
  return boostTierRank(vehicle, now);
}

type Ranked = { vehicle: Vehicle; valuation: ReturnType<typeof marketValuation>; priority: number; photos: number; listedAt: number };

/**
 * Top rail: paid highlights first (top_7d > boost_72h/bump), then clean organic
 * fill up to 12 cards. Anti-monopoly caps the first four cards at 2 per seller;
 * all remaining highlights still rotate into the rail afterwards.
 */
export function getTopFeaturedListings(vehicles: readonly Vehicle[], now = Date.now()) {
  const rank = (vehicle: Vehicle): Ranked => ({
    vehicle,
    valuation: marketValuation(vehicle),
    priority: boostTierRank(vehicle, now),
    photos: vehicle.photos.length,
    listedAt: Date.parse(vehicle.listedAt ?? "") || 0,
  });
  const paid = vehicles.filter(v => boostTierRank(v, now) > 0).map(rank).sort((a, b) =>
    b.priority - a.priority || b.listedAt - a.listedAt || a.vehicle.id.localeCompare(b.vehicle.id));
  const organic = vehicles.filter(v => boostTierRank(v, now) === 0 && v.photos.length >= 4).map(rank).sort((a, b) =>
    b.listedAt - a.listedAt || b.photos - a.photos || a.vehicle.id.localeCompare(b.vehicle.id));

  const perSeller = new Map<string, number>();
  const head: Ranked[] = [];
  const tail: Ranked[] = [];
  for (const entry of [...paid, ...organic]) {
    const key = entry.vehicle.dealershipId || `seller:${entry.vehicle.seller || entry.vehicle.id}`;
    const used = perSeller.get(key) ?? 0;
    if (head.length < 4 && used < 2) {
      head.push(entry);
      perSeller.set(key, used + 1);
    } else {
      tail.push(entry);
    }
  }
  return [...head, ...tail].slice(0, 12).map(entry => ({
    ...entry,
    bucket: entry.priority > 0 ? (entry.priority === 2 ? 0 : 1) : 2,
  }));
}
