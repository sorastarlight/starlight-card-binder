#!/usr/bin/env node
/**
 * Re-export Radiance frame assets as true RGBA PNGs with a transparent center.
 * Source files may be JPEG data saved with a .png extension (opaque black interior).
 *
 * Requires: pip install pillow, then `python scripts/process-radiance-frames.py`
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyScript = path.join(scriptDir, 'process-radiance-frames.py');
const result = spawnSync('python', [pyScript], { stdio: 'inherit' });
process.exit(result.status ?? 1);
