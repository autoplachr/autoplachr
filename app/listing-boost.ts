import { marketValuation, type Vehicle } from "./catalog";

export const boostPlans = {
  boost_72h: { name: "Istakni 72h", price: 2.9, description: "Prioritet u gornjem redu i pretrazi 3 dana." },
  top_7d: { name: "Top ponuda 7 dana", price: 6.9, description: "Najviši prioritet u gornjem redu i oznaka Istaknuto 7 dana." },
} as const;

export type PaidBoostTier = keyof typeof boostPlans;
export type BoostTier = PaidBoostTier | "none";

export function hasActiveBoost(vehicle: Vehicle, now = Date.now()) {
  if (vehicle.isBoosted === undefined) return (vehicle.boostedUntil ?? 0) * 1000 > now;
  return vehicle.isBoosted && (vehicle.boostExpiresAt == null || Date.parse(vehicle.boostExpiresAt) > now);
}

export function boostPriority(vehicle: Vehicle, now: number) {
  return hasActiveBoost(vehicle, now) ? (vehicle.boostTier === "top_7d" ? 2 : 1) : 0;
}

export function getTopFeaturedListings(vehicles: readonly Vehicle[], now = Date.now()) {
  const featured = vehicles.flatMap(vehicle => {
    const boost = boostPriority(vehicle, now);
    const photos = vehicle.photos.length;
    if (!boost && photos < 4) return [];
    const valuation = marketValuation(vehicle);
    const fair = valuation.rating.rank === 0 || valuation.rating.rank === 1;
    return boost || fair ? [{
      vehicle, valuation, boost, photos,
      bucket: boost ? (fair ? 0 : 1) : 2,
      listedAt: Date.parse(vehicle.listedAt ?? "") || 0,
    }] : [];
  });
  return featured.sort((a, b) =>
    a.bucket - b.bucket ||
    b.boost - a.boost ||
    a.valuation.deltaPercent - b.valuation.deltaPercent ||
    Number(b.photos >= 6) - Number(a.photos >= 6) ||
    b.listedAt - a.listedAt ||
    a.vehicle.id.localeCompare(b.vehicle.id)
  ).slice(0, 12);
}
