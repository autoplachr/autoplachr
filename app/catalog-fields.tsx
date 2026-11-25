"use client";

import { CAR_MAKES, describeFamily, modelFor, modelsFor } from "../src/data/car-catalog";
import { Select } from "./ui";

export type CatalogSelection = { make: string; model: string; generation: string };
export const customVariant = "Druga verzija";

export function CatalogFields({ value, onChange, listing = false }: {
  value: CatalogSelection; onChange: (selection: CatalogSelection) => void; listing?: boolean;
}) {
  const models = modelsFor(value.make);
  const generations = modelFor(value.make, value.model)?.generations ?? [];
  return <>
    <Select label="Marka" required={listing} value={value.make} onChange={event => {
      onChange({ make: event.target.value, model: "", generation: "" });
    }}>
      <option value="">{listing ? "Odaberite marku" : "Sve marke"}</option>
      {CAR_MAKES.map(make => <option key={make}>{make}</option>)}
    </Select>
    <Select label="Model" required={listing} value={value.model} disabled={!models.length} onChange={event => {
      onChange({ make: value.make, model: event.target.value, generation: "" });
    }}>
      <option value="">{listing ? "Odaberite model" : "Svi modeli"}</option>
      {models.map(model => <option key={model}>{model}</option>)}
    </Select>
    <Select label="Generacija / Podverzija" className="generation-field" required={listing} value={value.generation} disabled={!generations.length} onChange={event => {
      onChange({ make: value.make, model: value.model, generation: event.target.value });
    }}>
      <option value="">{listing ? "Odaberite generaciju" : "Sve generacije"}</option>
      {generations.map(family => family.codes.length === 1
        ? <option value={family.codes[0]} key={family.codes[0]}>{describeFamily(family)}</option>
        : <optgroup label={describeFamily(family)} key={family.codes.join("/")}>
          {!listing && <option value={family.codes.join("/")}>{family.codes.join("/")} · sve izvedbe</option>}
          {family.codes.map(code => <option key={code} value={code}>{code}</option>)}
        </optgroup>)}
    </Select>
  </>;
}

export function VariantField({ selection, value, onChange }: {
  selection: CatalogSelection; value: string; onChange: (variant: string) => void;
}) {
  const variants = modelFor(selection.make, selection.model)?.variants ?? [];
  return <Select label="Motorizacija / Verzija" value={value} required disabled={!selection.generation} onChange={event => onChange(event.target.value)}>
    <option value="">Odaberite verziju</option>
    {variants.map(variant => <option key={variant}>{variant}</option>)}
    <option>{customVariant}</option>
  </Select>;
}
