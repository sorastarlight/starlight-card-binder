-- Additional Collection Quests for Season 1 progression depth.

insert into public.collector_titles (id, name, description, sort_order, is_active)
values
  ('quest_soaring_skies', 'Soaring Skies Adept', 'Completed the Soaring Skies series quest.', 122, true),
  ('quest_epic_seeker', 'Epic Seeker', 'Collected an Epic rarity card.', 123, true)
on conflict (id) do nothing;

insert into public.collection_quests (
  id, title, description, icon, requirement_type, requirement_target, requirement_count,
  reward_star_bits, reward_title_id, sort_order
) values
  ('own_one_epic', 'Own one Epic', 'Collect any Epic rarity card.', '💎', 'own_rarity', 'Epic', 1, 40, 'quest_epic_seeker', 15),
  ('complete_soaring_skies', 'Complete Soaring Skies', 'Own every collectible card in the Soaring Skies series.', '🌤️', 'own_series_complete', '002', 1, 150, 'quest_soaring_skies', 25),
  ('favorite_twenty', 'Favorite 20 cards', 'Star twenty cards in your collection.', '⭐', 'favorite_count', null, 20, 60, null, 35),
  ('open_twenty_boosters', 'Open 20 boosters', 'Open twenty Daily or Shop boosters.', '🚀', 'booster_opens', null, 20, 100, null, 55),
  ('own_thirty_uniques', 'Collect 30 unique cards', 'Grow your binder to thirty unique cards.', '📚', 'own_unique', null, 30, 80, null, 85),
  ('own_five_characters', 'Collect 5 Character cards', 'Own five cards from the Character category.', '🎤', 'own_category', 'character', 5, 50, null, 95)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  requirement_type = excluded.requirement_type,
  requirement_target = excluded.requirement_target,
  requirement_count = excluded.requirement_count,
  reward_star_bits = excluded.reward_star_bits,
  reward_title_id = excluded.reward_title_id,
  sort_order = excluded.sort_order,
  is_active = true;
