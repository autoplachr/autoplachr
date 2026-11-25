"use client";

import { ArrowDown, ArrowRight, CarFront, Check, ChevronDown, Grid2X2, Heart, List, Moon, Plus, SlidersHorizontal, Sparkles, Sun, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { restoreListingPhotos, countyByCity, euro, fuels, gears, marketValuation, number, power, quick, registered, vehicles, type Flag, type Vehicle } from "./catalog";
import { categories, distances, initialSearch, matchVehicles, prices, readSearch, sorts, validEquipmentFilters, writeSearch, years, type CategoryId, type Search } from "./search";
import { CatalogFields } from "./catalog-fields";
import { Dialog, ListingOptions, MakeEquipmentOptions, PhotoCount, Rating, Select, VehiclePhoto } from "./ui";
import { vehicleMakeOptions } from "./make-equipment";
import { TaxCalculator } from "./buyer-tools";
import Detail from "./detail";
import PublishForm from "./publish";
import { ValuationPage } from "./valuation-page";
import { describeMarketDelta } from "../src/lib/price-engine";
import { CAR_MAKES, describeFamily, modelFor, modelsFor } from "../src/data/car-catalog";

import { AccountPage, AuthPage } from "./account";
import { api, type Account, type ListingStatus, type OwnedListing } from "./account-api";
import { CookieConsent, LegalPage, ReportDialog, legalLinks, type LegalPath } from "./legal";
import { dealershipHoursToday } from "../src/data/working-hours";
import { croatianCounties } from "../src/data/croatia-locations";
import { EquipmentSelector } from "./equipment-selector";

type Panel = "filters" | "publish" | "tax" | null;
const storageKeys = { saved: "autoplac.saved", inventory: "autoplac.inventory" };
const popularBrands = [
  "BMW",
  "Volkswagen",
  "Audi",
  "Mercedes-Benz",
  "Škoda",
  "Porsche",
  "Volvo",
  "Toyota",
  "Renault",
  "Peugeot",
  "Hyundai",
  "Tesla",
  "Mazda",
  "Cupra",
] as const;

const heroChips: readonly { flag: Flag; label: string }[] = [
  { flag: "pdv", label: "U sustavu PDV-a (R1)" },
  { flag: "kupac", label: "Na ime kupca" },
  { flag: "cvh", label: "Potvrđeni km (CVH)" },
  { flag: "dolazak", label: "Vozilo u dolasku" },
];

function readStored<T>(key: string): T[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(data) ? data as T[] : [];
  } catch { return []; }
}

type FilterKey = "cijena" | "godiste" | "km" | "gorivo" | "mjenjac" | "grad";
type FilterField = { key: FilterKey; title: string; all: string; values: readonly (string | number)[]; format?: (v: string | number) => string; numeric?: boolean };

function FilterControls({ search, count, update, apply }: {
  search: Search; count: number; update: (next: Search) => void; apply: () => void;
}) {
  const active = Boolean(search.kategorija || search.marka || search.model || search.cijena || search.godiste || search.km || search.gorivo || search.mjenjac || search.grad || search.opcije.length || search.oprema.length || search.generacija);
  const fields: FilterField[] = [
    { key: "cijena", title: "Cijena do (€)", all: "Bez limita", values: prices, format: value => euro(Number(value)) + (value === 50000 ? "+" : ""), numeric: true },
    { key: "godiste", title: "Godište od", all: "Sva godišta", values: years, numeric: true },
    { key: "km", title: "Kilometraža do", all: "Bez limita", values: distances, format: value => number(Number(value)) + " km", numeric: true },
    { key: "gorivo", title: "Gorivo", all: "Sva goriva", values: fuels },
    { key: "mjenjac", title: "Mjenjač", all: "Svi mjenjači", values: gears },
    { key: "grad", title: "Županija", all: "Sva Hrvatska", values: croatianCounties },
  ];
  function renderField({ key, title, all, values, format, numeric }: FilterField) {
    return <Select key={key} label={title} className={numeric ? "numeric-select" : ""} value={key === "grad" ? countyByCity[search.grad] ?? search.grad : search[key]} onChange={event => update({ ...search, [key]: event.target.value })}>
      <option value="">{all}</option>
      {values.map(value => <option key={value} value={value}>{format ? format(value) : value}</option>)}
    </Select>;
  }
  return <form className="filter-form" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="filter-body">
      <div className="search-fields vehicle-identity">
        <Select label="Kategorija" className="generation-field" value={search.kategorija} onChange={event => update({ ...search, kategorija: event.target.value as CategoryId })}>
          {categories.map(cat => <option key={cat.id || "all"} value={cat.id}>{cat.label}</option>)}
        </Select>
        <CatalogFields value={{ make: search.marka, model: search.model, generation: search.generacija }} onChange={({make, model, generation}) => update({
          ...search, marka: make, model, generacija: generation, oprema: validEquipmentFilters(make, model, generation, search.oprema),
        })} />
      </div>
      <MakeEquipmentOptions make={search.marka} model={search.model} selected={search.oprema.filter(id => !id.startsWith("eq:"))} onChange={oprema => update({ ...search, oprema: [...search.oprema.filter(id => id.startsWith("eq:")), ...oprema] })}/>
      {search.marka && <EquipmentSelector filter key={search.marka + search.model} vehicle={{
        make:search.marka, model:search.model, generation:search.generacija, catalogEquipment:search.oprema,
      }} onChange={oprema => update({...search,oprema:[...search.oprema.filter(id => !id.startsWith("eq:")), ...oprema.filter(id => id.startsWith("eq:"))]})}/>}
      <div className="search-fields">{fields.map(renderField)}</div>
      <ListingOptions selected={search.opcije} onChange={opcije => update({ ...search, opcije })} />
    </div>
    <div className="search-actions">
      <button className="btn primary search-submit" type="submit">Prikaži <span className="tabular">{count}</span> {count === 1 ? "vozilo" : "vozila"}</button>
      <button className="reset-btn" type="button" disabled={!active} onClick={() => update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz })}>Poništi filtere</button>
    </div>
  </form>;
}

function HeroSearch({
  search,
  count,
  activeCount,
  update,
  onSubmit,
}: {
  search: Search;
  count: number;
  activeCount: number;
  update: (next: Search) => void;
  onSubmit: () => void;
}) {
  const models = modelsFor(search.marka, false);
  const generations = modelFor(search.marka, search.model)?.generations ?? [];
  const toggleFlag = (flag: Flag) => {
    const next = search.opcije.includes(flag)
      ? search.opcije.filter(item => item !== flag)
      : [...search.opcije, flag];
    update({ ...search, opcije: next });
  };
  return (
    <section id="hero-search" className="hero-search" aria-labelledby="hero-title">
      <div className="shell hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title">Pronađite provjereno vozilo u Hrvatskoj</h1>
          <p>Usporedite stvarne tržišne cijene, provjerite kilometražu i izračunajte troškove uvoza na jednom mjestu.</p>
        </div>
        <form
          className="hero-box"
          onSubmit={event => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="hero-tabs" role="tablist" aria-label="Kategorija vozila">
            {categories.map(cat => (
              <button
                key={cat.id || "all"}
                type="button"
                role="tab"
                aria-selected={search.kategorija === cat.id}
                className={"hero-tab" + (search.kategorija === cat.id ? " active" : "")}
                onClick={() => update({ ...search, kategorija: cat.id })}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="hero-grid">
            <label className="hero-field">
              <span>Marka</span>
              <div className="select-shell">
                <select
                  aria-label="Marka"
                  value={search.marka}
                  onChange={event => {
                    const make = event.target.value;
                    update({
                      ...search,
                      marka: make,
                      model: "",
                      generacija: "",
                      oprema: validEquipmentFilters(make, "", "", search.oprema),
                    });
                  }}
                >
                  <option value="">Sve marke</option>
                  {CAR_MAKES.map(make => <option key={make}>{make}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field">
              <span>Model</span>
              <div className="select-shell">
                <select
                  aria-label="Model"
                  value={search.model}
                  disabled={!models.length}
                  onChange={event => {
                    const model = event.target.value;
                    update({
                      ...search,
                      model,
                      generacija: "",
                      oprema: validEquipmentFilters(search.marka, model, "", search.oprema),
                    });
                  }}
                >
                  <option value="">Svi modeli</option>
                  {models.map(model => <option key={model}>{model}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field">
              <span>Generacija / Šasija</span>
              <div className="select-shell">
                <select
                  aria-label="Generacija / Šasija"
                  value={search.generacija}
                  disabled={!generations.length}
                  onChange={event => {
                    const generation = event.target.value;
                    update({
                      ...search,
                      generacija: generation,
                      oprema: validEquipmentFilters(search.marka, search.model, generation, search.oprema),
                    });
                  }}
                >
                  <option value="">Sve generacije</option>
                  {generations.map(family =>
                    family.codes.length === 1 ? (
                      <option value={family.codes[0]} key={family.codes[0]}>{describeFamily(family)}</option>
                    ) : (
                      <optgroup label={describeFamily(family)} key={family.codes.join("/")}>
                        <option value={family.codes.join("/")}>{family.codes.join("/")} · sve izvedbe</option>
                        {family.codes.map(code => <option key={code} value={code}>{code}</option>)}
                      </optgroup>
                    ),
                  )}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field numeric-select">
              <span>Cijena do (€)</span>
              <div className="select-shell">
                <select
                  aria-label="Cijena do (€)"
                  value={search.cijena}
                  onChange={event => update({ ...search, cijena: event.target.value })}
                >
                  <option value="">Bez limita</option>
                  {prices.map(value => (
                    <option key={value} value={value}>{euro(value) + (value === 50000 ? "+" : "")}</option>
                  ))}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field numeric-select">
              <span>Godište od</span>
              <div className="select-shell">
                <select
                  aria-label="Godište od"
                  value={search.godiste}
                  onChange={event => update({ ...search, godiste: event.target.value })}
                >
                  <option value="">Sva godišta</option>
                  {years.map(y => <option key={y} value={y}>{y}.</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field numeric-select">
              <span>Kilometraža do</span>
              <div className="select-shell">
                <select
                  aria-label="Kilometraža do"
                  value={search.km}
                  onChange={event => update({ ...search, km: event.target.value })}
                >
                  <option value="">Bez limita</option>
                  {distances.map(d => <option key={d} value={d}>{number(d)} km</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field">
              <span>Gorivo</span>
              <div className="select-shell">
                <select
                  aria-label="Gorivo"
                  value={search.gorivo}
                  onChange={event => update({ ...search, gorivo: event.target.value })}
                >
                  <option value="">Sva goriva</option>
                  {fuels.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>

            <label className="hero-field">
              <span>Županija</span>
              <div className="select-shell">
                <select
                  aria-label="Županija"
                  value={countyByCity[search.grad] ?? search.grad}
                  onChange={event => update({ ...search, grad: event.target.value })}
                >
                  <option value="">Sva Hrvatska</option>
                  {croatianCounties.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
            </label>
          </div>

          <div className="hero-footer">
            <div className="hero-chips" role="group" aria-label="Brzi uvjeti">
              {heroChips.map(chip => {
                const pressed = search.opcije.includes(chip.flag);
                return (
                  <button
                    key={chip.flag}
                    type="button"
                    aria-pressed={pressed}
                    className={"hero-chip" + (pressed ? " active" : "")}
                    onClick={() => toggleFlag(chip.flag)}
                  >
                    {pressed && <Check size={13} aria-hidden="true" />}
                    {chip.label}
                  </button>
                );
              })}
              {activeCount > 0 && (
                <button
                  type="button"
                  className="hero-reset"
                  onClick={() => update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz })}
                >
                  Poništi ({activeCount})
                </button>
              )}
            </div>
            <button type="submit" className="btn hero-cta">
              Pretraži <span className="tabular">{count}</span> {count === 1 ? "vozilo" : "vozila"} <ArrowDown size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function RecommendedStrip({
  vehicles: allList,
  savedIds,
  onOpen,
  onSave,
  onShowAll,
}: {
  vehicles: Vehicle[];
  savedIds: string[];
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onSave: (id: string) => void;
  onShowAll: () => void;
}) {
  const recommended = useMemo(() => {
    return allList
      .map(vehicle => {
        const val = marketValuation(vehicle);
        const tierScore = val.rating.rank === 0 ? 40 : val.rating.rank === 1 ? 26 : val.rating.rank === 2 ? 10 : 0;
        const trustScore = (vehicle.flags.includes("cvh") ? 12 : 0) + (vehicle.verified ? 10 : 0) + (vehicle.flags.includes("pdv") ? 4 : 0);
        const dealBonus = Math.max(-10, Math.min(20, -val.deltaPercent));
        return { vehicle, val, score: tierScore + trustScore + dealBonus };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [allList]);

  if (!recommended.length) return null;

  return (
    <section className="home-section shell" aria-labelledby="recommended-title">
      <div className="home-section-head">
        <div>
          <span className="eyebrow">Izdvojena ponuda</span>
          <h2 id="recommended-title">Preporučena vozila i prilike tjedna</h2>
        </div>
        <button type="button" className="text-link home-more-link" onClick={onShowAll}>
          Prikaži sve oglase (<span className="tabular">{allList.length}</span>) <ArrowDown size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="recommended-grid">
        {recommended.map(({ vehicle, val }, index) => {
          const isSaved = savedIds.includes(vehicle.id);
          const tag = val.rating.rank === 0 || index < 3 ? "Prilika tjedna" : "Preporuka";
          return (
            <article key={vehicle.id} className="rec-card">
              <div className="rec-media">
                <VehiclePhoto photo={vehicle.photos[0]} alt={vehicle.title} eager={index < 4} />
                <span className={"rec-tag" + (tag === "Prilika tjedna" ? " deal" : "")}>
                  {tag === "Prilika tjedna" && <Sparkles size={12} aria-hidden="true" />}
                  {tag}
                </span>
                <button
                  className={"icon-btn heart-button " + (isSaved ? "saved" : "")}
                  type="button"
                  aria-label={isSaved ? "Ukloni spremljeno vozilo " + vehicle.title : "Spremi " + vehicle.title}
                  aria-pressed={isSaved}
                  onClick={() => onSave(vehicle.id)}
                >
                  <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="rec-body">
                <h3>
                  <a className="card-link" href={listingUrl(vehicle.id)} onClick={event => onOpen(event, vehicle.id)}>
                    {vehicle.title}
                  </a>
                </h3>
                <p className="rec-specs tabular">
                  {registered(vehicle.date)} • {number(vehicle.km)} km • {vehicle.kw} kW • {vehicle.fuel}
                </p>
                <div className="rec-price-row">
                  <strong className="tabular">{euro(vehicle.price)}</strong>
                  <Rating tier={val.rating} />
                </div>
                <p className="rec-seller">
                  <span>{vehicle.city} • {vehicle.seller || "Privatni prodavač"}</span>
                  {vehicle.verified && <Check size={14} className="rec-verified" aria-label="Verificirana autokuća" />}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PopularBrandsStrip({
  vehicles: allList,
  selectedBrand,
  onSelectBrand,
}: {
  vehicles: Vehicle[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of allList) map.set(v.make, (map.get(v.make) ?? 0) + 1);
    return map;
  }, [allList]);

  return (
    <section className="home-section shell" aria-labelledby="brands-title">
      <div className="home-section-head">
        <div>
          <span className="eyebrow">Najtraženije u Hrvatskoj</span>
          <h2 id="brands-title">Brzi odabir po markama</h2>
        </div>
      </div>
      <div className="brands-grid">
        {popularBrands.map(brand => {
          const count = counts.get(brand) ?? 0;
          const active = selectedBrand === brand;
          const monogram = brand === "Mercedes-Benz" ? "MB" : brand.slice(0, 2).toUpperCase();
          return (
            <button
              key={brand}
              type="button"
              aria-pressed={active}
              className={"brand-card" + (active ? " active" : "")}
              onClick={() => onSelectBrand(active ? "" : brand)}
            >
              <span className="brand-mark" aria-hidden="true">{monogram}</span>
              <span className="brand-meta">
                <strong>{brand}</strong>
                <small className="tabular">{count} {count === 1 ? "vozilo" : "vozila"}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function listingUrl(id: string) {
  return "?oglas=" + encodeURIComponent(id);
}

function scrollToTop() {
  window.scrollTo({ top: 0 });
}

function Listing({ vehicle, saved, onOpen, onSave, eager }: {
  vehicle: Vehicle; saved: boolean; onOpen: (event: MouseEvent<HTMLAnchorElement>) => void; onSave: () => void; eager: boolean;
}) {
  const vat = vehicle.flags.includes("pdv");
  const arriving = vehicle.flags.includes("dolazak");
  const specs = [registered(vehicle.date), number(vehicle.km) + " km", power(vehicle.kw), vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear, vehicle.fuel];
  const featured = vehicle.trim.split(/[·•]/).map(item => item.trim()).filter(Boolean);
  const equipment = featured.length ? featured : [...new Set([
    ...vehicleMakeOptions(vehicle).map(item => item.label), ...Object.values(vehicle.equipment).flat(),
  ])].slice(0, 5);
  const history = [...(vehicle.history ?? []), ...vehicle.flags.filter(flag => Object.hasOwn(quick, flag)).map(flag => quick[flag])];
  const valuation = marketValuation(vehicle);
  const delta = describeMarketDelta(valuation.deltaEur, valuation.deltaPercent, euro);
  return <article className="listing">
    <div className="listing-media">
      <VehiclePhoto photo={vehicle.photos[0]} alt={vehicle.title} eager={eager}/>
      {(arriving || vat) && <span className={"listing-badge" + (arriving ? " arriving" : "")}>{arriving ? quick.dolazak : "PDV u cijeni (R1)"}</span>}
      <PhotoCount index={0} total={vehicle.photos.length}/>
      <button className={"icon-btn heart-button " + (saved ? "saved" : "")} type="button" aria-label={saved ? "Ukloni spremljeno vozilo " + vehicle.title : "Spremi " + vehicle.title} aria-pressed={saved} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"}/></button>
    </div>
    <div className="listing-content">
      <h3><a className="card-link" href={listingUrl(vehicle.id)} onClick={onOpen}>{vehicle.title}</a></h3>
      <ul className="listing-specs" aria-label="Osnovni podaci">{specs.map((spec, index) =>
        <li key={spec} className={index < 3 ? "tabular" : undefined}>{spec}</li>
      )}</ul>
      <div className="listing-facts">
        <p title={equipment.join(" • ")}><b>Oprema</b> {equipment.join(" • ") || "Nije navedena"}</p>
        <p title={history.join(" • ")}><b>Povijest i porez</b> {history.join(" • ") || "Nema podataka"}</p>
      </div>
      <div className="listing-seller">
        <span>{vehicle.seller || (vehicle.dealer ? "Autokuća" : "Privatni prodavač")} <span aria-hidden="true">·</span> {vehicle.city}</span>
        {vehicle.verified && <span className="verified-label"><Check size={14} aria-hidden="true" />Verificirana autokuća</span>}
      </div>
    </div>
    <div className="listing-price">
      <strong className="tabular">{euro(vehicle.price)}</strong>
      <Rating tier={valuation.rating}/>
      <span className={"price-delta tabular " + delta.tone}>{delta.text}</span>
      {vat && <span className="vat-note">Uključen PDV (R1)</span>}
      <a className="listing-details" href={listingUrl(vehicle.id)} onClick={onOpen} aria-label={"Detalji: " + vehicle.title}>Detalji <ArrowRight size={15}/></a>
    </div>
  </article>;
}

export default function Marketplace({ initialPath = "/" }: {initialPath?:string}) {
  const [dark, setDark] = useState(false);
  function changeTheme() {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDark(next);
    try { localStorage.setItem("autoplac.theme", next ? "dark" : "light"); } catch {}
  }
  const [search, setSearch] = useState(initialSearch);
  const [saved, setSaved] = useState<string[]>([]);
  const [published, setPublished] = useState<Vehicle[]>([]);
  const [account,setAccount] = useState<Account | null>();
  const [remote,setRemote] = useState<Vehicle[]>([]);
  const [path,setPath] = useState(initialPath);
  const [editing,setEditing] = useState<OwnedListing>();
  const [cookieSettings,setCookieSettings] = useState(false);
  const [report,setReport] = useState<{id?:string}>();
  const [accountError,setAccountError] = useState("");
  const [loadedInventory,setLoadedInventory] = useState(false);
  const [publishAfterLogin,setPublishAfterLogin] = useState(false);
  const [dealerRegistration,setDealerRegistration] = useState(false);
  async function refresh() {
    const [current, inventory] = await Promise.all([api<Account | null>("account"),api<Vehicle[]>("inventory")]);
    setAccount(current);setRemote(inventory);setLoadedInventory(true);setAccountError("");
  }
  function navigate(target: string, replace = false) {
    if (location.pathname + location.search !== target) history[replace ? "replaceState" : "pushState"](null,"",target);
    setPath(location.pathname.replace(/\/$/,"") || "/");
    const params = new URLSearchParams(location.search);
    const id = params.get("oglas");
    setDealerId(params.get("salon"));
    setDetailId(id);activeDetail.current=id;
    setSearch(readSearch(location.search));
    requestAnimationFrame(scrollToTop);
  }
  async function signedIn() {
    await refresh();
    navigate("/racun",true);
  }
  async function signOut() {
    try { await api("auth/logout",{});await refresh();navigate("/",true); }
    catch (error) {setNotice(error instanceof Error ? error.message : "Odjava nije uspjela.");}
  }
  const [savedOnly, setSavedOnly] = useState(false);
  const [dealerOnly, setDealerOnly] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [dealerId,setDealerId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const resultsScroll = useRef(0);
  const activeDetail = useRef<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    const themeChanged = (event: StorageEvent) => {
      if (event.key !== "autoplac.theme" && event.key !== null) return;
      const selected = event.newValue === "dark";
      document.documentElement.dataset.theme = selected ? "dark" : "light";
      setDark(selected);
    };
    window.addEventListener("storage", themeChanged);
    const locationChanged = (event?: PopStateEvent) => {
      setPath(location.pathname.replace(/\/$/,"") || "/");
      const params = new URLSearchParams(window.location.search);
      const id = params.get("oglas");
      setDealerId(params.get("salon"));
      setSearch(readSearch(window.location.search));
      const wasDetail = activeDetail.current !== null;
      activeDetail.current = id;
      setDetailId(id);
      if (event && (wasDetail || id)) requestAnimationFrame(() => window.scrollTo(0, id ? 0 : resultsScroll.current));
    };
    const sync = (event?:StorageEvent) => {
      if (event?.key === "autoplac.local-demo.v1") void refresh().catch(() => undefined);
      setSaved(readStored<string>(storageKeys.saved));
      setPublished(readStored<Vehicle>(storageKeys.inventory).map(restoreListingPhotos));

    };
    void refresh().catch(error => {setAccountError(error.message);setLoadedInventory(true);});
    locationChanged();
    sync();
    window.addEventListener("popstate", locationChanged);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("storage", themeChanged); window.removeEventListener("popstate", locationChanged); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const allVehicles = useMemo(() => [...remote, ...published, ...vehicles], [remote,published]);
  const savedIds = account ? account.favorites.map(item => item.id) : saved;
  const dealerProfile = dealerId && remote.find(vehicle => vehicle.dealershipId === dealerId);
  const detail = allVehicles.find(vehicle => vehicle.id === detailId);
  function openListing(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!detailId) resultsScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.set("oglas", id);
    const depth = detailId ? Number(history.state?.autoplacDetailDepth ?? 0) : 0;
    history.pushState({ autoplacDetailDepth: depth + (detailId && !depth ? 0 : 1) }, "", url);
    activeDetail.current = id;
    setPath("/");
    setDetailId(id);
    requestAnimationFrame(() => {
      scrollToTop();
      document.getElementById("vehicle-title")?.focus({ preventScroll: true });
    });
  }
  function backToResults() {
    const depth = Number(history.state?.autoplacDetailDepth ?? 0);
    if (depth > 0) {
      history.go(-depth);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("oglas");
    history.replaceState(null, "", url);
    activeDetail.current = null;
    setDetailId(null);
    requestAnimationFrame(scrollToTop);
  }
  const goToResults = () => { if (detailId) backToResults(); };
  const inventory = useMemo(() => allVehicles.filter(v => (!savedOnly || savedIds.includes(v.id)) && (!dealerOnly || v.dealer) && (!dealerId || v.dealershipId === dealerId)), [allVehicles, savedIds, savedOnly, dealerOnly, dealerId]);
  const results = useMemo(() => matchVehicles(inventory, search), [inventory, search]);
  const savedCount = allVehicles.filter(v => savedIds.includes(v.id)).length;
  const activeCount = [search.kategorija, search.marka, search.model, search.generacija, search.cijena, search.godiste, search.km, search.gorivo, search.mjenjac, search.grad].filter(Boolean).length + search.opcije.length + search.oprema.length;
  const update = (next: Search) => { setSearch(next); writeSearch(next); };
  const scrollResults = () => requestAnimationFrame(() => document.getElementById("svi-oglasi")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  const apply = () => { setPanel(null); scrollResults(); };
  async function toggleSaved(id: string) {
    if (account) {
      try {
        await api("favorite",{id,saved:!savedIds.includes(id),price:allVehicles.find(item => item.id === id)?.price ?? 0});
        await refresh();
      } catch (error) {setNotice(error instanceof Error ? error.message : "Promjena nije spremljena.");}
      return;
    }
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    try { localStorage.setItem(storageKeys.saved, JSON.stringify(next)); }
    catch { setNotice("Spremljeno do zatvaranja stranice."); }
    setSaved(next);
  }
  function showMarket() {
    if (path !== "/" || dealerId) navigate("/"); else goToResults();
    setDealerOnly(false);
    setSavedOnly(false);
    window.scrollTo({ top: 0 });
  }
  function startPublish(listing?: OwnedListing) {
    if (!account) {
      setPublishAfterLogin(true);
      navigate("/prijava");
      return;
    }
    setEditing(listing);setPanel("publish");
  }
  async function publish(vehicle: Vehicle, status: ListingStatus) {
    await api("listing/save",{vehicle,status});
    await refresh();
    setPanel(null);setEditing(undefined);setPublishAfterLogin(false);
    setNotice(status === "active" ? "Oglas je objavljen." : "Oglas je spremljen.");
    if (path !== "/racun") navigate(status === "active" ? "/" : "/racun");
  }
  useEffect(() => {
    if (publishAfterLogin && account && path === "/racun" && (account.verified || account.profile.type === "dealer")) {
      setPublishAfterLogin(false);setEditing(undefined);setPanel("publish");
    }
  },[publishAfterLogin,account,path]);
  const legalPath = Object.hasOwn(legalLinks,path) ? path as LegalPath : undefined;
  const filters = <FilterControls search={search} count={results.length} update={update} apply={apply}/>;
  return <>
    <header className="topbar">
      <div className="shell topbar-inner">
        <button className="brand" type="button" aria-label="Autoplac HR, početna" onClick={showMarket}><span className="brand-icon"><CarFront size={20} strokeWidth={2.2}/></span><span>AUTOPLAC</span><span className="brand-domain tabular">.hr</span></button>
        <nav className="main-nav" aria-label="Glavna navigacija">
          <button type="button" aria-current={path === "/" && !dealerOnly && !savedOnly && !detailId ? "page" : undefined} onClick={showMarket}>Rabljena vozila</button>
          <button type="button" aria-current={path === "/" && dealerOnly ? "page" : undefined} onClick={() => { if (path !== "/" || dealerId) navigate("/"); else goToResults(); setDealerOnly(true); setSavedOnly(false); scrollResults(); }}>Autokuće</button>
          <button type="button" onClick={() => setPanel("tax")}>PPMV Kalkulator</button>
          <button type="button" aria-current={path === "/procjena-cijene" ? "page" : undefined} onClick={() => { navigate("/procjena-cijene"); window.scrollTo({ top: 0 }); }}>Procjena cijene</button>
        </nav>
        <div className="header-actions">
          <button type="button" className="icon-btn theme-toggle" aria-label="Tamna tema" aria-pressed={dark} title={dark ? "Uključi svijetlu temu" : "Uključi tamnu temu"} onClick={changeTheme}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <button type="button" className="btn quiet save-nav" aria-label={"Spremljeno " + savedCount} aria-pressed={savedOnly} onClick={() => { if (path !== "/" || dealerId) navigate("/"); else goToResults(); setSavedOnly(!savedOnly); setDealerOnly(false); scrollResults(); }}><Heart size={16}/><span className="saved-text">Spremljeno</span><span className="saved-count tabular">{savedCount}</span></button>
          <button type="button" className="btn quiet account-nav" onClick={() => navigate(account ? "/racun" : "/prijava")}><UserRound size={16}/><span>{account ? "Račun" : "Prijava"}</span></button>
          <button type="button" className="btn primary publish-nav" aria-label="Predaj oglas" title="Predaj oglas" onClick={() => startPublish()}><Plus size={17}/><span className="publish-text">Predaj oglas</span><span className="free tabular">0 €</span></button>
        </div>
      </div>
    </header>
    {legalPath ? <LegalPage key={path} path={legalPath} cookieSettings={() => setCookieSettings(true)} report={() => setReport({})}/> :
      path === "/procjena-cijene" ? <ValuationPage inventory={allVehicles} onOpenListing={openListing} onOpenTax={() => setPanel("tax")} /> :
      path === "/racun" ? account ? <AccountPage key={account.id} account={account} inventory={allVehicles} refresh={refresh} onPublish={startPublish} signOut={() => void signOut()} openPrivacySettings={() => setCookieSettings(true)}/> :
        <main className="shell account-shell"><div className="empty-state"><h1>{account === undefined && !accountError ? "Učitavanje računa…" : accountError || "Prijavite se za pristup računu"}</h1><a className="btn primary" href="/prijava">Prijava</a></div></main> :
      path === "/prijava" || path === "/registracija" ? <AuthPage key={path} registration={path === "/registracija"} defaultType={dealerRegistration ? "dealer" : "private"} onDone={signedIn}/> :
      detailId ? detail ? <Detail key={detail.id} vehicle={detail} inventory={allVehicles}
      saved={savedIds.includes(detail.id)} onSave={() => toggleSaved(detail.id)} onBack={backToResults}
      onOpen={openListing} onNotice={setNotice} onReport={() => setReport({id:detail.id})} /> : <main className="shell market detail-missing">
        <div className="empty-state"><h1>{loadedInventory ? "Oglas nije dostupan" : "Učitavanje oglasa…"}</h1><button type="button" className="btn secondary" onClick={backToResults}>Natrag na rezultate</button></div>
      </main> : <>
      <HeroSearch
        search={search}
        count={results.length}
        activeCount={activeCount}
        update={update}
        onSubmit={scrollResults}
      />
      <RecommendedStrip
        vehicles={allVehicles}
        savedIds={savedIds}
        onOpen={openListing}
        onSave={id => void toggleSaved(id)}
        onShowAll={() => {
          setDealerOnly(false);
          setSavedOnly(false);
          update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz });
          scrollResults();
        }}
      />
      <PopularBrandsStrip
        vehicles={allVehicles}
        selectedBrand={search.marka}
        onSelectBrand={brand => {
          setDealerOnly(false);
          setSavedOnly(false);
          update({
            ...initialSearch,
            marka: brand,
            sortiranje: search.sortiranje,
            prikaz: search.prikaz,
          });
          scrollResults();
        }}
      />
      <main id="svi-oglasi" className="shell market">
        <aside className="filter-sidebar" aria-labelledby="filter-title">
          <h2 id="filter-title">Filteri</h2>
          {filters}
        </aside>
        <section className="results" id="vozila" aria-labelledby="results-title">
          {dealerProfile && <section className="detail-panel seller-card dealership-profile" aria-label="Profil autokuće">
            <h1>{dealerProfile.seller}</h1>
            <p>{dealerProfile.sellerAddress || dealerProfile.city}</p>
            {dealerProfile.sellerWorkingHours && <p className="tabular">{dealershipHoursToday(dealerProfile.sellerWorkingHours)}</p>}
            {dealerProfile.sellerHours && <p>{dealerProfile.sellerHours}</p>}
          </section>}
          <div className="mobile-tools">
            <button type="button" className="btn secondary" aria-haspopup="dialog" onClick={() => setPanel("filters")}><SlidersHorizontal size={16}/> Filteri {activeCount > 0 && <span className="tabular">({activeCount})</span>}</button>
            <button type="button" className="btn quiet mobile-nav-action" onClick={() => setPanel("tax")}>PPMV</button>
            <button type="button" className="btn quiet mobile-nav-action" onClick={() => { navigate("/procjena-cijene"); window.scrollTo({ top: 0 }); }}>Procjena</button>
            <button type="button" className="btn quiet mobile-nav-action" aria-pressed={dealerOnly} onClick={() => { setDealerOnly(!dealerOnly); setSavedOnly(false); }}>Autokuće</button>
          </div>
          <div className="results-toolbar">
            <h2 id="results-title" className="result-count" aria-live="polite">{savedOnly ? "Spremljeno" : "Pronađeno"} <strong className="tabular">{results.length}</strong> {results.length === 1 ? "vozilo" : "vozila"}{dealerOnly && " iz autokuća"}</h2>
            <div className="results-controls">
              <Select className="sort-field" label="Sortiraj vozila" value={search.sortiranje} onChange={event => update({ ...search, sortiranje: event.target.value as Search["sortiranje"] })}>{Object.entries(sorts).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</Select>
              <div className="view-switch" role="group" aria-label="Prikaz rezultata">
                <button type="button" aria-label="Lista" title="Lista" aria-pressed={search.prikaz === "lista"} onClick={() => update({ ...search, prikaz: "lista" })}><List size={17}/></button>
                <button type="button" aria-label="Mreža" title="Mreža" aria-pressed={search.prikaz === "grid"} onClick={() => update({ ...search, prikaz: "grid" })}><Grid2X2 size={16}/></button>
              </div>
            </div>
          </div>
          {results.length ? <div className={"listings " + (search.prikaz === "lista" ? "list-view" : "grid-view")}>{results.map((vehicle, index) =>
            <Listing key={vehicle.id} vehicle={vehicle} saved={savedIds.includes(vehicle.id)} eager={index < 3} onOpen={event => openListing(event, vehicle.id)} onSave={() => toggleSaved(vehicle.id)}/>
          )}</div> : <div className="empty-state"><h2>{savedOnly && !savedCount ? "Nemate spremljenih vozila" : "Nema vozila za odabrane filtre"}</h2><button type="button" className="btn secondary" onClick={() => { if (savedOnly && !savedCount) setSavedOnly(false); update({ ...initialSearch, prikaz: search.prikaz }); }}>{savedOnly && !savedCount ? "Pogledaj ponudu" : "Poništi filtere"}</button></div>}
          <section id="autokuce" className="dealership">
            <h2>Za autokuće i uvoznike</h2>
            <button className="btn secondary" type="button" onClick={() => {setDealerRegistration(true);navigate(account ? "/racun" : "/registracija");}}>Registriraj autokuću</button>
          </section>
        </section>
      </main>
    </>}
    <footer className="site-footer"><div className="shell"><span>AUTOPLAC<span className="tabular">.hr</span></span><nav className="footer-legal" aria-label="Pravni dokumenti">{Object.entries(legalLinks).map(([url,label]) => <a key={url} href={url}>{label}</a>)}<button type="button" onClick={() => setCookieSettings(true)}>Postavke kolačića</button></nav></div></footer>
    {panel === "filters" && <Dialog title="Filteri vozila" variant="filter-drawer" onClose={() => setPanel(null)}>{filters}</Dialog>}
    {panel === "tax" && <Dialog title="PPMV kalkulator uvoza" onClose={() => setPanel(null)} variant="form-dialog"><div className="dialog-content"><TaxCalculator/></div></Dialog>}
    {panel === "publish" && account && <PublishForm onClose={() => setPanel(null)} onPublish={publish} existing={editing} contact={{...account.profile,email:account.email}}/>}
    {report && <ReportDialog listing={report.id} onClose={() => setReport(undefined)}/>}
    <CookieConsent settings={cookieSettings} close={() => setCookieSettings(false)}/>
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}<button type="button" className="icon-btn" aria-label="Zatvori obavijest" onClick={() => setNotice("")}><X size={15}/></button></div>}
  </>;
}
