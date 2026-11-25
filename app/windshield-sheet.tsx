"use client";

import { Printer } from "lucide-react";
import { createPortal } from "react-dom";
import { useMemo } from "react";
import { create } from "qrcode";
import { euro, number, power, type Vehicle } from "./catalog";
import { vehicleMakeOptions } from "./make-equipment";
import { SITE_URL, vehicleListingPath } from "../src/lib/seo";
import { Dialog } from "./ui";

export function WindshieldSheet({ vehicle, phone, onClose }: { vehicle: Vehicle; phone?: string; onClose: () => void }) {
  const href = SITE_URL + vehicleListingPath(vehicle.id);
  const qr = useMemo(() => {
    const { modules } = create(href, { errorCorrectionLevel: "M" });
    const path = Array.from(modules.data, (dark, index) => dark
      ? "M" + (index % modules.size + 4) + " " + (Math.floor(index / modules.size) + 4) + "h1v1h-1z" : "").join("");
    return { path, size: modules.size + 8 };
  }, [href]);
  const equipment = [...new Set([...vehicleMakeOptions(vehicle).map(item => item.label), ...Object.values(vehicle.equipment).flat()])].slice(0, 10);
  const specs = [
    ["Godište", vehicle.date.slice(0, 4)], ["Kilometraža", number(vehicle.km) + " km"],
    ["Snaga kW/KS", power(vehicle.kw)], ["Gorivo", vehicle.fuel], ["Mjenjač", vehicle.gear],
    ["Pogon", vehicle.drive || "Nije navedeno"], ["CVH status", vehicle.flags.includes("cvh") ? "Potvrđeni kilometri" : "Nije navedeno"],
  ];
  return createPortal(<Dialog title="A4 Cjenik za staklo" variant="windshield-dialog" onClose={onClose}>
    <div className="windshield-controls"><button className="btn primary" type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Ispiši A4</button></div>
    <article className="windshield-sheet tabular">
      <header>
        <strong>AUTOPLAC.HR</strong>
        <span>{[vehicle.seller, vehicle.verified && vehicle.dealer ? "Verificirana autokuća" : ""].filter(Boolean).join(" · ")}</span>
      </header>
      <h1>{vehicle.title}</h1>
      <strong className="windshield-price">{euro(vehicle.price)}</strong>
      <p>{[vehicle.flags.includes("pdv") && "Uključen PDV (R1)", vehicle.flags.includes("kupac") && "Na ime kupca"].filter(Boolean).join(" · ")}</p>
      <dl>{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {equipment.length > 0 && <section><h2>Oprema</h2><ul>{equipment.map(item => <li key={item}>{item}</li>)}</ul></section>}
      <footer>
        <div><h2>Kontakt</h2><strong>{phone || vehicle.phone || "Kontakt dostupan na oglasu"}</strong><p>Skenirajte za pregled oglasa</p></div>
        <a href={href} aria-label="Otvori oglas na AUTOPLAC.HR">
          <svg width="110" height="110" viewBox={"0 0 " + qr.size + " " + qr.size} shapeRendering="crispEdges" aria-hidden="true">
            <rect width={qr.size} height={qr.size} fill="white" /><path d={qr.path} fill="black" />
          </svg>
        </a>
      </footer>
    </article>
  </Dialog>, document.body);
}
