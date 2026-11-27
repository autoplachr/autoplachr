import { normalizeLocation } from "../data/croatia-locations";

const aliases: readonly (readonly [RegExp, string])[] = [
  [/\b(?:vw|folcika|folksvagen)\b/g, "volkswagen"],
  [/\b(?:mb|merc|mecka|mercedes(?: benz)?)\b/g, "mercedes benz"],
  [/\b(?:bembara|bimmer)\b/g, "bmw"],
  [/\bbmw\s+3\b/g, "bmw serija 3"],
  [/\balfa(?: romeo)?\b/g, "alfa romeo"],
  [/\b(?:landrover|range(?! rover\b))\b/g, "land rover"],
  [/\bcitros\b/g, "citroen"],
  [/\bpezo\b/g, "peugeot"],
  [/\breno\b/g, "renault"],
  [/\bhjundai\b/g, "hyundai"],
  [/\b(?:dsg|s\s?tronic|steptronic|tiptronic)\b/g, "automatski"],
];

export function normalizeSearchQuery(query: string): string {
  let text = normalizeLocation(query);
  for (const [pattern, canonical] of aliases) text = text.replace(pattern, canonical);
  return text;
}

export function searchTerms(query: string): string[] {
  return normalizeSearchQuery(query).match(/[\p{L}\d]+/gu) ?? [];
}
