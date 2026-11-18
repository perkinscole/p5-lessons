// Trail Quest dungeons: every floor must be fair, whatever the seed and however deep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, reachable, distances, difficulty, powersFor, pickRelic, RELICS, BOOSTS, isSolid, spikeUp, floorSeed, W, H, TILE, T, POWERS, DOWN } from '../js/game/quest.js';
import { SLOTS } from '../js/game/avatar.js';

const tileOf = (thing) => Math.floor(thing.y / TILE) * W + Math.floor(thing.x / TILE);
const DEPTHS = [1, 2, 3, 4, 6, 9, 15, 30];

test('in every room, the key and the door can be reached, and only vaults need smashing', () => {
  const layouts = new Set();
  assert.equal(W * TILE, 480, 'a room is exactly one screen wide');
  assert.equal(H * TILE, 304, 'a room is exactly one screen tall');
  for (let seed = 1; seed <= 150; seed++) for (const depth of DEPTHS) {
    const world = generateFloor(seed, depth);
    const where = `seed ${seed} room ${depth} (${world.layout})`;
    layouts.add(`${world.layout}/${world.theme}`);
    const plain = reachable(world, false);
    const smashing = reachable(world, true);
    const steps = distances(world.tiles, world.startTile, false);
    assert.ok(plain[tileOf(world.door)], `${where}: the door can't be reached`);
    assert.equal(world.tiles[tileOf(world.door)], T.STAIRS);
    assert.ok(steps[tileOf(world.door)] >= 12, `${where}: the door is too close`);
    const keys = world.items.filter((it) => it.kind === 'key');
    assert.equal(keys.length, 1, `${where}: one key`);
    assert.ok(plain[tileOf(keys[0])], `${where}: the key needs smashing`);
    assert.ok(steps[tileOf(keys[0])] >= 5, `${where}: the key is at the start`);
    assert.ok(!isSolid(world.tiles[tileOf(world.start)]), `${where}: the start is inside a wall`);
    const spots = new Set();
    for (const it of world.items) {
      assert.ok(!spots.has(tileOf(it)), `${where}: two things on one tile`);
      spots.add(tileOf(it));
      assert.ok(!isSolid(world.tiles[tileOf(it)]), `${where}: ${it.kind} inside a wall`);
      assert.notEqual(world.tiles[tileOf(it)], T.SPIKE, `${where}: ${it.kind} on spikes`);
      assert.notEqual(tileOf(it), tileOf(world.door), `${where}: ${it.kind} on the door`);
      assert.ok(smashing[tileOf(it)], `${where}: a ${it.kind} can't be reached`);
      if (it.kind === 'chest') assert.ok(!plain[tileOf(it)], `${where}: a chest outside a vault`);
      if (it.kind !== 'chest' && it.kind !== 'gem') assert.ok(plain[tileOf(it)], `${where}: a ${it.kind} needs smashing`);
      if (it.kind === 'boost') assert.ok(BOOSTS[it.boost], `${where}: an unknown boost`);
    }
    for (const e of world.enemies) {
      assert.ok(plain[tileOf(e)], `${where}: an enemy is walled in`);
      assert.ok(Math.hypot(e.x - world.start.x, e.y - world.start.y) > 4 * TILE, `${where}: an enemy starts on top of the player`);
    }
    const rocks = [...world.tiles].filter((t) => t === T.ROCK).length;
    assert.equal(rocks, world.items.filter((it) => it.kind === 'chest').length, `${where}: one cracked rock per vault`);
    assert.ok(world.items.some((it) => it.kind === 'boost'), `${where}: a boost to grab`);
    assert.ok(world.enemies.length >= Math.min(4, difficulty(depth).enemies), `${where}: only ${world.enemies.length} enemies fit`);
  }
  assert.ok(layouts.size >= 5, `rooms come in different kinds: ${[...layouts]}`);
  assert.equal(generateFloor(3, 1).layout, 'field', 'the first room is always the gentle one');
  assert.equal(generateFloor(3, 1).dark, false);
});

test('rooms get harder and richer the deeper they are', () => {
  const avg = (depth, f) => { let n = 0; for (let seed = 1; seed <= 40; seed++) n += f(generateFloor(seed, depth)); return n / 40; };
  const worth = (w) => w.items.reduce((a, it) => a + it.value, 0);
  assert.ok(avg(8, (w) => w.enemies.length) > avg(1, (w) => w.enemies.length) * 2.5);
  assert.ok(avg(8, (w) => w.enemies.length) >= 14, 'a deep room is crowded');
  assert.ok(avg(9, worth) > avg(1, worth) * 2);
  assert.equal(avg(1, (w) => w.spikes.length), 0);
  assert.ok(avg(6, (w) => w.spikes.length) > 4);
  assert.deepEqual(difficulty(1).kinds, ['slime']);
  assert.ok(difficulty(5).kinds.includes('hunter') && difficulty(4).kinds.includes('spitter'));
  assert.ok(difficulty(3).speed > difficulty(1).speed && difficulty(500).speed <= 2 && difficulty(500).enemies <= 24);
  // What the server will accept for a run: twenty rooms in five minutes, with most of the treasure,
  // half the enemies defeated, and a big speed bonus every time, still fits.
  let coins = 0;
  for (let depth = 1; depth <= 20; depth++) { const w = generateFloor(9, depth); coins += worth(w) * 0.6 + w.enemies.length * w.worth + depth * 3 + 8 * w.worth * 3; }
  assert.ok(coins < 6000, `an outstanding five minutes is ${Math.round(coins)} coins`);
});

test('a run is the same for the same seed, and each floor is different', () => {
  assert.deepEqual(generateFloor(7, 3).items, generateFloor(7, 3).items);
  assert.deepEqual([...generateFloor(7, 3).tiles], [...generateFloor(7, 3).tiles]);
  assert.notDeepEqual([...generateFloor(7, 3).tiles], [...generateFloor(7, 4).tiles]);
  assert.notDeepEqual(generateFloor(7, 2).items, generateFloor(8, 2).items);
  assert.ok(floorSeed(0, 0) >= 1);
});

test('each kind of gear gives its power, and plain characters can still play', () => {
  const base = { speed: 1, luck: 1, shield: 0 };
  assert.deepEqual(powersFor({}), { light: 3, dashWait: 1.3, dashTime: 0.15, magnet: false, hearts: 3, smash: false, ...base });
  assert.deepEqual(powersFor({ aura: 'none', cape: 'none', pet: 'none', hat: 'none', held: 'none' }), powersFor(null));
  const geared = powersFor({ aura: 'spark', cape: 'red', pet: 'cat', hat: 'cap', held: 'sword' });
  assert.deepEqual(geared, { light: 5.5, dashWait: 0.55, dashTime: 0.24, magnet: true, hearts: 4, smash: true, ...base });
  assert.ok(powersFor({ aura: 'rainbow' }).light > geared.light);
  for (const p of POWERS) assert.ok(SLOTS[p.slot], `${p.slot} is a real character slot`);
});

test('relics give something new every time, until there is nothing left to give', () => {
  let powers = powersFor({});
  assert.equal(RELICS.blade.give(powers).smash, true);
  assert.ok(RELICS.feather.give(powers).dashWait < powers.dashWait, 'a feather dashes more often');
  assert.equal(RELICS.heart.give(powers).hearts, 4);
  // A geared player is never handed a power they already have.
  const geared = powersFor({ cape: 'red', pet: 'cat', held: 'sword' });
  for (let r = 0; r < 1; r += 0.05) assert.ok(!['magnet', 'blade'].includes(pickRelic(geared, r)));
  let found = 0;
  for (; found < 200; found++) {
    const id = pickRelic(powers, (found * 0.37) % 1);
    if (!id) break;
    const next = RELICS[id].give(powers);
    assert.notDeepEqual(next, powers, `${id} changed nothing`);
    powers = next;
  }
  assert.ok(found > 10 && found < 60, `a player can hold ${found} relics before they run out`);
  assert.ok(powers.speed <= 1.6 && powers.hearts <= 8 && powers.luck <= 2);
});

test('spikes go up and down, so they can be timed', () => {
  let up = 0;
  for (let t = 0; t < 24; t += 0.1) if (spikeUp(4, 9, t)) up++;
  assert.ok(up > 60 && up < 140, `up ${up} of 240 moments`);
});

test('a recorded run plays back as a ghost, floor by floor, in a form the server accepts', async () => {
  const { encodePath, decodePath, ghostAt } = await import('../js/game/quest.js');
  const points = [[104, 104], [120, 104], DOWN, [479, 303], [5000, -3]];
  const text = encodePath(points);
  assert.match(text, /^p([0-9a-z]{4}){1,600}$/);
  assert.deepEqual(decodePath(text), [[104, 104, 1], [120, 104, 1], [120, 104, 2], [479, 303, 2], [479, 0, 2]]);
  assert.equal(encodePath(Array.from({ length: 900 }, () => [1, 1])).length, 1 + 600 * 4);
  assert.deepEqual(decodePath('p<script>'), []);
  const path = decodePath(text);
  assert.deepEqual(ghostAt(path, 0), { x: 104, y: 104, floor: 1, done: false });
  assert.equal(ghostAt(path, 0.25).x, 112);
  assert.equal(ghostAt(path, 0.75).x, 120, 'a ghost never glides across a staircase');
  assert.equal(ghostAt(path, 1.2).floor, 2);
  assert.equal(ghostAt(path, 99).done, true);
  assert.equal(ghostAt([], 1), null);
});
