"use client";
import { Checkbox } from "../src/components/Checkbox";
import { useId, useState } from "react";
import { croatianCounties, croatianLocations, normalizeLocation, type CroatiaLocation } from "../src/data/croatia-locations";
import { appointmentLabel, formatHours, parseLegacyHours, presetHours, times, weekdayLabels, type DayHours, type WorkingHours } from "../src/data/working-hours";
import type { FieldErrors } from "../src/data/profile-validation";
import { Select } from "./ui";

export function LocationFields({ initial, onChange, errors = {} }: { initial?: Partial<CroatiaLocation>; onChange?: (location:CroatiaLocation) => void; errors?: FieldErrors }) {
  const byCity = (city:string) => croatianLocations.find(place => normalizeLocation(place.city) === normalizeLocation(city));
  const known = byCity(initial?.city ?? "");
  const [location,setLocation] = useState<CroatiaLocation>({ city:initial?.city ?? "", postalCode:initial?.postalCode || known?.postalCode || "", county:initial?.county || known?.county || "" });
  const [suggest,setSuggest] = useState(false);
  const id = useId();
  const query = normalizeLocation(location.city);
  const matches = query.length >= 2 ? croatianLocations.filter(place => normalizeLocation(place.city).includes(query)).slice(0,7) : [];
  function update(next:CroatiaLocation) {
    setLocation(next);onChange?.(next);
  }
  return <div className="location-grid span-all">
    <div className="location-city" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setSuggest(false);
    }}>
      <label className="field"><span>Grad</span><input name="city" autoComplete="address-level2" required maxLength={100} value={location.city}
        aria-controls={suggest && matches.length ? id : undefined} onFocus={() => setSuggest(true)}
        onChange={event => {
          const city = event.target.value, matched = byCity(city);
          setSuggest(!matched);
          update(matched ?? {city, postalCode:"", county:""});
        }} onKeyDown={event => {
          if (event.key === "Escape" && suggest) {event.stopPropagation();setSuggest(false);}
          if (event.key === "ArrowDown" && suggest && matches.length) {event.preventDefault();document.getElementById(id)?.querySelector("button")?.focus();}
        }} aria-invalid={!!errors.city}/>{errors.city && <small className="field-issue" role="alert">{errors.city}</small>}</label>
      {suggest && matches.length > 0 && <ul id={id} className="location-suggestions" aria-label="Prijedlozi gradova">{matches.map(place => <li key={place.city}><button type="button" onClick={() => {update(place);setSuggest(false);}}>{place.city} · {place.postalCode} · {place.county}</button></li>)}</ul>}
    </div>
    <label className="field"><span>Poštanski broj</span><input className="tabular" name="postalCode" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" required maxLength={5} value={location.postalCode}
      onFocus={() => setSuggest(false)} onChange={event => {
        const postalCode = event.target.value.replace(/\D/g,"").slice(0,5);
        const match = postalCode.length === 5 && (croatianLocations.find(place => place.postalCode === postalCode && place.city === location.city) || croatianLocations.find(place => place.postalCode === postalCode));
        update(match || {...location,postalCode});
      }} aria-invalid={!!errors.postalCode}/>{errors.postalCode && <small className="field-issue" role="alert">{errors.postalCode}</small>}</label>
    <div><Select label="Županija" name="county" value={location.county} onFocus={() => setSuggest(false)} onChange={event => update({...location,county:event.target.value})} required>
      <option value="">Odaberite županiju</option>{croatianCounties.map(county => <option key={county}>{county}</option>)}
    </Select>{errors.county && <small className="field-issue" role="alert">{errors.county}</small>}</div>
  </div>;
}

const presets = ["Pon–Pet 08:00–17:00","Pon–Pet 08:00–18:00 • Sub 08:00–13:00","Pon–Pet 09:00–17:00","Po dogovoru / najavi"];
export function HoursFields({ initial, legacy }: { initial?: WorkingHours; legacy?:string }) {
  const [hours,setHours] = useState(() => initial ?? parseLegacyHours(legacy));
  const [changed,setChanged] = useState(false);
  function update(next:WorkingHours) { setHours(next);setChanged(true); }
  function updateDay(index:number, changes:Partial<DayHours>) {
    const days = [...hours.days] as WorkingHours["days"];
    days[index] = {...days[index],...changes};
    update({...hours,appointmentOnly:false,days});
  }
  return <fieldset className="hours-builder span-all"><legend>Radno vrijeme</legend>
    {legacy && !initial && !changed && <p className="fine-print">Prethodni unos: {legacy}. Provjerite predloženi raspored prije spremanja.</p>}
    <div className="account-actions hours-presets">{presets.map((label, index) => <button key={label} type="button" className="btn secondary" onClick={() => update({...presetHours(index),afterHours:hours.afterHours})}>{label}</button>)}</div>
    <input type="hidden" name="workingHours" value={JSON.stringify(hours)}/>
    {hours.days.map((day,index) => <div className="hours-row" key={index}>
      <strong>{index === 0 ? weekdayLabels[0] : index === 1 ? "Subota" : "Nedjelja i praznici"}</strong>
      <label className="hours-switch"><input type="checkbox" role="switch" checked={!hours.appointmentOnly && day.open} aria-label={weekdayLabels[index] + " otvoreno"}
        onChange={event => updateDay(index,{open:event.target.checked})}/>{!hours.appointmentOnly && day.open ? "Otvoreno" : "Zatvoreno"}</label>
      <Select label={weekdayLabels[index] + " · Od"} className="numeric-select" disabled={hours.appointmentOnly || !day.open} value={day.from} onChange={event => updateDay(index,{from:event.target.value})}>{times.filter(time => time < day.to || time === day.from).map(time => <option key={time}>{time}</option>)}</Select>
      <Select label={weekdayLabels[index] + " · Do"} className="numeric-select" disabled={hours.appointmentOnly || !day.open} value={day.to} onChange={event => updateDay(index,{to:event.target.value})}>{times.filter(time => time > day.from || time === day.to).map(time => <option key={time}>{time}</option>)}</Select>
    </div>)}
    <label className="hours-switch"><Checkbox checked={hours.afterHours} onChange={event => update({...hours,afterHours:event.target.checked})}/>{appointmentLabel}</label>
    <output className="fine-print">{formatHours(hours)}</output>
  </fieldset>;
}
