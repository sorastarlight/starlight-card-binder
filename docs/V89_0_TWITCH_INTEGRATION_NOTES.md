# V89.0 — Twitch Integration & Stream Rewards

Adds:

- Collector Twitch account linking through a Cloudflare Worker
- Broadcaster OAuth connection
- Twitch EventSub webhook verification
- Channel Point, subscription, and follow reward rules
- Manual viewer rewards from the Administration Hub
- Card, booster, and Star Bits delivery
- Linked-viewer directory and Twitch reward history
- Public-profile Twitch identity
- Site notifications for linking and rewards

## Install

1. Run `supabase/v89_0_twitch_stream_rewards.sql`.
2. Deploy the included `cloudflare-worker` project.
3. Register the Worker callback in the Twitch Developer Console.
4. Copy the `docs` files into the site repository.
5. Open **Administration Hub → Twitch & Stream Rewards** and save the Worker URL.
6. Connect the broadcaster account and sync EventSub.

Keep all secret values in Cloudflare Worker secrets. Never place the Twitch client secret or Supabase service-role key in the GitHub Pages site.
