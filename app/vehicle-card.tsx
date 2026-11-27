import { Check } from "lucide-react";
import type { MouseEvent } from "react";
import { ListingPhoto } from "../src/components/ListingPhoto";
import { vehicleListingPath } from "../src/lib/seo";
import { euro, number, power, registered, type Vehicle } from "./catalog";
import { hasActiveBoost } from "./listing-boost";
import { vehicleMakeOptions } from "./make-equipment";

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
