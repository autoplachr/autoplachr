# AUTOPLAC.HR — UI Taste Contract (permanent, binding)

This document is the single source of truth for visual and interaction decisions on
`AUTOPLAC.HR`. Every future UI change — new page, component, token, animation, or
copy adjustment — must satisfy every rule below before it is committed. When a
request conflicts with this contract, the contract wins unless the user explicitly
overrides it in the same message.

## 1. Product & character

- **A high-density European automotive marketplace**, engineered with the precision
  of `mobile.de` / `AutoScout24`. Content is the product: vehicles, prices, kilometre
  readings, emissions, equipment, seller trust, and provenance.
- Tone is **concrete, utilitarian, authoritative**. Data first, decoration second.
- **Never** style this site like a SaaS landing page, a crypto dashboard, or a
  generic AI-generated page. No abstract illustration of "cars" that does not help
  a buyer identify a body type or a listing faster.
- Layouts are dense but breathable: fixed card baselines, tabular alignment, and
  short, factual sentences. Croatian copy; EUR prices; Croatian number formatting.

## 2. Anti-generic rules (strictly enforced)

1. **Use flat surfaces. Decorative gradients, violet, indigo, teal accents, and glows are prohibited.**
2. **Never combine `border` + `box-shadow` on the same card.** Use a crisp `1px`
   border in Dark Mode (`#1E2430`) and flat elevated surfaces in Light Mode
   (`#FFFFFF` cards on a `#F1F4F8` page). Elevation comes from surface contrast,
   never from a glow.
3. **Keep the homepage search above the fold.** Use the desktop utility row and lead with search on mobile. Keep feature layouts compact and data-first.
4. **Use Lucide icons for controls and vehicle categories.** Hand-coded automotive silhouettes and wireframes are prohibited. Use icons when they add information or aid recognition.
5. **Color is information only.**
   - `#2563EB` — exclusively primary CTAs, active tab / focus states.
   - `#10B981` — exclusively verified EUR price savings and price drops.
   - Everything else stays in a three-step neutral ink/surface ramp:
     `--text` / `--spec` / `--muted` on `--surface` / `--hover` / `--background`.
   - Never use color as mere decoration, and never tint a whole section blue,
     violet, teal, or amber.
6. **Typography & motion.**
   - `tabular-nums` on all prices, mileages, kW/KS values, dates, counters, and
     platform statistics.
   - Prose never exceeds `65ch`; hero subheadlines are one factual line.
   - Minimum interactive target: `44px` in both axes (nav links, tabs, chips,
     buttons, icon buttons).
   - Visible `:focus-visible` ring (blue), never removed without replacement.
   - Press feedback `active:scale-[0.98]` on buttons and interactive cards.
   - Animate **only** `transform` and `opacity`, under `250ms`, with
     `prefers-reduced-motion` honoured. No animated shadows, gradients, or layout
     properties. The search placeholder may type and delete text as content updates, pausing while focused, while populated, or when reduced motion is enabled.

## 3. Implementation checklist (apply before calling UI work done)

- [ ] Flat surfaces; no border+shadow pairing on cards; dark borders `#1E2430`.
- [ ] No new generic icon labels, glows, or foggy centered hero.
- [ ] All numeric data uses `tabular-nums`; prices formatted with `euro()`.
- [ ] All new interactive elements are ≥44px and have `:focus-visible` and
      `active:scale-[0.98]`.
- [ ] Motion is <250ms, transform/opacity only, reduced-motion respected.
- [ ] Light and Dark themes both verified with the same density and hierarchy.
- [ ] Verification: `npm run typecheck`, `node scripts/verify-vehicle-coverage.mjs`,
      `npm run build:site`, restart `node scripts/preview-site.mjs` on port `4323`.
      Do not launch Playwright or browser-runtime evaluation tools in this
      Windows environment.

## 4. Reference surface map

| Surface | Treatment |
| --- | --- |
| Page background | Light `#F1F4F8` / Dark `#0B0C0E` |
| Card / console | Flat `#FFFFFF` on light; `#14161A` with `1px #1E2430` on dark |
| Homepage | Flat desktop utility bar, natural-language input, and compact search console |
| Brand rail | Single wrapping row, uniform monochrome emblems, no count badges |
| Price rating pill | Information colour only (`#10B981` for verified savings) |
| CTA / active tab | `#2563EB` |
