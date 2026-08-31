-- Layout v3: default public chrome to masthead (Pokémon TCG–style top nav).
-- Preserves explicit v3+ admin choices; upgrades legacy hybrid payloads on read.

update public.site_settings
set
  payload = jsonb_set(
    jsonb_set(
      coalesce(payload, '{}'::jsonb),
      '{chrome,layout}',
      '"masthead"'::jsonb,
      true
    ),
    '{version}',
    '3'::jsonb,
    true
  ),
  updated_at = now()
where setting_key = 'shell_navigation'
  and coalesce((payload->>'version')::int, 0) < 3;
