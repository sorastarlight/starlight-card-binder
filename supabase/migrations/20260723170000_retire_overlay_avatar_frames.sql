-- Retire full-area / padding-box overlay avatar frames; keep ring-only presets active.
-- Soft-deactivate so existing unlock rows remain, but frames are hidden from grants and equip UI.

update public.collector_avatar_frames
set is_active = false
where id in (
  'frame_rainbow',
  'frame_aurora',
  'frame_holofoil',
  'frame_prism',
  'frame_gradient_sunset',
  'frame_gradient_ocean'
);

-- Season pass tier previously rewarded holofoil; switch to a ring-only celestial frame.
update public.season_reward_tiers
set reward_frame_id = 'frame_celestial'
where reward_frame_id in (
  'frame_rainbow',
  'frame_aurora',
  'frame_holofoil',
  'frame_prism',
  'frame_gradient_sunset',
  'frame_gradient_ocean'
);

update public.collection_quests
set reward_frame_id = 'frame_celestial'
where reward_frame_id in (
  'frame_rainbow',
  'frame_aurora',
  'frame_holofoil',
  'frame_prism',
  'frame_gradient_sunset',
  'frame_gradient_ocean'
);

-- Clear equipped overlay frames so profiles do not keep a retired selection.
update public.profiles
set selected_frame_id = null
where selected_frame_id in (
  'frame_rainbow',
  'frame_aurora',
  'frame_holofoil',
  'frame_prism',
  'frame_gradient_sunset',
  'frame_gradient_ocean'
);
