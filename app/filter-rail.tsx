"use client";

import { ChevronDown, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { BrandLogo } from "../src/components/BrandLogo";
import { modelsFor } from "../src/data/car-catalog";
import { euro, fuelLabel, fuels, gears, number, type Vehicle } from "./catalog";
import { initialSearch, matchVehicles, validEquipmentFilters, years, type Search } from "./search";
import { vehicleCategory } from "./vehicle-category";

export type UpdateSearch = (next: Search, replace?: boolean) => void;

const BUCKETS = 26;
const PRICE_STEP = 500;
const KM_MAX = 300_000;
const KM_STEP = 10_000;

/** Body pills (DESIGN.md §4.2). Ids map to `bodyFilters` in app/search.ts. */
const bodyPills = [
  { id: "limuzina", label: "Limuzina" },
  { id: "suv", label: "SUV" },
  { id: "karavan", label: "Karavan" },
  { id: "sportski", label: "Coupé" },
  { id: "gradski", label: "Gradski" },
  { id: "kombi", label: "Kombi" },
] as const satisfies readonly { id: Search["karoserija"][number]; label: string }[];

const labelClass = "text-[10px] font-bold uppercase tracking-[0.08em] text-(--ap-mute)";
const clearClass = "ap-press rounded text-[12px] font-medium text-(--ap-text-2) hover:text-(--ap-ink) disabled:opacity-40 disabled:hover:text-(--ap-text-2)";
const fieldClass = "h-9 w-full rounded-[10px] border-0 bg-(--ap-fill) px-3 text-[13px] text-(--ap-ink) outline-none focus-visible:ring-2 focus-visible:ring-(--ap-focus)/40";

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
const compactKm = (value: number) => value / 1000 + "k km";

function Section({ title, action, children, first = false }: { title: string; action?: ReactNode; children: ReactNode; first?: boolean }) {
  return <section className={first ? "mt-5" : "mt-5 border-t border-(--ap-divider) pt-5"}>
    <div className="mb-2.5 flex min-h-5 items-center justify-between gap-2">
      <h3 className={labelClass}>{title}</h3>
      {action}
    </div>
    {children}
  </section>;
}

/** Pointer + keyboard range slider with one or two thumbs. Thumbs are 16 px, inset 8 px. */
function RangeSlider({ min, max, step, values, onChange, labels, formatValue }: {
  min: number; max: number; step: number; values: number[];
  onChange: (values: number[]) => void; labels: string[]; formatValue: (value: number) => string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<(HTMLSpanElement | null)[]>([]);
  const dragging = useRef<number | null>(null);
  const span = Math.max(step, max - min);
  const pct = (value: number) => (clamp(value, min, max) - min) / span;

  function valueAt(clientX: number) {
    const rect = track.current!.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left - 8) / Math.max(1, rect.width - 16), 0, 1);
    return clamp(Math.round((min + ratio * span) / step) * step, min, max);
  }
  function set(index: number, raw: number) {
    const next = [...values];
    const low = index > 0 ? values[index - 1] + step : min;
    const high = index < values.length - 1 ? values[index + 1] - step : max;
    next[index] = clamp(raw, low, Math.max(low, high));
    if (next[index] !== values[index]) onChange(next);
  }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const value = valueAt(event.clientX);
    let index = 0;
    if (values.length === 2) {
      const [a, b] = values;
      const da = Math.abs(value - a), db = Math.abs(value - b);
      index = da < db ? 0 : da > db ? 1 : value < a ? 0 : 1;
    }
    dragging.current = index;
    event.currentTarget.setPointerCapture(event.pointerId);
    thumbs.current[index]?.focus({ preventScroll: true });
    set(index, value);
    event.preventDefault();
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current !== null) set(dragging.current, valueAt(event.clientX));
  }
  function stop() { dragging.current = null; }
  function onKeyDown(index: number, event: KeyboardEvent<HTMLSpanElement>) {
    const big = step * 10;
    const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -big, PageUp: big }[event.key];
    if (delta !== undefined) set(index, values[index] + delta);
    else if (event.key === "Home") set(index, min);
    else if (event.key === "End") set(index, max);
    else return;
    event.preventDefault();
  }
  const left = values.length === 2 ? pct(values[0]) : 0;
  const right = pct(values[values.length - 1]);
  const position = (ratio: number) => `calc(8px + (100% - 16px) * ${ratio})`;

  return <div ref={track} className="ap-slider relative h-5 touch-none select-none" onPointerDown={onPointerDown}
    onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
    <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-(--ap-track)" />
    <span aria-hidden="true" className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-(--ap-ink)"
      style={{ left: position(left), width: `calc((100% - 16px) * ${Math.max(0, right - left)})` }} />
    {values.map((value, index) => <span key={index} ref={node => { thumbs.current[index] = node; }}
      role="slider" tabIndex={0} aria-label={labels[index]} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      aria-valuetext={formatValue(value)} onKeyDown={event => onKeyDown(index, event)}
      className="ap-thumb absolute top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--ap-ink) bg-(--ap-card) outline-none focus-visible:ring-4 focus-visible:ring-(--ap-focus)/30"
      style={{ left: position(pct(value)), zIndex: dragging.current === index ? 3 : 2 }} />)}
  </div>;
}

/** Live price histogram (26 buckets) with a flush dual-thumb slider and OD/DO boxes. */
function PriceFilter({ search, update, domainPool, pool }: {
  search: Search; update: UpdateSearch; domainPool: Vehicle[]; pool: Vehicle[];
}) {
  const { lo, hi, overflow } = useMemo(() => {
    const sorted = domainPool.map(vehicle => vehicle.price).filter(price => price > 0).sort((a, b) => a - b);
    if (!sorted.length) return { lo: 0, hi: 50_000, overflow: false };
    const top = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.98))];
    const low = Math.floor(sorted[0] / 1000) * 1000;
    const high = Math.max(low + 26 * PRICE_STEP, Math.ceil(top / 1000) * 1000);
    return { lo: low, hi: high, overflow: sorted[sorted.length - 1] > high };
  }, [domainPool]);
  const width = (hi - lo) / BUCKETS;
  const counts = useMemo(() => {
    const result = Array<number>(BUCKETS).fill(0);
    for (const vehicle of pool) {
      if (!(vehicle.price > 0)) continue;
      result[clamp(Math.floor((vehicle.price - lo) / width), 0, BUCKETS - 1)]++;
    }
    return result;
  }, [pool, lo, width]);
  const peak = Math.max(1, ...counts);
  const from = search.cijenaOd ? clamp(Number(search.cijenaOd), lo, hi - PRICE_STEP) : lo;
  const to = search.cijena ? clamp(Number(search.cijena), from + PRICE_STEP, hi) : hi;
  const active = Boolean(search.cijenaOd || search.cijena);

  function commit([low, high]: number[], replace = true) {
    update({ ...search, cijenaOd: low <= lo ? "" : String(low), cijena: high >= hi ? "" : String(high) }, replace);
  }
  const maxLabel = euro(hi) + (overflow ? "+" : "");

  return <Section title="Cijena" action={<button type="button" className={clearClass} disabled={!active}
    onClick={() => update({ ...search, cijenaOd: "", cijena: "" })}>Očisti</button>}>
    <div className="flex h-11 items-end gap-[2px] px-2" aria-hidden="true">
      {counts.map((count, index) => {
        const start = lo + index * width, end = start + width;
        const inside = end > from && start < to;
        return <button type="button" tabIndex={-1} key={index}
          title={`${count} · ${euro(Math.round(start))} – ${euro(Math.round(end))}`}
          onClick={() => commit([Math.floor(start / PRICE_STEP) * PRICE_STEP, Math.ceil(end / PRICE_STEP) * PRICE_STEP], false)}
          className={"min-w-0 flex-1 cursor-pointer rounded-t-[2px] " + (inside ? "bg-(--ap-ink)" : "bg-(--ap-track)")}
          style={{ height: count ? `${Math.max(12, (count / peak) * 100)}%` : "2px" }} />;
      })}
    </div>
    <div className="-mt-2.5">
      <RangeSlider min={lo} max={hi} step={PRICE_STEP} values={[from, to]} onChange={values => commit(values)}
        labels={["Cijena od", "Cijena do"]} formatValue={value => value >= hi ? maxLabel : euro(value)} />
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <PriceBox label="Od" value={from} placeholder={euro(lo)} empty={!search.cijenaOd}
        onCommit={value => commit([value === null ? lo : clamp(value, lo, to - PRICE_STEP), to], false)} />
      <PriceBox label="Do" value={to} placeholder={maxLabel} empty={!search.cijena}
        onCommit={value => commit([from, value === null ? hi : clamp(value, from + PRICE_STEP, hi)], false)} />
    </div>
  </Section>;
}

function PriceBox({ label, value, placeholder, empty, onCommit }: {
  label: string; value: number; placeholder: string; empty: boolean; onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  function commit() {
    if (draft === null) return;
    const digits = draft.replace(/\D/g, "");
    setDraft(null);
    onCommit(digits ? Number(digits) : null);
  }
  return <label htmlFor={id} className="flex h-9 min-w-0 items-center gap-1.5 rounded-[10px] bg-(--ap-fill) px-2.5 focus-within:ring-2 focus-within:ring-(--ap-focus)/40">
    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--ap-faint)">{label}</span>
    <input id={id} inputMode="numeric" autoComplete="off" maxLength={9}
      aria-label={label === "Od" ? "Cijena od (€)" : "Cijena do (€)"}
      className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-[12.5px] font-bold text-(--ap-ink) outline-none tabular-nums placeholder:font-bold placeholder:text-(--ap-ink)"
      value={draft ?? (empty ? "" : euro(value))} placeholder={placeholder}
      onFocus={event => { setDraft(empty ? "" : String(value)); requestAnimationFrame(() => event.target.select()); }}
      onChange={event => setDraft(event.target.value)} onBlur={commit}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(); event.currentTarget.blur(); } }} />
  </label>;
}

function Switch({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return <div className="flex items-center justify-between gap-3">
    <label htmlFor={id} className="min-w-0 cursor-pointer">
      <span className="block text-[13px] font-semibold text-(--ap-ink)">{label}</span>
      <span className="block text-[11px] text-(--ap-faint)">{hint}</span>
    </label>
    <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={"ap-switch relative h-5 w-9 flex-none rounded-full " + (checked ? "bg-(--ap-ink)" : "bg-(--ap-track)")}>
      <span aria-hidden="true" className={"ap-switch-knob absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(16,24,40,0.2)] " + (checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  </div>;
}

function MoreFilters({ search, update, brand, onAdvanced }: { search: Search; update: UpdateSearch; brand: string; onAdvanced?: () => void }) {
  const [open, setOpen] = useState(Boolean(search.godiste || search.gorivo || search.mjenjac || search.model));
  const models = brand ? modelsFor(brand, false) : [];
  const select = "ap-select " + fieldClass + " appearance-none pr-8";
  const panel = useId();
  return <section className="mt-5 border-t border-(--ap-divider) pt-4">
    <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(value => !value)}
      className="ap-press flex w-full items-center justify-between text-[13px] font-semibold text-(--ap-ink)">
      Više filtera
      <ChevronDown size={16} aria-hidden="true" className={"ap-chevron " + (open ? "rotate-180" : "")} />
    </button>
    {open && <div id={panel} className="mt-3 grid gap-2.5">
      {brand && models.length > 0 && <label className="grid gap-1">
        <span className={labelClass}>Model · {brand}</span>
        <span className="relative">
          <select className={select} value={search.marka === brand ? search.model : ""} onChange={event => update({
            ...search, marka: brand, marke: search.marke.filter(item => item !== brand), model: event.target.value, generacija: "",
            oprema: validEquipmentFilters(brand, event.target.value, "", search.oprema),
          })}>
            <option value="">Svi modeli</option>
            {models.map(model => <option key={model} value={model}>{model}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--ap-faint)" />
        </span>
      </label>}
      {([
        ["godiste", "Godište od", "Sva godišta", years.map(year => [String(year), String(year)])],
        ["gorivo", "Gorivo", "Sva goriva", fuels.map(fuel => [fuel, fuelLabel(fuel)])],
        ["mjenjac", "Mjenjač", "Svi mjenjači", gears.map(gear => [gear, gear])],
      ] as const).map(([key, title, all, options]) => <label key={key} className="grid gap-1">
        <span className={labelClass}>{title}</span>
        <span className="relative">
          <select className={select + (key === "godiste" ? " tabular-nums" : "")} value={search[key]}
            onChange={event => update({ ...search, [key]: event.target.value })}>
            <option value="">{all}</option>
            {search[key] && !options.some(([value]) => value === search[key]) && <option value={search[key]}>{search[key]}</option>}
            {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--ap-faint)" />
        </span>
      </label>)}
      {onAdvanced && <button type="button" onClick={onAdvanced}
        className="ap-press mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-(--ap-fill) text-[12.5px] font-semibold text-(--ap-ink) hover:bg-(--ap-fill-hover)">
        <SlidersHorizontal size={14} aria-hidden="true" /> Svi filtri (oprema, sjedala, vrata…)
      </button>}
    </div>}
  </section>;
}

/** Brand checklist: badge, name, live count, checkbox. Multi-select via `marke[]`. */
function BrandFilter({ search, update, domainPool, pool }: { search: Search; update: UpdateSearch; domainPool: Vehicle[]; pool: Vehicle[] }) {
  const [all, setAll] = useState(false);
  const selected = new Set([...search.marke, ...(search.marka ? [search.marka] : [])]);
  const brands = useMemo(() => {
    // Order by total stock so rows stay put while filtering; counts reflect the live filters.
    const totals = new Map<string, number>();
    for (const vehicle of domainPool) totals.set(vehicle.make, (totals.get(vehicle.make) ?? 0) + 1);
    const counts = new Map<string, number>([...totals.keys()].map(make => [make, 0]));
    for (const vehicle of pool) counts.set(vehicle.make, (counts.get(vehicle.make) ?? 0) + 1);
    return [...counts].sort((a, b) => (totals.get(b[0]) ?? 0) - (totals.get(a[0]) ?? 0) || a[0].localeCompare(b[0], "hr"));
  }, [domainPool, pool]);
  for (const make of selected) if (!brands.some(([name]) => name === make)) brands.unshift([make, 0]);
  const visible = all ? brands : brands.filter(([name], index) => index < 6 || selected.has(name));

  function toggle(make: string, checked: boolean) {
    if (!checked && search.marka === make) {
      update({ ...search, marka: "", model: "", generacija: "", marke: search.marke.filter(item => item !== make),
        oprema: validEquipmentFilters("", "", "", search.oprema) });
      return;
    }
    update({ ...search, marke: checked ? [...new Set([...search.marke, make])] : search.marke.filter(item => item !== make) });
  }

  return <Section title="Marka" action={<button type="button" className={clearClass} disabled={!selected.size}
    onClick={() => update({ ...search, marka: "", model: "", generacija: "", marke: [], oprema: validEquipmentFilters("", "", "", search.oprema) })}>Očisti</button>}>
    <ul className="grid">
      {visible.map(([make, count]) => <li key={make}>
        <label className="flex cursor-pointer items-center justify-between py-1.5">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="ap-brand-badge flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-(--ap-divider) bg-white">
              <BrandLogo make={make} size="xs" />
            </span>
            <span className="truncate text-[13px] font-medium text-(--ap-ink)">{make}</span>
          </span>
          <span className="flex flex-none items-center">
            <span className="mr-2.5 text-[12px] text-(--ap-faint) tabular-nums">{count}</span>
            <input type="checkbox" checked={selected.has(make)} onChange={event => toggle(make, event.target.checked)}
              className="ap-check h-4 w-4 cursor-pointer rounded-[4px] border-[#D1D5DB] accent-(--ap-ink)" />
          </span>
        </label>
      </li>)}
    </ul>
    {brands.length > 6 && <button type="button" className={clearClass + " mt-1.5"} aria-expanded={all} onClick={() => setAll(value => !value)}>
      {all ? "Prikaži manje" : <>Sve marke <span className="tabular-nums">({brands.length})</span></>}
    </button>}
  </Section>;
}

function QuickSearch({ search, update }: { search: Search; update: UpdateSearch }) {
  const [draft, setDraft] = useState(search.upit);
  const latest = useRef(search);
  latest.current = search;
  useEffect(() => setDraft(search.upit), [search.upit]);
  useEffect(() => {
    if (draft === latest.current.upit) return;
    const timer = window.setTimeout(() => update({ ...latest.current, upit: draft.slice(0, 200) }, true), 220);
    return () => window.clearTimeout(timer);
  }, [draft]);
  return <form role="search" className="relative mt-4" onSubmit={event => { event.preventDefault(); update({ ...search, upit: draft.trim() }); }}>
    <SearchIcon size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--ap-faint)" />
    <input type="text" enterKeyHint="search" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)}
      aria-label="Pretraži marku ili model" placeholder="Pretraži marku ili model"
      className={"ap-search " + fieldClass + " pl-8 pr-8 placeholder:text-(--ap-faint)"} />
    {draft && <button type="button" aria-label="Obriši pretragu" onClick={() => { setDraft(""); update({ ...search, upit: "" }); }}
      className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-(--ap-faint) hover:text-(--ap-ink)">
      <X size={13} aria-hidden="true" />
    </button>}
  </form>;
}

export function FilterRail({ search, update, inventory, onAdvanced, className = "", showTitle = true }: {
  search: Search; update: UpdateSearch; inventory: Vehicle[]; onAdvanced?: () => void; className?: string; showTitle?: boolean;
}) {
  const domainPool = useMemo(() => inventory.filter(vehicle => vehicleCategory(vehicle) === search.kategorija), [inventory, search.kategorija]);
  const pricePool = useMemo(() => matchVehicles(inventory, { ...search, cijena: "", cijenaOd: "", sortiranje: "lowest" }), [inventory, search]);
  const brandPool = useMemo(() => matchVehicles(inventory, { ...search, marka: "", model: "", generacija: "", marke: [], sortiranje: "lowest" }), [inventory, search]);
  const km = search.km ? clamp(Number(search.km), KM_STEP, KM_MAX) : KM_MAX;
  const bodies = search.karoserija;
  const effectiveBrands = [...new Set([...search.marke, ...(search.marka ? [search.marka] : [])])];
  const pill = "ap-press rounded-full px-3.5 py-1.5 text-[12px] ";
  const on = "bg-(--ap-ink) font-semibold text-(--ap-on-ink)";
  const off = "bg-(--ap-fill) font-medium text-(--ap-ink-2) hover:bg-(--ap-fill-hover)";

  return <div className={className}>
    <div className={"flex items-center " + (showTitle ? "justify-between" : "justify-end")}>
      {showTitle && <h2 className="text-[15px] font-bold tracking-[-0.01em] text-(--ap-ink)">Filteri</h2>}
      <button type="button" className={clearClass}
        onClick={() => update({ ...initialSearch, kategorija: search.kategorija, sortiranje: search.sortiranje, prikaz: search.prikaz })}>Resetiraj sve</button>
    </div>
    <QuickSearch search={search} update={update} />

    <Section title="Karoserija">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Karoserija">
        <button type="button" aria-pressed={!bodies.length} className={pill + (!bodies.length ? on : off)}
          onClick={() => update({ ...search, karoserija: [] })}>Svi</button>
        {bodyPills.map(({ id, label }) => {
          const active = bodies.includes(id);
          return <button type="button" key={id} aria-pressed={active} className={pill + (active ? on : off)}
            onClick={() => update({ ...search, karoserija: active ? bodies.filter(body => body !== id) : [...bodies, id] })}>{label}</button>;
        })}
      </div>
    </Section>

    <PriceFilter search={search} update={update} domainPool={domainPool} pool={pricePool} />

    <Section title="Maks. kilometraža" action={<span className="text-[12px] font-bold text-(--ap-ink) tabular-nums">
      {search.km ? "do " + number(km) + " km" : "Sve"}</span>}>
      <RangeSlider min={KM_STEP} max={KM_MAX} step={KM_STEP} values={[km]} labels={["Maksimalna kilometraža"]}
        formatValue={value => value >= KM_MAX ? "Bez ograničenja" : "do " + number(value) + " km"}
        onChange={([value]) => update({ ...search, km: value >= KM_MAX ? "" : String(value) }, true)} />
      <div className="mt-1 flex justify-between px-0.5 text-[10.5px] text-(--ap-faint) tabular-nums" aria-hidden="true">
        <span>{compactKm(KM_STEP)}</span><span>{compactKm(KM_MAX / 2)}</span><span>300k+ km · Sve</span>
      </div>
    </Section>

    <BrandFilter search={search} update={update} domainPool={domainPool} pool={brandPool} />

    <div className="mt-4 space-y-3.5 border-t border-(--ap-divider) pt-4">
      <Switch label="Potvrđena kilometraža" hint="CVH zapis kilometraže" checked={search.opcije.includes("cvh")}
        onChange={checked => update({ ...search, opcije: checked ? [...new Set([...search.opcije, "cvh" as const])] : search.opcije.filter(flag => flag !== "cvh") })} />
      <Switch label="Samo prilike ispod cijene" hint="≥ 5% ispod tržišnog medijana" checked={search.samoPrilike}
        onChange={checked => update({ ...search, samoPrilike: checked })} />
    </div>

    <MoreFilters search={search} update={update} brand={effectiveBrands.length === 1 ? effectiveBrands[0] : ""} onAdvanced={onAdvanced} />
  </div>;
}

/** Mobile slide-over sheet that hosts the same FilterRail. */
export function FilterSheet({ count, onClose, children }: { count: number; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); root.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} aria-label="Filteri vozila" className="ap-sheet"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex h-full flex-col bg-(--ap-card)">
      <div className="flex h-14 flex-none items-center justify-between border-b border-(--ap-line-strong) px-5">
        <span className="text-[15px] font-bold text-(--ap-ink)">Filteri</span>
        <button type="button" aria-label="Zatvori filtere" onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-(--ap-ink) hover:bg-(--ap-fill)"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">{children}</div>
      <div className="flex-none border-t border-(--ap-line-strong) p-4">
        <button type="button" onClick={onClose}
          className="ap-press h-11 w-full rounded-full bg-(--ap-ink) text-[14px] font-semibold text-(--ap-on-ink) tabular-nums hover:bg-(--ap-ink-hover)">
          Prikaži {number(count)} {count % 10 === 1 && count % 100 !== 11 ? "vozilo" : "vozila"}
        </button>
      </div>
    </div>
  </dialog>;
}
