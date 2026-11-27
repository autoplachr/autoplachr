"use client";

import { ArrowLeft, ArrowRight, Check, Clock, MapPin, MessageSquare, Phone, Search } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { BrandLogo } from "../src/components/BrandLogo";
import { CatalogCard } from "./vehicle-card";
import {
  DEALERSHIP_DIRECTORY,
  DIRECTORY_CITIES,
  findDealershipBySlug,
  type DealershipDirectoryEntry,
} from "../src/data/dealerships";
import { normalizePhone } from "../src/data/profile-validation";
import { dealershipHoursToday } from "../src/data/working-hours";
import { contactMetadata } from "./lead-session";
import { api, leadTrackingAvailable } from "./account-api";
import { euro, number, type Vehicle } from "./catalog";

function DealerPhone({ vehicle }: { vehicle: Vehicle }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function reveal() {
    setError("");
    setBusy(true);
    try {
      const result = vehicle.phone ? { phone: vehicle.phone }
        : await api<{ phone?: string }>(leadTrackingAvailable() ? "lead/log" : "phone",
          { id: vehicle.id, event: "phone_reveal", ...contactMetadata() });
      if (!result.phone?.replace(/[^+\d]/g, "")) throw new Error("Broj telefona nije dostupan.");
      setPhone(normalizePhone(result.phone));
    } catch { setError("Broj telefona trenutačno nije dostupan."); }
    finally { setBusy(false); }
  }
  return <div>
    {phone ? <a className="btn primary min-h-11 tabular" href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone size={15} aria-hidden="true" />{phone}</a>
      : <button className="btn primary min-h-11" type="button" disabled={busy} onClick={() => void reveal()}><Phone size={15} aria-hidden="true" />Prikaži broj telefona</button>}
    {error && <p role="status">{error}</p>}
  </div>;
}

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
      const stock = vehicles.filter(item => item.dealer && item.dealershipId === selectedSlug);
      const [dealer] = stock;
      if (dealer) return <main className="shell py-6">
        <a className="btn quiet min-h-11" href="/autokuce"><ArrowLeft size={15} aria-hidden="true" /> Sve autokuće</a>
        <section className="detail-panel form-stack mb-4">
          <h1 className="font-bold text-xl">{dealer.seller}</h1>
          <p>{dealer.city}{dealer.sellerAddress ? " · " + dealer.sellerAddress : ""}</p>
          {(dealer.phone || dealer.contactAvailable) && <DealerPhone key={dealer.id} vehicle={dealer} />}
        </section>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stock.map(vehicle => <CatalogCard key={vehicle.id} vehicle={vehicle} saved={savedIds.includes(vehicle.id)}
            onSave={() => onSave(vehicle.id)} eager={false} onOpen={event => onOpenListing(event, vehicle.id)} />)}
        </div>
      </main>;

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
                <span className="px-2.5 py-1 rounded-md bg-black/75 text-[11.5px] font-bold">
                  Ogledni primjer imenika
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
                      <Check size={12} className="text-[var(--spec)]" aria-hidden="true" />
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
                  <a href={`tel:${normalizePhone(activeDealer.phone)}`} className="btn primary tabular-nums">
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
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {dealerVehicles.map((vehicle) => (
                <CatalogCard key={vehicle.id} vehicle={vehicle} saved={savedIds.includes(vehicle.id)}
                  onSave={() => onSave(vehicle.id)} eager={false}
                  onOpen={event => onOpenListing(event, vehicle.id)} />
              ))}
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

  const totalDealers = DEALERSHIP_DIRECTORY.length + otherDealers.length;
  const follow = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(href);
  };
  const one = (count: number) => count % 10 === 1 && count % 100 !== 11;
  const few = (count: number) => [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100);
  const stockLabel = (count: number) => number(count) + " " + (one(count) ? "vozilo" : "vozila") + " u ponudi";

  return (
    <main className="dealer-directory shell max-w-[1380px] mx-auto px-4 sm:px-6 py-6 pb-12 flex flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--hairline)] pb-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="!m-0 text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--text)]">
              Autokuće i saloni rabljenih vozila
            </h1>
            <p className="!m-0 max-w-[65ch] text-[14px] text-[var(--muted)]">
              <span className="tabular-nums text-[var(--spec)]">{number(totalDealers)}</span> {one(totalDealers) ? "autokuća" : few(totalDealers) ? "autokuće" : "autokuća"} u imeniku · podaci o salonima su ogledni primjeri
            </p>
          </div>
          <label className="dealer-directory-search relative w-full sm:w-[320px]">
            <span className="sr-only">Pretraži autokuće</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pretraži salon, grad ili marku..." />
          </label>
        </div>
        <div className="dealer-city-tabs" role="group" aria-label="Filter po gradu">
          {cities.map(city => {
            const active = cityFilter === city;
            const count = city === "Svi gradovi" ? totalDealers
              : DEALERSHIP_DIRECTORY.filter(d => d.city === city).length + otherDealers.filter(({ vehicle }) => vehicle.city === city).length;
            return <button key={city} type="button" aria-pressed={active} onClick={() => setCityFilter(city)}>
              {city} <span className="tabular-nums">({count})</span>
            </button>;
          })}
        </div>
      </header>

      {filteredDealers.length + filteredOtherDealers.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Popis autokuća">
          {filteredDealers.map(dealer => {
            const stock = inventoryByDealer.get(dealer.name) ?? [];
            const makes = [...new Set(stock.map(v => v.make))].slice(0, 5);
            const showroomHref = `/autokuce/${dealer.slug}`;
            return (
              <article key={dealer.slug} className="dealer-card">
                <div className="dealer-card-media">
                  <img src={dealer.bannerImage} alt="" loading="lazy" decoding="async" />
                  <span className="dealer-card-rating">Ogledni primjer</span>
                </div>
                <div className="dealer-card-body">
                  <h2 className="dealer-card-name">
                    <a href={showroomHref} onClick={follow(showroomHref)}>{dealer.name}</a>

                  </h2>
                  <p className="dealer-card-meta">{dealer.city} · <span className="tabular-nums">{stockLabel(stock.length)}</span></p>
                  <dl className="dealer-card-facts">
                    <div><dt>Adresa</dt><dd title={dealer.address}>{dealer.address}</dd></div>
                    <div><dt>Radno vrijeme</dt><dd className="tabular-nums">{dealershipHoursToday(dealer.workingHours)}</dd></div>
                    {makes.length > 0 && <div><dt>Marke</dt><dd>{makes.join(" · ")}</dd></div>}
                  </dl>
                  {dealer.badges.length > 0 && <p className="dealer-card-badges">{dealer.badges.join(" · ")}</p>}
                  <span className="dealer-card-cta" aria-hidden="true">Pogledaj ponudu salona <ArrowRight size={14} /></span>
                </div>
              </article>
            );
          })}
          {filteredOtherDealers.map(({ vehicle, stock }) => {
            const href = "/autokuce/" + encodeURIComponent(vehicle.dealershipId ?? "");
            const makes = [...new Set(stock.map(item => item.make))].slice(0, 5);
            return <article key={vehicle.dealershipId} className="dealer-card">
              <div className="dealer-card-body">
                <h2 className="dealer-card-name">
                  <a href={href} onClick={follow(href)}>{vehicle.seller}</a>
                  {vehicle.verified && <Check size={15} strokeWidth={2.25} className="dealer-card-verified" role="img" aria-label="Verificirana autokuća" />}
                </h2>
                <p className="dealer-card-meta">{vehicle.city} · <span className="tabular-nums">{stockLabel(stock.length)}</span></p>
                <dl className="dealer-card-facts">
                  {vehicle.sellerAddress && <div><dt>Adresa</dt><dd title={vehicle.sellerAddress}>{vehicle.sellerAddress}</dd></div>}
                  {makes.length > 0 && <div><dt>Marke</dt><dd>{makes.join(" · ")}</dd></div>}
                </dl>
                <span className="dealer-card-cta" aria-hidden="true">Pogledaj vozila <ArrowRight size={14} /></span>
              </div>
            </article>;
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
