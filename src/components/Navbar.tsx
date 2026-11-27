"use client";

import { Heart, Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const links = [
  { href: "/", label: "Rabljena vozila" },
  { href: "/autokuce", label: "Autokuće" },
  { href: "/ppmv-kalkulator", label: "PPMV kalkulator" },
  { href: "/procjena-cijene", label: "Procjena cijene" },
] as const;

/** Geometric brand emblem: a cobalt frame with a road converging to the horizon. */
function BrandMark() {
  return <svg className="site-brand-mark" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
    <rect width="26" height="26" rx="5" fill="#2563EB" />
    <path d="M6 20.5 11.6 5.5h2.8L20 20.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="miter" />
    <path d="M13 10.5v2.2M13 15v2.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="square" />
  </svg>;
}

type Props = {
  activeRoute: string;
  routeKey: string;
  savedCount: number;
  savedOnly: boolean;
  account?: { name: string; avatar?: string; unread?: number };
  onSaved: (enabled: boolean) => void;
  onNavigate: (href: string) => void;
  onPublish: () => void;
};

export function Navbar({ activeRoute, routeKey, savedCount, savedOnly, account, onSaved, onNavigate, onPublish }: Props) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const accountHref = account ? "/racun" : "/prijava";
  const initials = account?.name.trim().split(/\s+/).slice(0, 2).map(name => name[0]?.toUpperCase()).join("") || "AP";

  useEffect(() => setOpen(false), [routeKey]);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    function close() { setOpen(false); }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      toggle.current?.focus();
    }
    function onResize(event: MediaQueryListEvent) {
      if (event.matches) close();
    }
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
  function publish() {
    setOpen(false);
    onPublish();
  }
  function showSaved(enabled: boolean) {
    setOpen(false);
    onSaved(enabled);
  }
  function navigationLinks() {
    return links.map(({ href, label }) => <a key={href} href={href}
      aria-current={activeRoute === href ? "page" : undefined} onClick={event => follow(event, href)}>{label}</a>);
  }
  const savedButton = <button type="button" className="site-header-action site-saved" aria-label={"Spremljeni oglasi: " + savedCount}
    aria-pressed={savedOnly} onClick={() => showSaved(!savedOnly)}>
    <Heart size={17} aria-hidden="true" />
    <span className="site-saved-text">Spremljeno</span>
    {savedCount > 0 && <span className="site-saved-count tabular-nums">{savedCount}</span>}
  </button>;
  const publishButton = <button type="button" className="site-header-action site-publish tabular" aria-label="Predaj oglas, 0 eura" onClick={publish}>
    <Plus size={15} strokeWidth={2.25} aria-hidden="true" /><span className="site-publish-text">Predaj oglas</span><span className="site-publish-price"><span className="site-publish-dot" aria-hidden="true">· </span>0 €</span>
  </button>;

  return <header ref={header} className="topbar site-header">
    <div className="site-header-inner">
      <a className="site-brand" href="/" aria-label="AUTOPLAC.HR, početna" onClick={event => follow(event, "/")}>
        <BrandMark />
        <span className="site-wordmark">AUTOPLAC<span>.HR</span></span>
      </a>
      <span className="site-brand-divider" aria-hidden="true" />
      <nav className="site-desktop-nav" aria-label="Glavna navigacija">{navigationLinks()}</nav>
      <div className="site-header-actions site-desktop-actions">
        {savedButton}
        <span className="site-utility-divider" aria-hidden="true" />
        <a className="site-header-action site-account" href={accountHref} onClick={event => follow(event, accountHref)}
          aria-current={activeRoute === accountHref ? "page" : undefined} aria-label={account ? "Moj račun" : undefined}>
          <UserRound size={17} strokeWidth={1.75} aria-hidden="true" />
          {account ? <>
            <span className="site-account-name">{account.name.trim().split(/\s+/)[0] || initials}</span>
            {Boolean(account.unread) && <span className="site-account-unread tabular-nums">{account.unread}</span>}
          </> : <span>Prijava</span>}
        </a>
        {publishButton}
      </div>
      <div className="site-header-actions site-mobile-quick">
        {publishButton}
        {savedButton}
        <button ref={toggle} type="button" className="site-header-action site-menu-toggle"
          aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"} aria-expanded={open} aria-controls="site-mobile-nav"
          onClick={() => setOpen(value => !value)}>
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
    <nav id="site-mobile-nav" className="site-mobile-nav" aria-label="Mobilna navigacija" hidden={!open}>
      <div className="site-mobile-links">
        {navigationLinks()}
        <button type="button" aria-pressed={savedOnly} onClick={() => showSaved(true)}>
          Spremljeni oglasi {savedCount > 0 && <span className="tabular">{savedCount}</span>}
        </button>
      </div>
      <div className="site-mobile-actions">
        <a className="site-header-action site-mobile-account" href={accountHref} onClick={event => follow(event, accountHref)}>
          {account ? "Moj račun" : "Prijava / Registracija"}
        </a>
        <button type="button" className="site-header-action site-publish tabular" onClick={publish}>
          <Plus size={16} aria-hidden="true" /> Predaj besplatan oglas (0 €)
        </button>
      </div>
    </nav>
  </header>;
}
