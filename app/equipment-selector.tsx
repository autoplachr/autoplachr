"use client";
import { useState } from "react";
import { equipmentCategories, equipmentFor } from "../src/data/equipment-catalog";
import type { Vehicle } from "./catalog";

export function EquipmentSelector({ vehicle, onChange, filter = false }: {
  vehicle: Pick<Vehicle,"make"|"model"> & Partial<Pick<Vehicle,"generation"|"variant"|"date"|"catalogEquipment"|"bodyType">> & { fuel?: string };
  onChange: (selection: string[]) => void; filter?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const items = equipmentFor(vehicle, filter);
  const selected = vehicle.catalogEquipment ?? [];
  const normalized = (text: string) => text.toLocaleLowerCase("hr-HR").normalize("NFD").replace(/\p{M}/gu,"");
  const needle = normalized(query.trim());
  const visible = items.filter(item => needle ? normalized(item.label).includes(needle) : expanded || item.recommended || selected.includes(item.id));
  const shown = !needle && !expanded && !visible.length ? items.slice(0,12) : visible;
  if (!items.length) return null;
  return <section className="equipment-picker">
    <h3>{filter ? "Dodatna oprema" : "Tvornička i dodatna oprema"}</h3>
    <div className="equipment-tools">
      <label className="field"><span>Pretraži opremu</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Pretraži opremu…" /></label>
      {!filter && <button className="btn secondary" type="button" onClick={() => onChange([...new Set([...selected, ...items.filter(item => item.recommended).map(item => item.id)])])}>Preporučena oprema za odabrani model</button>}
      <button className="btn secondary" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Sažmi opremu" : "Prikaži svu opremu (" + items.length + ")"}</button>
    </div>
    {!shown.length && <p>Nema opreme koja odgovara pretraživanju.</p>}
    <div className="equipment edit-equipment">{equipmentCategories.map((label, index) => {
      const group = shown.filter(item => item.category === index);
      return group.length > 0 && <fieldset key={label}><legend>{label}</legend>{group.map(item => <label key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={event => onChange(event.target.checked ? [...selected,item.id] : selected.filter(id => id !== item.id))}/>{item.label}
      </label>)}</fieldset>;
    })}</div>
  </section>;
}
