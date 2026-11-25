"use client";

import { ArrowDownUp, ArrowRight, BadgeCheck, CalendarDays, CarFront, Check, ChevronRight, CircleGauge, Database, Fuel as FuelIcon, Gauge, Globe2, Grid2X2, Heart, List, MapPin, Plus, RotateCcw, Search as SearchIcon, SlidersHorizontal, Store, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { cities, euro, flags, fuels, gears, makes, number, power, quick, registered, vehicles, type Vehicle } from "./catalog";
import { distances, initialSearch, matchVehicles, modelsFor, prices, readSearch, sorts, writeSearch, years, type Search } from "./search";
import { Dialog, PhotoCount, Rating, Select, VehiclePhoto } from "./ui";
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
    { key: "grad", title: "Županija / Grad", all: "Sva Hrvatska", values: cities },
  ];
  return <form onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="search-fields">{fields.map(({ key, title, all, values, format, mono, disabled }) =>
      <Select key={key} label={title} className={search[key] ? (mono ? "numeric-select selected-field" : "selected-field") : ""} value={String(search[key])} onChange={event => change(key, event.target.value)} disabled={disabled}>
        <option value="">{all}</option>
        {values.map(value => <option key={value} value={value}>{format ? format(value) : value}</option>)}
      </Select>
    )}</div>
    <div className="pills filter-pills" aria-label="Brzi filtri">{flags.map(flag =>
      <button key={flag} type="button" className="pill" aria-pressed={search.opcije.includes(flag)} onClick={() => update({
        ...search, opcije: search.opcije.includes(flag) ? search.opcije.filter(value => value !== flag) : [...search.opcije, flag],
      })}>{search.opcije.includes(flag) ? <Check size={13}/> : <Plus size={13}/>} {quick[flag]}</button>
    )}</div>
    <div className="search-actions">
      <button className="reset-btn" type="button" disabled={!active} onClick={() => update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz })}><RotateCcw size={14}/> Poništi filtere</button>
      <button className="btn primary search-submit" type="submit">Prikaži <span className="button-count mono">{count}</span> vozila <ArrowRight size={17}/></button>
    </div>
  </form>;
}

function Card({ vehicle, saved, onOpen, onSave, eager }: {
  vehicle: Vehicle; saved: boolean; onOpen: () => void; onSave: () => void; eager: boolean;
}) {
  const tag = vehicle.flags.includes("dolazak") ? "dolazak" : vehicle.flags.includes("pdv") ? "pdv" : undefined;
  return <article className="listing">
    <div className="listing-media">
      <VehiclePhoto photo={vehicle.photos[0]} alt={vehicle.title} eager={eager}/>
      {tag && <span className={"listing-badge " + tag}>{tag === "dolazak" && <span/>}{quick[tag]}</span>}
      <PhotoCount index={0} total={vehicle.photos.length}/>
      <button className={"icon-btn heart-button " + (saved ? "saved" : "")} type="button" aria-label={saved ? "Ukloni spremljeno vozilo " + vehicle.title : "Spremi " + vehicle.title} aria-pressed={saved} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"}/></button>
    </div>
    <div className="listing-content">
      <div className="price-line"><strong className="mono">{euro(vehicle.price)}</strong><Rating vehicle={vehicle}/></div>
      <h3><button className="card-link" type="button" onClick={onOpen}>{vehicle.title}</button></h3>
      <p className="trim" title={vehicle.trim}>{vehicle.trim || vehicle.model}</p>
      <div className="listing-specs">
        <span className="mono"><CalendarDays/>{registered(vehicle.date)}</span>
        <span className="mono"><Gauge/>{number(vehicle.km)} km</span>
        <span className="mono"><CircleGauge/>{power(vehicle.kw)}</span>
        <span><FuelIcon/>{vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear} · {vehicle.fuel}</span>
      </div>
    </div>
    <div className="listing-footer">
      <span>{vehicle.dealer ? <Store size={14}/> : <MapPin size={14}/>} {vehicle.dealer ? "Autokuća" : "Privatni prodavač"}{vehicle.verified && <BadgeCheck className="verified" size={14} aria-label="Provjerena autokuća"/>}<i/> {vehicle.city}</span>
      <ChevronRight className="listing-arrow" size={16}/>
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
  return <Dialog title="Registriraj autokuću" eyebrow="ZA AUTOKUĆE I UVOZNIKE" onClose={onClose} variant="form-dialog">
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
          <button type="button" className="btn quiet save-nav" aria-pressed={savedOnly} onClick={() => { setSavedOnly(!savedOnly); setDealerOnly(false); scrollResults(); }}><Heart size={16}/><span className="saved-text">Spremljeno</span><span className="badge-count mono">{savedCount}</span></button>
          <button type="button" className="btn primary publish-nav" onClick={() => setPanel("publish")}><Plus size={17}/><span>Predaj oglas</span><span className="free mono">0 €</span></button>
        </div>
      </div>
    </header>
    <main className="shell market">
      <div className="page-intro">
        <div><p className="eyebrow market-eyebrow"><span/> OGLASNIK VOZILA <span className="intro-separator"/> HRVATSKA</p><h1>Rabljena vozila</h1></div>
        <div className="intro-count"><span className="intro-dot"/><strong className="mono">{allVehicles.length}</strong> aktivnih oglasa</div>
      </div>
      <section className="search-console" aria-label="Pretraži vozila">
        <div className="console-title"><div><SearchIcon size={17}/><h2>Pretraži vozila</h2></div><SlidersHorizontal size={17} aria-hidden="true"/></div>
        {filters}
      </section>
      <div className="mobile-tools">
        <button type="button" className="btn secondary" onClick={() => setPanel("filters")}><SlidersHorizontal size={16}/> Filteri {activeCount > 0 && <span className="badge-count mono">{activeCount}</span>}</button>
        <button type="button" className="btn quiet" onClick={() => setPanel("tax")}>PPMV</button>
        <button type="button" className="btn quiet" aria-pressed={dealerOnly} onClick={() => { setDealerOnly(!dealerOnly); setSavedOnly(false); }}>Autokuće</button>
      </div>
      <section className="results" id="vozila" aria-label="Rezultati pretraživanja">
        <div className="results-toolbar">
          <div className="result-heading">
            <h2>{savedOnly ? "Spremljena vozila" : dealerOnly ? "Vozila iz autokuća" : "Rezultati pretraživanja"}</h2>
            <p aria-live="polite">Pronađeno <strong className="mono">{results.length}</strong> vozila</p>
          </div>
          <div className="results-controls">
            <div className="sort-field"><ArrowDownUp size={15}/><Select label="Sortiraj vozila" value={search.sortiranje} onChange={event => update({ ...search, sortiranje: event.target.value as Search["sortiranje"] })}>{Object.entries(sorts).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</Select></div>
            <div className="view-switch" aria-label="Prikaz rezultata">
              <button type="button" aria-label="Grid" title="Mreža" aria-pressed={search.prikaz === "grid"} onClick={() => update({ ...search, prikaz: "grid" })}><Grid2X2 size={16}/></button>
              <button type="button" aria-label="Lista" title="Lista" aria-pressed={search.prikaz === "lista"} onClick={() => update({ ...search, prikaz: "lista" })}><List size={17}/></button>
            </div>
          </div>
        </div>
        {dealerOnly && dealers.length > 0 && <div className="dealer-profiles">{dealers.map(dealer => <div key={dealer.email}><Store size={17}/><strong>{dealer.name}</strong><span>{dealer.city}</span></div>)}</div>}
        {results.length ? <div className={"listings " + (search.prikaz === "lista" ? "list-view" : "")}>{results.map((vehicle, index) =>
          <Card key={vehicle.id} vehicle={vehicle} saved={saved.includes(vehicle.id)} eager={index < 3} onOpen={() => setDetail(vehicle)} onSave={() => toggleSaved(vehicle.id)}/>
        )}</div> : <div className="empty-state"><SearchIcon size={25}/><h3>{savedOnly && !savedCount ? "Nemate spremljenih vozila" : "Nema vozila za odabrane filtre"}</h3><button type="button" className="btn secondary" onClick={() => { if (savedOnly && !savedCount) setSavedOnly(false); update({ ...initialSearch, prikaz: search.prikaz }); }}>{savedOnly && !savedCount ? "Pogledaj ponudu" : "Poništi filtere"}</button></div>}
      </section>
      <section id="autokuce" className="dealership">
        <div className="section-icon"><Store size={23}/></div>
        <div className="dealer-copy">
          <p className="eyebrow">ZA AUTOKUĆE I UVOZNIKE</p>
          <h2>Prodajete više od <span className="mono">5</span> vozila mjesečno?<br className="dealer-break"/> Prebacite cijelu zalihu u <span className="mono">30</span> sekundi.</h2>
          <ul><li><Database size={15}/>1-Klik XML / link uvoz vozila</li><li><Globe2 size={15}/>Poddomenu salona <span className="mono">vasasalon.sasija.hr</span></li><li><Tag size={15}/><span className="mono">0 €</span> probni period bez ugovorne obveze</li></ul>
        </div>
        <button className="btn secondary" type="button" onClick={() => setPanel("register")}>Registriraj autokuću <ArrowRight size={16}/></button>
      </section>
    </main>
    <footer className="site-footer"><div className="shell"><span>ŠASIJA<span className="mono">.hr</span></span><p>Ogledni oglasi i tržišne procjene.</p><button className="text-link" type="button" onClick={() => setPanel("tax")}>PPMV kalkulator <ArrowRight size={14}/></button></div></footer>
    {panel === "filters" && <Dialog title="Filteri vozila" variant="filter-drawer" onClose={() => setPanel(null)}><div className="dialog-content">{filters}</div></Dialog>}
    {panel === "tax" && <Dialog title="PPMV kalkulator uvoza" eyebrow="ALATI ZA KUPCE" onClose={() => setPanel(null)} variant="form-dialog"><div className="dialog-content"><TaxCalculator/></div></Dialog>}
    {panel === "publish" && <PublishForm onClose={() => setPanel(null)} onPublish={publish}/>}
    {panel === "register" && <DealerForm onClose={() => setPanel(null)} onRegister={register}/>}
    {detail && <Detail key={detail.id} vehicle={detail} saved={saved.includes(detail.id)} onSave={() => toggleSaved(detail.id)} onClose={() => setDetail(null)}/>}
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}<button type="button" className="icon-btn" aria-label="Zatvori obavijest" onClick={() => setNotice("")}><X size={15}/></button></div>}
  </>;
}

