import { CalendarDays, Check, Gauge, MapPin, Route, Settings2 } from "lucide-react";
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
  ].filter(Boolean))].slice(0, 3).join(" • ");
  const seller = vehicle.dealer ? vehicle.seller || "Autokuća" : "Privatni prodavač";
  const registration = vehicle.registrationUntil?.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  const validUntil = registration ? registration[2] + "/" + registration[1] : vehicle.registrationUntil;
  const note = validUntil ? "Reg. " + validUntil
    : vehicle.flags.includes("kupac") ? "Na ime kupca"
    : vehicle.flags.includes("pdv") ? "PDV (R1)" : "";
  const gear = vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear;
  const specs = [
    { icon: CalendarDays, label: "Prva registracija", value: registered(vehicle.date) },
    { icon: Route, label: "Kilometraža", value: number(vehicle.km) + " km" },
    { icon: Gauge, label: "Snaga", value: power(vehicle.kw) },
    { icon: Settings2, label: "Mjenjač i gorivo", value: [gear, vehicle.fuel].filter(Boolean).join(" · ") },
  ];

  return <article className={horizontal ? "vehicle-card vehicle-list-row" : "vehicle-card"}>
    <ListingPhoto className="vehicle-card-media" vehicle={vehicle} saved={saved} onSave={onSave}
      eager={eager} compact featured={vehicle.isFeatured || hasActiveBoost(vehicle, now)}
      allowPhotoSwipe={!inRail} href={href} onOpen={onOpen} />
    <div className="vehicle-card-body">
      <header>
        <h3 className="vehicle-card-title">
          <a className="card-link no-inner-focus" href={href} onClick={onOpen} title={vehicle.title}><span>{vehicle.title}</span></a>
        </h3>
        {equipment && <p className="vehicle-card-equipment" title={equipment}>{equipment}</p>}
      </header>
      <dl className="vehicle-card-specs tabular">
        {specs.map(({ icon: Icon, label, value }) => <div key={label}>
          <dt><Icon size={13} aria-hidden="true" /><span className="sr-only">{label}</span></dt>
          <dd title={value}>{(value || "—").split(" · ").map((part, index) => <span key={index}>{index > 0 && " · "}{part}</span>)}</dd>
        </div>)}
      </dl>
      <footer className="vehicle-card-footer">
        <div className="vehicle-card-amount tabular">
          <strong>{euro(vehicle.price)}</strong>
          {note && <span>{note}</span>}
        </div>
        <div className="vehicle-card-seller">
          {vehicle.city && <>
            <MapPin size={13} aria-hidden="true" />
            <span className="vehicle-card-city">{vehicle.city}</span>
            <span aria-hidden="true">·</span>
          </>}
          <span className="vehicle-card-seller-name" title={seller}>{seller}</span>
          {vehicle.verified && <Check size={13} strokeWidth={2} role="img"
            aria-label={vehicle.dealer ? "Verificirana autokuća" : "Verificirani prodavač"} />}
        </div>
      </footer>
    </div>
  </article>;
}
