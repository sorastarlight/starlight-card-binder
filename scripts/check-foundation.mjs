import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const limits = Object.freeze({ inlineStyles: 0, inlineStyleAttributes: 0, inlineScripts: 0, nativeConfirms: 0 });
const errors = [];
const warnings = [];
let inlineStyles = 0;
let inlineStyleAttributes = 0;
let inlineScripts = 0;
let nativeConfirms = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : [filename];
  }));
  return nested.flat();
}

const sourceFiles = await walk(docs);
const htmlFiles = sourceFiles.filter(filename => path.extname(filename) === '.html');

for (const filename of htmlFiles) {
  const name = path.relative(docs, filename);
  const source = await readFile(filename, 'utf8');
  inlineStyles += (source.match(/<style\b/gi) || []).length;
  inlineStyleAttributes += (source.match(/\sstyle\s*=/gi) || []).length;
  inlineScripts += (source.match(/<script\b(?![^>]*\bsrc=)[^>]*>/gi) || []).length;

  const markup = source.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const ids = [...markup.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) errors.push(`${name}: duplicate static IDs: ${duplicates.join(', ')}`);

  const refs = [
    ...[...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]),
    ...[...source.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)].map(match => match[1])
  ];
  for (const ref of refs) {
    if (/^(?:https?:)?\/\//i.test(ref)) continue;
    const clean = ref.split(/[?#]/, 1)[0];
    const target = clean.startsWith('/') ? path.join(docs, clean.slice(1)) : path.resolve(path.dirname(filename), clean);
    try { await readFile(target); }
    catch { errors.push(`${name}: missing local source ${ref}`); }
  }
}

for (const filename of sourceFiles.filter(file => ['.html', '.js'].includes(path.extname(file)))) {
  const source = await readFile(filename, 'utf8');
  nativeConfirms += (source.match(/(?<![\w.])(?:window\.)?confirm\s*\(/g) || []).length;

  if (path.extname(filename) !== '.js') continue;
  const imports = [
    ...[...source.matchAll(/\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g)].map(match => match[1]),
    ...[...source.matchAll(/\bimport\s*["'](\.{1,2}\/[^"']+)["']/g)].map(match => match[1]),
    ...[...source.matchAll(/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)].map(match => match[1])
  ];
  for (const ref of imports) {
    const target = path.resolve(path.dirname(filename), ref.split(/[?#]/, 1)[0]);
    try { await readFile(target); }
    catch { errors.push(`${path.relative(docs, filename)}: missing local import ${ref}`); }
  }
}

for (const filename of sourceFiles.filter(file => path.extname(file) === '.css')) {
  const source = await readFile(filename, 'utf8');
  const refs = [
    ...[...source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map(match => match[1]),
    ...[...source.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)].map(match => match[2].trim())
  ];
  for (const ref of new Set(refs)) {
    if (!ref || /^(?:data:|https?:|\/\/|#|var\()/i.test(ref)) continue;
    const target = path.resolve(path.dirname(filename), ref.split(/[?#]/, 1)[0]);
    try { await readFile(target); }
    catch { errors.push(`${path.relative(docs, filename)}: missing local CSS source ${ref}`); }
  }
}

const searchableFiles = sourceFiles.filter(file => ['.html', '.js', '.css'].includes(path.extname(file)));
const searchableSources = await Promise.all(searchableFiles.map(filename => readFile(filename, 'utf8')));
const searchableText = searchableSources.join('\n');
const keyframeDefinitions = new Map();
for (let index = 0; index < searchableFiles.length; index += 1) {
  if (path.extname(searchableFiles[index]) !== '.css') continue;
  for (const match of searchableSources[index].matchAll(/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)/gi)) {
    const rows = keyframeDefinitions.get(match[1]) || [];
    rows.push(path.relative(docs, searchableFiles[index]));
    keyframeDefinitions.set(match[1], rows);
  }
}
for (const [name, definitions] of keyframeDefinitions) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const references = (searchableText.match(new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'g')) || []).length;
  if (references <= definitions.length) errors.push(`Unused CSS animation ${name}: ${definitions.join(', ')}`);
}

for (const filename of sourceFiles.filter(file => ['.html', '.js', '.css'].includes(path.extname(file)))) {
  const source = await readFile(filename, 'utf8');
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > 1000) warnings.push(`${path.relative(docs, filename)} is ${lineCount} lines and should be split.`);
}

if (inlineStyles > limits.inlineStyles) errors.push(`Inline style blocks increased: ${inlineStyles} > ${limits.inlineStyles}.`);
if (inlineStyleAttributes > limits.inlineStyleAttributes) errors.push(`Inline style attributes increased: ${inlineStyleAttributes} > ${limits.inlineStyleAttributes}.`);
if (inlineScripts > limits.inlineScripts) errors.push(`Inline script blocks increased: ${inlineScripts} > ${limits.inlineScripts}.`);
if (nativeConfirms > limits.nativeConfirms) errors.push(`Native confirm() calls increased: ${nativeConfirms} > ${limits.nativeConfirms}.`);
if (inlineStyles) warnings.push(`${inlineStyles} inline style block(s) remain.`);
if (inlineStyleAttributes) warnings.push(`${inlineStyleAttributes} inline style attribute(s) remain.`);
if (inlineScripts) warnings.push(`${inlineScripts} inline script block(s) remain.`);
if (nativeConfirms) warnings.push(`${nativeConfirms} native confirm() call(s) remain.`);

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);
console.log(`checked ${htmlFiles.length} HTML files and ${sourceFiles.filter(file => path.extname(file) === '.js').length} JavaScript files`);
if (errors.length) process.exitCode = 1;
