# V1.0 Critical Smoke-Test Matrix

Manual validation checklist for Starlight Card Binder foundation release readiness.
Run against a local `docs/` HTTP server (not `file://`). Exercise each journey at **desktop (≥1100px)** and **phone (≤430px)** widths.

Mark each cell: `pass` / `fail` / `n/a`. Failures need a bug note before V1.0 is considered complete.

| # | Journey | Desktop | Mobile | Notes |
|---|---------|---------|--------|-------|
| 1 | Sign in and sign out | | | Session persists across shell views; sign-out clears collector chrome. |
| 2 | Navigate through the application shell | | | Sidebar + top links swap views without dual chrome; deep links use `binder.html?view=…`. |
| 3 | Browse binder and collection views | | | Filters work; card thumbs load; no console asset errors. |
| 4 | Open a Daily Booster | | | Uses shared reveal engine; inventory updates after close. |
| 5 | Purchase and open a Shop pack | | | Confirm dialog is `st-dialog`; reveal + balance update. |
| 6 | Redeem and reveal a reward | | | Code path completes; reveal is shared engine. |
| 7 | Claim and reveal a Received Gift or Twitch reward | | | Claim UI + reveal parity with shop/daily. |
| 8 | Open, operate, and close each migrated modal (pointer) | | | Shop details/purchase, Star Bits confirm, profile crop, admin news/gifts/twitch/boosters. |
| 9 | Same migrated modals via keyboard | | | Escape closes; Tab cycles; focus restores to launcher. |
| 10 | Staff/admin pages without exposing privileged actions | | | Signed-out or non-staff users cannot perform privileged actions. |
| 11 | Cross-browser smoke (Chromium) | | | Shell loads; lite mode off on capable desktop; mobile lite acceptable. |
| 12 | Cross-browser smoke (Firefox) | | | `firefox-performance-mode` on; embedded views handshake/retry still work. |
| 13 | Cross-browser smoke (Opera GX) | | | Detected as opera/opera-gx; no blank shell; dialogs usable. |
| 14 | Reduced motion | | | Reveal/shell animations respect `prefers-reduced-motion`. |

## Automated coverage already in repo

These do **not** replace the matrix above, but must stay green:

- `npm test` — reveal, modal contracts, browser detection, shell labels, booster validation fixtures
- `npm run check` — JS/CSS structure, foundation inventory, migrations, boosters, tests
- `npm run validate:boosters` — booster configuration schema

## Browser notes

- Prefer real devices or DevTools device mode for rows 4–9 on mobile.
- Opera GX is Chromium-based; confirm `document.documentElement.dataset.starlightEngine` is `opera` or `opera-gx`.
- After hard-refresh, confirm cache-busted assets (`browser-performance.js`, `shared-ui`, `app-shell`, `qol-ui`) load.
