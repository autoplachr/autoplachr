"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, Maximize, MessageSquare, Phone, Printer, Share2, Star } from "lucide-react";
import { BrandLogo } from "../src/components/BrandLogo";
import { useEffect, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { euro, groups, marketValuation, number, power, registered, taxStatus, type Vehicle } from "./catalog";
import { vehicleMakeOptions } from "./make-equipment";
import { Dialog, Rating, VehiclePhoto } from "./ui";
import { equipmentFor } from "../src/data/equipment-catalog";
import { api } from "./account-api";
import { appointmentLabel, dealershipHoursToday } from "../src/data/working-hours";
import { BuyerTools, monthlyPayment } from "./buyer-tools";

const equipmentHeadings = ["Sigurnost i asistencije", "Udobnost i interijer", "Multimedija i navigacija", "Eksterijer i ovjes"];
const questions = ["Je li vozilo još dostupno?", "Je li moguća zamjena?", "Možete li poslati broj šasije?"];

export default function Detail({ vehicle, inventory, saved, onSave, onBack, onOpen, onNotice, onReport }: {
  vehicle: Vehicle; inventory: Vehicle[]; saved: boolean; onSave: () => void; onBack: () => void;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; onNotice: (message: string) => void; onReport: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [phone, setPhone] = useState("");
  const [revealing,setRevealing] = useState(false);
  useEffect(() => {
    if (!vehicle.contactAvailable || sessionStorage.getItem("autoplac.view."+vehicle.id)) return;
    void api("view",{id:vehicle.id}).then(() => sessionStorage.setItem("autoplac.view."+vehicle.id,"1")).catch(() => undefined);
  },[vehicle.id,vehicle.contactAvailable]);
  async function reveal() {
    if (!vehicle.contactAvailable) {setPhone(vehicle.phone);return;}
    setRevealing(true);
    try {setPhone((await api<{phone:string}>("phone",{id:vehicle.id})).phone);}
    catch (error) {onNotice(error instanceof Error ? error.message : "Broj nije dostupan.");}
    finally {setRevealing(false);}
  }
  const [inquiry, setInquiry] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const count = vehicle.photos.length;
  const active = vehicle.photos[photo];
  const valuation = marketValuation(vehicle);
  const priceScaleMin = Math.round(valuation.excellentMax * 0.88);
  const priceScaleMax = Math.round(valuation.highMax * 1.1);
  const pinLeft = (() => {
    const p = vehicle.price;
    const t = valuation;
    if (p <= t.excellentMax) {
      return Math.max(3, Math.min(19, 20 * Math.max(0, p - priceScaleMin) / Math.max(1, t.excellentMax - priceScaleMin)));
    }
    if (p <= t.goodMax) {
      return 20 + 20 * (p - t.excellentMax) / Math.max(1, t.goodMax - t.excellentMax);
    }
    if (p <= t.fairMax) {
      return 40 + 20 * (p - t.goodMax) / Math.max(1, t.fairMax - t.goodMax);
    }
    if (p <= t.highMax) {
      return 60 + 20 * (p - t.fairMax) / Math.max(1, t.highMax - t.fairMax);
    }
    return Math.min(97, 80 + 20 * (p - t.highMax) / Math.max(1, priceScaleMax - t.highMax));
  })();
  const priceTiers = [
    { rank: 0, bars: 5, label: "Odlična cijena", range: `≤ ${euro(valuation.excellentMax)}`, tone: "good-5" },
    { rank: 1, bars: 4, label: "Dobra cijena", range: `${euro(valuation.excellentMax + 1)} – ${euro(valuation.goodMax)}`, tone: "good-4" },
    { rank: 2, bars: 3, label: "Fer cijena", range: `${euro(valuation.goodMax + 1)} – ${euro(valuation.fairMax)}`, tone: "fair-3" },
    { rank: 3, bars: 2, label: "Viša cijena", range: `${euro(valuation.fairMax + 1)} – ${euro(valuation.highMax)}`, tone: "high-2" },
    { rank: 4, bars: 1, label: "Visoka cijena", range: `> ${euro(valuation.highMax)}`, tone: "high-1" },
  ] as const;
  const deltaSign = valuation.deltaEur > 0 ? "+" : valuation.deltaEur < 0 ? "-" : "";
  const pctSign = valuation.deltaPercent > 0 ? "+" : valuation.deltaPercent < 0 ? "-" : "";
  const deltaTone = Math.abs(valuation.deltaPercent) <= 3 ? "neutral" : valuation.deltaEur < 0 ? "good" : "high";
  const signedDelta = `${deltaSign}${euro(Math.abs(valuation.deltaEur))}`;
  const signedPct = `${pctSign}${Math.abs(valuation.deltaPercent).toLocaleString("hr-HR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const move = (offset: number) => setPhoto(current => (current + offset + count) % count);
  const version = vehicle.variant === "S" ? vehicle.model + " S" : vehicle.variant;
  const breadcrumb = [vehicle.make, vehicle.model, vehicle.generation, version].filter(Boolean);
  const tax = vehicle.flags.includes("pdv") ? "Uključen PDV (R1) • Moguć odbitak pretporeza" :
    vehicle.flags.includes("kupac") ? "Na ime kupca • Bez upravne pristojbe" : taxStatus(vehicle);
  const keySpecs = [
    ["Kilometraža", number(vehicle.km) + " km"], ["Prva registracija", registered(vehicle.date)],
    ["Snaga", power(vehicle.kw).replace(" (", " / ").replace(")", "")], ["Gorivo", vehicle.fuel], ["Mjenjač", vehicle.gear],
    ["Vlasništvo", vehicle.history?.find(item => /vlasnik/i.test(item)) ?? "Nije navedeno"],
  ];
  const specs = [
    ["Marka", vehicle.make], ["Model", vehicle.model], ["Generacija / Šasija", vehicle.generation],
    ["Motorizacija", vehicle.variant], ["Obujam motora (cm³)", vehicle.cc ? number(vehicle.cc) : undefined],
    ["CO₂ emisija (g/km)", vehicle.co2], ["Pogon", vehicle.drive], ["Broj vrata", vehicle.doors], ["Broj sjedala", vehicle.seats],
    ["Boja", vehicle.color], ["Status poreza", taxStatus(vehicle)], ["Registriran do", vehicle.registrationUntil],
  ];
  const equipment = groups.map(group => [...vehicle.equipment[group]]);
  for (const option of vehicleMakeOptions(vehicle)) {
    if (equipment.some(items => items.includes(option.label))) continue;
    const index = /view/i.test(option.id) ? 0 : /seats/i.test(option.id) ? 1 :
      /cockpit|harman|olufsen|mbux|burmester|canton|widescreen/.test(option.id) ? 2 : 3;
    equipment[index].push(option.label);
  }
  for (const option of equipmentFor(vehicle)) {
    if (!vehicle.catalogEquipment?.includes(option.id)) continue;
    const index = [3,3,1,2][option.category];
    if (!equipment[index].includes(option.label)) equipment[index].push(option.label);
  }
  const score = (item: Vehicle) => Number(item.make === vehicle.make) * 2 + Number(item.model === vehicle.model) * 4 + Number(item.fuel === vehicle.fuel);
  const similar = inventory.filter(item => item.id !== vehicle.id).sort((a, b) =>
    score(b) - score(a) || Math.abs(a.price - vehicle.price) - Math.abs(b.price - vehicle.price)).slice(0, 3);

  function photoKeys(event: KeyboardEvent) {
    if (count < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }
  function arrows() {
    return count > 1 && <>
      <button type="button" className="icon-btn gallery-prev" aria-label="Prethodna fotografija" onClick={() => move(-1)}><ChevronLeft size={24}/></button>
      <button type="button" className="icon-btn gallery-next" aria-label="Sljedeća fotografija" onClick={() => move(1)}><ChevronRight size={24}/></button>
    </>;
  }
  const counter = count > 0 && <span className="photo-count tabular" aria-live="polite">{photo + 1} / {count}</span>;

  async function share() {
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set("oglas", vehicle.id);
    try {
      await navigator.clipboard.writeText(url.href);
      onNotice("Poveznica oglasa je kopirana.");
    } catch {
      setShareUrl(url.href);
    }
  }
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [...data.getAll("question"), message.trim(), "", data.get("name"), data.get("email")].join("\n");
    if (!data.getAll("question").length && !message.trim()) {
      setConfirmation("Odaberite pitanje ili napišite poruku.");
      return;
    }
    if (vehicle.demo) {
      setConfirmation("Ogledni upit je pripremljen.");
      return;
    }
    if (!vehicle.email) {
      setConfirmation("Prodavač prima upite telefonom.");
      return;
    }
    window.location.href = "mailto:" + vehicle.email + "?subject=" + encodeURIComponent("Upit za " + vehicle.title) + "&body=" + encodeURIComponent(body);
    setConfirmation("Upit je otvoren u vašoj aplikaciji za e-poštu.");
  }
  return <main className="shell vehicle-detail">
    <div className="detail-utility">
      <div>
        <button type="button" className="text-link detail-back" onClick={onBack}><ArrowLeft size={17}/> Natrag na rezultate</button>
        <nav className="breadcrumbs" aria-label="Putanja oglasa">
          <button type="button" onClick={onBack}>Rabljena vozila</button>
          {breadcrumb.map((part, index) => <span key={index}><span aria-hidden="true"> / </span>{part}</span>)}
        </nav>
      </div>
      <div className="detail-actions">
        <button type="button" className="btn secondary" aria-pressed={saved} onClick={onSave}><Heart size={16} fill={saved ? "currentColor" : "none"}/> {saved ? "Spremljen oglas" : "Spremi oglas"}</button>
        <button type="button" className="btn secondary" onClick={share}><Share2 size={16}/> Podijeli</button>
        <button type="button" className="btn secondary" onClick={onReport}>Prijavi oglas</button>
        <button type="button" className="btn secondary" onClick={() => window.print()}><Printer size={16}/> Ispiši</button>
      </div>
    </div>
    <div className="vehicle-detail-grid">
      <div className="detail-main">
        <header className="detail-title">
          <h1 id="vehicle-title" tabIndex={-1}>{vehicle.title}</h1>
          <p>{[vehicle.variant, vehicle.city, vehicle.demo && "Ogledni oglas"].filter(Boolean).join(" • ")}</p>
          <a className="btn primary mobile-contact" href="#kontakt-prodavaca"><span className="tabular">{euro(vehicle.price)}</span> · Kontakt</a>
        </header>
        <section className="detail-gallery detail-panel" aria-label="Fotografije vozila" onKeyDown={photoKeys}>
          <div className="gallery-main">
            {count ? <button className="gallery-open" type="button" aria-label="Otvori fotografije preko cijelog zaslona" onClick={() => setFullscreen(true)}>
              <VehiclePhoto photo={active} alt={vehicle.title} eager/><span className="gallery-expand"><Maximize size={17}/></span>
            </button> : <VehiclePhoto alt={vehicle.title}/>}
            {counter}{arrows()}
          </div>
          {count > 1 && <div className="thumbnails">{vehicle.photos.map((item, index) => <button key={index} type="button" aria-label={"Fotografija " + (index + 1)} aria-pressed={photo === index} onClick={() => setPhoto(index)}><VehiclePhoto photo={item} alt=""/></button>)}</div>}
        </section>
        <dl className="key-specs detail-panel">{keySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="tabular">{value}</dd></div>)}</dl>
        <section className="detail-panel"><h2 className="brand-spec-heading"><BrandLogo make={vehicle.make} size="md"/><span>Tehnički podaci</span></h2>
          <dl className="spec-table">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="tabular">{value ?? "Nije navedeno"}</dd></div>)}</dl>
        </section>
        <section className="detail-panel"><h2>Oprema vozila</h2>
          <div className="detail-equipment">{equipment.map((items, index) => <section key={equipmentHeadings[index]}>
            <h3>{equipmentHeadings[index]}</h3>
            {items.length ? <ul>{items.map(item => <li key={item}><Check size={15} aria-hidden="true"/>{item}</li>)}</ul> : <p>Nije navedeno</p>}
          </section>)}</div>
        </section>
        <section className="detail-panel seller-description"><h2>Opis prodavača</h2>
          <p>{vehicle.sellerNote || "Prodavač nije unio opis vozila."}</p>
          {vehicle.history?.length ? <p>{vehicle.history.join(" • ")}</p> : null}
        </section>
      </div>
      <aside className="detail-sidebar" aria-label="Cijena, kontakt i alati za kupce">
        <section className="detail-panel price-evaluation" id="kontakt-prodavaca" aria-label="Analiza tržišne cijene u RH">
          <strong className="detail-price tabular">{euro(vehicle.price)}</strong>
          <p>{tax}</p>
          <div className="valuation-module">
            <div className="valuation-head">
              <h2>Analiza tržišne cijene u RH</h2>
              <Rating tier={valuation.rating}/>
            </div>
            <div className="price-scale price-scale-5" role="img" aria-label={`Tražena cijena ${euro(vehicle.price)} u odnosu na tržišni raspon u RH (${euro(valuation.fairMin)} – ${euro(valuation.fairMax)})`}>
              <div/><div/><div/><div/><div/><span style={{ left: pinLeft + "%" }}/>
            </div>
            <div className="scale-labels">
              <span>Odlična</span>
              <span className="tabular">Fer raspon</span>
              <span>Visoka</span>
            </div>
            <div className="valuation-metrics">
              <div>
                <span>Tržišni raspon u RH</span>
                <strong className="tabular">{euro(valuation.fairMin)} – {euro(valuation.fairMax)}</strong>
              </div>
              <div>
                <span>Realna tržišna vrijednost u RH</span>
                <strong className="tabular">{euro(valuation.medianMarketPrice)}</strong>
              </div>
              <div>
                <span>Modelirani uzorak usporedivih vozila u RH</span>
                <strong className="tabular">{valuation.sampleCount} sličnih oglasa</strong>
              </div>
              <div>
                <span>Procjena uvoza iz DE s PPMV-om ({euro(valuation.estimatedPpmvEur)})</span>
                <strong className="tabular">~{euro(valuation.estimatedImportTotalEur)} ukupno</strong>
              </div>
              <div>
                <span>Razlika u odnosu na tržište</span>
                <strong className={"tabular valuation-delta " + deltaTone}>{signedDelta} ({signedPct})</strong>
              </div>
            </div>
            <div className="valuation-track" aria-label={"Ocjena cijene: " + valuation.rating.label}>
              {priceTiers.map(tier => <div key={tier.rank} className={tier.tone} data-active={tier.rank === valuation.rating.rank} title={tier.label}>{tier.rank === valuation.rating.rank && "▼"}</div>)}
            </div>
            <div className="valuation-tiers" aria-label="5 razina tržišne cijene">
              {priceTiers.map(tier => {
                const isActive = valuation.rating.rank === tier.rank;
                return <div key={tier.rank} className={`tier-row ${tier.tone}${isActive ? " active" : ""}`}>
                  <span className="tier-name"><i className="tier-dot" aria-hidden="true"/>{tier.label}</span>
                  <strong className="tabular">{tier.range}</strong>
                </div>;
              })}
            </div>
            <details className="valuation-factors">
              <summary>Detaljan izračun procjene <span className="tabular">({valuation.breakdown.length - 1} koraka)</span></summary>
              <ul className="valuation-waterfall">
                {valuation.breakdown.map(row => <li key={row.id} className={row.isTotal ? "waterfall-total" : undefined}>
                  <div className="waterfall-label">
                    <span>{row.label}</span>
                    {row.detail && <small>{row.detail}</small>}
                  </div>
                  <strong className={"tabular " + (row.isTotal ? "total" : row.amountEur > 0 && row.id !== "base" ? "pos" : row.amountEur < 0 ? "neg" : "")}>
                    {row.id === "base" || row.isTotal ? euro(row.amountEur) : (row.amountEur > 0 ? "+" : row.amountEur < 0 ? "-" : "") + euro(Math.abs(row.amountEur))}
                  </strong>
                </li>)}
              </ul>
            </details>
            {valuation.factors.length > 0 && <details className="valuation-factors">
              <summary>Ključni faktori procjene <span className="tabular">({valuation.factors.length})</span></summary>
              <ul>
                {valuation.factors.map(factor => <li key={factor.id}>
                  <span>{factor.label}</span>
                  <strong className={"tabular " + (factor.impactEur >= 0 ? "pos" : "neg")}>
                    {factor.impactEur >= 0 ? "+" : "-"}{euro(Math.abs(factor.impactEur))}
                  </strong>
                </li>)}
              </ul>
            </details>}
          </div>
          <p className="finance-summary">Informativna rata leasinga <b className="tabular">{euro(Math.round(monthlyPayment(vehicle.price, 20, 60)))} / mj.</b></p>
        </section>
        <section className="detail-panel seller-card" aria-label="Kontakt prodavača">
          <h2>{vehicle.dealershipId ? <a className="legal-link" href={"/?salon="+encodeURIComponent(vehicle.dealershipId)}>{vehicle.seller}</a> : vehicle.seller || "Privatni prodavač"}</h2>
          {vehicle.verified && <p className="verified-label"><Check size={15}/> Verificirana autokuća</p>}
          {vehicle.sellerRating && <p className="seller-rating"><Star size={15} fill="currentColor"/><span className="tabular">{vehicle.sellerRating.score.toLocaleString("hr-HR")} ({vehicle.sellerRating.reviews} recenzija)</span></p>}
          <p>{vehicle.sellerAddress || [vehicle.postalCode, vehicle.city].filter(Boolean).join(" ")}</p>
          {vehicle.sellerWorkingHours ? <>
            <p className="tabular">{dealershipHoursToday(vehicle.sellerWorkingHours)}</p>
            <details className="seller-hours"><summary>Tjedno radno vrijeme</summary><p>{vehicle.sellerHours}</p></details>
            {vehicle.sellerWorkingHours.afterHours && !vehicle.sellerWorkingHours.appointmentOnly && <p>{appointmentLabel}.</p>}
          </> : vehicle.sellerHours && <p>Radno vrijeme: <span className="tabular">{vehicle.sellerHours}</span></p>}
          <div className="contact-actions">
            {phone && !vehicle.demo ? <a className="btn primary tabular" href={"tel:" + phone.replace(/[^+\d]/g, "")}><Phone size={16}/>{phone}</a> :
              <button className="btn primary" type="button" disabled={Boolean(phone) || revealing} onClick={reveal}><Phone size={16}/>{phone ? phone + " (demo)" : "Prikaži broj telefona"}</button>}
            <button type="button" className="btn secondary" aria-expanded={inquiry} onClick={() => setInquiry(!inquiry)}><MessageSquare size={16}/> Pošalji upit prodavaču</button>
          </div>
          {inquiry && <form className="inquiry form-stack" onSubmit={send}>
            <fieldset className="inquiry-questions"><legend>Brza pitanja</legend>{questions.map((question, index) => <label key={question}><input type="checkbox" name="question" value={question} defaultChecked={index === 0}/> {question}</label>)}</fieldset>
            <label className="field"><span>Ime</span><input name="name" required maxLength={70}/></label>
            <label className="field"><span>E-pošta</span><input name="email" type="email" required/></label>
            <label className="field"><span>Dodatna poruka</span><textarea rows={3} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)}/></label>
            <button className="btn primary" type="submit">{vehicle.demo ? "Pripremi demo upit" : "Otvori upit u e-pošti"}</button>
            <p role="status">{confirmation}</p>
          </form>}
        </section>
        <BuyerTools vehicle={vehicle}/>
      </aside>
    </div>
    {similar.length > 0 && <section className="detail-panel similar-section"><h2>Slična vozila u ponudi</h2>
      <div className="similar-list">{similar.map(item => <a key={item.id} className="similar-car" href={"?oglas=" + encodeURIComponent(item.id)} onClick={event => onOpen(event, item.id)}>
        <VehiclePhoto photo={item.photos[0]} alt="" thumbnail/><div><h3>{item.title}</h3><span className="tabular">{registered(item.date)} • {number(item.km)} km</span><strong className="tabular">{euro(item.price)}</strong></div>
      </a>)}</div>
    </section>}
    {fullscreen && <Dialog title="Fotografije vozila" variant="photo-lightbox" onClose={() => setFullscreen(false)}>
      <div className="lightbox-body" onKeyDown={photoKeys}>
        <div className="lightbox-image"><VehiclePhoto photo={active} alt={vehicle.title} eager/>{counter}{arrows()}</div>
        {active?.link && <details className="image-source"><summary>Izvor fotografije</summary><a href={active.link} target="_blank" rel="noreferrer">{active.credit || "Izvor"}</a>{active.licenseUrl && <> · <a href={active.licenseUrl} target="_blank" rel="noreferrer">{active.license}</a></>}{active.preview && <> · Kadrirano za pregled</>}</details>}
      </div>
    </Dialog>}
    {shareUrl && <Dialog title="Podijeli oglas" variant="form-dialog" onClose={() => setShareUrl("")}>
      <div className="dialog-content"><label className="field"><span>Kopirajte poveznicu oglasa</span><input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()}/></label></div>
    </Dialog>}
  </main>;
}
