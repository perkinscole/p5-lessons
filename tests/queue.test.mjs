// The browser's request queue: one trip at a time, shared trips, and quiet retries when Google is busy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createQueue, BUSY_MESSAGE } from '../js/data/queue.js';

/** A pretend server. `script` decides each trip's answer; waits are skipped but recorded. */
function setup(answer, opts = {}) {
  const trips = [];
  const waits = [];
  const busy = [];
  let inFlight = 0;
  let most = 0;
  const send = async (method, args) => {
    inFlight++;
    most = Math.max(most, inFlight);
    trips.push([method, args]);
    await new Promise((r) => setTimeout(r, 2));
    inFlight--;
    return answer(method, args, trips.length);
  };
  const q = createQueue(send, { sleep: async (ms) => { waits.push(ms); }, random: () => 0, onBusy: (on) => busy.push(on), ...opts });
  return { q, trips, waits, busy, most: () => most };
}
const batchOf = (fn) => (method, args, n) => (method === 'batch' ? args[0].map(([m, a]) => fn(m, a, n)) : (() => { const r = fn(method, args, n); if (r.ok) return r.data; throw new Error(r.error); })());

test('queue: calls made together travel as one trip, and only one trip is out at a time', async () => {
  const { q, trips, most } = setup(batchOf((m) => ({ ok: true, data: m })));
  const first = Promise.all([q.call('a'), q.call('b'), q.call('c')]);
  await new Promise((r) => setTimeout(r, 1));
  const later = Promise.all([q.call('d'), q.call('e')]);
  assert.deepEqual(await first, ['a', 'b', 'c']);
  assert.deepEqual(await later, ['d', 'e']);
  assert.equal(trips.length, 2);
  assert.equal(most(), 1);
});

test('queue: a busy server is retried quietly, with growing waits, and the save lands', async () => {
  const { q, trips, waits, busy } = setup((method, args, n) => { if (n <= 3) throw new Error('There are too many simultaneous invocations: Spreadsheets'); return 'saved'; });
  assert.equal(await q.call('saveWork', 't1'), 'saved');
  assert.equal(trips.length, 4);
  assert.ok(waits[0] < waits[1] && waits[1] < waits[2]);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(busy, [true, false]);
});

test('queue: in a batch only the calls told "busy" go round again', async () => {
  const seen = [];
  const { q } = setup(batchOf((m, a, n) => { seen.push(`${n}:${m}`); return m === 'saveWork' && n === 1 ? { ok: false, error: 'BUSY: try again' } : m === 'bad' ? { ok: false, error: 'That is not your class.' } : { ok: true, data: m }; }));
  const results = await Promise.allSettled([q.call('myWorks'), q.call('saveWork'), q.call('bad')]);
  assert.deepEqual(results.map((r) => r.status), ['fulfilled', 'fulfilled', 'rejected']);
  assert.equal(results[2].reason.message, 'That is not your class.');
  assert.deepEqual(seen, ['1:myWorks', '1:saveWork', '1:bad', '2:saveWork']);
});

test('queue: other errors are never retried, since the action may have run', async () => {
  const { q, trips } = setup(() => { throw new Error('This lesson was approved.'); });
  await assert.rejects(q.call('saveWork'), /approved/);
  assert.equal(trips.length, 1);
});

test('queue: it gives up after a few tries with a calm message', async () => {
  const { q, trips, busy } = setup(() => { throw new Error('BUSY: Pixel Trail is very busy right now.'); }, { tries: 3 });
  await assert.rejects(q.call('saveWork'), (e) => e.message === BUSY_MESSAGE);
  assert.equal(trips.length, 4);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(busy.at(-1), false);
});

test('queue: big downloads go one at a time, in line with everything else', async () => {
  const { q, trips, most } = setup(batchOf((m, a) => ({ ok: true, data: `${m}${a[0] ?? ''}` })));
  const all = await Promise.all([q.call('myWorks'), q.direct('libraryPart', [0]), q.direct('libraryPart', [1]), q.call('classBoard')]);
  assert.deepEqual(all, ['myWorks', 'libraryPart0', 'libraryPart1', 'classBoard']);
  assert.equal(most(), 1);
  assert.equal(trips.filter(([m]) => m === 'batch').length, 0);
});

test('queue: a call sent once is not retried when the server is busy, and what is behind it still goes', async () => {
  const { q, trips, waits } = setup((method) => { if (method === 'saveWork') throw new Error('BUSY: try later'); return 'done'; });
  const save = q.once('saveWork', 't1').then(() => 'saved', (e) => e.message);
  await new Promise((r) => setTimeout(r, 1));
  const submit = q.call('submitWork', 't1');
  assert.equal(await save, BUSY_MESSAGE);
  assert.equal(await submit, 'done');
  assert.equal(trips.filter(([m]) => m === 'saveWork').length, 1);
  assert.equal(waits.length, 0);
});
