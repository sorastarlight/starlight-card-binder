import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('staff access lookup treats signed-out permission denials as not staff', async () => {
  const service = await read('docs/js/staff-service.js');
  assert.match(service, /isUnauthenticatedStaffLookup/);
  assert.match(service, /permission denied/);
  assert.match(service, /return \{ isStaff: false, role: null \}/);
  assert.match(service, /RPC is granted to authenticated only/);
});
