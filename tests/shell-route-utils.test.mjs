import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aliasShellRoute,
  extractShellRouteKey,
  normalizeNotificationParams,
  resolveNotificationRoute,
  shellNotificationUrl
} from '../docs/js/shell-route-utils.js';

test('aliasShellRoute trusts known keys and path-prefixed binder links', () => {
  assert.equal(aliasShellRoute('daily'), 'daily');
  assert.equal(aliasShellRoute('received-gifts'), 'rewards');
  assert.equal(aliasShellRoute('user-rankings'), 'rankings');
  assert.equal(aliasShellRoute('binder.html?view=rankings'), 'rankings');
  assert.equal(aliasShellRoute('binder.html?view=offers'), 'offers');
  assert.equal(aliasShellRoute('starlight-card-binder/binder.html?view=rewards'), 'rewards');
  assert.equal(aliasShellRoute('https://example.com/binder.html?view=shop'), 'shop');
  assert.equal(aliasShellRoute('not-a-real-route'), '');
});

test('resolveNotificationRoute trusts DB route before body hints', () => {
  assert.equal(resolveNotificationRoute('shop', {
    title: 'Event weekend reward sale',
    body: 'Shop packs are discounted during the event broadcast.'
  }), 'shop');
  assert.equal(resolveNotificationRoute('daily', {
    notification_type: 'daily_booster',
    title: 'Daily booster ready'
  }), 'daily');
  assert.equal(resolveNotificationRoute(null, {
    notification_type: 'trade',
    title: 'Incoming trade offer'
  }), 'offers');
  assert.equal(resolveNotificationRoute('', {
    title: 'Mystery ping'
  }), 'notifications');
  assert.equal(resolveNotificationRoute('profile', {
    notification_type: 'achievement',
    title: 'Collection milestone'
  }), 'profile');
});

test('notification params normalize gift and event aliases', () => {
  assert.deepEqual(normalizeNotificationParams({
    route_params: { giftId: 'abc', event: 'evt-1' },
    source_key: 'received:ignored'
  }), { giftId: 'abc', event: 'evt-1', rewardId: 'abc', eventId: 'evt-1' });
  assert.equal(
    shellNotificationUrl({ route: 'rewards', route_params: { rewardId: 'rr-1' } }),
    'binder.html?rewardId=rr-1&view=rewards'
  );
  assert.equal(extractShellRouteKey('/docs/binder.html?view=collection'), 'collection');
});
