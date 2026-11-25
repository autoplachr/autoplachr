"use client";
import { Checkbox } from "../src/components/Checkbox";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { equipmentCategories, equipmentFor } from "../src/data/equipment-catalog";
import type { Vehicle } from "./catalog";

export function EquipmentSelector({
  vehicle,
  onChange,
  filter = false,
  aiSuggestedIds = [],
}: {
  vehicle: Pick<Vehicle, "make" | "model"> &
    Partial<Pick<Vehicle, "generation" | "variant" | "date" | "catalogEquipment" | "bodyType">> & { fuel?: string };
  onChange: (selection: string[]) => void;
  filter?: boolean;
  aiSuggestedIds?: readonly string[];
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const items = equipmentFor(vehicle, filter);
  const selected = vehicle.catalogEquipment ?? [];
  const suggestedSet = new Set(aiSuggestedIds);
  const normalized = (text: string) => text.toLocaleLowerCase("hr-HR").normalize("NFD").replace(/\p{M}/gu, "");
  const needle = normalized(query.trim());
  const visible = items.filter(item =>
    needle ? normalized(item.label).includes(needle) : expanded || item.recommended || selected.includes(item.id),
  );
  const shown = !needle && !expanded && !visible.length ? items.slice(0, 12) : visible;
  if (!items.length) return null;
  return (
    <section className="equipment-picker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>{filter ? "Dodatna oprema" : "Tvornička i dodatna oprema"}</h3>
        {!filter && suggestedSet.size > 0 && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted)] tabular-nums">
            <Sparkles size={12} aria-hidden="true" />
            AI automatski označena oprema ({suggestedSet.size})
          </span>
        )}
      </div>
      <div className="equipment-tools">
        <label className="field">
          <span>Pretraži opremu</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Pretraži opremu…"
          />
        </label>
        {!filter && (
          <button
            className="btn secondary"
            type="button"
            onClick={() =>
              onChange([...new Set([...selected, ...items.filter(item => item.recommended).map(item => item.id)])])
            }
          >
            Preporučena oprema za odabrani model
          </button>
        )}
        <button
          className="btn secondary"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Sažmi opremu" : "Prikaži svu opremu (" + items.length + ")"}
        </button>
      </div>
      {!shown.length && <p>Nema opreme koja odgovara pretraživanju.</p>}
      <div className="equipment edit-equipment">
        {equipmentCategories.map((label, index) => {
          const group = shown.filter(item => item.category === index);
          return (
            group.length > 0 && (
              <fieldset key={label}>
                <legend>{label}</legend>
                {group.map(item => {
                  const isSuggested = !filter && suggestedSet.has(item.id);
                  return (
                    <label key={item.id}>
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onChange={event =>
                          onChange(
                            event.target.checked
                              ? [...selected, item.id]
                              : selected.filter(id => id !== item.id),
                          )
                        }
                      />
                      <span>{item.label}</span>
                      {isSuggested && (
                        <span className="ml-auto shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--muted)]">
                          AI prijedlog
                        </span>
                      )}
                    </label>
                  );
                })}
              </fieldset>
            )
          );
        })}
      </div>
    </section>
  );
}
