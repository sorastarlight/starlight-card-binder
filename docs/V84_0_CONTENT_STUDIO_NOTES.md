# V84.0 — Starlight Content Studio

## Database
Run `supabase/v84_0_content_studio_account_reveal.sql` after V83.1.

## Administration Hub
The former Booster Configuration page is now the **Starlight Content Studio** with separate libraries for:

- Series
- Cards
- Booster Packs
- Uploaded Assets

Booster reward modes:

- Rarity slots
- Random cards from one series
- Exact cards
- Weighted custom pool
- Single card
- Cards plus bonus Star Bits

## Account controls
Signed-out visitors see **Log In** and **Create Account** in the top-right account bar. Signed-in collectors receive an account menu with collection, profile, trade offers, staff tools when applicable, and sign out.

## Reveal effects and sound
Card reveals now use clearly different rarity tiers. Sound playback is handled directly by the reusable reward-reveal module and honors the existing sound preference.
