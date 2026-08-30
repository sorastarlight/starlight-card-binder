import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  PUBLIC_SHELL_DESTINATIONS,
  createDefaultShellNavigation
} from '../docs/js/shell-navigation-defaults.js';
import { aliasShellRoute, isKnownShellRoute } from '../docs/js/shell-route-utils.js';

const read = (path) => readFile(path, 'utf8');

test('quests and season pass are shell destinations', () => {
  assert.ok(isKnownShellRoute('quests'));
  assert.ok(isKnownShellRoute('season-pass'));
  assert.equal(isKnownShellRoute('starlight-evolution'), false);
  assert.equal(aliasShellRoute('collection-quests.html'), 'quests');
  assert.equal(aliasShellRoute('season-pass'), 'season-pass');
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some((entry) => entry.value === 'quests'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some((entry) => entry.value === 'season-pass'));
  assert.equal(
    PUBLIC_SHELL_DESTINATIONS.some((entry) => entry.value === 'starlight-evolution'),
    false
  );
  const nav = createDefaultShellNavigation();
  const collect = nav.sidebar.sections.find((section) => section.id === 'collect');
  assert.ok(collect.items.some((item) => item.destination === 'quests'));
  assert.ok(collect.items.some((item) => item.destination === 'season-pass'));
  assert.equal(
    collect.items.some((item) => item.destination === 'starlight-evolution'),
    false
  );
});

test('quests and season pass pages wire services and claim UI', async () => {
  const [questsPage, seasonPage, questsHtml, seasonHtml, shell, embed] = await Promise.all([
    read('docs/js/pages/collection-quests-page.js'),
    read('docs/js/pages/season-pass-page.js'),
    read('docs/collection-quests.html'),
    read('docs/season-pass.html'),
    read('docs/js/app-shell.js'),
    read('docs/js/embed-mode.js')
  ]);
  assert.match(questsPage, /claimCollectionQuest/);
  assert.match(seasonPage, /claimSeasonPassTier/);
  assert.match(questsPage, /getCachedWebsiteContent/);
  assert.match(seasonPage, /getMySeasonPass/);
  assert.match(embed, /'collection-quests\.html':'quests'/);
  assert.match(embed, /'season-pass\.html':'season-pass'/);
  assert.doesNotMatch(embed, /starlight-evolution/);
  assert.match(questsHtml, /collection-quests-page\.js/);
  assert.match(seasonHtml, /season-pass-page\.js/);
  assert.match(shell, /quests:\{title:'Missions',src:'collection-quests\.html'\}/);
  assert.match(shell, /'season-pass':\{title:'Season Pass',src:'season-pass\.html'\}/);
  assert.doesNotMatch(shell, /starlight-evolution/);
  assert.match(questsPage, /data-cadence-tab|activeCadence/);
  assert.match(questsHtml, /Daily Missions|data-cadence-tab="daily"/);
});

test('binder and collection no longer load Starlight Evolution surfaces', async () => {
  const [app, binder, collection, reveal] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/js/reward-reveal.js')
  ]);
  assert.doesNotMatch(app, /fuseSelectedCard|data-fuse-card|playStarlightEvolutionReveal/);
  assert.doesNotMatch(binder, /prestige-frames\.css|starlight-evolution/);
  assert.doesNotMatch(collection, /prestige-frames\.css|starlight-evolution/);
  assert.doesNotMatch(reveal, /prestige-utils|prestigeFrameOverlay|ensurePrestigeStyles/);
});

test('wave-2 collection quest seeds cover Soaring Skies and Epic goals', async () => {
  const migration = await read('supabase/migrations/20260722170000_collection_quest_seeds_wave2.sql');
  assert.match(migration, /complete_soaring_skies/);
  assert.match(migration, /own_series_complete',\s*'002'/);
  assert.match(migration, /own_one_epic/);
  assert.match(migration, /own_five_characters/);
  assert.match(migration, /quest_soaring_skies/);
});

test('Starlight Missions migration adds cadence and period progress', async () => {
  const migration = await read('supabase/migrations/20260723220000_starlight_missions_period_resets.sql');
  assert.match(migration, /cadence text not null default 'legacy'/);
  assert.match(migration, /user_quest_period_progress/);
  assert.match(migration, /quest_period_bounds/);
  assert.match(migration, /'periodKey'/);
  assert.match(migration, /'resetsAt'/);
  assert.match(migration, /daily_open_booster/);
  assert.match(migration, /weekly_visit_five/);
  assert.match(migration, /cadence = 'daily'/);
  assert.match(migration, /cadence = 'weekly'/);
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
  assert.match(seasonHtml, /data-content="seasonPass\.exclusivePromoTitle"/);
  assert.match(seasonHtml, /season-pass-promo-card/);
  assert.match(seasonHtml, /season-benefits-body/);
  assert.match(questsPage, /getCachedWebsiteContent/);
  assert.match(seasonPage, /getCachedWebsiteContent/);
  assert.match(seasonPage, /seasonCopy\.benefitsList/);
  assert.match(seasonPage, /season-benefits-body/);
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
  assert.doesNotMatch(defaults, /prestigeStarBit/);
  assert.doesNotMatch(defaults, /Infuse duplicate cards with Starlight Energy/);
  assert.match(worker, /\/viewer\/subscription-check/);
  assert.match(worker, /deliver_twitch_season_unlock_v1/);
  assert.match(worker, /confirm_twitch_subscription_access_v1/);
  assert.match(worker, /season_pass_unlock/);
});
