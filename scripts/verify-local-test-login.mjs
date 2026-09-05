import assert from 'node:assert/strict';
import { LOCAL_TEST_ACCOUNTS } from '../apps/api/src/modules/local-development.ts';

const base = 'http://localhost:5173/api/v1';
async function request(path, body, session) {
  return fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const config = await (await request('/auth/config')).json();
assert.equal(config.data.localLoginEnabled, true);
assert.equal(config.data.googleClientId, null, 'Local Google OAuth should remain unconfigured');
for (const [account, fixture] of Object.entries(LOCAL_TEST_ACCOUNTS)) {
  const wrong = await request('/auth/local-login', { account, audience: fixture.audience === 'staff' ? 'customer' : 'staff' });
  assert.equal(wrong.status, 403);
  assert.equal(wrong.headers.get('Set-Cookie'), null);
  const response = await request('/auth/local-login', { account, audience: fixture.audience });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly/i);
  const data = (await response.json()).data;
  const session = { cookie: cookie.split(';')[0], csrf: data.csrf_token };
  try {
    const me = await request('/auth/me', undefined, session);
    assert.equal(me.status, 200);
    const user = (await me.json()).data.user;
    assert.equal(user.id, fixture.id);
    assert.equal(user.role, fixture.role);
    assert.equal(user.email_verified, true);
    assert.equal((await request('/commerce/orders', undefined, session)).status, account === 'customer' ? 200 : 403);
    assert.equal((await request('/auth/staff-users', undefined, session)).status, account === 'admin' ? 200 : 403);
    console.log(`${account}: real session restored, correct role, opposite portal API rejected`);
  } finally {
    assert.equal((await request('/auth/logout', {}, session)).status, 200);
    assert.equal((await request('/auth/me', undefined, session)).status, 401);
  }
}
console.log('Local admin/customer login and logout verified. Test sessions invalidated.');
