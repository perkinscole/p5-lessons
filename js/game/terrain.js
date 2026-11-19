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
 *   bumps:    [{ kind: 'peak' | 'pyramid', x, y }] in art pixels
 * Returns a Float32Array of w * h heights.
 */
export function buildHeights({ w, h, terraces = [], bumps = [] }) {
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
  for (const b of bumps) {
    const r = 12;
    const tall = b.kind === 'peak' ? 96 : 60;
    for (let y = Math.max(0, b.y - r); y <= Math.min(h - 1, b.y + r); y++) {
      for (let x = Math.max(0, b.x - r); x <= Math.min(w - 1, b.x + r); x++) {
        // A mountain is a cone. A pyramid has four flat faces.
        const d = b.kind === 'peak' ? Math.hypot(x - b.x, y - b.y) / r : Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) / r;
        if (d < 1) H[y * w + x] = Math.max(H[y * w + x], 3 + tall * (1 - d));
      }
    }
  }
  return H;
}

/** Where the ground drops away toward the viewer by more than a step: a cliff face. */
export function cliffAt(H, w, h, x, y) {
  if (y + 1 >= h) return 0;
  return H[y * w + x] - H[(y + 1) * w + x];
}
