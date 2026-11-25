# Repository agent instructions

## Mandatory first read

**Before touching any UI, layout, styling, animation, or visual component in this
repository, read `DESIGN.md` at the repository root in full.** It is the binding UI
taste contract for `AUTOPLAC.HR`; follow it exactly and do not ask for permission
to deviate from it. If a later instruction conflicts with `DESIGN.md`, the later
instruction only overrides the contract when it explicitly says so.

The contract applies on every screen. Keep gradients, violet/indigo/teal accents,
hand-coded automotive wireframes, and combined card borders and shadows out of the UI.

## Verification rule

Verify UI work only with these commands (Playwright / browser-runtime evaluation
tools hang in this Windows environment and must not be used):

1. `npm run typecheck`
2. `node scripts/verify-vehicle-coverage.mjs`
3. `npm run build:site`
4. Restart `node scripts/preview-site.mjs` on port `4323`.
