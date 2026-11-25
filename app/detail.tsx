"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, Maximize, MessageSquare, Phone, Printer, Share2, Star } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { euro, groups, number, power, registered, taxStatus, type Vehicle } from "./catalog";
import { vehicleMakeOptions } from "./make-equipment";
import { Dialog, Rating, VehiclePhoto } from "./ui";
import { BuyerTools, monthlyPayment } from "./buyer-tools";

const equipmentHeadings = ["Sigurnost i asistencije", "Udobnost i interijer", "Multimedija i navigacija", "Eksterijer i ovjes"];
const questions = ["Je li vozilo još dostupno?", "Je li moguća zamjena?", "Možete li poslati broj šasije?"];

export default function Detail({ vehicle, inventory, saved, onSave, onBack, onOpen, onNotice }: {
  vehicle: Vehicle; inventory: Vehicle[]; saved: boolean; onSave: () => void; onBack: () => void;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; onNotice: (message: string) => void;
}) {
  const [photo, setPhoto] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [phone, setPhone] = useState(false);
  const [inquiry, setInquiry] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const count = vehicle.photos.length;
  const active = vehicle.photos[photo];
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
        <section className="detail-panel"><h2>Tehnički podaci</h2>
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
        <section className="detail-panel price-evaluation" id="kontakt-prodavaca" aria-label="Cijena i procjena">
          <strong className="detail-price tabular">{euro(vehicle.price)}</strong>
          <p>{tax}</p>
          {vehicle.range && <>
            <Rating vehicle={vehicle}/>
            <div className="price-scale" role="img" aria-label={"Tražena cijena " + euro(vehicle.price) + " u odnosu na ogledni tržišni raspon"}>
              <div/><div/><div/><span style={{ left: Math.max(4, Math.min(96, 33.33 + 33.33 * (vehicle.price - vehicle.range[0]) / Math.max(1, vehicle.range[1] - vehicle.range[0]))) + "%" }}/>
            </div>
            <p>{vehicle.demo ? "Ogledni tržišni raspon" : "Tržišni raspon"} <strong className="tabular">{euro(vehicle.range[0])} – {euro(vehicle.range[1])}</strong></p>
          </>}
          <p className="finance-summary">Informativna rata leasinga <b className="tabular">{euro(Math.round(monthlyPayment(vehicle.price, 20, 60)))} / mj.</b></p>
        </section>
        <section className="detail-panel seller-card" aria-label="Kontakt prodavača">
          <h2>{vehicle.seller || "Privatni prodavač"}</h2>
          {vehicle.verified && <p className="verified-label"><Check size={15}/> Verificirana autokuća</p>}
          {vehicle.sellerRating && <p className="seller-rating"><Star size={15} fill="currentColor"/><span className="tabular">{vehicle.sellerRating.score.toLocaleString("hr-HR")} ({vehicle.sellerRating.reviews} recenzija)</span></p>}
          <p>{vehicle.sellerAddress || vehicle.city}</p>
          {vehicle.sellerHours && <p>Otvoreno danas: <span className="tabular">{vehicle.sellerHours}</span></p>}
          <div className="contact-actions">
            {phone && !vehicle.demo ? <a className="btn primary tabular" href={"tel:" + vehicle.phone.replace(/[^+\d]/g, "")}><Phone size={16}/>{vehicle.phone}</a> :
              <button className="btn primary" type="button" disabled={phone} onClick={() => setPhone(true)}><Phone size={16}/>{phone ? vehicle.phone + " (demo)" : "Prikaži broj telefona"}</button>}
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
        <VehiclePhoto photo={item.photos[0]} alt=""/><div><h3>{item.title}</h3><span className="tabular">{registered(item.date)} • {number(item.km)} km</span><strong className="tabular">{euro(item.price)}</strong></div>
      </a>)}</div>
    </section>}
    {fullscreen && <Dialog title="Fotografije vozila" variant="photo-lightbox" onClose={() => setFullscreen(false)}>
      <div className="lightbox-body" onKeyDown={photoKeys}>
        <div className="lightbox-image"><VehiclePhoto photo={active} alt={vehicle.title} eager/>{counter}{arrows()}</div>
        {active?.link && <details className="image-source"><summary>Izvor fotografije</summary><a href={active.link} target="_blank" rel="noreferrer">{active.credit || "Izvor"}</a>{active.licenseUrl && <> · <a href={active.licenseUrl} target="_blank" rel="noreferrer">{active.license}</a></>}</details>}
      </div>
    </Dialog>}
    {shareUrl && <Dialog title="Podijeli oglas" variant="form-dialog" onClose={() => setShareUrl("")}>
      <div className="dialog-content"><label className="field"><span>Kopirajte poveznicu oglasa</span><input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()}/></label></div>
    </Dialog>}
  </main>;
}
