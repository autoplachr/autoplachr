"use client";

import { consentUpdated, readCookieConsent } from "../lib/cookie-consent";
import { Building2, Calculator, ExternalLink, Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NATIVE_AD_CAMPAIGNS, type AdPlacement } from "../data/ad-campaigns";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";

const SLOT_MIN_HEIGHT: Record<AdPlacement, string> = {
  "hero-leaderboard": "min-h-[90px]",
  "sidebar-square": "min-h-[250px]",
  "in-feed-native": "min-h-[110px]",
  "detail-vin-card": "min-h-[130px]",
};

const ADSENSE_SLOTS: Record<AdPlacement, string> = {
  "hero-leaderboard": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HERO?.trim() || "",
  "sidebar-square": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR?.trim() || "",
  "in-feed-native": process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED?.trim() || "",
  "detail-vin-card": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL?.trim() || "",
};


export function AdSlot({
  placement,
  routeKey = "",
  vin,
  onAction,
}: {
  placement: AdPlacement;
  routeKey?: string;
  vin?: string;
  onAction?: () => void;
}) {
  const [useAdSense, setUseAdSense] = useState(false);
  const pushedRef = useRef(false);
  const campaign = NATIVE_AD_CAMPAIGNS[placement];
  const slotId = ADSENSE_SLOTS[placement];

  useEffect(() => {
    const sync = () => {
      setUseAdSense(Boolean(ADSENSE_CLIENT_ID && slotId && (readCookieConsent()?.marketing === true)));
    };
    sync();
    window.addEventListener(consentUpdated, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(consentUpdated, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slotId]);

  useEffect(() => {
    if (!useAdSense || pushedRef.current) return;
    try {
      const w = window as Window & { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // AdSense script not yet ready or blocked by browser extension
    }
  }, [useAdSense, routeKey]);

  const minH = SLOT_MIN_HEIGHT[placement];
  const targetHref =
    vin && campaign.external && campaign.href.includes("carvertical")
      ? `${campaign.href}${campaign.href.includes("?") ? "&" : "?"}vin=${encodeURIComponent(vin)}`
      : campaign.href;

  if (useAdSense) {
    return (
      <aside
        className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 overflow-hidden ${minH}`}
        aria-label={campaign.badge}
      >
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {campaign.badge}
          </span>
        </div>
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={placement === "sidebar-square" ? "rectangle" : "auto"}
          data-full-width-responsive="true"
        />
      </aside>
    );
  }

  if (placement === "hero-leaderboard") {
    return (
      <aside
        className={`shell mt-5 ${minH}`}
        aria-label="Sponzorirana preporuka partnera"
      >
        <div className="rounded-xl border border-blue-500/25 bg-[var(--surface)] dark:bg-[#14161A] px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/12 border border-[#2563EB]/25 text-[#2563EB] flex items-center justify-center shrink-0">
              <Fingerprint size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[var(--hover)] border border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {campaign.badge}
                </span>
                <span className="text-[11.5px] font-semibold text-[#2563EB]">{campaign.eyebrow}</span>
              </div>
              <strong className="block text-[14.5px] font-bold text-[var(--text)] mt-0.5 !m-0">
                {campaign.title}
              </strong>
              <p className="text-[12.5px] text-[var(--muted)] mt-0.5 !m-0">{campaign.description}</p>
            </div>
          </div>
          <a
            href={targetHref}
            target={campaign.external ? "_blank" : undefined}
            rel={campaign.external ? "noopener noreferrer sponsored" : undefined}
            className="btn primary shrink-0 whitespace-nowrap"
          >
            <span>{campaign.ctaLabel}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </aside>
    );
  }

  if (placement === "sidebar-square") {
    return (
      <aside
        className={`mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col justify-between gap-3 ${minH}`}
        aria-label="Oglas partnera"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[var(--hover)] border border-[var(--border)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {campaign.badge}
            </span>
            <span className="text-[11px] font-semibold text-[#2563EB]">{campaign.eyebrow}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#2563EB]/12 text-[#2563EB] flex items-center justify-center">
            <Calculator size={18} aria-hidden="true" />
          </div>
          <strong className="text-[14px] font-bold leading-snug text-[var(--text)] !m-0">
            {campaign.title}
          </strong>
          <p className="text-[12px] leading-relaxed text-[var(--muted)] !m-0">{campaign.description}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {onAction ? (
            <button type="button" onClick={onAction} className="btn primary w-full text-[13px]">
              {campaign.ctaLabel}
            </button>
          ) : (
            <a href={targetHref} className="btn primary w-full text-[13px]">
              {campaign.ctaLabel}
            </a>
          )}
          <a
            href="/registracija"
            className="text-center text-[11.5px] font-semibold text-[var(--muted)] hover:text-[#2563EB] inline-flex items-center justify-center gap-1 pt-0.5"
          >
            <Building2 size={12} aria-hidden="true" /> B2B paket za autokuće (0 € / 90 dana)
          </a>
        </div>
      </aside>
    );
  }

  if (placement === "in-feed-native") {
    return (
      <aside
        className={`rounded-[10px] border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${minH}`}
        aria-label="Sponzorirana ponuda"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/12 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-[var(--hover)] border border-[var(--border)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {campaign.badge}
              </span>
              <span className="text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                {campaign.eyebrow}
              </span>
            </div>
            <strong className="block text-[14.5px] font-bold text-[var(--text)] mt-0.5 !m-0">
              {campaign.title}
            </strong>
            <p className="text-[12.5px] text-[var(--muted)] mt-0.5 !m-0">{campaign.description}</p>
          </div>
        </div>
        {onAction ? (
          <button type="button" onClick={onAction} className="btn secondary shrink-0 whitespace-nowrap">
            {campaign.ctaLabel} →
          </button>
        ) : (
          <a href={targetHref} className="btn secondary shrink-0 whitespace-nowrap">
            {campaign.ctaLabel} →
          </a>
        )}
      </aside>
    );
  }

  // detail-vin-card
  return (
    <aside
      className={`detail-panel rounded-xl flex flex-col justify-between gap-3 border-blue-500/25 ${minH}`}
      aria-label="Sponzorirana VIN provjera"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[var(--hover)] border border-[var(--border)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {campaign.badge}
          </span>
          <span className="text-[11px] font-semibold text-[#2563EB]">{campaign.eyebrow}</span>
        </div>
        <strong className="text-[14px] font-bold text-[var(--text)] !m-0 flex items-center gap-2">
          <Fingerprint size={16} className="text-[#2563EB] shrink-0" aria-hidden="true" />
          <span>{campaign.title}</span>
        </strong>
        <p className="text-[12px] text-[var(--muted)] leading-relaxed !m-0">{campaign.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={targetHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="btn primary flex-1 text-[12.5px]"
        >
          <span>{campaign.ctaLabel}</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        {onAction && (
          <button type="button" onClick={onAction} className="btn secondary text-[12.5px]">
            Leasing / Osiguranje
          </button>
        )}
      </div>
    </aside>
  );
}
