// The journey map's ground: a top-down pixel overworld, like the map screen of an old adventure
// game. Each stage of the trail gets its own little land (a camp, a forest, a lake, a snowy summit,
// a mushroom grove, a desert), and everything is drawn here in code, so there are no image files.
//
// The teacher's rules for this picture: it must stay quiet enough that characters and trails are
// the brightest things on the map, and nothing may be drawn under a stop, its label, or a trail.

const ART = 3; // page pixels per art pixel

function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each land: ground colours [base, light speck, dark speck], and what grows there with how often.
const LANDS = {
  camp: { ground: ['#b9d39a', '#c6dca9', '#a9c68b'], things: [['oak', 3], ['flowers', 6], ['tuft', 6], ['rock', 1], ['pine', 1]], crowd: 1 },
  forest: { ground: ['#a7c88f', '#b4d29c', '#97ba80'], things: [['pine', 8], ['oak', 4], ['tuft', 3], ['rock', 1], ['mushroom', 1]], crowd: 1.7 },
  lake: { ground: ['#b4d4a0', '#c2ddae', '#a4c690'], things: [['pond', 2], ['reeds', 3], ['oak', 2], ['flowers', 5], ['tuft', 4]], crowd: 1 },
  autumn: { ground: ['#cfcf9a', '#d9d9aa', '#c0c08a'], things: [['maple', 8], ['oak', 1], ['tuft', 3], ['rock', 2], ['pumpkin', 2]], crowd: 1.6 },
  hills: { ground: ['#c2cf9f', '#cfdaae', '#b3c190'], things: [['rock', 5], ['boulder', 3], ['pine', 3], ['tuft', 5], ['cabin', 1]], crowd: 1.1 },
  highland: { ground: ['#c9cbb4', '#d5d7c2', '#b9bba4'], things: [['boulder', 4], ['rock', 5], ['pine', 4], ['cabin', 1], ['tuft', 4]], crowd: 1.3 },
  snow: { ground: ['#e6edf0', '#f3f7f9', '#d5dfe4'], things: [['peak', 6], ['snowpine', 6], ['rock', 2], ['snowman', 1], ['tuft', 3]], crowd: 1.6 },
  alpine: { ground: ['#bcd8a6', '#cae1b5', '#abc995'], things: [['flowers', 9], ['snowpine', 2], ['pine', 3], ['tuft', 5], ['rock', 2]], crowd: 1.2 },
  grove: { ground: ['#c9c2dc', '#d6d0e6', '#b9b1cf'], things: [['mushroom', 8], ['bigshroom', 4], ['tuft', 3], ['crystal', 1], ['flowers', 3]], crowd: 1.5 },
  crystal: { ground: ['#c3cfe0', '#d0dbe9', '#b3c0d3'], things: [['crystal', 7], ['rock', 3], ['bigshroom', 2], ['tuft', 2]], crowd: 1.2 },
  dusk: { ground: ['#cdbfd6', '#d9cde0', '#bdaec8'], things: [['bigshroom', 5], ['mushroom', 5], ['crystal', 3], ['pond', 1], ['tuft', 3]], crowd: 1.4 },
  desert: { ground: ['#ead9ab', '#f1e3bb', '#dcc998'], things: [['pyramid', 3], ['cactus', 6], ['rock', 3], ['dune', 5], ['palm', 2]], crowd: 1 },
};
// The climb to the Summit is two stages of snow, so the mountain feels like a place you arrive at.
const ORDER = ['camp', 'forest', 'lake', 'autumn', 'highland', 'snow', 'snow', 'alpine', 'grove', 'crystal', 'dusk', 'desert'];
/** The land for the nth stage. The trail's stages run in this order; any extra ones go round again. */
export const landFor = (i) => ORDER[i % ORDER.length];

// Sprites. Each is drawn from the middle of its base, in art pixels, a little from above so it has depth.
const SHADOW = 'rgba(40, 50, 40, .18)';
const SPRITES = {
  pine: (p, x, y, r, c = ['#4f8a5b', '#6aa574', '#3c6f48']) => { p(x - 3, y, 7, 2, SHADOW); p(x, y - 2, 1, 3, '#7a5a3a'); p(x - 3, y - 4, 7, 2, c[0]); p(x - 2, y - 6, 5, 2, c[0]); p(x - 1, y - 8, 3, 2, c[0]); p(x, y - 9, 1, 1, c[0]); p(x - 2, y - 4, 2, 1, c[1]); p(x - 1, y - 6, 1, 1, c[1]); p(x + 2, y - 3, 2, 1, c[2]); p(x + 1, y - 5, 2, 1, c[2]); },
  snowpine: (p, x, y) => { SPRITES.pine(p, x, y, null, ['#5b8f76', '#ffffff', '#467560']); p(x - 1, y - 8, 2, 1, '#ffffff'); p(x - 3, y - 4, 2, 1, '#ffffff'); },
  oak: (p, x, y, r, c = ['#6aa861', '#86c07a', '#538c4d']) => { p(x - 4, y, 9, 2, SHADOW); p(x, y - 2, 2, 3, '#7a5a3a'); p(x - 3, y - 8, 8, 6, c[0]); p(x - 2, y - 9, 6, 1, c[0]); p(x - 4, y - 6, 1, 3, c[0]); p(x + 5, y - 6, 1, 3, c[0]); p(x - 2, y - 8, 3, 2, c[1]); p(x + 2, y - 4, 3, 2, c[2]); },
  maple: (p, x, y) => SPRITES.oak(p, x, y, null, ['#e39a4a', '#f2b866', '#c97c36']),
  palm: (p, x, y) => { p(x - 3, y, 7, 2, SHADOW); p(x, y - 6, 1, 7, '#8a6a42'); p(x - 4, y - 7, 9, 1, '#6aa861'); p(x - 3, y - 8, 3, 1, '#86c07a'); p(x + 1, y - 8, 3, 1, '#86c07a'); p(x - 4, y - 6, 2, 1, '#538c4d'); p(x + 3, y - 6, 2, 1, '#538c4d'); },
  rock: (p, x, y) => { p(x - 2, y, 5, 1, SHADOW); p(x - 2, y - 2, 5, 3, '#a9aab2'); p(x - 1, y - 3, 3, 1, '#a9aab2'); p(x - 1, y - 2, 2, 1, '#cfd0d6'); p(x + 1, y, 2, 1, '#8b8c95'); },
  boulder: (p, x, y) => { p(x - 4, y, 9, 2, SHADOW); p(x - 4, y - 4, 9, 5, '#9d9ea8'); p(x - 3, y - 6, 7, 2, '#9d9ea8'); p(x - 2, y - 7, 4, 1, '#9d9ea8'); p(x - 3, y - 5, 3, 2, '#c5c6ce'); p(x + 2, y - 2, 3, 3, '#7f808a'); },
  tuft: (p, x, y, r) => { const c = r() < 0.5 ? 'rgba(60, 110, 60, .35)' : 'rgba(255, 255, 255, .3)'; p(x, y - 1, 1, 2, c); p(x + 2, y, 1, 1, c); p(x - 2, y, 1, 1, c); },
  flowers: (p, x, y, r) => { const cs = ['#ffffff', '#ffd84a', '#ff9ec4', '#b79bff']; for (let i = 0; i < 4; i++) p(x + Math.round(r() * 8 - 4), y - Math.round(r() * 4), 1, 1, cs[Math.floor(r() * cs.length)]); },
  reeds: (p, x, y) => { p(x, y - 4, 1, 5, '#6f9a58'); p(x + 2, y - 3, 1, 4, '#6f9a58'); p(x, y - 5, 1, 1, '#8a6a42'); p(x + 2, y - 4, 1, 1, '#8a6a42'); },
  pond: (p, x, y) => { const w = [6, 10, 12, 13, 12, 10, 6]; w.forEach((ww, i) => p(x - Math.floor(ww / 2), y - 6 + i, ww, 1, '#8fc4dc')); p(x - 3, y - 5, 5, 1, '#b7dcec'); p(x - 5, y - 3, 2, 1, '#b7dcec'); p(x + 2, y - 2, 2, 1, '#6aa861'); p(x + 3, y - 2, 1, 1, '#ff9ec4'); },
  mushroom: (p, x, y) => { p(x, y - 2, 1, 3, '#f3ead8'); p(x - 2, y - 4, 5, 2, '#e77fa8'); p(x - 1, y - 5, 3, 1, '#e77fa8'); p(x - 1, y - 4, 1, 1, '#ffffff'); p(x + 1, y - 5, 1, 1, '#ffffff'); },
  bigshroom: (p, x, y) => { p(x - 4, y, 9, 2, SHADOW); p(x - 1, y - 5, 3, 6, '#f3ead8'); p(x - 5, y - 8, 11, 3, '#c98be0'); p(x - 4, y - 10, 9, 2, '#c98be0'); p(x - 2, y - 11, 5, 1, '#c98be0'); p(x - 3, y - 9, 2, 2, '#ffffff'); p(x + 2, y - 10, 1, 1, '#ffffff'); p(x + 1, y - 7, 2, 1, '#ffffff'); p(x + 3, y - 6, 3, 1, '#a66cc0'); },
  crystal: (p, x, y, r) => { const c = [['#9be3e0', '#d6f7f5', '#6fbcc0'], ['#c9a8f0', '#e8d9fb', '#a482d0'], ['#f5b6cf', '#fde0ea', '#d78fae']][Math.floor(r() * 3)]; p(x - 2, y, 5, 1, SHADOW); p(x - 1, y - 6, 3, 7, c[0]); p(x, y - 8, 1, 2, c[0]); p(x - 1, y - 6, 1, 5, c[1]); p(x + 1, y - 4, 1, 4, c[2]); p(x + 3, y - 3, 2, 4, c[0]); p(x + 3, y - 3, 1, 3, c[1]); },
  cactus: (p, x, y) => { p(x - 2, y, 5, 1, SHADOW); p(x, y - 7, 2, 8, '#6fa765'); p(x - 2, y - 5, 2, 1, '#6fa765'); p(x - 2, y - 6, 1, 2, '#6fa765'); p(x + 2, y - 4, 2, 1, '#6fa765'); p(x + 3, y - 6, 1, 3, '#6fa765'); p(x, y - 7, 1, 6, '#8cc282'); },
  dune: (p, x, y) => { p(x - 5, y, 11, 1, 'rgba(180, 150, 90, .35)'); p(x - 3, y - 1, 6, 1, 'rgba(255, 250, 225, .5)'); },
  pumpkin: (p, x, y) => { p(x - 2, y - 3, 5, 4, '#e8873a'); p(x - 1, y - 4, 3, 1, '#e8873a'); p(x - 1, y - 3, 1, 3, '#f5a85c'); p(x, y - 5, 1, 1, '#5d8a4a'); },
  snowman: (p, x, y) => { p(x - 2, y, 5, 1, SHADOW); p(x - 2, y - 3, 5, 4, '#ffffff'); p(x - 1, y - 6, 3, 3, '#ffffff'); p(x - 1, y - 5, 1, 1, '#2b2350'); p(x + 1, y - 5, 1, 1, '#2b2350'); p(x, y - 4, 2, 1, '#f08a3c'); p(x - 1, y - 7, 3, 1, '#c8433a'); },
  peak: (p, x, y) => { for (let r = 0; r < 12; r++) { const snowy = r < 4; p(x - r, y - 12 + r, r + 1, 1, snowy ? '#ffffff' : '#b4b8c4'); p(x + 1, y - 12 + r, r, 1, snowy ? '#e3ebf2' : '#8f93a2'); } p(x - 2, y - 8, 2, 1, '#ffffff'); p(x + 2, y - 8, 2, 1, '#e3ebf2'); p(x - 12, y, 25, 1, SHADOW); },
  pyramid: (p, x, y) => { for (let r = 0; r < 11; r++) { p(x - r, y - 11 + r, r + 1, 1, '#f0c871'); p(x + 1, y - 11 + r, r, 1, '#d49f4c'); } p(x - 11, y, 23, 1, SHADOW); p(x - 1, y - 2, 2, 2, '#8a6a3a'); },
  cabin: (p, x, y) => { p(x - 5, y, 11, 2, SHADOW); p(x - 4, y - 4, 9, 5, '#b98a5c'); p(x - 5, y - 7, 11, 3, '#c8554a'); p(x - 4, y - 8, 9, 1, '#c8554a'); p(x - 5, y - 5, 11, 1, '#a8443c'); p(x - 1, y - 3, 2, 4, '#6b4a2b'); p(x + 2, y - 3, 2, 2, '#ffe9a8'); },
  tent: (p, x, y, r, c = '#d9574a') => { p(x - 6, y, 13, 2, SHADOW); for (let k = 0; k < 7; k++) p(x - k, y - 7 + k, 2 * k + 1, 1, k % 2 ? '#fff6e6' : c); p(x, y - 3, 1, 4, '#5c3a2a'); p(x, y - 9, 1, 2, '#7a5a3a'); p(x + 1, y - 9, 2, 1, '#ffd84a'); },
  fire: (p, x, y) => { p(x - 2, y, 5, 1, '#6b4a2b'); p(x - 1, y - 1, 3, 1, '#8a5a34'); p(x - 1, y - 3, 3, 2, '#f08a3c'); p(x, y - 5, 1, 2, '#f08a3c'); p(x, y - 3, 1, 2, '#ffd84a'); },
  flag: (p, x, y) => { p(x, y - 12, 1, 13, '#ffffff'); p(x + 1, y - 12, 6, 2, '#ffd23f'); p(x + 1, y - 10, 4, 2, '#ffd23f'); p(x - 1, y, 3, 1, SHADOW); },
  sign: (p, x, y) => { p(x, y - 4, 1, 5, '#7a5a3a'); p(x - 3, y - 7, 7, 3, '#c79a63'); p(x - 2, y - 6, 5, 1, '#8a6a42'); },
  bridge: (p, x, y) => { p(x - 5, y - 3, 11, 7, '#b98a5c'); for (let k = -5; k <= 5; k += 2) p(x + k, y - 3, 1, 7, '#9a7046'); p(x - 5, y - 4, 11, 1, '#7a5a3a'); p(x - 5, y + 4, 11, 1, '#7a5a3a'); },
};
// How much room each thing needs: [half width, height above its base, depth below], in art pixels.
const ROOM = { peak: [13, 13, 1], pyramid: [12, 12, 1], pond: [8, 7, 1], bigshroom: [6, 12, 2], boulder: [5, 8, 2], cabin: [6, 9, 2], oak: [5, 10, 2], maple: [5, 10, 2], tent: [7, 10, 2] };
const roomFor = (kind) => ROOM[kind] || [4, 9, 1];
// Ground cover: flat, small, and allowed right up to the edge of a trail.
const LOOSE = new Set(['tuft', 'flowers', 'dune']);

/**
 * Plan the picture with no drawing, so tests can check nothing lands under a stop or a trail.
 *   stops:  [{ x, y }] in page pixels
 *   trails: lists of points along each trail, in page pixels
 *   stages: [{ x0, x1 }] in page pixels, in trail order
 *   terraces: [{ x0, x1, y0, y1, level }] in page pixels: raised land (level above 0) or sunken (below)
 * Returns { w, h, landAt(ax), blocked(ax, ay), things: [{ kind, x, y }] } in art pixels.
 */
export function planOverworld({ width, height, stops, trails, stages, terraces = [], avoid = [], signs = true, seed = 2026 }) {
  const w = Math.ceil(width / ART);
  const h = Math.ceil(height / ART);
  const random = makeRandom(seed);
  // Two masks. `mask` keeps anything with height away from where characters stand. `hard` is only
  // the stops, labels, trails, and signs themselves, so flowers and grass can still fill the gaps.
  const mask = new Uint8Array(w * h);
  const hard = new Uint8Array(w * h);
  const fill = (grid, x0, y0, x1, y1) => { for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(w - 1, Math.ceil(x1)); x++) grid[y * w + x] = 1; };
  const block = (x0, y0, x1, y1) => fill(mask, x0, y0, x1, y1);
  for (const s of stops) {
    block((s.x - 50) / ART, (s.y - 80) / ART, (s.x + 50) / ART, (s.y + 38) / ART);
    fill(hard, (s.x - 24) / ART, (s.y - 24) / ART, (s.x + 24) / ART, (s.y + 24) / ART);
    fill(hard, (s.x - 54) / ART, (s.y + 22) / ART, (s.x + 54) / ART, (s.y + 38) / ART);
  }
  for (const line of trails) for (const pt of line) { block((pt.x - 13) / ART, (pt.y - 13) / ART, (pt.x + 13) / ART, (pt.y + 13) / ART); fill(hard, (pt.x - 9) / ART, (pt.y - 9) / ART, (pt.x + 9) / ART, (pt.y + 9) / ART); }
  if (signs) { block(0, 0, w, 46 / ART); fill(hard, 0, 0, w, 46 / ART); }
  // Any other strips to keep clear, such as the edges of 3D terraces.
  for (const a of avoid) { block(a.x0 / ART, a.y0 / ART, a.x1 / ART, a.y1 / ART); fill(hard, a.x0 / ART, a.y0 / ART, a.x1 / ART, a.y1 / ART); }
  // Nothing grows on a cliff face or across the edge of a terrace.
  const steps = terraces.map((t) => terraceShape(t));
  for (const t of steps) {
    for (const grid of [mask, hard]) {
      fill(grid, t.x0 - 2, t.wall0 - 1, t.x1 + 2, t.wall1 + 2);
      fill(grid, t.x0 - 2, t.y0 - 1, t.x0 + 2, t.y1 + 1);
      fill(grid, t.x1 - 2, t.y0 - 1, t.x1 + 2, t.y1 + 1);
      fill(grid, t.x0 - 2, (t.level > 0 ? t.y0 : t.y1) - 1, t.x1 + 2, (t.level > 0 ? t.y0 : t.y1) + 1);
    }
  }
  const blocked = (x, y, loose) => x < 0 || y < 0 || x >= w || y >= h || (loose ? hard : mask)[y * w + x] === 1;

  const edges = stages.map((s) => s.x0 / ART);
  const landAt = (ax) => { let i = 0; while (i + 1 < edges.length && ax >= edges[i + 1]) i++; return landFor(i); };

  const things = [];
  const fits = (kind, x, y, loose) => {
    const [half, up, down] = loose ? [5, 5, 1] : roomFor(kind);
    for (let yy = y - up; yy <= y + down; yy += 2) for (let xx = x - half; xx <= x + half; xx += 2) if (blocked(xx, yy, loose)) return false;
    return !blocked(x + half, y + down, loose) && !blocked(x - half, y - up, loose) && !blocked(x + half, y - up, loose) && !blocked(x - half, y + down, loose);
  };
  const put = (kind, x, y, loose) => {
    if (!fits(kind, x, y, loose)) return false;
    things.push({ kind, x, y });
    // Small ground cover can sit close together. Anything with height keeps its own patch.
    if (!loose) { const [half, up, down] = roomFor(kind); block(x - half - 1, y - Math.min(up, 5), x + half + 1, y + down + 1); }
    return true;
  };

  // A few set pieces first, so every map has them: a camp at the start and a flag at the summit.
  const tryNear = (kind, cx, cy, spread = 30) => { for (let k = 0; k < 60; k++) if (put(kind, Math.round(cx + (random() - 0.5) * spread * 2), Math.round(cy + (random() - 0.5) * spread))) return true; return false; };
  if (stops.length) {
    const first = stops[0];
    tryNear('tent', first.x / ART + 26, first.y / ART - 34, 16);
    tryNear('tent', first.x / ART + 48, first.y / ART + 34, 18);
    tryNear('fire', first.x / ART + 36, first.y / ART + 36, 12);
    tryNear('sign', first.x / ART - 14, first.y / ART + 30, 8);
  }
  const summit = stages[6] || stages[stages.length - 1];
  if (summit) tryNear('flag', (summit.x0 + summit.x1) / 2 / ART, h * 0.3, 24);

  stages.forEach((st, i) => {
    const land = LANDS[landFor(i)];
    const total = land.things.reduce((a, [, n]) => a + n, 0);
    const x0 = st.x0 / ART;
    const span = (st.x1 - st.x0) / ART;
    const tries = Math.round((span * h) / 95 * land.crowd);
    for (let k = 0; k < tries; k++) {
      let roll = random() * total;
      let kind = land.things[0][0];
      for (const [name, n] of land.things) { roll -= n; if (roll <= 0) { kind = name; break; } }
      put(kind, Math.round(x0 + random() * span), Math.round(18 + random() * (h - 22)), LOOSE.has(kind));
    }
  });
  // Lower things are drawn later, so they overlap the ones behind them.
  things.sort((a, b) => a.y - b.y);
  return { w, h, landAt, blocked, things, loose: LOOSE, terraces: steps };
}

const TIER = 4; // art pixels of cliff for each level of height

/**
 * A terrace in art pixels. Raised land shows its cliff along the bottom edge, because the map is
 * seen from a little to the south. Sunken land shows the wall along its top edge for the same reason.
 * wall0 to wall1 is that band; y0 to y1 is the flat part you could stand on.
 */
export function terraceShape(t) {
  const x0 = Math.round(t.x0 / ART);
  const x1 = Math.round(t.x1 / ART);
  const y0 = Math.round(t.y0 / ART);
  const y1 = Math.round(t.y1 / ART);
  const tall = Math.abs(t.level) * TIER;
  return t.level > 0
    ? { level: t.level, x0, x1, y0, y1, wall0: y1, wall1: y1 + tall }
    : { level: t.level, x0, x1, y0: y0 + tall, y1, wall0: y0, wall1: y0 + tall };
}

/** A colour made lighter (above 1) or darker (below 1). */
function shade(hex, by) {
  const n = parseInt(hex.slice(1), 16);
  const part = (v) => Math.max(0, Math.min(255, Math.round(v * by)));
  return `rgb(${part(n >> 16)}, ${part((n >> 8) & 255)}, ${part(n & 255)})`;
}

let cache = { key: '', url: '' };
/** The finished picture as an image address. Drawn once, then reused. */
export function overworldArt(opts) {
  const key = `${opts.width}x${opts.height}:${opts.stops.length}:${opts.stages.length}:${(opts.terraces || []).length}`;
  if (cache.key === key) return cache.url;
  const plan = planOverworld(opts);
  const { w, h } = plan;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  const p = (x, y, ww, hh, color) => { g.fillStyle = color; g.fillRect(x, y, ww, hh); };
  const random = makeRandom(99);
  const edges = opts.stages.map((s) => s.x0 / ART);
  // Ground: each land's colour, with the edge between two lands broken up so there is no hard line.
  for (let x = 0; x < w; x++) {
    let i = 0;
    while (i + 1 < edges.length && x >= edges[i + 1]) i++;
    const near = i + 1 < edges.length ? edges[i + 1] - x : 999;
    const wide = 26;
    for (let y = 0; y < h; y++) {
      const other = near < wide && random() < ((wide - near) / wide) ** 2 * 0.5;
      const land = LANDS[landFor(other ? i + 1 : i)];
      const roll = random();
      p(x, y, 1, 1, roll < 0.06 ? land.ground[1] : roll < 0.11 ? land.ground[2] : land.ground[0]);
    }
  }
  // Soft, wide patches of lighter and darker ground, so it doesn't look like a flat sheet.
  for (let k = 0; k < Math.round(w / 9); k++) {
    const cx = random() * w;
    const cy = random() * h;
    const rx = 10 + random() * 22;
    const ry = 5 + random() * 9;
    g.fillStyle = random() < 0.5 ? 'rgba(255, 255, 255, .07)' : 'rgba(40, 70, 40, .05)';
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.3); g.fill();
  }
  // Height. High roads run along raised mesas, and low roads through sunken canyons, so a fork
  // reads as terraces stepping down the map.
  // Cliffs are stone whatever grows on top, tinted a little toward the land they stand in.
  const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16); const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k); return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`; };
  for (const t of plan.terraces) {
    const base = LANDS[plan.landAt((t.x0 + t.x1) / 2)].ground[0];
    const stone = mix('#9b8e7d', base, 0.25);
    const wide = t.x1 - t.x0;
    const tall = t.wall1 - t.wall0;
    // A slow wobble along the edge, so no cliff is a ruled line, and rounded ends.
    const wobble = (x) => Math.round(Math.sin(x * 0.31 + t.y0) * 0.8 + Math.sin(x * 0.13 + t.x0) * 0.9);
    const round = (dx) => (dx < 3 ? 3 - dx : 0);
    for (let x = t.x0; x < t.x1; x++) {
      const end = round(Math.min(x - t.x0, t.x1 - 1 - x));
      const o = wobble(x);
      const light = (x + t.y0) % 7 < 4;
      if (t.level > 0) {
        const top = t.y0 + end;
        const lip = t.y1 + o - end;
        p(x, top, 1, lip - top, shade(base, 1.07));
        p(x, top - 1, 1, 1, shade(base, 0.88));
        p(x, lip - 1, 1, 1, shade(base, 1.2));
        p(x, lip, 1, tall, shade(stone, light ? 1 : 0.9));
        p(x, lip, 1, 1, shade(stone, 1.18));
        p(x, lip + tall - 1, 1, 1, shade(stone, 0.72));
        p(x, lip + tall, 1, 2, 'rgba(30, 40, 30, .2)');
      } else {
        const rim = t.wall0 + o + end;
        const floor = rim + tall;
        p(x, rim - 1, 1, 1, shade(base, 1.18));
        p(x, rim, 1, tall, shade(stone, light ? 0.92 : 0.82));
        p(x, rim + tall - 1, 1, 1, shade(stone, 0.66));
        p(x, floor, 1, t.y1 - end - floor, shade(base, 0.88));
        p(x, floor, 1, 2, 'rgba(20, 30, 20, .22)');
        p(x, t.y1 - end, 1, 1, shade(base, 1.12));
      }
    }
    // Cracks down the stone, and the dark edge of each side.
    for (let x = t.x0 + 2; x < t.x1 - 2; x += 3 + Math.floor(random() * 4)) {
      const o = wobble(x);
      const from = (t.level > 0 ? t.y1 : t.wall0) + o + 1 + Math.floor(random() * 2);
      p(x, from, 1, Math.max(1, tall - 2 - Math.floor(random() * 2)), shade(stone, 0.7));
    }
    const sideTop = t.level > 0 ? t.y0 + 3 : t.wall0 + 3;
    const sideEnd = t.level > 0 ? t.wall1 - 2 : t.y1 - 3;
    p(t.x0 - 1, sideTop, 1, sideEnd - sideTop, shade(stone, 0.75));
    p(t.x1, sideTop, 1, sideEnd - sideTop, shade(stone, 0.75));
    // Speckle on the flat part, and grass that hangs over a mesa's edge.
    const flat0 = t.level > 0 ? t.y0 + 3 : t.wall1 + 3;
    const flat1 = t.level > 0 ? t.y1 - 3 : t.y1 - 3;
    for (let k = 0; k < wide * 0.6; k++) p(t.x0 + 2 + Math.floor(random() * (wide - 4)), flat0 + Math.floor(random() * Math.max(1, flat1 - flat0)), 1, 1, shade(base, t.level > 0 ? (random() < 0.5 ? 1.14 : 1) : (random() < 0.5 ? 0.94 : 0.82)));
    if (t.level > 0) for (let x = t.x0 + 3; x < t.x1 - 3; x += 2 + Math.floor(random() * 5)) p(x, t.y1 + wobble(x), 1, 1 + Math.floor(random() * 2), shade(base, 1.02));
  }
  for (const t of plan.things) SPRITES[t.kind](p, t.x, t.y, random);
  cache = { key, url: canvas.toDataURL('image/png') };
  return cache.url;
}

// For the 3D map ------------------------------------------------------------------------------------
// There the ground is a flat picture laid over real terrain, and anything with height stands up in
// it as a sprite. So the two are handed over separately.

/** Things that lie flat and belong in the ground picture. Everything else stands up. */
export const FLAT = new Set(['tuft', 'flowers', 'dune', 'pond']);
/** Mountains and pyramids are made of terrain in 3D, not drawn. */
export const SHAPED = new Set(['peak', 'pyramid']);

/** The ground alone: land colours, soft patches, and flat things. Returns { canvas, plan }. */
export function paintGround(opts) {
  const plan = planOverworld(opts);
  const canvas = document.createElement('canvas');
  canvas.width = plan.w;
  canvas.height = plan.h;
  const g = canvas.getContext('2d');
  const p = (x, y, ww, hh, color) => { g.fillStyle = color; g.fillRect(x, y, ww, hh); };
  const random = makeRandom(99);
  const edges = opts.stages.map((st) => st.x0 / ART);
  for (let x = 0; x < plan.w; x++) {
    let i = 0;
    while (i + 1 < edges.length && x >= edges[i + 1]) i++;
    const near = i + 1 < edges.length ? edges[i + 1] - x : 999;
    for (let y = 0; y < plan.h; y++) {
      const other = near < 26 && random() < ((26 - near) / 26) ** 2 * 0.5;
      const land = LANDS[landFor(other ? i + 1 : i)];
      const roll = random();
      p(x, y, 1, 1, roll < 0.06 ? land.ground[1] : roll < 0.11 ? land.ground[2] : land.ground[0]);
    }
  }
  for (let k = 0; k < Math.round(plan.w / 6); k++) {
    g.fillStyle = random() < 0.5 ? 'rgba(255, 255, 255, .07)' : 'rgba(40, 70, 40, .05)';
    g.beginPath(); g.ellipse(random() * plan.w, random() * plan.h, 10 + random() * 22, 5 + random() * 9, 0, 0, 6.3); g.fill();
  }
  for (const t of plan.things) if (FLAT.has(t.kind)) SPRITES[t.kind](p, t.x, t.y, random);
  return { canvas, plan };
}

const SPRITE_W = 40;
const SPRITE_H = 32;
const pixelCache = new Map();
/** One standing thing as raw pixels, with (ox, oy) the point that touches the ground. */
export function spritePixels(kind, variant = 0) {
  const key = `${kind}:${variant}`;
  if (pixelCache.has(key)) return pixelCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const g = canvas.getContext('2d');
  const p = (x, y, ww, hh, color) => { g.fillStyle = color; g.fillRect(x, y, ww, hh); };
  SPRITES[kind](p, SPRITE_W / 2, SPRITE_H - 4, makeRandom(7 + variant * 31));
  const out = { w: SPRITE_W, h: SPRITE_H, ox: SPRITE_W / 2, oy: SPRITE_H - 4, data: new Uint32Array(g.getImageData(0, 0, SPRITE_W, SPRITE_H).data.buffer) };
  pixelCache.set(key, out);
  return out;
}
/** Ground colours for a land, for things the 3D map colours itself. */
export const groundOf = (land) => LANDS[land].ground;
