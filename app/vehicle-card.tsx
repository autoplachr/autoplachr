import { Check, Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { BrandLogo } from "../src/components/BrandLogo";
import { CarImage } from "../src/components/CarImage";
import { ListingPhoto } from "../src/components/ListingPhoto";
import { vehicleListingPath } from "../src/lib/seo";
import { euro, marketValuation, number, power, registered, type Vehicle } from "./catalog";
import { hasActiveBoost } from "./listing-boost";
import { vehicleMakeOptions } from "./make-equipment";

/** Real registration expiry as MM/YYYY, or "" when the listing has none. */
function registrationLabel(vehicle: Vehicle) {
  const reg = vehicle.registrationUntil?.trim() ?? "";
  const iso = reg.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  const slash = reg.match(/^(\d{1,2})[./](\d{4})\.?$/);
  return iso ? iso[2] + "/" + iso[1] : slash ? slash[1].padStart(2, "0") + "/" + slash[2] : "";
}

/**
 * Public deal pill. Shown only when the seller opted in AND the asking price is at
 * least 5 % below the market median (`meetsPublicBadge`). ≥ 10 % → "Odlična cijena".
 */
export function dealPill(vehicle: Vehicle): { label: string; strong: boolean } | null {
  if (vehicle.showPriceBadge !== true || !(vehicle.price > 0)) return null;
  const valuation = marketValuation(vehicle);
  if (!valuation.meetsPublicBadge) return null;
  return vehicle.price * 100 <= valuation.medianMarketPrice * 90
    ? { label: "Odlična cijena", strong: true }
    : { label: "Dobra cijena", strong: false };
}

/** Homepage catalogue card (DESIGN.md §4.4). */
export function CatalogCard({ vehicle, saved, onOpen, onSave, eager }: {
  vehicle: Vehicle;
  saved: boolean;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
  onSave: () => void;
  eager: boolean;
}) {
  const href = vehicleListingPath(vehicle.id);
  const year = vehicle.date.slice(0, 4);
  const reg = registrationLabel(vehicle);
  const tag = reg ? "Reg. " + reg : vehicle.flags.includes("pdv") ? "PDV (R1)" : "";
  const deal = dealPill(vehicle);
  const seller = vehicle.dealer ? vehicle.seller || "Autokuća" : "Privatni prodavač";
  const gear = vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear;
  const fuel = vehicle.fuel === "Struja" ? "Električni" : vehicle.fuel;
  const title = (year ? year + " " : "") + vehicle.title;
  const subtitle = [vehicle.km ? number(vehicle.km) + " km" : "", vehicle.city].filter(Boolean).join(" · ");

  return <article className="ap-card group flex flex-col rounded-2xl border border-(--ap-line-strong) bg-(--ap-card)">
    <div className="relative aspect-[16/10] rounded-t-2xl bg-(--ap-photo)">
      <a href={href} onClick={onOpen} tabIndex={-1} aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-t-2xl">
        <CarImage photo={vehicle.photos[0]} alt={vehicle.title} eager={eager}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
      </a>
      {deal && <span className={"pointer-events-none absolute left-3 top-3 z-[2] rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm "
        + (deal.strong ? "bg-white/95 text-[#111318]" : "bg-[#22C55E] text-white")}>{deal.label}</span>}
      <button type="button" aria-pressed={saved} aria-label={(saved ? "Ukloni iz spremljenih: " : "Spremi: ") + vehicle.title}
        onClick={onSave}
        className={"ap-press ap-heart absolute right-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm "
          + (saved ? "text-[#1D4ED8]" : "text-[#111318]")}>
        <Heart size={15} strokeWidth={2} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
      <span className="ap-medallion absolute -bottom-4 right-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-(--ap-divider) bg-white"
        title={vehicle.make}>
        <BrandLogo make={vehicle.make} size="xs" />
      </span>
    </div>
    <div className="flex flex-1 flex-col p-4 pt-3.5">
      <h3 className="truncate pr-8 text-[15px] font-bold leading-snug tracking-[-0.01em] text-(--ap-ink)">
        <a href={href} onClick={onOpen} title={title} className="ap-card-link hover:underline">{title}</a>
      </h3>
      <p className="mt-0.5 truncate text-[12px] text-(--ap-text-2) tabular-nums">{subtitle}</p>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <strong className="text-[20px] font-extrabold leading-none tracking-[-0.02em] text-(--ap-ink) tabular-nums">{euro(vehicle.price)}</strong>
        {tag && <span className="rounded-md bg-(--ap-tag-bg) px-2 py-0.5 text-[11px] font-semibold text-(--ap-tag-ink) tabular-nums">{tag}</span>}
      </div>
      <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-(--ap-divider) pt-3">
        <div className="min-w-0">
          <dt className="sr-only">Prva registracija</dt>
          <dd className="truncate text-[13px] font-bold text-(--ap-ink) tabular-nums">{registered(vehicle.date)}</dd>
          <dd aria-hidden="true" className="text-[11px] text-(--ap-faint)">Godište</dd>
        </div>
        <div className="min-w-0">
          <dt className="sr-only">Snaga</dt>
          <dd className="truncate text-[13px] font-bold text-(--ap-ink) tabular-nums">{vehicle.kw ? vehicle.kw + " kW" : "—"}</dd>
          <dd className="text-[11px] text-(--ap-faint) tabular-nums">{vehicle.kw ? Math.round(vehicle.kw * 1.35962) + " KS" : "Snaga"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="sr-only">Mjenjač i gorivo</dt>
          <dd className="truncate text-[13px] font-bold text-(--ap-ink)">{gear || "—"}</dd>
          <dd className="truncate text-[11px] text-(--ap-faint)">{fuel}</dd>
        </div>
      </dl>
      <div className="min-h-3 flex-1" aria-hidden="true" />
      <footer className="flex items-center justify-between gap-3 border-t border-(--ap-divider) pt-3 text-[12px]">
        <span className="flex min-w-0 items-center gap-1 font-medium text-(--ap-text-2)">
          <span className="truncate" title={seller}>{seller}</span>
          {vehicle.verified && <Check size={13} strokeWidth={2.5} className="flex-none text-(--ap-accent)" role="img"
            aria-label={vehicle.dealer ? "Verificirana autokuća" : "Verificirani prodavač"} />}
        </span>
        <a href={href} onClick={onOpen} className="shrink-0 font-semibold text-(--ap-ink) hover:underline">Pogledaj detalje</a>
      </footer>
    </div>
  </article>;
}

export function VehicleCard({ vehicle, saved, onOpen, onSave, eager, horizontal = false, inRail = false, now }: {
  vehicle: Vehicle;
  saved: boolean;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
  onSave: () => void;
  eager: boolean;
  horizontal?: boolean;
  inRail?: boolean;
  now?: number;
}) {
  const href = vehicleListingPath(vehicle.id);
  const equipment = [...new Set([
    ...vehicleMakeOptions(vehicle).map(option => option.label),
    ...Object.values(vehicle.equipment).flat(),
  ].filter(Boolean))].slice(0, 3).join(" · ");
  const seller = vehicle.dealer ? vehicle.seller || "Autokuća" : "Privatni prodavač";
  // Only show "Reg." for a real month/year; never a dangling label.
  const reg = vehicle.registrationUntil?.trim() ?? "";
  const isoReg = reg.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  const slashReg = reg.match(/^(\d{1,2})[./](\d{4})\.?$/);
  const validUntil = isoReg ? isoReg[2] + "/" + isoReg[1] : slashReg ? slashReg[1].padStart(2, "0") + "/" + slashReg[2] : "";
  const note = validUntil ? "Reg. " + validUntil
    : vehicle.flags.includes("kupac") ? "Na ime kupca"
    : vehicle.flags.includes("pdv") ? "PDV (R1)" : "";
  const gear = vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear;
  const specs = [registered(vehicle.date), vehicle.km ? number(vehicle.km) + " km" : "", vehicle.kw ? power(vehicle.kw) : "", gear, vehicle.fuel]
    .filter(Boolean).join(" · ");

  return <article className={horizontal ? "vehicle-card vehicle-list-row" : "vehicle-card"}>
    <ListingPhoto className="vehicle-card-media" vehicle={vehicle} saved={saved} onSave={onSave}
      eager={eager} compact featured={vehicle.isFeatured || hasActiveBoost(vehicle, now)}
      allowPhotoSwipe={!inRail} href={href} onOpen={onOpen} />
    <div className="vehicle-card-body">
      <h3 className="vehicle-card-title">
        <a className="card-link no-inner-focus" href={href} onClick={onOpen} title={vehicle.title}><span>{vehicle.title}</span></a>
      </h3>
      <p className="vehicle-card-specs tabular-nums" title={specs}>{specs}</p>
      {equipment && <p className="vehicle-card-equipment" title={equipment}>{equipment}</p>}
      <div className="vehicle-card-amount tabular-nums">
        <strong>{euro(vehicle.price)}</strong>
        {note && <span>{note}</span>}
      </div>
      <footer className="vehicle-card-seller">
        {vehicle.city && <><span className="vehicle-card-city">{vehicle.city}</span><span aria-hidden="true">·</span></>}
        <span className="vehicle-card-seller-name" title={seller}>{seller}</span>
        {vehicle.verified && <Check size={13} strokeWidth={2.25} className="vehicle-card-verified" role="img"
          aria-label={vehicle.dealer ? "Verificirana autokuća" : "Verificirani prodavač"} />}
      </footer>
    </div>  </article>;
}
