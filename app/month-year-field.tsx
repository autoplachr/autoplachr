import { Select } from "./ui";

const months = ["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"];
export function MonthYearField({ value, max, onChange }: {value:string; max:string; onChange:(value:string)=>void}) {
  const [year="",month=""] = value.split("-");
  const [latestYear, latestMonth] = max.split("-").map(Number);
  return <fieldset className="month-year-field">
    <legend>Prva registracija</legend>
    <div>
      <Select label="Mjesec" value={month} required onChange={event => onChange(year + "-" + event.target.value)}>
        <option value="">Mjesec</option>
        {months.map((label,index) => <option key={label} value={String(index+1).padStart(2,"0")} disabled={+year === latestYear && index+1 > latestMonth}>{label}</option>)}
      </Select>
      <Select label="Godina" value={year} required onChange={event => {
        const next = event.target.value;
        onChange(next + "-" + (+next === latestYear && +month > latestMonth ? "" : month));
      }}>
        <option value="">Godina</option>
        {Array.from({length:latestYear-1989},(_,index) => latestYear-index).map(item => <option key={item}>{item}</option>)}
      </Select>
    </div>
  </fieldset>;
}
