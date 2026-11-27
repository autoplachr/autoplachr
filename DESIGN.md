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
| `--ap-focus` | `#2563EB` | Focus rings and text links only |
| `--ap-deal` | `#22C55E` | `Dobra cijena` pill (white text) |
| `--ap-tag-bg` / `--ap-tag-ink` | `#FFF7ED` / `#C2410C` | Right-side price tag, only for real `Reg. MM/YYYY` or `PDV (R1)` data |

`Odlična cijena` is a white `#FFFFFF` pill with `#111318` text.

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
5. **Mobile (< 1024px)**: sticky `Filteri (n)` pill opens the same rail in a slide-over
   sheet. Cards are one column. No horizontal overflow at `390px`.

## 5. Hard bans (never do)

- Never revert to a dark-first default (`#0B0D11` page background as default).
- Never place a hero banner, carousel or promo block above the homepage marketplace.
- Never render star ratings, review scores, monthly leasing/financing estimates
  (`Est. 437 €/mj`), "N-point inspection" claims, unsponsored insurance or finance
  banners, or placeholder `555` phone numbers.
- Never show a deal pill unless `meetsPublicBadge` is true **and** the seller opted in
  (`showPriceBadge === true`).
- Never stack bordered boxes inside bordered boxes. Inside a card use `--ap-divider`
  hairlines, not nested bordered panels.
- No gradients, violet/indigo/teal accents, glows, generic SaaS badge clutter, or
  hand-drawn car wireframes. Use Lucide icons and real brand emblems (`BrandLogo`).
- No decorative static controls. Every visible filter control changes results.

## 6. Interaction and motion

- Minimum touch target `36px` on desktop controls and `44px` for primary mobile actions.
- Visible `:focus-visible` ring in `--ap-focus` (`#2563EB`); never removed without replacement.
- Animate only `transform`, `opacity` and card `box-shadow`, under `250ms`, and honour
  `prefers-reduced-motion`.
- Slider drags update results live and sync the URL with `history.replaceState`
  (no history spam); discrete clicks use `pushState`.

## 7. Done checklist

- [ ] Light mode default verified; dark toggle still readable.
- [ ] Tokens from section 3 only; no new hex colours outside them.
- [ ] `tabular-nums` on all numbers; prices via `euro()`.
- [ ] No banned element from section 5.
- [ ] Verification gate from `SKILL.md` passed (typecheck, coverage, build, preview, screenshots).
