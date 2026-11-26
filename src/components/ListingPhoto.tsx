"use client";
import { Camera, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";
import type { Vehicle } from "../../app/catalog";
import { CarImage } from "./CarImage";

export function ListingPhoto(props: ListingPhotoProps) {
  const key = JSON.stringify([props.vehicle.id, props.vehicle.photos?.map(({ src, backup }) => [src, backup])]);
  return <ListingGallery key={key} {...props} />;
}

type ListingPhotoProps = {
  vehicle: Vehicle;
  saved: boolean;
  onSave: () => void;
  eager?: boolean;
  status?: string | null;
  compact?: boolean;
  featured?: boolean;
  allowPhotoSwipe?: boolean;
  className: string;
  href?: string;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function ListingGallery({
  vehicle,
  saved,
  onSave,
  eager,
  status,
  compact = false,
  featured = false,
  allowPhotoSwipe = true,
  className,
  href,
  onOpen,
}: ListingPhotoProps) {
  const [selection, setSelection] = useState({ index: 0, direction: 1 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [readyIndex, setReadyIndex] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const failed = useRef(new Set<number>());
  const mediaRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTarget = useRef<number | null>(null);
  const manual = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  const photos = vehicle.photos ?? [];
  const total = photos.length;
  const zoneCount = Math.min(total, 5);
  const active = hoverIndex ?? selection.index;
  const displayIndex = active === readyIndex ? active : 0;
  const hasGallery = total - failedCount > 1;

  function cancelHover() {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    hoverTarget.current = null;
  }

  useEffect(() => {
    const card = mediaRef.current?.closest("article") ?? mediaRef.current;
    function leaveCard() {
      cancelHover();
      setHoverIndex(null);
      manual.current = false;
    }
    card?.addEventListener("pointerleave", leaveCard);
    return () => {
      cancelHover();
      card?.removeEventListener("pointerleave", leaveCard);
    };
  }, []);

  function nextIndex(from: number, direction: number) {
    for (let step = 1; step <= total; step++) {
      const candidate = (from + direction * step + total) % total;
      if (!failed.current.has(candidate)) return candidate;
    }
    return 0;
  }

  function move(direction: number) {
    manual.current = true;
    cancelHover();
    setHoverIndex(null);
    setReadyIndex(0);
    setSelection({ index: nextIndex(active, direction), direction });
  }

  function handleUnavailable(index: number) {
    if (failed.current.has(index)) return;
    failed.current.add(index);
    setFailedCount(failed.current.size);
    if (hoverIndex === index) setHoverIndex(null);
    setSelection(current => current.index === index
      ? { ...current, index: nextIndex(index, current.direction) }
      : current);
  }

  function preview(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || manual.current || !hasGallery) return;
    if (event.target instanceof Element && event.target.closest("button")) {
      cancelHover();
      return;
    }
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const zone = Math.max(0, Math.min(zoneCount - 1, Math.floor((event.clientX - left) / Math.max(1, width) * zoneCount)));
    if (zone === hoverTarget.current) return;
    cancelHover();
    if (zone === active || failed.current.has(zone)) return;
    hoverTarget.current = zone;
    hoverTimer.current = setTimeout(() => {
      setReadyIndex(0);
      setHoverIndex(zone);
      cancelHover();
    }, 100);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    swipe.current = allowPhotoSwipe && event.touches.length === 1 && hasGallery
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    suppressClickUntil.current = Date.now() + 400;
    move(dx < 0 ? 1 : -1);
  }

  return (
    <div
      ref={mediaRef}
      className={`${className} listing-photo${compact ? " listing-photo-compact" : ""}`}
      data-swipe-photos={allowPhotoSwipe}
      onPointerEnter={preview}
      onPointerMove={preview}
      onPointerLeave={cancelHover}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { swipe.current = null; }}
    >
      <CarImage className="listing-photo-layer" layer dim={displayIndex > 0} photo={photos[0]} alt={vehicle.title} eager={eager}
        onUnavailable={total ? () => handleUnavailable(0) : undefined} />
      {active > 0 && (
        <CarImage key={active} className="listing-photo-layer" layer photo={photos[active]} alt="" eager
          onReady={() => setReadyIndex(active)}
          onUnavailable={() => handleUnavailable(active)} />
      )}
      {href && <a className="absolute inset-0 z-[2]" href={href} tabIndex={-1} aria-hidden="true" onClick={event => {
        if (Date.now() < suppressClickUntil.current) event.preventDefault();
        else onOpen?.(event);
      }} />}
      {featured && <span className="vehicle-card-featured">ISTAKNUTO</span>}
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

      {hasGallery && (
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

      {!compact && hasGallery && (
        <div className="listing-photo-dots" aria-hidden="true">
          {Array.from({ length: Math.min(5, total - Math.floor(displayIndex / 5) * 5) }, (_, dot) => (
            <span key={dot} data-active={dot === displayIndex % 5} />
          ))}
        </div>
      )}
      {total > 0 && (
        <span className="listing-photo-count tabular !z-[4]" aria-live="polite"
          aria-label={`Fotografija ${displayIndex + 1} od ${total}`}>
          {!compact && <Camera size={13} aria-hidden="true" />}
          {displayIndex + 1}/{total}
        </span>
      )}
    </div>
  );
}
