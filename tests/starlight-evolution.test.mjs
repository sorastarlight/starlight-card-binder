import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  canEvolve,
  canUnfuse,
  evolutionCostForCurrentStep,
  evolutionCostForNextTier,
  evolutionUnfuseRefund,
  nextEvolutionTier,
  prestigeClassName,
  prestigeLabel,
  previousEvolutionTier
} from '../docs/js/prestige-utils.js';

const read = (path) => readFile(path, 'utf8');

test('Starlight Evolution costs and refunds match the locked ladder', () => {
  assert.equal(evolutionCostForNextTier('stardust'), 8);
  assert.equal(evolutionCostForNextTier('star_bit'), 20);
  assert.equal(evolutionCostForNextTier('protostar'), 45);
  assert.equal(evolutionCostForNextTier('starlight'), 100);
  assert.equal(evolutionCostForNextTier('super_starlight'), 220);
  assert.equal(evolutionCostForNextTier('starlight_burst'), null);

  assert.equal(nextEvolutionTier('stardust'), 'star_bit');
  assert.equal(nextEvolutionTier('super_starlight'), 'starlight_burst');
  assert.equal(nextEvolutionTier('starlight_burst'), null);
  assert.equal(previousEvolutionTier('star_bit'), 'stardust');
  assert.equal(previousEvolutionTier('stardust'), null);

  assert.equal(canEvolve(9, 'stardust'), true);
  assert.equal(canEvolve(8, 'stardust'), false);
  assert.equal(canEvolve(221, 'super_starlight'), true);
  assert.equal(canEvolve(999, 'starlight_burst'), false);

  assert.equal(canUnfuse('star_bit'), true);
  assert.equal(canUnfuse('stardust'), false);
  assert.equal(evolutionCostForCurrentStep('star_bit'), 8);
  assert.equal(evolutionUnfuseRefund('star_bit'), 4);
  assert.equal(evolutionUnfuseRefund('protostar'), 10);
  assert.equal(evolutionUnfuseRefund('starlight'), 22);
  assert.equal(evolutionUnfuseRefund('super_starlight'), 50);
  assert.equal(evolutionUnfuseRefund('starlight_burst'), 110);
  assert.equal(evolutionUnfuseRefund('stardust'), null);

  assert.equal(prestigeLabel('protostar'), '★★ Protostar');
  assert.equal(prestigeClassName('star_bit'), 'prestige-frame prestige-star-bit');
  assert.equal(prestigeClassName('starlight_burst'), 'prestige-frame prestige-starlight-burst');
  assert.equal(prestigeClassName('stardust'), '');
});

test('Starlight Evolution migration and client wiring are present', async () => {
  const [migration, utils, sync, cloud, app, reveal, css, analyzerCss, collection] = await Promise.all([
    read('supabase/migrations/20260723200000_starlight_evolution.sql'),
    read('docs/js/prestige-utils.js'),
    read('docs/js/collection-sync.js'),
    read('docs/js/cloud-collection.js'),
    read('docs/js/app.js'),
    read('docs/js/starlight-evolution-reveal.js'),
    read('docs/css/prestige-frames.css'),
    read('docs/css/pages/card-analyzer.css'),
    read('docs/collection.html')
  ]);

  assert.match(migration, /unfuse_my_card/);
  assert.match(migration, /starlight_burst/);
  assert.match(migration, /floor\(step_cost \/ 2\.0\)/);
  assert.match(migration, /set prestige_tier = 'stardust'/);
  assert.match(utils, /canEvolve/);
  assert.match(utils, /canUnfuse/);
  assert.match(sync, /export async function evolveMyCard/);
  assert.match(sync, /export async function unfuseMyCard/);
  assert.match(cloud, /unfuseMyCard/);
  assert.match(cloud, /evolveMyCard/);
  assert.match(app, /confirmAction/);
  assert.match(app, /window\.confirm/);
  assert.match(app, /playStarlightEvolutionReveal|starlight-evolution-reveal/);
  assert.match(app, /data-unfuse-card/);
  assert.match(app, /analyzer-split/);
  assert.match(app, /Turn Off Holographic/);
  assert.match(app, /Turn Off Starlight Evolution/);
  assert.match(reveal, /prefers-reduced-motion|preferReducedMotion/);
  assert.match(css, /\.prestige-starlight-burst/);
  assert.match(analyzerCss, /\.analyzer-split/);
  assert.match(collection, /Infuse duplicate cards with Starlight Energy/);
  assert.match(collection, /card-analyzer\.css/);
});
