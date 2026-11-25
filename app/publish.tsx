"use client";

import { MonthYearField } from "./month-year-field";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Plus, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { bodyTypes, emptyEquipment, equipmentOptions, euro, gears, groups, modelPhotos, vehicles, type Photo, type Vehicle } from "./catalog";
import { CatalogFields, customVariant, VariantField } from "./catalog-fields";
import { OTHER_MODEL, titleContainsChassis } from "../src/data/car-catalog";
import { LocationFields } from "./dealership-fields";
import { EquipmentSelector } from "./equipment-selector";
import { equipmentFor } from "../src/data/equipment-catalog";
import { Dialog, ListingOptions, MakeEquipmentOptions, Rating, Select, VehiclePhoto } from "./ui";
import { selectedMakeOptions } from "./make-equipment";
import { describeMarketDelta, evaluateMarketPrice } from "../src/lib/price-engine";
import { calculateCo2, ksToKw, kwToKs, resolveVehicleSpecs, toCatalogFuel, type SpecFuel } from "../src/lib/spec-resolver";
import { scanPhotosForEquipment, type ScannedEquipmentHit } from "../src/lib/photo-scanner";

type Publish = Omit<Vehicle, "id" | "generation" | "variant" | "fuel"> & {
  generation: string;
  variant: string;
  fuel: SpecFuel;
};

const specFuels: readonly SpecFuel[] = ["Dizel", "Benzin", "Hibrid", "Plug-in hibrid", "Električni", "LPG"];

const initial: Publish = {
  make: "", model: "", generation: "", variant: "", bodyType: "", title: "", trim: "", price: 0, date: "", km: 0, kw: 0, cc: 0, co2: 0, fuel: "Dizel",
  gear: "Automatski", drive: "Prednji", vin: "", city: "", seller: "", dealer: false, verified: false,
  phone: "+385 ", email: "", flags: [], photos: [], equipment: emptyEquipment(), makeEquipment: [],
};
const steps = ["Vozilo", "Oprema i fotografije", "Cijena i kontakt"];
const example: Publish = {
  ...vehicles[1], generation: "B9", variant: "35 TDI S line", bodyType: "Karavan", title: "Audi A4 B9 35 TDI S line", trim: "S-Line · LED · Virtual Cockpit", price: 18800,
  date: "2019-10", km: 142300, kw: 110, co2: 109, fuel: "Dizel", vin: "EXAMPLE0000112345", city: "Zagreb",
  seller: "Primjer Auto",
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

export default function PublishForm({ onClose, onPublish, existing, contact }: { onClose: () => void; onPublish: (v: Vehicle, status: "active" | "draft" | "sold") => Promise<void>; existing?: Vehicle & { status?: "active" | "draft" | "sold" }; contact: { phone: string; email: string; city: string; postalCode?: string; county: string; name: string; type: string }; }) {
  const [step, setStep] = useState(0);
  const existingFuel: SpecFuel = existing?.fuel === "Struja" ? "Električni" : (existing?.fuel ?? "Dizel");
  const [values, setValues] = useState<Publish>({
    ...initial,
    ...existing,
    fuel: existingFuel,
    generation: existing?.generation ?? "",
    variant: existing?.variant ?? "",
    bodyType: existing?.bodyType ?? "",
    seller: contact.name,
    city: existing?.city || contact.city,
    postalCode: existing?.postalCode || contact.postalCode,
    county: existing?.county || contact.county,
    phone: contact.phone,
    email: contact.email,
    dealer: contact.type === "dealer",
  });
  const [customModel, setCustomModel] = useState("");
  const [customVersion, setCustomVersion] = useState("");
  const [manualCo2, setManualCo2] = useState(Boolean(existing?.co2));
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [aiHits, setAiHits] = useState<ScannedEquipmentHit[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Publish>(key: K, value: Publish[K]) => setValues(old => ({ ...old, [key]: value }));

  const effectiveModel = values.model === OTHER_MODEL ? customModel.trim() || values.model : values.model;
  const activeVariant = values.variant === customVariant ? customVersion : values.variant;

  function applyResolvedSpecs(next: Publish, forceAll = false) {
    const modelName = next.model === OTHER_MODEL ? customModel.trim() : next.model;
    const varName = next.variant === customVariant ? customVersion.trim() : next.variant;
    if (!next.make || (!modelName && !varName)) return next;
    const resolved = resolveVehicleSpecs({
      make: next.make,
      model: modelName,
      generation: next.generation,
      variant: varName,
      title: next.title,
      date: next.date,
      fuel: forceAll ? undefined : next.fuel,
      kw: forceAll ? undefined : next.kw,
      cc: forceAll ? undefined : next.cc,
      gear: forceAll ? undefined : next.gear,
      drive: forceAll ? undefined : next.drive,
      bodyType: next.bodyType,
    });
    return {
      ...next,
      fuel: forceAll ? resolved.fuel : next.fuel,
      kw: forceAll || !next.kw ? resolved.kw : next.kw,
      cc: forceAll || !next.cc ? resolved.cc : next.cc,
      gear: forceAll && resolved.gear ? resolved.gear : next.gear,
      drive: forceAll && resolved.drive ? resolved.drive : next.drive,
      co2: manualCo2 && !forceAll ? next.co2 : calculateCo2({
        fuel: forceAll ? resolved.fuel : next.fuel,
        kw: forceAll || !next.kw ? resolved.kw : next.kw,
        cc: forceAll || !next.cc ? resolved.cc : next.cc,
        date: next.date,
        gear: forceAll && resolved.gear ? resolved.gear : next.gear,
        drive: forceAll && resolved.drive ? resolved.drive : next.drive,
        bodyType: next.bodyType,
        variant: varName,
        title: next.title,
      }),
    };
  }

  function updateSpecField<K extends keyof Publish>(key: K, value: Publish[K]) {
    setValues(old => {
      const next: Publish = { ...old, [key]: value };
      if (key === "fuel" && value === "Struja") {
        next.cc = 0;
        next.co2 = 0;
        return next;
      }
      if (!manualCo2) {
        next.co2 = calculateCo2({
          fuel: next.fuel,
          kw: next.kw,
          cc: next.cc,
          date: next.date,
          gear: next.gear,
          drive: next.drive,
          bodyType: next.bodyType,
          variant: next.variant === customVariant ? customVersion : next.variant,
          title: next.title,
        });
      }
      return next;
    });
  }

  async function runPhotoScan(photosToScan: Photo[], names: string[], currentValues: Publish) {
    if (!photosToScan.length || !currentValues.make) return;
    setScanning(true);
    try {
      const result = await scanPhotosForEquipment({
        photos: photosToScan.map((p, idx) => ({ src: p.src, name: names[idx] })),
        vehicle: {
          make: currentValues.make,
          model: currentValues.model === OTHER_MODEL ? customModel.trim() || currentValues.model : currentValues.model,
          generation: currentValues.generation,
          fuel: currentValues.fuel,
          variant: currentValues.variant === customVariant ? customVersion : currentValues.variant,
          date: currentValues.date,
          bodyType: currentValues.bodyType,
          title: currentValues.title,
          trim: currentValues.trim,
        },
      });
      setAiHits(result.detected);
      setAiSummary(result.summary);
      if (result.detected.length > 0) {
        setValues(old => ({
          ...old,
          catalogEquipment: [...new Set([...(old.catalogEquipment ?? []), ...result.detected.map(d => d.id)])],
        }));
      }
    } finally {
      setScanning(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const queued = Array.from(files).slice(0, 6 - values.photos.length);
      if (queued.some(file => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 15_000_000)) throw new Error("Invalid image");
      const photos = await Promise.all(queued.map(preparePhoto));
      const nextPhotos = [...values.photos, ...photos].slice(0, 6);
      const nextNames = [...photoNames, ...queued.map(f => f.name)].slice(0, 6);
      setPhotoNames(nextNames);
      setValues(old => ({ ...old, photos: nextPhotos }));
      void runPhotoScan(nextPhotos, nextNames, values);
    } catch { setError("Odaberite JPG, PNG, AVIF ili WebP fotografije do 15 MB."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 2) { setStep(step + 1); return; }
    if (!values.demo && !/^\+?[\d\s()\-]{8,24}$/.test(values.phone.trim()) || !values.demo && values.phone.replace(/\D/g, "").length < 8) {
      setError("Unesite ispravan telefonski broj."); return;
    }
    if (!values.demo && values.dealer && !values.seller.trim()) { setError("Unesite naziv autokuće."); return; }
    setBusy(true);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === "draft" ? "draft" : existing?.status === "sold" ? "sold" : "active";
    try {
      const title = values.title.trim();
      const location = Object.fromEntries(new FormData(event.currentTarget));
      const finalModel = values.model === OTHER_MODEL ? customModel.trim() : values.model;
      const finalVariant = values.variant === customVariant ? customVersion.trim() : values.variant;
      const vehicleForEquip = { ...values, model: finalModel, variant: finalVariant };
      await onPublish({
        ...values,
        model: finalModel,
        fuel: toCatalogFuel(values.fuel),
        bodyType: values.bodyType || undefined,
        city: String(location.city),
        postalCode: String(location.postalCode),
        county: String(location.county),
        title: titleContainsChassis(title, values.generation) ? title : title + " (" + values.generation + ")",
        variant: finalVariant,
        seller: values.seller.trim(),
        email: values.email?.trim(),
        phone: values.phone.trim(),
        id: existing?.id ?? crypto.randomUUID(),
        demo: false,
        catalogEquipment: equipmentFor(vehicleForEquip).filter(item => values.catalogEquipment?.includes(item.id)).map(item => item.id),
      }, action);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Oglas nije spremljen."); }
    finally { setBusy(false); }
  }

  function numeric(label: string, key: "price" | "km" | "kw" | "cc" | "co2", min = 0, max = 1000000) {
    return <label className="field"><span>{label}</span><input required className="tabular" type="number" min={min} max={max} value={min ? values[key] || "" : values[key]} onChange={event => {
      const num = Number(event.target.value);
      if (key === "co2") setManualCo2(true);
      updateSpecField(key, num);
    }} placeholder={min ? undefined : "0"} /></label>;
  }

  const valuation = useMemo(() => {
    if (!values.make || !effectiveModel) return null;
    return evaluateMarketPrice({
      make: values.make,
      model: effectiveModel,
      generation: values.generation,
      variant: activeVariant,
      bodyType: values.bodyType,
      title: values.title,
      trim: values.trim,
      date: values.date,
      km: values.km,
      kw: values.kw,
      co2: values.co2,
      fuel: values.fuel,
      gear: values.gear,
      drive: values.drive,
      askingPrice: values.price > 0 ? values.price : undefined,
      equipment: values.equipment,
      makeEquipment: values.makeEquipment,
      catalogEquipment: values.catalogEquipment,
      flags: values.flags,
      history: values.history,
      dealer: contact.type === "dealer",
      verified: contact.type === "dealer",
    });
  }, [values, effectiveModel, activeVariant, contact.type]);
  const liveDelta = valuation && values.price > 0 ? describeMarketDelta(valuation.deltaEur, valuation.deltaPercent, euro) : null;
  const now = new Date();
  const maxMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const ksValue = values.kw > 0 ? kwToKs(values.kw) : 0;

  return <Dialog title="Predaj oglas" onClose={onClose} variant="form-dialog">
    <div className="dialog-content">
      <ol className="steps">{steps.map((label, index) => <li className={index === step ? "current" : index < step ? "complete" : ""} key={label} aria-current={index === step ? "step" : undefined}><span className="tabular">{index < step ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
      {step === 0 && <button type="button" className="text-link demo-fill" disabled={busy} onClick={() => { setValues({ ...example, city: contact.city, seller: contact.name, phone: contact.phone, email: contact.email, dealer: contact.type === "dealer", vin: "" }); setCustomModel(""); setCustomVersion(""); setManualCo2(true); setError(""); }}>Popuni primjerom</button>}
      <form className="form-stack" onSubmit={submit}>
        {step === 0 && <div className="form-grid">
          <CatalogFields
            listing
            allowCustom
            customModel={customModel}
            onCustomModelChange={nextCustom => {
              setCustomModel(nextCustom);
              setManualCo2(false);
            }}
            value={values}
            onChange={selection => {
              setCustomVersion("");
              setManualCo2(false);
              setValues(old => applyResolvedSpecs({
                ...old,
                ...selection,
                variant: "",
                makeEquipment: selectedMakeOptions(selection.make, selection.model, old.makeEquipment ?? []),
              }, true));
            }}
          />
          <VariantField selection={values} value={values.variant} onChange={variant => {
            setManualCo2(false);
            setValues(old => applyResolvedSpecs({ ...old, variant }, variant !== customVariant));
          }} />
          {values.variant === customVariant && (
            <label className="field span-all">
              <span>Unesite motorizaciju / verziju</span>
              <input
                value={customVersion}
                required
                pattern=".*\S.*"
                maxLength={70}
                placeholder="npr. 2.0 TDI 110 kW, 1.9 JTD, 52 kWh..."
                onChange={event => {
                  const val = event.target.value;
                  setCustomVersion(val);
                  if (val.trim().length >= 3) {
                    const resolved = resolveVehicleSpecs({
                      make: values.make,
                      model: effectiveModel,
                      generation: values.generation,
                      variant: val,
                      date: values.date,
                      bodyType: values.bodyType,
                    });
                    setValues(old => ({
                      ...old,
                      fuel: resolved.fuel,
                      kw: resolved.kw,
                      cc: resolved.cc,
                      co2: manualCo2 ? old.co2 : resolved.co2,
                      gear: resolved.gear ?? old.gear,
                      drive: resolved.drive ?? old.drive,
                    }));
                  }
                }}
              />
            </label>
          )}
          <Select label="Karoserija" value={values.bodyType ?? ""} onChange={event => updateSpecField("bodyType", event.target.value)}>
            <option value="">Automatski (prema modelu)</option>
            {bodyTypes.map(bt => <option key={bt}>{bt}</option>)}
          </Select>
          <MonthYearField value={values.date} max={maxMonth} onChange={date => updateSpecField("date",date)}/>
          <label className="field span-all"><span>Naslov oglasa</span><input value={values.title} onChange={event => set("title", event.target.value)} maxLength={80} pattern=".*\S.*" required placeholder="npr. Audi A4 35 TDI S-Line" /></label>
          {numeric("Kilometraža (km)", "km")}
          {numeric("Obujam (cm³)", "cc", 0, 30000)}
          <label className="field">
            <span>Snaga (kW)</span>
            <input
              required
              className="tabular"
              type="number"
              min={1}
              max={2000}
              value={values.kw || ""}
              onChange={event => updateSpecField("kw", Number(event.target.value))}
              placeholder="npr. 110"
            />
          </label>
          <label className="field">
            <span>Snaga (KS)</span>
            <input
              className="tabular"
              type="number"
              min={1}
              max={2720}
              value={ksValue || ""}
              onChange={event => updateSpecField("kw", ksToKw(Number(event.target.value)))}
              placeholder="npr. 150"
            />
          </label>
          {numeric("CO₂ (g/km)", "co2", 0, 999)}
          <Select label="Gorivo" value={values.fuel} onChange={event => {
            setManualCo2(false);
            updateSpecField("fuel", event.target.value as SpecFuel);
          }}>
            {specFuels.map(fuel => <option key={fuel}>{fuel}</option>)}
          </Select>
          <Select label="Mjenjač" value={values.gear} onChange={event => updateSpecField("gear", event.target.value as Vehicle["gear"])}>{gears.map(gear => <option key={gear}>{gear}</option>)}</Select>
          <Select label="Pogon" value={values.drive} onChange={event => updateSpecField("drive", event.target.value)}><option>Prednji</option><option>Stražnji</option><option>4×4</option></Select>
          <label className="field span-all"><span>VIN (neobavezno)</span><input className="tabular" value={values.vin} maxLength={17} pattern={values.demo ? undefined : "[A-HJ-NPR-Z0-9]{17}"} title="17 znakova bez slova I, O ili Q" onChange={event => set("vin", event.target.value.toUpperCase())} /></label>
        </div>}
        {step === 1 && <>
          <label className="field"><span>Napomena prodavača (neobavezno)</span><textarea rows={3} value={values.sellerNote ?? ""} maxLength={400} onChange={event => set("sellerNote", event.target.value)} placeholder="Navedite stanje vozila, servisnu povijest ili kada je moguć pregled." /></label>
          <label className="field"><span>Istaknuta oprema</span><input value={values.trim} maxLength={100} onChange={event => set("trim", event.target.value)} placeholder="npr. Digitalni kokpit · Matrix LED" /></label>
          <div className="upload-row">{values.photos.map((photo, index) => <div className="upload-item" key={index}><VehiclePhoto photo={photo} alt={"Fotografija " + (index + 1)}/><button type="button" className="icon-btn" aria-label={"Ukloni fotografiju " + (index + 1)} onClick={() => {
            const nextPhotos = values.photos.filter((_, n) => n !== index);
            const nextNames = photoNames.filter((_, n) => n !== index);
            setPhotoNames(nextNames);
            set("photos", nextPhotos);
          }}>×</button></div>)}</div>
          <label className="file-field"><ImagePlus size={19}/> Fotografije vozila ({values.photos.length}/6) — AI automatski prepoznaje opremu<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || values.photos.length >= 6} onChange={event => { void addPhotos(event.target.files); event.target.value = ""; }} /></label>
          {(values.photos.length > 0 || aiHits.length > 0) && (
            <section className="ai-scanner-card" aria-label="AI prepoznavanje opreme s fotografija">
              <div className="ai-scanner-head">
                <div>
                  <span className="eyebrow"><Camera size={13}/> AI skener opreme s fotografija</span>
                  <p>{scanning ? "Analiziram učitane fotografije…" : aiSummary || "Učitajte fotografije za automatsko prepoznavanje opreme za ovo godište i model."}</p>
                </div>
                {values.photos.length > 0 && (
                  <button type="button" className="btn secondary advisor-apply" disabled={scanning} onClick={() => void runPhotoScan(values.photos, photoNames, values)}>
                    <Sparkles size={14}/> {scanning ? "Skeniranje…" : "Analiziraj fotografije"}
                  </button>
                )}
              </div>
              {aiHits.length > 0 && (
                <div className="ai-chip-row" role="group" aria-label="Brza provjera prepoznate opreme">
                  {aiHits.map(hit => {
                    const active = (values.catalogEquipment ?? []).includes(hit.id);
                    return (
                      <button
                        key={hit.id}
                        type="button"
                        className={"ai-chip" + (active ? " active" : "")}
                        title={hit.reason}
                        aria-pressed={active}
                        onClick={() => {
                          const current = values.catalogEquipment ?? [];
                          set("catalogEquipment", active ? current.filter(id => id !== hit.id) : [...current, hit.id]);
                        }}
                      >
                        {active && <Check size={12} aria-hidden="true"/>}
                        <span>{hit.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
          <EquipmentSelector vehicle={{ ...values, model: effectiveModel, variant: activeVariant }} onChange={selection => set("catalogEquipment", selection)}/>
          <MakeEquipmentOptions make={values.make} model={effectiveModel} selected={values.makeEquipment ?? []} onChange={selection => set("makeEquipment", selection)} />
          <div className="equipment edit-equipment">{groups.map(group => <fieldset key={group}><legend>{group}</legend>{equipmentOptions[group].map(item => <label key={item}><input type="checkbox" checked={values.equipment[group].includes(item)} onChange={event => {
            const items = values.equipment[group];
            set("equipment", { ...values.equipment, [group]: event.target.checked ? [...items, item] : items.filter(value => value !== item) });
          }}/>{item}</label>)}</fieldset>)}</div>
          <ListingOptions selected={values.flags} onChange={selected => set("flags", selected)} />
        </>}
        {step === 2 && <>
          {valuation && <section className="publish-advisor" aria-label="Procjena tržišne vrijednosti u RH">
            <div className="advisor-header">
              <div>
                <span className="eyebrow">Procjena tržišne vrijednosti u RH</span>
                <p>Preporučeni raspon u RH: <strong className="tabular">{euro(valuation.fairMin)} – {euro(valuation.fairMax)}</strong> <span className="tabular">(Medijan: {euro(valuation.medianMarketPrice)})</span></p>
              </div>
              <button type="button" className="btn secondary advisor-apply" onClick={() => set("price", valuation.medianMarketPrice)}>
                <Sparkles size={15}/> Postavi preporučenu cijenu
              </button>
            </div>
            {values.price > 0 && liveDelta && <div className="advisor-preview">
              <span>Vaš oglas će imati oznaku:</span>
              <Rating tier={valuation.rating}/>
              <span className={"price-delta tabular " + liveDelta.tone}>— {liveDelta.text}</span>
            </div>}
          </section>}
          <div className="form-grid">
            {numeric("Tražena cijena (€)", "price", 1, 100000000)}
            <p className="fine-print">{contact.name} · {contact.phone}</p>
            <LocationFields initial={values} onChange={location => setValues(old => ({...old,...location}))}/>
          </div>
          <p className="fine-print">Objavom potvrđujete da su podaci o vozilu točni. Nacrt je vidljiv samo na vašem računu.</p>
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="btn quiet" onClick={() => { setError(""); if (step) setStep(step - 1); else onClose(); }}><ArrowLeft size={16}/>{step ? "Natrag" : "Odustani"}</button>{step === 2 && <button type="submit" className="btn secondary" value="draft" disabled={busy}>Spremi nacrt</button>}<button type="submit" className="btn primary" value="active" disabled={busy}>{step === 2 ? <><Plus size={16}/> {existing?.status === "sold" ? "Spremi izmjene" : "Objavi oglas (0 €)"}</> : <>Nastavi <ArrowRight size={16}/></>}</button></div>
      </form>
    </div>
  </Dialog>;
}

