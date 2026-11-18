// Trail Quest: the rules and the map, with no drawing, so tests can check them.
// A run is one visit to a freshly made world: a meadow, a forest, dark caves, and ruins.
// What a student's character wears decides what they can do there (powersFor).

export const TILE = 16;
export const W = 64;
export const H = 40;
export const T = { OPEN: 0, TREE: 1, WALL: 2, ROCK: 3, FLOWER: 4, PILLAR: 5 };
export const START = { tx: 6, ty: 6 };
export const VALUE = { coin: 1, gem: 5, chest: 25 };

/** Which area a tile is in. Column 32 and row 20 are the walls between areas. */
export const regionAt = (tx, ty) => (tx < 32 ? (ty < 20 ? 'meadow' : 'forest') : (ty < 20 ? 'cave' : 'ruins'));
export const isSolid = (tile) => tile === T.TREE || tile === T.WALL || tile === T.ROCK || tile === T.PILLAR;

/** What each kind of gear does. Any item in the slot gives the power. */
export function powersFor(av) {
  const a = av || {};
  const has = (slot) => !!a[slot] && a[slot] !== 'none';
  return {
    light: has('aura') ? (a.aura === 'rainbow' ? 6.5 : 4.5) : 2.3,
    dash: has('cape'),
    magnet: has('pet'),
    hearts: 3 + (has('hat') ? 1 : 0),
    smash: has('held'),
  };
}
export const POWERS = [
  { slot: 'aura', icon: '✨', name: 'Glow', does: 'lights up dark caves' },
  { slot: 'cape', icon: '🦸', name: 'Cape', does: 'dash with Space' },
  { slot: 'pet', icon: '🐾', name: 'Pet', does: 'pulls coins to you' },
  { slot: 'hat', icon: '🎩', name: 'Hat', does: 'gives an extra heart' },
  { slot: 'held', icon: '⚒️', name: 'Held item', does: 'smashes cracked rocks' },
];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Doorways between areas: [tx, ty] pairs on the dividing walls.
const GATES = [[32, 10], [32, 11], [32, 30], [32, 31], [10, 20], [11, 20], [25, 20], [26, 20], [48, 20], [49, 20],
  // The short paths that join a doorway to the maze beside it.
  [30, 30], [31, 30], [30, 31], [31, 31], [48, 18], [49, 18], [48, 19], [49, 19]];
// Treasure rooms in the ruins: 5 by 5 walls around a chest, closed by one cracked rock.
const ROOMS = [36, 45, 54].flatMap((x) => [{ x, y: 23, door: 4 }, { x, y: 32, door: 0 }]);

/** Build a world. The same seed always gives the same world. */
export function generateWorld(seed) {
  const rand = rng(seed);
  const pick = (n) => Math.floor(rand() * n);
  const tiles = new Uint8Array(W * H);
  const at = (x, y) => tiles[y * W + x];
  const set = (x, y, v) => { tiles[y * W + x] = v; };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 32 || y === 20;
      const region = regionAt(x, y);
      if (edge) set(x, y, x < 32 ? T.TREE : T.WALL);
      else if (region === 'forest') set(x, y, T.TREE);
      else if (region === 'cave') set(x, y, T.WALL);
      else set(x, y, T.OPEN);
    }
  }
  for (const [x, y] of GATES) set(x, y, T.OPEN);

  // The forest and the caves are mazes. Rooms are 2 by 2 tiles on a grid 3 tiles apart, joined by
  // knocking out the wall between neighbors. Every room is joined to the first, so nothing is cut off,
  // and some extra walls are knocked out so there are loops instead of long dead ends.
  const maze = (x0, y0, cols, rows) => {
    const room = (cx, cy) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(x0 + cx * 3 + dx, y0 + cy * 3 + dy, T.OPEN); };
    const join = (cx, cy, dx, dy) => { for (let k = 0; k < 2; k++) set(x0 + cx * 3 + (dx ? (dx > 0 ? 2 : -1) : k), y0 + cy * 3 + (dy ? (dy > 0 ? 2 : -1) : k), T.OPEN); };
    const seen = new Set(['0,0']);
    const stack = [[0, 0]];
    room(0, 0);
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < cols && cy < rows;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const next = DIRS.filter(([dx, dy]) => inside(cx + dx, cy + dy) && !seen.has(`${cx + dx},${cy + dy}`));
      if (!next.length) { stack.pop(); continue; }
      const [dx, dy] = next[pick(next.length)];
      join(cx, cy, dx, dy);
      room(cx + dx, cy + dy);
      seen.add(`${cx + dx},${cy + dy}`);
      stack.push([cx + dx, cy + dy]);
    }
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      if (rand() < 0.3) { const [dx, dy] = DIRS[pick(4)]; if (inside(cx + dx, cy + dy)) join(cx, cy, dx, dy); }
    }
  };
  maze(1, 21, 10, 6);
  maze(33, 1, 10, 6);

  for (const r of ROOMS) {
    for (let i = 0; i < 5; i++) {
      set(r.x + i, r.y, T.WALL);
      set(r.x + i, r.y + 4, T.WALL);
      set(r.x, r.y + i, T.WALL);
      set(r.x + 4, r.y + i, T.WALL);
    }
    set(r.x + 2, r.y + r.door, T.ROCK);
  }
  const inRoom = (x, y) => ROOMS.some((r) => x >= r.x - 1 && x <= r.x + 5 && y >= r.y - 1 && y <= r.y + 5);

  // A lone obstacle with open ground all around it can never block a path.
  const lonely = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== T.OPEN && at(x + dx, y + dy) !== T.FLOWER) return false;
    return true;
  };
  const sprinkle = (x0, y0, x1, y1, tile, count, ok) => {
    for (let i = 0, tries = 0; i < count && tries < count * 30; tries++) {
      const x = x0 + pick(x1 - x0 + 1);
      const y = y0 + pick(y1 - y0 + 1);
      if (at(x, y) === T.OPEN && lonely(x, y) && (!ok || ok(x, y))) { set(x, y, tile); i++; }
    }
  };
  const farFromStart = (x, y) => Math.abs(x - START.tx) + Math.abs(y - START.ty) > 3;
  sprinkle(2, 2, 30, 18, T.TREE, 22, farFromStart);
  sprinkle(34, 22, 61, 37, T.PILLAR, 16, (x, y) => !inRoom(x, y));
  for (let i = 0; i < 40; i++) {
    const x = 1 + pick(31);
    const y = 1 + pick(19);
    if (at(x, y) === T.OPEN && farFromStart(x, y)) set(x, y, T.FLOWER);
  }

  // Things to find. Each goes on its own open tile.
  const taken = new Set([`${START.tx},${START.ty}`]);
  const openIn = (x0, y0, x1, y1, ok) => {
    const cells = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!isSolid(at(x, y)) && !taken.has(`${x},${y}`) && (!ok || ok(x, y))) cells.push([x, y]);
    for (let i = cells.length - 1; i > 0; i--) { const j = pick(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    return cells;
  };
  const items = [];
  const enemies = [];
  const place = (cells, n, make) => cells.slice(0, n).forEach(([x, y]) => { taken.add(`${x},${y}`); make(x, y); });
  const item = (kind) => (x, y) => items.push({ kind, x: x * TILE + 8, y: y * TILE + 8, value: VALUE[kind], taken: false });
  const enemy = (kind) => (x, y) => enemies.push({ kind, x: x * TILE + 8, y: y * TILE + 8, home: regionAt(x, y), vx: 0, vy: 0, wait: 0 });
  const awayFromStart = (x, y) => Math.abs(x - START.tx) + Math.abs(y - START.ty) > 8;

  place(openIn(1, 1, 31, 19), 35, item('coin'));
  place(openIn(1, 21, 31, 38), 35, item('coin'));
  place(openIn(33, 1, 62, 19), 25, item('coin'));
  place(openIn(33, 1, 62, 19), 15, item('gem'));
  place(openIn(33, 21, 62, 38, (x, y) => !inRoom(x, y)), 20, item('coin'));
  for (const r of ROOMS) { taken.add(`${r.x + 2},${r.y + 2}`); item('chest')(r.x + 2, r.y + 2); }

  place(openIn(1, 1, 31, 19, awayFromStart), 3, enemy('slime'));
  place(openIn(1, 21, 31, 38), 5, enemy('slime'));
  place(openIn(33, 1, 62, 19), 6, enemy('bat'));
  place(openIn(33, 21, 62, 38, (x, y) => !inRoom(x, y)), 5, enemy('guard'));

  return { seed, tiles, items, enemies, start: { x: START.tx * TILE + 8, y: START.ty * TILE + 8 } };
}

/** Every tile you can walk to from the start. With `smash`, cracked rocks don't stop you. */
export function reachable(world, smash) {
  const seen = new Uint8Array(W * H);
  const queue = [[START.tx, START.ty]];
  seen[START.ty * W + START.tx] = 1;
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue;
      const tile = world.tiles[ny * W + nx];
      if (isSolid(tile) && !(smash && tile === T.ROCK)) continue;
      seen[ny * W + nx] = 1;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Ghosts ---------------------------------------------------------------------------------------------
// A run is recorded as where the player stood every half second. Each spot is 4 characters (x then
// y, in base 36), after a leading "p", so a five-minute run is about 2,400 characters.
export const GHOST_STEP = 0.5;
const GHOST_MAX = 600;
const b36 = (n, max) => Math.max(0, Math.min(max, Math.round(n))).toString(36).padStart(2, '0');
export const encodePath = (points) => `p${points.slice(0, GHOST_MAX).map(([x, y]) => b36(x, W * TILE - 1) + b36(y, H * TILE - 1)).join('')}`;
export function decodePath(text) {
  if (!/^p([0-9a-z]{4})+$/.test(String(text))) return [];
  const out = [];
  for (let i = 1; i < text.length; i += 4) out.push([parseInt(text.slice(i, i + 2), 36), parseInt(text.slice(i + 2, i + 4), 36)]);
  return out;
}
/** Where a ghost is `t` seconds into its run, gliding between recorded spots. It waits at its last one. */
export function ghostAt(points, t) {
  if (!points.length) return null;
  const f = Math.max(0, t) / GHOST_STEP;
  const i = Math.min(points.length - 1, Math.floor(f));
  const j = Math.min(points.length - 1, i + 1);
  const k = Math.min(1, f - i);
  return { x: points[i][0] + (points[j][0] - points[i][0]) * k, y: points[i][1] + (points[j][1] - points[i][1]) * k, done: f >= points.length - 1 };
}
