import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeOAuthState } from '../auth.js';

test('OAuth state parser accepts only a bounded Base64 JSON redirect and nonce', () => {
  const encoded = Buffer.from(JSON.stringify({ redirectUri: 'https://showbrq-pcnpfnwu.manus.space/api/auth/callback', nonce: 'a'.repeat(32) })).toString('base64');
  assert.deepEqual(decodeOAuthState(encoded), {
    redirectUri: 'https://showbrq-pcnpfnwu.manus.space/api/auth/callback',
    nonce: 'a'.repeat(32),
  });
  assert.equal(decodeOAuthState('not-valid-json'), null);
  assert.equal(decodeOAuthState('x'.repeat(5000)), null);
});
