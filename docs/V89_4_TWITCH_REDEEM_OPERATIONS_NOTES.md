# V89.4 — Twitch Redeem Operations & Testing

## Added
- EventSub HTTP 409 "subscription already exists" is treated as healthy.
- Master switch to pause or enable all automatic Twitch reward processing.
- Enable All and Disable All controls for individual Twitch Redeems.
- Visual Test Redeem window with a linked-viewer selector.
- Filterable Reward History using actual Twitch event records.
- Last EventSub event and reward delivery timestamps are stored for diagnostics.
- Globally paused events are logged as ignored instead of silently disappearing.

## Install
1. Run `supabase/v89_4_twitch_redeem_operations.sql`.
2. Replace the included `docs` files.
3. Redeploy the included Cloudflare Worker with `npm run deploy`.
