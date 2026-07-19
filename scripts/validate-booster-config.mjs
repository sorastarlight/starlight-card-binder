import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateBoosterCatalog } from '../docs/js/booster-config-validator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
const targets = files.length ? files : ['tests/fixtures/booster-config-valid.json'];
let failed = false;

for (const target of targets) {
  const filename = path.resolve(root, target);
  try {
    const config = JSON.parse(await readFile(filename, 'utf8'));
    const result = validateBoosterCatalog(config);
    console.log(`${path.relative(root, filename)}: ${result.summary.boosters} booster(s), ${result.summary.cards} card(s)`);
    for (const warning of result.warnings) console.warn(`  warning ${warning.path}: ${warning.message}`);
    for (const error of result.errors) console.error(`  error ${error.path}: ${error.message}`);
    if (!result.valid) failed = true;
    else console.log('  valid');
  } catch (error) {
    failed = true;
    console.error(`${target}: ${error.message}`);
  }
}

if (failed) process.exitCode = 1;
