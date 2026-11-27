---
name: autoplac-ui
description: Build or change any AUTOPLAC.HR screen, component or marketplace feature in the Light-First Editorial design system, with Croatian truthfulness rules and the mandatory verification gate.
---

# AUTOPLAC.HR UI and engineering skill

Load this file and `DESIGN.md` before touching UI, styling, copy or marketplace logic.
`DESIGN.md` holds the tokens and bans; this file holds the execution checklist.

## 1. Design execution checklist

### Navbar (`src/components/Navbar.tsx`)
- `h-16` sticky white bar, `border-b border-[#EAECF0]`, `z-40`.
- Left: `w-7 h-7 rounded-[7px] bg-[#111318]` mark with a white `A`, then `AUTOPLAC`
  (`text-[15px] font-extrabold tracking-[0.04em]`).
- Links (`gap-7`, `text-[13.5px] font-medium text-[#6B7280]`, active `text-[#111318] font-semibold`):
  `Rabljena vozila`, `Autokuće`, `PPMV kalkulator`, `Procjena cijene`.
- Right: location trigger (`11px` uppercase, pin icon, opens county/city list that sets
  `search.grad`), `Spremljeno` + count when `> 0`, theme toggle (`w-8 h-8 rounded-full`),
  `Predaj oglas` pill (`bg-[#111318] h-9 px-4 rounded-full`), avatar (`w-8 h-8 rounded-full`)
  or `Prijava` link.
- Mobile: mark, `Predaj oglas`, saved, menu button; links in the drawer.

### Left filter rail (`app/filter-rail.tsx`)
- `lg:w-[272px] bg-white border-r border-[#EAECF0] px-5 py-6`.
- Order: header (`Filteri` / `Resetiraj sve`) → quick search → `KAROSERIJA` pills →
  `CIJENA` histogram (26 live buckets) + dual-thumb slider + `OD`/`DO` boxes →
  `MAKS. KILOMETRAŽA` slider (10.000 km steps, right end = no limit) → `MARKA`
  checklist (badge, name, live count, checkbox, multi-select) → switches
  `Potvrđena kilometraža` (`opcije=cvh`) and `Samo prilike ispod cijene`
  (`samoPrilike`, ≥ 5 % below median) → collapsed `Više filtera`.
- Section labels `text-[10px] font-bold tracking-[0.08em] uppercase text-[#8C93A0]`.
- Sections separated by `border-t border-[#F1F3F5]` only. No nested bordered boxes.

### Catalogue card (`app/vehicle-card.tsx`, `CatalogCard`)
- `bg-white rounded-2xl border border-[#EAECF0] shadow-[0_1px_3px_rgba(16,24,40,0.04)]`,
  hover `shadow-[0_12px_24px_-4px_rgba(16,24,40,0.08)]`.
- Photo `aspect-[16/10]`, link to `/oglas/[slug]`; deal pill top-left (truthful only);
  heart top-right; brand medallion `w-8 h-8 absolute -bottom-4 right-3.5`.
- Body: `{year} {title}` → `{km} km · {city}` → price + optional `Reg. MM/YYYY` /
  `PDV (R1)` tag → 3-column specs (first reg. / kW+KS / gearbox+fuel) → seller name +
  `Pogledaj detalje`.

### Detail page (`app/detail.tsx`)
- White `rounded-2xl` panels on the `#F5F6F8` canvas; gallery first, then price block,
  key specs, equipment, seller card, similar vehicles using the same card style.

### Dealer account console (`app/account.tsx`, `app/seller-analytics.tsx`)
- Same tokens: white panels, `#F1F3F5` dividers, `#111318` primary actions,
  `tabular-nums` statistics. Analytics show only real counters (views, saves, contacts).

## 2. Truthfulness and Croatian localisation

- Plurals: `1 oglas`, `2–4 oglasa`, `5+ oglasa`; `1 vozilo`, `2+ vozila`
  (11–14 use the plural form). Use the `plural()` helper in `app/marketplace.tsx`.
- Search uses `normalizeSearchQuery` / `searchTerms` (`src/lib/search-query.ts`):
  diacritics fold (`Skoda` = `Škoda`) and aliases (`VW`, `Mecka`, `Bembara`, `Merc`).
- Deal pills: only when `marketValuation(v).meetsPublicBadge` **and**
  `v.showPriceBadge === true`. `Odlična cijena` for ≥ 10 % below median, `Dobra cijena`
  for 5–9.9 %. Never derive a badge from anything else.
- Warm price tag: only real `Reg. MM/YYYY` (from `registrationUntil`) or `PDV (R1)`
  (`flags` contains `pdv`). Omit when neither exists.
- Never: star ratings, review counts, `€/mj` estimates, inspection-point claims,
  insurance/finance banners, `555` numbers, invented dealers.
- Company facts: `INO-TEH d.o.o.`, Orahovica, `info@autoplac.hr`. Dealer offer:
  `prvih 50 salona`, `6 mj. 0 €` (see `B2B_FOUNDER_OFFER` in `app/listing-boost.ts`).
- Prices: `euro()`; numbers: `number()`; power: `kW` + `Math.round(kw * 1.35962)` KS.

## 3. Interactive fidelity rule

Every visible control is wired to `Search` state and the URL (`app/search.ts`
`readSearch` / `writeSearch`):

| Control | Search key |
| --- | --- |
| Quick search | `upit` |
| Body pills | `karoserija[]` |
| Price histogram + dual slider + OD/DO | `cijenaOd`, `cijena` |
| Mileage slider | `km` |
| Brand checklist | `marke[]` (plus legacy single `marka`) |
| CVH switch | `opcije` contains `cvh` |
| Deals switch | `samoPrilike` |
| Sort dropdown | `sortiranje` |
| Navbar location | `grad` |
| Heart | saved list / account favourites, mirrored in `Spremljeno` |

Drags use `writeSearch(next, true)` (replaceState). No static or fake UI.
Listings are de-duplicated (`dedupeListings` in `app/listing-boost.ts`) before rendering.

## 4. Verification gate (before every commit)

1. `npm run typecheck`
2. `node scripts/verify-vehicle-coverage.mjs`
3. `npm run build:site`
4. Restart `node scripts/preview-site.mjs` on port `4323` and confirm HTTP 200.
5. `node scripts/visual-check.mjs` (standalone, watchdog + `await browser.close(); process.exit(0);`)
   capturing desktop `1440×900` and mobile `390×844` into `.tmp-visual-check/`.
   Inspect the PNGs, fix defects, then delete `.tmp-visual-check/`.

Do not use interactive Playwright MCP / browser-evaluation tools; they hang on this
Windows machine. Only the standalone script above is allowed.
