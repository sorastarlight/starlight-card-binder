import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const javascriptRoot = path.join(root, 'docs', 'js');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  }));
  return nested.flat();
}

const files = (await walk(javascriptRoot)).filter(filename => filename.endsWith('.js'));
let failed = false;

for (const filename of files) {
  const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
  if (result.status === 0) continue;
  failed = true;
  process.stderr.write(result.stderr || result.stdout || `${filename}: syntax check failed\n`);
}

console.log(`syntax checked ${files.length} JavaScript files`);
if (failed) process.exitCode = 1;
