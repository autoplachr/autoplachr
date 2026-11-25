"use client";

import { ArrowLeft, ArrowRight, Check, Clock, MapPin, MessageSquare, Phone, Search, ShieldCheck, Star } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { BrandLogo } from "../src/components/BrandLogo";
import { ListingPhoto } from "../src/components/ListingPhoto";
import {
  DEALERSHIP_DIRECTORY,
  DIRECTORY_CITIES,
  findDealershipBySlug,
  type DealershipDirectoryEntry,
} from "../src/data/dealerships";
import { dealershipHoursToday } from "../src/data/working-hours";
import { vehicleListingPath } from "../src/lib/seo";
import { euro, marketValuation, number, power, registered, type Vehicle } from "./catalog";
import { Rating, ratingSavingsLabel } from "./ui";

export function DealershipDirectoryView({
  vehicles,
  selectedSlug,
  savedIds,
  onSave,
  onOpenListing,
  onNavigate,
  onContactDealer,
}: {
  vehicles: Vehicle[];
  selectedSlug?: string | null;
  savedIds: string[];
  onSave: (id: string) => void;
  onOpenListing: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onNavigate: (url: string) => void;
  onContactDealer?: (vehicle: Vehicle, message?: string) => Promise<void>;
}) {
  const [cityFilter, setCityFilter] = useState<string>("Svi gradovi");
  const [query, setQuery] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  const inventoryByDealer = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    for (const v of vehicles) {
      if (!v.dealer || !v.seller) continue;
      const list = map.get(v.seller) ?? [];
      list.push(v);
      map.set(v.seller, list);
    }
    return map;
  }, [vehicles]);

  const otherDealers = useMemo(() => {
    const knownNames = new Set(DEALERSHIP_DIRECTORY.map(dealer => dealer.name.toLowerCase()));
    const dealers = new Map<string, { vehicle: Vehicle; stock: Vehicle[] }>();
    for (const vehicle of vehicles) {
      if (!vehicle.dealer || !vehicle.dealershipId || knownNames.has(vehicle.seller.toLowerCase())) continue;
      const dealer = dealers.get(vehicle.dealershipId);
      if (dealer) dealer.stock.push(vehicle);
      else dealers.set(vehicle.dealershipId, { vehicle, stock: [vehicle] });
    }
    return [...dealers.values()];
  }, [vehicles]);
  const activeDealer: DealershipDirectoryEntry | undefined = selectedSlug
    ? findDealershipBySlug(selectedSlug)
    : undefined;

  if (selectedSlug) {
    if (!activeDealer) {
      return (
        <main className="shell max-w-[1380px] mx-auto px-4 sm:px-6 py-8">
          <div className="empty-state">
            <h1>Salon nije pronađen</h1>
            <button type="button" className="btn secondary" onClick={() => onNavigate("/autokuce")}>
              Natrag na imenik autokuća
            </button>
          </div>
        </main>
      );
    }

    const dealerVehicles = inventoryByDealer.get(activeDealer.name) ?? [];
    const dealerMakes = [...new Set(dealerVehicles.map(v => v.make))];

    return (
      <main className="shell max-w-[1380px] mx-auto px-4 sm:px-6 py-6 pb-12 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/autokuce"
              onClick={e => {
                e.preventDefault();
                onNavigate("/autokuce");
              }}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--spec)] hover:text-[#2563EB]"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Sve autokuće
            </a>
            <span className="text-[var(--muted)]">/</span>
            <span className="text-[13px] text-[var(--muted)]">{activeDealer.city}</span>
            <span className="text-[var(--muted)]">/</span>
            <strong className="text-[13px] text-[var(--text)] !m-0">{activeDealer.name}</strong>
          </div>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="relative h-[220px] lg:h-auto bg-slate-900 overflow-hidden">
              <img
                src={activeDealer.bannerImage}
                alt={activeDealer.name}
                className="w-full h-full object-cover object-center block"
                style={{ imageRendering: "auto", transform: "translateZ(0)" }}
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/95 text-[11.5px] font-bold">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Verificirana autokuća
                </span>
                <span className="px-2 py-0.5 rounded bg-black/70 text-[11.5px] font-semibold tabular-nums">
                  Od {activeDealer.foundedYear}.
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 min-w-0">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="!m-0 text-[24px] sm:text-[28px] font-extrabold tracking-tight text-[var(--text)]">
                      {activeDealer.name}
                    </h1>
                    <p className="text-[13.5px] text-[var(--muted)] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 !m-0">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#2563EB] shrink-0" aria-hidden="true" />
                        {activeDealer.address}
                      </span>
                      <span className="inline-flex items-center gap-1.5 tabular">
                        <Clock size={14} className="text-[#2563EB] shrink-0" aria-hidden="true" />
                        {dealershipHoursToday(activeDealer.workingHours)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--hover)] shrink-0">
                    <Star size={16} fill="#F59E0B" className="text-amber-500" aria-hidden="true" />
                    <strong className="tabular-nums text-[15px] text-[var(--text)] !m-0">
                      {activeDealer.score.toLocaleString("hr-HR", { minimumFractionDigits: 1 })}
                    </strong>
                    <span className="text-[12px] text-[var(--muted)] tabular-nums">
                      ({activeDealer.reviews} recenzija)
                    </span>
                  </div>
                </div>

                <p className="text-[13.5px] leading-relaxed text-[var(--spec)] !m-0 max-w-3xl">
                  {activeDealer.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeDealer.badges.map(badge => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--hover)] text-[12px] font-semibold text-[var(--spec)]"
                    >
                      <Check size={12} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      {badge}
                    </span>
                  ))}
                  {dealerMakes.map(make => (
                    <span
                      key={make}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--muted)]"
                    >
                      <BrandLogo make={make} size="xs" />
                      {make}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--border)]">
                {showPhone ? (
                  <a href={`tel:${activeDealer.phone.replace(/\s+/g, "")}`} className="btn primary tabular-nums">
                    <Phone size={15} aria-hidden="true" />
                    {activeDealer.phone}
                  </a>
                ) : (
                  <button type="button" className="btn primary" onClick={() => setShowPhone(true)}>
                    <Phone size={15} aria-hidden="true" />
                    Prikaži broj telefona
                  </button>
                )}
                {dealerVehicles[0] && onContactDealer && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      void onContactDealer(
                        dealerVehicles[0],
                        `Pozdrav ${activeDealer.name}, zanima me ponuda vozila u vašem salonu.`,
                      )
                    }
                  >
                    <MessageSquare size={15} aria-hidden="true" />
                    Pošalji poruku salonu
                  </button>
                )}
                <span className="text-[12.5px] text-[var(--muted)] ml-auto tabular-nums">
                  Radno vrijeme: {activeDealer.hours}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="dealer-inventory-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dealer-inventory-heading" className="!m-0 text-[19px] font-bold text-[var(--text)]">
              Aktivna ponuda salona ({dealerVehicles.length}{" "}
              {dealerVehicles.length === 1 ? "vozilo" : "vozila"})
            </h2>
          </div>

          {dealerVehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {dealerVehicles.map((vehicle, index) => {
                const val = marketValuation(vehicle);
                const isSaved = savedIds.includes(vehicle.id);
                const hasPriceDrop = Boolean(vehicle.previousPriceEur && vehicle.previousPriceEur > vehicle.price);
                const dropAmount = hasPriceDrop ? (vehicle.previousPriceEur ?? 0) - vehicle.price : 0;
                const href = vehicleListingPath(vehicle.id);
                const tag = vehicle.flags.includes("cvh")
                  ? "CVH potvrđeni km"
                  : vehicle.flags.includes("pdv")
                  ? "Sustav PDV-a (R1)"
                  : null;
                return (
                  <article key={vehicle.id} className="rec-card flex flex-col h-full">
                    <ListingPhoto
                      className="rec-media rounded-t-[9px]"
                      vehicle={vehicle}
                      saved={isSaved}
                      onSave={() => onSave(vehicle.id)}
                      eager={index < 4}
                      status={tag}
                      href={href}
                      onOpen={e => onOpenListing(e, vehicle.id)}
                    />
                    <div className="rec-body flex flex-col flex-1 p-3.5 min-w-0">
                      <h3 className="h-[44px] flex items-start overflow-hidden">
                        <a
                          className="card-link flex items-start gap-[7px] w-full text-left"
                          href={href}
                          onClick={e => onOpenListing(e, vehicle.id)}
                        >
                          <BrandLogo make={vehicle.make} size="xs" />
                          <span className="line-clamp-2 text-[14.5px] font-bold leading-[1.35] text-[var(--text)]">
                            {vehicle.title}
                          </span>
                        </a>
                      </h3>
                      <p className="rec-specs tabular h-[36px] line-clamp-2 text-[12px] leading-[1.4] mt-1.5 text-[var(--spec)]">
                        {registered(vehicle.date)} • {number(vehicle.km)} km • {power(vehicle.kw)} • {vehicle.gear} •{" "}
                        {vehicle.fuel}
                      </p>
                      <div className="mt-auto pt-3 flex flex-col gap-1">
                        {hasPriceDrop && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] line-through text-[var(--muted)] tabular-nums">
                              {euro(vehicle.previousPriceEur!)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/12 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-bold tabular-nums">
                              -{euro(dropAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[20px] font-extrabold tracking-[-0.03em] text-[var(--text)] tabular-nums whitespace-nowrap">
                            {euro(vehicle.price)}
                          </strong>
                          <Rating valuation={val} align="right" />
                        </div>
                        <span className="text-[11.5px] font-medium text-[var(--muted)] truncate">
                          {ratingSavingsLabel(val)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h2>Trenutno nema aktivnih oglasa za ovaj salon</h2>
              <button type="button" className="btn secondary" onClick={() => onNavigate("/autokuce")}>
                Pregledaj ostale autokuće
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const filterDealers = () => {
    const q = query.trim().toLowerCase();
    return DEALERSHIP_DIRECTORY.filter(dealer => {
      if (cityFilter !== "Svi gradovi" && dealer.city !== cityFilter) return false;
      if (!q) return true;
      const stock = inventoryByDealer.get(dealer.name) ?? [];
      const makesText = stock.map(v => `${v.make} ${v.model}`).join(" ").toLowerCase();
      return (
        dealer.name.toLowerCase().includes(q) ||
        dealer.city.toLowerCase().includes(q) ||
        dealer.address.toLowerCase().includes(q) ||
        makesText.includes(q)
      );
    });
  };
  const filteredDealers = filterDealers();
  const cities = [...new Set([...DIRECTORY_CITIES, ...otherDealers.map(({ vehicle }) => vehicle.city)])];
  const queryText = query.trim().toLowerCase();
  const filteredOtherDealers = otherDealers.filter(({ vehicle, stock }) =>
    (cityFilter === "Svi gradovi" || cityFilter === vehicle.city) &&
    [vehicle.seller, vehicle.city, vehicle.sellerAddress, ...stock.map(item => item.make + " " + item.model)]
      .join(" ").toLowerCase().includes(queryText));

  return (
    <main className="shell max-w-[1380px] mx-auto px-4 sm:px-6 py-6 pb-12 flex flex-col gap-5">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/12 border border-blue-500/25 text-[#2563EB] text-[12px] font-bold">
                <ShieldCheck size={14} aria-hidden="true" />
                <span className="tabular">{number(DEALERSHIP_DIRECTORY.length + otherDealers.length)}</span> autokuća u RH
              </span>
            </div>
            <h1 className="!m-0 text-[24px] sm:text-[30px] font-extrabold tracking-tight text-[var(--text)]">
              Provjerene autokuće i saloni rabljenih vozila
            </h1>
            <p className="text-[13.5px] text-[var(--muted)] max-w-2xl !m-0">
              Pregledajte ovlaštene trgovce i salone diljem Hrvatske s potvrđenom kilometražom (CVH), R1 računom,
              pisanim jamstvom i aktivnom zalihom vozila.
            </p>
          </div>

          <div className="relative w-full sm:w-[320px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pretraži salon, grad ili marku..."
              aria-label="Pretraži autokuće"
              className="w-full min-h-[40px] pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--hover)] text-[13.5px] text-[var(--text)] placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]" role="group" aria-label="Filter po gradu">
          {cities.map(city => {
            const active = cityFilter === city;
            const count =
              city === "Svi gradovi"
                ? DEALERSHIP_DIRECTORY.length + otherDealers.length
                : DEALERSHIP_DIRECTORY.filter(d => d.city === city).length + otherDealers.filter(({ vehicle }) => vehicle.city === city).length;
            return (
              <button
                key={city}
                type="button"
                aria-pressed={active}
                onClick={() => setCityFilter(city)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border ${
                  active
                    ? "bg-[#2563EB] border-[#2563EB] text-white"
                    : "bg-[var(--hover)] border-[var(--border)] text-[var(--spec)] hover:border-[#2563EB]/60"
                }`}
              >
                {city} <span className="opacity-75 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </section>

      {filteredDealers.length + filteredOtherDealers.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Popis autokuća">
          {filteredOtherDealers.map(({ vehicle, stock }) => {
            const href = "/?salon=" + encodeURIComponent(vehicle.dealershipId ?? "");
            return <article key={vehicle.dealershipId} className="imported-dealer">
              <h2>{vehicle.seller}</h2>
              <p>{vehicle.city}{vehicle.sellerAddress && " · " + vehicle.sellerAddress}</p>
              <p className="tabular">{number(stock.length)} {stock.length === 1 ? "vozilo" : "vozila"} u ponudi</p>
              <a href={href} className="btn secondary self-start" onClick={event => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                onNavigate(href);
              }}>Pogledaj vozila <ArrowRight size={15} aria-hidden="true" /></a>
            </article>;
          })}
          {filteredDealers.map(dealer => {
            const stock = inventoryByDealer.get(dealer.name) ?? [];
            const makes = [...new Set(stock.map(v => v.make))].slice(0, 4);
            const showroomHref = `/autokuce/${dealer.slug}`;
            return (
              <article
                key={dealer.slug}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] hover:border-[var(--card-hover-border)] overflow-hidden flex flex-col h-full"
              >
                <div className="relative h-[168px] bg-slate-900 overflow-hidden shrink-0">
                  <img
                    src={dealer.bannerImage}
                    alt={dealer.name}
                    className="w-full h-full object-cover object-center block"
                    loading="lazy"
                    decoding="async"
                    style={{ imageRendering: "auto", transform: "translateZ(0)" }}
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/95 text-white text-[11px] font-bold">
                      <ShieldCheck size={12} aria-hidden="true" />
                      Verificirana autokuća
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/75 text-white text-[11.5px] font-bold tabular-nums">
                      <Star size={12} fill="#F59E0B" className="text-amber-400" aria-hidden="true" />
                      {dealer.score.toLocaleString("hr-HR", { minimumFractionDigits: 1 })} ({dealer.reviews})
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2 text-white">
                    <div>
                      <h2 className="!m-0 text-[17px] font-extrabold leading-tight text-white">{dealer.name}</h2>
                      <span className="text-[12px] text-slate-200">{dealer.city}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/15 backdrop-blur-sm border border-white/20 text-[11.5px] font-bold tabular-nums shrink-0">
                      {stock.length} {stock.length === 1 ? "vozilo" : "vozila"} u ponudi
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 gap-3 min-w-0">
                  <div className="flex flex-col gap-1.5 text-[12.5px] text-[var(--spec)]">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="truncate">{dealer.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--muted)] tabular">
                      <Clock size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>{dealershipHoursToday(dealer.workingHours)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {dealer.badges.map(badge => (
                      <span
                        key={badge}
                        className="px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--hover)] text-[11px] font-semibold text-[var(--spec)]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {makes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {makes.map(make => (
                        <span
                          key={make}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--hover)] text-[11.5px] text-[var(--muted)]"
                        >
                          <BrandLogo make={make} size="xs" />
                          {make}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                    <a
                      href={showroomHref}
                      onClick={e => {
                        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                          e.preventDefault();
                          onNavigate(showroomHref);
                        }
                      }}
                      className="btn primary w-full justify-between px-3.5 text-[13px]"
                    >
                      <span>Pogledaj ponudu salona</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state">
          <h2>Nema autokuća za odabrani filter</h2>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setCityFilter("Svi gradovi");
              setQuery("");
            }}
          >
            Poništi filtre
          </button>
        </div>
      )}
    </main>
  );
}
