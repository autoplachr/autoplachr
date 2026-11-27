"use client";

import { Checkbox } from "../src/components/Checkbox";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { euro, flags, marketValuation, quick, rating, type Flag, type Vehicle } from "./catalog";
import type { MarketValuationResult, PriceRatingTier } from "../src/lib/price-engine";
import { makeOptions } from "./make-equipment";

export function MakeEquipmentOptions({ make, model, selected, onChange }: {
  make: string; model: string; selected: string[]; onChange: (value: string[]) => void;
}) {
  const options = makeOptions(make, model);
  if (!options.length) return null;
  return <section className="make-options" aria-label="Oprema po marki">
    <h3>{make} oprema</h3>
    <div>{options.map(option => <label key={option.id}>
      <Checkbox checked={selected.includes(option.id)} onChange={event => {
        onChange(event.target.checked ? [...selected, option.id] : selected.filter(id => id !== option.id));
      }} />
      {option.label}
    </label>)}</div>
  </section>;
}

export function ListingOptions({ selected, onChange }: { selected: Flag[]; onChange: (value: Flag[]) => void }) {
  return <fieldset className="filter-options">
    <legend>Dodatni uvjeti</legend>
    {flags.map(flag => <label key={flag}>
      <Checkbox checked={selected.includes(flag)} onChange={event => {
        onChange(event.target.checked ? [...selected, flag] : selected.filter(value => value !== flag));
      }} />
      {quick[flag]}
    </label>)}
  </fieldset>;
}

export function Select({ label, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className={"field " + className}>
    <span>{label}</span>
    <div className="select-shell">
      <select aria-label={label} {...props}>{children}</select>
      <ChevronDown size={15} aria-hidden="true" />
    </div>
  </label>;
}

let modalLocks = 0;
let releasePageLock: (() => void) | undefined;

function lockPage() {
  if (modalLocks++ === 0) {
    const body = document.body, root = document.documentElement;
    const previousBody = { overflow:body.style.overflow, position:body.style.position, inset:body.style.inset, width:body.style.width };
    const previousRoot = root.style.overflow;
    const y = window.scrollY, x = window.scrollX;
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    if (matchMedia("(max-width: 767px)").matches) {
      body.style.position = "fixed";
      body.style.inset = `-${y}px auto auto -${x}px`;
      body.style.width = "100%";
    }
    releasePageLock = () => {
      Object.assign(body.style,previousBody);
      root.style.overflow = previousRoot;
      window.scrollTo({top:y,left:x,behavior:"instant"});
    };
  }
  return () => {
    if (--modalLocks === 0) {
      releasePageLock?.();
      releasePageLock = undefined;
    }
  };
}

export function Dialog({ title, children, onClose, variant = "", eyebrow, progress }: {
  title: string; children: ReactNode; onClose: () => void; variant?: string; eyebrow?: string; progress?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const unlock = lockPage();
    element.showModal();
    const viewport = window.visualViewport;
    let viewportFrame: number | undefined;
    function updateViewport() {
      if (!viewport) return;
      const layoutHeight = document.documentElement.clientHeight;
      element!.style.setProperty("--modal-viewport-height", viewport.height + "px");
      element!.style.setProperty("--modal-keyboard-inset", Math.max(0,layoutHeight-viewport.height-viewport.offsetTop) + "px");
      if (!matchMedia("(max-width: 767px)").matches || layoutHeight - viewport.height < 80) return;
      if (viewportFrame !== undefined) cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(() => {
        const focused = document.activeElement;
        if (!(focused instanceof HTMLElement) || !element!.contains(focused) || !focused.matches("input,textarea,select")) return;
        const scroller = focused.closest<HTMLElement>(".filter-body") ?? element!;
        const box = scroller.getBoundingClientRect(), field = focused.getBoundingClientRect();
        const top = Math.max(box.top,viewport.offsetTop) + 8;
        const bottom = Math.min(box.bottom,viewport.offsetTop + viewport.height) - 8;
        if (field.bottom > bottom) scroller.scrollTop += field.bottom - bottom;
        else if (field.top < top) scroller.scrollTop -= top - field.top;
      });
    }
    updateViewport();
    viewport?.addEventListener("resize",updateViewport);
    viewport?.addEventListener("scroll",updateViewport);
    return () => {
      if (viewportFrame !== undefined) cancelAnimationFrame(viewportFrame);
      viewport?.removeEventListener("resize",updateViewport);
      viewport?.removeEventListener("scroll",updateViewport);
      element.close();
      unlock();
    };
  }, []);
  return <dialog ref={ref} className={"dialog " + variant} aria-label={title} onCancel={event => {
    event.preventDefault();
    onClose();
  }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <header className={progress ? "dialog-progress" : "contents"}>
    <div className="dialog-heading">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      <button className="icon-btn" type="button" aria-label="Zatvori" onClick={onClose}><X size={20} /></button>
    </div>
    {progress}
    </header>
    {children}
  </dialog>;
}

export { CarImage as VehiclePhoto } from "../src/components/CarImage";

export function PhotoCount({ index, total }: { index: number; total: number }) {
  if (!total) return null;
  return <span className="photo-count tabular" aria-label={`Fotografija ${index + 1} od ${total}`}>{index + 1}/{total}</span>;
}

const ratingStyles = {
  pill: "bg-[var(--hover)] text-[var(--text)] border border-[var(--border)]",
  barFilled: "bg-[var(--spec)]",
  barEmpty: "bg-[var(--border)]",
};

/** Tier tones: emerald for Top prilika, neutral blue for market price, slate/amber for the higher range. */
const ratingTones: Record<number, string> = {
  0: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  1: "bg-[var(--hover)] text-[var(--text)] border border-[var(--border)]",
  2: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
  3: "bg-[var(--hover)] text-[var(--muted)] border border-[var(--border)]",
};

export function ratingSavingsLabel(val: MarketValuationResult): string {
  const absEur = Math.abs(val.deltaEur);
  if (val.deltaPercent <= -5) {
    return val.deltaEur < -50 ? `↓ ${euro(absEur)} ispod prosjeka RH` : "Top prilika na tržištu";
  }
  if (val.deltaPercent <= 8) {
    return "U okviru tržišnog prosjeka RH";
  }
  if (val.deltaPercent <= 18) {
    return val.deltaEur > 50 ? `↑ ${euro(absEur)} iznad tržišnog raspona` : "Iznad tržišnog raspona RH";
  }
  return "Iznad tržišnog raspona RH";
}

export function Rating({
  vehicle,
  tier,
  valuation,
  showSavings = false,
  interactive = true,
  align = "right",
  privateContext = false,
  showPriceBadge = false,
}: {
  vehicle?: Vehicle;
  tier?: PriceRatingTier;
  valuation?: MarketValuationResult;
  showSavings?: boolean;
  interactive?: boolean;
  align?: "left" | "right";
  /** Private surfaces (dashboard, Step 3, calculator) keep full tier information. */
  privateContext?: boolean;
  /** Public price badge is opt-in and only shown when ≥5% below median. */
  showPriceBadge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const resolvedVal = valuation ?? (vehicle ? marketValuation(vehicle) : undefined);
  const result = tier ?? resolvedVal?.rating ?? (vehicle ? rating(vehicle) : null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  if (!result) return null;
  // Public pages never show default price judgments. Only the seller's explicit
  // opt-in badge ("Ispod tržišne cijene" when ≥5% below median) is rendered publicly.
  const publicBadge = !privateContext && showPriceBadge === true && resolvedVal?.meetsPublicBadge === true;
  if (!privateContext && !publicBadge) return null;
  const publicLabel = publicBadge ? "Ispod tržišne cijene" : null;
  // Above +18% over median the public badge is hidden so the portal never
  // harms the seller; only private surfaces (dashboard, Step 3) show it.
  if (result.hidden && !privateContext) return null;
  const tone = result.hidden ? ratingTones[3] : ratingTones[result.rank] ?? ratingStyles.pill;
  const style = { ...ratingStyles, pill: tone };
  const canPopover = Boolean(interactive && resolvedVal && privateContext);

  const absPct = resolvedVal
    ? Math.abs(resolvedVal.deltaPercent).toLocaleString("hr-HR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "";
  const popoverText = resolvedVal
    ? resolvedVal.deltaEur < -50
      ? `Tržišni prosjek u RH za ovaj model i km: ${euro(resolvedVal.medianMarketPrice)} • Ova cijena je ${euro(Math.abs(resolvedVal.deltaEur))} (${absPct}%) niža od prosjeka.`
      : resolvedVal.deltaEur > 50
      ? `Tržišni prosjek u RH za ovaj model i km: ${euro(resolvedVal.medianMarketPrice)} • Ova cijena je ${euro(Math.abs(resolvedVal.deltaEur))} (${absPct}%) viša od prosjeka.`
      : `Tržišni prosjek u RH za ovaj model i km: ${euro(resolvedVal.medianMarketPrice)} • Ova cijena je u okviru tržišnog prosjeka.`
    : "";

  const pillContent = (
    <>
      <span className="inline-grid grid-cols-5 gap-[2px] w-[36px] shrink-0" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-[5px] rounded-[1px] ${index < result.bars ? style.barFilled : style.barEmpty}`}
          />
        ))}
      </span>
      <span className="whitespace-nowrap">{publicLabel ?? (result.hidden ? "Bez javne oznake (privatno)" : result.label)}</span>
    </>
  );

  return (
    <div
      ref={wrapRef}
      className={`rating-wrap relative inline-flex flex-col ${align === "right" ? "items-end" : "items-start"} z-[3]`}
      onMouseEnter={canPopover ? () => setOpen(true) : undefined}
      onMouseLeave={canPopover ? () => setOpen(false) : undefined}
    >
      {canPopover ? (
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11.5px] leading-[1.35] transition-opacity hover:opacity-95 ${style.pill}`}
          aria-expanded={open}
          aria-describedby={open ? tooltipId : undefined}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(v => !v);
          }}
        >
          {pillContent}
        </button>
      ) : (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11.5px] leading-[1.35] ${style.pill}`}>
          {pillContent}
        </span>
      )}

      {showSavings && privateContext && resolvedVal && (
        <span className={`text-[11.5px] font-medium tabular-nums mt-1 leading-tight truncate max-w-full ${resolvedVal.deltaEur < -50 ? "verified-price-savings" : "text-[var(--spec)]"}`}>
          {ratingSavingsLabel(resolvedVal)}
        </span>
      )}

      {canPopover && open && (
        <div
          id={tooltipId}
          role="tooltip"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`absolute bottom-full mb-1.5 ${align === "right" ? "right-0" : "left-0"} z-30 w-[250px] max-w-[calc(100vw-32px)] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5 text-[11.5px] leading-[1.45] text-slate-700 dark:text-zinc-200 pointer-events-auto`}
        >
          {popoverText}
        </div>
      )}
    </div>
  );
}

