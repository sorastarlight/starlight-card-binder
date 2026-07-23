import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  prestigeClassName,
  prestigeTierFromQuantity
} from '../docs/js/prestige-utils.js';
import {
  PUBLIC_SHELL_DESTINATIONS,
  createDefaultShellNavigation
} from '../docs/js/shell-navigation-defaults.js';
import { aliasShellRoute, isKnownShellRoute } from '../docs/js/shell-route-utils.js';

const read = (path) => readFile(path, 'utf8');

test('prestige thresholds match product tiers', () => {
  assert.equal(prestigeTierFromQuantity(9), 'standard');
  assert.equal(prestigeTierFromQuantity(10), 'silver');
  assert.equal(prestigeTierFromQuantity(25), 'gold');
  assert.equal(prestigeTierFromQuantity(100), 'prismatic');
  assert.equal(prestigeTierFromQuantity(500), 'celestial');
  assert.equal(prestigeClassName(10), 'prestige-frame prestige-silver');
  assert.equal(prestigeClassName('standard'), '');
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

test('binder and collection load prestige frame styles and helpers', async () => {
  const [app, binder, collection, css, reveal] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/css/prestige-frames.css'),
    read('docs/js/reward-reveal.js')
  ]);
  assert.match(app, /function prestigeTierFromQuantity/);
  assert.match(app, /prestigeFrameClass/);
  assert.match(app, /full-card-wrap[\s\S]*\$\{prestigeClass\}/);
  assert.match(binder, /prestige-frames\.css/);
  assert.match(collection, /prestige-frames\.css/);
  assert.match(css, /\.prestige-celestial/);
  assert.match(css, /\.st-r3-card-actor\.prestige-frame/);
  assert.match(css, /\.prestige-legend/);
  assert.match(collection, /prestige-legend/);
  assert.match(collection, /data-content="collection\.prestigeLegendTitle"/);
  assert.match(reveal, /prestigeRevealBadge/);
  assert.match(reveal, /ensurePrestigeStyles/);
  assert.match(reveal, /prestigeTier/);
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
  const [migration, seasonPage, seasonService, adminPage, adminHtml, rewardsPage, defaults] = await Promise.all([
    read('supabase/migrations/20260723120000_season_pass_twitch_subscribers.sql'),
    read('docs/js/pages/season-pass-page.js'),
    read('docs/js/season-pass-service.js'),
    read('docs/js/pages/admin-twitch-page.js'),
    read('docs/admin-twitch.html'),
    read('docs/js/pages/received-rewards-page.js'),
    read('docs/js/website-content-defaults.js')
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
});
