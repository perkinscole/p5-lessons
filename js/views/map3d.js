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
import { buildHeights, grain, lumps } from '../game/terrain.js';
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
/** Stronger colour and contrast, for land that would otherwise look washed out. */
function vivid(c, sat, con) {
  const r = c & 255;
  const g = (c >> 8) & 255;
  const b = (c >> 16) & 255;
  const grey = (r + g + b) / 3;
  const ch = (v) => Math.max(0, Math.min(255, (grey + (v - grey) * sat - 128) * con + 128));
  return pack(ch(r), ch(g), ch(b));
}
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

  const landAt = (x) => { let i = 0; while (i + 1 < spans.length && x * ART >= spans[i + 1].x0) i++; return landFor(i); };
  // Mountains, pyramids, and some of the crystals are made of land, not drawn on it.
  const spire = (t) => t.kind === 'crystal' && grain(t.x, t.y, 12) < 0.55;
  const bumps = [
    ...plan.things.filter((t) => SHAPED.has(t.kind)),
    ...plan.things.filter(spire).map((t) => ({ kind: 'spire', x: t.x, y: t.y, tall: 48 + Math.floor(grain(t.x, t.y, 13) * 6) * STEP, tint: Math.floor(grain(t.x, t.y, 14) * 3) })),
  ];
  // Hills roll everywhere except along the trails and round the stops, which stay level.
  const calm = onTrail.slice();
  for (const st of stops) { const cx = Math.round(st.x / ART); const cy = Math.round(st.y / ART); for (let dy = -7; dy <= 5; dy++) for (let dx = -8; dx <= 8; dx++) if (cx + dx >= 0 && cx + dx < w && cy + dy >= 0 && cy + dy < rows) calm[(cy + dy) * w + cx + dx] = 1; }
  // Each land has its own lie: the camp and the lake are gentle, the highlands and the snow are rough.
  const ROUGH = { camp: 0.5, forest: 1.1, lake: 0.35, autumn: 1, highland: 1.7, snow: 1.4, alpine: 0.9, grove: 0.8, crystal: 1.1, dusk: 0.9, desert: 1.25 };
  const H = buildHeights({ w, h: rows, terraces, bumps, calm, hills: 46, hillScale: (x) => ROUGH[landAt(x)] || 1, step: STEP, block: BLOCK });

  // Water: the lake land is half pools, the alpine meadow has tarns, and the desert has an oasis
  // or two. A pool is a block lower than the ground, and never touches a trail.
  const wet = new Uint8Array(w * rows);
  const POOLS = { lake: 0.5, alpine: 0.72, desert: 0.8, camp: 0.8 };
  for (let by = 0; by < rows; by += BLOCK) for (let bx = 0; bx < w; bx += BLOCK) {
    const want = POOLS[landAt(bx)];
    if (!want || H[by * w + bx] > STEP || H[by * w + bx] < 0 || lumps(bx / 21, by / 15, 11) < want) continue;
    let near = false;
    for (let dy = -6; dy <= BLOCK + 6 && !near; dy += 3) for (let dx = -6; dx <= BLOCK + 6; dx += 3) { const x = bx + dx; const y = by + dy; if (x >= 0 && y >= 0 && x < w && y < rows && calm[y * w + x]) { near = true; break; } }
    if (near) continue;
    for (let y = by; y < Math.min(rows, by + BLOCK); y++) for (let x = bx; x < Math.min(w, bx + BLOCK); x++) { H[y * w + x] = -STEP; wet[y * w + x] = 1; }
  }

  const C = new Uint32Array(g.getImageData(0, 0, w, rows).data.buffer.slice(0));
  // S is what each block's sides are made of: earth under grass, stone in the mountains, sandstone in the desert.
  const S = new Uint32Array(w * rows);
  const SIDES = { snow: [140, 146, 162], highland: [138, 130, 118], desert: [212, 166, 96], grove: [128, 96, 140], crystal: [118, 122, 160], dusk: [112, 86, 128], autumn: [142, 98, 64] };
  const EARTH = [146, 104, 68];
  const SPIRE = [[[150, 236, 232], [86, 178, 190]], [[214, 180, 250], [150, 112, 206]], [[255, 190, 216], [214, 124, 164]]];
  const made = new Uint8Array(w * rows); // 1 mountain, 2 pyramid, 3 to 5 a crystal spire
  for (const b of bumps) for (let y = Math.max(0, b.y - 16); y <= Math.min(rows - 1, b.y + 16); y++) for (let x = Math.max(0, b.x - 16); x <= Math.min(w - 1, b.x + 16); x++) {
    const d = b.kind === 'pyramid' ? Math.max(Math.abs(x - b.x), Math.abs(y - b.y)) : Math.hypot(x - b.x, y - b.y);
    if (b.kind === 'spire') { if (d < 5 && H[y * w + x] >= b.tall) made[y * w + x] = 3 + b.tint; } else if (d < (b.kind === 'peak' ? 15 : 13) && H[y * w + x] > 30) made[y * w + x] = b.kind === 'peak' ? 1 : 2;
  }
  // Anything standing throws a small shadow on the ground under it.
  const shade = new Float32Array(w * rows).fill(1);
  for (const t of plan.things) if (!FLAT.has(t.kind) && !SHAPED.has(t.kind) && !spire(t)) for (let dy = -1; dy <= 2; dy++) for (let dx = -3; dx <= 5; dx++) { const x = t.x + dx; const y = t.y + dy; if (x >= 0 && y >= 0 && x < w && y < rows) shade[y * w + x] = 0.8; }

  // What grows or lies on each land, speckled over its blocks.
  const DOTS = {
    camp: [0.025, [[255, 255, 255], [255, 216, 74], [255, 150, 190]]],
    forest: [0.05, [[58, 124, 70], [74, 142, 84]]],
    lake: [0.03, [[255, 255, 255], [255, 170, 204]]],
    autumn: [0.11, [[226, 120, 44], [200, 70, 48], [238, 178, 62]]],
    highland: [0.06, [[150, 150, 158], [176, 176, 184]]],
    snow: [0.07, [[196, 224, 244], [255, 255, 255]]],
    alpine: [0.1, [[255, 255, 255], [255, 216, 74], [255, 140, 190], [170, 140, 255]]],
    grove: [0.05, [[120, 240, 230], [240, 150, 220]]],
    crystal: [0.05, [[160, 240, 255], [220, 190, 255]]],
    dusk: [0.06, [[120, 240, 230], [255, 220, 120]]],
    desert: [0.04, [[250, 232, 180], [206, 170, 110]]],
  };
  // A land's own light: the dusk land sits under a darker, purpler sky, and snow glares.
  const LIGHT = { dusk: [0.74, 0.68, 0.92], grove: [0.92, 0.86, 1], crystal: [0.9, 0.94, 1.05], snow: [1.04, 1.05, 1.08], desert: [1.05, 1.0, 0.9], autumn: [1.05, 0.98, 0.88], forest: [0.9, 0.98, 0.9] };

  for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const land = landAt(x);
    const bx = (x / BLOCK) | 0;
    const by = (y / BLOCK) | 0;
    const tall = H[i];
    const side = made[i] === 1 ? [136, 140, 154] : made[i] === 2 ? [222, 174, 96] : made[i] >= 3 ? SPIRE[made[i] - 3][1] : (SIDES[land] || EARTH);
    S[i] = pack(side[0], side[1], side[2]);
    if (made[i] === 1) C[i] = tall > 96 || (land === 'snow' && tall > 48) ? pack(250, 252, 255) : pack(164, 168, 182);
    else if (made[i] === 2) C[i] = pack(244, 206, 120);
    else if (made[i] >= 3) { const c = SPIRE[made[i] - 3][0]; C[i] = pack(c[0], c[1], c[2]); } else if (wet[i]) {
      // Water: deep blue with a slow pattern of lighter ripples.
      const ripple = lumps(x / 3 + y / 7, y / 2.2, 15);
      C[i] = land === 'snow' ? pack(190, 226, 244) : ripple > 0.7 ? pack(150, 214, 240) : ripple > 0.45 ? pack(74, 160, 214) : pack(54, 136, 198);
    } else if (!onTrail[i]) {
      // Bare stone shows through on the highest ground of the rough lands.
      if ((land === 'highland' || land === 'snow') && tall >= 36 && land === 'highland') C[i] = pack(158, 156, 160);
      const dots = DOTS[land];
      if (dots && grain(x, y, 20) < dots[0]) { const c = dots[1][Math.floor(grain(x, y, 21) * dots[1].length)]; C[i] = pack(c[0], c[1], c[2]); } else C[i] = vivid(C[i], 1.32, 1.1);
    }
    if (onTrail[i]) { C[i] = vivid(C[i], 1.15, 1.08); continue; }

    // Light. The sun is low in the north-west: a block is in shadow when something taller stands
    // that way, corners where a taller block sits behind or in front are dimmer, and high ground
    // catches more light than low.
    let k = shade[i];
    for (let d = 1; d <= 7; d++) {
      const xx = x - d * 2;
      const yy = y - d;
      if (xx < 0 || yy < 0) break;
      if (H[yy * w + xx] - tall > d * 5.2) { k *= 0.66; break; }
    }
    if ((y + 1 < rows && H[i + w] > tall) || (y > 0 && H[i - w] > tall) || (x > 0 && H[i - 1] > tall)) k *= 0.88;
    k *= 1 + Math.max(-0.1, Math.min(0.14, tall / 520));
    // Texture: every block is a slightly different shade, each cell is speckled, and a line marks
    // where one block meets the next, brighter on the lit edge and darker on the far one.
    k *= 0.93 + grain(bx, by, 3) * 0.14 + (grain(x, y, 4) - 0.5) * 0.08;
    if (x % BLOCK === 0 || y % BLOCK === 0) k *= 1.04; else if (x % BLOCK === BLOCK - 1 || y % BLOCK === BLOCK - 1) k *= 0.9;
    const light = LIGHT[land];
    const c = tone(C[i], k);
    C[i] = light ? pack(Math.min(255, (c & 255) * light[0]), Math.min(255, ((c >> 8) & 255) * light[1]), Math.min(255, ((c >> 16) & 255) * light[2])) : c;
    if (light) S[i] = pack(side[0] * light[0], side[1] * light[1], Math.min(255, side[2] * light[2]));
  }

  const heightAt = (x, t) => H[Math.max(0, Math.min(rows - 1, Math.round(t / ART))) * w + Math.max(0, Math.min(w - 1, Math.round(x / ART)))];
  // Some things stand bigger than their drawing: a giant mushroom should tower, a tent should be a tent.
  const GROW = { bigshroom: 1.9, oak: 1.25, maple: 1.3, pine: 1.3, snowpine: 1.25, cabin: 1.4, tent: 1.4, palm: 1.4, crystal: 1.3, flag: 1.5, boulder: 1.2, cactus: 1.15 };
  const standing = plan.things.filter((t) => !FLAT.has(t.kind) && !SHAPED.has(t.kind) && !spire(t) && !wet[Math.min(rows - 1, t.y) * w + Math.min(w - 1, t.x)])
    .map((t) => ({ x: t.x * ART, z: depthOf(t.y * ART), lift: heightAt(t.x * ART, t.y * ART), grow: GROW[t.kind] || 1, art: spritePixels(t.kind, (t.x + t.y) % 3) }))
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
      const scale = (ART * 1.25 * s.grow) / s.z / PX;
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
          const seam = a % BLOCK === 0 ? 0.78 : 1;
          const grassy = c;
          for (let yy = top; yy < stop; yy++, at2 += W) {
            if (taken[at2]) continue;
            // How far down the side this pixel is, in world height: darker at each block line,
            // lighter just under the lip, and shaded a little more toward the bottom.
            const down = (yy - top) / k;
            const line = down % STEP < 1.6 ? 0.72 : 1;
            let px = down < 2.2 ? tone(grassy, 0.8) : tone(side, seam * line * (0.92 - Math.min(0.3, down / 330)) * (0.93 + grain(a, (down / 3) | 0, 6) * 0.14));
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
