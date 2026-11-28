# AUTOPLAC.HR — Light-First Editorial Design System (binding)

This file is the single source of truth for every visual and interaction decision on
`AUTOPLAC.HR`. Every UI change (page, component, token, animation, copy) must satisfy
every rule below before it is committed. When a request conflicts with this file, this
file wins unless the user explicitly overrides it in the same message.

Read together with `SKILL.md` (execution checklist, truthfulness rules, verification gate).

## 1. Character

- A data-first Croatian used-car marketplace with an editorial, light layout: white
  top bar, white filter rail on the left, white rounded cards on a light grey canvas.
- Content is the product: photo, price, first registration, kilometres, power,
  transmission, fuel, city, seller. Decoration never competes with data.
- Croatian copy, `€` prices with Croatian grouping (`24.900 €`), `km`, `kW / KS`,
  `Reg. MM/YYYY`.

## 2. Theme

- **Light mode is the mandatory default** on every route. `app/layout.tsx` must not
  ship `class="dark"` on `<html>`.
- Dark mode exists only as an opt-in through the navbar moon/sun toggle. The choice is
  stored in `localStorage["autoplac.theme"]` and applied before paint by the inline
  script in `app/layout.tsx`. Never make dark the default and never follow
  `prefers-color-scheme` automatically.

## 3. Tokens

All new UI uses the CSS variables below (defined in `app/globals.css`, with dark
overrides under `html.dark`). Light values are fixed:

| Token | Light value | Use |
| --- | --- | --- |
| `--ap-canvas` | `#F5F6F8` | Page canvas behind the catalogue |
| `--ap-card` | `#FFFFFF` | Cards, navbar, filter rail, panels |
| `--ap-fill` | `#F3F4F6` | Inputs, inactive pills, value boxes |
| `--ap-fill-hover` | `#E5E7EB` | Hover on inactive pills |
| `--ap-line` | `#E6E8EC` | `1px solid` borders and hairlines (navbar/rail use `#EAECF0`) |
| `--ap-divider` | `#F1F3F5` | Dividers inside a card or the rail |
| `--ap-ink` | `#111318` | Primary text, primary CTA fill, active pill, slider rail |
| `--ap-ink-hover` | `#1F242D` | Primary CTA hover |
| `--ap-text-2` | `#6B7280` | Secondary text |
| `--ap-mute` | `#8C93A0` | Eyebrows, uppercase section labels |
| `--ap-faint` | `#9CA3AF` | Counts, spec captions, placeholders |
| `--ap-accent` | `#1D4ED8` | Adriatic Cobalt: primary brand accent (see below) |
| `--ap-accent-hover` | `#1E40AF` | Cobalt hover/pressed |
| `--ap-accent-2` / `--ap-focus` | `#2563EB` | Lighter cobalt: focus rings, text links |
| `--ap-accent-soft` | `#EFF4FF` | Cobalt tint behind icons and badges |
| `--ap-warm` | `#D97706` | Warm secondary accent: price-drop icons, editorial highlights |
| `--ap-warm-ink` | `#B45309` | Warm text on tint (AA contrast at 11–13 px) |
| `--ap-tag-bg` | `#FFF7ED` | Warm soft tint behind `Reg. MM/YYYY`, `PDV (R1)`, price-drop tags |
| `--ap-deal` | `#22C55E` | `Dobra cijena` pill (white text) |

`Odlična cijena` is a white `#FFFFFF` pill with `#111318` text.

### Three-colour editorial palette

1. **Surface + ink** carry 90 % of the UI: `#F5F6F8` canvas, `#FFFFFF` cards with
   `#E6E8EC` borders, `#111318` obsidian ink (body text, filter chips, `Predaj oglas`).
2. **Adriatic Cobalt `#1D4ED8` / `#2563EB`** is used on purpose, never as decoration:
   active navigation underline, slider fill and thumbs, active histogram bars, switches
   and checkboxes, active-filter count badges, verified dealer checkmarks, active tab
   indicators, `Prikaži broj telefona` and the mobile sheet CTA `Prikaži {n} vozila`.
3. **Warm `#D97706` on `#FFF7ED`** marks real time/price facts: `Reg. MM/YYYY` tags,
   price-drop indicators and rare editorial highlights. Small warm text uses `#B45309`.

Never tint whole sections cobalt or warm. Never use either accent for fake urgency.

### No banners above the marketplace (revoked in v1.1.0-rc3)

The blue gradient banner strip (`Provjerena ponuda rabljenih vozila na jednom mjestu`)
was removed because it read as a generic SaaS ad. **Gradient banners, promo strips and
hero cards above the two-column marketplace grid are forbidden.** The page opens straight
into the calm catalogue header (eyebrow, H1, pill search, sort). The only dark surface in
the product is the obsidian `#111318` auth panel (§4c). No gradients anywhere.

### Audience and tone

Buyers and dealership owners aged 30–50. The reference feel is Porsche Approved, BMW
Premium Selection and Polestar: calm, factual, generous whitespace, few colours, no
exclamation marks, no urgency badges, no stock-photo people.

### Geometry

- Cards: `16px` radius (`rounded-2xl`).
- Inputs and value boxes: `10px` radius (`rounded-[10px]`).
- Pills, CTA buttons, heart buttons, brand medallions, avatar: `9999px` (`rounded-full`).
- Navbar height `64px` (`h-16`), sticky, white, `1px #EAECF0` bottom border.
- Filter rail `272px` wide on `lg+`, white, `1px #EAECF0` right border, `px-5 py-6`.

### Elevation

- Resting card: `1px` border + `0 1px 3px rgba(16,24,40,0.04)`.
- Hover card: `0 12px 24px -4px rgba(16,24,40,0.08)` (shadow transition only).
- Medallion: `0 2px 8px rgba(0,0,0,0.12)`.
- No neon, coloured, or glowing shadows anywhere.

### Typography

- Inter Variable. Headings and prices use tight tracking (`-0.02em`, `tracking-tight`).
- `tabular-nums` is mandatory on every price, mileage, year, date, kW/KS value and count.
- Uppercase section labels: `10px`, bold, `0.08em` tracking, `--ap-mute`.
- Eyebrows above H1: `11px`, semibold, `0.08em` tracking, uppercase, `--ap-mute`.

## 4. Homepage anatomy (locked)

`/` opens directly into the two-column marketplace. There is no hero banner above it.
`public/images/hero-autoplac.webp` stays on disk and is not rendered on `/`.

1. **Navbar** (`src/components/Navbar.tsx`): black `28px` rounded-square `A` mark +
   `AUTOPLAC` wordmark; links `Rabljena vozila`, `Autokuće`, `PPMV kalkulator`,
   `Procjena cijene`; right cluster: location trigger (`HRVATSKA` or the active
   city/county), `Spremljeno` with count, theme toggle, `Predaj oglas` pill, account avatar.
2. **Filter rail** (`app/filter-rail.tsx`): `Filteri` + `Resetiraj sve`; quick search;
   `KAROSERIJA` pills; `CIJENA` live 26-bar histogram with a flush dual-thumb slider and
   `OD` / `DO` value boxes; `MAKS. KILOMETRAŽA` slider; `MARKA` multi-select checklist
   with circular badges and live counts; iOS switches `Potvrđena kilometraža` and
   `Samo prilike ispod cijene`; collapsed `Više filtera` for year, fuel, gearbox, model.
3. **Catalogue** (`app/marketplace.tsx`): eyebrow `RABLJENA VOZILA · HRVATSKA`, H1
   `{n} vozila u ponudi`, `Sortiraj:` pill dropdown, then a `1 / 2 / 3` column grid
   (`md:grid-cols-2 xl:grid-cols-3 gap-5`) of catalogue cards.
4. **Catalogue card** (`app/vehicle-card.tsx`): `16/10` photo; top-left deal pill only
   when truthful; top-right white heart; bottom-right `32px` brand medallion overlapping
   the photo/body seam; title, `km · city`, price + optional warm tag, 3-column spec row
   (first registration, kW/KS, transmission/fuel), footer with seller name and
   `Pogledaj detalje`.
5. **Mobile (< 1024px)**: a full-width sticky sub-bar under the navbar
   (`sticky top-16 z-30 bg-[#F5F6F8]/90 backdrop-blur-xl border-b`) holds the `Filteri`
   pill (cobalt count badge) on the left and a compact sort select on the right. The
   pill opens the same rail in a full-height sheet. Cards are one column. No horizontal
   overflow at `390px`, and nothing floats over card content.
6. **Photos**: `CarImage` renders `quality={90}` with
   `sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"` in an `aspect-[16/10]`
   frame. Never upscale a `preview` thumbnail into a card or gallery. The first 3 cards are
   `priority` (preloaded, `fetchpriority="high"`); every other card is `loading="lazy"`
   + `decoding="async"`.
7. **Brand marks** (`src/components/BrandMark.tsx`): single-colour inline SVG on a 24-unit
   grid, rendered at integer sizes (`16` rail, `18` medallion) with
   `shapeRendering="geometricPrecision"` in `#111318` / `#374151` on white. Covers BMW,
   Volkswagen, Audi, Mercedes-Benz, Škoda, Porsche, Alfa Romeo, Ford, Volvo, Toyota,
   Renault, Peugeot, Hyundai, Kia, Mazda, Cupra, Tesla; every other make and every dealer
   gets a geometric two-letter monogram. These are simplified identification marks, not
   official artwork. The detailed `BrandLogo` emblems are only for ≥ 24 px surfaces.

**Catalogue header**: eyebrow `AUTOPLAC.HR · RABLJENA VOZILA` (`11px`, `0.1em`, `#8C93A0`),
H1 `{n} vozila u ponudi` (`26px` / `lg:30px`, bold, `-0.025em`, tabular), and on the right a
`w-64 h-9` pill search (`Pretraži marku, model ili opremu...`) next to `Sortiraj`. Layout
container: `max-w-[1400px] mx-auto px-4 lg:px-8 pt-6 pb-16`; the rail is a sticky white
`rounded-2xl` card inside it.

**Performance**: preconnect + dns-prefetch the Supabase origin in `app/layout.tsx`;
memoise the histogram and brand counts on keys that exclude their own facet; debounce
`replaceState` URL writes to `120 ms` while dragging or typing.

## 4b. Sub-page anatomy (same system everywhere)

- **Detail (`app/detail.tsx`)**: breadcrumb + utility pills (`Spremi`, `Podijeli`,
  `Prijavi`, `Ispiši A4`; saved state cobalt) → `rounded-2xl` white gallery with `1/n` pill
  counter, arrow-key support and cobalt active thumbnail → white 6-column key-spec card →
  white `Tehnički podaci` and `Oprema vozila` cards (cobalt checks) → seller description →
  `Slična vozila u ponudi` as 3 `CatalogCard`s. Sticky right card
  (`rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]`): price, truthful seller
  block, cobalt `Prikaži broj telefona`, pill secondary buttons.
- **Account (`app/account.tsx`, `app/seller-analytics.tsx`)**: white profile header card
  (cobalt verified badge, `+ Predaj novi oglas` pill), underline tabs with an animated
  cobalt indicator, a 4-column KPI card with cobalt icon tiles, single-line table/list
  rows whose pill actions (`Istakni`, `A4 cjenik`, `Uredi`, `Pauziraj`, `Obriši`) never wrap.
- **Detail dossier details**: title `28px` / `lg:32px` bold `-0.025em`; subtitle
  `{km} km · MM/YYYY · {city}`; pills `Spremi`, `Podijeli`, `Ispiši A4 cjenik` (seller) or
  `Ispiši A4` (buyer), `Prijavi`; seller notes `15px leading-relaxed #374151 max-w-[68ch]`;
  sticky card `top-24`, `shadow-[0_6px_24px_rgba(15,23,42,0.05)]`, seller monogram mark,
  cobalt `h-11 rounded-xl` phone button, matching `rounded-xl` outline buttons.
- **`/autokuce`, `/ppmv-kalkulator`, `/procjena-cijene`**: `#F5F6F8` canvas, white
  `rounded-2xl` cards (`.detail-panel`), cobalt active controls, `.ap-press` feedback,
  vehicles rendered with `CatalogCard`.

## 4c. Auth (`/prijava`, `/registracija`, `AuthPage` in `app/account.tsx`)

- Split screen. Left (`lg:w-[46%]`, hidden on mobile): obsidian `#111318` panel, `p-12`,
  AUTOPLAC.HR emblem, headline „Transparentna kupnja i prodaja vozila u Hrvatskoj.“ and
  three factual pillars (free private listings · market valuation with shown factors ·
  6 months free for the first 50 dealerships, INO-TEH d.o.o.). No testimonials, no
  user counts, no inflated claims.
- Right: `#F5F6F8`, centred white card `max-w-[420px] rounded-2xl p-8
  shadow-[0_8px_30px_rgba(15,23,42,0.05)]`; segmented `Prijava | Registracija` switch with
  a sliding thumb; account type `Privatni kupac / prodavač` vs `Autokuća / Salon`;
  `h-11 rounded-[10px]` inputs (`#D1D5DB`, cobalt focus ring at 15 %), Croatian field
  errors, password show/hide, `#111318` submit, cobalt text links.

## 5. Hard bans (never do)

- Never revert to a dark-first default (`#0B0D11` page background as default).
- Never place a gradient banner, photo hero, carousel or promo block above the homepage
  marketplace grid.
- Never render detailed full-colour emblems below 24 px; use `BrandMark` (§4.7).
- Never let button text clip; long labels get a shorter label plus an `aria-label`.
- Never float a filter button over content on mobile; use the full-width sticky sub-bar.
- Never render star ratings, review scores, monthly leasing/financing estimates
  (`Est. 437 €/mj`), "N-point inspection" claims, unsponsored insurance or finance
  banners, or placeholder `555` phone numbers.
- Never show a deal pill unless `meetsPublicBadge` is true **and** the seller opted in
  (`showPriceBadge === true`).
- Never stack bordered boxes inside bordered boxes. Inside a card use `--ap-divider`
  hairlines, not nested bordered panels.
- No gradients, no violet/indigo/teal accents, glows, emoji
  icons, generic SaaS badge clutter, or hand-drawn car wireframes. Use Lucide icons and
  real brand emblems (`BrandLogo`).
- No decorative static controls. Every visible filter control changes results.

## 6. Interaction and motion (Apple iOS language)

- Curves (in `app/globals.css`): `--ease-ios: cubic-bezier(0.22, 1, 0.36, 1)` for
  everything, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` only for small
  confirmations (heart fill, switch knob, thumb grab).
- Animate only `transform` and `opacity` (plus the card `box-shadow` lift). Hardware
  accelerated, `200ms` for controls, `500ms` for image zoom, `280ms` for sheets.
- Tactile press: `.ap-press` = `transition-transform duration-200 ease-(--ease-ios)
  active:scale-[0.97]` on pills, buttons, filter chips, heart toggles and tabs.
- Card hover: photo zooms to `scale(1.025)` over `500ms ease-ios`; the card lifts with
  the hover shadow. No other card motion.
- Sticky headers, the mobile filter sub-bar and bottom sheets use
  `backdrop-blur-xl` over an `85–90 %` opaque surface.
- Sheets and the mobile menu are full height (`h-dvh`), slide in from the edge with
  `ease-ios`, and pad the bottom with `env(safe-area-inset-bottom)`.
- `prefers-reduced-motion: reduce` disables every transition and animation.
- Visible `:focus-visible` ring in `--ap-focus` (`#2563EB`); never removed without replacement.
- Touch targets: `44×44px` minimum on mobile. Slider thumbs have a `44×44px` invisible
  hit area around a `20px` visible handle.

### Sliders

- Pointer Events only (`onPointerDown/Move/Up` + `setPointerCapture`) on a
  `touch-none select-none` track, so a drag never scrolls the page on iOS/Android.
- Pressing a thumb grabs that thumb; pressing the track grabs the nearest thumb. When
  both thumbs overlap, the first drag direction decides which one moves.
- The last-touched thumb gets the highest `z-index`, so thumbs can never get stuck.
- Drags update results live and sync the URL with `history.replaceState`
  (no history spam); discrete clicks use `pushState`.

## 7. Done checklist

- [ ] Light mode default verified; dark toggle still readable.
- [ ] Tokens from section 3 only; no new hex colours outside them.
- [ ] `tabular-nums` on all numbers; prices via `euro()`.
- [ ] No banned element from section 5.
- [ ] Verification gate from `SKILL.md` passed (typecheck, coverage, build, preview, screenshots).
