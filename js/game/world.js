// The journey map's world: a blocky side-view landscape generated from the trail's own shape.
// Depth means road: sky islands, surface forest, crystal caves, deep circuit ruins. Everyone meets
// in the valleys at each Crossing. All art is drawn here in code, so there are no image files.
import { STAGES, mapLayout } from '../curriculum/graph.js';

export const COL_W = 108;
export const LANE_H = 120;
export const MARGIN = 72;
export const BOX = 18; // half the size of a lesson block
const TILE = 12; // page pixels per block
const ART = 3; // page pixels per art pixel
const T = TILE / ART; // art pixels per block
const Y0 = 282; // the middle lane, placed so every lesson block rests exactly on a row of tiles
export const ROWS = 45;

export const place = (n) => ({ x: MARGIN + n.col * COL_W, y: Y0 + n.lane * LANE_H });

export const AIR = 0;
const SOIL = 1;
const STONE = 2;
const DEEP = 3;
const BED = 4;
const ISLAND = 5;
const PLANK = 6;
const STAR_WALL = 7;
const MIND_WALL = 8;
const SHAFT = 9;
export const isSolid = (t) => t >= SOIL && t <= PLANK;

const ROW = { island: 10, branch: 20, shared: 25, starTop: 23, starBottom: 29, mindTop: 33, mindBottom: 39, deep: 36, bedrock: 43 };

/** A repeatable random number source, so the world looks the same for everyone, every time. */
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

/** Lay out the blocks. This part has no drawing in it, so the tests can check it. */
export function buildWorld() {
  const { nodes, cols } = mapLayout();
  const width = MARGIN * 2 + (cols - 1) * COL_W;
  const height = ROWS * TILE;
  const tileCols = Math.ceil(width / TILE);
  const random = makeRandom(4242);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const spans = STAGES.map((st) => {
    const ids = st.kind === 'shared' ? st.lessons : Object.values(st.branches).flat();
    const colsHere = ids.map((id) => byId.get(id).col);
    return {
      stage: st,
      from: Math.round((MARGIN + Math.min(...colsHere) * COL_W - COL_W / 2) / TILE),
      to: Math.round((MARGIN + Math.max(...colsHere) * COL_W + COL_W / 2) / TILE) - 1,
    };
  });
  spans[0].from = 0;
  spans.at(-1).to = tileCols - 1;

  const stageAt = new Array(tileCols).fill(0);
  const surface = new Array(tileCols).fill(ROW.shared);
  spans.forEach((s, i) => {
    for (let c = s.from; c <= s.to; c++) {
      stageAt[c] = i;
      if (s.stage.kind === 'branch') surface[c] = ROW.branch;
    }
  });

  // Mine shafts join the levels wherever a Crossing meets a fork.
  const shafts = [];
  spans.forEach((s, i) => {
    const next = spans[i + 1];
    if (next && s.stage.kind !== next.stage.kind) shafts.push(next.from);
  });
  for (const b of shafts) for (let c = b - 2; c <= b + 1; c++) surface[c] = ROW.shared;

  const tiles = Array.from({ length: tileCols }, (_, c) => Array.from({ length: ROWS }, (_unused, r) => {
    if (r < surface[c]) return AIR;
    if (r >= ROW.bedrock) return BED;
    if (r - surface[c] < 4) return SOIL;
    return r < ROW.deep ? STONE : DEEP;
  }));

  for (const s of spans) {
    if (s.stage.kind !== 'branch') continue;
    for (let c = s.from; c <= s.to; c++) {
      const starTop = ROW.starTop - (random() < 0.4 ? 1 : 0);
      const mindTop = ROW.mindTop - (random() < 0.4 ? 1 : 0);
      for (let r = starTop; r <= ROW.starBottom; r++) tiles[c][r] = STAR_WALL;
      for (let r = mindTop; r <= ROW.mindBottom; r++) tiles[c][r] = MIND_WALL;
    }
  }

  for (const b of shafts) {
    for (let c = b - 2; c <= b + 1; c++) {
      for (let r = ROW.shared; r <= ROW.mindBottom; r++) tiles[c][r] = SHAFT;
      tiles[c][ROW.shared] = PLANK;
    }
  }

  // Floating islands for the High Road and side trails, with plank bridges between them.
  const skyNodes = nodes.filter((n) => n.lane === -1.5);
  for (const n of skyNodes) {
    const center = place(n).x / TILE;
    for (let off = -4; off < 4; off++) {
      const reach = Math.abs(off + 0.5);
      const depth = (reach < 2 ? 4 : reach < 3 ? 3 : 2) - (random() < 0.3 ? 1 : 0);
      for (let r = 0; r < depth; r++) tiles[center + off][ROW.island + r] = ISLAND;
    }
  }
  for (const n of skyNodes) {
    if (!skyNodes.some((m) => m.col === n.col + 1 && m.stage === n.stage)) continue;
    const center = place(n).x / TILE;
    for (let c = center + 4; c < center + 5; c++) tiles[c][ROW.island] = PLANK;
  }

  const nodesIn = (stageId) => nodes.filter((n) => n.stage === stageId && !n.side);
  return { tiles, surface, spans, shafts, stageAt, skyNodes, nodes, nodesIn, tileCols, width, height };
}

// ---------------------------------------------------------------- painting

const BIOMES = {
  camp: { grass: '#66c64f', grassDark: '#3f9a3a', dirt: '#8d5c36', dirtDark: '#70472a', leaf: ['#3fa548', '#2d8440', '#69c75a'], tree: 'round' },
  fork1: { grass: '#3faa52', grassDark: '#27803f', dirt: '#7c5233', dirtDark: '#623f28', leaf: ['#2d9150', '#1f6f40', '#4fb868'], tree: 'round' },
  cross1: { grass: '#7ccb50', grassDark: '#55a33f', dirt: '#936238', dirtDark: '#774c2c', leaf: ['#4fae4a', '#37893f', '#7ccb50'], tree: 'round' },
  fork2: { grass: '#d8a431', grassDark: '#ab7a23', dirt: '#85533a', dirtDark: '#6a402e', leaf: ['#e0802c', '#b95a24', '#f2b13f'], tree: 'round' },
  cross2: { grass: '#c7c26a', grassDark: '#9c9648', dirt: '#a07848', dirtDark: '#825f38', leaf: ['#9caa4a', '#77863a', '#c7c26a'], tree: 'round' },
  cross3: { grass: '#c2d0d8', grassDark: '#8fa3b2', dirt: '#857a7c', dirtDark: '#6a6062', leaf: ['#6f9a8c', '#4f7a70', '#a7c4b8'], tree: 'pine' },
  summit: { grass: '#f1f7ff', grassDark: '#bdd3ea', dirt: '#7a7f96', dirtDark: '#5f647c', leaf: ['#3d7a6c', '#2b5e56', '#e9f3ff'], tree: 'pine' },
  sound: { grass: '#6a86ff', grassDark: '#4258d0', dirt: '#2f2a6b', dirtDark: '#241f52', leaf: ['#ffcf4a', '#e0953a', '#fff0a8'], tree: 'cap' },
  lowpoly: { grass: '#2fc4a8', grassDark: '#1c8f86', dirt: '#3b4f7a', dirtDark: '#2c3c60', leaf: ['#ff8a5c', '#d95f4a', '#ffc27a'], tree: 'facet' },
  beyond: { grass: '#a974ff', grassDark: '#7744c8', dirt: '#4c3674', dirtDark: '#3a2859', leaf: ['#e860c4', '#b03e9c', '#ff9ae0'], tree: 'cap' },
};
const biomeFor = (id) => BIOMES[id] || BIOMES.beyond;

const SKY = {
  day: ['#4f9fe4', '#86ccef', '#cdeef4'],
  dusk: ['#5a3fa8', '#c56aa8', '#f7b57f'],
  night: ['#0b0d2c', '#191c50', '#35306f'],
  nightBeyond: ['#120a33', '#2c1560', '#5a2a80'],
};
const HAZE = { day: ['#a7c3dc', '#7fae8e'], dusk: ['#8a6ab0', '#6a4a92'], night: ['#29295f', '#1c2348'], nightBeyond: ['#35205f', '#241545'] };

const rgbCache = new Map();
function rgb(hex) {
  if (!rgbCache.has(hex)) rgbCache.set(hex, [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  return rgbCache.get(hex);
}
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => { const x = rgb(a); const y = rgb(b); return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function makeCanvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const pen = {
    w, h, data, shade: 1,
    /** Set one art pixel. color is '#rrggbb' or [r, g, b]. */
    put(x, y, color) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || py < 0 || px >= w || py >= h) return;
      const c = typeof color === 'string' ? rgb(color) : color;
      const i = (py * w + px) * 4;
      data[i] = c[0] * pen.shade;
      data[i + 1] = c[1] * pen.shade;
      data[i + 2] = c[2] * pen.shade;
      data[i + 3] = 255;
    },
    rect(x, y, rw, rh, color) {
      for (let j = 0; j < rh; j++) for (let k = 0; k < rw; k++) pen.put(x + k, y + j, color);
    },
    disc(cx, cy, r, color) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) pen.put(cx + x, cy + y, color);
    },
    /** Soft light around glowing things. */
    glow(cx, cy, r, color, power = 0.4) {
      const c = rgb(color);
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.hypot(x, y) / r;
          const px = Math.floor(cx + x);
          const py = Math.floor(cy + y);
          if (d > 1 || px < 0 || py < 0 || px >= w || py >= h) continue;
          // Stepped falloff keeps the light looking like pixel art.
          const t = Math.ceil((1 - d) * 4) / 4 * power;
          const i = (py * w + px) * 4;
          for (let n = 0; n < 3; n++) data[i + n] = lerp(data[i + n], c[n], t);
        }
      }
    },
    url() {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
      return canvas.toDataURL('image/png');
    },
  };
  return pen;
}

function paintSky(pen, world, night, random) {
  const summit = world.spans.find((s) => s.stage.id === 'summit');
  const summitX = ((summit.from + summit.to + 1) / 2) * T;
  const beyondAt = (x, y) => Math.floor(smooth(summitX + 8, summitX + 70, x) * 6 + ((x + y) & 1) * 0.5) / 6;
  const sky = (x, y) => {
    const near = night ? SKY.night : SKY.day;
    const far = night ? SKY.nightBeyond : SKY.dusk;
    const t = Math.floor(Math.min(1, y / 112) * 9 + ((x + y) & 1) * 0.5) / 9;
    const stop = (list) => (t < 0.5 ? mix(list[0], list[1], t * 2) : mix(list[1], list[2], (t - 0.5) * 2));
    const a = stop(near);
    const b = stop(far);
    const k = beyondAt(x, y);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  };
  for (let y = 0; y < pen.h; y++) for (let x = 0; x < pen.w; x++) pen.put(x, y, sky(x, y));

  if (night) {
    for (let i = 0; i < pen.w / 3; i++) pen.put(random() * pen.w, random() * 74, random() < 0.2 ? '#fff4c2' : '#c9d2ff');
    pen.disc(34, 24, 9, '#f1ecd0');
    pen.disc(31, 21, 2, '#cfc9a8');
    pen.disc(38, 28, 1, '#cfc9a8');
  } else {
    pen.glow(34, 24, 22, '#fff3c0', 0.5);
    pen.disc(34, 24, 9, '#ffe27a');
    pen.disc(34, 24, 6, '#fff0ab');
  }

  // Curtains of light over Beyond the Summit.
  for (let x = Math.floor(summitX + 40); x < pen.w; x++) {
    const wave = Math.sin(x * 0.07) + Math.sin(x * 0.023 + 2);
    const color = wave > 0.2 ? '#6dffb0' : '#ff7ad9';
    const top = 8 + Math.sin(x * 0.11) * 4;
    const span = 26 + Math.abs(wave) * 14;
    const power = (night ? 0.42 : 0.22) * Math.min(1, Math.abs(wave));
    for (let y = top; y < top + span; y++) {
      const t = Math.ceil((1 - (y - top) / span) * 4) / 4 * power;
      if (t <= 0 || (x + Math.floor(y)) & 1) continue;
      const c = rgb(color);
      const i = (Math.floor(y) * pen.w + x) * 4;
      for (let n = 0; n < 3; n++) pen.data[i + n] = lerp(pen.data[i + n], c[n], t);
    }
  }

  // Far mountains, with the great peak behind the Summit, then nearer hills.
  const haze = (x, layer, y) => {
    const a = (night ? HAZE.night : HAZE.day)[layer];
    const b = (night ? HAZE.nightBeyond : HAZE.dusk)[layer];
    return mix(a, b, beyondAt(x, y));
  };
  for (let x = 0; x < pen.w; x++) {
    const jag = Math.abs(((x * 0.9) % 14) - 7) * 0.55;
    const peak = 64 * Math.exp(-(((x - summitX) / 46) ** 2));
    const top = Math.max(12, Math.floor(70 + 7 * Math.sin(x * 0.033) + 5 * Math.sin(x * 0.083 + 1) + jag - peak));
    for (let y = top; y < 112; y++) {
      const snowy = y < top + 3 + (x % 3) && top < 62;
      pen.put(x, y, snowy ? (night ? '#a9b6dc' : '#f4f9ff') : haze(x, 0, y));
    }
    const hill = Math.floor(82 + 5 * Math.sin(x * 0.051 + 2) + 3 * Math.sin(x * 0.137));
    for (let y = hill; y < 112; y++) pen.put(x, y, haze(x, 1, y));
  }
}

function paintTiles(pen, world, night) {
  const { tiles, tileCols, stageAt, spans } = world;
  const random = makeRandom(99);
  const at = (c, r) => (c < 0 || c >= tileCols || r < 0 || r >= ROWS ? null : tiles[c][r]);
  const open = (c, r) => { const t = at(c, r); return t !== null && !isSolid(t); };
  const ORES = ['#d59a4a', '#dfe7f2', '#4fe0c4', '#f3cb4f', '#ee6a7c'];

  for (let c = 0; c < tileCols; c++) {
    const biome = biomeFor(spans[stageAt[c]].stage.id);
    for (let r = 0; r < ROWS; r++) {
      const t = tiles[c][r];
      if (t === AIR) continue;
      const x0 = c * T;
      const y0 = r * T;
      const exposedTop = open(c, r - 1) && at(c, r - 1) === AIR;
      pen.shade = 1;

      if (t === STAR_WALL || t === MIND_WALL || t === SHAFT) {
        const pair = { [STAR_WALL]: ['#2a1d58', '#231849', '#32246a'], [MIND_WALL]: ['#10264a', '#0c1e3d', '#16325d'], [SHAFT]: ['#33261b', '#2a1f16', '#3d2e20'] }[t];
        const brickOffset = r % 2 ? 2 : 0;
        for (let j = 0; j < T; j++) {
          for (let i = 0; i < T; i++) {
            const seam = j === 3 || (i + brickOffset) % 4 === 3;
            pen.put(x0 + i, y0 + j, seam ? pair[1] : pair[random() < 0.08 ? 2 : 0]);
          }
        }
        continue;
      }

      if (t === PLANK) {
        pen.shade = night ? 0.75 : 1;
        pen.rect(x0, y0, T, 3, '#b67f42');
        pen.rect(x0, y0, T, 1, '#d9a35f');
        pen.rect(x0, y0 + 2, T, 1, '#7c5429');
        if (c % 2) pen.rect(x0, y0, 1, 3, '#7c5429');
        pen.shade = 1;
        continue;
      }

      const soil = t === SOIL || (t === ISLAND && r < ROW.island + 2);
      if (soil) {
        pen.shade = night ? 0.72 : 1;
        for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) pen.put(x0 + i, y0 + j, random() < 0.22 ? biome.dirtDark : biome.dirt);
      } else if (t === ISLAND || t === STONE) {
        pen.shade = t === ISLAND && night ? 0.72 : 1;
        for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) pen.put(x0 + i, y0 + j, random() < 0.2 ? '#5b5a70' : '#6c6b82');
      } else if (t === DEEP) {
        for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) pen.put(x0 + i, y0 + j, random() < 0.25 ? '#2f2e45' : '#3a3953');
      } else {
        for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) pen.put(x0 + i, y0 + j, (i + j + r) % 4 === 0 ? '#14111f' : '#221d30');
      }

      if ((t === STONE || t === DEEP) && random() < 0.11) {
        const ore = ORES[Math.floor(random() * ORES.length)];
        pen.put(x0 + 1, y0 + 1, ore);
        pen.put(x0 + 2, y0 + 1, ore);
        pen.put(x0 + 1, y0 + 2, ore);
      }

      if (exposedTop) {
        pen.rect(x0, y0, T, 1, biome.grass);
        pen.rect(x0, y0 + 1, T, 1, biome.grassDark);
        for (let i = 0; i < T; i++) if (random() < 0.45) pen.put(x0 + i, y0 + 2, biome.grassDark);
      }

      // A dark line wherever a block meets open space makes each shape read as solid.
      pen.shade = 1;
      const edge = '#20182a';
      if (!exposedTop && open(c, r - 1)) pen.rect(x0, y0, T, 1, edge);
      if (open(c, r + 1)) pen.rect(x0, y0 + T - 1, T, 1, edge);
      if (open(c - 1, r)) pen.rect(x0, y0, 1, T, edge);
      if (open(c + 1, r)) pen.rect(x0 + T - 1, y0, 1, T, edge);
    }
  }
  pen.shade = 1;
}

function drawTree(pen, x, foot, biome, random) {
  const [leaf, shadow, light] = biome.leaf;
  const tall = 9 + Math.floor(random() * 6);
  if (biome.tree === 'pine') {
    pen.rect(x - 1, foot - 5, 2, 5, '#5b3d29');
    for (let tier = 0; tier < 4; tier++) {
      const halfWidth = 7 - tier * 1.5;
      const y = foot - 5 - tier * 5;
      for (let j = 0; j < 7; j++) {
        const w = Math.floor((halfWidth * (j + 1)) / 7);
        pen.rect(x - w - 1, y - 7 + j, w * 2 + 2, 1, j > 4 ? shadow : leaf);
        if (j < 3) pen.rect(x - w - 1, y - 7 + j, w + 1, 1, light);
      }
    }
    return;
  }
  if (biome.tree === 'facet') {
    pen.rect(x - 1, foot - 6, 2, 6, '#3b4f7a');
    for (let j = 0; j < 18; j++) {
      const w = Math.floor((j + 2) / 2.2);
      pen.rect(x - w, foot - 24 + j, w, 1, light);
      pen.rect(x, foot - 24 + j, w, 1, j < 9 ? leaf : shadow);
    }
    return;
  }
  if (biome.tree === 'cap') {
    pen.rect(x - 1, foot - tall, 3, tall, '#e6dcf7');
    pen.rect(x + 1, foot - tall, 1, tall, '#b9a8d8');
    for (let y = -6; y <= 0; y++) {
      const w = Math.floor(Math.sqrt(49 - y * y) * 1.25);
      pen.rect(x - w, foot - tall + y, w * 2 + 2, 1, y < -3 ? light : y < -1 ? leaf : shadow);
    }
    pen.put(x - 4, foot - tall - 3, '#fff4fb');
    pen.put(x + 3, foot - tall - 4, '#fff4fb');
    pen.put(x, foot - tall - 2, '#fff4fb');
    pen.glow(x, foot - tall - 2, 11, light, 0.16);
    return;
  }
  pen.rect(x - 1, foot - tall, 3, tall, '#6b4629');
  pen.rect(x + 1, foot - tall, 1, tall, '#523420');
  const r = 6 + Math.floor(random() * 3);
  const cy = foot - tall - r + 3;
  for (let y = -r; y <= r; y++) {
    for (let i = -r - 1; i <= r + 1; i++) {
      if ((i * i) / 1.2 + y * y > r * r + random() * 7) continue;
      const lit = i + y < -r * 0.4;
      const dark = i + y > r * 0.75;
      pen.put(x + i, cy + y, dark ? shadow : lit ? light : leaf);
    }
  }
}

function paintSurface(pen, world, night) {
  const { surface, spans, stageAt, tileCols, nodes, skyNodes, tiles } = world;
  const random = makeRandom(1337);
  pen.shade = night ? 0.72 : 1;
  const nodeTiles = nodes.filter((n) => n.lane === 0 || n.lane === -0.5).map((n) => place(n).x / TILE);
  const clearOfNodes = (c) => nodeTiles.every((m) => Math.abs(c - m) > 2.6);

  for (let c = 1; c < tileCols - 1; c += 1) {
    const biome = biomeFor(spans[stageAt[c]].stage.id);
    if (tiles[c][surface[c]] === PLANK || tiles[c][surface[c]] === SHAFT) continue;
    const foot = surface[c] * T;
    if (clearOfNodes(c) && random() < 0.34) {
      drawTree(pen, c * T + 2, foot, biome, random);
      c += 1;
      continue;
    }
    for (let i = 0; i < T; i++) {
      const roll = random();
      if (roll < 0.28) pen.put(c * T + i, foot - 1, biome.grassDark);
      else if (roll < 0.33) { pen.put(c * T + i, foot - 1, biome.grassDark); pen.put(c * T + i, foot - 2, ['#ffe36b', '#ff8fb0', '#ffffff'][Math.floor(random() * 3)]); }
    }
  }

  // Grass, flowers, and hanging roots on the sky islands.
  for (const n of skyNodes) {
    const center = place(n).x / TILE;
    const biome = biomeFor(n.stage === 'side' ? 'camp' : n.stage);
    for (let c = center - 4; c < center + 4; c++) {
      for (let i = 0; i < T; i++) {
        if (random() < 0.3) pen.put(c * T + i, ROW.island * T - 1, biome.grassDark);
        if (random() < 0.05) pen.put(c * T + i, ROW.island * T - 1, '#ffe36b');
      }
      let bottom = ROW.island;
      while (isSolid(tiles[c][bottom])) bottom++;
      if (random() < 0.7) pen.rect(c * T + Math.floor(random() * T), bottom * T, 1, 2 + Math.floor(random() * 8), night ? '#2f6a4a' : '#3f9a5a');
    }
    drawTree(pen, (center - 3.2) * T, ROW.island * T, biome, random);
    drawTree(pen, (center + 3.2) * T, ROW.island * T, biome, random);
  }
  pen.shade = 1;
}

/** The landmarks that mark each place where the roads come together. */
function landmarkKit(pen, foot, night) {
  pen.shade = night ? 0.8 : 1;

  const tent = (x) => {
    for (let j = 0; j < 14; j++) {
      const w = j + 1;
      for (let i = -w; i <= w; i++) pen.put(x + i, foot - 14 + j, Math.abs(i) < j / 3 ? '#3b2420' : i % 4 === 0 ? '#f4efe0' : '#d9503c');
    }
    pen.rect(x, foot - 18, 1, 5, '#6b4629');
    pen.rect(x + 1, foot - 18, 4, 2, '#f4cf49');
  };
  const fire = (x) => {
    pen.rect(x - 4, foot - 2, 9, 2, '#6b4629');
    pen.shade = 1;
    pen.glow(x, foot - 5, 18, '#ffb347', 0.34);
    pen.rect(x - 2, foot - 6, 5, 4, '#f2682a');
    pen.rect(x - 1, foot - 9, 3, 4, '#f7a033');
    pen.rect(x, foot - 11, 1, 3, '#ffe27a');
    pen.shade = night ? 0.8 : 1;
  };
  const sign = (x) => {
    pen.rect(x, foot - 13, 2, 13, '#6b4629');
    pen.rect(x - 6, foot - 15, 14, 7, '#b67f42');
    pen.rect(x - 4, foot - 13, 10, 1, '#5b3d29');
    pen.rect(x - 4, foot - 11, 7, 1, '#5b3d29');
  };
  const arch = (x) => {
    const stone = (ax, ay, w, h) => {
      pen.rect(ax, ay, w, h, '#8d8ea3');
      for (let j = 3; j < h; j += 4) pen.rect(ax, ay + j, w, 1, '#67687f');
      pen.rect(ax, ay, 1, h, '#b3b4c6');
    };
    stone(x - 17, foot - 34, 5, 34);
    stone(x + 12, foot - 34, 5, 34);
    pen.rect(x - 20, foot - 38, 40, 5, '#a3a4b8');
    pen.rect(x - 20, foot - 34, 40, 1, '#67687f');
    pen.rect(x - 20, foot - 38, 40, 1, '#cfd0dd');
  };
  const cabinet = (x) => {
    pen.rect(x - 5, foot - 22, 10, 22, '#3f3a7c');
    pen.rect(x - 5, foot - 22, 10, 3, '#e36ad0');
    pen.shade = 1;
    pen.rect(x - 3, foot - 17, 6, 6, '#7dffb0');
    pen.put(x - 1, foot - 15, '#143a2a');
    pen.put(x + 1, foot - 13, '#143a2a');
    pen.glow(x, foot - 14, 10, '#7dffb0', 0.2);
    pen.shade = night ? 0.8 : 1;
    pen.rect(x - 4, foot - 9, 8, 2, '#c8c5e8');
  };
  const crate = (x, h) => {
    pen.rect(x, foot - h, 5, h, '#b67f42');
    pen.rect(x, foot - h, 5, 1, '#d9a35f');
    pen.rect(x + 4, foot - h, 1, h, '#7c5429');
    for (let j = 4; j < h; j += 4) pen.rect(x, foot - h + j, 5, 1, '#7c5429');
  };
  const flagpole = (x) => {
    for (let j = 0; j < 4; j++) pen.rect(x - 7 + j * 2, foot - 2 * j - 2, 15 - j * 4, 2, j % 2 ? '#8d8ea3' : '#a3a4b8');
    pen.rect(x, foot - 62, 2, 54, '#e9eef5');
    for (let j = 0; j < 12; j++) pen.rect(x + 2, foot - 62 + j, 16 - Math.abs(j - 6) * 2, 1, j < 6 ? '#f4cf49' : '#e0a92e');
  };
  const obelisk = (x) => {
    pen.shade = 1;
    pen.glow(x, foot - 18, 20, '#c7a8ff', 0.3);
    for (let j = 0; j < 34; j++) {
      const w = j < 7 ? j : 7 - Math.floor((j - 7) / 9);
      pen.rect(x - w / 2, foot - 34 + j, w / 2, 1, '#e8d4ff');
      pen.rect(x, foot - 34 + j, w / 2 + 1, 1, '#9b6be0');
    }
    pen.shade = night ? 0.8 : 1;
  };

  const prism = (x) => {
    for (let j = 0; j < 30; j++) {
      const w = Math.floor((j + 2) / 1.5);
      pen.rect(x - w, foot - 30 + j, w, 1, j < 15 ? '#ffd38a' : '#ff9d6a');
      pen.rect(x, foot - 30 + j, w, 1, j < 15 ? '#ff8a5c' : '#c9546a');
    }
  };
  const speaker = (x) => {
    pen.rect(x - 7, foot - 26, 14, 26, '#2b2350');
    pen.rect(x - 7, foot - 26, 14, 1, '#6a5fb0');
    pen.disc(x, foot - 8, 5, '#8a7fd0');
    pen.disc(x, foot - 8, 2, '#1a1538');
    pen.disc(x, foot - 20, 3, '#8a7fd0');
    pen.disc(x, foot - 20, 1, '#1a1538');
    pen.rect(x + 11, foot - 40, 2, 11, '#ffcf4a');
    pen.rect(x + 7, foot - 32, 5, 3, '#ffcf4a');
    pen.rect(x + 13, foot - 40, 5, 2, '#ffcf4a');
  };
  return { tent, fire, sign, arch, cabinet, crate, flagpole, obelisk, prism, speaker };
}

function paintLandmarks(pen, world, night) {
  const { tent, fire, sign, arch, cabinet, crate, flagpole, obelisk, prism, speaker } = landmarkKit(pen, ROW.shared * T, night);
  const nodeXs = (id) => world.nodesIn(id).map((n) => place(n).x / ART);

  const camp = nodeXs('camp');
  if (camp.length >= 4) {
    tent((camp[0] + camp[1]) / 2);
    fire((camp[1] + camp[2]) / 2);
    sign((camp[2] + camp[3]) / 2);
    tent((camp[3] + camp[4]) / 2);
  }
  nodeXs('cross1').forEach(arch);
  for (const x of nodeXs('cross2')) { cabinet(x - 17); cabinet(x + 17); }
  for (const x of nodeXs('cross3')) [[-24, 4], [-18, 9], [-12, 14], [8, 19], [14, 24], [20, 29]].forEach(([dx, h]) => crate(x + dx, h));
  nodeXs('summit').forEach((x) => flagpole(x + 9));
  nodeXs('lowpoly').slice(1).forEach((x) => prism(x - 18));
  nodeXs('sound').slice(1).forEach((x) => speaker(x - 18));
  for (const x of nodeXs('beyond2')) { obelisk(x - 14); obelisk(x + 14); }
  pen.shade = 1;
}

function paintCaves(pen, world) {
  const random = makeRandom(777);
  const { spans, shafts, nodes } = world;
  const clear = (lane, x) => nodes.filter((n) => n.lane === lane).every((n) => Math.abs(place(n).x / ART - x) > 9);
  const COLORS = ['#ff9df0', '#c7a8ff', '#8fe9ff'];

  const crystal = (x, y, up, color) => {
    const tall = 4 + Math.floor(random() * 6);
    for (let j = 0; j < tall; j++) {
      const w = j < 2 ? 1 : 2;
      pen.rect(x, y + (up ? -j - 1 : j), w, 1, j % 3 === 2 ? '#ffffff' : color);
    }
    pen.glow(x, y + (up ? -tall / 2 : tall / 2), 8, color, 0.3);
  };

  for (const s of spans) {
    if (s.stage.kind !== 'branch') continue;
    for (let x = s.from * T + 4; x < (s.to + 1) * T - 4; x += 5 + Math.floor(random() * 9)) {
      if (!clear(0.5, x)) continue;
      const color = COLORS[Math.floor(random() * COLORS.length)];
      crystal(x, (ROW.starBottom + 1) * T, true, color);
      if (random() < 0.7) crystal(x + 3, ROW.starTop * T, false, COLORS[Math.floor(random() * 3)]);
    }
    // Far-off stars glittering in the cave wall.
    for (let i = 0; i < (s.to - s.from) * 1.1; i++) {
      const x = s.from * T + random() * (s.to - s.from) * T;
      const y = ROW.starTop * T + 5 + random() * 16;
      const c = random() < 0.5 ? '#fff2a8' : '#c7a8ff';
      pen.put(x, y, c);
      if (random() < 0.4) { pen.put(x - 1, y, c); pen.put(x + 1, y, c); pen.put(x, y - 1, c); pen.put(x, y + 1, c); }
    }

    // Circuit traces and humming machines in the deepest level.
    const top = ROW.mindTop * T;
    const floor = (ROW.mindBottom + 1) * T;
    for (let line = 0; line < 3; line++) {
      let y = top + 4 + line * 7 + Math.floor(random() * 3);
      for (let x = s.from * T; x < (s.to + 1) * T; x++) {
        pen.put(x, y, '#2a7bb4');
        if (random() < 0.04) {
          const next = Math.min(floor - 3, Math.max(top + 2, y + (random() < 0.5 ? -3 : 3)));
          pen.rect(x, Math.min(y, next), 1, Math.abs(next - y) + 1, '#2a7bb4');
          y = next;
        }
        if (random() < 0.035) {
          pen.rect(x - 1, y - 1, 3, 3, '#8fefff');
          pen.glow(x, y, 6, '#5fd8ff', 0.28);
        }
      }
    }
    for (let x = s.from * T + 8; x < (s.to + 1) * T - 8; x += 14 + Math.floor(random() * 12)) {
      if (!clear(1.5, x)) continue;
      const tall = 12 + Math.floor(random() * 8);
      pen.rect(x, floor - tall, 7, tall, '#1b3d6b');
      pen.rect(x, floor - tall, 7, 1, '#35639c');
      for (let j = 3; j < tall - 1; j += 3) {
        pen.rect(x + 1, floor - tall + j, 5, 1, '#0d2545');
        pen.put(x + 1 + (j % 5), floor - tall + j, random() < 0.5 ? '#6dffb0' : '#8fefff');
      }
    }
  }

  // Torches light the way down the shafts.
  for (const b of shafts) {
    for (const r of [28, 33, 38]) {
      const x = (b - 2) * T + 1;
      const y = r * T;
      pen.rect(x, y, 1, 4, '#7c5429');
      pen.rect(x, y - 2, 1, 2, '#ffb347');
      pen.glow(x, y - 2, 10, '#ffb347', 0.34);
    }
  }
}

function paintWorld(world, night) {
  const pen = makeCanvas(world.tileCols * T, ROWS * T);
  const random = makeRandom(night ? 11 : 12);
  paintSky(pen, world, night, random);
  paintTiles(pen, world, night);
  paintCaves(pen, world);
  paintSurface(pen, world, night);
  paintLandmarks(pen, world, night);
  return pen.url();
}

function paintCloud(seed) {
  const pen = makeCanvas(44, 16);
  const random = makeRandom(seed);
  pen.data.fill(0);
  for (let i = 0; i < 7; i++) {
    const r = 3 + Math.floor(random() * 3);
    const x = 8 + Math.floor(random() * 28);
    pen.disc(x, 15 - r, r, '#ffffff');
  }
  for (let x = 0; x < 44; x++) {
    let bottom = -1;
    for (let y = 15; y >= 0; y--) if (pen.data[(y * 44 + x) * 4 + 3]) { bottom = y; break; }
    if (bottom > 0) pen.rect(x, bottom - 1, 1, 2, '#d6e5f3');
  }
  return pen.url();
}

let art = null;

/** The finished pictures, painted once per page load. */
export function worldArt() {
  if (!art) {
    const world = buildWorld();
    art = { width: world.width, height: world.height, day: paintWorld(world, false), night: paintWorld(world, true), clouds: [21, 22, 23].map(paintCloud) };
  }
  return art;
}

// ---------------------------------------------------------------- class display scenes

const SCENE = { W: 96, H: 72 };
const TREES_IN = { camp: [12, 84], fork1: [12, 34, 60, 84], fork2: [14, 40, 62, 84], cross1: [10, 86], summit: [12, 84], beyond: [14, 82] };

/** Sky, mountains, and trees for one stage. The left and right edges match, so it can repeat. */
function paintSceneSky(key, night) {
  const { W, H } = SCENE;
  const pen = makeCanvas(W, H);
  const random = makeRandom(key.length * 991 + (night ? 7 : 3));
  const biome = biomeFor(key);
  const far = key === 'beyond';
  const look = night ? (far ? 'nightBeyond' : 'night') : (far ? 'dusk' : 'day');
  const wave = (x, k, phase = 0) => Math.sin((Math.PI * 2 * k * x) / W + phase);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.floor(Math.min(1, y / (H * 0.8)) * 9 + ((x + y) & 1) * 0.5) / 9;
      const list = SKY[look];
      pen.put(x, y, t < 0.5 ? mix(list[0], list[1], t * 2) : mix(list[1], list[2], (t - 0.5) * 2));
    }
  }
  if (night) for (let i = 0; i < 26; i++) pen.put(random() * W, random() * 40, random() < 0.2 ? '#fff4c2' : '#c9d2ff');
  if (far) {
    for (let x = 0; x < W; x++) {
      const w = wave(x, 2) + wave(x, 5, 2);
      const c = rgb(w > 0.2 ? '#6dffb0' : '#ff7ad9');
      for (let y = 6; y < 26 + Math.abs(w) * 8; y++) {
        if ((x + y) & 1) continue;
        const i = (y * W + x) * 4;
        const t = (night ? 0.4 : 0.22) * Math.min(1, Math.abs(w));
        for (let n = 0; n < 3; n++) pen.data[i + n] = lerp(pen.data[i + n], c[n], t);
      }
    }
  }

  for (let x = 0; x < W; x++) {
    const top = key === 'summit'
      ? Math.floor(13 + Math.abs(x - W / 2) * 0.8 + wave(x, 8))
      : Math.floor(44 + 5 * wave(x, 1, 1) + 3 * wave(x, 3));
    for (let y = top; y < H; y++) pen.put(x, y, y < top + 4 + (x % 3) && top < 40 ? (night ? '#a9b6dc' : '#f4f9ff') : HAZE[look][0]);
    const hill = Math.floor(56 + 3 * wave(x, 2, 2) + 2 * wave(x, 5));
    for (let y = hill; y < H; y++) pen.put(x, y, HAZE[look][1]);
  }

  pen.shade = night ? 0.72 : 1;
  for (const x of TREES_IN[key] || []) drawTree(pen, x, H, biome, random);
  pen.shade = 1;
  return pen.url();
}

function paintSceneGround(key, night) {
  const pen = makeCanvas(24, 8);
  const random = makeRandom(key.length * 313);
  const biome = biomeFor(key);
  pen.shade = night ? 0.72 : 1;
  for (let x = 0; x < 24; x++) {
    for (let y = 0; y < 8; y++) pen.put(x, y, random() < 0.22 ? biome.dirtDark : biome.dirt);
    pen.put(x, 0, biome.grass);
    pen.put(x, 1, biome.grassDark);
    if (random() < 0.45) pen.put(x, 2, biome.grassDark);
  }
  pen.shade = 1;
  return pen.url();
}

function paintSceneMark(key, night) {
  const size = 72;
  const pen = makeCanvas(size, size);
  const kit = landmarkKit(pen, size, night);
  const c = size / 2;
  const drawn = {
    camp: () => { kit.tent(c - 14); kit.fire(c + 16); },
    cross1: () => kit.arch(c),
    cross2: () => { kit.cabinet(c - 17); kit.cabinet(c + 17); },
    cross3: () => [[-24, 4], [-18, 9], [-12, 14], [8, 19], [14, 24], [20, 29]].forEach(([dx, h]) => kit.crate(c + dx, h)),
    summit: () => kit.flagpole(c - 2),
    beyond: () => { kit.obelisk(c - 14); kit.obelisk(c + 14); },
  }[key];
  if (!drawn) return null;
  drawn();
  pen.shade = 1;
  return pen.url();
}

const scenes = new Map();

/** CSS variables holding one stage's scene, in day and night versions. */
export function stageSceneStyle(key) {
  if (!scenes.has(key)) {
    const css = (name, make) => ['day', 'night'].map((look) => {
      const url = make(key, look === 'night');
      return `--${name}-${look}:${url ? `url(${url})` : 'none'}`;
    }).join(';');
    scenes.set(key, [css('sky', paintSceneSky), css('ground', paintSceneGround), css('mark', paintSceneMark)].join(';'));
  }
  return scenes.get(key);
}
