# V91.0 — Card & Booster System Rebuild

## Critical install order
1. Run `docs/supabase/v91_0_card_booster_system_rebuild.sql`.
2. Replace the deployed `docs` folder.
3. Hard-refresh once with Ctrl+F5.

## Critical fix
The old rarity query called `random()` separately for each rarity row. This caused later rows—especially Legendary—to be chosen far too often. V91.0 uses one random roll per slot.

## Booster workflow
- Guided presets use conservative odds.
- Exact slot odds use linked sliders and number inputs.
- All slot changes save with the main Save Booster Pack button.
- The simulator performs 100, 1,000, or 10,000 virtual openings without awarding cards.

## Suggested commit
`Rebuild card details and correct booster pull odds`
