# V89.2 — Received Rewards & Twitch Console

## Install
1. Run `supabase/v89_2_received_rewards_twitch_console.sql` in Supabase SQL Editor.
2. Replace the included site files.
3. Commit and deploy.
4. Hard refresh once with Ctrl+F5.

## Received Rewards
- Adds `binder.html?view=rewards` and a new sidebar link.
- Twitch redeems, one-time Twitch gifts, and reward codes are queued for the collector to open.
- Notifications route directly to Received Rewards.
- Claiming a booster uses the existing booster reveal sequence.

## Twitch Rewards
- Renames the page to Twitch Rewards.
- Renames Reward Rules to Twitch Redeems.
- Adds a Create New Redeem modal.
- Renames Manual Rewards to Give One Time Reward.
- One-time rewards use a linked-viewer dropdown.
- Fixes card catalog fields (`card_number`, `is_visible`) and restores card/booster selectors.

## User Directory
- Repairs malformed HTML that could prevent the page from initializing.
- Replaces the directory RPC with a stable server-side query.
- Adds linked Twitch identity to the directory.

## Twitch Channel Points in the Card Shop
Twitch does not expose a viewer's Channel Points balance to third-party websites and does not permit an external website to directly spend those points. The shop therefore shows a Twitch Channel Points option only for boosters mapped to an active Twitch redeem. The collector completes the redemption on Twitch, and the resulting pack appears in Received Rewards.
