// The shape of the land for the 3D journey map: how high the ground is at every point. No drawing
// here, so tests can check it. Heights are in page pixels; the grid is in art pixels (3 page pixels).
//
// High roads climb onto mesas and low roads drop into canyons. The climb is a ramp along the trail,
// so a road never has to jump up a cliff, and the cliffs face the viewer once the ramp is done.

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 *   terraces: [{ x0, x1, y0, y1, height, ramp, soft }] in art pixels. `ramp` is how far the slope
 *             runs before x0 and after x1. `soft` makes the near edge a slope too, for a trail
 *             that comes straight up the front.
 *   bumps:    [{ kind: 'peak' | 'pyramid' | 'spire', x, y, tall }] in art pixels
 *   calm:     a grid of 1s where the land must stay smooth (trails and stops), for the hills to avoid
 *   hills:    how tall the rolling hills are, away from calm ground. 0 for none.
 *   step, block: build the land out of blocks `block` cells wide whose tops are `step` apart, the
 *             way a block-building game does. 0 leaves it smooth.
 * Returns a Float32Array of w * h heights.
 */
export function buildHeights({ w, h, terraces = [], bumps = [], calm = null, hills = 0, hillScale = null, step = 0, block = 1 }) {
  const H = new Float32Array(w * h);
  // Gentle rolls everywhere, so flat ground isn't a sheet of glass.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = 3 + (Math.sin(x * 0.21 + y * 0.13) + Math.sin(x * 0.07 - y * 0.19)) * 1.6;
  for (const t of terraces) {
    const ramp = t.ramp || 1;
    for (let y = Math.max(0, Math.floor(t.y0 - 30)); y <= Math.min(h - 1, Math.ceil(t.y1 + 30)); y++) {
      for (let x = Math.max(0, Math.floor(t.x0 - ramp)); x <= Math.min(w - 1, Math.ceil(t.x1 + ramp)); x++) {
        const kx = smooth(t.x0 - ramp, t.x0, x) * (1 - smooth(t.x1, t.x1 + ramp, x));
        // On the ramp the sides are soft too, so the land is a saddle a path can cross. At full
        // height they sharpen into cliffs.
        const edge = 1.5 + (1 - kx) * 16;
        const nearEdge = t.soft ? 24 : edge;
        const kz = smooth(t.y0 - edge, t.y0 + edge, y) * (1 - smooth(t.y1 - nearEdge, t.y1 + nearEdge, y));
        H[y * w + x] += t.height * kx * kz;
      }
    }
  }
  if (hills) {
    // How far each cell is from calm ground, by sweeping the grid forward and back.
    const far = new Float32Array(w * h).fill(999);
    if (calm) for (let i = 0; i < far.length; i++) if (calm[i]) far[i] = 0;
    const relax = (i, j, cost) => { if (far[j] + cost < far[i]) far[i] = far[j] + cost; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (x) relax(i, i - 1, 1); if (y) relax(i, i - w, 1); if (x && y) relax(i, i - w - 1, 1.4); if (y && x < w - 1) relax(i, i - w + 1, 1.4); }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (x < w - 1) relax(i, i + 1, 1); if (y < h - 1) relax(i, i + w, 1); if (x < w - 1 && y < h - 1) relax(i, i + w + 1, 1.4); if (y < h - 1 && x) relax(i, i + w - 1, 1.4); }
    // Hills of two sizes laid over each other, so no two look alike. They flatten out toward
    // the trails, which keeps every road walkable and every stop on level ground.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const rise = lumps(x / 38, y / 32, 1) * 0.68 + lumps(x / 15, y / 13, 2) * 0.32;
      // Some lands are hillier than others: `hillScale(x)` says by how much.
      H[i] += hills * (hillScale ? hillScale(x) : 1) * rise * smooth(5, 26, far[i]);
    }
  }
  for (const b of bumps) {
    if (b.kind === 'spire') {
      // A crystal spire: a narrow column, a block or two across, flat on top.
      for (let y = Math.max(0, b.y - 3); y <= Math.min(h - 1, b.y + 3); y++) for (let x = Math.max(0, b.x - 3); x <= Math.min(w - 1, b.x + 3); x++) if (Math.hypot(x - b.x, y - b.y) < 3) H[y * w + x] = Math.max(H[y * w + x], b.tall || 84);
      continue;
    }
    const r = b.kind === 'peak' ? 15 : 13;
    const tall = b.kind === 'peak' ? 150 : 84;
    for (let y = Math.max(0, b.y - r); y <= Math.min(h - 1, b.y + r); y++) {
      for (let x = Math.max(0, b.x - r); x <= Math.min(w - 1, b.x + r); x++) {
        // A mountain is a cone, a little lopsided so no two match. A pyramid has four flat faces.
        const wob = b.kind === 'peak' ? 1 + (lumps(x / 4 + b.x, y / 4 + b.y, 5) - 0.5) * 0.5 : 1;
        const d = (b.kind === 'peak' ? Math.hypot(x - b.x, y - b.y) / r : Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) / r) * wob;
        if (d < 1) H[y * w + x] = Math.max(H[y * w + x], 3 + tall * (1 - d));
      }
    }
  }
  if (step) {
    // Every block takes the height at its middle, rounded to a whole number of steps.
    for (let by = 0; by < h; by += block) for (let bx = 0; bx < w; bx += block) {
      const tall = Math.round(H[Math.min(h - 1, by + (block >> 1)) * w + Math.min(w - 1, bx + (block >> 1))] / step) * step;
      for (let y = by; y < Math.min(h, by + block); y++) for (let x = bx; x < Math.min(w, bx + block); x++) H[y * w + x] = tall;
    }
  }
  return H;
}

// Smooth random lumps from 0 to 1: the same every time for the same place and layer.
const hash = (x, y, k) => { let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k, 2147483647); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
export function lumps(x, y, k) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, k) + (hash(x0 + 1, y0, k) - hash(x0, y0, k)) * ux;
  const b = hash(x0, y0 + 1, k) + (hash(x0 + 1, y0 + 1, k) - hash(x0, y0 + 1, k)) * ux;
  return a + (b - a) * uy;
}
/** A steady random number from 0 to 1 for a place, for speckling the land. */
export const grain = (x, y, k = 9) => hash(x, y, k);

/** Where the ground drops away toward the viewer by more than a step: a cliff face. */
export function cliffAt(H, w, h, x, y) {
  if (y + 1 >= h) return 0;
  return H[y * w + x] - H[(y + 1) * w + x];
}
