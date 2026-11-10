// Character gear: everything must be earnable, and skin colors are one set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, SKIN_ORDER, unlockables, rarityOf, defaultAvatar, TITLES } from '../js/game/avatar.js';
import { BADGES, TEACHER_BADGES, RANKS } from '../js/game/rules.js';

test('every locked item can be earned with a real badge or reachable XP', () => {
  const badges = new Set([...BADGES, ...TEACHER_BADGES].map((b) => b.id));
  const top = RANKS.at(-1).xp + 1000;
  for (const u of unlockables()) {
    if (u.unlock.badge) assert.ok(badges.has(u.unlock.badge), `${u.key} needs a badge that doesn't exist: ${u.unlock.badge}`);
    else assert.ok(u.unlock.xp > 0 && u.unlock.xp <= top, `${u.key} needs unreachable XP`);
    assert.ok(['rare', 'epic', 'legendary'].includes(rarityOf(u.unlock)));
    assert.ok(u.name && !/color \d/.test(u.name), `${u.key} needs a real name`);
  }
});

test('skin colors are one set, all offered and all possible by default', () => {
  assert.deepEqual([...SKIN_ORDER].sort(), SLOTS.skin.swatches.map((_, i) => i).sort());
  assert.ok(!SLOTS.skin.locks, 'no skin color is locked');
  const seen = new Set(Array.from({ length: 400 }, (_, i) => defaultAvatar(`student-${i}`).skin));
  assert.equal(seen.size, SLOTS.skin.swatches.length);
});

test('titles are a fixed list, short enough to show under a name', () => {
  for (const [id, t] of Object.entries(TITLES)) assert.ok(t.name.length <= 20, id);
  assert.equal(defaultAvatar('x').title, 'none');
});
