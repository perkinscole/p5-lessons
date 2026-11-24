// The class display's race as a little block world seen at an angle, the way the journey map is:
// a trail runs away to the right across one stretch of land for each step of the lesson, and the
// students stand on the stretch they have reached. The land is different from day to day: its
// shape (SHAPES: level, rolling, a climb, a ridge) and its country (LANDS) come from a seed, because
// the teacher did not want a mountain every time.
//
// This file has no page code. planRace() decides where everything stands and how big it can be,
// and is tested. paintRace() paints the land on a canvas. The page then puts the characters,
// names and signs over the picture as ordinary elements, at the places the plan gives, so they
// stay sharp and are never hidden behind a hill.
//
// The world is measured in "heights": 1 is how tall a character is. x runs along the trail,
// z runs back away from the viewer, and y is up.

const PITCH = 0.66; // how far the camera looks down, in radians (about 38 degrees)
const YAWS = [0.42, 0.6, 0.78]; // how far it may be turned to look along the trail; the one that shows the students largest is used
const BLOCK = 0.5; // one block of land, in character heights
const ROW = 1.45; // how far apart rows of students stand, front to back: close enough to be a crowd, far enough that every name and face shows
const BIG = 1.2; // characters are drawn this much larger than the land's own scale, so they read from the back of the room
const EMPTY = 1.15; // how wide a terrace with nobody on it is: room for its sign

const hash = (x, y, k = 7) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(k | 0, 1274126177)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lit = (c, f) => c.map((v) => v * f);
const css = (c, a = 1) => (a >= 1 ? `rgb(${clamp(c[0])},${clamp(c[1])},${clamp(c[2])})` : `rgba(${clamp(c[0])},${clamp(c[1])},${clamp(c[2])},${a})`);

/** A step's colour as red, green, blue, so it can be mixed into the grass and the trail. */
export function hueColor(h, s = 0.6, l = 0.55) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** How wide a student's place must be for their name: as wide as its longest word. */
const placeWidth = (names) => Math.max(1.25, ...names.map((n) => 0.36 + 0.162 * Math.max(...String(n).split(/\s+/).map((w) => w.length))));

export const SHAPES = ['level', 'rolling', 'climb', 'ridge', 'steps'];
export const LANDS = ['meadow', 'autumn', 'snow', 'desert'];

/**
 * How high each stretch of the trail stands, in whole blocks, for a seed. 'level' is a walk across
 * flat country, 'rolling' goes up and down, 'climb' is a staircase to the finish, 'ridge' goes over
 * a hill and down again, and 'steps' climbs a little at a time with level stretches between.
 */
export function shapeFor(count, seed = 1) {
  const shape = SHAPES[Math.floor(hash(seed, 3, 91) * SHAPES.length) % SHAPES.length];
  const last = Math.max(1, count - 1);
  const blocks = Array.from({ length: count }, (_, i) => {
    if (shape === 'level') return 1;
    if (shape === 'climb') return 2 + i;
    if (shape === 'steps') return 1 + Math.floor((i + (seed & 1)) / 2);
    if (shape === 'ridge') { const peak = 0.35 + hash(seed, 5, 91) * 0.3; const at = i / last; return 1 + Math.round(4 * (at < peak ? at / peak : (1 - at) / (1 - peak))); }
    return 1 + Math.round(hash(seed, i, 92) * 3);
  });
  return { shape, tops: blocks.map((b) => b * BLOCK) };
}

/** The terraces and where each student stands, with `rows` rows of students on a terrace. */
function arrange(stops, rows, tops, wind) {
  const depth = 1.1 + rows * ROW;
  let x = 0;
  const terraces = stops.map((names, i) => {
    const cols = Math.max(1, Math.ceil(names.length / rows));
    const place = placeWidth(names);
    // A second row stands half a place to the side, so faces show between the heads in front.
    const used = Math.min(rows, Math.ceil(names.length / cols));
    const width = names.length ? cols * place + (used > 1 ? place * 0.5 : 0) + 0.3 : EMPTY;
    const t = { i, x0: x, x1: x + width, top: tops[i], cols, place, count: names.length };
    x += width;
    return t;
  });
  const slots = terraces.map((t) => Array.from({ length: t.count }, (_, j) => {
    const row = Math.floor(j / t.cols);
    const col = j % t.cols;
    const x = t.x0 + 0.15 + (col + 0.5 + (row % 2 ? 0.5 : 0)) * t.place;
    return { stop: t.i, row, x, y: t.top, z: 0.85 + row * ROW + wind(x), wide: t.place };
  }));
  return { terraces, slots, width: x, depth, rows };
}

const smooth = (t) => t * t * (3 - 2 * t);
const noise = (x, z, k) => {
  const xi = Math.floor(x); const zi = Math.floor(z);
  const tx = smooth(x - xi); const tz = smooth(z - zi);
  const a = hash(xi, zi, k); const b = hash(xi + 1, zi, k); const c = hash(xi, zi + 1, k); const d = hash(xi + 1, zi + 1, k);
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
};
// How hilly each country is away from the trail.
const ROUGH = { meadow: 1, autumn: 1.1, snow: 1, desert: 0.7 };

/**
 * The land itself, as the journey map has it: every block of ground has one height, a whole number
 * of blocks. Where the students stand (the "pad", which winds with the trail) each stretch is level
 * at its own height. Away from it the ground rolls, higher behind the trail and never higher than
 * the trail in front of it, so no hill stands between the class and the room. Ground at height 0
 * is water. Returns { wind(x), where(x, z), height(x, z) }.
 */
function landFor(world, tops, seed, land, wind) {
  const { terraces, width, depth } = world;
  const rough = ROUGH[land] || 1;
  const padTop = (x) => {
    const t = terraces.find((q) => x < q.x1) || terraces[terraces.length - 1];
    const next = terraces[t.i + 1];
    const prev = terraces[t.i - 1];
    // One block of ramp beside a wall more than one block high, on the lower side.
    if (next && next.top - t.top > BLOCK && x > t.x1 - BLOCK) return t.top + Math.ceil((next.top - t.top) / 2 / BLOCK) * BLOCK;
    if (prev && prev.top - t.top > BLOCK && x < t.x0 + BLOCK) return t.top + Math.ceil((prev.top - t.top) / 2 / BLOCK) * BLOCK;
    return t.top;
  };
  const where = (x, z) => {
    const zr = z - wind(x);
    const dz = zr < 0 ? -zr : zr > depth ? zr - depth : 0;
    const dx = x < 0 ? -x : x > width ? x - width : 0;
    const t = terraces.find((q) => x < q.x1) || terraces[terraces.length - 1];
    return { zr, dz, dx, pad: dz === 0 && dx === 0, stop: x < 0 ? 0 : t.i, road: dz === 0 && zr > 0.2 && zr < 1.5 };
  };
  const height = (x, z) => {
    const w = where(x, z);
    const base = padTop(Math.max(0.01, Math.min(width - 0.01, x)));
    if (w.pad) return base;
    if (w.road) return Math.max(BLOCK, Math.round((base + (BLOCK - base) * smooth(Math.min(1, w.dx / 4))) / BLOCK) * BLOCK);
    const far = Math.hypot(w.dz, w.dx);
    const t = smooth(Math.max(0, Math.min(1, (far - 0.2) / 3.5)));
    const n = noise(x / 4.6, z / 4.6, seed + 11);
    const fine = noise(x / 1.7, z / 1.7, seed + 12);
    const wild = w.zr < 0
      ? (n * 2.1 + fine * 0.3 - 0.62) * rough
      : (n * 3.6 + fine * 0.4 - 0.7 + Math.min(2.2, w.dz * 0.13)) * rough;
    let h = base * (1 - t) + wild * t;
    if (w.zr < 0) h = Math.min(h, base);
    return Math.max(0, Math.round(h / BLOCK) * BLOCK);
  };
  return { wind, where, height };
}

/** A camera that looks down and along the trail. Returns where a point of the world lands, before it is fitted to the panel. */
function cameraFor(world, yaw) {
  const cx = world.width / 2;
  const cz = world.depth / 2;
  const focal = Math.max(18, world.width * 1.7);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(PITCH);
  const sinP = Math.sin(PITCH);
  return (x, y, z) => {
    const xc = (x - cx) * cosY - (z - cz) * sinY;
    const zc = (x - cx) * sinY + (z - cz) * cosY;
    const s = focal / (focal + zc * cosP - y * sinP);
    return { x: xc * s, y: -(y * cosP + zc * sinP) * s, s, far: zc * cosP - y * sinP };
  };
}

/**
 * Plan the race for a panel W by H pixels.
 *   stops: left to right, one list of student names for each stop (start, each step, finish).
 * Tries one to six rows of students on a terrace and keeps the plan that draws the characters
 * largest with everything inside the panel. Returns:
 *   { terraces, slots, width, depth, rows, size, shape, land, seed, project(x, y, z) -> { x, y, s, far } }
 * `seed` picks the day's land and the shape of the trail (see shapeFor).
 * `size` is a character's height in pixels at the middle of the world, and each slot has the
 * screen place of that student's feet (sx, sy) and their own height in pixels (h).
 */
export function planRace(stops, W, H, { maxSize = 190, margin = 10, sky = 0.06, seed = 1 } = {}) {
  const { shape, tops } = shapeFor(stops.length, seed);
  const land = LANDS[Math.floor(hash(seed, 7, 93) * LANDS.length) % LANDS.length];
  // The trail winds a little, differently each day.
  const sway = 0.35 + hash(seed, 8, 94) * 0.6;
  const beat = 9 + hash(seed, 9, 94) * 8;
  const turn = hash(seed, 10, 94) * 6.283;
  const wind = (x) => sway * Math.sin((x / beat) * 6.283 + turn) + sway * 0.35 * Math.sin((x / beat) * 15.1 + turn * 2);
  let best = null;
  for (const yaw of YAWS) for (let rows = 1; rows <= 6; rows++) {
    const world = arrange(stops, rows, tops, wind);
    const cam = cameraFor(world, yaw);
    // Everything that must be inside the panel: the corners of the land, and each student with
    // their name and room above for a raised hand.
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const see = (p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); };
    for (const t of world.terraces) {
      for (const x of [t.x0, t.x1]) for (const z of [wind(x) - 0.2, wind(x) + world.depth]) { see(cam(x, 0, z)); see(cam(x, t.top, z)); }
    }
    for (const s of world.slots.flat()) {
      const p = cam(s.x, s.y, s.z);
      see({ x: p.x - s.wide * 0.5 * p.s * BIG, y: p.y - 2.25 * p.s * BIG });
      see({ x: p.x + s.wide * 0.5 * p.s * BIG, y: p.y });
    }
    const room = H * (1 - sky) - margin * 2;
    const k = Math.min((W - margin * 2) / (x1 - x0), room / (y1 - y0), maxSize);
    // A plan has to be clearly better to replace one with fewer rows, so students stand side by
    // side where they can.
    if (best && k <= best.k * 1.04) continue;
    const ox = margin + (W - margin * 2 - (x1 - x0) * k) / 2 - x0 * k;
    const oy = H - margin - y1 * k;
    best = { world, cam, k, ox, oy };
  }
  const { world, cam, k, ox, oy } = best;
  const project = (x, y, z) => { const p = cam(x, y, z); return { x: ox + p.x * k, y: oy + p.y * k, s: p.s * k, far: p.far }; };
  const ground = landFor(world, tops, seed, land, wind);
  // Each student stands on the ground as it is under their feet.
  const slots = world.slots.map((list) => list.map((s) => { const y = ground.height(s.x, s.z); const p = project(s.x, y, s.z); return { ...s, y, sx: p.x, sy: p.y, h: p.s * BIG, far: p.far }; }));
  // A stretch's sign hangs on the front of its ground, in the middle.
  const terraces = world.terraces.map((t) => { const x = (t.x0 + t.x1) / 2; return { ...t, sign: { x, y: Math.max(0.2, t.top - 0.3), z: wind(x) - 0.15 } }; });
  return { ...world, terraces, slots, size: k, project, shape, land, seed, ...ground };
}

const DAY = {
  skyTop: [86, 160, 232], skyLow: [204, 236, 255], sun: [255, 226, 120], cloud: [255, 255, 255], far: [142, 164, 204], near: [108, 134, 178], snow: [244, 248, 255],
  ground: [96, 168, 72], grassA: [112, 186, 80], grassB: [98, 172, 70], dirt: [146, 100, 62], stone: [126, 126, 136], cobble: [188, 180, 166],
  leaf: [52, 128, 62], leafLight: [80, 158, 78], trunk: [104, 72, 46], wall: [170, 168, 178],
};
const NIGHT = {
  skyTop: [18, 20, 54], skyLow: [58, 56, 112], sun: [232, 236, 255], cloud: [84, 88, 140], far: [54, 60, 104], near: [40, 46, 86], snow: [170, 180, 220],
  ground: [36, 82, 60], grassA: [46, 100, 72], grassB: [40, 90, 64], dirt: [84, 62, 50], stone: [72, 74, 90], cobble: [110, 108, 126],
  leaf: [26, 70, 56], leafLight: [38, 90, 68], trunk: [58, 44, 38], wall: [98, 100, 124],
};

// What each country changes about the day's colours, and what grows and lies about in it.
const LOOKS = {
  meadow: { props: ['flower', 'flower', 'tuft', 'rock', 'bush'], trees: ['oak', 'oak', 'pine'], water: [78, 156, 226] },
  autumn: { ground: [156, 150, 70], grassA: [176, 164, 74], grassB: [160, 150, 66], leaf: [198, 96, 40], leafLight: [232, 150, 48], props: ['pumpkin', 'tuft', 'rock', 'mushroom', 'bush'], trees: ['oak', 'oak', 'oak', 'pine'], water: [86, 140, 196] },
  snow: { ground: [226, 234, 244], grassA: [240, 245, 252], grassB: [226, 234, 246], dirt: [128, 112, 104], leaf: [44, 104, 84], leafLight: [244, 248, 255], far: [170, 186, 220], near: [140, 158, 200], props: ['snowman', 'rock', 'ice', 'rock'], trees: ['pine', 'pine', 'pine', 'oak'], water: [176, 216, 240] },
  desert: { ground: [226, 196, 128], grassA: [236, 208, 140], grassB: [224, 194, 126], dirt: [188, 138, 84], stone: [170, 140, 110], far: [206, 150, 110], near: [186, 124, 92], props: ['rock', 'drybush', 'bone', 'rock', 'cactus'], trees: ['cactus', 'cactus', 'palm'], water: [70, 170, 200] },
};
const dusk = (c) => mix(lit(c, 0.52), [26, 34, 84], 0.22);

/**
 * Paint the land for a plan from planRace.
 *   look: for each stop, { hue } for a step, or { kind: 'start' | 'finish' }.
 *   plain: outlines only, for the high contrast theme.
 */
export function paintRace(g, plan, { W, H, look = [], night = false, plain = false } = {}) {
  const seed = plan.seed || 1;
  const LK = LOOKS[plan.land] || LOOKS.meadow;
  const P = { ...(night ? NIGHT : DAY) };
  for (const k of Object.keys(DAY)) if (LK[k]) P[k] = night ? dusk(LK[k]) : LK[k];
  const water = night ? dusk(LK.water) : LK.water;
  const { project, terraces, width, depth } = plan;
  g.clearRect(0, 0, W, H);
  const quad = (pts, fill, line) => {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (line) { g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
  };
  // Sky down to where the far ground ends, with a square sun or moon and block clouds.
  const farEdge = Math.min(project(-9, 0, depth + 16).y, project(width + 9, 0, depth + 16).y);
  const horizon = Math.max(8, Math.round(farEdge));
  const sky = g.createLinearGradient(0, 0, 0, horizon + 20);
  sky.addColorStop(0, css(P.skyTop));
  sky.addColorStop(1, css(P.skyLow));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const unit = Math.max(4, Math.round(plan.size * 0.2));
  g.fillStyle = css(P.sun);
  g.fillRect(Math.round(W * 0.1), Math.round(horizon * 0.12), unit * 3, unit * 3);
  if (night) for (let i = 0; i < 50; i++) { g.fillStyle = css([255, 255, 255], 0.35 + hash(i, 3, seed) * 0.6); g.fillRect(Math.round(hash(i, 1, seed) * W), Math.round(hash(i, 2, seed) * horizon), 2, 2); }
  for (let i = 0; i < 6; i++) {
    const cx = Math.round(hash(i, 11, seed) * W);
    const cy = Math.round(hash(i, 12, seed) * horizon * 0.55) + 4;
    g.fillStyle = css(P.cloud, night ? 0.5 : 0.92);
    g.fillRect(cx, cy + unit, unit * 6, unit);
    g.fillRect(cx + unit, cy, unit * 3, unit);
    g.fillRect(cx + unit * 3, cy + unit * 2, unit * 4, unit);
  }
  // Far mountains along the horizon, built from columns, the tall ones capped with snow.
  const ridge = (c, k, span) => { const at = c / span; const a = hash(Math.floor(at), k, seed); const b = hash(Math.floor(at) + 1, k, seed); const t = at - Math.floor(at); return a + (b - a) * t * t * (3 - 2 * t); };
  const col = Math.max(8, unit * 2);
  for (const [k, color, scale, span] of [[21, P.far, 1, 7], [22, P.near, 0.62, 5]]) {
    for (let x = 0, c = 0; x < W; x += col, c++) {
      const tall = Math.round((0.2 + 0.8 * ridge(c, k, span)) * Math.min(horizon * 0.9, plan.size * 2.2) * scale / (col / 2)) * (col / 2);
      g.fillStyle = css(lit(color, 0.94 + hash(c, k, 5) * 0.1));
      g.fillRect(x, horizon - tall, col + 1, tall + 2);
      if (ridge(c, k, span) > 0.7) { g.fillStyle = css(P.snow); g.fillRect(x, horizon - tall, col + 1, Math.max(3, col * 0.3)); }
    }
  }

  if (plain) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
  const grassOf = (i) => {
    const L = look[i] || {};
    const base = i % 2 ? P.grassB : P.grassA;
    if (L.kind === 'finish') return mix(base, [240, 200, 72], night ? 0.3 : 0.45);
    if (L.kind === 'start') return mix(base, P.stone, 0.32);
    return L.hue === undefined || L.hue === null ? base : mix(base, hueColor(L.hue, 0.62, night ? 0.36 : 0.56), 0.26);
  };
  const trailOf = (i) => {
    const L = look[i] || {};
    if (L.kind === 'finish') return night ? [190, 160, 70] : [248, 216, 98];
    if (L.kind === 'start') return P.cobble;
    return L.hue === undefined || L.hue === null ? P.cobble : mix(P.cobble, hueColor(L.hue, 0.72, night ? 0.45 : 0.6), 0.66);
  };

  // Trees and small things stand on the open ground, kept off the water and off the trail where it
  // runs on. Those behind the trail are painted before it.
  const R = (x, y, w, hh, c, a = 1) => { g.fillStyle = css(c, a); g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); };
  const things = [];
  const BLOOM = [[236, 84, 98], [250, 208, 70], [255, 255, 255], [170, 120, 236], [255, 150, 60]];
  const draw = (t) => {
    const p = project(t.x, t.y, t.z);
    const u = p.s * t.tall;
    if (p.y < -u || p.y > H + u * 2 || p.x < -u * 2 || p.x > W + u * 2) return;
    const x = p.x;
    const y = p.y;
    const shade = (w) => R(x - w * 0.5, y - u * 0.05, w * 1.15, u * 0.12, [0, 0, 0], 0.18);
    switch (t.kind) {
      case 'pine':
        shade(u * 1.2); R(x - u * 0.13, y - u * 0.75, u * 0.26, u * 0.75, P.trunk);
        for (let k = 0; k < 3; k++) { const w = u * (1.25 - k * 0.36); R(x - w / 2, y - u * (1.1 + k * 0.48), w, u * 0.52, k === 2 ? P.leafLight : P.leaf); if (plan.land === 'snow') R(x - w / 2, y - u * (1.1 + k * 0.48), w, u * 0.14, P.leafLight); }
        break;
      case 'oak':
        shade(u * 1.2); R(x - u * 0.13, y - u * 0.75, u * 0.26, u * 0.75, P.trunk);
        R(x - u * 0.62, y - u * 1.7, u * 1.24, u * 1.05, P.leaf); R(x - u * 0.62, y - u * 1.7, u * 1.24, u * 0.34, P.leafLight); R(x - u * 0.62, y - u * 1.7, u * 0.34, u * 1.05, P.leafLight);
        R(x + u * 0.1, y - u * 1.1, u * 0.3, u * 0.24, lit(P.leaf, 0.82));
        break;
      case 'cactus': {
        const c = night ? dusk([70, 150, 84]) : [70, 150, 84];
        shade(u * 0.7); R(x - u * 0.16, y - u * 1.3, u * 0.32, u * 1.3, c); R(x - u * 0.5, y - u * 0.95, u * 0.34, u * 0.16, c); R(x - u * 0.5, y - u * 1.15, u * 0.16, u * 0.36, c);
        R(x + u * 0.16, y - u * 0.7, u * 0.34, u * 0.16, c); R(x + u * 0.34, y - u * 1.0, u * 0.16, u * 0.46, c); R(x - u * 0.16, y - u * 1.3, u * 0.1, u * 1.3, lit(c, 1.25));
        break;
      }
      case 'palm': {
        const c = night ? dusk([66, 160, 90]) : [66, 160, 90];
        shade(u); R(x - u * 0.1, y - u * 1.5, u * 0.2, u * 1.5, P.trunk); R(x - u * 0.8, y - u * 1.7, u * 1.6, u * 0.22, c); R(x - u * 0.55, y - u * 1.9, u * 1.1, u * 0.22, lit(c, 1.15)); R(x - u * 0.8, y - u * 1.5, u * 0.22, u * 0.3, c); R(x + u * 0.58, y - u * 1.5, u * 0.22, u * 0.3, c);
        break;
      }
      case 'flower': { const c = BLOOM[Math.floor(t.tint * BLOOM.length)]; R(x - u * 0.03, y - u * 0.26, u * 0.06, u * 0.26, P.leaf); R(x - u * 0.11, y - u * 0.4, u * 0.22, u * 0.18, night ? dusk(c) : c); R(x - u * 0.04, y - u * 0.35, u * 0.08, u * 0.08, night ? dusk([255, 236, 150]) : [255, 236, 150]); break; }
      case 'tuft': R(x - u * 0.16, y - u * 0.16, u * 0.08, u * 0.16, lit(P.grassB, 0.78)); R(x - u * 0.03, y - u * 0.24, u * 0.08, u * 0.24, lit(P.grassB, 0.7)); R(x + u * 0.1, y - u * 0.14, u * 0.08, u * 0.14, lit(P.grassB, 0.78)); break;
      case 'rock': { const w = u * (0.3 + t.tint * 0.3); shade(w); R(x - w / 2, y - w * 0.62, w, w * 0.62, P.stone); R(x - w / 2, y - w * 0.62, w, w * 0.18, lit(P.stone, 1.28)); R(x + w * 0.2, y - w * 0.34, w * 0.3, w * 0.34, lit(P.stone, 0.8)); break; }
      case 'bush': shade(u * 0.6); R(x - u * 0.3, y - u * 0.4, u * 0.6, u * 0.4, P.leaf); R(x - u * 0.3, y - u * 0.4, u * 0.6, u * 0.13, P.leafLight); if (t.tint > 0.5) { R(x - u * 0.14, y - u * 0.24, u * 0.09, u * 0.09, [226, 60, 70]); R(x + u * 0.1, y - u * 0.16, u * 0.09, u * 0.09, [226, 60, 70]); } break;
      case 'drybush': R(x - u * 0.24, y - u * 0.3, u * 0.48, u * 0.3, lit(P.dirt, 0.82)); R(x - u * 0.24, y - u * 0.3, u * 0.48, u * 0.1, lit(P.dirt, 1.12)); break;
      case 'pumpkin': shade(u * 0.4); R(x - u * 0.2, y - u * 0.3, u * 0.4, u * 0.3, night ? dusk([232, 122, 36]) : [232, 122, 36]); R(x - u * 0.2, y - u * 0.3, u * 0.4, u * 0.09, night ? dusk([250, 160, 64]) : [250, 160, 64]); R(x - u * 0.04, y - u * 0.4, u * 0.08, u * 0.1, P.leaf); break;
      case 'mushroom': R(x - u * 0.05, y - u * 0.2, u * 0.1, u * 0.2, [240, 234, 220]); R(x - u * 0.17, y - u * 0.34, u * 0.34, u * 0.16, [214, 62, 62]); R(x - u * 0.09, y - u * 0.31, u * 0.07, u * 0.07, [255, 255, 255]); break;
      case 'snowman': shade(u * 0.5); R(x - u * 0.24, y - u * 0.42, u * 0.48, u * 0.42, [250, 252, 255]); R(x - u * 0.17, y - u * 0.74, u * 0.34, u * 0.32, [250, 252, 255]); R(x - u * 0.09, y - u * 0.64, u * 0.06, u * 0.06, [40, 40, 60]); R(x + u * 0.04, y - u * 0.64, u * 0.06, u * 0.06, [40, 40, 60]); R(x - u * 0.03, y - u * 0.56, u * 0.14, u * 0.05, [240, 130, 50]); R(x - u * 0.17, y - u * 0.44, u * 0.34, u * 0.06, [214, 62, 62]); break;
      case 'ice': R(x - u * 0.12, y - u * 0.5, u * 0.24, u * 0.5, [170, 216, 244]); R(x - u * 0.12, y - u * 0.5, u * 0.09, u * 0.5, [224, 244, 255]); R(x + u * 0.12, y - u * 0.26, u * 0.16, u * 0.26, [150, 200, 236]); break;
      case 'bone': R(x - u * 0.2, y - u * 0.08, u * 0.4, u * 0.07, [244, 240, 226]); R(x - u * 0.24, y - u * 0.13, u * 0.08, u * 0.16, [244, 240, 226]); R(x + u * 0.16, y - u * 0.13, u * 0.08, u * 0.16, [244, 240, 226]); break;
      case 'marker': {
        // A trail marker: a post with a banner in the step's own colour.
        shade(u * 0.4); R(x - u * 0.05, y - u * 1.5, u * 0.1, u * 1.5, P.trunk); R(x + u * 0.05, y - u * 1.5, u * 0.62, u * 0.42, t.color); R(x + u * 0.05, y - u * 1.5, u * 0.62, u * 0.12, lit(t.color, 1.2)); R(x + u * 0.42, y - u * 1.22, u * 0.25, u * 0.14, lit(t.color, 0.78));
        break;
      }
      case 'tower': {
        const v = u * 0.5;
        R(x - v * 1.3, y - v * 0.1, v * 2.8, v * 0.22, [0, 0, 0], 0.18);
        R(x - v * 1.1, y - v * 3.2, v * 2.2, v * 3.2, P.wall); R(x - v * 1.1, y - v * 3.2, v * 0.5, v * 3.2, lit(P.wall, 1.16));
        for (let k = 0; k < 3; k++) R(x - v * 1.3 + k * v * 0.95, y - v * 3.75, v * 0.62, v * 0.6, lit(P.wall, 1.16));
        R(x - v * 0.34, y - v * 1.3, v * 0.68, v * 1.3, [40, 34, 60]); R(x - v * 0.06, y - v * 5.6, v * 0.12, v * 1.9, [40, 34, 60]); R(x + v * 0.06, y - v * 5.6, v * 1.1, v * 0.7, [226, 70, 60]);
        break;
      }
      case 'tent': {
        const v = u * 0.5;
        R(x - v * 1.3, y - v * 0.1, v * 2.8, v * 0.22, [0, 0, 0], 0.18);
        for (let k = 0; k < 4; k++) { const w = v * (2.4 - k * 0.56); R(x - w / 2, y - v * (0.5 + k * 0.5), w, v * 0.5, k % 2 ? [236, 236, 228] : [222, 96, 72]); }
        R(x - v * 0.22, y - v * 0.8, v * 0.44, v * 0.8, [40, 34, 60]);
        break;
      }
      case 'fence': R(x - u * 0.05, y - u * 0.42, u * 0.1, u * 0.42, P.trunk); R(x - u * 0.05, y - u * 0.42, u * 0.1, u * 0.08, lit(P.trunk, 1.4)); break;
      default: break;
    }
  };

  // The land, as columns of blocks, the far ones first. Each column paints the side that faces
  // left and the side that faces the viewer, down to the ground beside it, and then its top.
  const C = BLOCK;
  const reach = 1.6;
  const X0 = -10; const X1 = width + 10; const Z0 = -9 - reach; const Z1 = depth + 17 + reach;
  const nx = Math.ceil((X1 - X0) / C); const nz = Math.ceil((Z1 - Z0) / C);
  const at = (ix, iz) => (ix < 0 || iz < 0 || ix >= nx || iz >= nz ? 0 : heights[ix * nz + iz]);
  const heights = new Float32Array(nx * nz);
  for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) heights[ix * nz + iz] = plan.height(X0 + (ix + 0.5) * C, Z0 + (iz + 0.5) * C);
  const WET = 0.28;
  const level = (v) => (v <= 0 ? WET : v);

  // What stands on the land: trees and small things in the open, a marker for each stretch, the
  // camp at the start and the tower at the end. Each is painted with its own block of ground, so
  // nearer hills hide it.
  const standing = new Map();
  const stand = (x, z, thing) => {
    const ix = Math.floor((x - X0) / C); const iz = Math.floor((z - Z0) / C);
    if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) return;
    const key = ix * nz + iz;
    if (!standing.has(key)) standing.set(key, []);
    standing.get(key).push({ x, z, y: at(ix, iz), ...thing });
  };
  for (let n = 0; n < 420; n++) {
    const x = X0 + hash(n, 1, seed + 40) * (X1 - X0);
    const z = Z0 + hash(n, 2, seed + 40) * (Z1 - Z0);
    const w = plan.where(x, z);
    const h = plan.height(x, z);
    if (w.pad || w.road || h <= 0) continue;
    // Nothing tall just in front of the trail, where it would stand over the students.
    const near = w.zr < 0 && w.dz < 3.6;
    const isTree = n % 4 === 0 && !near;
    stand(x, z, isTree ? { kind: LK.trees[Math.floor(hash(n, 3, seed + 40) * LK.trees.length)], tall: 0.85 + hash(n, 6, seed + 40) * 0.45 }
      : { kind: LK.props[Math.floor(hash(n, 3, seed + 44) * LK.props.length)], tall: 1, tint: hash(n, 8, seed + 44) });
  }
  terraces.forEach((t, i) => {
    const L = look[i] || {};
    const back = (x, off) => plan.wind(x) + depth - off;
    if (L.kind === 'finish') stand((t.x0 + t.x1) / 2, back((t.x0 + t.x1) / 2, 0.6), { kind: 'tower', tall: 1 });
    else if (L.kind === 'start') stand((t.x0 + t.x1) / 2, back((t.x0 + t.x1) / 2, 0.6), { kind: 'tent', tall: 1 });
    else stand(t.x0 + 0.3, back(t.x0 + 0.3, 0.3), { kind: 'marker', tall: 1, color: trailOf(i) });
    const n = Math.round((t.x1 - t.x0) / 2.4);
    for (let k = 0; k < n; k++) {
      const x = t.x0 + 0.2 + hash(k, i, seed + 70) * Math.max(0.1, t.x1 - t.x0 - 0.4);
      const kind = LK.props[Math.floor(hash(k, i, seed + 72) * LK.props.length)];
      if (kind !== 'cactus') stand(x, back(x, 0.2 + hash(k, i, seed + 71) * 0.9), { kind, tall: 0.8, tint: hash(k, i, seed + 73) });
    }
  });

  const edge = plain ? '#000' : null;
  for (let iz = nz - 1; iz >= 0; iz--) {
    const z0 = Z0 + iz * C;
    for (let ix = nx - 1; ix >= 0; ix--) {
      const x0 = X0 + ix * C;
      const raw = at(ix, iz);
      const h = level(raw);
      const a = project(x0, h, z0);
      const far = project(x0, h, z0 + C);
      if (far.y > H + 30 || a.x > W + 60) continue;
      const b = project(x0 + C, h, z0);
      if (b.x < -60) continue;
      const w = plan.where(x0 + C / 2, z0 + C / 2);
      const i = w.stop;
      const grass = w.pad ? grassOf(i) : P.ground;
      const rnd = hash(ix, iz, seed);
      // Sides: earth under a lip of grass, with stone lower down.
      const side = (x, z, dx, dz, low, shade) => {
        for (let y = low; y < h - 0.001; y += BLOCK) {
          const y2 = Math.min(h, y + BLOCK);
          const top = y2 >= h - 0.001;
          const body = plain ? [236, 236, 236] : top ? P.dirt : (hash(ix + iz * 3, Math.round(y / BLOCK), seed + 7) > 0.55 ? P.stone : P.dirt);
          quad([project(x, y, z), project(x + dx, y, z + dz), project(x + dx, y2, z + dz), project(x, y2, z)], css(lit(body, shade * (0.9 + hash(ix, Math.round(y / BLOCK) + iz, seed + 2) * 0.16))), edge || css([0, 0, 0], 0.16));
          if (top && !plain) quad([project(x, y2 - BLOCK * 0.26, z), project(x + dx, y2 - BLOCK * 0.26, z + dz), project(x + dx, y2, z + dz), project(x, y2, z)], css(lit(grass, shade * 0.92)));
        }
      };
      if (raw > 0) {
        const left = level(at(ix - 1, iz));
        if (left < h) side(x0, z0 + C, 0, -C, left, 0.62);
        const front = level(at(ix, iz - 1));
        if (front < h) side(x0, z0, C, 0, front, 0.88);
      }
      // The top: water, the trail's cobbles in the step's colour, or grass.
      let tone;
      if (plain) tone = raw <= 0 ? [210, 210, 210] : w.pad ? [255, 255, 255] : [240, 240, 240];
      else if (raw <= 0) tone = lit(water, 0.94 + rnd * 0.12);
      else if (w.road) tone = lit(w.pad ? trailOf(i) : P.cobble, 0.9 + hash(ix, iz, seed + 5) * 0.2);
      else {
        // Taller ground behind is a little darker under it, higher ground a little brighter, and the tops of the hills are bare rock.
        const under = at(ix - 1, iz) > raw || at(ix, iz + 1) > raw ? 0.88 : 1;
        const bare = !w.pad && raw > 3.4 * (ROUGH[plan.land] || 1);
        // Where the students stand the ground is paler and plainer than the land around it, so they are the brightest and busiest things on it.
        tone = w.pad ? lit(mix(grass, night ? [70, 74, 110] : [250, 246, 232], 0.42), 0.97 + rnd * 0.05)
          : lit(bare ? mix(P.stone, P.snow, plan.land === 'desert' ? 0 : 0.55) : grass, (0.9 + rnd * 0.16) * under * (1 + Math.min(4, raw) * 0.025));
      }
      quad([a, b, project(x0 + C, h, z0 + C), far], css(tone), edge && w.pad ? edge : css([0, 0, 0], w.road ? 0.12 : w.pad ? 0.04 : 0.07));
      const here = standing.get(ix * nz + iz);
      if (here && !plain) here.forEach(draw);
    }
  }

  // The whole land is dimmed a little, so the characters, which are not, are the brightest things on it.
  if (!plain) { g.fillStyle = css(night ? [8, 8, 30] : [24, 28, 70], night ? 0.2 : 0.17); g.fillRect(0, 0, W, H); }
  // A soft shadow where each student stands.
  if (!plain) for (const s of plan.slots.flat()) {
    g.fillStyle = css([0, 0, 0], 0.34);
    g.beginPath();
    g.ellipse(s.sx, s.sy, s.h * 0.4, s.h * 0.12, 0, 0, Math.PI * 2);
    g.fill();
  }
}
