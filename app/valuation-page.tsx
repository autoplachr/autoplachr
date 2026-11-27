"use client";

import { Checkbox } from "../src/components/Checkbox";
import { Calculator, ChevronRight, Info } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { bodyTypes, euro, gears, number, registered, type Vehicle } from "./catalog";
import { CatalogFields, customVariant, VariantField } from "./catalog-fields";
import { EquipmentSelector } from "./equipment-selector";
import { Rating, Select, VehiclePhoto } from "./ui";
import { ValuationAuditPanel } from "./valuation-audit";
import { FaqAccordion } from "./faq-accordion";
import {
  clampYearToRange,
  effectiveYearRange,
  generationRange,
  modelsFor,
  OTHER_GENERATION,
  OTHER_MODEL,
  validGeneration,
  variantsForSelection,
} from "../src/data/car-catalog";
import { describeMarketDelta } from "../src/lib/price-engine";
import { evaluateCalculatorPrice, readListingValuationParams } from "../src/lib/valuation-link";
import { calculateCo2, ksToKw, kwToKs, resolveVehicleSpecs, type SpecFuel } from "../src/lib/spec-resolver";
import { vehicleListingPath } from "../src/lib/seo";

const valuationFuels: readonly SpecFuel[] = ["Dizel", "Benzin", "Hibrid", "Plug-in hibrid", "Električni", "LPG"];

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
  const [bodyType, setBodyType] = useState<string>("Limuzina");
  const [year, setYear] = useState(2021);
  const [km, setKm] = useState(115000);
  const [kw, setKw] = useState(140);
  const [co2, setCo2] = useState<string>("");
  const [fuel, setFuel] = useState<SpecFuel>("Dizel");
  const [gear, setGear] = useState<(typeof gears)[number]>("Automatski");
  const [drive, setDrive] = useState("4×4");
  const [askingPrice, setAskingPrice] = useState("");
  const [catalogEquipment, setCatalogEquipment] = useState<string[]>([
    "eq:adaptivna led svjetla",
    "eq:bmw live cockpit professional",
    "eq:adaptivni tempomat",
  ]);
  const [linked, setLinked] = useState<ReturnType<typeof readListingValuationParams>>();
  const [edited, setEdited] = useState(false);
  const [warranty, setWarranty] = useState(false);
  const [cvh, setCvh] = useState(true);
  const [firstOwner, setFirstOwner] = useState(true);
  const [serviceBook, setServiceBook] = useState(true);
  const [pdv, setPdv] = useState(false);
  const [dealer, setDealer] = useState(true);
  const [showAllParameters, setShowAllParameters] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const linkedInput = readListingValuationParams(params);
    setLinked(linkedInput);
    const qMake = params.get("make")?.trim();
    if (!qMake) return;

    const qModelRaw = params.get("model")?.trim() ?? "";
    const catalogModels = modelsFor(qMake, false);
    const matchedModel = catalogModels.includes(qModelRaw) ? qModelRaw : (qModelRaw ? OTHER_MODEL : "");
    const effectiveM = matchedModel === OTHER_MODEL ? qModelRaw : matchedModel;

    const qGenRaw = params.get("gen")?.trim() ?? "";
    const matchedGen = effectiveM && validGeneration(qMake, effectiveM, qGenRaw) ? qGenRaw : "";

    const qYear = Number(params.get("year"));
    const span = effectiveYearRange(qMake, effectiveM, matchedGen, "", 1990);
    const resolvedYear = Number.isFinite(qYear) && qYear >= 1955 ? clampYearToRange(qYear, span) : span.yearTo;

    const qKm = Number(params.get("km"));
    const qKw = Number(params.get("kw"));
    const qFuelRaw = params.get("fuel") === "Struja" ? "Električni" : params.get("fuel")?.trim() ?? "";
    const matchedFuel = valuationFuels.includes(qFuelRaw as SpecFuel) ? (qFuelRaw as SpecFuel) : undefined;
    const qPrice = Number(params.get("price"));

    setMake(qMake);
    setModel(matchedModel);
    if (matchedModel === OTHER_MODEL) setCustomModel(qModelRaw);
    setGeneration(matchedGen);
    const linkedVariant = linkedInput?.variant || "";
    const custom = linkedVariant && !variantsForSelection(qMake, effectiveM, matchedGen, resolvedYear).includes(linkedVariant);
    setVariant(custom ? customVariant : linkedVariant);
    setCustomVersion(custom ? linkedVariant : "");
    setYear(resolvedYear);
    if (Number.isFinite(qKm) && qKm >= 0) setKm(qKm);
    if (Number.isFinite(qPrice) && qPrice > 0) setAskingPrice(String(qPrice));
    setCatalogEquipment(linkedInput?.catalogEquipment ?? []);

    const resolved = resolveVehicleSpecs({
      make: qMake,
      model: effectiveM,
      generation: matchedGen,
      year: resolvedYear,
      fuel: matchedFuel,
      kw: Number.isFinite(qKw) && qKw > 0 ? qKw : undefined,
    });
    setBodyType(linkedInput?.bodyType || resolved.bodyType);
    setFuel(matchedFuel ?? resolved.fuel);
    setKw(Number.isFinite(qKw) && qKw > 0 ? qKw : resolved.kw);
    const linkedGear = gears.find(value => value === linkedInput?.gear);
    if (linkedGear || resolved.gear) setGear(linkedGear ?? resolved.gear!);
    if (linkedInput?.drive || resolved.drive) setDrive(linkedInput?.drive || resolved.drive!);
    setCo2(linkedInput?.co2 === undefined ? "" : String(linkedInput.co2));
    if (linkedInput) {
      setCvh(linkedInput.flags?.includes("cvh") ?? false);
      setPdv(linkedInput.flags?.includes("pdv") ?? false);
      setWarranty(linkedInput.flags?.includes("jamstvo") ?? false);
      setDealer(linkedInput.dealer ?? false);
      setFirstOwner(linkedInput.firstOwner ?? false);
      setServiceBook(linkedInput.serviceBook ?? false);
    }
  }, []);

  const effectiveModel = model === OTHER_MODEL ? customModel.trim() || model : model;
  const activeVariant = variant === customVariant ? customVersion : variant;
  const parsedAsking = Number(askingPrice);

  const activeGenSpan = useMemo(
    () => (generation && generation !== OTHER_GENERATION ? generationRange(make, effectiveModel, generation) : undefined),
    [make, effectiveModel, generation],
  );
  const yearRange = useMemo(
    () => effectiveYearRange(make, effectiveModel, generation, variant === customVariant ? "" : variant, 1990),
    [make, effectiveModel, generation, variant],
  );
  const availableYears = useMemo(
    () => Array.from({ length: Math.max(1, yearRange.yearTo - yearRange.yearFrom + 1) }, (_, index) => yearRange.yearTo - index),
    [yearRange],
  );
  const effectiveYear = clampYearToRange(year, yearRange);

  const autoCo2 = useMemo(
    () =>
      calculateCo2({
        fuel,
        kw: Math.max(25, kw || 90),
        year: effectiveYear,
        date: `${effectiveYear}-06`,
        gear,
        drive,
        bodyType,
        variant: activeVariant,
      }),
    [fuel, kw, effectiveYear, gear, drive, bodyType, activeVariant],
  );

  function applySpecs(
    nextMake: string,
    nextModel: string,
    nextGen: string,
    nextVariant: string,
    nextYear = year,
    inferBody = true,
  ) {
    if (!nextMake || (!nextModel && !nextVariant)) return;
    const nextRange = effectiveYearRange(nextMake, nextModel, nextGen, nextVariant === customVariant ? "" : nextVariant, 1990);
    const snappedYear =
      (nextGen && nextGen !== OTHER_GENERATION) || nextVariant
        ? clampYearToRange(nextYear, nextRange)
        : nextYear;
    if (snappedYear !== year) setYear(snappedYear);

    const resolved = resolveVehicleSpecs({
      make: nextMake,
      model: nextModel,
      generation: nextGen,
      variant: nextVariant,
      year: snappedYear,
      bodyType: inferBody ? undefined : bodyType,
    });
    if (inferBody) setBodyType(resolved.bodyType);
    setFuel(resolved.fuel);
    setKw(resolved.kw);
    if (resolved.gear) setGear(resolved.gear);
    if (resolved.drive) setDrive(resolved.drive);
    setCo2("");
  }

  const result = useMemo(() => {
    const flags = (linked?.flags ?? []).filter(flag => !["cvh", "pdv", "jamstvo"].includes(flag));
    if (cvh) flags.push("cvh");
    if (pdv) flags.push("pdv");
    if (warranty) flags.push("jamstvo");
    return evaluateCalculatorPrice({
      ...linked,
      history: undefined,
      make: make || "Volkswagen",
      model: effectiveModel || "Golf",
      generation,
      variant: activeVariant,
      bodyType,
      year: effectiveYear,
      date: linked?.date?.startsWith(String(effectiveYear) + "-") ? linked.date : `${effectiveYear}-06`,
      km: Math.max(0, km || 0),
      kw: Math.max(25, kw || 90),
      co2: co2 !== "" ? Number(co2) : autoCo2,
      fuel,
      gear,
      drive,
      askingPrice: parsedAsking > 0 ? parsedAsking : undefined,
      catalogEquipment,
      flags,
      firstOwner,
      serviceBook,
      dealer,
      verified: dealer,
    }, edited ? undefined : linked);
  }, [
    make, effectiveModel, generation, activeVariant, bodyType, effectiveYear, km, kw, co2, autoCo2, fuel, gear, drive,
    parsedAsking, catalogEquipment, cvh, pdv, firstOwner, serviceBook, dealer, warranty, linked, edited,
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
    { rank: 0, label: "Top prilika", range: `≤ ${euro(result.excellentMax)}`, tone: "good-5" },
    { rank: 1, label: "Tržišna cijena", range: `${euro(result.excellentMax + 1)} – ${euro(result.fairMax)}`, tone: "fair-3" },
    { rank: 2, label: "Viši cjenovni rang", range: `${euro(result.fairMax + 1)} – ${euro(result.highMax)}`, tone: "high-2" },
    { rank: 3, label: "Bez javne oznake", range: `> ${euro(result.highMax)}`, tone: "high-1" },
  ] as const;
  const activeTierRank = parsedAsking > 0 ? result.rating.rank : 1;
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

  const ksValue = kw > 0 ? kwToKs(kw) : 0;

  return (
    <main className="shell valuation-shell max-w-[1380px] mx-auto px-4 sm:px-6 overflow-x-clip">
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

      <div className="valuation-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_410px] gap-6 items-start">
        <section className="detail-panel valuation-form-card min-w-0" aria-label="Parametri vozila za procjenu" onChangeCapture={() => setEdited(true)}>
          <h2>Podaci o vozilu</h2>
          <div className="form-grid">
            <CatalogFields
              allowCustom
              filterYear={effectiveYear}
              customModel={customModel}
              onCustomModelChange={nextCustom => {
                setCustomModel(nextCustom);
                if (nextCustom.trim().length >= 2) {
                  applySpecs(make, nextCustom.trim(), generation, "");
                }
              }}
              value={{ make, model, generation }}
              onChange={selection => {
                setLinked(undefined);
                setEdited(true);
                setMake(selection.make);
                setModel(selection.model);
                setGeneration(selection.generation);
                setVariant("");
                setCustomVersion("");
                setCatalogEquipment([]);
                const modelName = selection.model === OTHER_MODEL ? customModel.trim() : selection.model;
                applySpecs(selection.make, modelName, selection.generation, "");
              }}
            />
            <VariantField
              selection={{ make, model: effectiveModel, generation }}
              value={variant}
              filterYear={effectiveYear}
              onChange={nextVariant => {
                setEdited(true);
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
              {bodyTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </Select>
            <div className="field-stack">
              <Select
                label="Godište"
                className="numeric-select"
                value={String(effectiveYear)}
                onChange={e => {
                  const nextYear = Number(e.target.value);
                  setYear(nextYear);
                  const allowed = variantsForSelection(make, effectiveModel, generation, nextYear);
                  if (variant && variant !== customVariant && !allowed.includes(variant)) {
                    setVariant("");
                  }
                }}
              >
                {availableYears.map(y => <option key={y} value={y}>{y}.</option>)}
              </Select>
              {activeGenSpan && (
                <small className="field-hint tabular">
                  Raspon proizvodnje za odabranu generaciju: {yearRange.yearFrom}.–{yearRange.yearTo}.
                </small>
              )}
            </div>
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
              <label><Checkbox checked={cvh} onChange={e => setCvh(e.target.checked)} /> Potvrđeni km (CVH)</label>
              <label><Checkbox checked={firstOwner} onChange={e => setFirstOwner(e.target.checked)} /> 1. vlasnik</label>
              <label><Checkbox checked={serviceBook} onChange={e => setServiceBook(e.target.checked)} /> Servisna knjiga</label>
              <label><Checkbox checked={dealer} onChange={e => setDealer(e.target.checked)} /> Verificirana autokuća</label>
              <label><Checkbox checked={warranty} onChange={e => setWarranty(e.target.checked)} /> Pisano jamstvo 12 mj.</label>
              <label><Checkbox checked={pdv} onChange={e => setPdv(e.target.checked)} /> Sustav PDV-a (R1)</label>
            </div>
          </fieldset>

          {make && (
            <EquipmentSelector
              vehicle={{
                make,
                model: effectiveModel,
                generation,
                bodyType,
                fuel,
                variant: activeVariant,
                date: `${effectiveYear}-06`,
                catalogEquipment,
              }}
              onChange={items => { setEdited(true); setCatalogEquipment(items); }}
            />
          )}
        </section>

        <aside className="valuation-results-col min-w-0">
          <section className="detail-panel valuation-summary-card min-w-0" aria-live="polite">
            <div className="valuation-head">
              <div>
                <span className="eyebrow">{[make || "Odabrano vozilo", effectiveModel, generation, activeVariant].filter(Boolean).join(" · ")}</span>
                <h2>Realna tržišna cijena u RH</h2>
              </div>
              {parsedAsking > 0 && <Rating valuation={result} align="right" privateContext />}
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
                <h3>Glavni faktori procjene</h3>
                <ul>
                  {(showAllParameters ? result.factors : result.factors.slice(0, 4)).map(factor => (
                    <li key={factor.id}>
                      <span>{factor.label}</span>
                      <strong className={"tabular " + (factor.impactEur >= 0 ? "pos" : "neg")}>
                        {factor.impactEur >= 0 ? "+" : "-"}{euro(Math.abs(factor.impactEur))}
                      </strong>
                    </li>
                  ))}
                </ul>
                {(result.factors.length > 4 || result.auditFactors.length > 0) && (
                  <button
                    type="button"
                    className="valuation-factors-toggle"
                    aria-expanded={showAllParameters}
                    onClick={() => setShowAllParameters(value => !value)}
                  >
                    {showAllParameters ? "Sakrij dodatne parametre ↑" : "Prikaži sve parametre ↓"}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="detail-panel import-comparison-card" aria-label="Usporedba uvoza iz Njemačke">
            <div className="import-head">
              <h3><Info size={16} aria-hidden="true" /> Usporedba: Uvoz iz Njemačke + PPMV</h3>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--hover)] px-3 py-1">
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/70 last:border-b-0">
                <span className="text-left text-[12px] text-[var(--muted)]">Okvirna cijena na DE oglasnicima</span>
                <strong className="shrink-0 text-right font-semibold tabular-nums text-[13px] text-[var(--text)]">{euro(result.deEstimatedPriceEur)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/70 last:border-b-0">
                <span className="text-left text-[12px] text-[var(--muted)]">Procijenjeni PPMV (trošarina u RH)</span>
                <strong className="shrink-0 text-right font-semibold tabular-nums text-[13px] text-[var(--text)]">{euro(result.estimatedPpmvEur)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/70 last:border-b-0">
                <span className="text-left text-[12px] text-[var(--muted)]">Ukupno s uvozom (DE + PPMV)</span>
                <strong className="shrink-0 text-right font-semibold tabular-nums text-[13px] text-[var(--text)]">{euro(result.estimatedImportTotalEur)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/70 last:border-b-0">
                <span className="text-left text-[12px] text-[var(--muted)]">Očekivana kilometraža za godište i gorivo</span>
                <strong className="shrink-0 text-right font-semibold tabular-nums text-[13px] text-[var(--text)]">{number(result.expectedKm)} km</strong>
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
              <div className="flex flex-col gap-2">
                {matchingVehicles.map(item => (
                  <a
                    key={item.id}
                    className="group flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-800/90 bg-slate-50/60 dark:bg-zinc-900/50 hover:border-blue-500/50 transition-colors"
                    href={vehicleListingPath(item.id)}
                    onClick={e => onOpenListing(e, item.id)}
                  >
                    <div className="w-[96px] h-[64px] aspect-[3/2] shrink-0 rounded-md overflow-hidden">
                      <VehiclePhoto photo={item.photos[0]} alt="" sizes="96px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold truncate text-[var(--text)]">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 tabular">
                        {registered(item.date)} • {number(item.km)} km • {item.city}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <strong className="text-[14px] font-bold tabular-nums text-[var(--text)]">{euro(item.price)}</strong>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 shrink-0 transition-colors" aria-hidden="true" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="fine-print">Trenutačno nema aktivnih oglasa u ovom cjenovnom razredu.</p>
            )}
          </section>
        </aside>
      </div>

      {showAllParameters && <ValuationAuditPanel result={result} id="analiza-parametara" />}
      <FaqAccordion title="Česta pitanja o procjeni cijene i PPMV-u" />
    </main>
  );
}
