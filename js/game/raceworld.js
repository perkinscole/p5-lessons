// The class display's race as a little block world seen at an angle, the way the journey map is:
// a staircase of grass terraces climbs away to the right, one terrace for each step of the lesson,
// and the students stand on the terrace they have reached.
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
const ROW = 1.55; // how far apart rows of students stand, front to back: close enough to be a crowd, far enough that every name and face shows
const BASE = 1.1; // how tall the first terrace is
const RISE = 0.5; // how much taller each next terrace is
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

/** The terraces and where each student stands, with `rows` rows of students on a terrace. */
function arrange(stops, rows) {
  const depth = 1.1 + rows * ROW;
  let x = 0;
  const terraces = stops.map((names, i) => {
    const cols = Math.max(1, Math.ceil(names.length / rows));
    const place = placeWidth(names);
    // A second row stands half a place to the side, so faces show between the heads in front.
    const used = Math.min(rows, Math.ceil(names.length / cols));
    const width = names.length ? cols * place + (used > 1 ? place * 0.5 : 0) + 0.3 : EMPTY;
    const t = { i, x0: x, x1: x + width, top: BASE + i * RISE, cols, place, count: names.length };
    x += width;
    return t;
  });
  const slots = terraces.map((t) => Array.from({ length: t.count }, (_, j) => {
    const row = Math.floor(j / t.cols);
    const col = j % t.cols;
    return { stop: t.i, row, x: t.x0 + 0.15 + (col + 0.5 + (row % 2 ? 0.5 : 0)) * t.place, y: t.top, z: 0.85 + row * ROW, wide: t.place };
  }));
  return { terraces, slots, width: x, depth, rows };
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
 *   { terraces, slots, width, depth, rows, size, project(x, y, z) -> { x, y, s, far } }
 * `size` is a character's height in pixels at the middle of the world, and each slot has the
 * screen place of that student's feet (sx, sy) and their own height in pixels (h).
 */
export function planRace(stops, W, H, { maxSize = 190, margin = 10, sky = 0.06 } = {}) {
  let best = null;
  for (const yaw of YAWS) for (let rows = 1; rows <= 6; rows++) {
    const world = arrange(stops, rows);
    const cam = cameraFor(world, yaw);
    // Everything that must be inside the panel: the corners of the land, and each student with
    // their name and room above for a raised hand.
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    const see = (p) => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); };
    for (const t of world.terraces) {
      for (const z of [0, world.depth]) { see(cam(t.x0, 0, z)); see(cam(t.x1, 0, z)); see(cam(t.x0, t.top, z)); see(cam(t.x1, t.top, z)); }
    }
    for (const s of world.slots.flat()) {
      const p = cam(s.x, s.y, s.z);
      see({ x: p.x - s.wide * 0.5 * p.s, y: p.y - 2.25 * p.s });
      see({ x: p.x + s.wide * 0.5 * p.s, y: p.y });
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
  const slots = world.slots.map((list) => list.map((s) => { const p = project(s.x, s.y, s.z); return { ...s, sx: p.x, sy: p.y, h: p.s, far: p.far }; }));
  return { ...world, slots, size: k, project };
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

/**
 * Paint the land for a plan from planRace.
 *   look: for each stop, { hue } for a step, or { kind: 'start' | 'finish' }.
 *   plain: outlines only, for the high contrast theme.
 */
export function paintRace(g, plan, { W, H, look = [], night = false, plain = false, seed = 1 } = {}) {
  const P = night ? NIGHT : DAY;
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
  if (plain) {
    for (let i = terraces.length - 1; i >= 0; i--) {
      const t = terraces[i];
      const low = i ? terraces[i - 1].top : 0;
      quad([project(t.x0, low, 0), project(t.x0, t.top, 0), project(t.x0, t.top, depth), project(t.x0, low, depth)], '#e8e8e8', '#000');
      quad([project(t.x0, t.top, 0), project(t.x1, t.top, 0), project(t.x1, t.top, depth), project(t.x0, t.top, depth)], '#ffffff', '#000');
      quad([project(t.x0, 0, 0), project(t.x1, 0, 0), project(t.x1, t.top, 0), project(t.x0, t.top, 0)], '#f4f4f4', '#000');
    }
    return;
  }

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

  // The open ground all around, as blocks, far rows first.
  const G = BLOCK * 2;
  for (let z = depth + 16; z > -9; z -= G) {
    for (let x = -9; x < width + 9; x += G) {
      const a = project(x, 0, z);
      if (a.y > H + 40) continue;
      const tone = lit(P.ground, 0.9 + hash(Math.round(x / G), Math.round(z / G), seed) * 0.16);
      quad([a, project(x + G, 0, z), project(x + G, 0, z - G), project(x, 0, z - G)], css(tone), css([0, 0, 0], 0.07));
    }
  }

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

  // Trees stand on the open ground. Those behind the terraces are painted before them.
  const trees = [];
  for (let n = 0; n < 26; n++) {
    const behind = n < 17;
    trees.push({ x: -6 + hash(n, 1, seed + 40) * (width + 12), z: behind ? depth + 1.2 + hash(n, 2, seed + 40) * 11 : -1.6 - hash(n, 2, seed + 40) * 5, pine: hash(n, 3, seed + 40) > 0.6, behind });
  }
  const tree = (t) => {
    const p = project(t.x, 0, t.z);
    const u = p.s;
    if (p.y < 0 || p.y > H + u || p.x < -u * 2 || p.x > W + u * 2) return;
    g.fillStyle = css([0, 0, 0], 0.18);
    g.fillRect(p.x - u * 0.55, p.y - u * 0.06, u * 1.3, u * 0.14);
    g.fillStyle = css(P.trunk);
    g.fillRect(p.x - u * 0.13, p.y - u * 0.75, u * 0.26, u * 0.75);
    if (t.pine) {
      for (let k = 0; k < 3; k++) { const w = u * (1.25 - k * 0.36); g.fillStyle = css(k === 2 ? P.leafLight : P.leaf); g.fillRect(p.x - w / 2, p.y - u * (1.1 + k * 0.48), w, u * 0.52); }
    } else {
      g.fillStyle = css(P.leaf);
      g.fillRect(p.x - u * 0.62, p.y - u * 1.7, u * 1.24, u * 1.05);
      g.fillStyle = css(P.leafLight);
      g.fillRect(p.x - u * 0.62, p.y - u * 1.7, u * 1.24, u * 0.34);
      g.fillRect(p.x - u * 0.62, p.y - u * 1.7, u * 0.34, u * 1.05);
    }
  };
  trees.filter((t) => t.behind).sort((a, b) => b.z - a.z).forEach(tree);

  // The terraces, the far one first. Each is built from blocks: the side that faces the viewer's
  // left, the top, then the front.
  for (let i = terraces.length - 1; i >= 0; i--) {
    const t = terraces[i];
    const low = i ? terraces[i - 1].top : 0;
    const grass = grassOf(i);
    for (let z = depth; z > 0.001; z -= BLOCK) {
      for (let y = low; y < t.top - 0.001; y += BLOCK) {
        const y2 = Math.min(t.top, y + BLOCK);
        const body = y2 >= t.top - 0.001 ? mix(P.dirt, grass, 0.35) : P.dirt;
        quad([project(t.x0, y, z), project(t.x0, y2, z), project(t.x0, y2, z - BLOCK), project(t.x0, y, z - BLOCK)],
          css(lit(body, 0.6 + hash(Math.round(z / BLOCK), Math.round(y / BLOCK), seed + i) * 0.1)), css([0, 0, 0], 0.16));
      }
    }
    for (let z = depth; z > 0.001; z -= BLOCK) {
      const back = z / depth;
      for (let x = t.x0, c = 0; x < t.x1 - 0.001; x += BLOCK, c++) {
        const x2 = Math.min(t.x1, x + BLOCK);
        const onTrail = z - BLOCK < 1.25 && z > 0.3;
        const tone = onTrail ? lit(trailOf(i), 0.9 + hash(c, Math.round(z / BLOCK), seed + 5 + i) * 0.2) : lit(grass, (0.92 + hash(c + i * 97, Math.round(z / BLOCK), seed) * 0.14) * (1 - back * 0.08));
        quad([project(x, t.top, z), project(x2, t.top, z), project(x2, t.top, z - BLOCK), project(x, t.top, z - BLOCK)], css(tone), css([0, 0, 0], onTrail ? 0.14 : 0.08));
      }
    }
    for (let y = 0, r = 0; y < t.top - 0.001; y += BLOCK, r++) {
      const y2 = Math.min(t.top, y + BLOCK);
      const topRow = y2 >= t.top - 0.001;
      for (let x = t.x0, c = 0; x < t.x1 - 0.001; x += BLOCK, c++) {
        const x2 = Math.min(t.x1, x + BLOCK);
        const body = topRow ? P.dirt : (hash(c + i * 13, r, seed + 7) > 0.62 ? P.stone : P.dirt);
        quad([project(x, y, 0), project(x2, y, 0), project(x2, y2, 0), project(x, y2, 0)],
          css(lit(body, 0.84 + hash(c + i * 53, r, seed + 2) * 0.16)), css([0, 0, 0], 0.16));
        if (topRow) quad([project(x, y2 - BLOCK * 0.28, 0), project(x2, y2 - BLOCK * 0.28, 0), project(x2, y2, 0), project(x, y2, 0)], css(lit(grass, 0.8)));
      }
    }
    // The tower at the top of the trail, and the camp at its foot.
    const L = look[i] || {};
    if (L.kind === 'finish' || L.kind === 'start') {
      const p = project((t.x0 + t.x1) / 2, t.top, depth - 0.6);
      const u = p.s * 0.5;
      g.fillStyle = css([0, 0, 0], 0.18);
      g.fillRect(p.x - u * 1.3, p.y - u * 0.1, u * 2.8, u * 0.22);
      if (L.kind === 'finish') {
        g.fillStyle = css(P.wall);
        g.fillRect(p.x - u * 1.1, p.y - u * 3.2, u * 2.2, u * 3.2);
        g.fillStyle = css(lit(P.wall, 1.16));
        g.fillRect(p.x - u * 1.1, p.y - u * 3.2, u * 0.5, u * 3.2);
        for (let k = 0; k < 3; k++) g.fillRect(p.x - u * 1.3 + k * u * 0.95, p.y - u * 3.75, u * 0.62, u * 0.6);
        g.fillStyle = css([40, 34, 60]);
        g.fillRect(p.x - u * 0.34, p.y - u * 1.3, u * 0.68, u * 1.3);
        g.fillRect(p.x - u * 0.06, p.y - u * 5.6, u * 0.12, u * 1.9);
        g.fillStyle = css([226, 70, 60]);
        g.fillRect(p.x + u * 0.06, p.y - u * 5.6, u * 1.1, u * 0.7);
      } else {
        for (let k = 0; k < 4; k++) { const w = u * (2.4 - k * 0.56); g.fillStyle = css(k % 2 ? [236, 236, 228] : [222, 96, 72]); g.fillRect(p.x - w / 2, p.y - u * (0.5 + k * 0.5), w, u * 0.5); }
        g.fillStyle = css([40, 34, 60]);
        g.fillRect(p.x - u * 0.22, p.y - u * 0.8, u * 0.44, u * 0.8);
      }
    }
  }

  // Stone steps where the trail climbs from one terrace to the next.
  for (let i = 1; i < terraces.length; i++) {
    const t = terraces[i];
    const prev = terraces[i - 1];
    const w = BLOCK * 0.9;
    for (let s = 1; s >= 0; s--) {
      const x0 = t.x0 - w * (2 - s);
      const top = prev.top + RISE * (s + 1) / 3;
      const z0 = 0.25;
      const z1 = 1.25;
      quad([project(x0, prev.top, z0), project(x0, top, z0), project(x0, top, z1), project(x0, prev.top, z1)], css(lit(P.stone, 0.82)), css([0, 0, 0], 0.2));
      quad([project(x0, top, z0), project(x0 + w, top, z0), project(x0 + w, top, z1), project(x0, top, z1)], css(lit(P.stone, 1.3)), css([0, 0, 0], 0.2));
      quad([project(x0, prev.top, z0), project(x0 + w, prev.top, z0), project(x0 + w, top, z0), project(x0, top, z0)], css(lit(P.stone, 1.08)), css([0, 0, 0], 0.2));
    }
  }

  // A soft shadow where each student stands, then the trees nearest the viewer.
  for (const s of plan.slots.flat()) {
    g.fillStyle = css([0, 0, 0], 0.24);
    g.beginPath();
    g.ellipse(s.sx, s.sy, s.h * 0.34, s.h * 0.1, 0, 0, Math.PI * 2);
    g.fill();
  }
  trees.filter((t) => !t.behind).sort((a, b) => b.z - a.z).forEach(tree);
}
