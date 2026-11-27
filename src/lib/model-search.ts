import { modelFor } from "../data/car-catalog";
import { searchTerms } from "./search-query";

export function matchesModelSearch(make: string, model: string, query: string) {
  const entry = modelFor(make, model);
  const fields = searchTerms([
    make, model, ...(entry?.variants ?? []), ...(entry?.generations.flatMap(generation => generation.codes) ?? []),
  ].join(" "));
  return searchTerms(query).every(term => fields.some(field => field.startsWith(term)));
}
