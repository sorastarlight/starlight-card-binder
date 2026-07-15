# V88.0 — Events & Seasonal Content Framework

Adds a database-backed Events system to Starlight Card Management.

## Administration
- New **Events** tab in Starlight Card Management.
- Create/edit timed events with name, description, banner, accent color, dates, visibility, and sort order.
- Upload event banners to Supabase Storage under `site-assets/events/`.
- Assign existing cards and booster packs to an event.
- Configure event achievements with Star Bits and title rewards.

## Collector experience
- New **Starlight Events** destination in the Explore sidebar.
- Active events show a banner, live time remaining, linked booster packs, card count, and achievements.
- Hidden, inactive, upcoming, and expired events are not displayed as active.

## Install
Run `docs/supabase/v88_0_events_seasonal_content.sql`, then deploy the updated `docs` package.
