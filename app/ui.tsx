"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { flags, quick, rating, type Flag, type Vehicle } from "./catalog";
import type { PriceRatingTier } from "../src/lib/price-engine";
import { makeOptions } from "./make-equipment";

export function MakeEquipmentOptions({ make, model, selected, onChange }: {
  make: string; model: string; selected: string[]; onChange: (value: string[]) => void;
}) {
  const options = makeOptions(make, model);
  if (!options.length) return null;
  return <section className="make-options" aria-label="Oprema po marki">
    <h3>{make} oprema</h3>
    <div>{options.map(option => <label key={option.id}>
      <input type="checkbox" checked={selected.includes(option.id)} onChange={event => {
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
      <input type="checkbox" checked={selected.includes(flag)} onChange={event => {
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

export function Dialog({ title, children, onClose, variant = "", eyebrow }: {
  title: string; children: ReactNode; onClose: () => void; variant?: string; eyebrow?: string;
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
    <div className="dialog-heading">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      <button className="icon-btn" type="button" aria-label="Zatvori" onClick={onClose}><X size={20} /></button>
    </div>
    {children}
  </dialog>;
}

export { CarImage as VehiclePhoto } from "../src/components/CarImage";

export function PhotoCount({ index, total }: { index: number; total: number }) {
  if (!total) return null;
  return <span className="photo-count tabular" aria-label={`Fotografija ${index + 1} od ${total}`}>{index + 1}/{total}</span>;
}

export function Rating({ vehicle, tier }: { vehicle?: Vehicle; tier?: PriceRatingTier }) {
  const result = tier ?? (vehicle ? rating(vehicle) : null);
  if (!result) return null;
  return <span className={"rating " + result.type}>
    <span className="rating-bars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) =>
      <span className={index < result.bars ? "filled" : undefined} key={index}/>
    )}</span>
    <span>{result.label}</span>
  </span>;
}

