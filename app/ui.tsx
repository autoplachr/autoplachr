"use client";

import { Camera, CarFront, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { rating, type Photo, type Vehicle } from "./catalog";

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
  return <span className="photo-count mono"><Camera size={13} aria-hidden="true" />{index + 1}/{total}</span>;
}

export function Rating({ vehicle }: { vehicle: Vehicle }) {
  const result = rating(vehicle);
  return result && <span className={"rating " + result.type}><i aria-hidden="true" />{result.label}</span>;
}

