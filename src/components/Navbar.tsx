"use client";

import { Check, Heart, MapPin, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const links = [
  { href: "/", label: "Rabljena vozila" },
  { href: "/autokuce", label: "Autokuće" },
  { href: "/ppmv-kalkulator", label: "PPMV kalkulator" },
  { href: "/procjena-cijene", label: "Procjena cijene" },
] as const;

const THEME_KEY = "autoplac.theme";

type Props = {
  activeRoute: string;
  routeKey: string;
  savedCount: number;
  savedOnly: boolean;
  account?: { name: string; avatar?: string; unread?: number };
  location: string;
  locations: { counties: readonly string[]; cities: readonly string[] };
  onLocation: (value: string) => void;
  onSaved: (enabled: boolean) => void;
  onNavigate: (href: string) => void;
  onPublish: () => void;
};

/** Light is the default; dark is an explicit opt-in stored in localStorage (DESIGN.md §2). */
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* Private mode: session-only. */ }
    setDark(next);
  }
  return [dark, toggle] as const;
}

function LocationPicker({ value, locations, onChange, className = "", align = "right" }: {
  value: string; locations: Props["locations"]; onChange: (value: string) => void; className?: string; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const pick = (next: string) => { setOpen(false); onChange(next); };
  const option = (item: string, label = item) => <li key={item || "all"}>
    <button type="button" onClick={() => pick(item)} aria-current={value === item ? "true" : undefined}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-(--ap-ink) hover:bg-(--ap-fill)">
      <span className="truncate">{label}</span>{value === item && <Check size={14} aria-hidden="true" />}
    </button>
  </li>;
  return <div ref={root} className={"relative " + className}>
    <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(current => !current)}
      aria-label={"Lokacija: " + (value || "Hrvatska")}
      className="ap-press inline-flex h-9 max-w-[180px] items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wider text-(--ap-text-2) hover:bg-(--ap-fill) hover:text-(--ap-ink)">
      <MapPin size={13} strokeWidth={2} aria-hidden="true" className="flex-none" />
      <span className="truncate">{value || "Hrvatska"}</span>
    </button>
    {open && <div className={(align === "left" ? "left-0" : "right-0") + " absolute top-11 z-50 w-64 rounded-2xl border border-(--ap-line) bg-(--ap-card) p-2 shadow-[0_12px_24px_-4px_rgba(16,24,40,0.12)]"}>
      <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
        <ul>{option("", "Cijela Hrvatska")}</ul>
        <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-(--ap-mute)">Gradovi</p>
        <ul>{locations.cities.map(city => option(city))}</ul>
        <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-(--ap-mute)">Županije</p>
        <ul>{locations.counties.map(county => option(county))}</ul>
      </div>
    </div>}
  </div>;
}

export function Navbar({ activeRoute, routeKey, savedCount, savedOnly, account, location, locations, onLocation, onSaved, onNavigate, onPublish }: Props) {
  const [open, setOpen] = useState(false);
  const [dark, toggleTheme] = useTheme();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const accountHref = account ? "/racun" : "/prijava";
  const initials = account?.name.trim().split(/\s+/).slice(0, 2).map(name => name[0]?.toUpperCase()).join("") || "AP";

  useEffect(() => setOpen(false), [routeKey]);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => { if (event.target instanceof Node && !header.current?.contains(event.target)) close(); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); toggle.current?.focus(); } };
    const onResize = (event: MediaQueryListEvent) => { if (event.matches) close(); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", close);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", close);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  function follow(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpen(false);
    onNavigate(href);
  }
  function publish() { setOpen(false); onPublish(); }
  function showSaved(enabled: boolean) { setOpen(false); onSaved(enabled); }

  const iconButton = "ap-press flex h-8 w-8 flex-none items-center justify-center rounded-full text-(--ap-ink) hover:bg-(--ap-fill)";
  const publishClass = "ap-press inline-flex h-9 flex-none items-center rounded-full bg-(--ap-ink) px-4 text-[13px] font-semibold text-(--ap-on-ink) hover:bg-(--ap-ink-hover)";
  const savedButton = (compact: boolean) => <button type="button" aria-pressed={savedOnly} onClick={() => showSaved(!savedOnly)}
    aria-label={"Spremljeni oglasi: " + savedCount}
    className={"ap-press inline-flex h-9 items-center gap-1.5 rounded-full text-[13px] font-medium text-(--ap-ink-2) hover:bg-(--ap-fill) hover:text-(--ap-ink) "
      + (compact ? "px-2" : "px-3")}>
    <Heart size={15} strokeWidth={2} fill={savedOnly || savedCount > 0 ? "currentColor" : "none"} aria-hidden="true" />
    {!compact && <span>Spremljeno</span>}
    {savedCount > 0 && <span className="tabular-nums text-(--ap-ink)">{savedCount}</span>}
  </button>;
  const themeButton = <button type="button" onClick={toggleTheme} className={iconButton}
    aria-label={dark ? "Uključi svijetlu temu" : "Uključi tamnu temu"} aria-pressed={dark}>
    {dark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
  </button>;

  return <header ref={header} className="sticky top-0 z-40 h-16 border-b border-(--ap-line-strong) bg-(--ap-card)">
    <div className="mx-auto flex h-full w-full max-w-[1440px] items-center gap-3 px-4 sm:px-5 lg:px-6">
      <a href="/" aria-label="AUTOPLAC.HR, početna" onClick={event => follow(event, "/")} className="flex flex-none items-center gap-2.5">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#111318] text-sm font-extrabold leading-none text-white dark:bg-white dark:text-[#111318]">A</span>
        <span className="text-[15px] font-extrabold tracking-[0.04em] text-(--ap-ink)">AUTOPLAC</span>
      </a>
      <nav aria-label="Glavna navigacija" className="ml-8 hidden h-full items-center gap-7 lg:flex">
        {links.map(({ href, label }) => {
          const active = activeRoute === href;
          return <a key={href} href={href} aria-current={active ? "page" : undefined} onClick={event => follow(event, href)}
            className={"whitespace-nowrap text-[13.5px] hover:text-(--ap-ink) " + (active ? "font-semibold text-(--ap-ink)" : "font-medium text-(--ap-text-2)")}>{label}</a>;
        })}
      </nav>

      <div className="ml-auto hidden items-center gap-1.5 lg:flex">
        <LocationPicker value={location} locations={locations} onChange={onLocation} />
        {savedButton(false)}
        {themeButton}
        <button type="button" onClick={publish} aria-label="Predaj oglas, 0 eura" className={publishClass + " ml-1"}>Predaj oglas</button>
        <a href={accountHref} onClick={event => follow(event, accountHref)} aria-current={activeRoute === accountHref ? "page" : undefined}
          aria-label={account ? "Moj račun" + (account.unread ? ", nepročitano: " + account.unread : "") : "Prijava"}
          className="ap-press relative ml-1 flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-(--ap-ink)/10 text-xs font-semibold text-(--ap-ink)">
          {account?.avatar ? <img src={account.avatar} alt="" className="h-full w-full object-cover" />
            : account ? initials : <UserRound size={15} aria-hidden="true" />}
          {Boolean(account?.unread) && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-(--ap-focus) ring-2 ring-(--ap-card)" aria-hidden="true" />}
        </a>
      </div>

      <div className="ml-auto flex items-center gap-1 lg:hidden">
        <button type="button" onClick={publish} aria-label="Predaj oglas, 0 eura" className={publishClass + " h-8 px-3 text-[12.5px]"}>Predaj oglas</button>
        {savedButton(true)}
        <button ref={toggle} type="button" className={iconButton + " h-10 w-10"} aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
          aria-expanded={open} aria-controls="site-mobile-nav" onClick={() => setOpen(value => !value)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>

    <nav id="site-mobile-nav" aria-label="Mobilna navigacija" hidden={!open}
      className="absolute inset-x-0 top-16 border-b border-(--ap-line-strong) bg-(--ap-card) px-4 pb-4 pt-2 shadow-[0_12px_24px_-4px_rgba(16,24,40,0.08)] lg:hidden">
      <ul className="grid">
        {links.map(({ href, label }) => <li key={href}>
          <a href={href} aria-current={activeRoute === href ? "page" : undefined} onClick={event => follow(event, href)}
            className={"flex min-h-11 items-center border-b border-(--ap-divider) text-[15px] " + (activeRoute === href ? "font-semibold text-(--ap-ink)" : "font-medium text-(--ap-ink-2)")}>{label}</a>
        </li>)}
        <li>
          <button type="button" aria-pressed={savedOnly} onClick={() => showSaved(true)}
            className="flex min-h-11 w-full items-center justify-between border-b border-(--ap-divider) text-left text-[15px] font-medium text-(--ap-ink-2)">
            Spremljeni oglasi {savedCount > 0 && <span className="tabular-nums text-(--ap-ink)">{savedCount}</span>}
          </button>
        </li>
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <LocationPicker align="left" value={location} locations={locations} onChange={value => { setOpen(false); onLocation(value); }} />
        {themeButton}
      </div>
      <a href={accountHref} onClick={event => follow(event, accountHref)}
        className="ap-press mt-3 flex h-11 items-center justify-center rounded-full bg-(--ap-fill) text-[14px] font-semibold text-(--ap-ink)">
        {account ? "Moj račun" : "Prijava / Registracija"}
      </a>
    </nav>
  </header>;
}
