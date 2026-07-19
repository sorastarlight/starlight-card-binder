import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'css');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  }));
  return nested.flat();
}

function braceError(source) {
  let depth = 0;
  let quote = '';
  let comment = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (comment) {
      if (char === '*' && next === '/') { comment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '*') { comment = true; index += 1; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth < 0) return `unexpected } at character ${index}`;
  }

  if (comment) return 'unterminated comment';
  if (quote) return 'unterminated string';
  if (depth) return `${depth} unclosed block(s)`;
  return '';
}

const files = (await walk(root)).filter(filename => filename.endsWith('.css'));
let failed = false;
for (const filename of files) {
  const error = braceError(await readFile(filename, 'utf8'));
  if (!error) continue;
  failed = true;
  console.error(`${path.relative(root, filename)}: ${error}`);
}

console.log(`structure checked ${files.length} CSS files`);
if (failed) process.exitCode = 1;
