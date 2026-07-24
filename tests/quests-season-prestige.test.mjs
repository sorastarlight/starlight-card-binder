import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canEvolve,
  canFuse,
  evolutionCostForNextTier,
  fusionCostForNextTier,
  nextEvolutionTier,
  nextFusionTier,
  prestigeClassName,
  prestigeLabel,
  prestigeTierFromQuantity
} from '../docs/js/prestige-utils.js';
import {
  PUBLIC_SHELL_DESTINATIONS,
  createDefaultShellNavigation
} from '../docs/js/shell-navigation-defaults.js';
import { aliasShellRoute, isKnownShellRoute } from '../docs/js/shell-route-utils.js';

const read = (path) => readFile(path, 'utf8');

test('Starlight Evolution costs and canEvolve match the locked ladder', () => {
  assert.equal(evolutionCostForNextTier('stardust'), 8);
  assert.equal(evolutionCostForNextTier('star_bit'), 20);
  assert.equal(evolutionCostForNextTier('protostar'), 45);
  assert.equal(evolutionCostForNextTier('starlight'), 100);
  assert.equal(evolutionCostForNextTier('super_starlight'), 220);
  assert.equal(evolutionCostForNextTier('starlight_burst'), null);
  assert.equal(fusionCostForNextTier('stardust'), 8);
  assert.equal(nextEvolutionTier('stardust'), 'star_bit');
  assert.equal(nextFusionTier('super_starlight'), 'starlight_burst');
  assert.equal(nextFusionTier('starlight_burst'), null);
  assert.equal(canEvolve(9, 'stardust'), true);
  assert.equal(canFuse(8, 'stardust'), false);
  assert.equal(canEvolve(221, 'super_starlight'), true);
  assert.equal(canEvolve(999, 'starlight_burst'), false);
  assert.equal(prestigeLabel('protostar'), '★★ Protostar');
  assert.equal(prestigeClassName('star_bit'), 'prestige-frame prestige-star-bit');
  assert.equal(prestigeClassName('stardust'), '');
  assert.equal(prestigeTierFromQuantity(500), 'stardust');
});

test('quests and season pass are shell destinations', () => {
  assert.ok(isKnownShellRoute('quests'));
  assert.ok(isKnownShellRoute('season-pass'));
  assert.equal(aliasShellRoute('collection-quests.html'), 'quests');
  assert.equal(aliasShellRoute('season-pass'), 'season-pass');
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some((entry) => entry.value === 'quests'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some((entry) => entry.value === 'season-pass'));
  const nav = createDefaultShellNavigation();
  const myStuff = nav.sidebar.sections.find((section) => section.id === 'my-stuff');
  assert.ok(myStuff.items.some((item) => item.destination === 'quests'));
  assert.ok(myStuff.items.some((item) => item.destination === 'season-pass'));
});

test('quests and season pass pages wire services and claim UI', async () => {
  const [questsPage, seasonPage, questsHtml, seasonHtml, shell] = await Promise.all([
    read('docs/js/pages/collection-quests-page.js'),
    read('docs/js/pages/season-pass-page.js'),
    read('docs/collection-quests.html'),
    read('docs/season-pass.html'),
    read('docs/js/app-shell.js')
  ]);
  assert.match(questsPage, /claimCollectionQuest/);
  assert.match(seasonPage, /claimSeasonPassTier/);
  assert.match(questsHtml, /collection-quests-page\.js/);
  assert.match(seasonHtml, /season-pass-page\.js/);
  assert.match(shell, /quests:\{title:'Collection Quests',src:'collection-quests\.html'\}/);
  assert.match(shell, /'season-pass':\{title:'Seasonal Collection Pass',src:'season-pass\.html'\}/);
});

test('binder and collection load Starlight Evolution frame styles and helpers', async () => {
  const [app, binder, collection, css, reveal, migration, evolutionMigration] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/css/prestige-frames.css'),
    read('docs/js/reward-reveal.js'),
    read('supabase/migrations/20260723190000_card_fusion_leveling.sql'),
    read('supabase/migrations/20260723200000_starlight_evolution.sql')
  ]);
  assert.match(app, /function getCardPrestigeTier/);
  assert.match(app, /prestigeFrameClass/);
  assert.match(app, /data-fuse-card/);
  assert.match(app, /fuseSelectedCard/);
  assert.match(app, /full-card-wrap[\s\S]*\$\{prestigeClass\}/);
  assert.match(binder, /prestige-frames\.css/);
  assert.match(collection, /prestige-frames\.css/);
  assert.match(css, /\.prestige-starlight-burst/);
  assert.match(css, /\.prestige-star-bit/);
  assert.match(css, /\.st-r3-card-actor\.prestige-frame/);
  assert.match(css, /\.prestige-legend/);
  assert.match(collection, /prestige-legend/);
  assert.match(collection, /data-content="collection\.prestigeLegendTitle"/);
  assert.match(collection, /prestige-star-bit/);
  assert.match(reveal, /prestigeRevealBadge/);
  assert.match(reveal, /ensurePrestigeStyles/);
  assert.match(reveal, /prestigeTier/);
  assert.match(reveal, /normalizeFusionTier/);
  assert.match(migration, /fuse_my_card/);
  assert.match(migration, /fusion_cost_for_next_tier/);
  assert.match(migration, /quantity - 1/);
  assert.match(migration, /drop trigger if exists trg_user_cards_prestige_tier/);
  assert.match(evolutionMigration, /unfuse_my_card/);
  assert.match(evolutionMigration, /starlight_burst/);
});

test('wave-2 collection quest seeds cover Soaring Skies and Epic goals', async () => {
  const migration = await read('supabase/migrations/20260722170000_collection_quest_seeds_wave2.sql');
  assert.match(migration, /complete_soaring_skies/);
  assert.match(migration, /own_series_complete',\s*'002'/);
  assert.match(migration, /own_one_epic/);
  assert.match(migration, /own_five_characters/);
  assert.match(migration, /quest_soaring_skies/);
});

test('quests and season pass pages wire website content hooks', async () => {
  const [questsHtml, seasonHtml, questsPage, seasonPage] = await Promise.all([
    read('docs/collection-quests.html'),
    read('docs/season-pass.html'),
    read('docs/js/pages/collection-quests-page.js'),
    read('docs/js/pages/season-pass-page.js')
  ]);
  assert.match(questsHtml, /data-content="quests\.title"/);
  assert.match(seasonHtml, /data-content="seasonPass\.title"/);
  assert.match(questsPage, /loadAndHydrateWebsiteContent/);
  assert.match(seasonPage, /loadAndHydrateWebsiteContent/);
});

test('season pass gates to Twitch subscribers and supports unlock gifts', async () => {
  const [migration, seasonPage, seasonService, adminPage, adminHtml, rewardsPage, defaults, worker] = await Promise.all([
    read('supabase/migrations/20260723120000_season_pass_twitch_subscribers.sql'),
    read('docs/js/pages/season-pass-page.js'),
    read('docs/js/season-pass-service.js'),
    read('docs/js/pages/admin-twitch-page.js'),
    read('docs/admin-twitch.html'),
    read('docs/js/pages/received-rewards-page.js'),
    read('docs/js/website-content-defaults.js'),
    read('cloudflare-worker/src/index.js')
  ]);
  assert.match(migration, /audience = 'twitch_subscribers'/);
  assert.match(migration, /user_season_access/);
  assert.match(migration, /deliver_twitch_season_unlock_v1/);
  assert.match(migration, /confirm_twitch_subscription_access_v1/);
  assert.match(migration, /season_pass_unlock/);
  assert.match(migration, /Season Pass Unlock \(New Sub\)/);
  assert.match(seasonPage, /hasAccess === false/);
  assert.match(seasonPage, /accessRequired === 'twitch_subscribers'/);
  assert.match(seasonPage, /claimPendingTwitchUnlocks/);
  assert.match(seasonPage, /subscription-check/);
  assert.match(seasonService, /claim_pending_twitch_unlocks_v1/);
  assert.match(adminHtml, /season_pass_unlock/);
  assert.match(adminHtml, /id="seasonId"/);
  assert.match(adminHtml, /id="manualSeasonId"/);
  assert.match(adminPage, /seasonId/);
  assert.match(adminPage, /season_pass_unlock/);
  assert.match(adminPage, /manualSeasonId/);
  assert.match(rewardsPage, /season_pass_unlock/);
  assert.match(defaults, /subscriberLockedLead/);
  assert.match(defaults, /prestigeStarBit/);
  assert.match(defaults, /Infuse duplicate cards with Starlight Energy/);
  assert.match(worker, /\/viewer\/subscription-check/);
  assert.match(worker, /deliver_twitch_season_unlock_v1/);
  assert.match(worker, /confirm_twitch_subscription_access_v1/);
  assert.match(worker, /season_pass_unlock/);
});
