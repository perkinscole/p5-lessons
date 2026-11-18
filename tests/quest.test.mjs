// Trail Quest worlds: every world must be fair, whatever the seed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, reachable, powersFor, regionAt, isSolid, W, TILE, T, POWERS } from '../js/game/quest.js';
import { SLOTS } from '../js/game/avatar.js';

const tileOf = (thing) => Math.floor(thing.y / TILE) * W + Math.floor(thing.x / TILE);

test('in every world, everything can be reached, and only chests need a held item', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const world = generateWorld(seed);
    const plain = reachable(world, false);
    const smashing = reachable(world, true);
    for (const it of world.items) {
      assert.ok(!isSolid(world.tiles[tileOf(it)]), `seed ${seed}: ${it.kind} inside a wall`);
      assert.ok(smashing[tileOf(it)], `seed ${seed}: a ${it.kind} can't be reached`);
      assert.equal(!!plain[tileOf(it)], it.kind !== 'chest', `seed ${seed}: ${it.kind} and cracked rocks`);
    }
    for (const e of world.enemies) assert.ok(plain[tileOf(e)], `seed ${seed}: an enemy is walled in`);
    const regions = new Set(world.items.filter((it) => plain[tileOf(it)]).map((it) => regionAt(Math.floor(it.x / TILE), Math.floor(it.y / TILE))));
    assert.equal(regions.size, 4, `seed ${seed}: all four areas are open`);
    assert.equal(world.items.filter((it) => it.kind === 'chest').length, 6);
    assert.equal([...world.tiles].filter((t) => t === T.ROCK).length, 6);
  }
});

test('a world is the same for the same seed, and stays within what the server accepts', () => {
  assert.deepEqual(generateWorld(7).items, generateWorld(7).items);
  assert.notDeepEqual(generateWorld(7).items, generateWorld(8).items);
  const total = generateWorld(7).items.reduce((a, it) => a + it.value, 0);
  assert.ok(total > 250 && total <= 600, `a perfect run is ${total} coins`);
});

test('each kind of gear gives its power, and plain characters can still play', () => {
  assert.deepEqual(powersFor({}), { light: 2.3, dash: false, magnet: false, hearts: 3, smash: false });
  assert.deepEqual(powersFor({ aura: 'none', cape: 'none', pet: 'none', hat: 'none', held: 'none' }), powersFor(null));
  const geared = powersFor({ aura: 'spark', cape: 'red', pet: 'cat', hat: 'cap', held: 'sword' });
  assert.deepEqual(geared, { light: 4.5, dash: true, magnet: true, hearts: 4, smash: true });
  assert.ok(powersFor({ aura: 'rainbow' }).light > geared.light);
  for (const p of POWERS) assert.ok(SLOTS[p.slot], `${p.slot} is a real character slot`);
});

test('a recorded run plays back as a ghost, in a form the server accepts', async () => {
  const { encodePath, decodePath, ghostAt } = await import('../js/game/quest.js');
  const points = [[104, 104], [120, 104], [120.4, 130], [1023, 639], [5000, -3]];
  const text = encodePath(points);
  assert.match(text, /^p([0-9a-z]{4}){1,600}$/);
  assert.deepEqual(decodePath(text), [[104, 104], [120, 104], [120, 130], [1023, 639], [1023, 0]]);
  assert.equal(encodePath(Array.from({ length: 900 }, () => [1, 1])).length, 1 + 600 * 4);
  assert.deepEqual(decodePath('p<script>'), []);
  const path = decodePath(text);
  assert.deepEqual(ghostAt(path, 0), { x: 104, y: 104, done: false });
  assert.equal(ghostAt(path, 0.25).x, 112);
  assert.equal(ghostAt(path, 99).done, true);
  assert.equal(ghostAt([], 1), null);
});
