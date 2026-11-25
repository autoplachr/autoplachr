"use client";
import { Camera, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import type { Vehicle } from "../../app/catalog";
import { CarImage } from "./CarImage";

export function ListingPhoto({
  vehicle,
  saved,
  onSave,
  eager,
  status,
  compact = false,
  className,
  href,
  onOpen,
}: {
  vehicle: Vehicle;
  saved: boolean;
  onSave: () => void;
  eager?: boolean;
  status?: string | null;
  compact?: boolean;
  className: string;
  href?: string;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [hoverZone, setHoverZone] = useState<number | null>(null);
  const prefetchedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const photos = vehicle.photos ?? [];
  const total = photos.length;
  const zoneCount = Math.min(total, 5);
  const active = total ? (hoverZone !== null ? hoverZone : index) % total : 0;
  const displayIndex = total ? active + 1 : 0;
  const move = (offset: number) => {
    setHoverZone(null);
    setIndex(current => (current + offset + total) % total);
  };

  function preloadSiblings() {
    if (prefetchedRef.current || total <= 1 || typeof window === "undefined") return;
    prefetchedRef.current = true;
    for (const p of photos.slice(1, 5)) {
      const url = p.backup || p.src;
      if (!url) continue;
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    }
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (total <= 1 || e.touches.length !== 1) return;
    preloadSiblings();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (total <= 1 || !touchStartRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 18 || Math.abs(dx) < Math.abs(dy)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width - 1, e.touches[0].clientX - rect.left));
    const zone = Math.min(zoneCount - 1, Math.floor((relX / Math.max(1, rect.width)) * zoneCount));
    setHoverZone(zone);
  }

  function handleTouchEnd() {
    if (hoverZone !== null) setIndex(hoverZone);
    touchStartRef.current = null;
  }

  return (
    <div
      className={`${className} listing-photo group/photo${compact ? " listing-photo-compact" : ""}`}
      onMouseEnter={preloadSiblings}
      onMouseLeave={() => setHoverZone(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CarImage photo={photos[active]} alt={vehicle.title} eager={eager || active > 0} />

      {total > 1 && (
        <div
          className="absolute inset-0 z-[2] grid"
          style={{ gridTemplateColumns: `repeat(${zoneCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: zoneCount }, (_, zIdx) =>
            href ? (
              <a
                key={zIdx}
                href={href}
                onClick={onOpen}
                tabIndex={-1}
                aria-hidden="true"
                onMouseEnter={() => setHoverZone(zIdx)}
                className="block h-full w-full cursor-pointer"
              />
            ) : (
              <div
                key={zIdx}
                aria-hidden="true"
                onMouseEnter={() => setHoverZone(zIdx)}
                className="h-full w-full"
              />
            ),
          )}
        </div>
      )}

      {compact && total <= 1 && href && <a className="absolute inset-0 z-[2]" href={href} onClick={onOpen} tabIndex={-1} aria-hidden="true" />}
      {!compact && status && <span className="listing-photo-status !z-[4]">{status}</span>}
      <button
        className={"icon-btn heart-button !z-[4]" + (saved ? " saved" : "")}
        type="button"
        aria-pressed={saved}
        aria-label={(saved ? "Ukloni spremljeno vozilo " : "Spremi ") + vehicle.title}
        onClick={onSave}
      >
        <Heart size={14} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>

      {total > 1 && (
        <>
          <button
            className="listing-photo-arrow previous !z-[4]"
            type="button"
            onClick={() => move(-1)}
            aria-label={"Prethodna fotografija: " + vehicle.title}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="listing-photo-arrow next !z-[4]"
            type="button"
            onClick={() => move(1)}
            aria-label={"Sljedeća fotografija: " + vehicle.title}
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {!compact && total > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] px-2 pb-1.5 pt-5 flex items-end justify-between gap-2"
          aria-hidden="true"
        >
          <div
            className="grid flex-1 gap-1 rounded bg-black/65 p-1"
            style={{ gridTemplateColumns: `repeat(${zoneCount}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: zoneCount }, (_, barIdx) => (
              <span
                key={barIdx}
                className={`h-[3px] rounded-full ${
                  barIdx === active % zoneCount
                    ? "bg-white"
                    : "bg-white/40"
                }`}
              />
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white bg-black/75 tabular-nums shrink-0">
            <Camera size={12} aria-hidden="true" />
            {displayIndex}/{total}
          </span>
        </div>
      )}

      {(compact ? total > 0 : total === 1) && (
        <span
          className="listing-photo-count tabular !z-[4]"
          aria-live="polite"
          aria-label={`Fotografija ${displayIndex} od ${total}`}
        >
          {!compact && <Camera size={13} aria-hidden="true" />}
          {displayIndex}/{total}
        </span>
      )}
    </div>
  );
}
