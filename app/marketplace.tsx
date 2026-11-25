"use client";

import { Checkbox } from "../src/components/Checkbox";
import { Navbar } from "../src/components/Navbar";
import { ListingPhoto } from "../src/components/ListingPhoto";
import { BrandLogo } from "../src/components/BrandLogo";
import { AdSlot } from "../src/components/AdSlot";
import { ArrowDown, ArrowRight, Bike, Car, Caravan, Truck, Zap, Check, Compass, Grid2X2, List, Navigation, RotateCcw, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { SEO_CITIES, TOP_FOOTER_BRANDS, slugifyHr, vehicleIdFromPath, vehicleListingPath } from "../src/lib/seo";
import { CAR_MAKES } from "../src/data/car-catalog";
import { FaqAccordion } from "./faq-accordion";
import { DealershipDirectoryView } from "./autokuce-directory";
import { restoreListingPhotos, cities, euro, fuels, gears, marketValuation, number, power, quick, registered, vehicles, type Flag, type Vehicle } from "./catalog";
import { bodyFilters, doorOptions, seatOptions, categories, colorFinishes, cylinderCounts, distances, initialSearch, matchesCollection, matchVehicles, parseVehicleQuery, prices, readSearch, searchFilterCount, sorts, validEquipmentFilters, writeSearch, years, type CategoryId, type CollectionId, type Search } from "./search";
import { equipmentFor } from "../src/data/equipment-catalog";
import { Dialog, ListingOptions, MakeEquipmentOptions, Select } from "./ui";
import { makeOptions, vehicleMakeOptions } from "./make-equipment";
import { TaxCalculator } from "./buyer-tools";
import Detail from "./detail";
import PublishForm from "./publish";
import { ValuationPage } from "./valuation-page";
import { describeFamily, modelFor, modelsFor } from "../src/data/car-catalog";

import { AccountPage, AuthPage, type AccountTabKey } from "./account";
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

function readStored<T>(key: string): T[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(data) ? data as T[] : [];
  } catch { return []; }
}

type SearchEditorProps = {
  search: Search;
  update: (next: Search) => void;
};

function resetFilters(search: Search): Search {
  return { ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz };
}

function updateVehicleIdentity(search: Search, marka: string, model = "", generacija = ""): Search {
  return { ...search, marka, model, generacija, oprema: validEquipmentFilters(marka, model, generacija, search.oprema) };
}

function toggleSearchFlag(search: Search, flag: Flag, enabled: boolean): Search {
  return { ...search, opcije: enabled ? [...new Set([...search.opcije, flag])] : search.opcije.filter(item => item !== flag) };
}

function updateRange(search: Search, key: "sjedalaOd" | "sjedalaDo" | "cijenaOd" | "cijena", value: string): Search {
  const next = { ...search, [key]: value };
  const seats = key === "sjedalaOd" || key === "sjedalaDo";
  const low = seats ? "sjedalaOd" : "cijenaOd";
  const high = seats ? "sjedalaDo" : "cijena";
  if (next[low] && next[high] && Number(next[low]) > Number(next[high])) next[key === low ? high : low] = value;
  return next;
}

function VehicleIdentityFields({ search, update }: SearchEditorProps) {
  const models = modelsFor(search.marka, false);
  return <>
    <Select label="Marka" value={search.marka} onChange={event => update(updateVehicleIdentity(search, event.target.value))}>
      <option value="">Sve marke</option>
      {CAR_MAKES.map(make => <option key={make}>{make}</option>)}
    </Select>
    <Select label="Model" value={search.model} disabled={!models.length}
      onChange={event => update(updateVehicleIdentity(search, search.marka, event.target.value))}>
      <option value="">Svi modeli</option>
      {models.map(model => <option key={model}>{model}</option>)}
    </Select>
  </>;
}

function PurchaseMode({ search, update }: SearchEditorProps) {
  const leasing = search.opcije.includes("pdv");
  return <div className="field console-purchase">
    <span>Način kupnje</span>
    <div className="console-segment" role="group" aria-label="Način kupnje">
      <button type="button" aria-pressed={!leasing} onClick={() => update(toggleSearchFlag(search, "pdv", false))}>Kupnja</button>
      <button type="button" aria-pressed={leasing} onClick={() => update(toggleSearchFlag(search, "pdv", true))}>Leasing / R1</button>
    </div>
  </div>;
}

const compactBodyLabels: Partial<Record<(typeof bodyFilters)[number]["id"], string>> = {
  sportski: "Sportski",
  cabrio: "Cabrio",
  kombi: "Kombi / Van",
};

function BasicFilters({ search, update, compact = false }: SearchEditorProps & { compact?: boolean }) {
  function priceField(key: "cijenaOd" | "cijena", label: string) {
    const selected = Number(search[key]);
    const options = selected && !prices.includes(selected) ? [...prices, selected].sort((a, b) => a - b) : prices;
    return <Select label={label} aria-label={key === "cijenaOd" ? "Cijena od" : "Cijena do"} className="numeric-select"
      value={search[key]} onChange={event => update(updateRange(search, key, event.target.value))}>
      <option value="">Bez limita</option>
      {options.map(price => <option key={price} value={price}>{euro(price)}</option>)}
    </Select>;
  }
  return <section className="basic-filters split-fields" aria-label="Osnovni podaci">
    <h3>Osnovni podaci</h3>
    <div className="basic-identity">
      <VehicleIdentityFields search={search} update={update} />
      <label className="field basic-variant">
        <span>Varijanta / Paket</span>
        <input type="search" maxLength={100} placeholder="npr. M-Sport, GTI, S-Line..." value={search.varijanta}
          onChange={event => update({ ...search, varijanta: event.target.value })} />
      </label>
    </div>
    <fieldset>
      <legend>Tip karoserije</legend>
      <div className="body-filter-grid">
        {bodyFilters.map(({ id, label }) => (
          <label className="body-filter" key={id}>
            <Checkbox checked={search.karoserija.includes(id)} onChange={event => update({
              ...search, karoserija: event.target.checked ? [...search.karoserija, id] : search.karoserija.filter(body => body !== id),
            })} />
            <span>{compact ? compactBodyLabels[id] ?? label : label}</span>
          </label>
        ))}
      </div>
    </fieldset>
    <div className="seat-door-row">
      <fieldset>
        <legend>Broj sjedala</legend>
        <div className="paired-filters">
          {(["sjedalaOd", "sjedalaDo"] as const).map(key => (
            <Select key={key} label={key === "sjedalaOd" ? "Od" : "Do"}
              aria-label={key === "sjedalaOd" ? "Broj sjedala od" : "Broj sjedala do"} className="numeric-select"
              value={search[key]} onChange={event => update(updateRange(search, key, event.target.value))}>
              <option value="">Sve</option>
              {seatOptions.map(seats => <option key={seats} value={seats}>{seats === "8" ? "8+" : seats}</option>)}
            </Select>
          ))}
        </div>
      </fieldset>
      <Select label="Broj vrata" className="numeric-select" value={search.vrata}
        onChange={event => update({ ...search, vrata: event.target.value })}>
        <option value="">Sve</option>
        {doorOptions.map(doors => <option key={doors} value={doors}>{doors} vrata</option>)}
      </Select>
    </div>
    <PurchaseMode search={search} update={update} />
    <fieldset>
      <legend>Cijena (€)</legend>
      <div className="price-filter-row">
        <div className="paired-filters">
          {priceField("cijenaOd", "Od")}
          {priceField("cijena", "Do")}
        </div>
        <label className="inline-filter-check">
          <Checkbox checked={search.samoPrilike || search.kolekcija === "prilike"} onChange={event => update({
            ...search, samoPrilike: event.target.checked, kolekcija: search.kolekcija === "prilike" ? "" : search.kolekcija,
          })} />
          Samo prilike ispod cijene
        </label>
      </div>
    </fieldset>
  </section>;
}

function ActiveFilters({ search, update, onReset }: SearchEditorProps & { onReset?: () => void }) {
  const pills: { key: string; label: string; remove: () => void }[] = [];
  function add(key: string, label: string, next: Search) {
    pills.push({ key, label, remove: () => update(next) });
  }
  if (search.marka) add("marka", search.marka, updateVehicleIdentity(search, ""));
  if (search.model) add("model", search.model, updateVehicleIdentity(search, search.marka));
  if (search.generacija) add("generacija", search.generacija, updateVehicleIdentity(search, search.marka, search.model));
  if (search.kategorija) add("kategorija", categories.find(category => category.id === search.kategorija)?.label ?? search.kategorija, { ...search, kategorija: "" });
  const textual = ["varijanta", "gorivo", "mjenjac", "grad", "zavrsnica", "upit"] as const;
  for (const key of textual) {
    if (search[key].trim()) add(key, search[key], { ...search, [key]: "" });
  }
  const numbers = [
    ["cijenaOd", search.cijenaOd && "Od " + euro(Number(search.cijenaOd))],
    ["cijena", search.cijena && "Do " + euro(Number(search.cijena))],
    ["godiste", search.godiste && "Od " + search.godiste + "."],
    ["km", search.km && "Do " + number(Number(search.km)) + " km"],
    ["sjedalaOd", search.sjedalaOd && "Od " + search.sjedalaOd + " sjedala"],
    ["sjedalaDo", search.sjedalaDo && "Do " + (search.sjedalaDo === "8" ? "8+" : search.sjedalaDo) + " sjedala"],
    ["vrata", search.vrata && search.vrata + " vrata"],
    ["cilindri", search.cilindri && search.cilindri + " cilindara"],
  ] as const;
  for (const [key, label] of numbers) if (label) add(key, label, { ...search, [key]: "" });
  for (const body of bodyFilters) {
    if (search.karoserija.includes(body.id)) add("body:" + body.id, body.label, {
      ...search, karoserija: search.karoserija.filter(id => id !== body.id),
    });
  }
  for (const flag of search.opcije) {
    add("flag:" + flag, flag === "pdv" ? "Leasing / R1" : flag === "cvh" ? "CVH potvrđeni km" : quick[flag],
      toggleSearchFlag(search, flag, false));
  }
  const equipmentLabels = new Map([
    ...makeOptions(search.marka, search.model),
    ...equipmentFor({ make: search.marka, model: search.model, generation: search.generacija }, true),
  ].map(item => [item.id, item.label]));
  for (const id of search.oprema) add("equipment:" + id, equipmentLabels.get(id) ?? id, {
    ...search, oprema: search.oprema.filter(item => item !== id),
  });
  const collectionLabels = { prilike: "Prilike ispod cijene", "sport-paketi": "Sportski paketi", "suv-obiteljski": "SUV i obiteljski", novo: "Novo u ponudi" };
  if (search.kolekcija) add("kolekcija", collectionLabels[search.kolekcija], { ...search, kolekcija: "" });
  if (search.samoPrilike) add("samoPrilike", "Samo prilike ispod cijene", { ...search, samoPrilike: false });
  return <div className="active-filter-bar" aria-label="Aktivni filtri">
    {pills.length > 0 && <ul className="active-filter-pills">
      {pills.map(pill => <li key={pill.key}>
        <button type="button" className="tabular" aria-label={"Ukloni filtar " + pill.label} onClick={pill.remove}>
          {pill.label} <X size={14} aria-hidden="true" />
        </button>
      </li>)}
    </ul>}
    <button className="active-filter-reset" type="button" disabled={!pills.length} onClick={onReset ?? (() => update(resetFilters(search)))}>
      <RotateCcw size={15} aria-hidden="true" /> Poništi sve filtere
    </button>
  </div>;
}

function GenerationFilter({ search, update }: SearchEditorProps) {
  const generations = modelFor(search.marka, search.model)?.generations ?? [];
  return <Select label="Generacija" value={search.generacija} disabled={!generations.length}
    onChange={event => update(updateVehicleIdentity(search, search.marka, search.model, event.target.value))}>
    <option value="">Sve generacije</option>
    {generations.map(family => family.codes.length === 1
      ? <option value={family.codes[0]} key={family.codes[0]}>{describeFamily(family)}</option>
      : <optgroup label={describeFamily(family)} key={family.codes.join("/")}>
        <option value={family.codes.join("/")}>{family.codes.join("/")} · sve izvedbe</option>
        {family.codes.map(code => <option key={code}>{code}</option>)}
      </optgroup>)}
  </Select>;
}

function EngineFilters({ search, update }: SearchEditorProps) {
  return <>
    <Select label="Cilindri" className="numeric-select" value={search.cilindri}
      onChange={event => update({ ...search, cilindri: event.target.value })}>
      <option value="">Svi motori</option>
      {cylinderCounts.map(count => <option key={count} value={count}>{count}</option>)}
    </Select>
    <Select label="Završnica boje" value={search.zavrsnica} onChange={event => update({ ...search, zavrsnica: event.target.value })}>
      <option value="">Sve završnice</option>
      {colorFinishes.map(finish => <option key={finish}>{finish}</option>)}
    </Select>
  </>;
}

type FilterKey = "godiste" | "km" | "gorivo" | "mjenjac" | "grad";
type FilterField = { key: FilterKey; title: string; all: string; values: readonly (string | number)[]; format?: (v: string | number) => string; numeric?: boolean };

function FilterControls({ search, count, update, apply, compact = false }: {
  search: Search; count: number; update: (next: Search) => void; apply: () => void; compact?: boolean;
}) {
  const fields: FilterField[] = [
    { key: "godiste", title: "Godište od", all: "Sva godišta", values: years, numeric: true },
    { key: "km", title: "Kilometraža do", all: "Bez limita", values: distances, format: value => number(Number(value)) + " km", numeric: true },
    { key: "gorivo", title: "Gorivo", all: "Sva goriva", values: fuels },
    { key: "mjenjac", title: "Mjenjač", all: "Svi mjenjači", values: gears },
    { key: "grad", title: "Županija", all: "Sve županije", values: croatianCounties },
  ];
  function renderField({ key, title, all, values, format, numeric }: FilterField) {
    const current = numeric ? Number(search[key]) : search[key];
    const options = current && !values.includes(current) ? [current, ...values] : values;
    return <Select key={key} label={title} className={numeric ? "numeric-select" : ""} value={search[key]} onChange={event => update({ ...search, [key]: event.target.value })}>
      <option value="">{all}</option>
      {options.map(value => <option key={value} value={value}>{format ? format(value) : value}</option>)}
    </Select>;
  }
  return <form className="filter-form" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="filter-body">
      <BasicFilters search={search} update={update} compact={compact} />
      <div className="search-fields split-fields filter-details">
        <Select label="Kategorija" value={search.kategorija} onChange={event => update({ ...search, kategorija: event.target.value as CategoryId })}>
          {categories.map(cat => <option key={cat.id || "all"} value={cat.id}>{cat.label}</option>)}
        </Select>
        <GenerationFilter search={search} update={update} />
        {fields.map(renderField)}
        <EngineFilters search={search} update={update} />
      </div>
      <MakeEquipmentOptions make={search.marka} model={search.model} selected={search.oprema.filter(id => !id.startsWith("eq:"))} onChange={oprema => update({ ...search, oprema: [...search.oprema.filter(id => id.startsWith("eq:")), ...oprema] })}/>
      {search.marka && <EquipmentSelector filter key={search.marka + search.model} vehicle={{
        make:search.marka, model:search.model, generation:search.generacija, catalogEquipment:search.oprema,
      }} onChange={oprema => update({...search,oprema:[...search.oprema.filter(id => !id.startsWith("eq:")), ...oprema.filter(id => id.startsWith("eq:"))]})}/>}
      <ListingOptions selected={search.opcije} onChange={opcije => update({ ...search, opcije })} />
    </div>
    <ActiveFilters search={search} update={update} />
    <div className="search-actions">
      <button className="btn primary search-submit" type="submit">Prikaži <span className="tabular">{count}</span> {count === 1 ? "vozilo" : "vozila"}</button>
    </div>
  </form>;
}

const vehicleRail = [
  { id: "", label: "Osobna vozila", icon: Car },
  { id: "eko", label: "Električni i hibridi", icon: Zap },
  { id: "suv", label: "SUV i terenci", icon: Compass },
  { id: "gospodarska", label: "Kombi i gospodarska vozila", icon: Truck },
  { id: "kamperi", label: "Kamperi i putnička vozila", icon: Caravan },
  { id: "motocikli", label: "Motocikli", icon: Bike },
] as const;

const queryExamples = [
  "BMW 320d M-Sport automatik do 25.000 €",
  "Škoda Octavia dizel do 100.000 km",
  "Audi A4 S-line s potvrđenim km (CVH)",
  "Volkswagen Golf 8 GTD do 24.000 €",
];

function HeroSearch({ search, count, activeCount, update, onSubmit, onQuery }: {
  search: Search;
  count: number;
  activeCount: number;
  update: (next: Search) => void;
  onSubmit: () => void;
  onQuery: (next: Search) => void;
}) {
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState(queryExamples[0]);
  const typingPosition = useRef({ index: 0, length: queryExamples[0].length, deleting: true });
  useEffect(() => {
    if (focused || query) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    function schedule(delay: number) {
      timer = setTimeout(tick, delay);
    }
    function tick() {
      const cursor = typingPosition.current;
      const example = queryExamples[cursor.index];
      cursor.length += cursor.deleting ? -1 : 1;
      setPlaceholder(example.slice(0, cursor.length));
      if (cursor.length === 0) {
        cursor.index = (cursor.index + 1) % queryExamples.length;
        cursor.deleting = false;
        schedule(260);
      } else if (cursor.length === example.length) {
        cursor.deleting = true;
        schedule(1800);
      } else {
        schedule(cursor.deleting ? 25 : 48);
      }
    }
    function configure() {
      clearTimeout(timer);
      if (motion.matches) {
        setPlaceholder(queryExamples[0]);
      } else {
        schedule(1200);
      }
    }
    configure();
    motion.addEventListener("change", configure);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", configure);
    };
  }, [focused, query]);
  const selectedRail = vehicleRail.some(item => item.id === search.kategorija) ? search.kategorija : "";
  const numericField = (key: "godiste" | "km" | "cijena", label: string, all: string, values: readonly number[], format: (value: number) => string = number) => {
    const current = Number(search[key]);
    const options = current && !values.includes(current) ? [current, ...values] : values;
    return <Select label={label} className="numeric-select" value={search[key]} onChange={event => {
      const value = event.target.value;
      update(key === "cijena" ? updateRange(search, key, value) : { ...search, [key]: value });
    }}>
      <option value="">{all}</option>
      {options.map(value => <option key={value} value={value}>{format(value)}</option>)}
    </Select>;
  };

  return (
    <section id="hero-search" className="shell marketplace-home hero-search" aria-label="Pretraga vozila">
      <h1 className="sr-only md:hidden">Pronađite provjereno vozilo u Hrvatskoj</h1>
      <header className="market-showcase">
        <img src="/hero-twilight.webp" alt="" fetchPriority="high" />
        <div className="market-showcase-copy">
          <h1>Pronađite provjereno vozilo u Hrvatskoj</h1>
          <p>Stvarne tržišne cijene, provjera CVH kilometraže i izračun troškova uvoza na jednom mjestu.</p>
          <a href="/ppmv-kalkulator">Izračunaj trošak uvoza (PPMV) <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </header>

      <form className="market-module natural-search" aria-labelledby="natural-search-title" onSubmit={event => {
        event.preventDefault();
        if (query.trim()) onQuery(parseVehicleQuery(query, search));
      }}>
        <h2 id="natural-search-title">Tisuće provjerenih vozila. Jedna jednostavna pretraga.</h2>
        <div className="natural-search-row">
          <SearchIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          <input className="no-inner-focus" type="search" aria-label="Opišite vozilo koje tražite" maxLength={200} value={query}
            placeholder={focused ? "Opišite vozilo koje tražite" : "Npr. " + placeholder} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} required />
          <button type="submit" className="natural-submit" aria-label="Pretraži opis vozila">
            <ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </form>

      <form id="search-console" className="market-module search-console" aria-label="Filtri vozila" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <div className="vehicle-rail" role="group" aria-label="Kategorija vozila">
          {vehicleRail.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} title={label} aria-label={label} aria-pressed={selectedRail === id}
              onClick={() => update({ ...search, kategorija: id })}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="console-body">
          <div className="console-grid">
            <VehicleIdentityFields search={search} update={update} />
            {numericField("godiste", "Godište od", "Sva godišta", years, String)}
            {numericField("km", "Kilometraža do", "Bez limita", distances, value => number(value) + " km")}
            <PurchaseMode search={search} update={update} />
            {numericField("cijena", "Cijena do (€)", "Bez limita", prices, euro)}
            <div className="console-location">
              <Select label="Županija / Grad" value={search.grad} onChange={event => update({ ...search, grad: event.target.value })}>
                <option value="">Sve županije</option>
                <optgroup label="Županije">{croatianCounties.map(county => <option key={county}>{county}</option>)}</optgroup>
                <optgroup label="Gradovi">{cities.map(city => <option key={city}>{city}</option>)}</optgroup>
              </Select>
              <Navigation size={15} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <button type="submit" className="console-cta">Pretraži {number(count)} oglasa</button>
          </div>

          {more && <div id="console-extra" className="console-extra">
            <BasicFilters search={search} update={update} />
            <div className="console-grid split-fields filter-details">
              <GenerationFilter search={search} update={update} />
              <Select label="Gorivo" value={search.gorivo} onChange={event => update({ ...search, gorivo: event.target.value })}>
                <option value="">Sva goriva</option>
                {fuels.map(fuel => <option key={fuel}>{fuel}</option>)}
              </Select>
              <Select label="Mjenjač" value={search.mjenjac} onChange={event => update({ ...search, mjenjac: event.target.value })}>
                <option value="">Svi mjenjači</option>
                {gears.map(gear => <option key={gear}>{gear}</option>)}
              </Select>
              <EngineFilters search={search} update={update} />
            </div>
            <ActiveFilters search={search} update={update} onReset={() => {
              setQuery("");
              update(resetFilters(search));
            }} />
          </div>}

          <div className="console-utilities">
            <label className="console-check">
              <Checkbox checked={search.opcije.includes("cvh")} onChange={event => update(toggleSearchFlag(search, "cvh", event.target.checked))} />
              Samo s potvrđenim km (CVH)
            </label>
            <div className="console-actions">
              <button type="button" disabled={!activeCount && !query} onClick={() => {
                setQuery("");
                update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz });
              }}><RotateCcw size={16} aria-hidden="true" /> Poništi filtere</button>
              <button type="button" aria-expanded={more} aria-controls={more ? "console-extra" : undefined} onClick={() => setMore(value => !value)}>
                <SlidersHorizontal size={16} aria-hidden="true" /> {more ? "Manje filtera" : "Više filtera"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function DiscoveryBar({
  vehicles: allList,
  search,
  onApply,
}: {
  vehicles: Vehicle[];
  search: Search;
  onApply: (next: Search) => void;
}) {
  const pills = useMemo(() => {
    const countMatches = (fn: (v: Vehicle) => boolean) => allList.filter(fn).length;
    return [
      {
        id: "prilike",
        label: "Prilike ispod cijene",
        count: countMatches(v => matchesCollection(v, "prilike")),
        active: search.kolekcija === "prilike",
        nextSearch: { ...initialSearch, kolekcija: "prilike" as CollectionId, sortiranje: "rating" as Search["sortiranje"], prikaz: search.prikaz },
      },
      {
        id: "do-15000",
        label: "Do 15.000 €",
        count: countMatches(v => v.price <= 15000),
        active: search.cijena === "15000" && !search.kolekcija && !search.gorivo && !search.mjenjac,
        nextSearch: { ...initialSearch, cijena: "15000", sortiranje: search.sortiranje, prikaz: search.prikaz },
      },
      {
        id: "sport-paketi",
        label: "M-Sport / S-Line / AMG",
        count: countMatches(v => matchesCollection(v, "sport-paketi")),
        active: search.kolekcija === "sport-paketi",
        nextSearch: { ...initialSearch, kolekcija: "sport-paketi" as CollectionId, sortiranje: search.sortiranje, prikaz: search.prikaz },
      },
      {
        id: "automatik-dizel",
        label: "Automatik + Dizel",
        count: countMatches(v => v.gear === "Automatski" && v.fuel === "Dizel"),
        active: search.mjenjac === "Automatski" && search.gorivo === "Dizel" && !search.kolekcija,
        nextSearch: { ...initialSearch, mjenjac: "Automatski", gorivo: "Dizel", sortiranje: search.sortiranje, prikaz: search.prikaz },
      },
      {
        id: "suv-obiteljski",
        label: "SUV i obiteljski",
        count: countMatches(v => matchesCollection(v, "suv-obiteljski")),
        active: search.kolekcija === "suv-obiteljski",
        nextSearch: { ...initialSearch, kolekcija: "suv-obiteljski" as CollectionId, sortiranje: search.sortiranje, prikaz: search.prikaz },
      },
      {
        id: "novo",
        label: "Novo u ponudi",
        count: countMatches(v => matchesCollection(v, "novo")),
        active: search.kolekcija === "novo",
        nextSearch: { ...initialSearch, kolekcija: "novo" as CollectionId, sortiranje: "newest" as Search["sortiranje"], prikaz: search.prikaz },
      },
    ] as const;
  }, [allList, search]);

  const hasQuickFilter = Boolean(search.kolekcija || search.cijena || search.gorivo || search.mjenjac);

  return (
    <nav className="quick-discovery shell" aria-label="Brzi odabir vozila">
      <span className="quick-discovery-label">Brzi odabir</span>
      <div className="quick-discovery-pills">
        {pills.map(pill => (
          <button
            key={pill.id}
            type="button"
            aria-pressed={pill.active}
            onClick={() =>
              onApply(
                pill.active
                  ? { ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz }
                  : pill.nextSearch,
              )
            }
            className={"quick-pill" + (pill.active ? " active" : "")}
          >
            {pill.label} <span className="tabular-nums">{pill.count}</span>
          </button>
        ))}
        {hasQuickFilter && (
          <button
            type="button"
            className="quick-pill-reset"
            onClick={() => onApply({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz })}
          >
            Poništi
          </button>
        )}
      </div>
    </nav>
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
    <section className="home-section home-section-first shell marketplace-home scroll-mt-20 overflow-visible mt-5" aria-labelledby="recommended-title">
      <div className="home-section-head">
        <h2 id="recommended-title">Top <span className="opportunity-pill">PRILIKE</span> za vas</h2>
        <button type="button" className="text-link home-more-link" onClick={onShowAll}>
          Prikaži sve oglase (<span className="tabular">{allList.length}</span>) <ArrowDown size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="recommended-grid overflow-visible">
        {recommended.map(({ vehicle, val }, index) => (
          <Listing key={vehicle.id} vehicle={vehicle} valuation={val} saved={savedIds.includes(vehicle.id)}
            onSave={() => onSave(vehicle.id)} eager={index < 4} onOpen={event => onOpen(event, vehicle.id)} />
        ))}
      </div>
    </section>
  );
}

function PopularBrandsStrip({
  selectedBrand,
  onSelectBrand,
}: {
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
}) {
  return (
    <section className="home-section shell scroll-mt-20 overflow-visible" aria-labelledby="brands-title">
      <div className="home-section-head">
        <div>
          <h2 id="brands-title">Popularne marke</h2>
        </div>
      </div>
      <div className="brand-rail" role="group" aria-label="Filtriraj po marki">
        {popularBrands.map(brand => {
          const active = selectedBrand === brand;
          return (
            <button
              key={brand}
              type="button"
              aria-pressed={active}
              className={"brand-rail-item" + (active ? " active" : "")}
              onClick={() => onSelectBrand(active ? "" : brand)}
            >
              <BrandLogo make={brand} size="sm" className="brand-rail-emblem" />
              <span>{brand}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="brand-rail-all"
          aria-pressed={!selectedBrand}
          onClick={() => onSelectBrand("")}
        >
          Sve marke <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function listingUrl(id: string) {
  return vehicleListingPath(id);
}

function scrollToTop() {
  window.scrollTo({ top:0,left:0,behavior:"instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function Listing({ vehicle, saved, onOpen, onSave, eager, horizontal = false, valuation = marketValuation(vehicle) }: {
  vehicle: Vehicle;
  saved: boolean;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
  onSave: () => void;
  eager: boolean;
  horizontal?: boolean;
  valuation?: ReturnType<typeof marketValuation>;
}) {
  const href = listingUrl(vehicle.id);
  const oldPrice = vehicle.previousPriceEur;
  const gear = vehicle.gear === "Automatski" ? "Automatik" : vehicle.gear;
  const specs = [registered(vehicle.date), number(vehicle.km) + " km", power(vehicle.kw), gear, vehicle.fuel];
  const seller = [vehicle.city, vehicle.seller || (vehicle.dealer ? "Autokuća" : "Privatni prodavač")].filter(Boolean).join(" • ");
  const highlighted = Boolean(vehicle.isFeatured) || (vehicle.boostedUntil ?? 0) > Date.now() / 1000;
  const photo = <ListingPhoto className="vehicle-card-media" vehicle={vehicle} saved={saved} onSave={onSave}
    eager={eager} compact href={href} onOpen={onOpen} />;
  const title = <h3 className="vehicle-card-title">
    <a className="card-link" href={href} onClick={onOpen} title={vehicle.title}><span>{vehicle.title}</span></a>
  </h3>;
  const sellerLine = <>
    <span className="vehicle-card-seller-name" title={seller}>{seller}</span>
    {vehicle.verified && <Check size={14} strokeWidth={1.75} role="img"
      aria-label={vehicle.dealer ? "Verificirana autokuća" : "Verificirani prodavač"} />}
  </>;

  if (horizontal) {
    const equipment = [...new Set([
      ...vehicleMakeOptions(vehicle).map(option => option.label),
      ...Object.values(vehicle.equipment).flat(),
    ].filter(Boolean))].slice(0, 4).join(" • ");
    const trust = [...new Set([
      ...(vehicle.history ?? []),
      ...vehicle.flags.map(flag => quick[flag]),
    ].filter(Boolean))].join(" • ");
    const tax = vehicle.flags.includes("pdv") ? "Uključen PDV (R1)" : vehicle.flags.includes("kupac") ? "Na ime kupca" : "";
    const discount = oldPrice !== undefined && oldPrice > vehicle.price ? oldPrice - vehicle.price : null;
    const { rating, deltaEur } = valuation;
    const marketDelta = deltaEur < 0
      ? euro(-deltaEur) + " ispod prosjeka RH"
      : deltaEur > 0 ? euro(deltaEur) + " iznad prosjeka RH" : "U prosjeku RH";

    return <article className="vehicle-card vehicle-list-row">
      {photo}
      <div className="vehicle-list-body">
        <div>
          <div className="vehicle-list-title">
            {title}
            {highlighted && <span className="vehicle-card-featured">Istaknuti oglas</span>}
          </div>
          <p className="vehicle-list-specs tabular">{specs.join(" • ")}</p>
          {(equipment || trust) && <div className="vehicle-list-metadata tabular">
            {equipment && <p title={equipment}><strong>Oprema:</strong> {equipment}</p>}
            {trust && <p title={trust}>{trust}</p>}
          </div>}
        </div>
        <footer className="vehicle-card-seller vehicle-list-seller">{sellerLine}</footer>
      </div>
      <div className="vehicle-list-price">
        <div className="vehicle-list-amount tabular">
          {discount !== null && oldPrice !== undefined && <div className="vehicle-list-discount">
            <del>{euro(oldPrice)}</del> <span className="verified-price-savings">−{euro(discount)}</span>
          </div>}
          <strong>{euro(vehicle.price)}</strong>
          {tax && <p>{tax}</p>}
        </div>
        <div className="vehicle-list-market" data-below-market={rating.rank <= 1 && deltaEur < 0}>
          <div className="vehicle-list-gauge">
            <span className="vehicle-list-bars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => <span key={index} data-filled={index < rating.bars} />)}
            </span>
            <strong>{rating.label}</strong>
          </div>
          <p className="tabular">{marketDelta}</p>
        </div>
        <a className="vehicle-list-details" href={href} onClick={onOpen} aria-label={"Detalji oglasa: " + vehicle.title}>
          Detalji oglasa <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </article>;
  }

  return <article className="vehicle-card">
    {photo}
    <div className="vehicle-card-body">
      {title}
      <p className="vehicle-card-specs tabular">{specs.join(" • ")}</p>
      <div className="vehicle-card-price">
        <div className="vehicle-card-amount tabular">
          <strong>{euro(vehicle.price)}</strong>
          {oldPrice !== undefined && oldPrice > vehicle.price && <del>{euro(oldPrice)}</del>}
        </div>
        <span className="vehicle-market-rating" data-below-market={valuation.rating.rank <= 1 && valuation.deltaEur < 0}>
          {valuation.rating.label}
        </span>
      </div>
      <footer className="vehicle-card-seller">
        {sellerLine}
        {highlighted && <span className="vehicle-card-featured">Istaknuti oglas</span>}
      </footer>
    </div>
  </article>;
}

export default function Marketplace({
  initialPath = "/",
  initialSearchOverride,
  initialDealerOnly = false,
  initialDetailId = null,
  seoHeader,
  skipHero = false,
}: {
  initialPath?: string;
  initialSearchOverride?: Partial<Search>;
  initialDealerOnly?: boolean;
  initialDetailId?: string | null;
  seoHeader?: ReactNode;
  skipHero?: boolean;
}) {
  const [search, setSearch] = useState<Search>(() => ({ ...initialSearch, ...initialSearchOverride }));
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
  const [accountTab, setAccountTab] = useState<AccountTabKey>("pregled");
  const [accountConvId, setAccountConvId] = useState<string | undefined>(undefined);
  const [pendingChatVehicle, setPendingChatVehicle] = useState<Vehicle | null>(null);

  async function mergeGuestFavorites(currentAccount: Account | null) {
    if (!currentAccount) return;
    const guestIds = readStored<string>(storageKeys.saved);
    if (!guestIds.length) return;
    const allKnown = [...remote, ...published, ...vehicles];
    const items = guestIds.map(id => ({
      id,
      price: allKnown.find(v => v.id === id)?.price ?? 0,
    }));
    try {
      await api("favorites/merge", { items });
      localStorage.removeItem(storageKeys.saved);
      setSaved([]);
    } catch {
      // Keep guest favorites intact if offline
    }
  }

  async function refresh() {
    const [current, inventory] = await Promise.all([api<Account | null>("account"), api<Vehicle[]>("inventory")]);
    if (current) await mergeGuestFavorites(current);
    const reloaded = current ? await api<Account | null>("account") : null;
    setAccount(reloaded);
    setRemote(inventory);
    setLoadedInventory(true);
    setAccountError("");
  }
  function navigate(target: string, replace = false) {
    cancelResultScroll.current?.();
    if (location.pathname + location.search !== target) history[replace ? "replaceState" : "pushState"](null,"",target);
    setPath(location.pathname.replace(/\/$/,"") || "/");
    const params = new URLSearchParams(location.search);
    const id = params.get("oglas") ?? vehicleIdFromPath(location.pathname);
    const rawTab = params.get("tab") as AccountTabKey | null;
    setAccountTab(rawTab && ["pregled", "oglasi", "poruke", "favoriti", "b2b", "postavke", "moderiranje"].includes(rawTab) ? rawTab : "pregled");
    setAccountConvId(params.get("razgovor") || undefined);
    setDealerId(params.get("salon"));
    setDetailId(id);activeDetail.current=id;
    setSearch(readSearch(location.search));
    scrollToTop();
  }
  async function startChat(vehicle: Vehicle, initialMessage?: string) {
    if (!account) {
      setPendingChatVehicle(vehicle);
      navigate("/prijava");
      return;
    }
    try {
      const res = await api<{ conversationId: string }>("conversation/start", {
        vehicleId: vehicle.id,
        vehicleTitle: vehicle.title,
        vehiclePriceEur: vehicle.price,
        vehicleImage: vehicle.photos[0]?.src,
        sellerId: vehicle.dealershipId || "seller-" + vehicle.id,
        sellerName: vehicle.seller || "Privatni prodavač",
        sellerCity: vehicle.city,
        initialMessage: initialMessage || `Pozdrav, zanima me ${vehicle.title}. Je li vozilo još dostupno?`,
      });
      await refresh();
      navigate(`/racun?tab=poruke&razgovor=${encodeURIComponent(res.conversationId)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Razgovor nije moguće pokrenuti.");
    }
  }
  async function signedIn() {
    await refresh();
    if (pendingChatVehicle) {
      const targetVehicle = pendingChatVehicle;
      setPendingChatVehicle(null);
      try {
        const res = await api<{ conversationId: string }>("conversation/start", {
          vehicleId: targetVehicle.id,
          vehicleTitle: targetVehicle.title,
          vehiclePriceEur: targetVehicle.price,
          vehicleImage: targetVehicle.photos[0]?.src,
          sellerId: targetVehicle.dealershipId || "seller-" + targetVehicle.id,
          sellerName: targetVehicle.seller || "Privatni prodavač",
          sellerCity: targetVehicle.city,
          initialMessage: `Pozdrav, zanima me ${targetVehicle.title}. Je li vozilo još dostupno?`,
        });
        await refresh();
        navigate(`/racun?tab=poruke&razgovor=${encodeURIComponent(res.conversationId)}`, true);
        return;
      } catch {
        // Fallback to /racun
      }
    }
    navigate("/racun", true);
  }
  async function signOut() {
    try { await api("auth/logout",{});await refresh();navigate("/",true); }
    catch (error) {setNotice(error instanceof Error ? error.message : "Odjava nije uspjela.");}
  }
  const [savedOnly, setSavedOnly] = useState(false);
  const [dealerOnly, setDealerOnly] = useState(initialDealerOnly);
  const [panel, setPanel] = useState<Panel>(null);
  const [dealerId,setDealerId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);
  const resultsScroll = useRef(0);
  const resetOnPop = useRef(false);
  const cancelResultScroll = useRef<(() => void) | null>(null);
  const activeDetail = useRef<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const locationChanged = (event?: PopStateEvent) => {
      setPath(location.pathname.replace(/\/$/,"") || "/");
      const params = new URLSearchParams(window.location.search);
      const id = params.get("oglas") ?? vehicleIdFromPath(location.pathname) ?? (event ? null : initialDetailId);
      const rawTab = params.get("tab") as AccountTabKey | null;
      setAccountTab(rawTab && ["pregled", "oglasi", "poruke", "favoriti", "b2b", "postavke", "moderiranje"].includes(rawTab) ? rawTab : "pregled");
      setAccountConvId(params.get("razgovor") || undefined);
      setDealerId(params.get("salon"));
      const urlSearch = readSearch(window.location.search);
      const hasUrlFilter = Boolean(window.location.search);
      setSearch(hasUrlFilter ? urlSearch : { ...urlSearch, ...initialSearchOverride });
      const wasDetail = activeDetail.current !== null;
      activeDetail.current = id;
      setDetailId(id);
      if (event) cancelResultScroll.current?.();
      if (event && (wasDetail || id)) {
        const toTop = resetOnPop.current || Boolean(id);
        resetOnPop.current = false;
        if (toTop) scrollToTop();
        else requestAnimationFrame(() => window.scrollTo({top:resultsScroll.current,left:0,behavior:"instant"}));
      }
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
    return () => { cancelResultScroll.current?.(); history.scrollRestoration = previousRestoration; window.removeEventListener("popstate", locationChanged); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const allVehicles = useMemo(() => {
    const unique = new Map<string, Vehicle>();
    for (const vehicle of [...remote, ...published, ...vehicles]) {
      if (!unique.has(vehicle.id)) unique.set(vehicle.id, vehicle);
    }
    return [...unique.values()];
  }, [remote, published]);
  const savedIds = account ? account.favorites.map(item => item.id) : saved;
  const dealerProfile = dealerId && allVehicles.find(vehicle => vehicle.dealershipId === dealerId);
  const dealerMakes = dealerId ? [...new Set(allVehicles.filter(vehicle => vehicle.dealershipId === dealerId).map(vehicle => vehicle.make))] : [];
  const detail = allVehicles.find(vehicle => vehicle.id === detailId);
  const renderedDetail = detail?.id;
  useLayoutEffect(scrollToTop,[path]);
  useLayoutEffect(() => { if (detailId) scrollToTop(); },[detailId,renderedDetail]);
  useEffect(() => {
    if (!detailId) return;
    const frame = requestAnimationFrame(scrollToTop);
    return () => cancelAnimationFrame(frame);
  },[detailId,renderedDetail]);
  function openListing(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    cancelResultScroll.current?.();
    if (!detailId) resultsScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    const target = new URL(vehicleListingPath(id), url.origin);
    url.pathname = target.pathname;
    url.search = target.search;
    const depth = detailId ? Number(history.state?.autoplacDetailDepth ?? 0) : 0;
    history.pushState({ autoplacDetailDepth: depth + (detailId && !depth ? 0 : 1) }, "", url);
    activeDetail.current = id;
    setPath("/");
    setDetailId(id);
    scrollToTop();
  }
  function backToResults() {
    scrollToTop();
    const depth = Number(history.state?.autoplacDetailDepth ?? 0);
    if (depth > 0) {
      resetOnPop.current = true;
      history.go(-depth);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("oglas");
    if (url.pathname.startsWith("/oglas/")) url.pathname = "/";
    history.replaceState(null, "", url);
    setPath("/");
    activeDetail.current = null;
    setDetailId(null);
    requestAnimationFrame(scrollToTop);
  }
  const goToResults = () => { if (detailId) backToResults(); };
  const inventory = useMemo(() => allVehicles.filter(v => (!savedOnly || savedIds.includes(v.id)) && (!dealerOnly || v.dealer) && (!dealerId || v.dealershipId === dealerId)), [allVehicles, savedIds, savedOnly, dealerOnly, dealerId]);
  const results = useMemo(() => matchVehicles(inventory, search), [inventory, search]);
  const savedCount = allVehicles.filter(v => savedIds.includes(v.id)).length;
  const activeCount = searchFilterCount(search);
  const update = (next: Search) => { setSearch(next); writeSearch(next); };
  const scrollResults = () => requestAnimationFrame(() => document.getElementById("svi-oglasi")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  const apply = () => {
    cancelResultScroll.current?.();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setPanel(null);
    const viewport = window.visualViewport;
    let timer: number | undefined, frame: number | undefined;
    function cleanup() {
      clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize",onResize);
      cancelResultScroll.current = null;
    }
    function finish() {
      clearTimeout(timer);
      viewport?.removeEventListener("resize",onResize);
      frame = requestAnimationFrame(() => {cleanup();scrollResults();});
      cancelResultScroll.current = cleanup;
    }
    function onResize() {
      if (viewport && viewport.height >= document.documentElement.clientHeight - 80) finish();
    }
    // Wait for the keyboard to settle, with a bound for browsers that skip resize.
    if (panel === "filters" && viewport && viewport.height < document.documentElement.clientHeight - 80) {
      timer = window.setTimeout(finish,420);
      viewport.addEventListener("resize",onResize);
      cancelResultScroll.current = cleanup;
    } else finish();
  };
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
    cancelResultScroll.current?.();
    if (path !== "/" || dealerId) navigate("/"); else goToResults();
    setDealerOnly(false);
    setSavedOnly(false);
    scrollToTop();
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
    if (path === "/predaj-oglas") {
      if (account) {
        setEditing(undefined);
        setPanel("publish");
      } else if (account === null) {
        setPublishAfterLogin(true);
        navigate("/prijava");
      }
    } else if (publishAfterLogin && account && path === "/racun" && (account.verified || account.profile.type === "dealer")) {
      setPublishAfterLogin(false);setEditing(undefined);setPanel("publish");
    }
  },[publishAfterLogin,account,path]);
  const legalPath = Object.hasOwn(legalLinks,path) ? path as LegalPath : undefined;
  const filters = <FilterControls search={search} count={results.length} update={update} apply={apply}/>;
  const activeHeaderRoute = path.startsWith("/autokuce/") ? "/autokuce"
    : path === "/" && (dealerOnly || savedOnly || detailId || dealerId) ? "" : path;
  return <div className="min-h-screen flex flex-col overflow-x-clip">
    <Navbar
      activeRoute={activeHeaderRoute}
      routeKey={JSON.stringify([path, detailId, dealerId, accountTab, accountConvId])}
      savedCount={savedCount} savedOnly={savedOnly}
      account={account ? { name: account.profile.name, avatar: account.profile.avatarUrl, unread: account.unreadCount } : undefined}
      onNavigate={href => href === "/" ? showMarket() : navigate(href)}
      onPublish={() => startPublish()}
      onSaved={enabled => {
        if (path !== "/" || dealerId) navigate("/");
        else goToResults();
        setSavedOnly(enabled);
        setDealerOnly(false);
        scrollResults();
      }}
    />

    <div className="flex-1 min-w-0">
    {legalPath ? <LegalPage key={path} path={legalPath} cookieSettings={() => setCookieSettings(true)} report={() => setReport({})}/> :
      path === "/autokuce" || path.startsWith("/autokuce/") ? (
        <DealershipDirectoryView
          vehicles={allVehicles}
          selectedSlug={path.startsWith("/autokuce/") ? decodeURIComponent(path.slice("/autokuce/".length)) : null}
          savedIds={savedIds}
          onSave={id => void toggleSaved(id)}
          onOpenListing={openListing}
          onNavigate={url => navigate(url)}
          onContactDealer={startChat}
        />
      ) :
      path === "/procjena-cijene" ? <ValuationPage inventory={allVehicles} onOpenListing={openListing} onOpenTax={() => navigate("/ppmv-kalkulator")} /> :
      path === "/ppmv-kalkulator" ? (
        <main className="shell valuation-shell max-w-[1160px] mx-auto px-4 sm:px-6 flex flex-col gap-5">
          <header className="valuation-hero">
            <div>
              <span className="eyebrow">Carinska uprava RH · 2026</span>
              <h1>PPMV Kalkulator 2026 — Izračun trošarine za uvoz auta iz Njemačke i EU</h1>
              <p>Informativni izračun posebnog poreza na motorna vozila (vrijednosna + CO₂ komponenta) za rabljena i nova vozila pri unosu iz EU.</p>
            </div>
            <button type="button" className="btn secondary" onClick={() => navigate("/procjena-cijene")}>
              Procjena tržišne cijene u RH →
            </button>
          </header>
          <section className="detail-panel rounded-xl">
            <TaxCalculator />
          </section>
          <AdSlot placement="hero-leaderboard" routeKey="/ppmv-kalkulator" />
          <FaqAccordion title="Česta pitanja o uvozu vozila i PPMV-u" />
        </main>
      ) :
      path === "/racun" ? account ? <AccountPage key={account.id} account={account} inventory={allVehicles} refresh={refresh} onPublish={startPublish} signOut={() => void signOut()} openPrivacySettings={() => setCookieSettings(true)} onOpenListing={id => navigate(vehicleListingPath(id))} initialTab={accountTab} initialConversationId={accountConvId}/> :
        <main className="shell account-shell"><div className="empty-state"><h1>{account === undefined && !accountError ? "Učitavanje računa…" : accountError || "Prijavite se za pristup računu"}</h1><a className="btn primary" href="/prijava">Prijava</a></div></main> :
      path === "/prijava" || path === "/registracija" ? <AuthPage key={path} registration={path === "/registracija"} defaultType={dealerRegistration ? "dealer" : "private"} onDone={signedIn}/> :
      detailId ? detail ? <Detail key={detail.id} vehicle={detail} inventory={allVehicles}
      sellerTools={account?.listings.some(item => item.id === detail.id) ? { phone: account.profile.phone } : undefined}
      saved={savedIds.includes(detail.id)} onSave={() => toggleSaved(detail.id)} onBack={backToResults}
      onOpen={openListing} onNotice={setNotice} onReport={() => setReport({id:detail.id})} onStartChat={startChat}
      onOpenValuation={(e, url) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          navigate(url);
        }
      }} /> : <main className="shell market detail-missing">
        <div className="empty-state"><h1>{loadedInventory ? "Oglas nije dostupan" : "Učitavanje oglasa…"}</h1><button type="button" className="btn secondary" onClick={backToResults}>Natrag na rezultate</button></div>
      </main> : <>
      {seoHeader}
      {!skipHero && (
        <>
          <HeroSearch
            search={search}
            count={results.length}
            activeCount={activeCount}
            update={update}
            onSubmit={scrollResults}
            onQuery={next => {
              setDealerOnly(false);
              setSavedOnly(false);
              update(next);
              scrollResults();
            }}
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
          <DiscoveryBar
            vehicles={allVehicles}
            search={search}
            onApply={next => {
              setDealerOnly(false);
              setSavedOnly(false);
              update(next);
              scrollResults();
            }}
          />
          <PopularBrandsStrip
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
          <AdSlot placement="hero-leaderboard" routeKey={path + search.marka} />
        </>
      )}
      <main id="svi-oglasi" className="shell market">
        <div className="hidden lg:flex flex-col gap-3 min-w-0">
          <aside className="filter-sidebar" aria-labelledby="filter-title">
            <h2 id="filter-title">Filteri</h2>
            <FilterControls search={search} count={results.length} update={update} apply={apply} compact />
          </aside>
          <AdSlot placement="sidebar-square" routeKey={path + search.marka} onAction={() => setPanel("tax")} />
        </div>
        <section className="results" id="vozila" aria-labelledby="results-title">
          {dealerProfile && <section className="detail-panel seller-card dealership-profile" aria-label="Profil autokuće">
            <h1>{dealerProfile.seller}</h1>
          <ul className="dealer-brand-tags" aria-label="Marke u ponudi">{dealerMakes.map(make => <li key={make}><BrandLogo make={make} size="xs"/>{make}</li>)}</ul>
            <p>{dealerProfile.sellerAddress || dealerProfile.city}</p>
            {dealerProfile.sellerWorkingHours && <p className="tabular">{dealershipHoursToday(dealerProfile.sellerWorkingHours)}</p>}
            {dealerProfile.sellerHours && <p>{dealerProfile.sellerHours}</p>}
          </section>}
          <div className="mobile-tools">
            <button type="button" className="btn secondary" aria-haspopup="dialog" onClick={() => setPanel("filters")}><SlidersHorizontal size={16}/> Filteri {activeCount > 0 && <span className="tabular">({activeCount})</span>}</button>
            <button type="button" className="btn quiet mobile-nav-action" onClick={() => {scrollToTop();setPanel("tax");}}>PPMV</button>
            <button type="button" className="btn quiet mobile-nav-action" onClick={() => navigate("/procjena-cijene")}>Procjena</button>
            <button type="button" className="btn quiet mobile-nav-action" aria-pressed={path === "/autokuce" || path.startsWith("/autokuce/")} onClick={() => navigate("/autokuce")}>Autokuće</button>
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
          {results.length ? <div className={"listings " + (search.prikaz === "lista" ? "list-view" : "grid-view")}>{results.map((vehicle, index) => (
            <Fragment key={vehicle.id}>
              <Listing vehicle={vehicle} saved={savedIds.includes(vehicle.id)} eager={index < 3}
                horizontal={search.prikaz === "lista"} onOpen={event => openListing(event, vehicle.id)} onSave={() => toggleSaved(vehicle.id)} />
              {(index + 1) % 6 === 0 && (
                <div className="col-span-full">
                  <AdSlot placement="in-feed-native" routeKey={`${path}-${index}`} onAction={() => navigate("/ppmv-kalkulator")} />
                </div>
              )}
            </Fragment>
          ))}</div> : <div className="empty-state"><h2>{savedOnly && !savedCount ? "Nemate spremljenih vozila" : "Nema vozila za odabrane filtre"}</h2><button type="button" className="btn secondary" onClick={() => { if (savedOnly && !savedCount) setSavedOnly(false); update({ ...initialSearch, prikaz: search.prikaz }); }}>{savedOnly && !savedCount ? "Pogledaj ponudu" : "Poništi filtere"}</button></div>}
          <section id="autokuce" className="dealership">
            <h2>Za autokuće i uvoznike</h2>
            <button className="btn secondary" type="button" onClick={() => {setDealerRegistration(true);navigate(account ? "/racun" : "/registracija");}}>Registriraj autokuću</button>
          </section>
        </section>
      </main>
    </>}
    </div>
    <footer className="site-footer">
      <div className="shell footer-inner">
        <section className="footer-directory" aria-label="Popularne pretrage po markama i gradovima">
          <h2 className="footer-heading">Popularne pretrage po markama i gradovima</h2>
          <div className="footer-directory-cols">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <strong className="text-[var(--spec)] !m-0">Marke:</strong>
              {TOP_FOOTER_BRANDS.map(brand => (
                <a key={brand} href={`/rabljena-vozila/${slugifyHr(brand)}`} className="footer-link">
                  Rabljena {brand}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <strong className="text-[var(--spec)] !m-0">Gradovi:</strong>
              {SEO_CITIES.slice(0, 12).map(city => (
                <a key={city.slug} href={`/rabljena-vozila/grad/${city.slug}`} className="footer-link">
                  Rabljena vozila {city.city}
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="footer-cols">
          <section className="footer-col" aria-label="Kontakt">
            <h3 className="footer-heading">AUTOPLAC.HR</h3>
            <p>Oglasnik rabljenih vozila i provjera tržišnih cijena u Hrvatskoj.</p>
            <p><strong className="text-[var(--text)] !m-0">INO-TEH d.o.o.</strong></p>
            <p><a className="footer-link" href="mailto:info@autoplac.hr">info@autoplac.hr</a></p>
            <p>Zagreb, Hrvatska</p>
          </section>

          <section className="footer-col" aria-label="Vodiči za kupce">
            <h3 className="footer-heading">Za kupce</h3>
            <a className="footer-link" href="/procjena-cijene">Procjena tržišne cijene vozila</a>
            <a className="footer-link" href="/ppmv-kalkulator">PPMV kalkulator 2026</a>
            <a className="footer-link" href="/autokuce">Verificirane autokuće</a>
            <a className="footer-link" href="/rabljena-vozila/bmw">Rabljena vozila po markama</a>
            <a className="footer-link" href="/rabljena-vozila/grad/zagreb">Rabljena vozila po gradovima</a>
          </section>

          <section className="footer-col" aria-label="B2B cjenik za autokuće">
            <h3 className="footer-heading">Za autokuće · B2B</h3>
            <ul className="footer-pricing">
              <li><span>Start</span><strong className="tabular-nums">0 € / 90 dana</strong></li>
              <li><span>Pro Salon</span><strong className="tabular-nums">99 €/mj.</strong></li>
              <li><span>AI Partner</span><strong className="tabular-nums">159 €/mj.</strong></li>
            </ul>
            <a className="footer-link" href="/registracija">Registriraj autokuću →</a>
          </section>

          <section className="footer-col" aria-label="Pravni dokumenti">
            <h3 className="footer-heading">Pravno i postavke</h3>
            <nav className="footer-legal" aria-label="Pravni dokumenti">
              {Object.entries(legalLinks).map(([url,label]) => <a key={url} href={url} className="footer-link">{label}</a>)}
            </nav>
            <button type="button" className="footer-link footer-settings" onClick={() => setCookieSettings(true)}>Postavke kolačića</button>
          </section>
        </div>

        <div className="footer-bottom">
          <span className="font-bold text-[var(--text)]">AUTOPLAC<span className="tabular text-[var(--muted)]">.hr</span></span>
          <span>© 2026 INO-TEH d.o.o. · Sva prava pridržana · <a className="footer-link" href="mailto:info@autoplac.hr">info@autoplac.hr</a></span>
        </div>
      </div>
    </footer>
    {panel === "filters" && <Dialog title="Filteri vozila" variant="filter-drawer" onClose={() => setPanel(null)}>{filters}</Dialog>}
    {panel === "tax" && <Dialog title="PPMV kalkulator uvoza" onClose={() => setPanel(null)} variant="form-dialog"><div className="dialog-content"><TaxCalculator/></div></Dialog>}
    {panel === "publish" && account && <PublishForm onClose={() => setPanel(null)} onPublish={publish} existing={editing} contact={{...account.profile,email:account.email}}/>}
    {report && <ReportDialog listing={report.id} onClose={() => setReport(undefined)}/>}
    <CookieConsent settings={cookieSettings} close={() => setCookieSettings(false)}/>
    {notice && <div className="toast" role="status"><Check size={17}/>{notice}<button type="button" className="icon-btn" aria-label="Zatvori obavijest" onClick={() => setNotice("")}><X size={15}/></button></div>}
  </div>;
}
