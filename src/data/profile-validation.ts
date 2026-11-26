export type FieldErrors = Record<string,string>;
export function normalizePhone(text: unknown) {
  const clean = typeof text === "string" ? text.replace(/[\s().-]/g, "") : "";
  return typeof clean === "string" && clean.startsWith("0") ? "+385" + clean.slice(1) : clean;
}
export function profileErrors(data: Record<string,unknown>, dealer: boolean): FieldErrors {
  const get = (key:string) => String(data[key] ?? "").trim();
  const errors: FieldErrors = {};
  if (!get("name")) errors.name = dealer ? "Unesite naziv tvrtke." : "Unesite ime i prezime.";
  if (!get("city")) errors.city = "Unesite grad.";
  if (!/^\d{5}$/.test(get("postalCode"))) errors.postalCode = "Unesite poštanski broj od pet znamenki.";
  if (!get("county")) errors.county = "Odaberite županiju.";
  if (!/^\+385[1-9]\d{6,8}$/.test(normalizePhone(get("phone")))) errors.phone = "Unesite hrvatski broj, npr. 099 123 4567.";
  if (dealer) {
    if (!/^\d{11}$/.test(get("oib"))) errors.oib = "OIB mora sadržavati točno 11 znamenki.";
    if (get("address").length < 3) errors.address = "Unesite najmanje 3 znaka adrese.";
  }
  return errors;
}
