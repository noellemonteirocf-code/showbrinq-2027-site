import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLoginLimiter, credentialsMatch } from '../auth.js';

const config = { adminEmail: 'admin@example.com', passwordDigest: createHash('sha256').update('senha-forte-123').digest() };

test('credentialsMatch accepts only the configured e-mail and password', () => {
  assert.equal(credentialsMatch(config, 'admin@example.com', 'senha-forte-123'), true);
  assert.equal(credentialsMatch(config, '  ADMIN@example.com ', 'senha-forte-123'), true);
  assert.equal(credentialsMatch(config, 'admin@example.com', 'senha-errada'), false);
  assert.equal(credentialsMatch(config, 'outro@example.com', 'senha-forte-123'), false);
  assert.equal(credentialsMatch(config, '', ''), false);
});

test('login limiter blocks after repeated failures and releases after the window', () => {
  let clock = 0;
  const limiter = createLoginLimiter(3, 1000, () => clock);
  for (let i = 0; i < 3; i += 1) limiter.fail('ip:1');
  assert.equal(limiter.blocked('ip:1'), true);
  assert.equal(limiter.blocked('ip:2'), false);
  clock = 1001;
  assert.equal(limiter.blocked('ip:1'), false);
  limiter.fail('ip:2'); limiter.reset('ip:2');
  assert.equal(limiter.blocked('ip:2'), false);
});
