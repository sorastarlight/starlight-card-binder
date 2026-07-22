import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('staff access lookup treats signed-out permission denials as not staff', async () => {
  const service = await read('docs/js/staff-service.js');
  assert.match(service, /isUnauthenticatedStaffLookup/);
  assert.match(service, /permission denied/);
  assert.match(service, /return \{ isStaff: false, role: null, roleLabel: null \}/);
  assert.match(service, /RPC is granted to authenticated only/);
});

test('staff service exposes custom role label RPCs', async () => {
  const service = await read('docs/js/staff-service.js');
  assert.match(service, /admin_list_staff_role_labels/);
  assert.match(service, /admin_create_staff_role_label/);
  assert.match(service, /admin_delete_staff_role_label/);
  assert.match(service, /requested_label_id/);
  assert.match(service, /export async function listStaffRoleLabels/);
  assert.match(service, /export async function createStaffRoleLabel/);
  assert.match(service, /export async function deleteStaffRoleLabel/);
});

test('admin staff page wires custom role labels and assignment', async () => {
  const page = await read('docs/js/pages/admin-staff-page.js');
  const html = await read('docs/admin-staff.html');
  assert.match(html, /Custom role labels/);
  assert.match(html, /id="create-label-form"/);
  assert.match(html, /admin-staff-page\.js\?v=1\.1\.0/);
  assert.match(page, /createStaffRoleLabel/);
  assert.match(page, /deleteStaffRoleLabel/);
  assert.match(page, /listStaffRoleLabels/);
  assert.match(page, /label:/);
  assert.match(page, /optgroup label="Custom labels"/);
  assert.match(page, /Maps to/);
});

test('staff role labels migration keeps permission tiers authoritative', async () => {
  const migration = await read('supabase/migrations/20260722150000_staff_role_labels.sql');
  assert.match(migration, /create table if not exists public\.staff_role_labels/);
  assert.match(migration, /add column if not exists label_id/);
  assert.match(migration, /admin_create_staff_role_label/);
  assert.match(migration, /requested_label_id uuid default null/);
  assert.match(migration, /'roleLabel', staff_label_value/);
  assert.match(migration, /site_roles\.role remains the authorization source of truth/i);
});
