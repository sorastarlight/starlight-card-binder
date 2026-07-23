import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  AVATAR_FRAME_EFFECTS,
  AVATAR_FRAME_PRESETS,
  applyAvatarFrameClass,
  avatarFrameClassName,
  normalizeAvatarFrameEffect,
  normalizeAvatarFramePreset
} from '../docs/js/avatar-frame-utils.js';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('avatar frame utils normalize presets and build class names', () => {
  assert.ok(AVATAR_FRAME_PRESETS.includes('holofoil'));
  assert.ok(AVATAR_FRAME_EFFECTS.includes('shimmer'));
  assert.equal(normalizeAvatarFramePreset('Gold'), 'gold');
  assert.equal(normalizeAvatarFramePreset('nope'), '');
  assert.equal(normalizeAvatarFrameEffect('PULSE'), 'pulse');
  assert.equal(normalizeAvatarFrameEffect('weird'), 'static');
  assert.equal(avatarFrameClassName(null), '');
  assert.equal(avatarFrameClassName('sky'), 'avatar-frame avatar-frame-sky');
  assert.equal(
    avatarFrameClassName({ cssPreset: 'holofoil', effect: 'shimmer' }),
    'avatar-frame avatar-frame-holofoil avatar-frame-effect-shimmer'
  );
  assert.equal(
    avatarFrameClassName({ css_preset: 'rose' }),
    'avatar-frame avatar-frame-rose'
  );

  const host = {
    classList: ['shell-avatar', 'has-photo', 'avatar-frame-gold', 'avatar-frame'],
    className: 'shell-avatar has-photo avatar-frame avatar-frame-gold'
  };
  applyAvatarFrameClass(host, { cssPreset: 'aurora', effect: 'pulse' });
  assert.equal(host.className, 'shell-avatar has-photo avatar-frame avatar-frame-aurora avatar-frame-effect-pulse');
  applyAvatarFrameClass(host, null);
  assert.equal(host.className, 'shell-avatar has-photo');
});

test('avatar frames migration and client wiring stay linked', async () => {
  const [migration, utils, css, profileHtml, adminHtml, service] = await Promise.all([
    read('supabase/migrations/20260723150000_profile_avatar_frames.sql'),
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
  assert.match(migration, /frame_holofoil.*shimmer|'holofoil', 'shimmer'/);
  assert.match(utils, /avatarFrameClassName/);
  assert.match(css, /\.avatar-frame-holofoil/);
  assert.match(css, /linear-gradient\(transparent, transparent\) padding-box/);
  assert.match(css, /avatar-frame-holofoil-shimmer/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /linear-gradient\(#fff, #fff\) padding-box/);
  assert.match(profileHtml, /avatar-frame-select/);
  assert.match(profileHtml, /avatar-frames\.css/);
  assert.match(adminHtml, /data-tab="frames"/);
  assert.match(adminHtml, /framesTab/);
  assert.match(service, /requested_frame_id/);
});
