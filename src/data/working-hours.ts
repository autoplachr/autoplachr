export type DayHours = { open: boolean; from: string; to: string };
export type WorkingHours = { appointmentOnly: boolean; afterHours: boolean; days: [DayHours, DayHours, DayHours] };
export const appointmentLabel = "Moguć pregled vozila izvan radnog vremena uz prethodnu najavu";
export const times = Array.from({length:29}, (_, i) => String(7 + Math.floor(i/2)).padStart(2,"0") + (i % 2 ? ":30" : ":00"));
export const weekdayLabels = ["Pon–Pet", "Sub", "Ned i praznici"];
export function presetHours(index = 0): WorkingHours {
  return { appointmentOnly: index === 3, afterHours: false, days: [
    {open:index !== 3,from:index === 2 ? "09:00" : "08:00",to:index === 1 ? "18:00" : "17:00"},
    {open:index === 1,from:"08:00",to:"13:00"},
    {open:false,from:"08:00",to:"13:00"},
  ] };
}

export function validHours(value: unknown): value is WorkingHours {
  const hours = value as WorkingHours | null;
  return !!hours && typeof hours.appointmentOnly === "boolean" && typeof hours.afterHours === "boolean" &&
    Array.isArray(hours.days) && hours.days.length === 3 && hours.days.every(day => day && typeof day.open === "boolean" &&
      times.includes(day.from) && times.includes(day.to) && (!day.open || day.from < day.to));
}

export function formatHours(hours: WorkingHours) {
  const summary = hours.appointmentOnly ? "Po dogovoru / najavi" : hours.days.map((day,i) =>
    weekdayLabels[i] + " " + (day.open ? day.from + "–" + day.to : "zatvoreno")).join(" • ");
  return summary + (hours.afterHours && !hours.appointmentOnly ? " • Pregled izvan radnog vremena uz najavu" : "");
}

export function parseLegacyHours(text?: string): WorkingHours {
  const hours = presetHours();
  if (!text) return hours;
  if (/po dogovoru|po najavi/i.test(text)) return presetHours(3);
  const blocks = text.split(/[•;,]/);
  for (const [i,block] of blocks.entries()) {
    const match = block.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
    const index = /^\s*sub/i.test(block) ? 1 : /^\s*ned|^\s*praz/i.test(block) ? 2 : i === 0 || /pon/i.test(block) ? 0 : -1;
    if (index === -1) continue;
    if (/zatvoreno/i.test(block)) hours.days[index].open = false;
    if (!match) continue;
    const from = match[1].padStart(5,"0"), to = match[2].padStart(5,"0");
    if (times.includes(from) && times.includes(to) && from < to) hours.days[index] = {open:true,from,to};
  }
  hours.afterHours = /izvan radnog/i.test(text);
  return hours;
}

export function dealershipHoursToday(hours: WorkingHours, now = new Date()) {
  if (hours.appointmentOnly) return "Danas po dogovoru / najavi";
  const parts = new Intl.DateTimeFormat("en", {timeZone:"Europe/Zagreb", year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"}).formatToParts(now);
  const part = (key: string) => parts.find(item => item.type === key)?.value ?? "";
  const monthDay = part("month") + "-" + part("day");
  const year = +part("year");
  // Gregorian Easter, then Easter Monday and Corpus Christi.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const h = (19 * a + b - Math.floor(b/4) - Math.floor((b - Math.floor((b+8)/25) + 1)/3) + 15) % 30;
  const l = (32 + 2 * (b%4) + 2 * Math.floor(c/4) - h - c%4) % 7;
  const n = h + l - 7 * Math.floor((a + 11*h + 22*l)/451) + 114;
  const easter = Date.UTC(year,Math.floor(n/31)-1,n%31+1);
  const movable = [0,1,60].map(days => new Date(easter + days*86400000).toISOString().slice(5,10));
  const holiday = [...movable,"01-01","01-06","05-01","05-30","06-22","08-05","08-15","11-01","11-18","12-25","12-26"].includes(monthDay);
  const day = hours.days[holiday || part("weekday") === "Sun" ? 2 : part("weekday") === "Sat" ? 1 : 0];
  return day.open ? "Otvoreno danas: " + day.from + " – " + day.to : "Danas zatvoreno";
}
