"use client";

import { Check, ChevronLeft, ChevronRight, Heart, MessageSquare, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { euro, groups, number, power, quick, registered, taxStatus, type Vehicle } from "./catalog";
import { Dialog, PhotoCount, Rating, VehiclePhoto } from "./ui";
import { BuyerTools } from "./buyer-tools";

export default function Detail({ vehicle, saved, onSave, onClose }: {
  vehicle: Vehicle; saved: boolean; onSave: () => void; onClose: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const [phone, setPhone] = useState(false);
  const [inquiry, setInquiry] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const count = vehicle.photos.length;
  const active = vehicle.photos[photo];
  const move = (offset: number) => setPhoto(current => (current + offset + count) % count);
  const masked = vehicle.vin ? vehicle.vin.slice(0, 3) + "•".repeat(10) + vehicle.vin.slice(-4) : "—";
  const specs: [string, string, boolean?][] = [
    ["Marka", vehicle.make], ["Model", vehicle.model], ["Prva registracija", registered(vehicle.date), true],
    ["Kilometraža", number(vehicle.km) + " km", true], ["Snaga", power(vehicle.kw), true],
    ["Obujam", vehicle.cc ? number(vehicle.cc) + " cm³" : "—", true], ["CO₂", vehicle.co2 + " g/km", true],
    ["Gorivo", vehicle.fuel], ["Mjenjač", vehicle.gear], ["Pogon", vehicle.drive],
    ["Broj šasije / VIN", masked, true], ["Status poreza", taxStatus(vehicle)],
  ];
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [String(data.get("message")), "", String(data.get("name")), String(data.get("email"))].join("\n");
    if (vehicle.demo || !vehicle.email) {
      setConfirmation("Ogledni upit je pripremljen. Prodavač u demo oglasu ne prima poruke.");
      return;
    }
    const query = "subject=" + encodeURIComponent("Upit za " + vehicle.title) + "&body=" + encodeURIComponent(body);
    window.location.href = "mailto:" + vehicle.email + "?" + query;
    setConfirmation("Upit je otvoren u vašoj aplikaciji za e-poštu.");
  }
  return <Dialog title={vehicle.title} eyebrow={vehicle.demo ? "Ogledni oglas" : undefined} onClose={onClose} variant="detail-dialog">
    <div className="dialog-content">
      <div className="detail-gallery" aria-label="Fotografije vozila" onKeyDown={event => {
        if (count < 2) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}>
        <div className="gallery-main">
          <VehiclePhoto photo={active} alt={vehicle.title + " · fotografija " + (photo + 1)} eager />
          <PhotoCount index={photo} total={count}/>
          {count > 1 && <>
            <button type="button" className="icon-btn gallery-prev" aria-label="Prethodna fotografija" onClick={() => move(-1)}><ChevronLeft size={23}/></button>
            <button type="button" className="icon-btn gallery-next" aria-label="Sljedeća fotografija" onClick={() => move(1)}><ChevronRight size={23}/></button>
          </>}
        </div>
        {count > 1 && <div className="thumbnails">{vehicle.photos.map((item, index) => <button key={index} type="button" aria-label={"Fotografija " + (index + 1)} aria-pressed={photo === index} onClick={() => setPhoto(index)}><VehiclePhoto photo={item} alt=""/></button>)}</div>}
        {active?.link && <p className="photo-credit">Ilustrativna fotografija · <a target="_blank" rel="noreferrer" href={active.link}>{active.credit} / Unsplash</a></p>}
      </div>
      <div className="detail-summary">
        <div className="price-line"><strong className="mono">{euro(vehicle.price)}</strong><Rating vehicle={vehicle}/></div>
        <button type="button" className={"icon-btn " + (saved ? "saved" : "")} aria-label={saved ? "Ukloni iz spremljenih" : "Spremi vozilo"} aria-pressed={saved} onClick={onSave}><Heart size={20} fill={saved ? "currentColor" : "none"}/></button>
      </div>
      {vehicle.sellerNote && <p className="detail-seller-note">{vehicle.sellerNote}</p>}
      {vehicle.flags.length > 0 && <p className="listing-conditions">{vehicle.flags.map(flag => quick[flag]).join(" · ")}</p>}
      <section className="detail-section">
        <h3>Tehnički podaci</h3>
        <dl className="spec-table">{specs.map(([label, value, mono]) => <div key={label}><dt>{label}</dt><dd className={mono ? "mono" : ""}>{value}</dd></div>)}</dl>
      </section>
      {(vehicle.trim || groups.some(group => vehicle.equipment[group].length)) && <section className="detail-section">
        <h3>Oprema vozila</h3>
        {vehicle.trim && <p className="equipment-summary">{vehicle.trim}</p>}
        <div className="equipment">{groups.filter(group => vehicle.equipment[group].length).map(group => <section key={group}><h4>{group}</h4><ul>{vehicle.equipment[group].map(item => <li key={item}><Check size={14}/>{item}</li>)}</ul></section>)}</div>
      </section>}
      {vehicle.range && <section className="detail-section price-evaluation">
        <h3>Usporedba cijene</h3>
        <p>Tržišni raspon <strong className="mono">{euro(vehicle.range[0])} – {euro(vehicle.range[1])}</strong></p>
        <div className="price-scale" role="img" aria-label={"Tražena cijena " + euro(vehicle.price) + " u odnosu na ogledni tržišni raspon"}>
          <div/><div/><div/><span style={{ left: Math.max(4, Math.min(96, 33.33 + 33.33 * (vehicle.price - vehicle.range[0]) / (vehicle.range[1] - vehicle.range[0]))) + "%" }}/>
        </div>
        <div className="scale-labels"><span>Odlična</span><span>Fer</span><span>Viša</span></div>
        <p className="fine-print">Ogledna procjena za prikaz usporedbe hrvatskog tržišta i ponude na mobile.de.</p>
      </section>}
      <BuyerTools vehicle={vehicle} />
      <section className="detail-section seller-card">
        <div className="seller-title"><h3>{vehicle.seller || "Privatni prodavač"}</h3><p>{vehicle.city}{vehicle.verified && " · Verificirana autokuća"}</p></div>
        <div className="flex flex-wrap gap-2">
          {phone && !vehicle.demo ? <a className="btn secondary mono" href={"tel:" + vehicle.phone.replace(/[^+\d]/g, "")}><Phone size={15}/>{vehicle.phone}</a> : <button className="btn secondary" type="button" onClick={() => setPhone(true)}><Phone size={15}/>{phone ? vehicle.phone + " (demo)" : "Prikaži broj telefona (+385 …)"}</button>}
          <button type="button" className="btn quiet" aria-expanded={inquiry} onClick={() => setInquiry(!inquiry)}><MessageSquare size={15}/> Brzi upit</button>
        </div>
        {inquiry && <form className="inquiry form-stack" onSubmit={send}>
          <div className="form-grid"><label className="field"><span>Ime</span><input name="name" required maxLength={70} /></label><label className="field"><span>E-pošta</span><input name="email" type="email" required /></label></div>
          <label className="field"><span>Poruka</span><textarea name="message" rows={3} required maxLength={1000} defaultValue="Pozdrav, je li vozilo još dostupno?" /></label>
          <button className="btn primary" type="submit">{vehicle.demo ? "Pripremi demo upit" : "Otvori upit u e-pošti"}</button>
          <p role="status">{confirmation}</p>
        </form>}
      </section>
    </div>
  </Dialog>;
}
