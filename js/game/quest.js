// Trail Quest: the rules and the map, with no drawing, so tests can check them.
// A run goes down through dungeon floors, one after another, for as long as the player lasts. Every
// floor is made fresh from the run's seed and its depth, and each is harder than the one before.
// What a student's character wears decides what they can do there (powersFor), and relics found
// on the way add to it for the rest of the run.

export const TILE = 16;
export const W = 64;
export const H = 40;
export const T = { OPEN: 0, TREE: 1, WALL: 2, ROCK: 3, FLOWER: 4, PILLAR: 5, SPIKE: 6, STAIRS: 7 };
export const VALUE = { coin: 1, gem: 5, chest: 25 };
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
    // These start the same for everyone and only change with relics found during a run.
    speed: 1, luck: 1, shield: 0, dashWait: 1.5,
  };
}
export const POWERS = [
  { slot: 'aura', icon: '✨', name: 'Glow', does: 'lights up dark floors' },
  { slot: 'cape', icon: '🦸', name: 'Cape', does: 'dash with Space, right over spikes' },
  { slot: 'pet', icon: '🐾', name: 'Pet', does: 'pulls coins to you' },
  { slot: 'hat', icon: '🎩', name: 'Hat', does: 'gives an extra heart' },
  { slot: 'held', icon: '⚒️', name: 'Held item', does: 'smashes cracked rocks to open vaults' },
];

// Relics: found in chests and deep in a floor. They last until the run ends.
export const RELICS = {
  boots: { icon: '👟', name: 'Swift boots', does: 'You run faster.', give: (p) => ({ ...p, speed: Math.min(1.6, p.speed + 0.15) }), useful: (p) => p.speed < 1.6 },
  lantern: { icon: '🏮', name: 'Lantern', does: 'You see further in the dark.', give: (p) => ({ ...p, light: Math.min(9, p.light + 1.5) }), useful: (p) => p.light < 9 },
  magnet: { icon: '🧲', name: 'Magnet', does: 'Coins fly to you.', give: (p) => ({ ...p, magnet: true }), useful: (p) => !p.magnet },
  hammer: { icon: '🔨', name: 'Hammer', does: 'You can smash cracked rocks.', give: (p) => ({ ...p, smash: true }), useful: (p) => !p.smash },
  feather: { icon: '🪶', name: 'Feather', does: 'Dash with Space, or dash more often.', give: (p) => (p.dash ? { ...p, dashWait: 0.8 } : { ...p, dash: true }), useful: (p) => !p.dash || p.dashWait > 0.8 },
  clover: { icon: '🍀', name: 'Lucky clover', does: 'Treasure is worth more.', give: (p) => ({ ...p, luck: Math.min(2, p.luck + 0.25) }), useful: (p) => p.luck < 2 },
  shield: { icon: '🛡️', name: 'Shield', does: 'Blocks one hit on every floor.', give: (p) => ({ ...p, shield: p.shield + 1 }), useful: (p) => p.shield < 2 },
  heart: { icon: '💖', name: 'Heart stone', does: 'One more heart.', give: (p) => ({ ...p, hearts: p.hearts + 1 }), useful: (p) => p.hearts < 8 },
};
/** Pick a relic this player can still use. `roll` is a number from 0 up to 1. Null when they have it all. */
export function pickRelic(powers, roll) {
  const ids = Object.keys(RELICS).filter((id) => RELICS[id].useful(powers));
  return ids.length ? ids[Math.min(ids.length - 1, Math.floor(roll * ids.length))] : null;
}

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

/** How hard a floor is. Everything that scales with depth is here, so it can be tuned in one place. */
export function difficulty(depth) {
  const d = Math.max(1, Math.floor(depth));
  return {
    enemies: Math.min(34, 5 + d * 2),
    kinds: ['slime', ...(d >= 2 ? ['bat'] : []), ...(d >= 3 ? ['guard'] : []), ...(d >= 4 ? ['spitter'] : []), ...(d >= 6 ? ['hunter'] : [])],
    speed: Math.min(2, 1 + (d - 1) * 0.08),
    spikes: d < 3 ? 0 : Math.min(36, (d - 2) * 5),
    vaults: d === 1 ? 1 : d < 5 ? 2 : 3,
    // Treasure is worth more the deeper it is found.
    worth: 1 + Math.floor((d - 1) / 3),
    gems: Math.min(18, 3 + d),
  };
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Steps from the start to every tile, or -1 where you can't walk. With `smash`, cracked rocks don't stop you. */
export function distances(tiles, start, smash) {
  const dist = new Int16Array(W * H).fill(-1);
  const queue = [start.ty * W + start.tx];
  dist[queue[0]] = 0;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    const x = at % W;
    const y = (at - x) / W;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const to = ny * W + nx;
      if (dist[to] >= 0) continue;
      const tile = tiles[to];
      if (isSolid(tile) && !(smash && tile === T.ROCK)) continue;
      dist[to] = dist[at] + 1;
      queue.push(to);
    }
  }
  return dist;
}
/** Every tile you can walk to from the start of a floor, as 1s. */
export function reachable(world, smash) {
  return distances(world.tiles, world.startTile, smash).map((d) => (d >= 0 ? 1 : 0));
}

const LAYOUTS = ['rooms', 'rooms', 'maze', 'maze', 'cavern', 'cavern', 'field'];
const THEMES = { field: ['meadow'], maze: ['forest', 'ruins'], cavern: ['cave'], rooms: ['ruins', 'cave'] };

/** The seed of one floor of a run. The same run seed always leads down through the same floors. */
export const floorSeed = (seed, depth) => ((Math.imul((seed ^ Math.imul(depth, 0x9e3779b1)) >>> 0, 0x85ebca6b) ^ (depth * 7919)) >>> 0) || 1;

/** Build one floor of a run. The same seed and depth always give the same floor. */
export function generateFloor(seed, depth = 1) {
  const rand = rng(floorSeed(seed, depth));
  const pick = (n) => Math.floor(rand() * n);
  const hard = difficulty(depth);
  // The first floor is always an open meadow, so a new player can learn to move.
  let layout = depth === 1 ? 'field' : LAYOUTS[pick(LAYOUTS.length)];
  const tiles = new Uint8Array(W * H);
  const at = (x, y) => tiles[y * W + x];
  const set = (x, y, v) => { tiles[y * W + x] = v; };
  const inside = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  let start = { tx: 6, ty: 6 };
  let theme = 'meadow';
  let solid = T.TREE;

  const carveField = () => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, inside(x, y) ? T.OPEN : solid);
    // Clumps of trees or stones to walk around.
    for (let i = 0; i < 46; i++) {
      const cx = 2 + pick(W - 4);
      const cy = 2 + pick(H - 4);
      const size = 1 + pick(3);
      for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (inside(x, y) && Math.abs(x - 6) + Math.abs(y - 6) > 4 && rand() < 0.8) set(x, y, solid);
      }
    }
    start = { tx: 6, ty: 6 };
  };
  // Rooms are 2 by 2 tiles on a grid 3 tiles apart, joined by knocking out the wall between neighbors.
  // Every room is joined to the first, and some extra walls are knocked out so there are loops.
  const carveMaze = () => {
    tiles.fill(solid);
    const cols = 20;
    const rows = 12;
    const room = (cx, cy) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(2 + cx * 3 + dx, 2 + cy * 3 + dy, T.OPEN); };
    const join = (cx, cy, dx, dy) => { for (let k = 0; k < 2; k++) set(2 + cx * 3 + (dx ? (dx > 0 ? 2 : -1) : k), 2 + cy * 3 + (dy ? (dy > 0 ? 2 : -1) : k), T.OPEN); };
    const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < cols && cy < rows;
    const seen = new Set(['0,0']);
    const stack = [[0, 0]];
    room(0, 0);
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const next = DIRS.filter(([dx, dy]) => ok(cx + dx, cy + dy) && !seen.has(`${cx + dx},${cy + dy}`));
      if (!next.length) { stack.pop(); continue; }
      const [dx, dy] = next[pick(next.length)];
      join(cx, cy, dx, dy);
      room(cx + dx, cy + dy);
      seen.add(`${cx + dx},${cy + dy}`);
      stack.push([cx + dx, cy + dy]);
    }
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      if (rand() < 0.28) { const [dx, dy] = DIRS[pick(4)]; if (ok(cx + dx, cy + dy)) join(cx, cy, dx, dy); }
    }
    start = { tx: 2, ty: 2 };
  };
  // Classic dungeon: rooms that don't touch, joined in a chain by corridors two tiles wide.
  const carveRooms = () => {
    tiles.fill(solid);
    const rooms = [];
    for (let tries = 0; tries < 220 && rooms.length < 13; tries++) {
      const w = 6 + pick(8);
      const hh = 5 + pick(5);
      const x = 2 + pick(W - w - 4);
      const y = 2 + pick(H - hh - 4);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + hh + 2 > r.y)) continue;
      rooms.push({ x, y, w, h: hh });
      for (let dy = 0; dy < hh; dy++) for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, T.OPEN);
    }
    rooms.sort((a, b) => a.x + a.y - b.x - b.y);
    const mid = (r) => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)];
    const hall = (x0, y0, x1, y1) => {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + 1; x++) for (let k = 0; k < 2; k++) if (inside(x, y0 + k)) set(x, y0 + k, T.OPEN);
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1) + 1; y++) for (let k = 0; k < 2; k++) if (inside(x1 + k, y)) set(x1 + k, y, T.OPEN);
    };
    for (let i = 1; i < rooms.length; i++) hall(...mid(rooms[i - 1]), ...mid(rooms[i]));
    // A few extra halls make loops, so there is more than one way round.
    for (let i = 0; i < 3 && rooms.length > 3; i++) hall(...mid(rooms[pick(rooms.length)]), ...mid(rooms[pick(rooms.length)]));
    const [sx, sy] = mid(rooms[0]);
    start = { tx: sx, ty: sy };
  };
  // Caves: scatter stone, then smooth it a few times so it clumps into winding caverns.
  const carveCavern = () => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, !inside(x, y) || rand() < 0.44 ? solid : T.OPEN);
    for (let round = 0; round < 4; round++) {
      const next = tiles.slice();
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== T.OPEN) walls++;
        next[y * W + x] = walls >= 5 ? solid : T.OPEN;
      }
      tiles.set(next);
    }
    // Start in the biggest cavern.
    let best = 0;
    const seen = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (at(x, y) !== T.OPEN || seen[y * W + x]) continue;
      const d = distances(tiles, { tx: x, ty: y }, false);
      let size = 0;
      for (let i = 0; i < d.length; i++) if (d[i] >= 0) { size++; seen[i] = 1; }
      if (size > best) { best = size; start = { tx: x, ty: y }; }
    }
    return best;
  };

  const build = (kind) => {
    theme = THEMES[kind][pick(THEMES[kind].length)];
    solid = theme === 'meadow' || theme === 'forest' ? T.TREE : T.WALL;
    if (kind === 'field') carveField();
    else if (kind === 'maze') carveMaze();
    else if (kind === 'rooms') carveRooms();
    else if (carveCavern() < 600) { layout = 'rooms'; build('rooms'); }
  };
  build(layout);
  const startKey = start.ty * W + start.tx;

  // Vaults: 5 by 5 walls around a chest, closed by one cracked rock that needs a held item or a hammer.
  const vaults = [];
  for (let tries = 0; tries < 80 && vaults.length < hard.vaults; tries++) {
    const x = 2 + pick(W - 9);
    const y = 2 + pick(H - 9);
    if (Math.abs(x + 2 - start.tx) + Math.abs(y + 2 - start.ty) < 9) continue;
    if (vaults.some((v) => Math.abs(v.x - x) < 8 && Math.abs(v.y - y) < 8)) continue;
    const [dx, dy] = DIRS[pick(4)];
    const door = [x + 2 + dx * 2, y + 2 + dy * 2];
    const outside = [door[0] + dx, door[1] + dy];
    const dist = distances(tiles, start, false);
    if (!inside(outside[0], outside[1]) || dist[outside[1] * W + outside[0]] < 0) continue;
    const before = tiles.slice();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) set(x + i, y + j, i === 0 || j === 0 || i === 4 || j === 4 ? T.WALL : T.OPEN);
    set(door[0], door[1], T.ROCK);
    // The vault must not wall off the way to its own door, or cut the floor in two.
    const after = distances(tiles, start, false);
    let lost = 0;
    for (let i = 0; i < after.length; i++) if (dist[i] >= 0 && after[i] < 0 && !(i % W >= x && i % W < x + 5 && Math.floor(i / W) >= y && Math.floor(i / W) < y + 5)) lost++;
    if (after[outside[1] * W + outside[0]] < 0 || lost > 0) { tiles.set(before); continue; }
    vaults.push({ x, y });
  }
  const inVault = (x, y) => vaults.some((v) => x >= v.x && x < v.x + 5 && y >= v.y && y < v.y + 5);

  const dist = distances(tiles, start, false);
  const open = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (dist[y * W + x] > 2 && !inVault(x, y)) open.push([x, y]);
  for (let i = open.length - 1; i > 0; i--) { const j = pick(i + 1); [open[i], open[j]] = [open[j], open[i]]; }
  const taken = new Set([startKey]);
  const free = (ok) => {
    const k = open.findIndex(([x, y]) => !taken.has(y * W + x) && (!ok || ok(x, y)));
    if (k < 0) return null;
    const [cell] = open.splice(k, 1);
    taken.add(cell[1] * W + cell[0]);
    return cell;
  };

  // The stairs down are as far from the start as the floor allows.
  let far = start;
  let farDist = 0;
  for (const [x, y] of open) if (dist[y * W + x] > farDist) { farDist = dist[y * W + x]; far = { tx: x, ty: y }; }
  set(far.tx, far.ty, T.STAIRS);
  taken.add(far.ty * W + far.tx);

  const items = [];
  const enemies = [];
  const put = (kind, x, y, extra) => items.push({ kind, x: x * TILE + 8, y: y * TILE + 8, value: (VALUE[kind] || 0) * hard.worth, taken: false, ...extra });
  const some = (n, make, ok) => { for (let i = 0; i < n; i++) { const c = free(ok); if (c) make(c[0], c[1]); } };

  for (const v of vaults) {
    put('chest', v.x + 2, v.y + 2, { relic: true });
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('gem', v.x + 2 + dx, v.y + 2 + dy);
  }
  some(36, (x, y) => put('coin', x, y));
  some(hard.gems, (x, y) => put('gem', x, y), (x, y) => dist[y * W + x] > 12);
  // Something to find on every floor: a heart, and past the first floor a relic deep inside.
  some(depth > 1 ? 2 : 1, (x, y) => put('heart', x, y), (x, y) => dist[y * W + x] > 10);
  if (depth > 1) some(1, (x, y) => put('relic', x, y), (x, y) => dist[y * W + x] > farDist * 0.55);

  // Spikes go where you have to walk: tiles with a wall beside them, never a whole room.
  const spikes = [];
  some(hard.spikes, (x, y) => { set(x, y, T.SPIKE); spikes.push([x, y]); },
    (x, y) => dist[y * W + x] > 6 && DIRS.some(([dx, dy]) => isSolid(at(x + dx, y + dy))));

  for (let i = 0; i < hard.enemies; i++) {
    const kind = hard.kinds[pick(hard.kinds.length)];
    // Far enough that nothing is on top of a player who has just arrived, even a bat that flies over walls.
    const c = free((x, y) => dist[y * W + x] > 9 && Math.hypot(x - start.tx, y - start.ty) > 7);
    if (c) enemies.push({ kind, x: c[0] * TILE + 8, y: c[1] * TILE + 8, vx: 0, vy: 0, wait: rand() * 2 });
  }

  if (theme === 'meadow' || theme === 'forest') {
    for (let i = 0; i < 40; i++) { const x = 1 + pick(W - 2); const y = 1 + pick(H - 2); if (at(x, y) === T.OPEN && !taken.has(y * W + x)) set(x, y, T.FLOWER); }
  }

  return {
    seed, depth, layout, theme, tiles, items, enemies, spikes,
    // Caves are always dark. Deeper down, other floors can be too.
    dark: theme === 'cave' || (depth >= 5 && rand() < 0.4),
    speed: hard.speed, worth: hard.worth,
    startTile: start, start: { x: start.tx * TILE + 8, y: start.ty * TILE + 8 },
    stairs: { x: far.tx * TILE + 8, y: far.ty * TILE + 8 },
  };
}
/** Spikes rise and fall. Each one keeps its own beat, so a row of them makes a wave to time. */
export const spikeUp = (tx, ty, time) => (time + ((tx * 3 + ty * 5) % 6) * 0.4) % 2.4 < 1;

// Ghosts ---------------------------------------------------------------------------------------------
// A run is recorded as where the player stood every half second. Each spot is 4 characters (x then
// y, in base 36), after a leading "p", so a five-minute run is about 2,400 characters. Going down
// the stairs is recorded as "zzzz" in place of that moment's spot.
export const GHOST_STEP = 0.5;
export const DOWN = 'down';
const GHOST_MAX = 600;
const b36 = (n, max) => Math.max(0, Math.min(max, Math.round(n))).toString(36).padStart(2, '0');
export const encodePath = (points) => `p${points.slice(0, GHOST_MAX).map((pt) => (pt === DOWN ? 'zzzz' : b36(pt[0], W * TILE - 1) + b36(pt[1], H * TILE - 1))).join('')}`;
/** Spots as [x, y, floor]. A moment spent on the stairs repeats the spot before it, one floor down. */
export function decodePath(text) {
  if (!/^p([0-9a-z]{4})+$/.test(String(text))) return [];
  const out = [];
  let floor = 1;
  for (let i = 1; i < text.length; i += 4) {
    const part = text.slice(i, i + 4);
    if (part === 'zzzz') { floor++; const prev = out[out.length - 1] || [0, 0]; out.push([prev[0], prev[1], floor]); continue; }
    out.push([Math.min(W * TILE - 1, parseInt(part.slice(0, 2), 36)), Math.min(H * TILE - 1, parseInt(part.slice(2, 4), 36)), floor]);
  }
  return out;
}
/** Where a ghost is `t` seconds into its run, gliding between recorded spots. It waits at its last one. */
export function ghostAt(points, t) {
  if (!points.length) return null;
  const f = Math.max(0, t) / GHOST_STEP;
  const i = Math.min(points.length - 1, Math.floor(f));
  const j = Math.min(points.length - 1, i + 1);
  // Never glide across a staircase: the next spot is on another floor.
  const k = points[j][2] === points[i][2] ? Math.min(1, f - i) : 0;
  return { x: points[i][0] + (points[j][0] - points[i][0]) * k, y: points[i][1] + (points[j][1] - points[i][1]) * k, floor: points[i][2], done: f >= points.length - 1 };
}
