// What each lesson stop looks like on the 3D journey map: a small building or landmark, drawn in
// code, chosen by the land it stands in and the road it is on. High roads get castles and towers,
// low roads get cave mouths, and the shared trail gets each land's own landmark.

const SIZE = 22;
const tri = (p, cx, top, rows, color, step = 1) => { for (let r = 0; r < rows; r++) p(cx - Math.floor(r * step), top + r, Math.floor(r * step) * 2 + 1, 1, typeof color === 'function' ? color(r) : color); };

const ART = {
  tent: (p) => { tri(p, 11, 6, 13, (r) => (r % 4 < 2 ? '#d9574a' : '#fff6e6'), 0.8); p(10, 12, 3, 7, '#5c3a2a'); p(11, 3, 1, 4, '#7a5a3a'); p(12, 3, 3, 2, '#ffd84a'); },
  cottage: (p) => { p(4, 11, 14, 8, '#f1e2c4'); tri(p, 11, 4, 8, '#c8554a', 1.1); p(3, 11, 16, 1, '#a8443c'); p(9, 13, 4, 6, '#7a5a3a'); p(5, 13, 3, 3, '#8fd0f0'); p(14, 13, 3, 3, '#8fd0f0'); p(15, 3, 2, 5, '#9a9aa4'); p(4, 18, 14, 1, '#cdbb98'); },
  cabin: (p) => { p(4, 11, 14, 8, '#a8744a'); for (let y = 12; y < 19; y += 2) p(4, y, 14, 1, '#8a5a34'); tri(p, 11, 5, 7, '#4f8a5b', 1.3); p(2, 11, 18, 1, '#3c6f48'); p(9, 13, 4, 6, '#5c3a2a'); p(14, 13, 3, 3, '#ffe9a8'); },
  barn: (p) => { p(4, 10, 14, 9, '#c0483c'); tri(p, 11, 4, 5, '#8a2f2a', 1.6); p(3, 9, 16, 2, '#8a2f2a'); p(8, 12, 6, 7, '#7a2a24'); p(8, 12, 6, 1, '#fff6e6'); p(10, 12, 1, 7, '#fff6e6'); p(13, 12, 1, 7, '#fff6e6'); p(10, 6, 2, 2, '#fff6e6'); },
  tower: (p) => { p(7, 6, 8, 13, '#b4b8c4'); p(6, 4, 2, 3, '#b4b8c4'); p(10, 4, 2, 3, '#b4b8c4'); p(14, 4, 2, 3, '#b4b8c4'); p(6, 6, 10, 2, '#9a9eac'); p(13, 8, 2, 11, '#9a9eac'); p(10, 14, 3, 5, '#5c4a3a'); p(9, 9, 2, 3, '#3a3f55'); p(11, 0, 1, 5, '#7a5a3a'); p(12, 0, 4, 2, '#e2574a'); },
  castle: (p) => { p(4, 9, 14, 10, '#b9bcc8'); p(2, 5, 5, 14, '#c6c9d4'); p(15, 5, 5, 14, '#c6c9d4'); for (const x of [2, 4, 6, 15, 17, 19]) p(x, 3, 1, 2, '#c6c9d4'); for (const x of [8, 10, 12, 14]) p(x, 7, 1, 2, '#b9bcc8'); p(5, 9, 2, 10, '#a3a6b3'); p(18, 5, 2, 14, '#a3a6b3'); p(9, 13, 4, 6, '#5c4a3a'); p(10, 12, 2, 1, '#5c4a3a'); p(3, 8, 2, 3, '#3a3f55'); p(16, 8, 2, 3, '#3a3f55'); p(11, 0, 1, 7, '#7a5a3a'); p(12, 0, 4, 3, '#4a7fd6'); },
  cave: (p) => { tri(p, 11, 5, 14, '#8d8794', 0.75); p(2, 14, 18, 5, '#8d8794'); p(7, 8, 4, 2, '#aaa5b0'); p(4, 15, 3, 1, '#aaa5b0'); p(7, 11, 8, 8, '#231c33'); p(8, 10, 6, 1, '#231c33'); p(9, 9, 4, 1, '#231c33'); p(6, 18, 10, 1, '#5d566a'); p(16, 12, 2, 2, '#6f6880'); p(13, 13, 1, 2, '#ffd84a'); },
  igloo: (p) => { p(3, 11, 16, 8, '#eef4f8'); p(5, 8, 12, 3, '#eef4f8'); p(8, 6, 6, 2, '#eef4f8'); for (let y = 9; y < 19; y += 3) p(3, y, 16, 1, '#cfdde6'); for (const x of [6, 11, 15]) p(x, 9, 1, 9, '#cfdde6'); p(8, 13, 6, 6, '#eef4f8'); p(9, 14, 4, 5, '#3b4a5c'); p(8, 13, 6, 1, '#cfdde6'); },
  lighthouse: (p) => { p(8, 6, 6, 13, '#fff6e6'); p(8, 9, 6, 2, '#e2574a'); p(8, 14, 6, 2, '#e2574a'); p(7, 4, 8, 2, '#3a3f55'); p(9, 2, 4, 2, '#ffe9a8'); tri(p, 11, 0, 2, '#e2574a', 1.5); p(10, 16, 2, 3, '#5c4a3a'); p(6, 18, 10, 1, '#9a9aa4'); },
  windmill: (p) => { p(8, 8, 6, 11, '#e9dcc0'); p(7, 13, 8, 6, '#e9dcc0'); tri(p, 11, 5, 3, '#b5524a', 1.6); p(10, 15, 2, 4, '#6b4a2b'); p(2, 6, 18, 1, '#7a5a3a'); p(11, 0, 1, 14, '#7a5a3a'); p(2, 4, 5, 2, '#fff6e6'); p(15, 7, 5, 2, '#fff6e6'); p(12, 0, 2, 5, '#fff6e6'); p(9, 9, 2, 5, '#fff6e6'); },
  shroom: (p) => { p(8, 11, 6, 8, '#f3ead8'); p(3, 6, 16, 5, '#d77fd0'); p(5, 4, 12, 2, '#d77fd0'); p(8, 3, 6, 1, '#d77fd0'); p(5, 6, 3, 2, '#ffffff'); p(13, 5, 2, 2, '#ffffff'); p(15, 8, 2, 2, '#ffffff'); p(3, 10, 16, 1, '#b05fb0'); p(10, 14, 2, 5, '#7a5a3a'); p(9, 12, 1, 2, '#ffe9a8'); p(12, 12, 1, 2, '#ffe9a8'); },
  darktower: (p) => { p(8, 5, 6, 14, '#5d4a80'); p(7, 3, 2, 3, '#5d4a80'); p(13, 3, 2, 3, '#5d4a80'); p(12, 5, 2, 14, '#463866'); tri(p, 11, 0, 3, '#8a4ac0', 1); p(10, 15, 2, 4, '#231c33'); p(9, 8, 2, 3, '#7df0e6'); p(6, 18, 10, 1, '#463866'); },
  pyramid: (p) => { for (let r = 0; r < 14; r++) { p(11 - r * 0.75 | 0, 5 + r, (r * 0.75 | 0) + 1, 1, '#f0c871'); p(12, 5 + r, r * 0.75 | 0, 1, '#d49f4c'); } p(10, 14, 3, 5, '#6b4a2b'); p(10, 13, 3, 1, '#b8894a'); },
  shrine: (p) => { p(5, 12, 12, 7, '#f1e2c4'); p(3, 10, 16, 2, '#c8554a'); p(5, 8, 12, 2, '#c8554a'); p(7, 6, 8, 2, '#c8554a'); p(9, 14, 4, 5, '#7a5a3a'); p(4, 18, 14, 1, '#9a9aa4'); p(11, 0, 1, 6, '#ffffff'); p(12, 0, 5, 3, '#ffd23f'); },
};

const urls = new Map();
/** A stop's picture as an image address. */
export function stopArt(kind) {
  if (!urls.has(kind)) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const g = canvas.getContext('2d');
    (ART[kind] || ART.cottage)((x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); });
    urls.set(kind, canvas.toDataURL('image/png'));
  }
  return urls.get(kind);
}

// The landmark each land puts on the shared trail. More than one means they take turns.
const LANDMARK = {
  camp: ['tent', 'cottage', 'tent'], forest: ['cabin'], lake: ['lighthouse', 'cottage'], autumn: ['barn', 'cottage'], highland: ['tower', 'cabin'],
  snow: ['igloo', 'cabin', 'shrine'], alpine: ['windmill', 'cottage', 'barn'], grove: ['shroom'], crystal: ['shroom', 'darktower'], dusk: ['darktower', 'shroom'], desert: ['pyramid', 'tent', 'pyramid', 'tent', 'shrine'],
};
/**
 * Which building a stop is. `lane` is the road (below 0 is high, above 0 is low), `k` counts stops
 * along that road within the stage, and `summit` marks the last lesson of the core.
 */
export function stopKind({ lane, side, land, k = 0, summit = false }) {
  if (summit) return 'shrine';
  if (side) return 'tower';
  if (lane >= 1) return 'cave';
  if (lane > 0) return k % 2 ? 'cabin' : 'cave';
  if (lane <= -1) return k % 2 ? 'tower' : 'castle';
  if (lane < 0) return k % 2 ? 'cabin' : 'cottage';
  const list = LANDMARK[land] || ['cottage'];
  return list[k % list.length];
}
export const STOP_KINDS = Object.keys(ART);
