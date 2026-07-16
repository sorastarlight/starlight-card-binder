# V89.1 Twitch Reward Studio

- Fixes reward rule check-constraint failures by normalizing irrelevant fields to NULL.
- Loads Twitch Channel Point rewards directly from Twitch through the Cloudflare Worker.
- Replaces the free-text reward ID field with a live reward dropdown.
- Adds a searchable visual card picker, conditional reward fields, rule previews, dashboard stats, test actions, and friendlier validation.
- Requires running `supabase/v89_1_twitch_reward_studio.sql` and redeploying the included Cloudflare Worker.
