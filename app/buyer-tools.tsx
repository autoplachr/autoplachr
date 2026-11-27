"use client";

import { Calculator, CreditCard, ExternalLink, Fingerprint } from "lucide-react";
import { useState } from "react";
import { euro, type Vehicle } from "./catalog";
import { customs, customsTables, estimateTax } from "./tax";
import { Select } from "./ui";

export function TaxCalculator({ vehicle, prefillPrice = false }: { vehicle?: Vehicle; prefillPrice?: boolean }) {
  const [price, setPrice] = useState(prefillPrice && vehicle ? String(vehicle.price) : "");
  const [priceConfirmed, setPriceConfirmed] = useState(!prefillPrice);
  const [co2, setCo2] = useState(vehicle ? String(vehicle.co2) : "");
  const [fuel, setFuel] = useState(vehicle?.fuel === "Dizel" ? "diesel" : vehicle?.fuel === "Struja" ? "electric" : vehicle?.fuel === "Hibrid" ? "plugin" : "other");
  const [date, setDate] = useState(vehicle ? vehicle.date + "-01" : "");
  const [condition, setCondition] = useState("used");
  const [range, setRange] = useState("");
  const [changed, setChanged] = useState(false);
  const now = new Date();
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const invalidPrice = price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 500);
  const invalidCo2 = co2 !== "" && (!Number.isFinite(Number(co2)) || Number(co2) < 0 || Number(co2) > 500);
  const invalidRange = fuel === "plugin" && range !== "" && (!Number.isFinite(Number(range)) || Number(range) < 0);
  const invalidInputs = fuel !== "electric" && (invalidPrice || invalidCo2 || invalidRange);
  const estimate = invalidInputs || (!priceConfirmed && fuel !== "electric") || co2 === "" && fuel !== "electric" || fuel === "plugin" && range === "" ? null : estimateTax({
    price: Number(price), co2: Number(co2), registration: condition === "new" ? today : date,
    diesel: fuel === "diesel", used: condition === "used", plugInKm: fuel === "plugin" ? Number(range) : undefined, electric: fuel === "electric",
  }, now);
  return <div className="utility">
    {prefillPrice && <p>Unesena je cijena oglasa kao početna vrijednost. Za procjenu PPMV-a zamijenite je hrvatskom cijenom novog vozila.</p>}
    <p>Unesite hrvatsku cijenu vozila dok je bilo novo, s PDV-om i bez PPMV-a. Za vozila od 2021. unesite WLTP emisiju, a za starija NEDC.</p>
    <div className="form-grid" onChangeCapture={() => setChanged(true)}>
      <label className="field"><span>Cijena novog vozila (€)</span><input type="number" min="500" step=".01" aria-invalid={fuel !== "electric" && invalidPrice} className="tabular" placeholder="npr. 42.000" value={price} onChange={event => { setPrice(event.target.value); setPriceConfirmed(true); }} disabled={fuel === "electric"} /></label>
      <label className="field"><span>Emisija CO₂ (g/km)</span><input type="number" min="0" max="500" aria-invalid={fuel !== "electric" && invalidCo2} className="tabular" placeholder="npr. 138" value={co2} onChange={event => setCo2(event.target.value)} disabled={fuel === "electric"} /></label>
      <Select label="Gorivo" value={fuel} onChange={event => setFuel(event.target.value)}>
        <option value="other">Benzin / ostalo</option><option value="diesel">Dizel</option><option value="plugin">Plug-in hibrid</option><option value="electric">Struja</option>
      </Select>
      <Select label="Stanje" value={condition} onChange={event => setCondition(event.target.value)}><option value="used">Rabljeno</option><option value="new">Novo</option></Select>
      {condition === "used" && <label className="field"><span>Prva registracija</span><input type="date" className="tabular" max={today} value={date} onChange={event => setDate(event.target.value)} /></label>}
      {fuel === "plugin" && <label className="field"><span>Električni doseg (km)</span><input type="number" min="0" className="tabular" value={range} onChange={event => setRange(event.target.value)} /></label>}
    </div>
    {invalidInputs && <p className="form-error" role="alert">{invalidRange
      ? "Unesite ispravan električni doseg (0 km ili više)."
      : "Unesite ispravnu vrijednost vozila (min. 500 €) i emisiju CO₂ (0–500 g/km)."}</p>}
    {!invalidInputs && changed && estimate === null && <p className="form-error" role="status">
      {condition === "used" && (!date || date > today)
        ? "Unesite valjan datum prve registracije."
        : "Provjerite cijenu, emisiju CO₂ i ostale podatke potrebne za izračun."}
    </p>}
    <div className="calculation" aria-live="polite"><span>Procjena PPMV-a</span><strong className="tabular">{estimate === null ? "—" : euro(estimate, true)}</strong></div>
    <p className="fine-print">Informativni izračun prema tablici ostatka vrijednosti. Ako oglas navodi samo mjesec registracije, unesite točan datum.</p>
    <div className="flex flex-wrap gap-4"><a className="text-link" href={customs} target="_blank" rel="noreferrer">Službeni kalkulator <ExternalLink size={13} /></a><a className="text-link" href={customsTables} target="_blank" rel="noreferrer">Tablice Carinske uprave <ExternalLink size={13} /></a></div>
  </div>;
}

export function monthlyPayment(price: number, down: number, term: number) {
  const rate = .069 / 12;
  const principal = price * (1 - down / 100);
  return principal * rate / (1 - (1 + rate) ** -term);
}

function Finance({ price }: { price: number }) {
  const [down, setDown] = useState(20);
  const [term, setTerm] = useState(60);
  const payment = monthlyPayment(price, down, term);
  return <div className="utility">
    <div className="form-grid">
      <label className="field"><span>Učešće <b className="tabular">{down}%</b></span><input type="range" aria-label="Učešće u postocima" aria-valuetext={down + "%"} min="10" max="50" step="5" value={down} onChange={event => setDown(Number(event.target.value))} /></label>
      <label className="field"><span>Trajanje <b className="tabular">{term} mj.</b></span><input type="range" aria-label="Rok otplate u mjesecima" aria-valuetext={term + " mjeseci"} min="24" max="84" step="12" value={term} onChange={event => setTerm(Number(event.target.value))} /></label>
    </div>
    <div className="calculation" aria-live="polite"><span>Procijenjena mjesečna rata</span><strong className="tabular">{euro(payment, true)} / mj.</strong></div>
    <p className="fine-print">Primjer anuiteta uz fiksnu nominalnu kamatu <span className="tabular">6,9%</span> godišnje, bez naknada i ostatka vrijednosti.</p>
  </div>;
}

export function BuyerTools({ vehicle }: { vehicle: Vehicle }) {
  const arriving = vehicle.flags.includes("dolazak");
  const [tab, setTab] = useState(arriving ? "tax" : "credit");
  const [showVin, setShowVin] = useState(false);
  return <section className="detail-panel" aria-label="Alati za kupce">
    <h2>Alati za kupce</h2>
    <div className="utility-tabs">
      <button type="button" aria-pressed={tab === "tax"} onClick={() => setTab("tax")}><Calculator size={16}/> PPMV uvoza</button>
      <button type="button" aria-pressed={tab === "vin"} onClick={() => setTab("vin")}><Fingerprint size={16}/> Provjera VIN-a</button>
      <button type="button" aria-pressed={tab === "credit"} onClick={() => setTab("credit")}><CreditCard size={16}/> Leasing / Kredit</button>
    </div>
    {tab === "tax" && <TaxCalculator vehicle={vehicle} prefillPrice={arriving} />}
    {tab === "credit" && <Finance price={vehicle.price} />}
    {tab === "vin" && <div className="utility">
      <div className="calculation"><span>Broj šasije {vehicle.demo && "(demo)"}</span><strong className="tabular">{vehicle.vin ? showVin ? vehicle.vin : vehicle.vin.slice(0, -5) + "•".repeat(Math.min(5, vehicle.vin.length)) : "—"}</strong></div>
      <div className="flex flex-wrap gap-3">
        {vehicle.vin && <button className="btn quiet" type="button" onClick={() => setShowVin(!showVin)}>{showVin ? "Sakrij VIN" : "Prikaži cijeli VIN"}</button>}
        <a className="btn secondary" href="https://www.carvertical.com/hr" target="_blank" rel="noreferrer">Provjeri povijest i kilometre (carVertical) <ExternalLink size={15}/></a>
      </div>
    </div>}
  </section>;
}
