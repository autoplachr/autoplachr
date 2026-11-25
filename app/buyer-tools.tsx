"use client";

import { Calculator, CreditCard, ExternalLink, Fingerprint } from "lucide-react";
import { useState } from "react";
import { euro, type Vehicle } from "./catalog";
import { customs, customsTables, estimateTax } from "./tax";
import { Select } from "./ui";

export function TaxCalculator({ vehicle }: { vehicle?: Vehicle }) {
  const [price, setPrice] = useState("");
  const [co2, setCo2] = useState(vehicle ? String(vehicle.co2) : "");
  const [fuel, setFuel] = useState(vehicle?.fuel === "Dizel" ? "diesel" : vehicle?.fuel === "Struja" ? "electric" : vehicle?.fuel === "Hibrid" ? "plugin" : "other");
  const [date, setDate] = useState(vehicle ? vehicle.date + "-01" : "");
  const [condition, setCondition] = useState("used");
  const [range, setRange] = useState("");
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const estimate = co2 === "" && fuel !== "electric" || fuel === "plugin" && range === "" ? null : estimateTax({
    price: Number(price), co2: Number(co2), registration: condition === "new" ? today : date,
    diesel: fuel === "diesel", used: condition === "used", plugInKm: fuel === "plugin" ? Number(range) : undefined, electric: fuel === "electric",
  }, now);
  return <div className="utility">
    <p>Unesite hrvatsku cijenu vozila dok je bilo novo, s PDV-om i bez PPMV-a. Za vozila od 2021. unesite WLTP emisiju, a za starija NEDC.</p>
    <div className="form-grid">
      <label className="field"><span>Cijena novog vozila (€)</span><input type="number" min="0" step=".01" className="tabular" placeholder="npr. 42.000" value={price} onChange={event => setPrice(event.target.value)} disabled={fuel === "electric"} /></label>
      <label className="field"><span>Emisija CO₂ (g/km)</span><input type="number" min="0" className="tabular" placeholder="npr. 138" value={co2} onChange={event => setCo2(event.target.value)} disabled={fuel === "electric"} /></label>
      <Select label="Gorivo" value={fuel} onChange={event => setFuel(event.target.value)}>
        <option value="other">Benzin / ostalo</option><option value="diesel">Dizel</option><option value="plugin">Plug-in hibrid</option><option value="electric">Struja</option>
      </Select>
      <Select label="Stanje" value={condition} onChange={event => setCondition(event.target.value)}><option value="used">Rabljeno</option><option value="new">Novo</option></Select>
      {condition === "used" && <label className="field"><span>Prva registracija</span><input type="date" className="tabular" max={today} value={date} onChange={event => setDate(event.target.value)} /></label>}
      {fuel === "plugin" && <label className="field"><span>Električni doseg (km)</span><input type="number" min="0" className="tabular" value={range} onChange={event => setRange(event.target.value)} /></label>}
    </div>
    <div className="calculation" aria-live="polite"><span>Procjena PPMV-a</span><strong className="tabular">{estimate === null ? "—" : euro(estimate, true)}</strong></div>
    <p className="fine-print">Informativni izračun prema tablici ostatka vrijednosti. Ako oglas navodi samo mjesec registracije, unesite točan datum.</p>
    <div className="flex flex-wrap gap-4"><a className="text-link" href={customs} target="_blank" rel="noreferrer">Službeni kalkulator <ExternalLink size={13} /></a><a className="text-link" href={customsTables} target="_blank" rel="noreferrer">Tablice Carinske uprave <ExternalLink size={13} /></a></div>
  </div>;
}

function Finance({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [term, setTerm] = useState(60);
  const rate = .069 / 12;
  const principal = price * (1 - down / 100);
  const payment = principal * rate / (1 - (1 + rate) ** -term);
  return <div className="utility">
    <div className="form-grid">
      <label className="field"><span>Učešće <b className="tabular">{down}%</b></span><input type="range" min="0" max="60" step="5" value={down} onChange={event => setDown(Number(event.target.value))} /></label>
      <label className="field"><span>Trajanje <b className="tabular">{term} mj.</b></span><input type="range" min="24" max="84" step="12" value={term} onChange={event => setTerm(Number(event.target.value))} /></label>
    </div>
    <div className="calculation" aria-live="polite"><span>Procijenjena mjesečna rata</span><strong className="tabular">{euro(payment, true)} / mj.</strong></div>
    <p className="fine-print">Primjer anuiteta uz fiksnu nominalnu kamatu <span className="tabular">6,9%</span> godišnje, bez naknada i ostatka vrijednosti.</p>
  </div>;
}

export function BuyerTools({ vehicle }: { vehicle: Vehicle }) {
  const [tab, setTab] = useState("tax");
  const [showVin, setShowVin] = useState(false);
  return <section className="detail-section" aria-label="Alati za kupce">
    <div className="utility-tabs">
      <button type="button" aria-pressed={tab === "tax"} onClick={() => setTab("tax")}><Calculator size={16}/> PPMV uvoza</button>
      <button type="button" aria-pressed={tab === "vin"} onClick={() => setTab("vin")}><Fingerprint size={16}/> Provjera VIN-a</button>
      <button type="button" aria-pressed={tab === "credit"} onClick={() => setTab("credit")}><CreditCard size={16}/> Leasing / Kredit</button>
    </div>
    {tab === "tax" && <TaxCalculator vehicle={vehicle} />}
    {tab === "credit" && <Finance price={vehicle.price} />}
    {tab === "vin" && <div className="utility">
      <div className="calculation"><span>Broj šasije {vehicle.demo && "(demo)"}</span><strong className="tabular">{vehicle.vin ? showVin ? vehicle.vin : vehicle.vin.slice(0, 3) + "•".repeat(10) + vehicle.vin.slice(-4) : "—"}</strong></div>
      <div className="flex flex-wrap gap-3">
        {vehicle.vin && <button className="btn quiet" type="button" onClick={() => setShowVin(!showVin)}>{showVin ? "Sakrij VIN" : "Prikaži VIN"}</button>}
        <a className="btn secondary" href="https://www.carvertical.com/hr" target="_blank" rel="noreferrer">Provjeri povijest vozila (carVertical) <ExternalLink size={15}/></a>
      </div>
    </div>}
  </section>;
}
