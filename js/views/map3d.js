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
import { buildHeights, cliffAt } from '../game/terrain.js';
import { standingOn, showCrowd, pointsAlong } from './map.js';

const ART = 3; // page pixels per art pixel of the ground picture
const PX = 2; // page pixels per pixel of the 3D picture, which is drawn small and scaled up
const VIEW_H = 640;
const OFF = 300; // the ground picture has this much extra land behind the furthest road
const LAND_H = 860;
const HORIZON = 40;
const CAM_H = 407;
const STRETCH = 1.45; // the world is widened, so far-off stops still have room for their names
// How far away each lane is. Lane 0 is the shared trail down the middle.
const MID = 1.2415;
const PER_LANE = 0.2477;
const depthOf = (t) => MID - ((t - OFF - 282) / 120) * PER_LANE;
const rowOf = (z) => OFF + 282 + ((MID - z) / PER_LANE) * 120;
// How high each road runs: the further from the middle, the higher or deeper.
const LIFT = { '-1.5': 150, '-0.5': 60, '0.5': -40, '1.5': -60 };
const NEAR = depthOf(LAND_H - 1);
const FAR = 7;

/** A road's colour may be written as a style variable. A canvas needs the colour itself. */
function solid(color) {
  const m = /^var\((--[\w-]+)\)$/.exec(String(color).trim());
  return m ? (getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#888888') : color;
}

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
  const H = buildHeights({ w, h: rows, terraces, bumps });
  const C = new Uint32Array(g.getImageData(0, 0, w, rows).data.buffer.slice(0));
  const landAt = (x) => { let i = 0; while (i + 1 < spans.length && x * ART >= spans[i + 1].x0) i++; return landFor(i); };

  // Colour the land by its shape: stone where it drops away, snow on the peaks, lit and shaded faces.
  for (const b of bumps) {
    const snowy = landAt(b.x) === 'snow';
    for (let y = Math.max(0, b.y - 12); y <= Math.min(rows - 1, b.y + 12); y++) for (let x = Math.max(0, b.x - 12); x <= Math.min(w - 1, b.x + 12); x++) {
      const tall = H[y * w + x];
      if (tall < 8) continue;
      const lit = x < b.x ? 1.08 : 0.86;
      if (b.kind === 'pyramid') C[y * w + x] = tone(pack(240, 200, 113), (y > b.y ? 1.05 : 0.92) * lit);
      else C[y * w + x] = tall > 52 || (snowy && tall > 30) ? tone(pack(255, 255, 255), x < b.x ? 1 : 0.9) : tone(pack(170, 174, 186), lit);
    }
  }
  for (let y = 0; y < rows - 1; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const drop = cliffAt(H, w, rows, x, y);
    if (onTrail[i]) continue;
    if (drop > 5) { const [r, gr, b] = rgb(groundOf(landAt(x))[0]); C[i] = tone(pack(155 * 0.75 + r * 0.25, 142 * 0.75 + gr * 0.25, 125 * 0.75 + b * 0.25), (x + y) % 7 < 4 ? 1 : 0.88); } else if (drop > 1.6) C[i] = tone(C[i], 0.9);
    else if (drop < -1.6) C[i] = tone(C[i], 1.07);
  }

  const heightAt = (x, t) => H[Math.max(0, Math.min(rows - 1, Math.round(t / ART))) * w + Math.max(0, Math.min(w - 1, Math.round(x / ART)))];
  const standing = plan.things.filter((t) => !FLAT.has(t.kind) && !SHAPED.has(t.kind))
    .map((t) => ({ x: t.x * ART, z: depthOf(t.y * ART), lift: heightAt(t.x * ART, t.y * ART), art: spritePixels(t.kind, (t.x + t.y) % 3) }))
    .sort((a, b) => a.z - b.z);
  return { nodes, byId, spans, width, w, rows, H, C, heightAt, standing, at };
}

const worlds = new Map();
const worldFor = (myPath) => { const key = myPath || ''; if (!worlds.has(key)) worlds.set(key, buildWorld(myPath)); return worlds.get(key); };

/** The 3D map. Returns the element to put on the page. */
export function buildMap3d({ board, meId = null, myPath = null, myDone = new Set(), onNode }) {
  const world = worldFor(myPath);
  const { nodes, byId, spans, width, w, rows, H, C, heightAt, standing, at } = world;
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
    const name = lesson.title.length > 16 ? `${lesson.title.slice(0, 15)}…` : lesson.title;
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
    // The sky is the same every frame: pale at the horizon, bluer above.
    sky = new Uint32Array(HI);
    for (let y = 0; y < HI; y++) { const k = Math.min(1, y / (HORIZON / PX + 40)); sky[y] = pack(150 + 76 * k, 200 + 36 * k, 236 + 4 * k); }
  }

  function draw() {
    if (!W) resize();
    const cx = (W * PX) / 2;
    const camX = (scroller.scrollLeft + cx) / SPEED;
    for (let y = 0; y < HI; y++) buf.fill(sky[y], y * W, (y + 1) * W);
    // Far hills on the horizon, which slide past slowly as you scroll.
    const ridgeBase = Math.round((HORIZON + CAM_H / FAR) / PX) + 2;
    for (let i = 0; i < W; i++) {
      const u = i * PX + camX * 0.12;
      const ridge = Math.round(10 + Math.sin(u * 0.011) * 7 + Math.sin(u * 0.031 + 2) * 4 + Math.sin(u * 0.07) * 2);
      for (let y = Math.max(0, ridgeBase - ridge); y < ridgeBase; y++) buf[y * W + i] = pack(186, 204, 220);
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
      const fog = z > 1.75 ? Math.min(0.85, (z - 1.75) / 3.2) : 0;
      const lift = HORIZON / PX;
      const k = s / PX;
      for (let i = 0; i < W; i++, ax += perCol) {
        const a = ax < 0 ? 0 : ax >= w ? w - 1 : ax | 0;
        let y = (lift + (CAM_H - H[base + a]) * k) | 0;
        if (y < 0) y = 0;
        if (y >= ybuf[i]) continue;
        let c = C[base + a];
        if (fog) c = pack((c & 255) + (FOG[0] - (c & 255)) * fog, ((c >> 8) & 255) + (FOG[1] - ((c >> 8) & 255)) * fog, ((c >> 16) & 255) + (FOG[2] - ((c >> 16) & 255)) * fog);
        for (let yy = y, at2 = y * W + i; yy < ybuf[i]; yy++, at2 += W) if (!taken[at2]) buf[at2] = c;
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
      const size = Math.max(0.8, Math.min(1.2, 0.9 / p.z + 0.16));
      p.el.style.display = '';
      p.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) scale(${size.toFixed(3)})`;
      // Nearer stops sit in front of further ones, and anyone standing on one comes to the front.
      p.el.style.zIndex = String(Math.round(300 - p.z * 100) + (p.busy ? 200 : 0));
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
