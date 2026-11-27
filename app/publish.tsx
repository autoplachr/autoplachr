"use client";

import { boostPlans, hasActiveBoost } from "./listing-boost";
import { MonthYearField } from "./month-year-field";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { bodyTypes, emptyEquipment, euro, gears, type Photo, type Vehicle } from "./catalog";
import { CatalogFields, customVariant, VariantField } from "./catalog-fields";
import {
  CAR_MAKES,
  clampYearToRange,
  effectiveYearRange,
  generationRange,
  modelsFor,
  OTHER_GENERATION,
  OTHER_MODEL,
  titleContainsChassis,
  variantsForSelection,
  validGeneration,
} from "../src/data/car-catalog";
import { LocationFields } from "./dealership-fields";
import { EquipmentSelector } from "./equipment-selector";
import { equipmentFor, equipmentId } from "../src/data/equipment-catalog";
import { Dialog, ListingOptions, Rating, Select, VehiclePhoto } from "./ui";
import { selectedMakeOptions } from "./make-equipment";
import { describeMarketDelta, evaluateMarketPrice, sellerAdvisoryText, timeToSellLine, VALUE_PROOFS } from "../src/lib/price-engine";
import { calculateCo2, ksToKw, kwToKs, resolveVehicleSpecs, toCatalogFuel, type SpecFuel } from "../src/lib/spec-resolver";
import { analyzeListingPhotos, orderImportedPhotos, prepareListingPhoto, type ListingAnalysis } from "./listing-analysis";
import { canonicalEquipmentLabels, equipmentCategoryFor, inferStandardEquipment, parseListingText } from "./search";
import { importClassifieds, type ImportedFacts } from "./classifieds-import";
import { croatianLocations, normalizeLocation } from "../src/data/croatia-locations";
import { sanitizeStringArray, sanitizeText } from "../src/lib/sanitize";
import type { ListingStatus } from "./account-api";

type Publish = Omit<Vehicle, "id" | "generation" | "variant" | "fuel"> & {
  generation: string;
  variant: string;
  fuel: SpecFuel;
};

const specFuels: readonly SpecFuel[] = ["Dizel", "Benzin", "Hibrid", "Plug-in hibrid", "Električni", "LPG"];
const carColors = [
  "Crna",
  "Bijela",
  "Srebrna",
  "Siva",
  "Tamno plava",
  "Plava",
  "Crvena",
  "Zelena",
  "Smeđa / Bež",
  "Narančasta",
  "Žuta",
] as const;
const colorFinishes = ["Metalik", "Obična", "Perla", "Mat"] as const;
const cylinderChoices = [0, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

const initial: Publish = {
  make: "", model: "", generation: "", variant: "", bodyType: "", title: "", trim: "", price: 0, date: "", km: 0, kw: 0, cc: 0, co2: 0, fuel: "Dizel",
  gear: "Automatski", drive: "Prednji", vin: "", city: "", seller: "", dealer: false, verified: false,
  phone: "+385 ", email: "", flags: [], photos: [], equipment: emptyEquipment(), makeEquipment: [],
};
const steps = ["Fotografije i AI prepoznavanje", "Tehnički podaci i oprema", "Cijena i objava"];

const labelKey = (label: string) => normalizeLocation(label).replace(/[^a-z0-9]+/g, "");

export default function PublishForm({ onClose, onPublish, existing, contact }: { onClose: () => void; onPublish: (v: Vehicle, status: ListingStatus, requestBoost: boolean) => Promise<void>; existing?: Vehicle & { status?: ListingStatus }; contact: { phone: string; email: string; city: string; postalCode?: string; county: string; name: string; type: string }; }) {
  const [step, setStep] = useState(0);
  const [requestBoost, setRequestBoost] = useState(false);
  const listingId = useRef(existing?.id);
  const [locationRevision, setLocationRevision] = useState(0);
  const existingFuel: SpecFuel = existing?.fuel === "Struja" ? "Električni" : (existing?.fuel ?? "Dizel");
  const [values, setValues] = useState<Publish>({
    ...initial,
    ...existing,
    fuel: existingFuel,
    generation: existing?.generation ?? "",
    variant: existing?.variant ?? "",
    bodyType: existing?.bodyType ?? "",
    seller: contact.name,
    city: existing?.city || contact.city,
    postalCode: existing?.postalCode || contact.postalCode,
    county: existing?.county || contact.county,
    phone: contact.phone,
    email: contact.email,
    dealer: contact.type === "dealer",
  });
  const [customModel, setCustomModel] = useState("");
  const [customVersion, setCustomVersion] = useState("");
  const [manualCo2, setManualCo2] = useState(Boolean(existing?.co2));
  const photoInfo = useRef(new WeakMap<Photo, { name: string; thumbnail: string }>());
  const photoRevision = useRef(0);
  const manualCover = useRef(Boolean(existing?.photos.length));
  const pendingScan = useRef<AbortController | null>(null);
  useEffect(() => () => pendingScan.current?.abort(), []);
  const [description, setDescription] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importFallback, setImportFallback] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [sourceDetails, setSourceDetails] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [importedSpecs, setImportedSpecs] = useState(false);
  const [aiSuggestedIds, setAiSuggestedIds] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ListingAnalysis | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [valueProofs, setValueProofs] = useState<string[]>([]);

  const set = <K extends keyof Publish>(key: K, value: Publish[K]) => setValues(old => ({ ...old, [key]: value }));

  const effectiveModel = values.model === OTHER_MODEL ? customModel.trim() || values.model : values.model;
  const activeVariant = values.variant === customVariant ? customVersion : values.variant;

  function applyResolvedSpecs(next: Publish, forceAll = false, inferBody = false) {
    const modelName = next.model === OTHER_MODEL ? customModel.trim() : next.model;
    const varName = next.variant === customVariant ? customVersion.trim() : next.variant;
    if (!next.make || (!modelName && !varName)) return next;

    const span = effectiveYearRange(next.make, modelName, next.generation, varName);
    let nextDate = next.date;
    if (next.date && /^\d{4}/.test(next.date) && (next.generation && next.generation !== OTHER_GENERATION || varName)) {
      const currentY = Number(next.date.slice(0, 4));
      const snappedY = clampYearToRange(currentY, span);
      if (snappedY !== currentY) {
        const monthPart = next.date.slice(4);
        nextDate = `${snappedY}${monthPart}`;
      }
    }

    const resolved = resolveVehicleSpecs({
      make: next.make,
      model: modelName,
      generation: next.generation,
      variant: varName,
      title: next.title,
      date: nextDate,
      fuel: forceAll ? undefined : next.fuel,
      kw: forceAll ? undefined : next.kw,
      cc: forceAll ? undefined : next.cc,
      gear: forceAll ? undefined : next.gear,
      drive: forceAll ? undefined : next.drive,
      bodyType: inferBody ? undefined : next.bodyType,
    });
    return {
      ...next,
      date: nextDate,
      bodyType: inferBody || !next.bodyType ? resolved.bodyType : next.bodyType,
      fuel: forceAll ? resolved.fuel : next.fuel,
      kw: forceAll || !next.kw ? resolved.kw : next.kw,
      cc: forceAll || !next.cc ? resolved.cc : next.cc,
      gear: forceAll && resolved.gear ? resolved.gear : next.gear,
      drive: forceAll && resolved.drive ? resolved.drive : next.drive,
      co2: manualCo2 && !forceAll ? next.co2 : calculateCo2({
        fuel: forceAll ? resolved.fuel : next.fuel,
        kw: forceAll || !next.kw ? resolved.kw : next.kw,
        cc: forceAll || !next.cc ? resolved.cc : next.cc,
        date: nextDate,
        gear: forceAll && resolved.gear ? resolved.gear : next.gear,
        drive: forceAll && resolved.drive ? resolved.drive : next.drive,
        bodyType: inferBody || !next.bodyType ? resolved.bodyType : next.bodyType,
        variant: varName,
        title: next.title,
      }),
    };
  }

  function updateSpecField<K extends keyof Publish>(key: K, value: Publish[K]) {
    setValues(old => {
      const next: Publish = { ...old, [key]: value };
      if (key === "fuel" && value === "Struja") {
        next.cc = 0;
        next.co2 = 0;
        return next;
      }
      if (!manualCo2) {
        next.co2 = calculateCo2({
          fuel: next.fuel,
          kw: next.kw,
          cc: next.cc,
          date: next.date,
          gear: next.gear,
          drive: next.drive,
          bodyType: next.bodyType,
          variant: next.variant === customVariant ? customVersion : next.variant,
          title: next.title,
        });
      }
      return next;
    });
  }

  function importEquipment(labels: string[]) {
    const canonical = canonicalEquipmentLabels(labels);
    setSuggestions(old => [...new Map([...old, ...canonical].map(label => [labelKey(label), label])).values()]);
    setSelectedSuggestions(old => [...new Set([...old, ...canonical.map(labelKey)])]);
    const ids = canonical.map(equipmentId);
    setAiSuggestedIds(old => [...new Set([...old, ...ids])]);
    setValues(old => ({ ...old, catalogEquipment: [...new Set([...(old.catalogEquipment ?? []), ...ids])] }));
  }

  function applyFacts(facts: ListingAnalysis & Partial<Pick<ImportedFacts, "title" | "description" | "drive" | "vin" | "city" | "generation" | "doors" | "seats" | "ownership">>) {
    const inferred = parseListingText([facts.make, facts.model, facts.variant].filter(Boolean).join(" "));
    const make = CAR_MAKES.find(make => labelKey(make) === labelKey(facts.make || inferred.make || "")) || values.make;
    const availableModels = modelsFor(make, false);
    const modelName = facts.model || inferred.model;
    const modelMatch = modelName && availableModels.find(model => labelKey(model) === labelKey(modelName));
    const model = modelMatch || (modelName && make ? OTHER_MODEL : make === values.make ? values.model : "");
    const sameVehicle = make === values.make && model === values.model;
    const generation = facts.generation && validGeneration(make, model, facts.generation) ? facts.generation : sameVehicle ? values.generation : "";
    const year = facts.year && facts.year >= 1955 && facts.year <= new Date().getFullYear() ? facts.year : undefined;
    const variants = variantsForSelection(make, model, generation, year);
    const variantName = facts.variant || inferred.variant;
    const variant = variantName
      ? variants.find(item => labelKey(item) === labelKey(variantName)) || customVariant
      : sameVehicle ? values.variant : "";
    if (model === OTHER_MODEL && modelName) setCustomModel(modelName);
    if (variant === customVariant && variantName) setCustomVersion(variantName);
    const color = carColors.find(item => labelKey(item) === labelKey(facts.color ?? ""))
      ?? parseListingText(facts.color ?? "").color;
    const bodyType = bodyTypes.find(item => labelKey(item) === labelKey(facts.bodyType ?? ""));
    const fuel = specFuels.find(item => labelKey(item) === labelKey(facts.fuel || inferred.fuel || ""));
    const cylinders = cylinderChoices.find(item => item === (facts.cylinders ?? inferred.cylinders));
    // Njuškalo reports raw gearbox names ("Mehanički mjenjač", "Automatski sekvencijski") — map them to the form values.
    const rawGear = String(facts.gear ?? inferred.gear ?? "");
    const gearName = /\bmehani|manual|ru[cč]n/i.test(rawGear) ? "Ručni"
      : /\bautomat|sekv|steptronic|s.?tronic|dsg|pdk|cvt|edc|tiptronic/i.test(rawGear) ? "Automatski" : rawGear;
    const gear = gears.find(item => labelKey(item) === labelKey(gearName));
    setImportedSpecs(true);
    setValues(old => {
      const next = {
        ...old, make, model, generation, variant,
        date: facts.firstRegistration ?? (year && Number(old.date.slice(0, 4)) !== year ? String(year) + "-" : old.date),
        title: facts.title?.slice(0, 80) || old.title || (make && modelName ? [make, modelName, variantName].filter(Boolean).join(" ").slice(0, 80) : ""),
        km: facts.km ?? old.km, kw: facts.kw ?? old.kw, cc: facts.cc ?? old.cc, price: facts.price ?? old.price,
        registrationUntil: facts.registrationUntil ?? old.registrationUntil,
        sellerNote: facts.description || old.sellerNote,
        drive: facts.drive ?? old.drive,
        vin: facts.vin && /^[A-HJ-NPR-Z0-9]{17}$/i.test(facts.vin) ? facts.vin.toUpperCase() : old.vin,
        ...(() => {
          if (!facts.city) return {};
          const city = facts.city.split(/[,;]/).map(labelKey);
          const location = croatianLocations.find(place => city.includes(labelKey(place.city)))
            ?? croatianLocations.find(place => labelKey(facts.city ?? "").includes(labelKey(place.city)));
          if (location) setLocationRevision(revision => revision + 1);
          return location ? { city: location.city, county: location.county, postalCode: location.postalCode } : {};
        })(),
        color: color ?? old.color, bodyType: bodyType ?? old.bodyType,
        doors: facts.doors ?? old.doors, seats: facts.seats ?? old.seats, ownership: facts.ownership ?? old.ownership,
        fuel: fuel ?? old.fuel, gear: gear ?? old.gear, cylinders: cylinders ?? old.cylinders,
      };
      return { ...next, co2: manualCo2 ? old.co2 : calculateCo2(next) };
    });
    // Baseline factory equipment (ABS, airbags, ESP…) follows the year/segment:
    // fill the 4-column equipment and check the matching Step 2 catalog boxes.
    const inferredStandard = inferStandardEquipment({ year, make, gear: facts.gear, fuel: facts.fuel, text: facts.description });
    if (inferredStandard.length) {
      const inferredIds = inferredStandard.map(equipmentId);
      setAiSuggestedIds(old => [...new Set([...old, ...inferredIds])]);
      setValues(old => {
        const equipment = { ...old.equipment };
        for (const label of inferredStandard) {
          const category = equipmentCategoryFor(label);
          if (!(equipment[category] ?? []).some(item => item.toLowerCase() === label.toLowerCase())) {
            equipment[category] = [...(equipment[category] ?? []), label];
          }
        }
        return { ...old, equipment, catalogEquipment: [...new Set([...(old.catalogEquipment ?? []), ...inferredIds])] };
      });
    }
  }

  async function importFromClassifieds(paste = false) {
    setBusy(true);
    setError("");
    setImportStatus("Preuzimanje podataka…");
    setSourceDetails("");
    pendingScan.current?.abort();
    setScanning(false);
    setAnalysis(null);
    setAiSummary("");
    try {
      const result = await importClassifieds(paste ? { rawContent: description } : { url: importUrl.trim() });
      if (result.blocked) {
        setImportStatus(result.message ?? "");
        setImportFallback(true);
        return;
      }
      const data = result.vehicle;
      if (!data || (!data.make && !data.model && !data.price && !data.year && !data.equipment.length)) {
        throw new Error("Nisu pronađeni podaci o vozilu.");
      }
      applyFacts(data);
      importEquipment(data.equipment);
      const grouped = (data as ImportedFacts & { equipmentByCategory?: Record<string, string[]> }).equipmentByCategory;
      if (grouped) {
        const keys = [
          ["Sigurnost i asistencije", "Sigurnost"], ["Udobnost i interijer", "Udobnost"],
          ["Multimedija i navigacija", "Multimedija"], ["Eksterijer i ovjes", "Eksterijer"],
        ] as const;
        setValues(old => ({
          ...old,
          equipment: Object.fromEntries(keys.map(([source, target]) => [target,
            [...new Set([...(old.equipment[target] ?? []), ...(grouped[source] ?? [])])].slice(0, 40),
          ])) as typeof old.equipment,
        }));
      }
      if (result.photos?.length) {
        photoRevision.current++;
        manualCover.current = true;
        const photos = await orderImportedPhotos([...result.photos], {
          bannerOnFirst: result.bannerOnFirst,
          bestCoverIndex: result.bestCoverIndex,
        });
        set("photos", photos);
      }
      setImportFallback(false);
      setSourceDetails([data.seller, data.city, data.condition].filter(Boolean).join(" · "));
      const count = result.photos?.length ?? 0;
      const expected = result.requestedPhotos ?? 0;
      setImportStatus((expected ? "Preuzeto " + count + "/" + expected + " slika. " : "") +
        (data.equipment.length ? "Izvučena oprema i podaci vozila." : "Izvučeni podaci vozila.") +
        (result.storageMisses ? " Dio slika nije spremljen u Supabase Storage." : ""));
    } catch (problem) {
      setImportFallback(true);
      setImportStatus(problem instanceof Error ? problem.message : "Uvoz nije uspio.");
    } finally { setBusy(false); }
  }

  function extractDescription() {
    const { equipment, ...facts } = parseListingText(description);
    const found = Object.values(facts).some(value => value !== undefined) || equipment.length > 0;
    setAiSummary(found ? "Podaci iz opisa uneseni su u obrazac. Provjerite ih prije objave." : "U opisu nisu pronađeni podaci za popunjavanje.");
    if (!found) return;
    applyFacts(facts);
    importEquipment(equipment);
  }

  async function runPhotoScan(photos: Photo[]) {
    if (!photos.length) return;
    pendingScan.current?.abort();
    const controller = new AbortController();
    pendingScan.current = controller;
    const revision = photoRevision.current;
    setScanning(true);
    setAiApplied(false);
    setAnalysis(null);
    setAiSummary("");
    try {
      const inputs = photos.map(photo => {
        const info = photoInfo.current.get(photo);
        return { photo, src: info?.thumbnail ?? photo.src, name: info?.name };
      }).filter(input => /^data:image\/(?:jpeg|png|webp);base64,/.test(input.src));
      const result = await analyzeListingPhotos(inputs.map(({ src, name }) => ({ src, name })), description, controller.signal);
      if (controller.signal.aborted) return;
      const { equipment = [], source, bestCoverIndex, ...facts } = result;
      if (!manualCover.current && revision === photoRevision.current && bestCoverIndex !== undefined) {
        const cover = inputs[bestCoverIndex]?.photo;
        if (cover) setValues(old => old.photos.includes(cover)
          ? { ...old, photos: [cover, ...old.photos.filter(photo => photo !== cover)] } : old);
      }
      if (Object.values(facts).some(value => value !== undefined)) setAnalysis(facts);
      importEquipment(equipment);
      setAiSummary(source === "vision"
        ? "Analiza fotografija je dovršena. Provjerite predložene podatke i opremu."
        : "Vizualna analiza nije dostupna. Prikazani su podaci pronađeni u nazivima datoteka ili opisu.");
    } finally {
      if (!controller.signal.aborted) setScanning(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const queued = Array.from(files).slice(0, 6 - values.photos.length);
      if (queued.some(file => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 15_000_000)) throw new Error("Invalid image");
      const prepared = await Promise.all(queued.map(prepareListingPhoto));
      const ordered = values.photos.length ? prepared : [...prepared].sort((a, b) => b.score - a.score);
      ordered.forEach(({ photo, name, thumbnail }) => photoInfo.current.set(photo, { name, thumbnail }));
      const nextPhotos = [...values.photos, ...ordered.map(item => item.photo)];
      photoRevision.current++;
      set("photos", nextPhotos);
      void runPhotoScan(nextPhotos);
    } catch { setError("Odaberite JPG, PNG, AVIF ili WebP fotografije do 15 MB."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 2) { event.currentTarget.closest("dialog")?.scrollTo(0, 0); setStep(step + 1); return; }
    if (!values.demo && !/^\+?[\d\s()\-]{8,24}$/.test(values.phone.trim()) || !values.demo && values.phone.replace(/\D/g, "").length < 8) {
      setError("Unesite ispravan telefonski broj."); return;
    }
    if (!values.demo && values.dealer && !values.seller.trim()) { setError("Unesite naziv autokuće."); return; }
    setBusy(true);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === "draft" ? "draft" : existing?.status === "sold" ? "sold" : "active";
    try {
      const title = sanitizeText(values.title, 100);
      // Checked Step 3 value proofs are appended to the seller notes as highlights.
      const proofLabels = VALUE_PROOFS.filter(proof => valueProofs.includes(proof.id))
        .map(proof => `${proof.label} (+${proof.bonusEur} €)`);
      const proofSuffix = proofLabels.length
        ? `${values.sellerNote?.trim() ? "\n" : ""}Dokazi vrijednosti: ${proofLabels.join(", ")}.`
        : "";
      const location = Object.fromEntries(new FormData(event.currentTarget));
      const finalModel = sanitizeText(values.model === OTHER_MODEL ? customModel : values.model, 80);
      const finalVariant = sanitizeText(values.variant === customVariant ? customVersion : values.variant, 100);
      const vehicleForEquip = { ...values, model: finalModel, variant: finalVariant };
      const sanitizedEquipment: typeof values.equipment = {
        Sigurnost: [], Udobnost: [], Multimedija: [], Eksterijer: [],
      };
      const addEquipment = (raw: string, preferred?: keyof typeof values.equipment) => {
        const cleanLabel = sanitizeText(raw, 100);
        if (!cleanLabel) return;
        const canonical = canonicalEquipmentLabels([cleanLabel])[0] ?? cleanLabel;
        const category = preferred ?? equipmentCategoryFor(canonical);
        if (!sanitizedEquipment[category].some(item => item.toLowerCase() === canonical.toLowerCase())) {
          sanitizedEquipment[category].push(canonical);
        }
      };
      // Keep the 4 canonical categories computed during import / AI analysis.
      for (const [category, items] of Object.entries(values.equipment) as Array<[keyof typeof values.equipment, string[]]>) {
        items.forEach(item => addEquipment(item, category));
      }
      const selectedCatalog = equipmentFor(vehicleForEquip);
      for (const label of suggestions) {
        if (!selectedSuggestions.includes(labelKey(label))) continue;
        if (selectedCatalog.some(item => item.id === equipmentId(label))) continue;
        addEquipment(label);
      }
      for (const id of values.catalogEquipment ?? []) {
        const match = selectedCatalog.find(item => item.id === id);
        if (match) addEquipment(match.label);
      }
      await onPublish({
        ...values,
        model: finalModel,
        fuel: toCatalogFuel(values.fuel),
        bodyType: sanitizeText(values.bodyType, 40) || undefined,
        city: sanitizeText(location.city, 100),
        postalCode: sanitizeText(location.postalCode, 20),
        county: sanitizeText(location.county, 100),
        title: !values.generation || titleContainsChassis(title, values.generation) ? title : sanitizeText(title + " (" + values.generation + ")", 100),
        trim: sanitizeText(values.trim, 100),
        sellerNote: sanitizeText((values.sellerNote ?? "") + proofSuffix, 12000, true),
        variant: finalVariant,
        seller: sanitizeText(values.seller, 100),
        email: sanitizeText(values.email, 254),
        phone: sanitizeText(values.phone, 40),
        equipment: sanitizedEquipment,
        id: listingId.current ??= crypto.randomUUID(),
        demo: false,
        catalogEquipment: equipmentFor(vehicleForEquip).filter(item => values.catalogEquipment?.includes(item.id)).map(item => item.id),
      }, action, action === "active" && requestBoost);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Oglas nije spremljen."); }
    finally { setBusy(false); }
  }

  function numeric(label: string, key: "price" | "km" | "kw" | "cc" | "co2", min = 0, max = 1000000) {
    return <label className="field"><span>{label}</span><input required className="tabular" type="number" min={min} max={max} value={min ? values[key] || "" : values[key]} onChange={event => {
      const num = Number(event.target.value);
      if (key === "co2") setManualCo2(true);
      updateSpecField(key, num);
    }} placeholder={min ? undefined : "0"} /></label>;
  }

  const { valuation, baseMedianPrice } = useMemo(() => {
    if (!values.make || !effectiveModel) return { valuation: null as ReturnType<typeof evaluateMarketPrice> | null, baseMedianPrice: 0 };
    const input = {
      make: values.make,
      model: effectiveModel,
      generation: values.generation,
      variant: activeVariant,
      bodyType: values.bodyType,
      title: values.title,
      trim: values.trim,
      date: values.date,
      km: values.km,
      kw: values.kw,
      co2: values.co2,
      fuel: values.fuel,
      gear: values.gear,
      drive: values.drive,
      askingPrice: values.price > 0 ? values.price : undefined,
      equipment: values.equipment,
      makeEquipment: values.makeEquipment,
      catalogEquipment: values.catalogEquipment,
      flags: values.flags,
      history: values.history,
      dealer: contact.type === "dealer",
      verified: contact.type === "dealer",
    };
    const base = evaluateMarketPrice(input);
    // Checked value proofs lift the live fair range in real time.
    const withProofs = valueProofs.length ? evaluateMarketPrice({ ...input, valueProofs }) : base;
    return { valuation: withProofs, baseMedianPrice: base.medianMarketPrice };
  }, [values, effectiveModel, activeVariant, contact.type, valueProofs]);
  const liveDelta = valuation && values.price > 0 ? describeMarketDelta(valuation.deltaEur, valuation.deltaPercent, euro) : null;
  const now = new Date();
  const maxMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const ksValue = values.kw > 0 ? kwToKs(values.kw) : 0;
  const selectedYearNum = /^\d{4}/.test(values.date) ? Number(values.date.slice(0, 4)) : undefined;
  const activeGenSpan =
    values.generation && values.generation !== OTHER_GENERATION
      ? generationRange(values.make, effectiveModel, values.generation)
      : undefined;
  const activeDateSpan = effectiveYearRange(values.make, effectiveModel, values.generation, activeVariant, 1980);
  const dateHelper = activeGenSpan
    ? `Raspon proizvodnje za odabranu generaciju: ${activeDateSpan.yearFrom}.–${activeDateSpan.yearTo}.`
    : undefined;

  function changePhotoOrder(index: number, target?: number) {
    if (busy || (target !== undefined && (target < 0 || target >= values.photos.length))) return;
    photoRevision.current++;
    manualCover.current = target !== undefined || index !== 0 || values.photos.length > 1;
    setValues(old => {
      const photos = [...old.photos];
      const [photo] = photos.splice(index, 1);
      if (target !== undefined && photo) photos.splice(target, 0, photo);
      return { ...old, photos };
    });
  }

  const catalogItems = equipmentFor({ ...values, model: effectiveModel, variant: activeVariant });
  const suggestionChips = suggestions.length > 0 && (
    <div className="ai-chip-row" role="group" aria-label="Oprema iz analize i opisa">
      {suggestions.map(label => {
        const id = equipmentId(label);
        const key = labelKey(label);
        const known = catalogItems.some(item => item.id === id);
        const active = known ? Boolean(values.catalogEquipment?.includes(id)) : selectedSuggestions.includes(key);
        return <button key={key} type="button" className={"ai-chip" + (active ? " active" : "")} aria-pressed={active} onClick={() => {
          setSelectedSuggestions(old => active ? old.filter(item => item !== key) : [...old, key]);
          setValues(old => ({
            ...old,
            catalogEquipment: active ? old.catalogEquipment?.filter(item => item !== id) : [...new Set([...(old.catalogEquipment ?? []), id])],
          }));
        }}>
          {active && <Check size={15} aria-hidden="true"/>}{label}
        </button>;
      })}
    </div>
  );

  const photoAiSection = (
    <div className="flex flex-col gap-3">
      <section className="publish-url-import form-stack" aria-label="Uvoz oglasa">
        <label className="field">
          <span>Uvezi s Njuškalo linka</span>
          <input type="url" disabled={busy} value={importUrl} maxLength={2048}
            onChange={event => setImportUrl(event.target.value)}
            placeholder="Zalijepi link oglasa s Njuškala (npr. https://www.njuskalo.hr/auti/...)" />
        </label>
        <button type="button" className="btn primary self-start" disabled={busy || !importUrl.trim()} onClick={() => void importFromClassifieds()}>
          Uvezi sve podatke i slike
        </button>
        {importStatus && <p className="tabular-nums text-[13px]" role="status">{importStatus}</p>}
        {sourceDetails && <p className="text-[13px] text-[var(--muted)]">{sourceDetails}</p>}
      </section>
      <details className="publish-paste" open={importFallback || undefined}>
        <summary>Zalijepi opis oglasa (npr. s Njuškala) za automatsko popunjavanje</summary>
        <div className="form-stack">
          <label className="field">
            <span>Opis oglasa</span>
            <textarea rows={5} maxLength={150000} value={description} onChange={event => setDescription(event.target.value)} />
          </label>
          <button type="button" className="btn secondary self-start" onClick={() => importFallback || /<\w|osnovne informacije/i.test(description) ? void importFromClassifieds(true) : extractDescription()} disabled={busy || !description.trim()}>
            Izvuci podatke iz teksta
          </button>
        </div>
      </details>
      <label className="file-field rounded-lg border border-dashed border-[var(--border-hover)] bg-[var(--hover)] px-3 py-2.5 tabular-nums">
        <ImagePlus size={19}/>
        <span>Fotografije vozila ({values.photos.length}/{values.photos.length > 6 ? 20 : 6})</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || values.photos.length >= 6} onChange={event => { void addPhotos(event.target.files); event.target.value = ""; }} />
      </label>
      {values.photos.length > 0 && <div className="publish-photos">
        {values.photos.map((photo, index) => {
          const label = "Fotografija " + (index + 1);
          const picture = <VehiclePhoto photo={photo} alt={label}/>;
          return <div className="publish-photo" key={index}>
            {index === 0
              ? <div className="publish-thumbnail">{picture}<span className="publish-cover">Naslovna</span></div>
              : <button type="button" className="publish-thumbnail" disabled={busy} title="Postavi kao naslovnu"
                  aria-label={label + " · Postavi kao naslovnu"} onClick={() => changePhotoOrder(index, 0)}>{picture}</button>}
            <div className="publish-photo-actions">
              <button type="button" disabled={busy || index === 0} title="Pomakni lijevo" aria-label={label + " · Pomakni lijevo"} onClick={() => changePhotoOrder(index, index - 1)}><ArrowLeft size={17}/></button>
              <button type="button" disabled={busy || index === values.photos.length - 1} title="Pomakni desno" aria-label={label + " · Pomakni desno"} onClick={() => changePhotoOrder(index, index + 1)}><ArrowRight size={17}/></button>
              <button type="button" disabled={busy} title="Ukloni fotografiju" aria-label={label + " · Ukloni"} onClick={() => changePhotoOrder(index)}><X size={17}/></button>
            </div>
          </div>;
        })}
      </div>}
      {(scanning || aiSummary || values.photos.length > 0) && (
        <section className="ai-scanner-card" aria-label="AI prepoznavanje vozila i opreme">
          <div className="ai-scanner-head">
            <div>
              <span className="eyebrow"><Camera size={14}/> AI prepoznavanje vozila i opreme</span>
              <p className="text-[13px] text-[var(--spec)] mt-1" role="status">{scanning ? "Analiziram fotografije…" : aiSummary}</p>
            </div>
            {values.photos.length > 0 && <button type="button" className="btn secondary" disabled={scanning || busy} onClick={() => void runPhotoScan(values.photos)}>Analiziraj fotografije</button>}
          </div>
          {!scanning && analysis && <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold tabular-nums">{[analysis.make, analysis.model, analysis.variant, analysis.bodyType, analysis.color, analysis.year, analysis.km === undefined ? undefined : analysis.km.toLocaleString("hr-HR") + " km", analysis.kw && analysis.kw + " kW", analysis.cylinders && analysis.cylinders + " cilindara", analysis.price && euro(analysis.price)].filter(Boolean).join(" · ")}</p>
            <button type="button" className="btn primary" disabled={aiApplied} onClick={() => { applyFacts(analysis); setAiApplied(true); }}>
              {aiApplied ? "Podaci primijenjeni" : "Primijeni pronađene podatke"}
            </button>
          </div>}
        </section>
      )}
      {suggestionChips}
    </div>
  );

  return <Dialog title={existing ? "Uredi oglas" : "Predaj oglas"} onClose={onClose} variant="form-dialog publish-dialog" progress={
    <ol className="steps">{steps.map((label, index) => <li className={index === step ? "current" : index < step ? "complete" : ""} key={label} aria-current={index === step ? "step" : undefined}><span className="tabular">{index < step ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
  }>
    <div className="dialog-content">
      <form className="form-stack" onSubmit={submit}>
        {step === 0 && photoAiSection}
        {step === 1 && <>
          <div className="form-grid">
          <CatalogFields
            listing
            allowCustom
            filterYear={selectedYearNum}
            customModel={customModel}
            onCustomModelChange={nextCustom => {
              setCustomModel(nextCustom);
              setManualCo2(false);
            }}
            value={values}
            onChange={selection => {
              const keepImported = importedSpecs && selection.make === values.make && selection.model === values.model;
              if (!keepImported) setImportedSpecs(false);
              if (!keepImported) setCustomVersion("");
              setManualCo2(false);
              setValues(old => applyResolvedSpecs({
                ...old,
                ...selection,
                variant: keepImported ? old.variant : "",
                makeEquipment: selectedMakeOptions(selection.make, selection.model, old.makeEquipment ?? []),
              }, !keepImported, !keepImported));
            }}
          />
          <VariantField
            selection={values}
            value={values.variant}
            filterYear={selectedYearNum}
            onChange={variant => {
              setManualCo2(false);
              setValues(old => applyResolvedSpecs({ ...old, variant }, !importedSpecs && variant !== customVariant, !importedSpecs));
            }}
          />
          {values.variant === customVariant && (
            <label className="field span-all">
              <span>Unesite motorizaciju / verziju</span>
              <input
                value={customVersion}
                required
                pattern=".*\S.*"
                maxLength={70}
                placeholder="npr. 2.0 TDI 110 kW, 1.9 JTD, 52 kWh..."
                onChange={event => {
                  const val = event.target.value;
                  setCustomVersion(val);
                  if (val.trim().length >= 3) {
                    const resolved = resolveVehicleSpecs({
                      make: values.make,
                      model: effectiveModel,
                      generation: values.generation,
                      variant: val,
                      date: values.date,
                      bodyType: values.bodyType,
                    });
                    setValues(old => ({
                      ...old,
                      fuel: resolved.fuel,
                      kw: resolved.kw,
                      cc: resolved.cc,
                      co2: manualCo2 ? old.co2 : resolved.co2,
                      gear: resolved.gear ?? old.gear,
                      drive: resolved.drive ?? old.drive,
                    }));
                  }
                }}
              />
            </label>
          )}
          <Select label="Karoserija" value={values.bodyType ?? ""} required onChange={event => updateSpecField("bodyType", event.target.value)}>
            <option value="">Odaberite karoseriju</option>
            {bodyTypes.map(bt => <option key={bt}>{bt}</option>)}
          </Select>
          <MonthYearField
            value={values.date}
            max={maxMonth}
            minYear={activeDateSpan.yearFrom}
            maxYear={activeDateSpan.yearTo}
            helperText={dateHelper}
            onChange={date => {
              const y = /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : undefined;
              setValues(old => {
                const allowedVariants = variantsForSelection(old.make, effectiveModel, old.generation, y);
                const keepVariant =
                  !old.variant ||
                  old.variant === customVariant ||
                  allowedVariants.includes(old.variant);
                const next = { ...old, date, variant: keepVariant ? old.variant : "" };
                if (!manualCo2) {
                  next.co2 = calculateCo2({
                    fuel: next.fuel,
                    kw: next.kw,
                    cc: next.cc,
                    date: next.date,
                    gear: next.gear,
                    drive: next.drive,
                    bodyType: next.bodyType,
                    variant: next.variant === customVariant ? customVersion : next.variant,
                    title: next.title,
                  });
                }
                return next;
              });
            }}
          />
          <label className="field"><span>Registriran do (MM/GGGG)</span><input className="tabular" placeholder="12/2026" maxLength={7} pattern="(0[1-9]|1[0-2])/[0-9]{4}" value={values.registrationUntil ?? ""} onChange={event => set("registrationUntil", event.target.value)} /></label>
          <label className="field span-all"><span>Naslov oglasa</span><input value={values.title} onChange={event => set("title", event.target.value)} maxLength={80} pattern=".*\S.*" required placeholder="npr. Audi A4 35 TDI S-Line" /></label>
          {numeric("Kilometraža (km)", "km")}
          {numeric("Obujam (cm³)", "cc", 0, 30000)}
          <label className="field">
            <span>Snaga (kW)</span>
            <input
              required
              className="tabular"
              type="number"
              min={1}
              max={2000}
              value={values.kw || ""}
              onChange={event => updateSpecField("kw", Number(event.target.value))}
              placeholder="npr. 110"
            />
          </label>
          <label className="field">
            <span>Snaga (KS)</span>
            <input
              className="tabular"
              type="number"
              min={1}
              max={2720}
              value={ksValue || ""}
              onChange={event => updateSpecField("kw", ksToKw(Number(event.target.value)))}
              placeholder="npr. 150"
            />
          </label>
          {numeric("CO₂ (g/km)", "co2", 0, 999)}
          <Select label="Gorivo" value={values.fuel} onChange={event => {
            setManualCo2(false);
            updateSpecField("fuel", event.target.value as SpecFuel);
          }}>
            {specFuels.map(fuel => <option key={fuel}>{fuel}</option>)}
          </Select>
          <Select label="Mjenjač" value={values.gear} onChange={event => updateSpecField("gear", event.target.value as Vehicle["gear"])}>{gears.map(gear => <option key={gear}>{gear}</option>)}</Select>
          <Select label="Pogon" value={values.drive} onChange={event => updateSpecField("drive", event.target.value)}><option>Prednji</option><option>Stražnji</option><option>4×4</option></Select>
          <Select
            label="Broj cilindara"
            value={values.cylinders ?? ""}
            onChange={event => set("cylinders", event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">Nepoznato</option>
            {cylinderChoices.map(c => (
              <option key={c} value={c}>
                {c === 0 ? "Bez cilindara (EV)" : `${c} cilindra`}
              </option>
            ))}
          </Select>
          <Select
            label="Boja vozila"
            value={values.color ?? ""}
            onChange={event => set("color", event.target.value)}
          >
            <option value="">Nepoznato</option>
            {carColors.map(color => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </Select>
          <Select
            label="Završnica boje"
            value={values.colorFinish ?? ""}
            onChange={event => set("colorFinish", event.target.value)}
          >
            <option value="">Nepoznato</option>
            {colorFinishes.map(fin => (
              <option key={fin} value={fin}>
                {fin}
              </option>
            ))}
          </Select>
          <label className="field span-all"><span>VIN (neobavezno)</span><input className="tabular" value={values.vin} maxLength={17} pattern={values.demo ? undefined : "[A-HJ-NPR-Z0-9]{17}"} title="17 znakova bez slova I, O ili Q" onChange={event => set("vin", event.target.value.toUpperCase())} /></label>
        </div>
        {valuation && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--hover)] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
            <span className="text-[var(--muted)]">Okvirna tržišna vrijednost u RH:</span>
            <strong className="tabular-nums text-[var(--text)]">
              {euro(valuation.fairMin)} – {euro(valuation.fairMax)} (Medijan: {euro(valuation.medianMarketPrice)})
            </strong>
          </div>
        )}
          <label className="field"><span>Napomena prodavača (neobavezno)</span><textarea rows={3} value={values.sellerNote ?? ""} maxLength={12000} onChange={event => set("sellerNote", event.target.value)} placeholder="Navedite stanje vozila, servisnu povijest ili kada je moguć pregled." /></label>
          <label className="field"><span>Istaknuta oprema</span><input value={values.trim} maxLength={100} onChange={event => set("trim", event.target.value)} placeholder="npr. Digitalni kokpit · Matrix LED" /></label>
          {suggestionChips}
          {valuation && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--hover)] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
              <span className="text-[var(--muted)]">Ažurirana tržišna procjena s odabranom opremom ({valuation.equipmentCount} stavki):</span>
              <strong className="tabular-nums text-[var(--text)]">
                {euro(valuation.fairMin)} – {euro(valuation.fairMax)} (Medijan: {euro(valuation.medianMarketPrice)})
              </strong>
            </div>
          )}
          <EquipmentSelector
            vehicle={{ ...values, model: effectiveModel, variant: activeVariant }}
            aiSuggestedIds={aiSuggestedIds}
            onChange={selection => set("catalogEquipment", selection)}
          />
          <ListingOptions selected={values.flags} onChange={selected => set("flags", selected)} />
        </>}
        {step === 2 && <>
          {valuation && <section className="publish-advisor" aria-label="Procjena tržišne vrijednosti u RH">
            <div className="advisor-header">
              <div>
                <span className="eyebrow">Procjena tržišne vrijednosti u RH</span>
                <p>Preporučeni raspon u RH: <strong className="tabular">{euro(valuation.fairMin)} – {euro(valuation.fairMax)}</strong> <span className="tabular">(Medijan: {euro(valuation.medianMarketPrice)})</span></p>
              </div>
              <button type="button" className="btn secondary advisor-apply" onClick={() => set("price", valuation.medianMarketPrice)}>
                <Sparkles size={15}/> Postavi preporučenu cijenu
              </button>
            </div>
            {values.price > 0 && liveDelta && valuation && <div className="advisor-preview flex-col !items-stretch">
              <div className="flex flex-wrap items-center gap-2">
                <span>Vaš oglas će imati oznaku:</span>
                <Rating valuation={valuation} align="left" privateContext />
                <span className={"price-delta tabular " + liveDelta.tone}>— {liveDelta.text}</span>
              </div>
              <div className="price-scale price-scale-5 !my-1.5" role="img" aria-label="Pozicija vaše cijene na hrvatskom tržištu">
                <div/><div/><div/><div/><div/>
                <span
                  style={{
                    left: `${Math.max(
                      3,
                      Math.min(
                        97,
                        ((values.price - Math.round(valuation.excellentMax * 0.88)) /
                          Math.max(1, Math.round(valuation.highMax * 1.1) - Math.round(valuation.excellentMax * 0.88))) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <div className="scale-labels !mb-0 text-[11px]">
                <span>Top prilika</span>
                <span>Tržišni raspon ({euro(valuation.fairMin)} – {euro(valuation.fairMax)})</span>
                <span>Viši rang</span>
              </div>
              {baseMedianPrice > 0 && values.price > baseMedianPrice && (
                <div className="value-proofs flex flex-col gap-2 pt-1.5">
                  <p className="!m-0 text-[12.5px] text-[var(--muted)]">
                    Tražite <strong className="tabular-nums text-[var(--text)]">{euro(values.price - baseMedianPrice)}</strong> iznad prosjeka.
                    Povećajte procjenu vozila dodavanjem dokaza vrijednosti:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {VALUE_PROOFS.map(proof => {
                      const active = valueProofs.includes(proof.id);
                      return (
                        <label key={proof.id} className={"publish-boost-option tabular" + (active ? " active" : "")}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={event => setValueProofs(old =>
                              event.target.checked ? [...old, proof.id] : old.filter(id => id !== proof.id))}
                          />
                          <span>{proof.label} (+{euro(proof.bonusEur, true)})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="!m-0 text-[12.5px] text-[var(--muted)]" role="status">{timeToSellLine(valuation.deltaPercent, valuation.fairMax, euro)}</p>
              {valuation.rating.hidden && sellerAdvisoryText(valuation.deltaPercent, valuation.fairMax) && (
                <p className="!m-0 seller-advisory" role="status">{sellerAdvisoryText(valuation.deltaPercent, valuation.fairMax)}</p>
              )}
            </div>}
          </section>}
          <div className="form-grid">
            {numeric("Tražena cijena (€)", "price", 1, 100000000)}
            <p className="fine-print">{contact.name} · {contact.phone}</p>
            <LocationFields key={locationRevision} initial={values} onChange={location => setValues(old => ({...old,...location}))}/>
          </div>
          {existing?.status !== "sold" && (!existing || !hasActiveBoost(existing)) && (
            <label className="publish-boost-option tabular">
              <input type="checkbox" checked={requestBoost} onChange={event => setRequestBoost(event.target.checked)} />
              <span>Istakni oglas u gornjem redu 7 dana ({euro(boostPlans.top_7d.price, true)} — {euro(0)} u promo periodu)</span>
            </label>
          )}
          <p className="fine-print">Objavom potvrđujete da su podaci o vozilu točni. Nacrt je vidljiv samo na vašem računu.</p>
        </>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="btn quiet" onClick={event => { setError(""); if (step) { event.currentTarget.closest("dialog")?.scrollTo(0, 0); setStep(step - 1); } else onClose(); }}><ArrowLeft size={16}/>{step ? "Natrag" : "Odustani"}</button>{step === 2 && <button type="submit" className="btn secondary" value="draft" disabled={busy}>Spremi nacrt</button>}<button type="submit" className="btn primary" value="active" disabled={busy}>{step === 2 ? <><Plus size={16}/> {existing?.status === "sold" ? "Spremi izmjene" : "Objavi oglas (0 €)"}</> : <>Nastavi <ArrowRight size={16}/></>}</button></div>
      </form>
    </div>
  </Dialog>;
}

