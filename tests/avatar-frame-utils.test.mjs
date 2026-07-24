import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  AVATAR_FRAME_EFFECTS,
  AVATAR_FRAME_PRESETS,
  LEVEL_AVATAR_FRAME_UNLOCKS,
  applyAvatarFrameClass,
  avatarFrameClassName,
  avatarFrameOverlayMarkup,
  avatarFrameOverlayUrl,
  normalizeAvatarFrameEffect,
  normalizeAvatarFramePreset
} from '../docs/js/avatar-frame-utils.js';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('avatar frame utils normalize presets and build class names', () => {
  assert.ok(AVATAR_FRAME_PRESETS.includes('celestial'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('glitter'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('coral'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('rainbow'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('angel-wings'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('moon-orbit'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('radiance-v'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('level-apex'));
  assert.ok(AVATAR_FRAME_PRESETS.includes('asset-ring'));
  assert.equal(AVATAR_FRAME_PRESETS.includes('nope'), false);
  assert.ok(AVATAR_FRAME_EFFECTS.includes('shimmer'));
  assert.ok(AVATAR_FRAME_EFFECTS.includes('breathe'));
  assert.equal(normalizeAvatarFramePreset('Gold'), 'gold');
  assert.equal(normalizeAvatarFramePreset('Angel-Wings'), 'angel-wings');
  assert.equal(normalizeAvatarFramePreset('Radiance-III'), 'radiance-iii');
  assert.equal(normalizeAvatarFramePreset('nope'), '');
  assert.equal(normalizeAvatarFrameEffect('PULSE'), 'pulse');
  assert.equal(normalizeAvatarFrameEffect('BREATHE'), 'breathe');
  assert.equal(normalizeAvatarFrameEffect('weird'), 'static');
  assert.equal(avatarFrameClassName(null), '');
  assert.equal(avatarFrameClassName('sky'), 'avatar-frame avatar-frame-sky');
  assert.equal(
    avatarFrameClassName({ cssPreset: 'celestial', effect: 'pulse' }),
    'avatar-frame avatar-frame-celestial avatar-frame-effect-pulse'
  );
  assert.equal(
    avatarFrameClassName({ css_preset: 'phoenix', effect: 'breathe' }),
    'avatar-frame avatar-frame-phoenix avatar-frame-effect-breathe'
  );
  assert.equal(
    avatarFrameClassName({ css_preset: 'rose' }),
    'avatar-frame avatar-frame-rose'
  );
  assert.equal(
    avatarFrameOverlayUrl({ overlayImageUrl: 'site_assets/frame.png' }),
    'site_assets/frame.png'
  );
  assert.equal(avatarFrameOverlayUrl({ cssPreset: 'sky' }), '');
  assert.match(
    avatarFrameOverlayMarkup({ overlayImageUrl: 'site_assets/frame.png' }, (v) => v),
    /avatar-frame-overlay.*site_assets\/frame\.png/
  );

  const host = {
    classList: ['shell-avatar', 'has-photo', 'avatar-frame-gold', 'avatar-frame'],
    className: 'shell-avatar has-photo avatar-frame avatar-frame-gold',
    appendChild(node) {
      this.lastChild = node;
    },
    querySelector() {
      return null;
    }
  };
  applyAvatarFrameClass(host, { cssPreset: 'glitter', effect: 'glitter' });
  assert.equal(host.className, 'shell-avatar has-photo avatar-frame avatar-frame-glitter avatar-frame-effect-glitter');
  applyAvatarFrameClass(host, { cssPreset: 'fairy', effect: 'shimmer' });
  assert.equal(host.className, 'shell-avatar has-photo avatar-frame avatar-frame-fairy avatar-frame-effect-shimmer');
  applyAvatarFrameClass(host, {
    cssPreset: 'asset-ring',
    effect: 'breathe',
    overlayImageUrl: 'site_assets/sovereign.png'
  });
  assert.match(host.className, /avatar-frame-has-overlay/);
  if (typeof document !== 'undefined') {
    assert.equal(host.lastChild?.className, 'avatar-frame-overlay');
    assert.equal(host.lastChild?.src, 'site_assets/sovereign.png');
  }
  applyAvatarFrameClass(host, null);
  assert.equal(host.className, 'shell-avatar has-photo');
});

test('level avatar frame unlock map stays aligned with migration thresholds', () => {
  assert.equal(LEVEL_AVATAR_FRAME_UNLOCKS.length, 8);
  assert.equal(LEVEL_AVATAR_FRAME_UNLOCKS[0].frameId, 'frame_level_ember');
  assert.equal(LEVEL_AVATAR_FRAME_UNLOCKS[7].frameId, 'frame_radiance_v');
  assert.ok(LEVEL_AVATAR_FRAME_UNLOCKS.every((row) => AVATAR_FRAME_PRESETS.includes(row.cssPreset)));
});

test('avatar frames migration and client wiring stay linked', async () => {
  const [migration, retireMigration, expandMigration, prestigeMigration, utils, css, profileHtml, adminHtml, service] = await Promise.all([
    read('supabase/migrations/20260723150000_profile_avatar_frames.sql'),
    read('supabase/migrations/20260723170000_retire_overlay_avatar_frames.sql'),
    read('supabase/migrations/20260724140000_expand_avatar_frames.sql'),
    read('supabase/migrations/20260724160000_prestige_avatar_frames.sql'),
    read('docs/js/avatar-frame-utils.js'),
    read('docs/css/avatar-frames.css'),
    read('docs/profile-settings.html'),
    read('docs/admin-boosters.html'),
    read('docs/js/profile-extras-service.js')
  ]);
  assert.match(migration, /collector_avatar_frames/);
  assert.match(migration, /selected_frame_id/);
  assert.match(migration, /requested_frame_id/);
  assert.match(migration, /admin_list_avatar_frames/);
  assert.match(migration, /reward_frame_id/);
  assert.match(migration, /overlay_image_url/);
  assert.match(retireMigration, /frame_holofoil/);
  assert.match(retireMigration, /is_active = false/);
  assert.match(retireMigration, /frame_celestial/);
  assert.match(expandMigration, /frame_angel_wings/);
  assert.match(expandMigration, /frame_phoenix/);
  assert.match(expandMigration, /breathe/);
  assert.match(expandMigration, /is_active = true/);
  assert.match(prestigeMigration, /frame_radiance_v/);
  assert.match(prestigeMigration, /sync_my_level_avatar_frames/);
  assert.match(prestigeMigration, /overlay_image_url/);
  assert.match(prestigeMigration, /overlayImageUrl/);
  assert.match(utils, /avatarFrameClassName/);
  assert.match(utils, /'angel-wings'/);
  assert.match(utils, /'radiance-v'/);
  assert.match(utils, /avatarFrameOverlayUrl/);
  assert.match(utils, /LEVEL_AVATAR_FRAME_UNLOCKS/);
  assert.match(css, /\.avatar-frame-celestial/);
  assert.match(css, /\.avatar-frame-angel-wings::before/);
  assert.match(css, /\.avatar-frame-radiance-v::after/);
  assert.match(css, /\.avatar-frame-overlay/);
  assert.match(css, /border: 5px solid transparent/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /avatar-frame-effect-breathe/);
  assert.doesNotMatch(css, /padding-box/);
  assert.doesNotMatch(css, /linear-gradient\(#fff, #fff\) padding-box/);
  assert.match(profileHtml, /avatar-frame-select/);
  assert.match(profileHtml, /avatar-frames\.css\?v=1\.3\.0/);
  assert.match(adminHtml, /data-tab="frames"/);
  assert.match(adminHtml, /framesTab/);
  assert.match(service, /requested_frame_id/);
});
