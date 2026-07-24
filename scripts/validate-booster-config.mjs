import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  formatBoosterValidationLines,
  validateBoosterCatalog
} from '../docs/js/booster-config-validator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = path.join(root, 'tests', 'fixtures');
const args = process.argv.slice(2);

async function defaultTargets() {
  const entries = await readdir(fixtureDir);
  return entries
    .filter(name => /^booster-config-(valid|boundary)\.json$/i.test(name))
    .map(name => path.join('tests', 'fixtures', name))
    .sort();
}

const targets = args.length ? args : await defaultTargets();
let failed = false;

if (!targets.length) {
  console.error('No booster configuration files found to validate.');
  process.exitCode = 1;
} else {
  for (const target of targets) {
    const filename = path.resolve(root, target);
    try {
      const config = JSON.parse(await readFile(filename, 'utf8'));
      const result = validateBoosterCatalog(config);
      console.log(`${path.relative(root, filename)}: ${result.summary.boosters} booster(s), ${result.summary.cards} card(s)`);
      for (const line of formatBoosterValidationLines(result)) {
        if (line.startsWith('warning ')) console.warn(`  ${line}`);
        else console.error(`  ${line}`);
      }
      if (!result.valid) failed = true;
      else console.log('  valid');
    } catch (error) {
      failed = true;
      console.error(`${target}: ${error.message}`);
    }
  }
}

if (failed) process.exitCode = 1;
