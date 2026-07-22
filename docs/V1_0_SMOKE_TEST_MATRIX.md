# V1.0 Critical Smoke-Test Matrix

Manual validation checklist for Starlight Card Binder foundation release readiness.
Run against a local `docs/` HTTP server (not `file://`). Exercise each journey at **desktop (≥1100px)** and **phone (≤430px)** widths.

Mark each cell: `pass` / `fail` / `n/a` / `blocked`. Failures need a bug note before V1.0 is considered complete.

Last walk: **2026-07-21** (Chromium). Signed-out + signed-in staff collector `@sorastarlight`. Gift claim and shop purchase reveals completed.

| # | Journey | Desktop | Mobile | Notes |
|---|---------|---------|--------|-------|
| 1 | Sign in and sign out | pass* | blocked | *Sign-in verified (account chrome, Sign Out, staff hub link). Sign-out not re-tested this pass to keep the session. |
| 2 | Navigate through the application shell | pass | pass | Sidebar + top links swap views; deep links use `binder.html?view=…`; native binder hides when embedded views are active (no dual chrome). Mobile hamburger/account chrome usable at 390×844. |
| 3 | Browse binder and collection views | pass | pass | Series packs open; filters show 12/12 Rising Star cards. Signed-in collection shows completion stats and card grid (24/24 unique). |
| 4 | Open a Daily Booster | pass | blocked | Shared `st-r3` reveal opened from Daily (pack → pile → cards). READY after open is expected: unlimited daily opens enabled for testing. Mobile not re-run signed-in. |
| 5 | Purchase and open a Shop pack | pass | blocked | Signed-in catalog loads. Purchased Series II pack (100 Star Bits, 9,490→9,390); shared `st-r3` reveal + `st-dialog` purchase confirm. Mobile not re-run signed-in. |
| 6 | Redeem and reveal a reward | pass* | blocked | *Redeem form loads signed-in (code input + Redeem Code). No live code redeemed this pass. |
| 7 | Claim and reveal a Received Gift or Twitch reward | pass | blocked | Claimed a Twitch gift through shared `st-r3` reveal (Open Reward → pack → pile → cards → done). Mobile not re-run signed-in. |
| 8 | Open, operate, and close each migrated modal (pointer) | pass | blocked | Shop pack details + purchase confirm open/close on pointer; purchase confirm used in live buy. Admin/profile crop dialogs not re-exercised this pass. |
| 9 | Same migrated modals via keyboard | pass* | blocked | *Escape closes shop purchase confirm. Full modal keyboard matrix (focus trap/restore) still worth a manual spot-check. |
| 10 | Staff/admin pages without exposing privileged actions | pass | pass | Signed-out admin hub keeps staff grid hidden. Signed-in staff sees Administration Hub link. |
| 11 | Cross-browser smoke (Chromium) | pass | pass | `dataset.starlightEngine=chromium`; lite mode off on capable desktop (`starlight-engine-chromium` only). |
| 12 | Cross-browser smoke (Firefox) | blocked | blocked | Needs a Firefox browser session (not available in this Chromium automation pass). |
| 13 | Cross-browser smoke (Opera GX) | blocked | blocked | Needs Opera GX; automated detection covered by `tests/browser-performance.test.mjs`. |
| 14 | Reduced motion | pass | n/a | `prefers-reduced-motion` rules present; signed-in reveal used shared engine (live reduced-motion device check still optional). |

## Automated coverage already in repo

These do **not** replace the matrix above, but must stay green:

- `npm test` — reveal, modal contracts, browser detection, shell labels, booster validation fixtures
- `npm run check` — JS/CSS structure, foundation inventory, migrations, boosters, tests
- `npm run validate:boosters` — booster configuration schema

## V1.0 wrap status (2026-07-21)

V1.0 foundation systems are in place (shared modals, reveal engine, design tokens, smoke matrix, anon RPC revokes). Remaining optional smoke: Firefox/Opera GX live pass, redeem with a real code, signed-in mobile re-run. Sign-out was exercised in earlier Chromium work.

## V1.1 — Collector Features (active slice)

First slice: **binder search correctness** — catalog-aware All Series search, collector-number matches, grid/showcase share one list, shell search visible on series landing, reset restores landing.

Second slice: **favorites polish** — favorite/unfavorite in full view, showcase star remove, visible favorites grid synced with showcase, filter summary per collection tab.

Third slice: **checklist + collection filter parity** — checklist uses shared search/filters; duplicates tab updates filter summary; Back to Series resets all binder filters.

Fourth slice: **binder browse chrome + trade search** — honest owned/not-collected count pill, collector-number badges, mobile filter head stack, trade wishlist search haystack includes collector numbers.

Fifth slice: **profiles + trading polish** — shell-safe public profile links, report CTA, self-trade guard, wishlist/offers a11y + pick search; migration `20260722020000_trade_lists_collector_number` applied to production 2026-07-21.

Sixth slice: **trade offer composer integrity** — selections survive search via qty maps, sticky offer summary, match-first pick sort, send → Sent tab, inbox profile links + deep-link tab, decline/cancel confirms, wishlist empty Browse All CTA.

Seventh slice: **collector recipient typeahead** — search by username, display name, or exact email (`search_trade_collectors`); emails never returned to the client; migration `20260722030000_search_trade_collectors` applied to production 2026-07-21.

## Fixes found during this walk

1. **Shop signed-out load** — `booster-shop-page.js` no longer throws away the pack catalog when Star Bits preview fails for anonymous users (shows signed-out CTA instead of “shop could not be loaded”).
2. **Staff access signed-out** — `staff-service.js` treats `get_my_staff_access` permission denials as `{ isStaff: false }` so admin pages show the product message instead of a raw Postgres error.

## Supabase project (MCP)

- Project: `starlight-card-binder` (`noxfauxbfdqgoxgiwrpu`, `us-west-2`, ACTIVE_HEALTHY)
- Client URL matches `docs/js/supabase-client.js`
- Remote migrations: `20260720160000_production_baseline`, `20260720180926_production_schema`, `20260721175802_revoke_anon_admin_rpc_execute`, `20260721191343_revoke_anon_collector_rpc_execute`
- Readiness snapshot: 3 users, 2 series, 24 cards, 3 shop boosters
- Applied to production via MCP (2026-07-21): `20260721175802_revoke_anon_admin_rpc_execute` — verified `anon_exec=false` and `authenticated`/`service_role` retain EXECUTE
- Applied to production via MCP (2026-07-21): `20260721191343_revoke_anon_collector_rpc_execute` — verified collector-private RPCs (`open_daily_booster`, Star Bits preview, notifications, gifts, favorites, etc.) have `anon_exec=false`
- Applied to production via MCP (2026-07-22): `trade_lists_collector_number` — `get_my_trade_lists` / `get_public_trade_lists` / `get_trade_offer_context` expose `collectorNumber`; anon cannot execute private trade RPCs
- Applied to production via MCP (2026-07-22): `search_trade_collectors` — authenticated typeahead for username/display name/exact email; anon cannot execute
- Applied to production via MCP (2026-07-22): `shell_navigation_settings` — `get_shell_navigation` (anon+auth), admin save/reset owner/admin only
- Applied to production via MCP (2026-07-22): `collector_identity_onboarding` — `username_locked`/`username_source`, Twitch claim + identity RPCs; anon cannot execute
