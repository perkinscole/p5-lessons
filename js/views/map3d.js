// The journey map in 3D: real terrain seen at an angle, so the high roads climb away into the
// distance and the low roads drop toward you. Trees and tents stand up in it, and every lesson
// stop and character is a sign facing the camera, always in front, so nothing hides a student.
//
// It is drawn the way old flight games drew landscapes: for each strip of ground from near to far,
// each column of the screen looks up how high the land is there and paints from that height down
// to whatever is already drawn. No 3D library, and it only redraws when the map is scrolled.
import { h } from '../ui.js';
import { getLesson } from '../curriculum/engine.js';
import { PATHS, STAGES, mapLayout, currentLesson, sequence } from '../curriculum/graph.js';
import { avatarURL, defaultAvatar } from '../game/avatar.js';
import { COL_W, MARGIN, place } from '../game/world.js';
import { paintGround, spritePixels, FLAT, SHAPED, groundOf, landFor } from '../game/overworld.js';
import { buildHeights, grain } from '../game/terrain.js';
import { standingOn, showCrowd, pointsAlong } from './map.js';

const ART = 3; // page pixels per art pixel of the ground picture
const PX = 2; // page pixels per pixel of the 3D picture, which is drawn small and scaled up
const VIEW_H = 730; // room above the land for mountains to loom
const OFF = 300; // the ground picture has this much extra land behind the furthest road
const LAND_H = 860;
const HORIZON = 96;
const CAM_H = 372;
const STRETCH = 1.45; // the world is widened, so far-off stops still have room for their names
// How far away each lane is. Lane 0 is the shared trail down the middle.
const MID = 1.2415;
const PER_LANE = 0.33; // the bigger this is, the more a far road shrinks next to a near one
const depthOf = (t) => MID - ((t - OFF - 282) / 120) * PER_LANE;
const rowOf = (z) => OFF + 282 + ((MID - z) / PER_LANE) * 120;
// How high each road runs: the further from the middle, the higher or deeper.
const LIFT = { '-1.5': 192, '-0.5': 84, '0.5': -48, '1.5': -60 };
// The land is built from blocks, like a block-building game: this many ground cells wide, this tall.
const BLOCK = 4;
const STEP = 12;
const NEAR = depthOf(LAND_H - 1);
const FAR = 7;

/** A road's colour may be written as a style variable. A canvas needs the colour itself. */
function solid(color) {
  const m = /^var\((--[\w-]+)\)$/.exec(String(color).trim());
  return m ? (getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#888888') : color;
}

// A jagged line of summits: sharp-pointed waves of different sizes added together.
const crag = (v) => 1 - Math.abs((((v % 1) + 1) % 1) - 0.5) * 2;
const peaks = (u, range) => range.base + range.waves.reduce((a, [tall, wide, shift]) => a + tall * crag(u / wide + shift), 0);
const broad = (u, range) => range.waves.slice(0, 2).reduce((a, [tall, wide, shift]) => a + tall * crag(u / wide + shift), 0);
const RANGES = [
  { slide: 0.035, base: 54, haze: 0.5, snow: true, waves: [[92, 610, 0.1], [48, 257, 0.55], [22, 97, 0.3], [9, 41, 0.8]], lit: [150, 165, 196], dark: [120, 136, 172], snowLit: [255, 255, 255], snowDark: [228, 235, 246] },
  { slide: 0.085, base: 26, haze: 0.45, snow: false, waves: [[44, 380, 0.6], [26, 149, 0.15], [10, 53, 0.4]], lit: [118, 142, 150], dark: [94, 118, 130] },
];

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
const tone = (c, k) => pack(Math.min(255, (c & 255) * k), Math.min(255, ((c >> 8) & 255) * k), Math.min(255, ((c >> 16) & 255) * k));

/** Build the world once: ground colours, heights, and everything that stands up. */
function buildWorld(myPath) {
  const { nodes, edges, cols } = mapLayout();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const width = MARGIN * 2 + (cols - 1) * COL_W;
  const at = (n) => { const p = place(n); return { x: p.x, y: p.y + OFF }; };

  const spans = STAGES.map((st) => {
    const ids = st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat();
    const colsHere = ids.map((id) => byId.get(id).col);
    return { st, ids, x0: MARGIN + Math.min(...colsHere) * COL_W - COL_W / 2, x1: MARGIN + Math.max(...colsHere) * COL_W + COL_W / 2 };
  });
  spans[0].x0 = 0;
  spans.forEach((sp, i) => { if (spans[i + 1]) { const mid = (sp.x1 + spans[i + 1].x0) / 2; sp.x1 = mid; spans[i + 1].x0 = mid; } else sp.x1 = width; });

  // Each run of stops on one road is a terrace: a mesa if the road is high, a canyon if it is low.
  const runs = new Map();
  spans.forEach(({ ids }, i) => { for (const id of ids) { const n = byId.get(id); if (n.lane) { const key = `${i}:${n.lane}`; if (!runs.has(key)) runs.set(key, []); runs.get(key).push(n); } } });
  const BAND = { '-1.5': [-64, 60], '-0.5': [-60, 50], '0.5': [-46, 60], '1.5': [-60, 70] };
  const terraces = [...runs.values()].map((list) => {
    const xs = list.map((n) => at(n).x);
    const { y } = at(list[0]);
    const [up, down] = BAND[String(list[0].lane)] || [-60, 60];
    return { x0: (Math.min(...xs) - 22) / ART, x1: (Math.max(...xs) + 22) / ART, y0: (y + up) / ART, y1: (y + down) / ART, height: LIFT[String(list[0].lane)] || 0, ramp: 26 };
  });
  // A side trail climbs straight up to its own lookout.
  for (const n of nodes) if (n.side && n.lane) { const p = at(n); terraces.push({ x0: (p.x - 44) / ART, x1: (p.x + 44) / ART, y0: (p.y - 60) / ART, y1: (p.y + 46) / ART, height: LIFT[String(n.lane)] || 100, ramp: 14, soft: true }); }

  const stops = nodes.map(at);
  const lines = edges.map((e) => pointsAlong(at(byId.get(e.from)), at(byId.get(e.to))));
  // Nothing is planted on the edge of a terrace, where it would stand half on a cliff.
  const avoid = terraces.flatMap((t) => [
    { x0: (t.x0 - t.ramp) * ART, x1: (t.x1 + t.ramp) * ART, y0: t.y0 * ART - 14, y1: t.y0 * ART + 14 },
    { x0: (t.x0 - t.ramp) * ART, x1: (t.x1 + t.ramp) * ART, y0: t.y1 * ART - 14, y1: t.y1 * ART + 14 },
  ]);
  const { canvas, plan } = paintGround({ width, height: LAND_H, stops, trails: lines, stages: spans, avoid, signs: false });
  const { w, h: rows } = plan;

  // Trails are painted onto the ground, so they follow the land up and down. Your road goes on last.
  const g = canvas.getContext('2d');
  g.save();
  g.scale(1 / ART, 1 / ART);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const order = edges.map((e, i) => ({ e, line: lines[i], mine: !e.path || !myPath || e.path === myPath })).sort((a, b) => a.mine - b.mine);
  for (const pass of ['edge', 'fill']) {
    for (const { e, line, mine } of order) {
      const dotted = e.beyond || e.side;
      g.beginPath();
      line.forEach((pt, i) => (i ? g.lineTo(pt.x, pt.y) : g.moveTo(pt.x, pt.y)));
      g.globalAlpha = mine ? 1 : 0.55;
      g.setLineDash(pass === 'fill' && dotted ? [3, 16] : []);
      g.lineWidth = pass === 'edge' ? (mine ? 19 : 13) : (mine ? 12 : 7);
      g.strokeStyle = pass === 'edge' ? '#5d4c3c' : (e.path ? solid(PATHS[e.path].color) : '#f6ead0');
      g.stroke();
    }
  }
  g.restore();
  const onTrail = new Uint8Array(w * rows);
  for (const line of lines) for (const pt of line) { const x = Math.round(pt.x / ART); const y = Math.round(pt.y / ART); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < rows) onTrail[(y + dy) * w + x + dx] = 1; }

  const bumps = plan.things.filter((t) => SHAPED.has(t.kind));
  // Hills roll everywhere except along the trails and round the stops, which stay level.
  const calm = onTrail.slice();
  for (const st of stops) { const cx = Math.round(st.x / ART); const cy = Math.round(st.y / ART); for (let dy = -7; dy <= 5; dy++) for (let dx = -8; dx <= 8; dx++) if (cx + dx >= 0 && cx + dx < w && cy + dy >= 0 && cy + dy < rows) calm[(cy + dy) * w + cx + dx] = 1; }
  const H = buildHeights({ w, h: rows, terraces, bumps, calm, hills: 46, step: STEP, block: BLOCK });
  const C = new Uint32Array(g.getImageData(0, 0, w, rows).data.buffer.slice(0));
  // S is what each block's sides are made of: earth under grass, stone in the mountains, sandstone in the desert.
  const S = new Uint32Array(w * rows);
  const landAt = (x) => { let i = 0; while (i + 1 < spans.length && x * ART >= spans[i + 1].x0) i++; return landFor(i); };
  const SIDES = { snow: [150, 152, 162], highland: [146, 140, 128], desert: [214, 176, 112], grove: [150, 126, 150], crystal: [140, 140, 164], dusk: [150, 126, 150] };
  const EARTH = [150, 112, 78];
  const made = new Uint8Array(w * rows); // 1 mountain, 2 pyramid
  for (const b of bumps) for (let y = Math.max(0, b.y - 16); y <= Math.min(rows - 1, b.y + 16); y++) for (let x = Math.max(0, b.x - 16); x <= Math.min(w - 1, b.x + 16); x++) {
    const d = b.kind === 'peak' ? Math.hypot(x - b.x, y - b.y) : Math.max(Math.abs(x - b.x), Math.abs(y - b.y));
    if (d < (b.kind === 'peak' ? 15 : 13) && H[y * w + x] > 30) made[y * w + x] = b.kind === 'peak' ? 1 : 2;
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const land = landAt(x);
    const bx = (x / BLOCK) | 0;
    const by = (y / BLOCK) | 0;
    const side = made[i] === 1 ? [142, 146, 158] : made[i] === 2 ? [224, 180, 104] : (SIDES[land] || EARTH);
    S[i] = pack(side[0], side[1], side[2]);
    if (made[i] === 1) C[i] = H[i] > 96 || (land === 'snow' && H[i] > 48) ? pack(250, 252, 255) : pack(168, 172, 184);
    else if (made[i] === 2) C[i] = pack(240, 204, 124);
    if (onTrail[i]) continue;
    // Texture: every block is a slightly different shade, each cell is speckled, and a faint
    // line marks where one block meets the next.
    let k = 0.94 + grain(bx, by, 3) * 0.12 + (grain(x, y, 4) - 0.5) * 0.07;
    if (x % BLOCK === 0 || y % BLOCK === 0) k *= 0.93;
    C[i] = tone(C[i], k);
  }

  const heightAt = (x, t) => H[Math.max(0, Math.min(rows - 1, Math.round(t / ART))) * w + Math.max(0, Math.min(w - 1, Math.round(x / ART)))];
  const standing = plan.things.filter((t) => !FLAT.has(t.kind) && !SHAPED.has(t.kind))
    .map((t) => ({ x: t.x * ART, z: depthOf(t.y * ART), lift: heightAt(t.x * ART, t.y * ART), art: spritePixels(t.kind, (t.x + t.y) % 3) }))
    .sort((a, b) => a.z - b.z);
  return { nodes, byId, spans, width, w, rows, H, C, S, heightAt, standing, at };
}

const worlds = new Map();
const worldFor = (myPath) => { const key = myPath || ''; if (!worlds.has(key)) worlds.set(key, buildWorld(myPath)); return worlds.get(key); };

/** The 3D map. Returns the element to put on the page. */
export function buildMap3d({ board, meId = null, myPath = null, myDone = new Set(), onNode }) {
  const world = worldFor(myPath);
  const { nodes, byId, spans, width, w, rows, H, C, S, heightAt, standing, at } = world;
  const canvas = h('canvas.map3d-canvas', { 'aria-hidden': 'true' });
  const overlay = h('div.map3d-overlay');
  const stage = h('div.map3d-stage', canvas, overlay);
  // Scrolling moves the camera. The middle trail moves at the speed of the scroll bar.
  const SPEED = STRETCH / MID;
  const spacer = h('div.map3d-spacer', { style: `width:${Math.round(width * SPEED + 200)}px` });
  const scroller = h('div.map-scroll.map3d', { tabindex: 0, role: 'group', 'aria-label': 'Journey map in 3D, scrollable. Details are in the table below.' }, stage, spacer);

  // Stops and characters are ordinary page elements placed over the picture, so they stay sharp,
  // can be clicked and tabbed to, and are never hidden behind a hill.
  const myOrder = [...(myPath ? sequence(myPath) : sequence(null)), ...nodes.filter((n) => n.side).map((n) => n.id)];
  const myCurrent = meId ? currentLesson(myPath, myDone) : null;
  const groups = new Map();
  for (const s of board) { const id = standingOn(s); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(s); }
  const pins = nodes.map((n) => {
    const lesson = getLesson(n.id);
    const onMyRoad = myOrder.includes(n.id);
    const state = myDone.has(n.id) ? 'done' : n.id === myCurrent ? 'current' : 'todo';
    const clickable = !!(onNode && onNode.can(n.id, onMyRoad, state));
    const people = groups.get(n.id) || [];
    const sorted = [...people].sort((a) => (a.id === meId ? 1 : -1)).slice(-4);
    // Far-off stops are closer together on screen, so their names are cut shorter.
    const room = n.lane < -1 ? 12 : n.lane < 0 ? 14 : 17;
    const name = lesson.title.length > room ? `${lesson.title.slice(0, room - 1)}…` : lesson.title;
    const el = h('div.pin', { class: `${state}${onMyRoad || !meId ? '' : ' offroad'}` },
      sorted.length > 0 && h('div.pin-people', { translate: 'no' },
        sorted.map((s) => h('img', { src: avatarURL(s.avatar || defaultAvatar(s.id), 3), alt: '', title: s.display_name, class: s.id === meId ? 'me' : '' })),
        sorted.some((s) => s.id === meId) && h('span.pin-you', 'YOU'),
        people.length > 1 && h('button.pin-count', { type: 'button', 'aria-label': `${people.length} people here. Show names.`, onclick: (e) => { e.stopPropagation(); showCrowd(n.id, people); } }, String(people.length))),
      h(clickable ? 'button.pin-tile' : 'div.pin-tile', {
        type: clickable ? 'button' : null, title: `${lesson.title}: ${lesson.concepts.join(', ')}`, style: n.path ? `border-color:${PATHS[n.path].color}` : null,
        'aria-label': `${lesson.title}${state === 'done' ? ', done' : state === 'current' ? ', your next lesson' : ''}`,
        onclick: clickable ? () => onNode.go(n.id) : null,
      }, state === 'done' ? '✓' : n.id === myCurrent ? '▶' : String(lesson.mins)),
      h('div.pin-name', name));
    const p = at(n);
    return { el, x: p.x, z: depthOf(p.y), lift: heightAt(p.x, p.y), busy: sorted.length > 0 || state === 'current' };
  });
  const signs = spans.map(({ st, x0, x1 }) => ({ el: h('div.map3d-sign', st.mapName || st.name), x: (x0 + x1) / 2 }));
  overlay.append(...signs.map((s) => s.el), ...pins.map((p) => p.el));

  let W = 0;
  let HI = 0;
  let image = null;
  let buf = null;
  let ybuf = null;
  let taken = null;
  let before = null;
  let sky = null;
  const g = canvas.getContext('2d');
  const FOG = [226, 236, 240];

  function resize() {
    const wide = Math.max(320, scroller.clientWidth);
    W = Math.ceil(wide / PX);
    HI = VIEW_H / PX;
    canvas.width = W;
    canvas.height = HI;
    image = g.createImageData(W, HI);
    buf = new Uint32Array(image.data.buffer);
    ybuf = new Int32Array(W);
    taken = new Uint8Array(W * HI);
    before = new Float32Array(W);
    // The sky is the same every frame: pale at the horizon, bluer above.
    sky = new Uint32Array(HI);
    for (let y = 0; y < HI; y++) { const k = Math.min(1, y / (HORIZON / PX + 30)); sky[y] = pack(138 + 88 * k, 190 + 46 * k, 234 + 6 * k); }
  }

  function draw() {
    if (!W) resize();
    const cx = (W * PX) / 2;
    const camX = (scroller.scrollLeft + cx) / SPEED;
    for (let y = 0; y < HI; y++) buf.fill(sky[y], y * W, (y + 1) * W);
    // Mountains loom behind the land in two ranges. The far one is tall, pale, and capped with snow;
    // the near one is lower and darker. Each slides at its own speed as you scroll, which is what
    // makes them feel a long way off.
    const foot = Math.round((HORIZON + CAM_H / FAR) / PX) + 2;
    for (let i = 0; i < W; i++) {
      for (const range of RANGES) {
        const u = i * PX + camX * range.slide;
        const tall = Math.round(peaks(u, range) / PX);
        // Light comes from one side: a slope is bright or shaded by the big shapes only, so each
        // mountain has two broad faces. The snow line dips and rises a little along the range.
        const lit = broad(u + 6, range) > broad(u, range);
        const snow = range.snow ? Math.round(tall * 0.3 + crag(u / 61) * 6 + crag(u / 19) * 2 - 3) : 0;
        const top = foot - tall;
        for (let y = Math.max(0, top); y < foot; y++) {
          // Haze thickens toward the foot, so the range seems to rise out of the distance.
          const haze = Math.max(0, (y - top) / Math.max(1, tall)) * range.haze;
          // Snow thins out in a ragged edge where it meets the rock.
          const white = y - top < snow - ((i + y) % 3 === 0 && y - top > snow - 4 ? 3 : 0);
          const c = white ? (lit ? range.snowLit : range.snowDark) : (lit ? range.lit : range.dark);
          buf[y * W + i] = pack(c[0] + (FOG[0] - c[0]) * haze, c[1] + (FOG[1] - c[1]) * haze, c[2] + (FOG[2] - c[2]) * haze);
        }
      }
    }
    ybuf.fill(HI);
    taken.fill(0);

    // What stands up, nearest first, and only what is on screen.
    const seen = standing.filter((s) => { const sx = cx + ((s.x - camX) * STRETCH) / s.z; return sx > -80 && sx < W * PX + 80; });
    let next = 0;
    const plant = (s) => {
      const scale = (ART * 1.25) / s.z / PX;
      const dw = Math.round(s.art.w * scale);
      const dh = Math.round(s.art.h * scale);
      const left = Math.round((cx + ((s.x - camX) * STRETCH) / s.z) / PX - s.art.ox * scale);
      const top = Math.round((HORIZON + (CAM_H - s.lift) / s.z) / PX - s.art.oy * scale);
      for (let yy = 0; yy < dh; yy++) {
        const py = top + yy;
        if (py < 0 || py >= HI) continue;
        const from = Math.min(s.art.h - 1, Math.floor(yy / scale)) * s.art.w;
        for (let xx = 0; xx < dw; xx++) {
          const px = left + xx;
          if (px < 0 || px >= W || py >= ybuf[px]) continue;
          const c = s.art.data[from + Math.min(s.art.w - 1, Math.floor(xx / scale))];
          if ((c >>> 24) < 200) continue;
          const i = py * W + px;
          if (!taken[i]) { buf[i] = c; taken[i] = 1; }
        }
      }
    };

    before.fill(1e9);
    let step = 0.005;
    for (let z = NEAR; z < FAR; z += step, step *= 1.013) {
      while (next < seen.length && seen[next].z <= z) plant(seen[next++]);
      let row = Math.floor(rowOf(z) / ART);
      // Past the back of the picture, the far land repeats, fading into the haze.
      if (row < 0) row = (-row) % 96;
      if (row >= rows) continue;
      const base = row * w;
      const s = 1 / z;
      const perCol = PX / (s * STRETCH) / ART;
      let ax = (camX + (1 - cx) / (s * STRETCH)) / ART;
      const fog = z > 2.0 ? Math.min(0.85, (z - 2.0) / 3.4) : 0;
      const lift = HORIZON / PX;
      const k = s / PX;
      for (let i = 0; i < W; i++, ax += perCol) {
        const a = ax < 0 ? 0 : ax >= w ? w - 1 : ax | 0;
        const tall = H[base + a];
        let y = (lift + (CAM_H - tall) * k) | 0;
        if (y < 0) y = 0;
        const stop = ybuf[i];
        if (y >= stop) continue;
        let c = C[base + a];
        // Where this ground stands higher than the ground in front of it, the lower part of what
        // shows is the side of a block. It gets earth or stone, with a line at every block.
        // `before` remembers how high the ground was at the last strip, just nearer the camera.
        const rise = tall - before[i];
        before[i] = tall;
        let face = rise > 1 ? Math.min(stop - y, Math.round(rise * k)) : 0;
        if (fog) c = pack((c & 255) + (FOG[0] - (c & 255)) * fog, ((c >> 8) & 255) + (FOG[1] - ((c >> 8) & 255)) * fog, ((c >> 16) & 255) + (FOG[2] - ((c >> 16) & 255)) * fog);
        const top = stop - face;
        let at2 = y * W + i;
        for (let yy = y; yy < top; yy++, at2 += W) if (!taken[at2]) buf[at2] = c;
        if (face) {
          const side = S[base + a];
          const seam = a % BLOCK === 0 ? 0.84 : 1;
          const grassy = c;
          for (let yy = top; yy < stop; yy++, at2 += W) {
            if (taken[at2]) continue;
            // How far down the side this pixel is, in world height: darker at each block line,
            // lighter just under the lip, and shaded a little more toward the bottom.
            const down = (yy - top) / k;
            const line = down % STEP < 1.6 ? 0.8 : 1;
            let px = down < 2.2 ? tone(grassy, 0.86) : tone(side, seam * line * (0.98 - Math.min(0.2, down / 500)) * (0.95 + grain(a, (down / 3) | 0, 6) * 0.1));
            if (fog) px = pack((px & 255) + (FOG[0] - (px & 255)) * fog, ((px >> 8) & 255) + (FOG[1] - ((px >> 8) & 255)) * fog, ((px >> 16) & 255) + (FOG[2] - ((px >> 16) & 255)) * fog);
            buf[at2] = px;
          }
        }
        ybuf[i] = y;
      }
    }
    while (next < seen.length) plant(seen[next++]);
    g.putImageData(image, 0, 0);

    // Put each stop where its piece of ground landed, sized by how far away it is.
    const wide = W * PX;
    for (const p of pins) {
      const sx = cx + ((p.x - camX) * STRETCH) / p.z;
      if (sx < -120 || sx > wide + 120) { p.el.style.display = 'none'; continue; }
      const sy = HORIZON + (CAM_H - p.lift) / p.z;
      // A stop on the far road is well under half the size of one on the near road.
      const size = Math.max(0.58, Math.min(1.5, 1.08 / p.z));
      p.el.style.display = '';
      p.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) scale(${size.toFixed(3)})`;
      // Nearer stops sit in front of further ones, and anyone standing on one comes to the front.
      p.el.style.zIndex = String(Math.round(300 - p.z * 100) + (p.busy ? 200 : 0));
      // Someone far off glows less than someone close, the way a lamp does.
      p.el.style.setProperty('--near', Math.max(0.12, Math.min(1, (1.85 - p.z) / 1.0)).toFixed(2));
      // Names would be too small to read at that distance, so they shrink less than the stop does.
      p.el.style.setProperty('--name', (size < 0.86 ? 0.86 / size : 1).toFixed(3));
    }
    for (const s of signs) {
      const sx = cx + ((s.x - camX) * STRETCH) / MID;
      s.el.style.display = sx < -100 || sx > wide + 100 ? 'none' : '';
      s.el.style.transform = `translate(${Math.round(sx)}px, 0) translateX(-50%)`;
    }
  }

  let queued = false;
  const redraw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; if (scroller.isConnected) draw(); }); };
  scroller.addEventListener('scroll', redraw, { passive: true });
  const watcher = new ResizeObserver(() => { resize(); redraw(); });
  watcher.observe(scroller);
  // Arrow keys move along the trail when the map has the keyboard.
  scroller.addEventListener('keydown', (e) => { if (e.target !== scroller) return; if (e.key === 'ArrowRight') scroller.scrollLeft += 120; if (e.key === 'ArrowLeft') scroller.scrollLeft -= 120; });

  /** Bring a stop to the middle of the view. */
  scroller.centerOn = (id) => { const n = byId.get(id); if (n) scroller.scrollLeft = at(n).x * SPEED - scroller.clientWidth / 2; };
  requestAnimationFrame(() => { resize(); draw(); });
  return scroller;
}
