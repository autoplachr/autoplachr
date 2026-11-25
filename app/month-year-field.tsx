import { Select } from "./ui";

const months = ["Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj", "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac"];

export function MonthYearField({
  value,
  max,
  minYear = 1990,
  maxYear,
  helperText,
  onChange,
}: {
  value: string;
  max: string;
  minYear?: number;
  maxYear?: number;
  helperText?: string;
  onChange: (value: string) => void;
}) {
  const [year = "", month = ""] = value.split("-");
  const [latestYear, latestMonth] = max.split("-").map(Number);
  const topYear = maxYear ? Math.min(latestYear, maxYear) : latestYear;
  const bottomYear = Math.min(topYear, Math.max(1955, minYear));
  const years = Array.from({ length: Math.max(1, topYear - bottomYear + 1) }, (_, index) => topYear - index);

  return (
    <fieldset className="month-year-field">
      <legend>Prva registracija</legend>
      <div>
        <Select label="Mjesec" value={month} required onChange={event => onChange(year + "-" + event.target.value)}>
          <option value="">Mjesec</option>
          {months.map((label, index) => (
            <option
              key={label}
              value={String(index + 1).padStart(2, "0")}
              disabled={+year === latestYear && index + 1 > latestMonth}
            >
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Godina"
          value={year}
          required
          onChange={event => {
            const next = event.target.value;
            onChange(next + "-" + (+next === latestYear && +month > latestMonth ? "" : month));
          }}
        >
          <option value="">Godina</option>
          {years.map(item => (
            <option key={item} value={String(item)}>
              {item}
            </option>
          ))}
        </Select>
      </div>
      {helperText && <small className="field-hint">{helperText}</small>}
    </fieldset>
  );
}
