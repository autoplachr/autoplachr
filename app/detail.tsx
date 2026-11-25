"use client";

import { Checkbox } from "../src/components/Checkbox";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Fingerprint, Heart, Maximize, MessageSquare, Phone, Printer, Share2, Star } from "lucide-react";
import { BrandLogo } from "../src/components/BrandLogo";
import { useEffect, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { euro, groups, marketValuation, number, power, registered, taxStatus, type Vehicle } from "./catalog";
import { vehicleMakeOptions } from "./make-equipment";
import { Dialog, Rating, VehiclePhoto } from "./ui";
import { JsonLd } from "../src/components/JsonLd";
import { SITE_URL, slugifyHr, vehicleListingPath, vehicleSeoPath } from "../src/lib/seo";
import { equipmentFor } from "../src/data/equipment-catalog";
import { api, leadTrackingAvailable, type LeadReply } from "./account-api";
import { normalizePhone } from "../src/data/profile-validation";
import { WindshieldSheet } from "./windshield-sheet";
import { appointmentLabel, dealershipHoursToday } from "../src/data/working-hours";

const equipmentHeadings = ["Sigurnost i asistencije", "Udobnost i interijer", "Multimedija i navigacija", "Eksterijer i ovjes"];
const questions = ["Je li vozilo još dostupno?", "Je li moguća zamjena?", "Možete li poslati broj šasije?"];

function leadSession() {
  const key = "autoplac.lead-session";
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

function contactMetadata() {
  let source = "";
  try { if (document.referrer) source = new URL(document.referrer).origin; } catch { /* No referrer. */ }
  return { session: leadSession(), source, device: matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop" };
}

function formattedPhone(value: string) {
  const clean = normalizePhone(value);
  const match = /^(\+385)(9\d)(\d{3})(\d{3,4})$/.exec(clean);
  return match ? match.slice(1).join(" ") : clean;
}

export default function Detail({ vehicle, inventory, saved, onSave, onBack, onOpen, onNotice, onReport, onStartChat, onOpenValuation, sellerTools }: {
  vehicle: Vehicle; inventory: Vehicle[]; saved: boolean; onSave: () => void; onBack: () => void;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; onNotice: (message: string) => void; onReport: () => void;
  sellerTools?: { phone?: string };
  onStartChat?: (vehicle: Vehicle, initialMessage?: string) => Promise<void>;
  onOpenValuation?: (event: MouseEvent<HTMLAnchorElement>, targetUrl: string) => void;
}) {
  const [photo, setPhoto] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [phone, setPhone] = useState("");
  const [revealing,setRevealing] = useState(false);
  const [windshield, setWindshield] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [thread, setThread] = useState<{ id: string; session: string }>();
  const [replies, setReplies] = useState<LeadReply[]>([]);
  useEffect(() => {
    if (!vehicle.contactAvailable || sessionStorage.getItem("autoplac.view." + vehicle.id)) return;
    const event = leadTrackingAvailable()
      ? api("lead/log", { id: vehicle.id, event: "view", ...contactMetadata() })
      : api("view", { id: vehicle.id });
    void event.then(() => sessionStorage.setItem("autoplac.view." + vehicle.id, "1")).catch(() => undefined);
  }, [vehicle.id, vehicle.contactAvailable]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("autoplac.buyer-thread." + vehicle.id);
      if (saved) setThread(JSON.parse(saved));
    } catch { /* A buyer can still start a new inquiry. */ }
  }, [vehicle.id]);
  useEffect(() => {
    if (!thread) return;
    let active = true;
    const load = () => void api<LeadReply[] | null>("lead/thread", thread)
      .then(items => { if (active && items) setReplies(items); }).catch(() => undefined);
    load();
    const timer = window.setInterval(load, 12000);
    window.addEventListener("focus", load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [thread]);

  async function reveal() {
    if (!vehicle.contactAvailable) { setPhone(formattedPhone(vehicle.phone)); return; }
    setRevealing(true);
    try {
      const result = await api<{phone: string}>(leadTrackingAvailable() ? "lead/log" : "phone",
        leadTrackingAvailable() ? { id: vehicle.id, event: "phone_reveal", ...contactMetadata() } : { id: vehicle.id });
      setPhone(formattedPhone(result.phone));
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Broj nije dostupan.");
    } finally { setRevealing(false); }
  }
  async function whatsapp() {
    setRevealing(true);
    try {
      const result = vehicle.contactAvailable && leadTrackingAvailable()
        ? await api<{phone: string}>("lead/log", { id: vehicle.id, event: "whatsapp", ...contactMetadata() })
        : { phone: vehicle.phone || phone };
      const target = normalizePhone(result.phone).replace(/\D/g, "");
      if (!target) throw new Error("WhatsApp broj nije dostupan.");
      if (vehicle.demo) { onNotice("Ogledni WhatsApp upit je zabilježen."); return; }
      window.location.assign("https://wa.me/" + target + "?text=" + encodeURIComponent(
        "Pozdrav, zanima me " + vehicle.title + ". " + SITE_URL + vehicleListingPath(vehicle.id),
      ));
    } catch (error) { onNotice(error instanceof Error ? error.message : "WhatsApp nije dostupan."); }
    finally { setRevealing(false); }
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
  const valuationParams = new URLSearchParams({
    make: vehicle.make,
    model: vehicle.model,
    ...(vehicle.generation ? { gen: vehicle.generation } : {}),
    year: vehicle.date.slice(0, 4),
    km: String(vehicle.km),
    fuel: vehicle.fuel === "Struja" ? "Električni" : vehicle.fuel,
    kw: String(vehicle.kw),
    price: String(vehicle.price),
  });
  const valuationUrl = `/procjena-cijene?${valuationParams.toString()}`;
  const vinAffiliateUrl =
    process.env.NEXT_PUBLIC_CARVERTICAL_AFFILIATE_URL?.trim() || "https://www.carvertical.com/hr";
  const vinHref = vehicle.vin
    ? `${vinAffiliateUrl}${vinAffiliateUrl.includes("?") ? "&" : "?"}vin=${encodeURIComponent(vehicle.vin)}`
    : vinAffiliateUrl;

  const isSavings = valuation.deltaEur < -50;
  const isNeutral = Math.abs(valuation.deltaPercent) <= 3.5 || Math.abs(valuation.deltaEur) <= 50;
  const comparisonRowLabel = isSavings
    ? "Ušteda u odnosu na prosjek:"
    : "Odstupanje od prosjeka:";
  const comparisonRowValue = isNeutral
    ? "U okviru prosjeka RH"
    : isSavings
    ? `${euro(Math.abs(valuation.deltaEur))} ispod prosjeka`
    : `+${euro(Math.abs(valuation.deltaEur))} iznad prosjeka`;
  const comparisonRowTone = isNeutral
    ? "text-[var(--muted)]"
    : isSavings
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";

  const move = (offset: number) => setPhoto(current => (current + offset + count) % count);
  const version = vehicle.variant === "S" ? vehicle.model + " S" : vehicle.variant;
  const breadcrumb = [vehicle.make, vehicle.model, vehicle.generation, version].filter(Boolean);
  const tax = vehicle.flags.includes("pdv") ? "Uključen PDV (R1)" :
    vehicle.flags.includes("kupac") ? "Na ime kupca" : taxStatus(vehicle);
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
  function normalizeEquipKey(label: string): string {
    return label
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[-–—/(),.]+/g, " ")
      .replace(/\b(paket|svjetla|audio|sustav|system|sound|oprema)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const rawEquipment = groups.map(group => [...vehicle.equipment[group]]);
  for (const option of vehicleMakeOptions(vehicle)) {
    const index = /view/i.test(option.id) ? 0 : /seats/i.test(option.id) ? 1 :
      /cockpit|harman|olufsen|mbux|burmester|canton|widescreen/.test(option.id) ? 2 : 3;
    rawEquipment[index].push(option.label);
  }
  for (const option of equipmentFor(vehicle)) {
    if (!vehicle.catalogEquipment?.includes(option.id)) continue;
    const index = [3,3,1,2][option.category];
    rawEquipment[index].push(option.label);
  }
  const globalSeenKeys = new Set<string>();
  const equipment = rawEquipment.map(items => {
    const cleaned: string[] = [];
    for (const rawItem of items) {
      const item = rawItem.trim();
      if (!item) continue;
      const key = normalizeEquipKey(item);
      if (!key) continue;
      const dupIdx = cleaned.findIndex(existing => {
        const exKey = normalizeEquipKey(existing);
        return exKey === key || (exKey.length >= 4 && key.length >= 4 && (exKey.includes(key) || key.includes(exKey)));
      });
      if (dupIdx !== -1) {
        if (item.length > cleaned[dupIdx].length) cleaned[dupIdx] = item;
        continue;
      }
      if (globalSeenKeys.has(key)) continue;
      globalSeenKeys.add(key);
      cleaned.push(item);
    }
    return cleaned;
  });
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
    const url = new URL(vehicleListingPath(vehicle.id), window.location.origin);
    try {
      await navigator.clipboard.writeText(url.href);
      onNotice("Poveznica oglasa je kopirana.");
    } catch {
      setShareUrl(url.href);
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const buyerPhone = String(data.get("phone") ?? "").trim();
    const body = [...data.getAll("question").map(String), message.trim()].filter(Boolean).join("\n");
    if (!body || (!email && !buyerPhone)) {
      setConfirmation("Unesite telefon ili e-poštu te odaberite pitanje ili napišite poruku.");
      return;
    }
    if (!vehicle.contactAvailable || !leadTrackingAvailable()) {
      if (vehicle.demo) { setConfirmation("Ogledni upit je pripremljen."); return; }
      if (!vehicle.email) { setConfirmation("Prodavač prima upite telefonom."); return; }
      window.location.href = "mailto:" + vehicle.email + "?subject=" + encodeURIComponent("Upit za " + vehicle.title) +
        "&body=" + encodeURIComponent([body, name, buyerPhone, email].filter(Boolean).join("\n"));
      setConfirmation("Upit je otvoren u vašoj aplikaciji za e-poštu.");
      return;
    }
    setSendingInquiry(true);
    try {
      const metadata = contactMetadata();
      const result = await api<{id: string}>("lead/log", { id: vehicle.id, event: "message", name, email,
        phone: buyerPhone, message: body, ...metadata });
      const next = { id: result.id, session: metadata.session };
      setThread(next);
      setReplies([]);
      try { localStorage.setItem("autoplac.buyer-thread." + vehicle.id, JSON.stringify(next)); } catch {}
      setMessage("");
      setConfirmation("Upit je poslan. Odgovor će se prikazati u ovom oglasu.");
    } catch (error) {
      setConfirmation(error instanceof Error ? error.message : "Upit nije poslan.");
    } finally { setSendingInquiry(false); }
  }

  const carSchema = [
    {
      "@context": "https://schema.org",
      "@type": "Car",
      name: vehicle.title,
      brand: { "@type": "Brand", name: vehicle.make },
      model: vehicle.model,
      vehicleModelDate: vehicle.date.slice(0, 4),
      mileageFromOdometer: {
        "@type": "QuantitativeValue",
        value: vehicle.km,
        unitCode: "KMT",
      },
      fuelType: vehicle.fuel,
      vehicleTransmission: vehicle.gear,
      driveWheelConfiguration: vehicle.drive,
      vehicleEngine: {
        "@type": "EngineSpecification",
        enginePower: {
          "@type": "QuantitativeValue",
          value: vehicle.kw,
          unitCode: "KWT",
        },
        ...(vehicle.cc > 0
          ? {
              engineDisplacement: {
                "@type": "QuantitativeValue",
                value: vehicle.cc,
                unitCode: "CMQ",
              },
            }
          : {}),
      },
      ...(vehicle.color ? { color: vehicle.color } : {}),
      image: vehicle.photos.map(p => p.src).filter(Boolean),
      itemCondition: "https://schema.org/UsedCondition",
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: vehicle.price,
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/UsedCondition",
        url: `${SITE_URL}${vehicleSeoPath(vehicle)}`,
        seller: {
          "@type": vehicle.dealer ? "AutoDealer" : "Person",
          name: vehicle.seller || "Privatni prodavač",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Rabljena vozila", item: `${SITE_URL}/#svi-oglasi` },
        { "@type": "ListItem", position: 3, name: vehicle.make, item: `${SITE_URL}/rabljena-vozila/${slugifyHr(vehicle.make)}` },
        { "@type": "ListItem", position: 4, name: vehicle.model, item: `${SITE_URL}${vehicleSeoPath(vehicle)}` },
      ],
    },
  ];

  return <main className="shell vehicle-detail overflow-x-clip">
    <JsonLd data={carSchema} />
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
        {sellerTools && <button className="btn secondary" type="button" onClick={() => setWindshield(true)}><Printer size={16} aria-hidden="true" /> A4 Cjenik za staklo</button>}
        <button type="button" className="btn secondary detail-print hidden sm:inline-flex" onClick={() => window.print()}><Printer size={16}/> Ispiši</button>
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
              <VehiclePhoto photo={active} alt={vehicle.title} eager sizes="(max-width: 960px) 100vw, 840px"/><span className="gallery-expand"><Maximize size={17}/></span>
            </button> : <VehiclePhoto alt={vehicle.title}/>}
            {counter}{arrows()}
          </div>
          {count > 1 && <div className="thumbnails">{vehicle.photos.map((item, index) => <button key={index} type="button" aria-label={"Fotografija " + (index + 1)} aria-pressed={photo === index} onClick={() => setPhoto(index)}><VehiclePhoto photo={item} alt="" sizes="106px"/></button>)}</div>}
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
          <p className="whitespace-pre-wrap">{vehicle.sellerNote || "Prodavač nije unio opis vozila."}</p>
          {vehicle.history?.length ? <p>{vehicle.history.join(" • ")}</p> : null}
        </section>
        {similar.length > 0 && <section className="detail-panel similar-section !mt-0"><h2>Slična vozila u ponudi</h2>
          <div className="similar-list">{similar.map(item => <a key={item.id} className="similar-car" href={vehicleListingPath(item.id)} onClick={event => onOpen(event, item.id)}>
            <div className="w-[136px] h-[92px] aspect-[3/2] shrink-0 overflow-hidden bg-[var(--hover)]">
              <VehiclePhoto photo={item.photos[0]} alt="" sizes="136px"/>
            </div>
            <div className="min-w-0 px-3 py-2 flex flex-col justify-center gap-0.5">
              <h3 className="text-[13.5px] leading-snug text-[var(--text)] line-clamp-2">{item.title}</h3>
              <span className="tabular text-[12px] text-[var(--muted)] truncate">{registered(item.date)} • {number(item.km)} km</span>
              <strong className="tabular text-[14.5px] text-[var(--text)] mt-0.5">{euro(item.price)}</strong>
            </div>
          </a>)}</div>
        </section>}
      </div>
      <aside className="detail-sidebar" aria-label="Cijena i kontakt prodavača">
        <section className="detail-panel price-evaluation p-4 flex flex-col gap-2.5" id="kontakt-prodavaca" aria-label="Cijena i tržišna ocjena">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              {vehicle.previousPriceEur && vehicle.previousPriceEur > vehicle.price && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] line-through text-[var(--muted)] tabular-nums">
                    {euro(vehicle.previousPriceEur)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/12 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold tabular-nums">
                    -{euro(vehicle.previousPriceEur - vehicle.price)}
                  </span>
                </div>
              )}
              <strong className="detail-price tabular !m-0">{euro(vehicle.price)}</strong>
            </div>
            <span className="text-[12px] text-[var(--muted)]">{tax}</span>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Rating valuation={valuation} align="left" />
              <span className="text-[11px] font-medium text-[var(--muted)]">Ocjena tržišta RH</span>
            </div>

            <div className="price-scale price-scale-5 !my-0.5" role="img" aria-label={`Tražena cijena ${euro(vehicle.price)} u odnosu na tržišni raspon u RH (${euro(valuation.fairMin)} – ${euro(valuation.fairMax)})`}>
              <div/><div/><div/><div/><div/><span style={{ left: pinLeft + "%" }}/>
            </div>
            <div className="scale-labels !mb-0 text-[11px]">
              <span>Odlična</span>
              <span>Fer</span>
              <span>Visoka</span>
            </div>

            <div className="flex flex-col gap-1 text-[12.5px] pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--muted)]">Tržišni raspon u RH:</span>
                <strong className="tabular-nums font-semibold text-[var(--text)] !m-0">{euro(valuation.fairMin)} – {euro(valuation.fairMax)}</strong>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--muted)]">{comparisonRowLabel}</span>
                <strong className={`tabular-nums font-semibold !m-0 ${comparisonRowTone}`}>{comparisonRowValue}</strong>
              </div>
            </div>

            <a
              href={valuationUrl}
              onClick={e => {
                if (onOpenValuation) onOpenValuation(e, valuationUrl);
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 underline-offset-4 hover:underline self-start mt-0.5"
            >
              Kako računamo tržišnu cijenu? →
            </a>
          </div>
        </section>
        <section className="detail-panel seller-card" aria-label="Kontakt prodavača">
          <h2>{vehicle.dealershipId ? <a className="legal-link" href={"/autokuce/"+encodeURIComponent(vehicle.dealershipId)}>{vehicle.seller}</a> : vehicle.seller || "Privatni prodavač"}</h2>
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
            {(vehicle.phone || phone || (vehicle.contactAvailable && leadTrackingAvailable())) &&
              <button type="button" className="btn secondary" disabled={revealing} onClick={() => void whatsapp()}>WhatsApp upit</button>}
            <button type="button" className="btn secondary" aria-expanded={inquiry} onClick={() => setInquiry(!inquiry)}>
              <MessageSquare size={16} aria-hidden="true" /> Pošalji upit prodavaču
            </button>
            {onStartChat && <button type="button" className="text-link" onClick={() => void onStartChat(vehicle)}>Započni razgovor</button>}
          </div>
          {inquiry && <form className="inquiry form-stack" onSubmit={send}>
            <fieldset className="inquiry-questions"><legend>Brza pitanja</legend>{questions.map((question, index) => <label key={question}><Checkbox name="question" value={question} defaultChecked={index === 0}/> {question}</label>)}</fieldset>
            <label className="field"><span>Ime</span><input name="name" required maxLength={70}/></label>
            <label className="field"><span>Telefon</span><input name="phone" type="tel" maxLength={40}/></label>
            <label className="field"><span>E-pošta</span><input name="email" type="email" maxLength={160}/></label>
            <label className="field"><span>Dodatna poruka</span><textarea rows={3} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)}/></label>
            <button className="btn primary" type="submit" disabled={sendingInquiry}>Pošalji upit</button>
            <p role="status">{confirmation}</p>
          </form>}
          {replies.length > 0 && <section className="lead-buyer-replies" aria-label="Odgovori prodavača" aria-live="polite">
            <h3>Odgovori prodavača</h3>
            {replies.map((reply, index) => <p key={reply.created_at + index}>{reply.text}</p>)}
          </section>}
        </section>
        <a
          href={vinHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="detail-panel py-2.5 px-3.5 flex items-center justify-between gap-2 text-[13px] font-semibold text-[var(--spec)] hover:text-[#2563EB] hover:border-[#2563EB]/40 transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Fingerprint size={15} className="text-[#2563EB] shrink-0" aria-hidden="true" />
            <span>Provjeri povijest vozila (VIN)</span>
          </span>
          <ExternalLink size={14} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
        </a>
      </aside>
    </div>
    {windshield && <WindshieldSheet vehicle={vehicle} phone={sellerTools?.phone} onClose={() => setWindshield(false)} />}
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
