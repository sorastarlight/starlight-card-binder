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
  const [app, binder, collection, css] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/css/prestige-frames.css')
  ]);
  assert.match(app, /function prestigeTierFromQuantity/);
  assert.match(app, /prestigeFrameClass/);
  assert.match(binder, /prestige-frames\.css/);
  assert.match(collection, /prestige-frames\.css/);
  assert.match(css, /\.prestige-celestial/);
});
