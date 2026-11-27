"use client";
import { contactMetadata, leadSession } from "./lead-session";
import { listingValuationParams } from "../src/lib/valuation-link";

import { Checkbox } from "../src/components/Checkbox";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Fingerprint, Flag, Heart, Maximize, MessageSquare, Phone, Printer, Share2, Star } from "lucide-react";
import { BrandLogo } from "../src/components/BrandLogo";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { euro, groups, marketValuation, number, power, registered, taxStatus, type Vehicle } from "./catalog";
import { vehicleMakeOptions } from "./make-equipment";
import { Dialog, VehiclePhoto } from "./ui";
import { VehicleCard } from "./vehicle-card";
import { JsonLd } from "../src/components/JsonLd";
import { SITE_URL, slugifyHr, vehicleListingPath, vehicleSeoPath } from "../src/lib/seo";
import { equipmentFor } from "../src/data/equipment-catalog";
import { api, leadTrackingAvailable, type LeadReply } from "./account-api";
import { normalizePhone } from "../src/data/profile-validation";
import { WindshieldSheet } from "./windshield-sheet";
import { appointmentLabel, dealershipHoursToday } from "../src/data/working-hours";

const equipmentHeadings = ["Sigurnost i asistencije", "Udobnost i interijer", "Multimedija i navigacija", "Eksterijer i ovjes"];
const questions = ["Je li vozilo još dostupno?", "Je li moguća zamjena?", "Možete li poslati broj šasije?"];

function formattedPhone(value: string) {
  const clean = normalizePhone(value);
  const match = /^(\+385)(9\d)(\d{3})(\d{3,4})$/.exec(clean);
  return match ? match.slice(1).join(" ") : clean;
}

export default function Detail({ vehicle, inventory, saved, onSave, savedIds = [], onSaveVehicle, onBack, onOpen, onNotice, onReport, onStartChat, onOpenValuation, sellerTools }: {
  vehicle: Vehicle; inventory: Vehicle[]; saved: boolean; onSave: () => void; onBack: () => void;
  savedIds?: string[]; onSaveVehicle?: (id: string) => void;
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void; onNotice: (message: string) => void; onReport: () => void;
  sellerTools?: { phone?: string };
  onStartChat?: (vehicle: Vehicle, initialMessage?: string) => Promise<void>;
  onOpenValuation?: (event: MouseEvent<HTMLAnchorElement>, targetUrl: string) => void;
}) {
  const [photo, setPhoto] = useState(0);
  const galleryRail = useRef<HTMLDivElement>(null);
  const inquiryPanel = useRef<HTMLElement>(null);
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
      const url = "https://wa.me/" + target + "?text=" + encodeURIComponent(
        "Pozdrav, zanima me " + vehicle.title + ". " + SITE_URL + vehicleListingPath(vehicle.id),
      );
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.assign(url);
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
  const showPriceBadge = vehicle.showPriceBadge === true && vehicle.price > 0
    && vehicle.price * 100 <= valuation.medianMarketPrice * 95;
  const valuationUrl = `/procjena-cijene?${listingValuationParams(vehicle)}`;
  const vinAffiliateUrl =
    process.env.NEXT_PUBLIC_CARVERTICAL_AFFILIATE_URL?.trim() || "https://www.carvertical.com/hr";
  const vinHref = vehicle.vin
    ? `${vinAffiliateUrl}${vinAffiliateUrl.includes("?") ? "&" : "?"}vin=${encodeURIComponent(vehicle.vin)}`
    : vinAffiliateUrl;

  function selectPhoto(index: number) {
    setPhoto(index);
    const rail = galleryRail.current;
    if (rail) rail.scrollTo({
      left: rail.clientWidth * index,
      behavior: fullscreen || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  const move = (offset: number) => selectPhoto((photo + offset + count) % count);
  const callNumber = phone || (!vehicle.contactAvailable && !vehicle.demo ? formattedPhone(vehicle.phone) : "");
  const callHref = callNumber && (!vehicle.demo || vehicle.dealer) ? "tel:" + callNumber.replace(/[^+\d]/g, "") : "";
  function openInquiry() {
    setInquiry(true);
    requestAnimationFrame(() => {
      inquiryPanel.current?.focus({ preventScroll: true });
      inquiryPanel.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
  }
  const version = vehicle.variant === "S" ? vehicle.model + " S" : vehicle.variant;
  const breadcrumb = [vehicle.make, vehicle.model, vehicle.generation, version].filter(Boolean);
  const tax = vehicle.flags.includes("pdv") ? "Uključen PDV (R1)" :
    vehicle.flags.includes("kupac") ? "Na ime kupca" : taxStatus(vehicle);
  const keySpecs = [
    ["Kilometraža", number(vehicle.km) + " km"], ["Prva registracija", registered(vehicle.date)],
    ["Snaga", power(vehicle.kw).replace(" (", " / ").replace(")", "")], ["Gorivo", vehicle.fuel], ["Mjenjač", vehicle.gear],
    ["Vlasništvo", vehicle.ownership ?? vehicle.history?.find(item => /vlasnik/i.test(item)) ?? "Nije navedeno"],
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
      <button type="button" className="icon-btn gallery-prev" aria-label="Prethodna fotografija" onClick={() => move(-1)}><ChevronLeft aria-hidden="true"/></button>
      <button type="button" className="icon-btn gallery-next" aria-label="Sljedeća fotografija" onClick={() => move(1)}><ChevronRight aria-hidden="true"/></button>
    </>;
  }
  const counter = count > 0 && <span className="photo-count tabular" aria-live="polite">{photo + 1} / {count}</span>;

  async function share() {
    const url = new URL(vehicleListingPath(vehicle.id), window.location.origin);
    try {
      await navigator.clipboard.writeText(url.href);
      onNotice("Link oglasa je kopiran");
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
        <button type="button" aria-pressed={saved} onClick={onSave}><Heart size={14} fill={saved ? "currentColor" : "none"} aria-hidden="true"/> {saved ? "Spremljeno" : "Spremi"}</button>
        <button type="button" onClick={share}><Share2 size={14} aria-hidden="true"/> Podijeli</button>
        <button type="button" onClick={onReport}><Flag size={14} aria-hidden="true"/> Prijavi</button>
        {sellerTools && <button type="button" onClick={() => setWindshield(true)}><Printer size={14} aria-hidden="true" /> A4 cjenik</button>}
        <button type="button" className="detail-print" onClick={() => window.print()}><Printer size={14} aria-hidden="true"/> Ispiši</button>
      </div>
    </div>
    <div className="vehicle-detail-grid">
      <div className="detail-main">
        <header className="detail-title">
          <h1 id="vehicle-title" tabIndex={-1}>{vehicle.title}</h1>
          <div className="mobile-detail-price">
            <strong className="tabular">{euro(vehicle.price)}</strong>
            {(vehicle.flags.includes("pdv") || vehicle.flags.includes("kupac")) && <span>{tax}</span>}
          </div>
          <p>{[vehicle.variant, vehicle.city, vehicle.demo && "Ogledni oglas"].filter(Boolean).join(" · ")}</p>
        </header>
        <section className="detail-gallery" aria-label="Fotografije vozila" onKeyDown={photoKeys}>
          <div className="gallery-main">
            {count ? <div className="detail-gallery-rail" ref={galleryRail} onScroll={event => {
              const rail = event.currentTarget;
              if (rail.clientWidth) setPhoto(Math.min(count - 1, Math.max(0, Math.round(rail.scrollLeft / rail.clientWidth))));
            }}>
              {vehicle.photos.map((item, index) => <button key={index} className="gallery-open" type="button" tabIndex={photo === index ? 0 : -1}
                aria-label={`Otvori fotografiju ${index + 1} preko cijelog zaslona`} onClick={() => { setPhoto(index); setFullscreen(true); }}>
                <VehiclePhoto photo={item} alt={index === 0 ? vehicle.title : ""} eager={index === 0} sizes="(max-width: 960px) 100vw, 840px"/>
                <span className="gallery-expand"><Maximize size={17} aria-hidden="true"/></span>
              </button>)}
            </div> : <VehiclePhoto alt={vehicle.title}/>}
            {counter}{arrows()}
          </div>
          {count > 1 && <div className="thumbnails">{vehicle.photos.map((item, index) => <button key={index} type="button" aria-label={"Fotografija " + (index + 1)} aria-pressed={photo === index} onClick={() => selectPhoto(index)}><VehiclePhoto photo={item} alt="" sizes="106px"/></button>)}</div>}
        </section>
        <dl className="key-specs">{keySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="tabular">{value}</dd></div>)}</dl>
        <section className="detail-section"><h2 className="brand-spec-heading"><BrandLogo make={vehicle.make} size="sm"/><span>Tehnički podaci</span></h2>
          <dl className="spec-table">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="tabular">{value ?? "Nije navedeno"}</dd></div>)}</dl>
        </section>
        <section className="detail-section"><h2>Oprema vozila</h2>
          <div className="detail-equipment">{equipment.map((items, index) => <section key={equipmentHeadings[index]}>
            <h3>{equipmentHeadings[index]}</h3>
            {items.length ? <ul>{items.map(item => <li key={item}><Check size={15} aria-hidden="true"/>{item}</li>)}</ul> : <p>Nije navedeno</p>}
          </section>)}</div>
        </section>
        <section className="detail-section seller-description"><h2>Opis prodavača</h2>
          <p className="whitespace-pre-wrap">{vehicle.sellerNote || "Prodavač nije unio opis vozila."}</p>
          {vehicle.history?.length ? <p>{vehicle.history.join(" · ")}</p> : null}
        </section>
        {similar.length > 0 && <section className="detail-section similar-section"><h2>Slična vozila u ponudi</h2>
          <div className="similar-list">{similar.map(item => <VehicleCard key={item.id} vehicle={item} inRail eager={false}
            saved={savedIds.includes(item.id)} onSave={() => onSaveVehicle?.(item.id)} onOpen={event => onOpen(event, item.id)} />)}</div>
        </section>}
      </div>
      <aside className="detail-sidebar" aria-label="Cijena i kontakt prodavača">
        <div className="detail-contact">
          <section className="detail-contact-block" id="kontakt-prodavaca" aria-label="Cijena oglasa">
            {vehicle.previousPriceEur && vehicle.previousPriceEur > vehicle.price && (
              <p className="flex items-center gap-2 text-[13px] tabular-nums">
                <span className="line-through text-[var(--muted)]">{euro(vehicle.previousPriceEur)}</span>
                <span className="font-semibold text-[#047857] dark:text-[#10B981]">−{euro(vehicle.previousPriceEur - vehicle.price)}</span>
              </p>
            )}
            <strong className="block text-3xl font-bold leading-tight tracking-tight tabular-nums text-[var(--text)]">{euro(vehicle.price)}</strong>
            <p className="mt-1 text-[13px] text-[var(--muted)]">{tax}</p>
            {showPriceBadge && <p className="verified-price-savings mt-2 text-[13px] font-semibold">Ispod tržišne cijene</p>}
            <a href={valuationUrl} onClick={e => { if (onOpenValuation) onOpenValuation(e, valuationUrl); }}
              className="text-link mt-1 inline-flex min-h-11 items-center text-[13px]">
              Kako računamo tržišnu cijenu? →
            </a>
          </section>
          <section id="upit-prodavacu" ref={inquiryPanel} tabIndex={-1} className="detail-contact-block" aria-label="Kontakt prodavača">
            <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-[var(--text)]">
              {vehicle.dealershipId ? <a className="hover:underline underline-offset-4" href={"/autokuce/"+encodeURIComponent(vehicle.dealershipId)}>{vehicle.seller}</a> : vehicle.seller || "Privatni prodavač"}
              {vehicle.verified && <Check size={15} strokeWidth={2.25} className="text-[#2563EB]" role="img" aria-label={vehicle.dealer ? "Verificirana autokuća" : "Verificirani prodavač"} />}
            </h2>
            <div className="mt-1.5 grid gap-1 text-[13px] text-[var(--spec)]">
              {vehicle.sellerRating && <p className="seller-rating tabular-nums"><Star size={14} fill="currentColor" aria-hidden="true"/><span>{vehicle.sellerRating.score.toLocaleString("hr-HR")} · {vehicle.sellerRating.reviews} {[2, 3, 4].includes(vehicle.sellerRating.reviews % 10) && ![12, 13, 14].includes(vehicle.sellerRating.reviews % 100) ? "recenzije" : "recenzija"}</span></p>}
              <p>{vehicle.sellerAddress || [vehicle.postalCode, vehicle.city].filter(Boolean).join(" ")}</p>
              {vehicle.sellerWorkingHours ? <>
                <p className="tabular-nums text-[var(--muted)]">{dealershipHoursToday(vehicle.sellerWorkingHours)}</p>
                <details className="seller-hours !m-0"><summary>Tjedno radno vrijeme</summary><p>{vehicle.sellerHours}</p></details>
                {vehicle.sellerWorkingHours.afterHours && !vehicle.sellerWorkingHours.appointmentOnly && <p className="text-[var(--muted)]">{appointmentLabel}.</p>}
              </> : vehicle.sellerHours && <p className="text-[var(--muted)]">Radno vrijeme: <span className="tabular-nums">{vehicle.sellerHours}</span></p>}
            </div>
            <div className="detail-contact-actions">
              {phone && (!vehicle.demo || vehicle.dealer) ? <a className="detail-contact-primary tabular-nums" href={"tel:" + phone.replace(/[^+\d]/g, "")}><Phone size={16} aria-hidden="true"/>{phone}</a> :
                <button className="detail-contact-primary" type="button" disabled={Boolean(phone) || revealing} onClick={reveal}><Phone size={16} aria-hidden="true"/>{phone ? phone + " (demo)" : "Prikaži broj telefona"}</button>}
              {(vehicle.phone || phone || (vehicle.contactAvailable && leadTrackingAvailable())) &&
                <button type="button" className="detail-contact-secondary" disabled={revealing} onClick={() => void whatsapp()}>WhatsApp upit</button>}
              <button type="button" className="detail-contact-secondary" aria-expanded={inquiry} onClick={() => setInquiry(!inquiry)}>
                <MessageSquare size={16} aria-hidden="true" /> Pošalji upit prodavaču
              </button>
              {onStartChat && <button type="button" className="text-link min-h-11 justify-self-center text-[13px]" onClick={() => void onStartChat(vehicle)}>Započni razgovor</button>}
            </div>
            {inquiry && <form className="inquiry form-stack mt-3" onSubmit={send}>
              <fieldset className="inquiry-questions"><legend>Brza pitanja</legend>{questions.map((question, index) => <label key={question}><Checkbox name="question" value={question} defaultChecked={index === 0}/> {question}</label>)}</fieldset>
              <label className="field"><span>Ime</span><input name="name" required maxLength={70}/></label>
              <label className="field"><span>Telefon</span><input name="phone" type="tel" maxLength={40}/></label>
              <label className="field"><span>E-pošta</span><input name="email" type="email" maxLength={160}/></label>
              <label className="field"><span>Dodatna poruka</span><textarea rows={3} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)}/></label>
              <button className="btn primary" type="submit" disabled={sendingInquiry}>Pošalji upit</button>
              <p role="status">{confirmation}</p>
            </form>}
            {replies.length > 0 && <section className="lead-buyer-replies mt-3" aria-label="Odgovori prodavača" aria-live="polite">
              <h3>Odgovori prodavača</h3>
              {replies.map((reply, index) => <p key={reply.created_at + index}>{reply.text}</p>)}
            </section>}
          </section>
        </div>
        <a href={vinHref} target="_blank" rel="noopener noreferrer sponsored"
          className="flex min-h-11 items-center justify-between gap-2 px-1 text-[13px] font-semibold text-[var(--spec)] hover:text-[var(--text)] hover:underline underline-offset-4">
          <span className="inline-flex items-center gap-2">
            <Fingerprint size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
            <span>Provjeri povijest vozila (VIN)</span>
          </span>
          <ExternalLink size={14} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        </a>
      </aside>
    </div>
    <nav className="mobile-detail-actions" aria-label="Kontakt oglašivača">
      {callHref ? <a className="btn primary" href={callHref}><Phone size={16} aria-hidden="true" /> Nazovi oglašivača</a>
        : <button className="btn primary" type="button" disabled={revealing || !(vehicle.phone || vehicle.contactAvailable) || Boolean(phone)} onClick={() => void reveal()}>
            <Phone size={16} aria-hidden="true" /> {phone ? phone + " (demo)" : "Nazovi oglašivača"}
          </button>}
      <button className="btn secondary" type="button" aria-expanded={inquiry} aria-controls="upit-prodavacu" onClick={openInquiry}>
        <MessageSquare size={16} aria-hidden="true" /> Pošalji upit
      </button>
    </nav>
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
