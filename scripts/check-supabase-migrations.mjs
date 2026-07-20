import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supabaseDir = path.join(root, 'supabase');
const migrationsDir = path.join(supabaseDir, 'migrations');
const errors = [];

const entries = await readdir(migrationsDir, { withFileTypes: true });
const migrationFiles = entries
  .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
  .map(entry => entry.name)
  .sort();

if (!migrationFiles.length) errors.push('No canonical Supabase migrations found.');

const versions = new Set();
for (const name of migrationFiles) {
  const match = /^(\d{14})_([a-z0-9_]+)\.sql$/.exec(name);
  if (!match) {
    errors.push(`${name}: expected YYYYMMDDHHMMSS_snake_case.sql.`);
    continue;
  }

  const [, version] = match;
  if (versions.has(version)) errors.push(`${name}: duplicate migration timestamp ${version}.`);
  versions.add(version);

  const sql = await readFile(path.join(migrationsDir, name), 'utf8');
  const executableSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*--.*$/gm, '')
    .trim();
  if (!executableSql) errors.push(`${name}: migration contains no executable SQL.`);

}

const credentialPattern = /\bsbp_[A-Za-z0-9_-]{16,}\b|service[_-]?role[^\n]{0,40}(?:key|token)/i;
for (const filename of [...migrationFiles.map(name => path.join(migrationsDir, name)), path.join(supabaseDir, 'seed.sql')]) {
  const sql = await readFile(filename, 'utf8');
  if (credentialPattern.test(sql)) {
    errors.push(`${path.relative(supabaseDir, filename)}: possible Supabase credential detected.`);
  }
}

const config = await readFile(path.join(supabaseDir, 'config.toml'), 'utf8');
if (!/\bmajor_version\s*=\s*17\b/.test(config)) {
  errors.push('supabase/config.toml must match production PostgreSQL major version 17.');
}
if (!/\[db\.migrations\][\s\S]*?\benabled\s*=\s*true\b/.test(config)) {
  errors.push('Database migrations must remain enabled in supabase/config.toml.');
}

for (const error of errors) console.error(`error: ${error}`);
console.log(`checked ${migrationFiles.length} canonical Supabase migration(s)`);
if (errors.length) process.exitCode = 1;
