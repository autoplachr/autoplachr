"use client";

import { ArrowRight, CarFront, Check, Grid2X2, Heart, List, Plus, SlidersHorizontal, Store, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { cities, euro, fuels, gears, makes, number, power, quick, registered, vehicles, type Vehicle } from "./catalog";
import { distances, initialSearch, matchVehicles, modelsFor, prices, readSearch, sorts, writeSearch, years, type Search } from "./search";
import { Dialog, ListingOptions, PhotoCount, Rating, Select, VehiclePhoto } from "./ui";
import { TaxCalculator } from "./buyer-tools";
import Detail from "./detail";
import PublishForm from "./publish";

type Dealer = { name: string; city: string; email: string };
type Panel = "filters" | "publish" | "tax" | "register" | null;
const storageKeys = { saved: "sasija.saved", inventory: "sasija.inventory", dealers: "sasija.dealers" };
function readStored<T>(key: string): T[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(data) ? data as T[] : [];
  } catch { return []; }
}

function FilterControls({ search, count, update, apply }: {
  search: Search; count: number; update: (next: Search) => void; apply: () => void;
}) {
  const change = (key: keyof Search, value: string) => update({ ...search, [key]: value, ...(key === "marka" ? { model: "" } : {}) });
  const active = Boolean(search.marka || search.model || search.cijena || search.godiste || search.km || search.gorivo || search.mjenjac || search.grad || search.opcije.length);
  const fields: { key: keyof Search; title: string; all: string; values: readonly (string | number)[]; format?: (v: string | number) => string; mono?: boolean; disabled?: boolean }[] = [
    { key: "marka", title: "Marka", all: "Sve marke", values: Object.keys(makes) },
    { key: "model", title: "Model", all: "Svi modeli", values: modelsFor(search.marka), disabled: !search.marka },
    { key: "cijena", title: "Cijena do (€)", all: "Bez ograničenja", values: prices, format: value => euro(Number(value)) + (value === 50000 ? "+" : ""), mono: true },
    { key: "godiste", title: "Godište od", all: "Sva godišta", values: years, mono: true },
    { key: "km", title: "Kilometraža do", all: "Bez ograničenja", values: distances, format: value => number(Number(value)) + " km", mono: true },
    { key: "gorivo", title: "Gorivo", all: "Sva goriva", values: fuels },
    { key: "mjenjac", title: "Mjenjač", all: "Svi mjenjači", values: gears },
    { key: "grad", title: "Županija / grad", all: "Sva Hrvatska", values: cities },
  ];
  return <form className="filter-form" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="filter-body">
      <div className="search-fields">{fields.map(({ key, title, all, values, format, mono, disabled }) =>
        <Select key={key} label={title} className={search[key] ? (mono ? "numeric-select selected-field" : "selected-field") : ""} value={String(search[key])} onChange={event => change(key, event.target.value)} disabled={disabled}>
          <option value="">{all}</option>
          {values.map(value => <option key={value} value={value}>{format ? format(value) : value}</option>)}
        </Select>
      )}</div>
      <ListingOptions selected={search.opcije} onChange={opcije => update({ ...search, opcije })} />
    </div>
    <div className="search-actions">
      <button className="btn primary search-submit" type="submit">Prikaži <span className="mono">{count}</span> vozila</button>
      <button className="reset-btn" type="button" disabled={!active} onClick={() => update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz })}>Poništi filtere</button>
    </div>
  </form>;
}

function Listing({ vehicle, saved, onOpen, onSave, eager }: {
  vehicle: Vehicle; saved: boolean; onOpen: () => void; onSave: () => void; eager: boolean;
}) {
  const vat = vehicle.flags.includes("pdv");
  const arriving = vehicle.flags.includes("dolazak");
  const specs = [registered(vehicle.date), number(vehicle.km) + " km", power(vehicle.kw), vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear, vehicle.fuel];
  return <article className="listing">
    <div className="listing-media">
      <VehiclePhoto photo={vehicle.photos[0]} alt={vehicle.title} eager={eager}/>
      {(arriving || vat) && <span className={"listing-badge" + (arriving ? " arriving" : "")}>{arriving ? quick.dolazak : "PDV u cijeni (R1)"}</span>}
      <PhotoCount index={0} total={vehicle.photos.length}/>
      <button className={"icon-btn heart-button " + (saved ? "saved" : "")} type="button" aria-label={saved ? "Ukloni spremljeno vozilo " + vehicle.title : "Spremi " + vehicle.title} aria-pressed={saved} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"}/></button>
    </div>
    <div className="listing-content">
      <h3><button className="card-link" type="button" onClick={onOpen}>{vehicle.title}</button></h3>
      <ul className="listing-specs" aria-label="Osnovni podaci">{specs.map((spec, index) =>
        <li key={spec} className={index < 3 ? "mono" : undefined}>{spec}</li>
      )}</ul>
      {vehicle.sellerNote && <p className="seller-note">{vehicle.sellerNote}</p>}
      <div className="listing-seller">
        <span>{vehicle.seller || (vehicle.dealer ? "Autokuća" : "Privatni prodavač")} <span aria-hidden="true">·</span> {vehicle.city}</span>
        {vehicle.verified && <span className="verified-label">Verificirana autokuća</span>}
      </div>
    </div>
    <div className="listing-price">
      <strong className="mono">{euro(vehicle.price)}</strong>
      <Rating vehicle={vehicle}/>
      {vat && <span className="vat-note">Uključen PDV (R1)</span>}
      <button className="listing-details" type="button" onClick={onOpen} aria-label={"Detalji: " + vehicle.title}>Detalji <ArrowRight size={15}/></button>
    </div>
  </article>;
}

function DealerForm({ onClose, onRegister }: { onClose: () => void; onRegister: (dealer: Dealer) => string | undefined }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(onRegister({ name: String(data.get("name")).trim(), city: String(data.get("city")), email: String(data.get("email")).trim() }) ?? "");
  }
  return <Dialog title="Registriraj autokuću" onClose={onClose} variant="form-dialog">
    <form className="dialog-content form-stack" onSubmit={submit}>
      <label className="field"><span>Naziv autokuće</span><input name="name" required maxLength={70} pattern=".*\S.*"/></label>
      <Select label="Grad" name="city" required defaultValue=""><option value="">Odaberite grad</option>{cities.map(city => <option key={city}>{city}</option>)}</Select>
      <label className="field"><span>Poslovna e-pošta</span><input name="email" type="email" required/></label>
      <p className="fine-print">Ogledni profil autokuće sprema se u ovaj preglednik.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary justify-self-start" type="submit">Registriraj autokuću <ArrowRight size={16}/></button>
    </form>
  </Dialog>;
}

export default function Marketplace() {
  const [search, setSearch] = useState(initialSearch);
  const [saved, setSaved] = useState<string[]>([]);
  const [published, setPublished] = useState<Vehicle[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [dealerOnly, setDealerOnly] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [detail, setDetail] = useState<Vehicle | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const locationChanged = () => setSearch(readSearch(window.location.search));
    const sync = () => {
      setSaved(readStored<string>(storageKeys.saved));
      setPublished(readStored<Vehicle>(storageKeys.inventory));
      setDealers(readStored<Dealer>(storageKeys.dealers));
    };
    locationChanged();
    sync();
    window.addEventListener("popstate", locationChanged);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("popstate", locationChanged); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const allVehicles = useMemo(() => [...published, ...vehicles], [published]);
  const inventory = useMemo(() => allVehicles.filter(v => (!savedOnly || saved.includes(v.id)) && (!dealerOnly || v.dealer)), [allVehicles, saved, savedOnly, dealerOnly]);
  const results = useMemo(() => matchVehicles(inventory, search), [inventory, search]);
  const savedCount = allVehicles.filter(v => saved.includes(v.id)).length;
  const activeCount = [search.marka, search.model, search.cijena, search.godiste, search.km, search.gorivo, search.mjenjac, search.grad].filter(Boolean).length + search.opcije.length;
  const update = (next: Search) => { setSearch(next); writeSearch(next); };
  const scrollResults = () => requestAnimationFrame(() => document.getElementById("vozila")?.scrollIntoView());
  const apply = () => { setPanel(null); scrollResults(); };
  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    try { localStorage.setItem(storageKeys.saved, JSON.stringify(next)); }
    catch { setNotice("Spremljeno do zatvaranja stranice."); }
    setSaved(next);
  }
  function showMarket() {
    setDealerOnly(false);
    setSavedOnly(false);
    window.scrollTo({ top: 0 });
  }
  function publish(vehicle: Vehicle) {
    const next = [vehicle, ...readStored<Vehicle>(storageKeys.inventory)];
    localStorage.setItem(storageKeys.inventory, JSON.stringify(next));
    setPublished(next);
    setPanel(null);
    setSavedOnly(false);
    setDealerOnly(false);
    update({ ...initialSearch, prikaz: search.prikaz });
    setNotice("Oglas je objavljen u vašoj ponudi.");
    scrollResults();
  }
  function register(dealer: Dealer) {
    if (dealers.some(item => item.email.toLowerCase() === dealer.email.toLowerCase())) return "Profil s ovom adresom već postoji.";
    const next = [...readStored<Dealer>(storageKeys.dealers), dealer];
    try { localStorage.setItem(storageKeys.dealers, JSON.stringify(next)); }
    catch { return "Profil nije spremljen. Provjerite postavke pohrane preglednika."; }
    setDealers(next);
    setPanel(null);
    setDealerOnly(true);
    setSavedOnly(false);
    setNotice("Ogledni profil autokuće je spremljen.");
    scrollResults();
  }
  const filters = <FilterControls search={search} count={results.length} update={update} apply={apply}/>;
  return <>
    <header className="topbar">
      <div className="shell topbar-inner">
        <button className="brand" type="button" aria-label="Šasija HR, početna" onClick={showMarket}><span className="brand-icon"><CarFront size={20} strokeWidth={2.2}/></span><span>ŠASIJA</span><span className="brand-domain mono">.hr</span></button>
        <nav className="main-nav" aria-label="Glavna navigacija">
          <button type="button" aria-current={!dealerOnly && !savedOnly ? "page" : undefined} onClick={showMarket}>Rabljena vozila</button>
          <button type="button" aria-current={dealerOnly ? "page" : undefined} onClick={() => { setDealerOnly(true); setSavedOnly(false); scrollResults(); }}>Autokuće</button>
          <button type="button" onClick={() => setPanel("tax")}>PPMV Kalkulator</button>
        </nav>
        <div className="header-actions">
          <button type="button" className="btn quiet save-nav" aria-label={"Spremljeno " + savedCount} aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setDealerOnly(false); scrollResults(); }}><Heart size={16}/><span className="saved-text">Spremljeno</span><span className="saved-count mono">{savedCount}</span></button>
          <button type="button" className="btn primary publish-nav" onClick={() => setPanel("publish")}><Plus size={17}/><span>Predaj oglas</span><span className="free mono">0 €</span></button>
        </div>
      </div>
    </header>
    <main className="shell market">
      <aside className="filter-sidebar" aria-labelledby="filter-title">
        <h2 id="filter-title">Filteri</h2>
        {filters}
      </aside>
      <section className="results" id="vozila" aria-labelledby="results-title">
        <div className="mobile-tools">
          <button type="button" className="btn secondary" aria-haspopup="dialog" onClick={() => setPanel("filters")}><SlidersHorizontal size={16}/> Filteri {activeCount > 0 && <span className="mono">({activeCount})</span>}</button>
          <button type="button" className="btn quiet mobile-nav-action" onClick={() => setPanel("tax")}>PPMV</button>
          <button type="button" className="btn quiet mobile-nav-action" aria-pressed={dealerOnly} onClick={() => { setDealerOnly(!dealerOnly); setSavedOnly(false); }}>Autokuće</button>
        </div>
        <div className="results-toolbar">
          <h1 id="results-title" className="result-count" aria-live="polite">{savedOnly ? "Spremljeno" : "Pronađeno"} <strong className="mono">{results.length}</strong> vozila{dealerOnly && " iz autokuća"}</h1>
          <div className="results-controls">
            <Select className="sort-field" label="Sortiraj vozila" value={search.sortiranje} onChange={event => update({ ...search, sortiranje: event.target.value as Search["sortiranje"] })}>{Object.entries(sorts).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</Select>
            <div className="view-switch" role="group" aria-label="Prikaz rezultata">
              <button type="button" aria-label="Lista" title="Lista" aria-pressed={search.prikaz === "lista"} onClick={() => update({ ...search, prikaz: "lista" })}><List size={17}/></button>
              <button type="button" aria-label="Mreža" title="Mreža" aria-pressed={search.prikaz === "grid"} onClick={() => update({ ...search, prikaz: "grid" })}><Grid2X2 size={16}/></button>
            </div>
          </div>
        </div>
        {dealerOnly && dealers.length > 0 && <div className="dealer-profiles">{dealers.map(dealer => <div key={dealer.email}><Store size={17}/><strong>{dealer.name}</strong><span>{dealer.city}</span></div>)}</div>}
        {results.length ? <div className={"listings " + (search.prikaz === "lista" ? "list-view" : "grid-view")}>{results.map((vehicle, index) =>
          <Listing key={vehicle.id} vehicle={vehicle} saved={saved.includes(vehicle.id)} eager={index < 3} onOpen={() => setDetail(vehicle)} onSave={() => toggleSaved(vehicle.id)}/>
        )}</div> : <div className="empty-state"><h2>{savedOnly && !savedCount ? "Nemate spremljenih vozila" : "Nema vozila za odabrane filtre"}</h2><button type="button" className="btn secondary" onClick={() => { if (savedOnly && !savedCount) setSavedOnly(false); update({ ...initialSearch, prikaz: search.prikaz }); }}>{savedOnly && !savedCount ? "Pogledaj ponudu" : "Poništi filtere"}</button></div>}
        <section id="autokuce" className="dealership">
          <h2>Za autokuće i uvoznike</h2>
          <button className="btn secondary" type="button" onClick={() => setPanel("register")}>Registriraj autokuću</button>
        </section>
      </section>
    </main>
    <footer className="site-footer"><div className="shell"><span>ŠASIJA<span className="mono">.hr</span></span><p>Ogledni oglasi i tržišne procjene.</p><button className="text-link" type="button" onClick={() => setPanel("tax")}>PPMV kalkulator <ArrowRight size={14}/></button></div></footer>
    {panel === "filters" && <Dialog title="Filteri vozila" variant="filter-drawer" onClose={() => setPanel(null)}>{filters}</Dialog>}
    {panel === "tax" && <Dialog title="PPMV kalkulator uvoza" onClose={() => setPanel(null)} variant="form-dialog"><div className="dialog-content"><TaxCalculator/></div></Dialog>}
    {panel === "publish" && <PublishForm onClose={() => setPanel(null)} onPublish={publish}/>}
    {panel === "register" && <DealerForm onClose={() => setPanel(null)} onRegister={register}/>}
    {detail && <Detail key={detail.id} vehicle={detail} saved={saved.includes(detail.id)} onSave={() => toggleSaved(detail.id)} onClose={() => setDetail(null)}/>}
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}<button type="button" className="icon-btn" aria-label="Zatvori obavijest" onClick={() => setNotice("")}><X size={15}/></button></div>}
  </>;
}

