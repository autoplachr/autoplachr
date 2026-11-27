# Repository agent instructions

## MANDATORY READ FIRST

**Before modifying any file in this repository, read `DESIGN.md` and `SKILL.md` at the
repository root in full.** `DESIGN.md` is the binding Light-First Editorial design
system for `AUTOPLAC.HR`; `SKILL.md` is the execution checklist, truthfulness rules and
verification gate. Follow both exactly. A later instruction overrides them only when it
explicitly says so.

The Light-First Editorial theme is non-negotiable on every screen and in every future
prompt: light `#F5F6F8` canvas, white `#FFFFFF` rounded cards, `#111318` ink, the
three-colour palette (ink + Adriatic Cobalt `#1D4ED8` + warm `#D97706`), Apple iOS
motion (`--ease-ios`, `.ap-press`, transform/opacity only, reduced-motion respected),
left filter rail on the homepage with only the compact editorial banner strip above it.
Dark mode is an opt-in toggle only, never the default. Keep extra gradients,
violet/indigo/teal accents, glows, emoji icons, fake ratings, fake leasing estimates and
hand-drawn car wireframes out of the UI. Detail, account, `/autokuce`,
`/ppmv-kalkulator` and `/procjena-cijene` follow the same system (DESIGN.md §4b).

## Component map

| File | Responsibility |
| --- | --- |
| `src/components/Navbar.tsx` | Sticky white top bar, location trigger, saved, theme toggle, `Predaj oglas`, avatar |
| `app/page.tsx` | Homepage server entry (catalogue snapshot + JSON-LD) |
| `app/marketplace.tsx` | Client shell, routing, two-column catalogue, sort, mobile filter sheet, footer |
| `app/filter-rail.tsx` | Left filter rail: search, body pills, price histogram + dual slider, km, brands, switches |
| `app/vehicle-card.tsx` | `CatalogCard` (homepage grid) and `VehicleCard` (rails, directory, similar) |
| `app/detail.tsx` | Listing detail page |
| `app/account.tsx` | Account and dealer console |
| `app/seller-analytics.tsx` | Seller analytics (real counters only) |
| `app/search.ts` | `Search` state, URL sync, matching and sorting |
| `app/globals.css` | Tokens (`--ap-*`), light default, `html.dark` overrides, component CSS |
| `app/listing-boost.ts` | Paid highlights, B2B pricing, listing de-duplication |
| `src/lib/price-engine.ts` | Market valuation, `meetsPublicBadge` |

## Verification rule

Run before every commit:

1. `npm run typecheck`
2. `node scripts/verify-vehicle-coverage.mjs`
3. `npm run build:site`
4. Restart `node scripts/preview-site.mjs` on port `4323`.
5. `node scripts/visual-check.mjs` for desktop `1440×900` and mobile `390×844` screenshots of
   `/`, `/oglas/<live-slug>`, `/autokuce`, `/racun` and the open mobile filter sheet.
   Inspect them, then delete `.tmp-visual-check/` before committing.

Interactive Playwright MCP / browser-runtime evaluation tools hang in this Windows
environment and must not be used. The standalone `scripts/visual-check.mjs` (watchdog,
`await browser.close(); process.exit(0);`) is the only allowed browser check.
