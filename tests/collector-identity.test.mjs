import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('collector identity migration adds lock columns and RPCs', async () => {
  const migration = await read(
    'supabase/migrations/20260722050000_collector_identity_onboarding.sql'
  );

  assert.match(
    migration,
    /alter table public\.profiles\s+add column if not exists username_locked boolean not null default false;/i
  );
  assert.match(
    migration,
    /alter table public\.profiles\s+add column if not exists username_source text not null default 'user';/i
  );
  assert.match(migration, /profiles_username_source_check/);
  assert.match(migration, /check \(username_source in \('user', 'twitch', 'system'\)\)/);

  assert.match(migration, /create or replace function public\.handle_new_user\(\)/i);
  assert.match(migration, /raw_user_meta_data->>'username'/);
  assert.match(migration, /raw_user_meta_data->>'display_name'/);
  assert.match(migration, /final_source := 'user'/);
  assert.match(migration, /final_source := 'system'/);
  assert.match(migration, /final_onboarding :=/);

  assert.match(migration, /create or replace function public\.update_collector_profile\(/i);
  assert.match(migration, /username_locked/);
  assert.match(migration, /'usernameLocked'/);
  assert.match(migration, /'usernameSource'/);
  assert.match(migration, /coalesce\(current_locked, false\)/);

  assert.match(migration, /create or replace function public\.claim_twitch_collector_identity\(\)/i);
  assert.match(migration, /from auth\.identities/);
  assert.match(migration, /provider = 'twitch'/);
  assert.match(migration, /username_locked = true/);
  assert.match(migration, /username_source = 'twitch'/);
  assert.match(migration, /revoke all on function public\.claim_twitch_collector_identity\(\) from public, anon/);
  assert.match(
    migration,
    /grant execute on function public\.claim_twitch_collector_identity\(\) to authenticated, service_role/
  );
  assert.doesNotMatch(migration, /'email',\s*/);

  assert.match(migration, /create or replace function public\.get_my_collector_identity\(\)/i);
  assert.match(migration, /'twitchLinked'/);
  assert.match(migration, /'twitchLogin'/);
  assert.match(migration, /'twitchDisplayName'/);
  assert.match(migration, /'twitchAvatarUrl'/);
  assert.match(migration, /revoke all on function public\.get_my_collector_identity\(\) from public, anon/);
  assert.match(
    migration,
    /grant execute on function public\.get_my_collector_identity\(\) to authenticated, service_role/
  );
});

test('login signup collects username and display name fields', async () => {
  const [loginHtml, loginPage, authJs] = await Promise.all([
    read('docs/login.html'),
    read('docs/js/pages/login-page.js'),
    read('docs/js/auth.js')
  ]);

  assert.match(loginHtml, /id="signup-identity-group"/);
  assert.match(loginHtml, /id="signup-username"/);
  assert.match(loginHtml, /id="signup-display-name"/);
  assert.match(loginHtml, /login\.css\?v=1\.2/);
  assert.match(loginHtml, /login-page\.js\?v=1\.2/);

  assert.match(loginPage, /signupIdentityGroup/);
  assert.match(loginPage, /\^\[a-z0-9_\]\{3,24\}\$/);
  assert.match(loginPage, /signupDisplayName/);
  assert.match(loginPage, /claim_twitch_collector_identity/);
  assert.match(loginPage, /signUp\(\s*email,\s*password,\s*\{/);

  assert.match(authJs, /export async function signUp\(email, password, profile = \{\}\)/);
  assert.match(authJs, /data\.username = username/);
  assert.match(authJs, /data\.display_name = displayName/);
});

test('profile UI locks username and shows Twitch Linked badge', async () => {
  const [profileHtml, profilePage, profileService, profileTwitch, appShell] = await Promise.all([
    read('docs/profile-settings.html'),
    read('docs/js/pages/profile-settings-page.js'),
    read('docs/js/profile-service.js'),
    read('docs/js/profile-twitch.js'),
    read('docs/js/app-shell.js')
  ]);

  assert.match(profileHtml, /id="username-help"/);
  assert.match(profileHtml, /id="twitch-linked-badge"/);
  assert.match(profileHtml, /Twitch Linked/);
  assert.match(profileHtml, /twitch-linked-icon/);

  assert.match(profilePage, /Locked to your Twitch login/);
  assert.match(profilePage, /applyUsernameLockState/);
  assert.match(profilePage, /usernameInput\.readOnly/);
  assert.match(profilePage, /getMyCollectorIdentity/);
  assert.match(profilePage, /getMyTwitchConnection/);

  assert.match(profileService, /username_locked/);
  assert.match(profileService, /username_source/);
  assert.match(profileService, /export async function claimTwitchCollectorIdentity/);
  assert.match(profileService, /export async function getMyCollectorIdentity/);
  assert.match(profileService, /claim_twitch_collector_identity/);
  assert.match(profileService, /get_my_collector_identity/);

  assert.match(profileTwitch, /Twitch Linked/);
  assert.match(profileTwitch, /getMyCollectorIdentity/);
  assert.match(profileTwitch, /beginTwitchLink\('collector'\)/);
  assert.match(profileTwitch, /unlinkTwitch/);

  assert.match(appShell, /starlight-onboarding-nudge/);
  assert.match(appShell, /onboarding_complete===false/);
  assert.match(appShell, /navigate\('profile'\)/);
  assert.match(appShell, /username_locked/);
});
