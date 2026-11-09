import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiError } from './api.js';

test('API error is readable for a duplicate technician claim', () => {
  const error = readApiError({ detail: 'Request already taken. Refresh the available list.' }, 409);
  assert.equal(error.status, 409);
  assert.match(error.message, /already taken/);
});
test('API field validation errors can be shown beside inputs', () => {
  const error = readApiError({ room_number: ['Room number is required.'], description: ['Problem description is required.'] }, 400);
  assert.equal(error.fields.room_number, 'Room number is required.');
  assert.equal(error.fields.description, 'Problem description is required.');
});
test('API server problems present a friendly fallback message', () => {
  assert.match(readApiError(null, 503).message, /temporarily unavailable/);
});

test('an expired access token refreshes once, and a rotated refresh token is saved', async () => {
  const { api, saveSession, readSession } = await import('./api.js');
  const values = new Map();
  globalThis.sessionStorage = {
    setItem(key, value) { values.set(key, value); },
    getItem(key) { return values.get(key) || null; },
    removeItem(key) { values.delete(key); },
  };
  globalThis.window = { dispatchEvent() {} };
  saveSession({ access: 'old-access', refresh: 'old-refresh' });
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/api/auth/refresh/')) return new Response(JSON.stringify({ access: 'new-access', refresh: 'new-refresh' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (options.headers.Authorization === 'Bearer old-access') return new Response(JSON.stringify({ detail: 'Token is invalid' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify([{ id: 1, status: 'created' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const data = await api('/api/requests/my/');
    assert.equal(data[0].id, 1);
    assert.equal(readSession().refresh, 'new-refresh');
    assert.deepEqual(requests.map(({ url }) => url), ['/api/requests/my/', '/api/auth/refresh/', '/api/requests/my/']);
    assert.equal(requests[2].options.headers.Authorization, 'Bearer new-access');
  } finally {
    globalThis.fetch = previousFetch;
    saveSession(null);
  }
});
