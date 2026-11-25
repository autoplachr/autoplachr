"use client";

import { CarFront, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { flags, quick, rating, type Flag, type Photo, type Vehicle } from "./catalog";

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

export function Dialog({ title, children, onClose, variant = "", eyebrow }: {
  title: string; children: ReactNode; onClose: () => void; variant?: string; eyebrow?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previous; };
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

export function VehiclePhoto({ photo, alt, eager = false }: { photo?: Photo; alt: string; eager?: boolean }) {

  return <div className="vehicle-photo">
    <CarFront className="photo-fallback" size={40} aria-hidden="true" />
    {photo && <img key={photo.src} alt={alt} src={photo.src} loading={eager ? "eager" : "lazy"} decoding="async" onError={event => { event.currentTarget.hidden = true; }} />}
  </div>;
}

export function PhotoCount({ index, total }: { index: number; total: number }) {
  if (!total) return null;
  return <span className="photo-count mono" aria-label={`Fotografija ${index + 1} od ${total}`}>{index + 1}/{total}</span>;
}

export function Rating({ vehicle }: { vehicle: Vehicle }) {
  const result = rating(vehicle);
  if (!result) return null;
  const filled = { good: 5, fair: 3, high: 1 }[result.type];
  return <span className={"rating " + result.type}>
    <span className="rating-bars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) =>
      <span className={index < filled ? "filled" : undefined} key={index}/>
    )}</span>
    <span>{result.label}</span>
  </span>;
}

