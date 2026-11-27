"use client";

import {
  describeFamily,
  generationsForYear,
  modelFor,
  modelsFor,
  OTHER_GENERATION,
  OTHER_MODEL,
  variantsForSelection,
} from "../src/data/car-catalog";
import { matchesModelSearch } from "../src/lib/model-search";
import { BrandSelect } from "../src/components/BrandSelect";
import { Select } from "./ui";

export type CatalogSelection = { make: string; model: string; generation: string };
export const customVariant = "Druga verzija";

export function CatalogFields({
  value,
  onChange,
  listing = false,
  allowCustom = false,
  customModel = "",
  onCustomModelChange,
  filterYear,
}: {
  value: CatalogSelection;
  onChange: (selection: CatalogSelection) => void;
  listing?: boolean;
  allowCustom?: boolean;
  customModel?: string;
  onCustomModelChange?: (modelName: string) => void;
  filterYear?: number;
}) {
  const showOther = listing || allowCustom;
  const models = modelsFor(value.make, showOther);
  const allGenerations = modelFor(value.make, value.model)?.generations ?? [];
  const generations =
    filterYear && !value.generation
      ? generationsForYear(value.make, value.model, filterYear)
      : allGenerations;

  return (
    <>
      <BrandSelect
        required={listing}
        value={value.make}
        onChange={make => {
          onChange({ make, model: "", generation: "" });
          onCustomModelChange?.("");
        }}
      />
      <BrandSelect
        label="Model"
        placeholder={listing ? "Odaberite model" : "Svi modeli"}
        searchLabel="Pretraži modele"
        required={listing}
        showLogo={false}
        options={models}
        match={(model, query) => matchesModelSearch(value.make, model, query)}
        value={value.model}
        disabled={!models.length}
        onChange={nextModel => {
          onChange({ make: value.make, model: nextModel, generation: "" });
          if (nextModel !== OTHER_MODEL) onCustomModelChange?.("");
        }}
      />
      {showOther && value.model === OTHER_MODEL && onCustomModelChange && (
        <label className="field span-all">
          <span>Naziv modela (ručni unos)</span>
          <input
            value={customModel}
            required={listing}
            pattern=".*\S.*"
            maxLength={70}
            placeholder="npr. 90, 300C, Cordoba SX..."
            onChange={event => onCustomModelChange(event.target.value)}
          />
        </label>
      )}
      <Select
        label="Generacija / Podverzija"
        className="generation-field"
        required={listing}
        value={value.generation}
        disabled={!allGenerations.length}
        onChange={event => {
          onChange({ make: value.make, model: value.model, generation: event.target.value });
        }}
      >
        <option value="">{listing ? "Odaberite generaciju" : "Sve generacije"}</option>
        {generations.map(family =>
          family.codes.length === 1 ? (
            <option value={family.codes[0]} key={family.codes[0]}>
              {describeFamily(family)}
            </option>
          ) : (
            <optgroup label={describeFamily(family)} key={family.codes.join("/")}>
              {!listing && <option value={family.codes.join("/")}>{family.codes.join("/")} · sve izvedbe</option>}
              {family.codes.map(code => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </optgroup>
          ),
        )}
      </Select>
    </>
  );
}

export function VariantField({
  selection,
  value,
  onChange,
  required = true,
  filterYear,
}: {
  selection: CatalogSelection;
  value: string;
  onChange: (variant: string) => void;
  required?: boolean;
  filterYear?: number;
}) {
  const variants = variantsForSelection(
    selection.make,
    selection.model,
    selection.generation,
    selection.generation === OTHER_GENERATION ? undefined : filterYear,
  );
  const canSelect = Boolean(selection.generation) || (Boolean(selection.model) && selection.model !== OTHER_MODEL && Boolean(filterYear));
  return (
    <Select
      label="Motorizacija / Verzija"
      value={value}
      required={required}
      disabled={!canSelect}
      onChange={event => onChange(event.target.value)}
    >
      <option value="">Odaberite verziju</option>
      {variants.map(variant => (
        <option key={variant}>{variant}</option>
      ))}
      <option>{customVariant}</option>
    </Select>
  );
}
