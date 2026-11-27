"use client";

import { categories, type CategoryId } from "./vehicle-category";
import { Checkbox } from "../src/components/Checkbox";
import { Navbar } from "../src/components/Navbar";
import { VehicleCard } from "./vehicle-card";
import { BrandLogo } from "../src/components/BrandLogo";
import { ArrowRight, Bike, Car, ChevronLeft, ChevronRight, Truck, Check, Grid2X2, List, Navigation, RotateCcw, Search as SearchIcon, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { SEO_CITIES, TOP_FOOTER_BRANDS, slugifyHr, vehicleIdFromPath, vehicleListingPath } from "../src/lib/seo";
import { BrandSelect } from "../src/components/BrandSelect";
import { matchesModelSearch } from "../src/lib/model-search";
import { FaqAccordion } from "./faq-accordion";
import { DealershipDirectoryView } from "./autokuce-directory";
import { DEALERSHIP_DIRECTORY } from "../src/data/dealerships";
import { restoreListingPhotos, cities, euro, fuelLabel, fuels, gears, number, quick, vehicles, type Flag, type Vehicle } from "./catalog";
import { bodyFilters, doorOptions, seatOptions, colorFinishes, cylinderCounts, distances, initialSearch, matchVehicles, normalizeSearchUrl, parseVehicleQuery, prices, readSearch, searchFilterCount, sorts, validEquipmentFilters, writeSearch, years, type Search } from "./search";
import { equipmentFor } from "../src/data/equipment-catalog";
import { Dialog, ListingOptions, MakeEquipmentOptions, Select } from "./ui";
import { makeOptions } from "./make-equipment";
import { TaxCalculator } from "./buyer-tools";
import Detail from "./detail";
import PublishForm from "./publish";
import { ValuationPage } from "./valuation-page";
import { describeFamily, modelFor, modelsFor } from "../src/data/car-catalog";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../src/lib/supabase/client";
import { safeAuthNext } from "../src/lib/auth-next";
import { getSiteOrigin } from "../src/lib/site-origin";

import { AccountPage, AuthPage, type AccountTabKey } from "./account";
import { api, type Account, type ListingStatus, type OwnedListing } from "./account-api";
import { CookieConsent, LegalPage, ReportDialog, legalLinks, type LegalPath } from "./legal";
import { dealershipHoursToday } from "../src/data/working-hours";
import { croatianCounties } from "../src/data/croatia-locations";
import { EquipmentSelector } from "./equipment-selector";
import { B2B_FOUNDER_OFFER, B2B_PACKAGES, getTopFeaturedListings } from "./listing-boost";

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

function vehicleIdentity(vehicle: Vehicle): string {
  return [vehicle.title.trim().toLowerCase(), vehicle.price, vehicle.km, vehicle.date].join("|");
}
const seedIdentities = new Set(vehicles.map(vehicleIdentity));

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
    <BrandSelect value={search.marka} onChange={make => update(updateVehicleIdentity(search, make))} />
    <BrandSelect label="Model" placeholder="Svi modeli" searchLabel="Pretraži modele" showLogo={false}
      options={models} match={(model, query) => matchesModelSearch(search.marka, model, query)}
      value={search.model} disabled={!models.length}
      onChange={model => update(updateVehicleIdentity(search, search.marka, model))} />
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

function VariantField({ search, update }: SearchEditorProps) {
  return <label className="field basic-variant">
    <span>Varijanta / Paket</span>
    <input type="search" maxLength={100} placeholder="npr. M-Sport, GTI, S-Line..." value={search.varijanta}
      onChange={event => update({ ...search, varijanta: event.target.value })} />
  </label>;
}

function BodyTypeFilter({ search, update, compact = false }: SearchEditorProps & { compact?: boolean }) {
  return <fieldset>
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
  </fieldset>;
}

function SeatDoorFilters({ search, update }: SearchEditorProps) {
  return <div className="seat-door-row">
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
  </div>;
}

function PriceRangeFilter({ search, update }: SearchEditorProps) {
  function priceField(key: "cijenaOd" | "cijena", label: string) {
    const selected = Number(search[key]);
    const options = selected && !prices.includes(selected) ? [...prices, selected].sort((a, b) => a - b) : prices;
    return <Select label={label} aria-label={key === "cijenaOd" ? "Cijena od" : "Cijena do"} className="numeric-select"
      value={search[key]} onChange={event => update(updateRange(search, key, event.target.value))}>
      <option value="">Bez limita</option>
      {options.map(price => <option key={price} value={price}>{euro(price)}</option>)}
    </Select>;
  }
  return <fieldset>
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
  </fieldset>;
}

function BasicFilters({ search, update }: SearchEditorProps) {
  return <section className="basic-filters split-fields" aria-label="Osnovni podaci">
    <h3>Osnovni podaci</h3>
    <div className="basic-identity">
      <VehicleIdentityFields search={search} update={update} />
      <VariantField search={search} update={update} />
    </div>
    <BodyTypeFilter search={search} update={update} />
    <SeatDoorFilters search={search} update={update} />
    <PurchaseMode search={search} update={update} />
    <PriceRangeFilter search={search} update={update} />
  </section>;
}

function FilterGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="basic-filters split-fields filter-group" aria-labelledby={id}>
    <h3 id={id} className="filter-group-title">{title}</h3>
    {children}
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
  if (search.kategorija !== initialSearch.kategorija) add("kategorija", categories.find(category => category.id === search.kategorija)?.label ?? search.kategorija, { ...search, kategorija: initialSearch.kategorija });
  const textual = ["varijanta", "gorivo", "mjenjac", "grad", "zavrsnica", "upit"] as const;
  for (const key of textual) {
    if (search[key].trim()) add(key, key === "gorivo" ? fuelLabel(search[key]) : search[key], { ...search, [key]: "" });
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
  const collectionLabels = { prilike: "Prilike ispod cijene", "sport-paketi": "Sportski paketi", "suv-obiteljski": "SUV i obiteljski", novo: "Novo u ponudi", danas: "Novo danas", autokuce: "Autokuće" };
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
    { key: "gorivo", title: "Gorivo", all: "Sva goriva", values: fuels, format: value => fuelLabel(String(value)) },
    { key: "mjenjac", title: "Mjenjač", all: "Svi mjenjači", values: gears },
    { key: "grad", title: "Županija", all: "Sve županije", values: croatianCounties },
  ];
  const groupId = useId();
  function renderField({ key, title, all, values, format, numeric }: FilterField) {
    const current = numeric ? Number(search[key]) : search[key];
    const options = current && !values.includes(current) ? [current, ...values] : values;
    return <Select key={key} label={title} className={numeric ? "numeric-select" : ""} value={search[key]} onChange={event => update({ ...search, [key]: event.target.value })}>
      <option value="">{all}</option>
      {key === "grad" ? <>
        <optgroup label="Županije">{croatianCounties.map(county => <option key={county} value={county}>{county}</option>)}</optgroup>
        <optgroup label="Gradovi">{cities.map(city => <option key={city} value={city}>{city}</option>)}</optgroup>
      </> : options.map(value => <option key={value} value={value}>{format ? format(value) : value}</option>)}
    </Select>;
  }
  const field = (key: FilterKey) => renderField(fields.find(item => item.key === key)!);
  return <form className="filter-form" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="filter-body">
      <FilterGroup id={groupId + "-osnovno"} title="Osnovni podaci">
        <div className="basic-identity">
          <VehicleIdentityFields search={search} update={update} />
          <VariantField search={search} update={update} />
        </div>
        <div className="search-fields">
          <Select label="Kategorija" value={search.kategorija} onChange={event => update({ ...search, kategorija: event.target.value as CategoryId })}>
            {categories.map(cat => <option key={cat.id || "all"} value={cat.id}>{cat.label}</option>)}
          </Select>
          <GenerationFilter search={search} update={update} />
          {field("grad")}
        </div>
      </FilterGroup>
      <FilterGroup id={groupId + "-cijena"} title="Cijena i godište">
        <PriceRangeFilter search={search} update={update} />
        <div className="search-fields">
          {field("godiste")}
          {field("km")}
        </div>
        <PurchaseMode search={search} update={update} />
      </FilterGroup>
      <FilterGroup id={groupId + "-pogon"} title="Pogon i karoserija">
        <div className="search-fields">
          {field("gorivo")}
          {field("mjenjac")}
          <EngineFilters search={search} update={update} />
        </div>
        <BodyTypeFilter search={search} update={update} compact={compact} />
        <SeatDoorFilters search={search} update={update} />
      </FilterGroup>
      <MakeEquipmentOptions make={search.marka} model={search.model} selected={search.oprema.filter(id => typeof id === "string" && !id.startsWith("eq:"))} onChange={oprema => update({ ...search, oprema: [...search.oprema.filter(id => typeof id === "string" && id.startsWith("eq:")), ...oprema] })}/>
      {search.marka && <EquipmentSelector filter key={search.marka + search.model} vehicle={{
        make:search.marka, model:search.model, generation:search.generacija, catalogEquipment:search.oprema,
      }} onChange={oprema => update({...search,oprema:[...search.oprema.filter(id => typeof id === "string" && !id.startsWith("eq:")), ...oprema.filter(id => typeof id === "string" && id.startsWith("eq:"))]})}/>}
      <ListingOptions selected={search.opcije} onChange={opcije => update({ ...search, opcije })} />
    </div>
    <ActiveFilters search={search} update={update} />
    <div className="search-actions">
      <button className="btn primary search-submit" type="submit">Prikaži <span className="tabular">{count}</span> {count === 1 ? "vozilo" : "vozila"}</button>
    </div>
  </form>;
}

const vehicleCategoryIcons = { automobili: Car, gospodarska: Truck, motocikli: Bike };
const vehicleRail = categories.map(category => ({ ...category, icon: vehicleCategoryIcons[category.id] }));

const queryExamples = [
  "BMW 320d M-Sport automatik do 25.000 €",
  "Škoda Octavia dizel do 100.000 km",
  "Audi A4 S-line s potvrđenim km (CVH)",
  "Volkswagen Golf 8 GTD do 24.000 €",
];

/** Croatian count noun: 1 oglas, 2–4 oglasa, 5+ oglasa (11–14 use the plural form). */
function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function HeroSearch({ search, count, totalCount, activeCount, update, onSubmit, onQuery }: {
  search: Search;
  count: number;
  totalCount: number;
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
  const selectedRail = search.kategorija;
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
    <section id="hero-search" className="marketplace-home hero-search" aria-labelledby="hero-title">
      <div className="px-3 pt-2 md:px-6 md:pt-3">
        <div className="relative mx-auto h-[185px] max-w-7xl overflow-hidden rounded-lg bg-[#0D0F12] md:h-[380px] lg:h-[420px]">
          <NextImage src="/images/hero-autoplac.webp" alt="" fill priority sizes="(min-width: 1280px) 1280px, 100vw"
            className="object-cover object-[76%_64%] md:object-[74%_66%]" />
          <div className="absolute inset-0 bg-linear-to-r from-[#0D0F12]/80 via-[#0D0F12]/25 to-transparent" aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex max-w-[78%] flex-col justify-start px-4 pt-6 md:max-w-3xl md:px-10 md:pt-10 lg:px-12 lg:pt-14">
            <h1 id="hero-title" className="text-[22px] font-bold leading-[1.1] tracking-tight text-white md:text-3xl lg:text-[38px]">Pronađi pravi auto.</h1>
            <p className="mt-1.5 max-w-2xl text-xs font-normal text-slate-200/95 md:mt-2 md:text-sm lg:text-base">
              <span className="md:hidden"><span className="tabular-nums">{number(totalCount)}</span> {plural(totalCount, "vozilo", "vozila", "vozila")} u Hrvatskoj</span>
              <span className="hidden md:inline"><span className="tabular-nums">{number(totalCount)}</span> {plural(totalCount, "oglas", "oglasi", "oglasi")} autokuća i privatnih prodavača u Hrvatskoj · ogledni podaci.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 md:px-6">
        <div className="hero-panel relative z-10 mx-auto -mt-8 max-w-6xl rounded-lg bg-[#151821] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.08] md:-mt-10 md:p-6">
          <form className="flex rounded-md border border-white/[0.10] focus-within:border-[#2563EB]" role="search" aria-label="Pretraga prema opisu vozila" onSubmit={event => {
            event.preventDefault();
            if (query.trim()) onQuery(parseVehicleQuery(query, search));
          }}>
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Opišite vozilo koje tražite</span>
              <SearchIcon size={16} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" enterKeyHint="search" maxLength={200} value={query} required
                className="hero-search-input no-inner-focus h-11 w-full rounded-l-md rounded-r-none border-0 bg-[#0D0F12] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 md:h-10"
                placeholder={focused ? "Opišite vozilo koje tražite" : "Npr. " + placeholder}
                onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            </label>
            <button type="submit" aria-label="Pretraži opis vozila" className="grid h-11 w-11 flex-none place-items-center rounded-r-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] md:h-10">
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </form>

          <form id="search-console" className="search-console" aria-label="Filtri vozila" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
            <div className="mt-3 flex overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] md:mt-4" role="group" aria-label="Kategorija vozila">
              {vehicleRail.map(({ id, label, icon: Icon }) => {
                const active = selectedRail === id;
                return <button type="button" key={id} aria-pressed={active} onClick={() => update({ ...search, kategorija: id })}
                  className={"-mb-px inline-flex min-h-11 flex-none items-center gap-2 whitespace-nowrap border-b-2 px-2.5 text-[13px] md:px-4 " + (active ? "border-[#2563EB] font-semibold text-white" : "border-transparent font-medium text-slate-400 hover:text-white")}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="hidden sm:block" />
                  {label}
                </button>;
              })}
            </div>

            <div className="mt-4 console-grid">
              <VehicleIdentityFields search={search} update={update} />
              <div className="console-primary-extra">{numericField("cijena", "Cijena do (€)", "Bez limita", prices, euro)}</div>
              <div id="console-secondary" className={"console-secondary-fields" + (more ? " is-open" : "")}>
                {numericField("godiste", "Godište od", "Sva godišta", years, String)}
                {numericField("km", "Kilometraža do", "Bez limita", distances, value => number(value) + " km")}
                <PurchaseMode search={search} update={update} />
                <div className="console-location">
                  <Select label="Županija / Grad" value={search.grad} onChange={event => update({ ...search, grad: event.target.value })}>
                    <option value="">Sve županije</option>
                    <optgroup label="Županije">{croatianCounties.map(county => <option key={county}>{county}</option>)}</optgroup>
                    <optgroup label="Gradovi">{cities.map(city => <option key={city}>{city}</option>)}</optgroup>
                  </Select>
                  <Navigation size={15} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <label className="console-check console-mobile-cvh">
                  <Checkbox checked={search.opcije.includes("cvh")} onChange={event => update(toggleSearchFlag(search, "cvh", event.target.checked))} />
                  Samo s potvrđenim km (CVH)
                </label>
              </div>
            </div>

            {more && <div id="console-extra" className="console-extra">
              <BasicFilters search={search} update={update} />
              <div className="console-grid split-fields filter-details">
                <GenerationFilter search={search} update={update} />
                <Select label="Gorivo" value={search.gorivo} onChange={event => update({ ...search, gorivo: event.target.value })}>
                  <option value="">Sva goriva</option>
                  {fuels.map(fuel => <option key={fuel} value={fuel}>{fuelLabel(fuel)}</option>)}
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

            <div className="mt-3 flex flex-col-reverse gap-1 md:mt-4 md:flex-row md:items-center md:justify-between md:gap-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 md:justify-start">
                <label className="console-check console-desktop-cvh">
                  <Checkbox checked={search.opcije.includes("cvh")} onChange={event => update(toggleSearchFlag(search, "cvh", event.target.checked))} />
                  Samo s potvrđenim km (CVH)
                </label>
                <div className="console-actions">
                  <button type="button" disabled={!activeCount && !query} onClick={() => {
                    setQuery("");
                    update({ ...initialSearch, sortiranje: search.sortiranje, prikaz: search.prikaz });
                  }}><RotateCcw size={16} aria-hidden="true" /> Poništi filtere</button>
                  <button type="button" className="console-more-toggle" aria-expanded={more} aria-controls="console-secondary console-extra" onClick={() => setMore(value => !value)}>
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    {more ? "Manje filtera" : "Više filtera"}
                  </button>
                </div>
              </div>
              <button type="submit" className="h-11 rounded-md bg-[#2563EB] px-6 text-sm font-semibold text-white tabular-nums hover:bg-[#1D4ED8] md:h-10 md:min-w-[220px]">
                Prikaži {number(count)} {plural(count, "oglas", "oglasa", "oglasa")}
              </button>
            </div>
          </form>
        </div>

        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 pb-1 pt-1 text-xs text-slate-500 md:pt-2 dark:text-slate-400" aria-label="Objava oglasa i alati za kupce">
          <div className="flex flex-wrap items-center gap-x-2">
            <a className="hero-utility-link" href="/predaj-oglas"><span className="home-utility-mobile">Predaja <span className="tabular-nums">0 €</span></span><span className="home-utility-desktop">Privatna predaja oglasa: <span className="tabular-nums">0 €</span></span></a>
            <span aria-hidden="true">·</span>
            <a className="hero-utility-link" href="/autokuce"><span className="home-utility-mobile">Autokuće: 6 mj. gratis</span><span className="home-utility-desktop">Za autokuće: 6 mj. gratis (prvih 50 salona)</span></a>
          </div>
          <div className="flex flex-wrap items-center gap-x-4">
            <a className="hero-utility-link" href="/ppmv-kalkulator"><span className="home-utility-mobile">PPMV →</span><span className="home-utility-desktop">PPMV kalkulator →</span></a>
            <a className="hero-utility-link" href="/procjena-cijene"><span className="home-utility-mobile">Procjena →</span><span className="home-utility-desktop">Procjena tržišne cijene →</span></a>
          </div>
        </nav>
      </div>
    </section>
  );
}

function PartnerStrip() {
  const affiliateUrl = process.env.NEXT_PUBLIC_CARVERTICAL_AFFILIATE_URL?.trim();
  return (
    <section className="partner-strip mx-auto max-w-7xl" aria-label="Objava oglasa i provjera povijesti vozila">
      <section className="partner-strip-cell" aria-labelledby="dealer-partner-title">
        <h2 id="dealer-partner-title">Za autokuće i privatne prodavatelje</h2>
        <p>Automatski uvoz lagera i A4 cjenik za staklo</p>
        <div className="partner-strip-actions">
          <a className="btn secondary" href="/autokuce">Za autokuće <ArrowRight size={15} aria-hidden="true" /></a>
          <a className="btn quiet" href="/predaj-oglas">Predaj oglas · 0 €</a>
        </div>
      </section>
      <section className="partner-strip-cell" aria-labelledby="vin-partner-title">
        <div className="partner-strip-heading">
          <h2 id="vin-partner-title">
            <ShieldCheck size={19} aria-hidden="true" />
            <span className="partner-wordmark" role="img" aria-label="carVertical" />
          </h2>
          <p>Provjera povijesti vozila i kilometara</p>
        </div>
        <form className="partner-vin-form" action="https://www.carvertical.com/hr/precheck" method="get" target="_blank" rel="noopener noreferrer"
          onSubmit={event => {
            const vin = String(new FormData(event.currentTarget).get("vin")).toUpperCase();
            const url = new URL(affiliateUrl || event.currentTarget.action, event.currentTarget.action);
            url.searchParams.set("vin", vin);
            event.preventDefault();
            window.open(url.toString(), "_blank", "noopener,noreferrer");
          }}>
          <input type="text" name="vin" aria-label="Broj šasije (VIN)"
            placeholder="Unesite 17-znamenkasti broj šasije (VIN)..."
            title="Unesite 17 slova ili znamenki. Slova I, O i Q nisu dopuštena."
            autoComplete="off" autoCapitalize="characters" spellCheck={false}
            minLength={17} maxLength={17} pattern="[A-HJ-NPR-Za-hj-npr-z0-9]{17}" required />
          <button type="submit" className="btn primary">Provjeri povijest <ArrowRight size={15} aria-hidden="true" /></button>
        </form>
      </section>
    </section>
  );
}

function FeaturedListingsRail({
  vehicles: allList,
  now,
  savedIds,
  onOpen,
  onSave,
  onShowAll,
}: {
  vehicles: Vehicle[];
  now: number;
  savedIds: string[];
  onOpen: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onSave: (id: string) => void;
  onShowAll: () => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const featured = useMemo(() => getTopFeaturedListings(allList, now), [allList, now]);
  // When live inventory arrives the card order changes; scroll-snap would otherwise keep the
  // previously visible card in view and leave the first card cut off at the left edge.
  const featuredKey = featured.map(entry => entry.vehicle.id).join("|");
  useLayoutEffect(() => {
    if (railRef.current) railRef.current.scrollLeft = 0;
  }, [featuredKey]);

  function stepRail(direction: -1 | 1) {
    const rail = railRef.current;
    const first = rail?.children.item(0);
    const second = rail?.children.item(1);
    if (!rail || !(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;
    rail.scrollBy({
      left: direction * (second.offsetLeft - first.offsetLeft),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  if (!featured.length) return null;

  return (
    <section className="home-section home-section-first shell marketplace-home featured-section scroll-mt-20 mt-5" aria-labelledby="featured-title">
      <div className="home-section-head featured-heading">
        <div>
          <h2 id="featured-title">Istaknuta vozila</h2>
          <p>Provjerene ponude autokuća i privatnih prodavača</p>
        </div>
        <div className="featured-controls">
          {featured.length > 2 && <>
            <button type="button" aria-label="Prethodna ponuda" aria-controls="featured-rail" onClick={() => stepRail(-1)}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Sljedeća ponuda" aria-controls="featured-rail" onClick={() => stepRail(1)}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>}
          <a href="#svi-oglasi" className="text-link home-more-link" onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onShowAll();
          }}><span className="home-utility-mobile">Svi oglasi</span><span className="home-utility-desktop">Prikaži sve oglase</span> <span className="tabular">({number(allList.length)})</span> <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </div>
      <div id="featured-rail" ref={railRef} className="featured-rail">
        {featured.map(({ vehicle }, index) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} inRail now={now} saved={savedIds.includes(vehicle.id)}
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
    <section className="home-section shell scroll-mt-20" aria-labelledby="brands-title">
      <div className="home-section-head brand-rail-head">
        <h2 id="brands-title">Popularne marke</h2>
        <button type="button" className="brand-rail-all" aria-pressed={!selectedBrand} onClick={() => onSelectBrand("")}>
          Sve marke <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="brand-rail" role="group" aria-label="Filtriraj po marki" tabIndex={0}>
        {popularBrands.map(brand => {
          const active = selectedBrand === brand;
          return (
            <button key={brand} type="button" aria-pressed={active} className={"brand-rail-item" + (active ? " active" : "")}
              onClick={() => onSelectBrand(active ? "" : brand)}>
              <span className="brand-rail-pill">
                <BrandLogo make={brand} size="sm" className="brand-rail-emblem" />
                <span>{brand}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function scrollToTop() {
  window.scrollTo({ top:0,left:0,behavior:"instant" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function Marketplace({
  initialPath = "/",
  initialSearchOverride,
  initialDealerOnly = false,
  initialDetailId = null,
  initialVehicles = [],
  seoHeader,
  skipHero = false,
}: {
  initialPath?: string;
  initialSearchOverride?: Partial<Search>;
  initialDealerOnly?: boolean;
  initialDetailId?: string | null;
  initialVehicles?: Vehicle[];
  seoHeader?: ReactNode;
  skipHero?: boolean;
}) {
  const [search, setSearch] = useState<Search>(() => ({ ...initialSearch, ...initialSearchOverride }));
  const [saved, setSaved] = useState<string[]>([]);
  const [published, setPublished] = useState<Vehicle[]>([]);
  const [account,setAccount] = useState<Account | null>();
  const [remote,setRemote] = useState<Vehicle[]>(initialVehicles);
  const [visibleCount, setVisibleCount] = useState(24);
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
    const guestIds = readStored<unknown>(storageKeys.saved).filter(id => typeof id === "string");
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
  function navigate(target: string, replace = false, keepClient = false) {
    cancelResultScroll.current?.();
    const targetPath = new URL(target, location.origin).pathname;
    if (!keepClient && process.env.NEXT_PUBLIC_AUTOPLAC_STATIC_EXPORT !== "1" && targetPath !== location.pathname) {
      router[replace ? "replace" : "push"](target);
      return;
    }
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
      navigate("/prijava", false, true);
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
    const next = safeAuthNext(new URLSearchParams(location.search).get("next")) ?? "/racun";
    if (process.env.NEXT_PUBLIC_AUTOPLAC_STATIC_EXPORT === "1") navigate(next, true);
    else window.location.replace(next);
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
  const authExchangeStarted = useRef(false);
  const didMount = useRef(false);
  const router = useRouter();
  const [notice, setNotice] = useState("");


  // Skip programmatic scroll on first paint: on iOS it fights the native
  // rubber-band and leaves the hero headline tucked under the sticky header.
  useEffect(() => { didMount.current = true; }, []);

  // Confirmation emails may land on `/?code=...` (PKCE) or on any page with
  // `#access_token=...` (implicit flow). Handle both once, then go to /racun.
  useEffect(() => {
    if (authExchangeStarted.current || !isSupabaseConfigured) return;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = params.get("code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const isCode = Boolean(code && window.location.pathname === "/");
    if (!isCode && !(accessToken && refreshToken)) return;
    authExchangeStarted.current = true;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      try {
        const { error } = accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : await supabase.auth.exchangeCodeForSession(code!);
        if (!error) {
          await supabase.auth.getSession();
          try { await supabase.rpc("ensure_my_profile"); } catch { /* Profile sync is non-blocking. */ }
          window.history.replaceState(null, "", "/racun");
          window.location.replace(new URL("/racun", getSiteOrigin()).href);
          return;
        }
      } catch { /* Fall through to the standard callback. */ }
      window.history.replaceState(null, "", "/auth/callback?" + params.toString());
      window.location.replace(new URL("/auth/callback?" + params.toString(), getSiteOrigin()).href);
    })();
  }, []);

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
      setDealerRegistration(params.get("tip") === "dealer");
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
      if (!event) normalizeSearchUrl();
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
    // Seeded listings are already in the SSR snapshot. Skip DB rows that are the
    // same vehicle so the rendered count never jumps after hydration.
    for (const vehicle of [...remote, ...published, ...vehicles]) {
      if (vehicle !== undefined && seedIdentities.has(vehicleIdentity(vehicle)) && vehicle.id !== undefined
          && !vehicles.some(seed => seed.id === vehicle.id)) continue;
      if (!unique.has(vehicle.id)) unique.set(vehicle.id, vehicle);
    }
    return [...unique.values()];
  }, [remote, published]);
  const [boostClock, setBoostClock] = useState(0);
  useEffect(() => {
    const now = Date.now();
    if (!boostClock) setBoostClock(now);
    const expiry = allVehicles.reduce((next, vehicle) => {
      const end = vehicle.boostExpiresAt ? Date.parse(vehicle.boostExpiresAt) : (vehicle.boostedUntil ?? 0) * 1000;
      return end > boostClock && end < next ? end : next;
    }, Infinity);
    if (!Number.isFinite(expiry)) return;
    const timeout = window.setTimeout(() => setBoostClock(Date.now()), Math.max(0, Math.min(expiry - now, 2147483647)));
    return () => window.clearTimeout(timeout);
  }, [allVehicles, boostClock]);
  const savedIds = account ? account.favorites.map(item => item.id) : saved;
  const dealerProfile = dealerId && allVehicles.find(vehicle => vehicle.dealershipId === dealerId);
  const dealerMakes = dealerId ? [...new Set(allVehicles.filter(vehicle => vehicle.dealershipId === dealerId).map(vehicle => vehicle.make))] : [];
  const detail = allVehicles.find(vehicle => vehicle.id === detailId);
  const renderedDetail = detail?.id;
  useLayoutEffect(() => { if (didMount.current) scrollToTop(); }, [path]);
  useLayoutEffect(() => { if (didMount.current && detailId) scrollToTop(); }, [detailId, renderedDetail]);
  useEffect(() => {
    if (!didMount.current || !detailId) return;
    const frame = requestAnimationFrame(scrollToTop);
    return () => cancelAnimationFrame(frame);
  }, [detailId, renderedDetail]);
  function openListing(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    cancelResultScroll.current?.();
    if (!detailId) resultsScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    const target = new URL(vehicleListingPath(id), url.origin);
    if (process.env.NEXT_PUBLIC_AUTOPLAC_STATIC_EXPORT !== "1") {
      router.push(target.pathname);
      return;
    }
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
    if (process.env.NEXT_PUBLIC_AUTOPLAC_STATIC_EXPORT !== "1") { router.push("/#svi-oglasi"); return; }
    scrollToTop();
    const depth = Number(history.state?.autoplacDetailDepth ?? 0);
    if (depth > 0) {
      resetOnPop.current = true;
      history.go(-depth);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("oglas");
    if (typeof url.pathname === "string" && url.pathname.startsWith("/oglas/")) url.pathname = "/";
    history.replaceState(null, "", url);
    setPath("/");
    activeDetail.current = null;
    setDetailId(null);
    requestAnimationFrame(scrollToTop);
  }
  const goToResults = () => { if (detailId) backToResults(); };
  const inventory = useMemo(() => allVehicles.filter(v => (!savedOnly || savedIds.includes(v.id)) && (!dealerOnly || v.dealer) && (!dealerId || v.dealershipId === dealerId)), [allVehicles, savedIds, savedOnly, dealerOnly, dealerId]);
  const results = useMemo(() => matchVehicles(inventory, search, boostClock), [inventory, search, boostClock]);
  const savedCount = allVehicles.filter(v => savedIds.includes(v.id)).length;
  const activeCount = searchFilterCount(search);
  const update = (next: Search) => { setVisibleCount(24); setSearch(next); writeSearch(next); };
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
      navigate("/prijava?next=/predaj-oglas");
      return;
    }
    setEditing(listing);setPanel("publish");
  }
  async function publish(vehicle: Vehicle, status: ListingStatus, requestBoost: boolean) {
    await api("listing/save",{vehicle,status});
    let message = status === "active" ? "Oglas je objavljen." : "Oglas je spremljen.";
    if (requestBoost && status === "active") {
      try {
        await api("listing/boost", { id: vehicle.id, tier: "top_7d" });
        message = "Oglas je objavljen i istaknut na 7 dana.";
      } catch {
        message = "Oglas je objavljen. Isticanje nije aktivirano. Pokušajte ponovno u Mojem računu.";
      }
    }
    try {
      await refresh();
    } catch {
      message += " Osvježite stranicu za prikaz najnovijeg statusa.";
    }
    setPanel(null);setEditing(undefined);setPublishAfterLogin(false);
    setNotice(message);
    if (path !== "/racun") navigate(status === "active" ? "/" : "/racun");
  }
  useEffect(() => {
    // /spremljeno is a dedicated saved-vehicles view backed by the same inventory.
    if (path === "/spremljeno") { setSavedOnly(true); setDealerOnly(false); }
  }, [path]);
  useEffect(() => {
    if (path === "/predaj-oglas") {
      if (account) {
        setEditing(undefined);
        setPanel("publish");
      } else if (account === null) {
        setPublishAfterLogin(true);
        navigate("/prijava?next=/predaj-oglas");
      }
    } else if (publishAfterLogin && account && path === "/racun") {
      setPublishAfterLogin(false);setEditing(undefined);setPanel("publish");
    }
  },[publishAfterLogin,account,path]);
  const legalPath = Object.hasOwn(legalLinks,path) ? path as LegalPath : undefined;
  const detailTitle = detailId ? allVehicles.find(vehicle => vehicle.id === detailId)?.title : undefined;
  useEffect(() => {
    const titles: Record<string, string> = {
      "/autokuce": "Provjerene autokuće i saloni rabljenih vozila u Hrvatskoj",
      "/ppmv-kalkulator": "PPMV Kalkulator 2026 — Izračun trošarine za uvoz auta iz Njemačke i EU",
      "/procjena-cijene": "Besplatna procjena tržišne cijene rabljenog vozila u RH",
      "/racun": "Moj račun", "/prijava": "Prijava na račun", "/registracija": "Registracija računa",
      "/predaj-oglas": "Predaj oglas za vozilo (0 €)", "/spremljeno": "Spremljena vozila",
    };
    const dealer = path.startsWith("/autokuce/") ? DEALERSHIP_DIRECTORY.find(item => item.slug === decodeURIComponent(path.slice(10)))?.name : undefined;
    const page = detailTitle ?? dealer ?? titles[path];
    document.title = page ? page + " | AUTOPLAC.HR" : "AUTOPLAC.HR — Rabljena vozila i provjera cijena u Hrvatskoj";
  }, [path, detailTitle]);
  const filters = <FilterControls search={search} count={results.length} update={update} apply={apply}/>;
  const isDealershipPath = typeof path === "string" && path.startsWith("/autokuce/");
  const activeHeaderRoute = isDealershipPath ? "/autokuce"
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
      path === "/autokuce" || isDealershipPath ? (
        <DealershipDirectoryView
          vehicles={allVehicles}
          selectedSlug={isDealershipPath ? decodeURIComponent(path.slice("/autokuce/".length)) : null}
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
              <span className="eyebrow">Prema tablicama Carinske uprave</span>
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
          <FaqAccordion title="Česta pitanja o uvozu vozila i PPMV-u" />
        </main>
      ) :
      path === "/racun" ? account ? <AccountPage key={account.id} account={account} inventory={allVehicles} refresh={refresh} onPublish={startPublish} signOut={() => void signOut()} openPrivacySettings={() => setCookieSettings(true)} onOpenListing={id => navigate(vehicleListingPath(id))} initialTab={accountTab} initialConversationId={accountConvId}/> :
        <main className="shell account-shell"><div className="empty-state"><h1>{account === undefined && !accountError ? "Učitavanje računa…" : accountError || "Prijavite se za pristup računu"}</h1><a className="btn primary" href={"/prijava?next=" + encodeURIComponent(typeof location === "undefined" ? "/racun" : location.pathname + location.search)}>Prijava</a></div></main> :
      path === "/prijava" || path === "/registracija" ? <AuthPage key={path + (path === "/registracija" ? ":" + (dealerRegistration ? "dealer" : "private") : "")} registration={path === "/registracija"} defaultType={dealerRegistration ? "dealer" : "private"} onDone={signedIn}/> :
      detailId ? detail ? <Detail key={detail.id} vehicle={detail} inventory={allVehicles}
      sellerTools={account?.listings.some(item => item.id === detail.id) ? { phone: account.profile.phone } : undefined}
      saved={savedIds.includes(detail.id)} onSave={() => toggleSaved(detail.id)} savedIds={savedIds} onSaveVehicle={id => void toggleSaved(id)} onBack={backToResults}
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
            totalCount={allVehicles.length}
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
          <FeaturedListingsRail
            vehicles={allVehicles}
            now={boostClock}
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
          <PartnerStrip />
        </>
      )}
      <main id="svi-oglasi" className="shell market">
        <div className="hidden lg:block min-w-0 self-stretch">
          <aside className="filter-sidebar" aria-labelledby="filter-title">
            <h2 id="filter-title">Filteri</h2>
            <FilterControls search={search} count={results.length} update={update} apply={apply} compact />
          </aside>
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
            <button type="button" className="btn quiet mobile-nav-action" aria-pressed={path === "/autokuce" || isDealershipPath} onClick={() => navigate("/autokuce")}>Autokuće</button>
          </div>
          {path === "/rabljena-vozila" && <form className="catalog-text-search" role="search" aria-label="Pretraži rabljena vozila" onSubmit={event => {
            event.preventDefault();
            const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
            update(parseVehicleQuery(query, search));
            scrollResults();
          }}>
            <input type="search" name="query" maxLength={200} aria-label="Upišite marku, model, grad ili opremu"
              placeholder="Marka, model, grad ili oprema" defaultValue={search.upit} />
            <button type="submit" className="btn primary"><SearchIcon size={16} aria-hidden="true" /> Pretraži</button>
          </form>}
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
          {results.length ? <div className={"listings " + (search.prikaz === "lista" ? "list-view" : "grid-view")}>{results.slice(0, visibleCount).map((vehicle, index) => (
            <Fragment key={vehicle.id}>
              <VehicleCard vehicle={vehicle} saved={savedIds.includes(vehicle.id)} eager={false}
                horizontal={search.prikaz === "lista"} onOpen={event => openListing(event, vehicle.id)} onSave={() => toggleSaved(vehicle.id)} />
            </Fragment>
          ))}</div> : <div className="empty-state"><h2>{savedOnly && !savedCount ? "Nemate spremljenih vozila" : "Nema vozila za odabrane filtre"}</h2><button type="button" className="btn secondary" onClick={() => { if (savedOnly && !savedCount) setSavedOnly(false); update({ ...initialSearch, prikaz: search.prikaz }); }}>{savedOnly && !savedCount ? "Pogledaj ponudu" : "Poništi filtere"}</button></div>}
          {results.length > visibleCount && <button className="btn secondary mt-3 min-h-11" type="button" onClick={() => setVisibleCount(count => count + 24)}>
            Prikaži još vozila
          </button>}
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
                <a key={city.slug} href={`/grad/${city.slug}`} className="footer-link">
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
            <p>Orahovica, Hrvatska</p>
          </section>

          <section className="footer-col" aria-label="Vodiči za kupce">
            <h3 className="footer-heading">Za kupce</h3>
            {categories.map(category => <a key={category.id} className="footer-link" href={`/rabljena-vozila?kategorija=${category.id}#svi-oglasi`}>{category.label}</a>)}
            <a className="footer-link" href="/procjena-cijene">Procjena tržišne cijene vozila</a>
            <a className="footer-link" href="/ppmv-kalkulator">PPMV kalkulator 2026</a>
            <a className="footer-link" href="/autokuce">Verificirane autokuće</a>
            <a className="footer-link" href="/rabljena-vozila/bmw">Rabljena vozila po markama</a>
            <a className="footer-link" href="/grad/zagreb">Rabljena vozila po gradovima</a>
          </section>

          <section className="footer-col" aria-label="B2B povelja za autokuće">
            <h3 className="footer-heading">Za autokuće · B2B povelja</h3>
            <p className="text-[12px] text-[var(--muted)] !m-0">{B2B_FOUNDER_OFFER} · Povelja za autokuće bez skrivenih naknada.</p>
            <ul className="footer-pricing">
              {B2B_PACKAGES.map(plan => <li key={plan.id}><span>{plan.name}</span><strong className="tabular-nums">{plan.priceEur} €/mj.</strong></li>)}
            </ul>
            <a className="footer-link" href="/registracija?tip=dealer">Registriraj autokuću →</a>
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
          <span className="font-extrabold tracking-tight text-[var(--text)]">AUTOPLAC<span className="text-[#2563EB]">.HR</span></span>
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
