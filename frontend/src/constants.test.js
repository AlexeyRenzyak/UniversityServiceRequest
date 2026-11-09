import test from 'node:test';
import assert from 'node:assert/strict';
import { unpackPage, getCategoryName, initials, formatDate } from './constants.js';

test('unpackPage supports the requester array endpoint', () => {
  assert.deepEqual(unpackPage([{ id: 2 }]), { results: [{ id: 2 }], count: 1, next: null, previous: null });
});
test('unpackPage supports DRF paginated technician endpoints', () => {
  assert.deepEqual(unpackPage({ count: 27, next: '/api/requests/available/?page=2', previous: null, results: [{ id: 1 }] }), {
    results: [{ id: 1 }], count: 27, next: '/api/requests/available/?page=2', previous: null,
  });
});
test('category and account utilities have useful fallbacks', () => {
  assert.equal(getCategoryName('network'), 'Internet or network');
  assert.equal(initials({ first_name: 'Ada', last_name: 'Lovelace' }), 'AL');
  assert.equal(formatDate('not a date'), '—');
});

import { filterRequestsOnPage } from './constants.js';

test('technician search finds room, category, ID, requester, and description', () => {
  const records = [
    {id: 104, category: 'projector', room_number: 'B-201', requester_name: 'Ada', description: 'No signal'},
    {id: 105, category: 'network', room_number: '405', requester_name: 'Ben', description: 'Wi-Fi disconnects'},
  ];
  for (const term of ['104', '#104', 'b-201', 'ada', 'no SIGNAL', 'projector']) {
    assert.deepEqual(filterRequestsOnPage(records, term).map((r) => r.id), [104]);
  }
  assert.deepEqual(filterRequestsOnPage(records, 'wi-fi').map((r) => r.id), [105]);
  assert.deepEqual(filterRequestsOnPage(records, '', 'network').map((r) => r.id), [105]);
  assert.deepEqual(filterRequestsOnPage(records, 'ada', 'network'), []);
});
