-- Expand avatar frame catalog: new colors, ring-safe gradients, creative ornaments, breathe effect.

alter table public.collector_avatar_frames
  drop constraint if exists collector_avatar_frames_effect_check;

alter table public.collector_avatar_frames
  add constraint collector_avatar_frames_effect_check
  check (effect in ('static', 'shimmer', 'pulse', 'glitter', 'breathe'));

-- Reactivate legacy gradient frames with ring-safe CSS presets.
update public.collector_avatar_frames
set
  is_active = true,
  description = case id
    when 'frame_rainbow' then 'A spinning rainbow ring that cycles through Starlight hues.'
    when 'frame_aurora' then 'Northern-light gradient ring with a soft aurora drift.'
    when 'frame_holofoil' then 'Iridescent holofoil ring with prismatic shimmer.'
    when 'frame_prism' then 'Multi-hue prismatic ring for rare collectors.'
    when 'frame_gradient_sunset' then 'Pink-to-gold sunset gradient ring.'
    when 'frame_gradient_ocean' then 'Blue-to-teal ocean gradient ring.'
    else description
  end
where id in (
  'frame_rainbow',
  'frame_aurora',
  'frame_holofoil',
  'frame_prism',
  'frame_gradient_sunset',
  'frame_gradient_ocean'
);

insert into public.collector_avatar_frames (
  id, name, description, css_preset, effect, sort_order, is_active
) values
  ('frame_coral', 'Coral Ring', 'Warm coral glow for bright profiles.', 'coral', 'static', 75, true),
  ('frame_amber', 'Amber Ring', 'Honey amber rim with soft warmth.', 'amber', 'static', 76, true),
  ('frame_teal', 'Teal Ring', 'Fresh teal border energy.', 'teal', 'static', 77, true),
  ('frame_slate', 'Slate Ring', 'Muted slate for understated profiles.', 'slate', 'static', 78, true),
  ('frame_lavender', 'Lavender Ring', 'Soft lavender collector aura.', 'lavender', 'static', 79, true),
  ('frame_mint', 'Mint Ring', 'Cool mint highlight ring.', 'mint', 'static', 80, true),
  ('frame_peach', 'Peach Ring', 'Peachy pastel profile frame.', 'peach', 'static', 81, true),
  ('frame_onyx', 'Onyx Ring', 'Deep onyx rim with subtle shine.', 'onyx', 'static', 82, true),
  ('frame_nebula', 'Nebula Ring', 'Cosmic nebula gradient with drifting color.', 'nebula', 'pulse', 135, true),
  ('frame_eclipse', 'Eclipse Ring', 'Dark eclipse ring with golden flare.', 'eclipse', 'breathe', 136, true),
  ('frame_candy', 'Candy Gradient', 'Pastel candy-shop gradient ring.', 'candy', 'shimmer', 137, true),
  ('frame_angel_wings', 'Angel Wings', 'Golden wings and halo for legendary collectors.', 'angel-wings', 'pulse', 150, true),
  ('frame_star_crown', 'Star Crown', 'Five-star crown above a golden ring.', 'star-crown', 'static', 151, true),
  ('frame_moon_orbit', 'Moon Orbit', 'Orbiting moons around a lavender ring.', 'moon-orbit', 'breathe', 152, true),
  ('frame_phoenix', 'Phoenix Wings', 'Fiery phoenix wings with ember glow.', 'phoenix', 'pulse', 153, true),
  ('frame_fairy', 'Fairy Wings', 'Pastel fairy wings with sparkle rim.', 'fairy', 'shimmer', 154, true),
  ('frame_thorns', 'Thorn Ring', 'Emerald thorn ring for rare achievements.', 'thorns', 'static', 155, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  css_preset = excluded.css_preset,
  effect = excluded.effect,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
