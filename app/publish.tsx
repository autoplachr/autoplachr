"use client";

import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cities, emptyEquipment, equipmentOptions, euro, fuels, gears, groups, makes, modelPhotos, vehicles, type Photo, type Vehicle } from "./catalog";
import { modelsFor } from "./search";
import { Dialog, ListingOptions, MakeEquipmentOptions, Select, VehiclePhoto } from "./ui";
import { selectedMakeOptions } from "./make-equipment";

type Publish = Omit<Vehicle, "id">;
const initial: Publish = {
  make: "", model: "", title: "", trim: "", price: 0, date: "", km: 0, kw: 0, cc: 0, co2: 0, fuel: "Dizel",
  gear: "Automatski", drive: "Prednji", vin: "", city: "", seller: "", dealer: false, verified: false,
  phone: "+385 ", email: "", flags: [], photos: [], equipment: emptyEquipment(), makeEquipment: [],
};
const steps = ["Vozilo", "Oprema i fotografije", "Cijena i kontakt"];
const example: Publish = {
  ...vehicles[1], title: "Audi A4 35 TDI S-Line", trim: "S-Line · LED · Virtual Cockpit", price: 18800,
  date: "2019-10", km: 142300, kw: 110, co2: 109, vin: "EXAMPLE0000112345", city: "Zagreb",
  seller: "Primjer Auto", sellerNote: "Audi A4 s urednom servisnom poviješću. Vozilo se može pogledati u Zagrebu uz najavu.",
  phone: "+385 00 000 000", email: "", range: [18400, 19200], demo: true, verified: false,
  photos: modelPhotos("audi-a4"),
  makeEquipment: ["audi-s-line", "audi-virtual-cockpit"],
  equipment: { Sigurnost: ["ABS / ESP", "ISOFIX", "Adaptivni tempomat"], Udobnost: ["Sportska sjedala", "Automatska klima"], Multimedija: ["Digitalni kokpit", "Apple CarPlay"], Eksterijer: ["LED svjetla", "Sportski paket"] },
};

async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Canvas unavailable"); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { src: canvas.toDataURL("image/webp", .78) };
}

export default function PublishForm({ onClose, onPublish }: { onClose: () => void; onPublish: (v: Vehicle) => void; }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Publish>(key: K, value: Publish[K]) => setValues(old => ({ ...old, [key]: value }));

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const queued = Array.from(files).slice(0, 6 - values.photos.length);
      if (queued.some(file => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 15_000_000)) throw new Error("Invalid image");
      const photos = await Promise.all(queued.map(preparePhoto));
      setValues(old => ({ ...old, photos: [...old.photos, ...photos].slice(0, 6) }));
    } catch { setError("Odaberite JPG, PNG, AVIF ili WebP fotografije do 15 MB."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 2) { setStep(step + 1); return; }
    if (!values.demo && !/^\+?[\d\s()\-]{8,24}$/.test(values.phone.trim()) || !values.demo && values.phone.replace(/\D/g, "").length < 8) {
      setError("Unesite ispravan telefonski broj."); return;
    }
    if (!values.demo && values.dealer && !values.seller.trim()) { setError("Unesite naziv autokuće."); return; }
    try {
      onPublish({ ...values, make: values.make.trim(), title: values.title.trim(), seller: values.seller.trim(), email: values.email?.trim(), phone: values.phone.trim(), id: crypto.randomUUID() });
    } catch { setError("Oglas nije spremljen. Smanjite broj fotografija ili oslobodite prostor u pregledniku."); }
  }
  function numeric(label: string, key: "price" | "km" | "kw" | "cc" | "co2", min = 0, max = 1000000) {
    return <label className="field"><span>{label}</span><input required className="mono" type="number" min={min} max={max} value={min ? values[key] || "" : values[key]} onChange={event => set(key, Number(event.target.value))} placeholder={min ? undefined : "0"} /></label>;
  }
  const detected = values.range;
  const options = modelsFor(values.make);
  const now = new Date();
  const maxMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  return <Dialog title="Predaj oglas" onClose={onClose} variant="form-dialog">
    <div className="dialog-content">
      <ol className="steps">{steps.map((label, index) => <li className={index === step ? "current" : index < step ? "complete" : ""} key={label} aria-current={index === step ? "step" : undefined}><span className="mono">{index < step ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
      {step === 0 && <button type="button" className="text-link demo-fill" disabled={busy} onClick={() => { setValues(example); setError(""); }}>Popuni primjerom</button>}
      <form className="form-stack" onSubmit={submit}>
        {step === 0 && <div className="form-grid">
          <Select label="Marka" required value={values.make} onChange={event => setValues(old => ({ ...old, make: event.target.value, model: "", makeEquipment: [] }))}><option value="">Odaberite marku</option>{Object.keys(makes).map(make => <option key={make}>{make}</option>)}</Select>
          <Select label="Model" required value={values.model} onChange={event => setValues(old => ({
            ...old, model: event.target.value,
            makeEquipment: selectedMakeOptions(old.make, event.target.value, old.makeEquipment ?? []),
          }))} disabled={!options.length}><option value="">Odaberite model</option>{options.map(model => <option key={model}>{model}</option>)}</Select>
          <label className="field span-all"><span>Naslov oglasa</span><input value={values.title} onChange={event => set("title", event.target.value)} maxLength={80} pattern=".*\S.*" required placeholder="npr. Audi A4 35 TDI S-Line" /></label>
          <label className="field"><span>Prva registracija</span><input className="mono" type="month" min="1990-01" max={maxMonth} value={values.date} onChange={event => set("date", event.target.value)} required /></label>
          {numeric("Kilometraža (km)", "km")}{numeric("Snaga (kW)", "kw", 1, 2000)}{numeric("Obujam (cm³)", "cc", 0, 30000)}{numeric("CO₂ (g/km)", "co2", 0, 999)}
          <Select label="Gorivo" value={values.fuel} onChange={event => set("fuel", event.target.value as Vehicle["fuel"])}>{fuels.map(fuel => <option key={fuel}>{fuel}</option>)}</Select>
          <Select label="Mjenjač" value={values.gear} onChange={event => set("gear", event.target.value as Vehicle["gear"])}>{gears.map(gear => <option key={gear}>{gear}</option>)}</Select>
          <Select label="Pogon" value={values.drive} onChange={event => set("drive", event.target.value)}><option>Prednji</option><option>Stražnji</option><option>4×4</option></Select>
          <label className="field span-all"><span>VIN (neobavezno)</span><input className="mono" value={values.vin} maxLength={17} pattern={values.demo ? undefined : "[A-HJ-NPR-Z0-9]{17}"} title="17 znakova bez slova I, O ili Q" onChange={event => set("vin", event.target.value.toUpperCase())} /></label>
        </div>}
        {step === 1 && <>
          <label className="field"><span>Napomena prodavača (neobavezno)</span><textarea rows={3} value={values.sellerNote ?? ""} maxLength={400} onChange={event => set("sellerNote", event.target.value)} placeholder="Navedite stanje vozila, servisnu povijest ili kada je moguć pregled." /></label>
          <label className="field"><span>Istaknuta oprema</span><input value={values.trim} maxLength={100} onChange={event => set("trim", event.target.value)} placeholder="npr. Digitalni kokpit · Matrix LED" /></label>
          <MakeEquipmentOptions make={values.make} model={values.model} selected={values.makeEquipment ?? []} onChange={selection => set("makeEquipment", selection)} />
          <div className="equipment edit-equipment">{groups.map(group => <fieldset key={group}><legend>{group}</legend>{equipmentOptions[group].map(item => <label key={item}><input type="checkbox" checked={values.equipment[group].includes(item)} onChange={event => {
            const items = values.equipment[group];
            set("equipment", { ...values.equipment, [group]: event.target.checked ? [...items, item] : items.filter(value => value !== item) });
          }}/>{item}</label>)}</fieldset>)}</div>
          <ListingOptions selected={values.flags} onChange={selected => set("flags", selected)} />
          <div className="upload-row">{values.photos.map((photo, index) => <div className="upload-item" key={index}><VehiclePhoto photo={photo} alt={"Fotografija " + (index + 1)}/><button type="button" className="icon-btn" aria-label={"Ukloni fotografiju " + (index + 1)} onClick={() => set("photos", values.photos.filter((_, n) => n !== index))}>×</button></div>)}</div>
          <label className="file-field"><ImagePlus size={19}/> Fotografije vozila ({values.photos.length}/6)<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || values.photos.length >= 6} onChange={event => { void addPhotos(event.target.files); event.target.value = ""; }} /></label>
        </>}
        {step === 2 && <>
          {detected && <div className="calculation"><span>Ogledni raspon cijene</span><strong className="mono">{euro(detected[0])} – {euro(detected[1])}</strong></div>}
          <div className="form-grid">
            {numeric("Tražena cijena (€)", "price", 1, 100000000)}
            <Select label="Grad" required value={values.city} onChange={event => set("city", event.target.value)}><option value="">Odaberite grad</option>{cities.map(city => <option key={city}>{city}</option>)}</Select>
            <Select label="Prodavač" value={values.dealer ? "dealer" : "private"} onChange={event => set("dealer", event.target.value === "dealer")}><option value="private">Privatni prodavač</option><option value="dealer">Autokuća</option></Select>
            <label className="field"><span>{values.dealer ? "Naziv autokuće" : "Ime prodavača"}</span><input required={values.dealer} value={values.seller} maxLength={65} onChange={event => set("seller", event.target.value)} /></label>
            <label className="field"><span>Telefon</span><input className="mono" type="tel" required value={values.phone} onChange={event => set("phone", event.target.value)} /></label>
            <label className="field"><span>E-pošta {values.demo ? "(neobavezno)" : ""}</span><input type="email" required={!values.demo} value={values.email} onChange={event => set("email", event.target.value)} /></label>
          </div>
          <p className="fine-print">Oglas se objavljuje u ponudi na ovom pregledniku.</p>
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="btn quiet" onClick={() => { setError(""); if (step) setStep(step - 1); else onClose(); }}><ArrowLeft size={16}/>{step ? "Natrag" : "Odustani"}</button><button type="submit" className="btn primary" disabled={busy}>{step === 2 ? <><Plus size={16}/> Objavi oglas (0 €)</> : <>Nastavi <ArrowRight size={16}/></>}</button></div>
      </form>
    </div>
  </Dialog>;
}

