"use client";

import { ArrowRight, Calculator, Info } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { bodyTypes, euro, gears, number, registered, type Vehicle } from "./catalog";
import { CatalogFields, customVariant, VariantField } from "./catalog-fields";
import { EquipmentSelector } from "./equipment-selector";
import { selectedMakeOptions } from "./make-equipment";
import { MakeEquipmentOptions, Rating, Select, VehiclePhoto } from "./ui";
import { OTHER_MODEL } from "../src/data/car-catalog";
import { describeMarketDelta, evaluateMarketPrice } from "../src/lib/price-engine";
import { calculateCo2, ksToKw, kwToKs, resolveVehicleSpecs, type SpecFuel } from "../src/lib/spec-resolver";

const valuationFuels: readonly SpecFuel[] = ["Dizel", "Benzin", "Hibrid", "Plug-in hibrid", "Električni", "LPG"];
const valuationYears = Array.from({ length: 37 }, (_, index) => 2026 - index);
const extraOptions = [
  "Panorama stakleni krov",
  "Matrix / Laser LED",
  "Harman Kardon / Burmester / B&O",
  "Virtual / Live Cockpit Pro",
  "Webasto",
  "Zračni ovjes / DCC",
  "360° kamera",
  "Head-Up Display",
  "Grijanje i ventilacija sjedala",
  "Električna kuka",
  "Adaptivni tempomat (ACC)",
] as const;

export function ValuationPage({
  inventory,
  onOpenListing,
  onOpenTax,
}: {
  inventory: Vehicle[];
  onOpenListing: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onOpenTax: () => void;
}) {
  const [make, setMake] = useState("BMW");
  const [model, setModel] = useState("Serija 3");
  const [customModel, setCustomModel] = useState("");
  const [generation, setGeneration] = useState("G20");
  const [variant, setVariant] = useState("320d xDrive");
  const [customVersion, setCustomVersion] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [year, setYear] = useState(2021);
  const [km, setKm] = useState(115000);
  const [kw, setKw] = useState(140);
  const [co2, setCo2] = useState<string>("");
  const [fuel, setFuel] = useState<SpecFuel>("Dizel");
  const [gear, setGear] = useState<(typeof gears)[number]>("Automatski");
  const [drive, setDrive] = useState("4×4");
  const [askingPrice, setAskingPrice] = useState("");
  const [makeEquipment, setMakeEquipment] = useState<string[]>(["bmw-m-sport", "bmw-adaptive-led", "bmw-live-cockpit"]);
  const [catalogEquipment, setCatalogEquipment] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>(["Adaptivni tempomat (ACC)"]);
  const [cvh, setCvh] = useState(true);
  const [firstOwner, setFirstOwner] = useState(true);
  const [serviceBook, setServiceBook] = useState(true);
  const [pdv, setPdv] = useState(false);
  const [dealer, setDealer] = useState(true);

  const effectiveModel = model === OTHER_MODEL ? customModel.trim() || model : model;
  const activeVariant = variant === customVariant ? customVersion : variant;
  const parsedAsking = Number(askingPrice);

  const autoCo2 = useMemo(
    () =>
      calculateCo2({
        fuel,
        kw: Math.max(25, kw || 90),
        year,
        date: `${year}-06`,
        gear,
        drive,
        bodyType,
        variant: activeVariant,
      }),
    [fuel, kw, year, gear, drive, bodyType, activeVariant],
  );

  function applySpecs(nextMake: string, nextModel: string, nextGen: string, nextVariant: string, nextYear = year, nextBody = bodyType) {
    if (!nextMake || (!nextModel && !nextVariant)) return;
    const resolved = resolveVehicleSpecs({
      make: nextMake,
      model: nextModel,
      generation: nextGen,
      variant: nextVariant,
      year: nextYear,
      bodyType: nextBody,
    });
    setFuel(resolved.fuel);
    setKw(resolved.kw);
    if (resolved.gear) setGear(resolved.gear);
    if (resolved.drive) setDrive(resolved.drive);
    setCo2("");
  }

  const result = useMemo(() => {
    const flags: string[] = [];
    if (cvh) flags.push("cvh");
    if (pdv) flags.push("pdv");
    return evaluateMarketPrice({
      make: make || "Volkswagen",
      model: effectiveModel || "Golf",
      generation,
      variant: activeVariant,
      bodyType,
      year,
      date: `${year}-06`,
      km: Math.max(0, km || 0),
      kw: Math.max(25, kw || 90),
      co2: co2 !== "" ? Number(co2) : autoCo2,
      fuel,
      gear,
      drive,
      askingPrice: parsedAsking > 0 ? parsedAsking : undefined,
      equipment: selectedExtras,
      makeEquipment,
      catalogEquipment,
      flags,
      firstOwner,
      serviceBook,
      dealer,
      verified: dealer,
    });
  }, [
    make, effectiveModel, generation, activeVariant, bodyType, year, km, kw, co2, autoCo2, fuel, gear, drive,
    parsedAsking, selectedExtras, makeEquipment, catalogEquipment, cvh, pdv, firstOwner, serviceBook, dealer,
  ]);

  const markerTarget = parsedAsking > 0 ? parsedAsking : result.medianMarketPrice;
  const priceScaleMin = Math.round(result.excellentMax * 0.88);
  const priceScaleMax = Math.round(result.highMax * 1.1);
  const pinLeft = (() => {
    const p = markerTarget;
    if (p <= result.excellentMax) {
      return Math.max(3, Math.min(19, (20 * Math.max(0, p - priceScaleMin)) / Math.max(1, result.excellentMax - priceScaleMin)));
    }
    if (p <= result.goodMax) {
      return 20 + (20 * (p - result.excellentMax)) / Math.max(1, result.goodMax - result.excellentMax);
    }
    if (p <= result.fairMax) {
      return 40 + (20 * (p - result.goodMax)) / Math.max(1, result.fairMax - result.goodMax);
    }
    if (p <= result.highMax) {
      return 60 + (20 * (p - result.fairMax)) / Math.max(1, result.highMax - result.fairMax);
    }
    return Math.min(97, 80 + (20 * (p - result.highMax)) / Math.max(1, priceScaleMax - result.highMax));
  })();
  const priceTiers = [
    { rank: 0, label: "Odlična cijena", range: `≤ ${euro(result.excellentMax)}`, tone: "good-5" },
    { rank: 1, label: "Dobra cijena", range: `${euro(result.excellentMax + 1)} – ${euro(result.goodMax)}`, tone: "good-4" },
    { rank: 2, label: "Fer cijena", range: `${euro(result.goodMax + 1)} – ${euro(result.fairMax)}`, tone: "fair-3" },
    { rank: 3, label: "Viša cijena", range: `${euro(result.fairMax + 1)} – ${euro(result.highMax)}`, tone: "high-2" },
    { rank: 4, label: "Visoka cijena", range: `> ${euro(result.highMax)}`, tone: "high-1" },
  ] as const;
  const activeTierRank = parsedAsking > 0 ? result.rating.rank : 2;
  const deltaInfo = parsedAsking > 0 ? describeMarketDelta(result.deltaEur, result.deltaPercent, euro) : null;

  const importDiff = result.medianMarketPrice - result.estimatedImportTotalEur;

  const matchingVehicles = useMemo(() => {
    const low = Math.round(result.fairMin * 0.85);
    const high = Math.round(result.fairMax * 1.15);
    return inventory
      .map(item => {
        const sameMake = make && item.make === make ? 2 : 0;
        const sameModel = effectiveModel && item.model === effectiveModel ? 4 : 0;
        const inStrictRange = item.price >= result.fairMin && item.price <= result.fairMax ? 3 : 0;
        const inNearRange = item.price >= low && item.price <= high ? 1 : 0;
        const dist = Math.abs(item.price - result.medianMarketPrice);
        return { item, score: sameMake + sameModel + inStrictRange + inNearRange, dist };
      })
      .filter(entry => (entry.item.price >= low && entry.item.price <= high) || entry.score >= 4)
      .sort((a, b) => b.score - a.score || a.dist - b.dist)
      .slice(0, 4)
      .map(entry => entry.item);
  }, [inventory, make, effectiveModel, result.fairMin, result.fairMax, result.medianMarketPrice]);

  function toggleExtra(option: string) {
    setSelectedExtras(old => (old.includes(option) ? old.filter(item => item !== option) : [...old, option]));
  }

  const ksValue = kw > 0 ? kwToKs(kw) : 0;

  return (
    <main className="shell valuation-shell">
      <header className="valuation-hero">
        <div>
          <span className="eyebrow">Hrvatski tržišni kalkulator</span>
          <h1>Procjena tržišne cijene vozila u RH</h1>
          <p>Parametarski izračun vrijednosti za sve marke i godišta (1990.–2026.), prilagođen hrvatskim oglasnicima, verificiranim autokućama i troškovima uvoza (PPMV).</p>
        </div>
        <button type="button" className="btn secondary" onClick={onOpenTax}>
          <Calculator size={16} /> Otvori PPMV kalkulator
        </button>
      </header>

      <div className="valuation-grid">
        <section className="detail-panel valuation-form-card" aria-label="Parametri vozila za procjenu">
          <h2>Podaci o vozilu</h2>
          <div className="form-grid">
            <CatalogFields
              allowCustom
              customModel={customModel}
              onCustomModelChange={nextCustom => {
                setCustomModel(nextCustom);
                if (nextCustom.trim().length >= 2) {
                  applySpecs(make, nextCustom.trim(), generation, "");
                }
              }}
              value={{ make, model, generation }}
              onChange={selection => {
                setMake(selection.make);
                setModel(selection.model);
                setGeneration(selection.generation);
                setVariant("");
                setCustomVersion("");
                setMakeEquipment(selectedMakeOptions(selection.make, selection.model, makeEquipment));
                setCatalogEquipment([]);
                const modelName = selection.model === OTHER_MODEL ? customModel.trim() : selection.model;
                applySpecs(selection.make, modelName, selection.generation, "");
              }}
            />
            <VariantField
              selection={{ make, model, generation }}
              value={variant}
              onChange={nextVariant => {
                setVariant(nextVariant);
                if (nextVariant && nextVariant !== customVariant) {
                  applySpecs(make, effectiveModel, generation, nextVariant);
                }
              }}
            />
            {variant === customVariant && (
              <label className="field span-all">
                <span>Motorizacija / verzija</span>
                <input
                  value={customVersion}
                  onChange={e => {
                    const val = e.target.value;
                    setCustomVersion(val);
                    if (val.trim().length >= 3) {
                      applySpecs(make, effectiveModel, generation, val);
                    }
                  }}
                  placeholder="npr. 2.0 TDI Elegance, 1.9 JTD, 52 kWh..."
                />
              </label>
            )}
            <Select label="Karoserija" value={bodyType} onChange={e => setBodyType(e.target.value)}>
              <option value="">Automatski (prema modelu)</option>
              {bodyTypes.map(bt => <option key={bt}>{bt}</option>)}
            </Select>
            <Select label="Godište" className="numeric-select" value={String(year)} onChange={e => setYear(Number(e.target.value))}>
              {valuationYears.map(y => <option key={y} value={y}>{y}.</option>)}
            </Select>
            <label className="field">
              <span>Kilometraža (km)</span>
              <input className="tabular" type="number" min={0} max={999999} step={1000} value={km} onChange={e => setKm(Number(e.target.value))} />
            </label>
            <Select label="Gorivo" value={fuel} onChange={e => {
              const nextFuel = e.target.value as SpecFuel;
              setFuel(nextFuel);
              if (nextFuel === "Električni") setCo2("0");
              else if (co2 === "0") setCo2("");
            }}>
              {valuationFuels.map(item => <option key={item}>{item}</option>)}
            </Select>
            <label className="field">
              <span>Snaga (kW)</span>
              <input className="tabular" type="number" min={20} max={1800} value={kw || ""} onChange={e => setKw(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Snaga (KS)</span>
              <input className="tabular" type="number" min={27} max={2450} value={ksValue || ""} onChange={e => setKw(ksToKw(Number(e.target.value)))} />
            </label>
            <Select label="Mjenjač" value={gear} onChange={e => setGear(e.target.value as (typeof gears)[number])}>
              {gears.map(item => <option key={item}>{item}</option>)}
            </Select>
            <Select label="Pogon" value={drive} onChange={e => setDrive(e.target.value)}>
              <option>Prednji</option>
              <option>Stražnji</option>
              <option>4×4</option>
            </Select>
            <label className="field">
              <span>CO₂ g/km (automatski: {autoCo2})</span>
              <input className="tabular" type="number" min={0} max={600} value={co2} onChange={e => setCo2(e.target.value)} placeholder={`Auto (${autoCo2} g/km)`} />
            </label>
            <label className="field">
              <span>Tražena cijena oglasa (€, neobavezno)</span>
              <input className="tabular" type="number" min={0} max={2000000} value={askingPrice} onChange={e => setAskingPrice(e.target.value)} placeholder="Usporedi oglas" />
            </label>
          </div>

          <fieldset className="filter-options valuation-checks">
            <legend>Povijest, porez i prodavač</legend>
            <div className="valuation-check-grid">
              <label><input type="checkbox" checked={cvh} onChange={e => setCvh(e.target.checked)} /> Potvrđeni km (CVH)</label>
              <label><input type="checkbox" checked={firstOwner} onChange={e => setFirstOwner(e.target.checked)} /> 1. vlasnik</label>
              <label><input type="checkbox" checked={serviceBook} onChange={e => setServiceBook(e.target.checked)} /> Servisna knjiga</label>
              <label><input type="checkbox" checked={dealer} onChange={e => setDealer(e.target.checked)} /> Verificirana autokuća</label>
              <label><input type="checkbox" checked={pdv} onChange={e => setPdv(e.target.checked)} /> Sustav PDV-a (R1)</label>
            </div>
          </fieldset>

          <MakeEquipmentOptions make={make} model={effectiveModel} selected={makeEquipment} onChange={setMakeEquipment} />

          {make && (
            <EquipmentSelector
              vehicle={{
                make,
                model: effectiveModel,
                generation,
                bodyType,
                fuel,
                variant: activeVariant,
                date: `${year}-06`,
                catalogEquipment,
              }}
              onChange={setCatalogEquipment}
            />
          )}

          <fieldset className="filter-options valuation-checks">
            <legend>Ključna oprema za procjenu</legend>
            <div className="valuation-check-grid">
              {extraOptions.map(option => (
                <label key={option}>
                  <input type="checkbox" checked={selectedExtras.includes(option)} onChange={() => toggleExtra(option)} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <aside className="valuation-results-col">
          <section className="detail-panel valuation-summary-card" aria-live="polite">
            <div className="valuation-head">
              <div>
                <span className="eyebrow">{[make || "Odabrano vozilo", effectiveModel, generation, activeVariant].filter(Boolean).join(" · ")}</span>
                <h2>Realna tržišna cijena u RH</h2>
              </div>
              {parsedAsking > 0 && <Rating tier={result.rating} />}
            </div>

            <div className="valuation-median">
              <strong className="tabular">{euro(result.fairMin)} – {euro(result.fairMax)}</strong>
              <span className="tabular">Realna tržišna vrijednost u RH: <b>{euro(result.medianMarketPrice)}</b> · Uzorak: <b>{result.sampleCount} sličnih oglasa</b></span>
              {deltaInfo && (
                <span className={"price-delta tabular " + deltaInfo.tone}>
                  Za {euro(parsedAsking)}: {deltaInfo.text} ({result.deltaPercent > 0 ? "+" : ""}{result.deltaPercent.toLocaleString("hr-HR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                </span>
              )}
            </div>

            <div className="price-scale price-scale-5" role="img" aria-label={`Tržišni raspon ${euro(result.fairMin)} – ${euro(result.fairMax)}`}>
              <div /><div /><div /><div /><div /><span style={{ left: pinLeft + "%" }} />
            </div>
            <div className="scale-labels">
              <span>Odlična</span>
              <span>Fer raspon</span>
              <span>Visoka</span>
            </div>

            <div className="valuation-tiers" aria-label="5 razina tržišne cijene">
              {priceTiers.map(tier => (
                <div key={tier.rank} className={`tier-row ${tier.tone}${activeTierRank === tier.rank ? " active" : ""}`}>
                  <span className="tier-name"><i className="tier-dot" aria-hidden="true" />{tier.label}</span>
                  <strong className="tabular">{tier.range}</strong>
                </div>
              ))}
            </div>

            <div className="valuation-factors-static">
              <h3>Detaljan izračun procjene</h3>
              <ul className="valuation-waterfall">
                {result.breakdown.map(row => (
                  <li key={row.id} className={row.isTotal ? "waterfall-total" : undefined}>
                    <div className="waterfall-label">
                      <span>{row.label}</span>
                      {row.detail && <small>{row.detail}</small>}
                    </div>
                    <strong className={"tabular " + (row.isTotal ? "total" : row.amountEur > 0 && row.id !== "base" ? "pos" : row.amountEur < 0 ? "neg" : "")}>
                      {row.id === "base" || row.isTotal
                        ? euro(row.amountEur)
                        : (row.amountEur > 0 ? "+" : row.amountEur < 0 ? "-" : "") + euro(Math.abs(row.amountEur))}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>

            {result.factors.length > 0 && (
              <div className="valuation-factors-static">
                <h3>Ključni faktori procjene</h3>
                <ul>
                  {result.factors.map(factor => (
                    <li key={factor.id}>
                      <span>{factor.label}</span>
                      <strong className={"tabular " + (factor.impactEur >= 0 ? "pos" : "neg")}>
                        {factor.impactEur >= 0 ? "+" : "-"}{euro(Math.abs(factor.impactEur))}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="detail-panel import-comparison-card" aria-label="Usporedba uvoza iz Njemačke">
            <div className="import-head">
              <h3><Info size={16} aria-hidden="true" /> Usporedba: Uvoz iz Njemačke + PPMV</h3>
            </div>
            <div className="valuation-metrics">
              <div>
                <span>Okvirna cijena na DE oglasnicima</span>
                <strong className="tabular">{euro(result.deEstimatedPriceEur)}</strong>
              </div>
              <div>
                <span>Procijenjeni PPMV (trošarina u RH)</span>
                <strong className="tabular">{euro(result.estimatedPpmvEur)}</strong>
              </div>
              <div>
                <span>Okvirna ukupna cijena s uvozom (DE + PPMV + unos)</span>
                <strong className="tabular">{euro(result.estimatedImportTotalEur)}</strong>
              </div>
              <div>
                <span>Očekivana kilometraža za godište i gorivo</span>
                <strong className="tabular">{number(result.expectedKm)} km</strong>
              </div>
            </div>
            <p className="import-note">
              {importDiff > 650
                ? `Samostalni uvoz iz DE s uračunatim PPMV-om (${euro(result.estimatedPpmvEur)}) i troškovima unosa (~850 €) može biti oko ${euro(importDiff)} povoljniji od prosjeka domaćih oglasa, ovisno o stanju vozila.`
                : `Uz procijenjeni PPMV (${euro(result.estimatedPpmvEur)}) i logistiku unosa (~850 €), kupnja registriranog vozila u Hrvatskoj cjenovno je vrlo bliska uvozu iz Njemačke.`}
            </p>
          </section>

          <section className="detail-panel valuation-matches" aria-label="Slična vozila u ponudi">
            <div className="valuation-matches-head">
              <h3>Vozila na AUTOPLAC.HR u ovom rasponu</h3>
              <span className="tabular">{matchingVehicles.length} prijedloga</span>
            </div>
            {matchingVehicles.length > 0 ? (
              <div className="similar-list">
                {matchingVehicles.map(item => (
                  <a key={item.id} className="similar-car" href={"?oglas=" + encodeURIComponent(item.id)} onClick={e => onOpenListing(e, item.id)}>
                    <VehiclePhoto photo={item.photos[0]} alt="" />
                    <div>
                      <h4>{item.title}</h4>
                      <span className="tabular">{registered(item.date)} • {number(item.km)} km • {item.city}</span>
                      <strong className="tabular">{euro(item.price)}</strong>
                    </div>
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="fine-print">Trenutačno nema aktivnih oglasa u ovom cjenovnom razredu.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
