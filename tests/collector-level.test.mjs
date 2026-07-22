import assert from 'node:assert/strict';
import test from 'node:test';
import { levelFromPoints } from '../docs/js/collector-level.js';

test('levelFromPoints uses early thresholds', () => {
  assert.equal(levelFromPoints(0).level, 1);
  assert.equal(levelFromPoints(24).level, 1);
  assert.equal(levelFromPoints(25).level, 2);
  assert.equal(levelFromPoints(1500).level, 10);
});

test('levelFromPoints continues past level 10', () => {
  const mid = levelFromPoints(1500 + 499);
  assert.equal(mid.level, 10);
  assert.equal(mid.next, 2000);

  const eleven = levelFromPoints(2000);
  assert.equal(eleven.level, 11);
  assert.equal(eleven.floor, 2000);
  assert.equal(eleven.next, 2500);
});
