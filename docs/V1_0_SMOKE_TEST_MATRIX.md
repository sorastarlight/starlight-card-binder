# V1.0 Critical Smoke-Test Matrix

Manual validation checklist for Starlight Card Binder foundation release readiness.
Run against a local `docs/` HTTP server (not `file://`). Exercise each journey at **desktop (≥1100px)** and **phone (≤430px)** widths.

Mark each cell: `pass` / `fail` / `n/a` / `blocked`. Failures need a bug note before V1.0 is considered complete.

Last walk: **2026-07-21** (Chromium automation, signed-out session unless noted).

| # | Journey | Desktop | Mobile | Notes |
|---|---------|---------|--------|-------|
| 1 | Sign in and sign out | blocked | blocked | Needs collector credentials; Sign In / Create Account chrome is present when signed out. |
| 2 | Navigate through the application shell | pass | pass | Sidebar + top links swap views; deep links use `binder.html?view=…`; native binder hides when embedded views are active (no dual chrome). Mobile hamburger/account chrome usable at 390×844. |
| 3 | Browse binder and collection views | pass | pass | Series packs open; filters show 12/12 Rising Star cards; collection/daily/redeem/rewards routes load in shell without frame error. |
| 4 | Open a Daily Booster | blocked | blocked | Daily view loads; open/reveal/inventory update requires signed-in collector. |
| 5 | Purchase and open a Shop pack | blocked | blocked | Shop signed-out CTA is intentional. Purchase + `st-dialog` + reveal need auth. Fixed signed-out load so Star Bits preview errors no longer blank the shop. |
| 6 | Redeem and reveal a reward | blocked | blocked | Redeem view loads in shell; redeem/reveal needs a code + auth. |
| 7 | Claim and reveal a Received Gift or Twitch reward | blocked | blocked | Received Gifts view loads; claim/reveal needs auth + gift inventory. |
| 8 | Open, operate, and close each migrated modal (pointer) | blocked | blocked | Shop details/purchase modals require signed-in shop browse; admin/profile modals need staff/collector session. |
| 9 | Same migrated modals via keyboard | blocked | blocked | Same auth gate as row 8. |
| 10 | Staff/admin pages without exposing privileged actions | pass | pass | Signed-out admin hub keeps staff grid hidden. Staff RPC permission denials now map to friendly “Administration access is required.” (no privileged controls). |
| 11 | Cross-browser smoke (Chromium) | pass | pass | `dataset.starlightEngine=chromium`; lite mode off on capable desktop (`starlight-engine-chromium` only). |
| 12 | Cross-browser smoke (Firefox) | blocked | blocked | Needs a Firefox browser session (not available in this Chromium automation pass). |
| 13 | Cross-browser smoke (Opera GX) | blocked | blocked | Needs Opera GX; automated detection covered by `tests/browser-performance.test.mjs`. |
| 14 | Reduced motion | pass | n/a | `prefers-reduced-motion` rules present in loaded stylesheets; live reveal animation check still needs an authenticated pack open. |

## Automated coverage already in repo

These do **not** replace the matrix above, but must stay green:

- `npm test` — reveal, modal contracts, browser detection, shell labels, booster validation fixtures
- `npm run check` — JS/CSS structure, foundation inventory, migrations, boosters, tests
- `npm run validate:boosters` — booster configuration schema

## Browser notes

- Prefer real devices or DevTools device mode for rows 4–9 on mobile.
- Opera GX is Chromium-based; confirm `document.documentElement.dataset.starlightEngine` is `opera` or `opera-gx`.
- After hard-refresh, confirm cache-busted assets (`browser-performance.js`, `shared-ui`, `app-shell`, `qol-ui`) load.

## Fixes found during this walk

1. **Shop signed-out load** — `booster-shop-page.js` no longer throws away the pack catalog when Star Bits preview fails for anonymous users (shows signed-out CTA instead of “shop could not be loaded”).
2. **Staff access signed-out** — `staff-service.js` treats `get_my_staff_access` permission denials as `{ isStaff: false }` so admin pages show the product message instead of a raw Postgres error.
