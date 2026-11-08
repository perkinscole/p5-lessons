// Pixel-art characters assembled from layers. Everything is drawn from these text grids,
// so all the art is original and new items are just a few more lines of text.

const SKINS = ['#ffdbb4', '#eab98c', '#c68c5b', '#8d5a36', '#5a3825', '#a5e887', '#b9b4f5'];
const HAIRS = ['#2b2118', '#6a3f1d', '#d9a23a', '#c4482f', '#ece6dc', '#3f6fd8', '#e05aa7'];
const OUTFITS = [
  { id: 'teal', color: '#1f9e95' }, { id: 'red', color: '#d9483b' }, { id: 'blue', color: '#3567c9' }, { id: 'gold', color: '#dca52c' },
  { id: 'violet', color: '#8350c9', unlock: { xp: 100 } }, { id: 'pink', color: '#e4619f', unlock: { xp: 300 } },
  { id: 'lime', color: '#7fc23a', unlock: { xp: 600 } }, { id: 'black', color: '#2a2b38', unlock: { xp: 1000 } },
];

const BASE = [
  '................', '................', '................', '................',
  '.....SSSSSS.....', '....SSSSSSSS....', '....SSESSESS....', '....SSSSSSSS....',
  '.....SSSSSS.....', '....OOOOOOOO....', '...SOOOOOOOOS...', '...SOOOOOOOOS...',
  '....PPPPPPPP....', '....PPP..PPP....', '....PPP..PPP....', '....BBB..BBB....',
];

const HAIR = {
  none: { name: 'Bald', grid: {} },
  short: { name: 'Short', grid: { 3: '.....HHHHHH.....', 4: '....HHHHHHHH....', 5: '....H......H....' } },
  spiky: { name: 'Spiky', grid: { 2: '....H.H..H.H....', 3: '....HHHHHHHH....', 4: '....HHHHHHHH....', 5: '....H......H....' } },
  long: { name: 'Long', grid: { 3: '.....HHHHHH.....', 4: '....HHHHHHHH....', 5: '...HH......HH...', 6: '...H........H...', 7: '...H........H...', 8: '...HH......HH...' } },
  puffs: { name: 'Puffs', grid: { 2: '..HHH......HHH..', 3: '..HHHHHHHHHHHH..', 4: '..HHHHHHHHHHHH..', 5: '....H......H....' } },
};

const HATS = {
  none: { name: 'No hat', grid: {} },
  cap: { name: 'Ball cap', unlock: { xp: 100 }, colors: { A: '#d9483b', a: '#a42f25' }, grid: { 2: '.....AAAAAA.....', 3: '....AAAAAAAA....', 4: '....AAAAAAAAaaa.' } },
  band: { name: 'Headband', unlock: { xp: 300 }, colors: { A: '#ffffff', a: '#d9483b' }, grid: { 4: '....aaAAAAaaa...', 5: '...a............' } },
  wizard: { name: 'Wizard hat', unlock: { xp: 600 }, colors: { A: '#4b3bb5', a: '#f4cf49' }, grid: { 0: '.......AA.......', 1: '......AAaA......', 2: '.....AAAAAA.....', 3: '....AAaAAAAA....', 4: '..aaaaaaaaaaaa..' } },
  helmet: { name: 'Space helmet', unlock: { xp: 1000 }, colors: { A: '#d4dbe6', a: '#7f8ca3' }, grid: { 2: '.....AAAAAA.....', 3: '....AAAAAAAA....', 4: '...AAAAAAAAAA...', 5: '...A........A...', 6: '...A........A...', 7: '...A........A...', 8: '...aAAAAAAAAa...' } },
  viking: { name: 'Horned helm', unlock: { xp: 1400 }, colors: { A: '#8e97a8', a: '#f3e7c9' }, grid: { 1: '..a..........a..', 2: '..a..AAAAAA..a..', 3: '..aaAAAAAAAAaa..', 4: '....AAAAAAAA....' } },
  crown: { name: 'Gold crown', unlock: { xp: 2300 }, colors: { A: '#f4cf49', a: '#d9483b' }, grid: { 1: '....A..AA..A....', 2: '....AAAAAAAA....', 3: '....AaAAAAaA....' } },
  flag: { name: 'Summit banner', unlock: { badge: 'summit' }, colors: { A: '#f6f1e3', a: '#d9483b' }, grid: { 0: '.......Aaaa.....', 1: '.......Aaaa.....', 2: '.......A........', 3: '.....AAAAAA.....', 4: '....AAAAAAAA....' } },
};

const HELD = {
  none: { name: 'Empty hands', grid: {} },
  wrench: { name: 'Wrench', unlock: { badge: 'function' }, colors: { A: '#9aa5b5' }, grid: { 6: '.............A.A', 7: '.............AAA', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  brush: { name: 'Paintbrush', unlock: { badge: 'artist' }, colors: { A: '#a8743f', a: '#e4619f' }, grid: { 5: '..............a.', 6: '..............a.', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  sword: { name: 'Pixel sword', unlock: { xp: 300 }, colors: { A: '#d4dbe6', a: '#a8743f' }, grid: { 3: '..............A.', 4: '..............A.', 5: '..............A.', 6: '..............A.', 7: '..............A.', 8: '.............aaa', 9: '..............a.' } },
  book: { name: 'Book of Arrays', unlock: { badge: 'arrays' }, colors: { A: '#3567c9', a: '#f6f1e3' }, grid: { 8: '.............AAA', 9: '.............AaA', 10: '.............AAA' } },
  wand: { name: 'Algorithm wand', unlock: { badge: 'algorithm' }, colors: { A: '#4b3bb5', a: '#f4cf49' }, grid: { 4: '.............a.a', 5: '..............a.', 6: '.............a.a', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
};

const PETS = {
  none: { name: 'No pet', grid: [] },
  slime: { name: 'Slime', unlock: { xp: 200 }, colors: { A: '#6fd16a', a: '#1d3a1c' }, grid: ['........', '........', '..AAAA..', '.AAAAAA.', '.AaAAaA.', 'AAAAAAAA'] },
  bot: { name: 'Tiny bot', unlock: { badge: 'classes' }, colors: { A: '#9aa5b5', a: '#d9483b' }, grid: ['...a....', '...A....', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '..A..A..'] },
  cat: { name: 'Cat', unlock: { xp: 600 }, colors: { A: '#e0913f', a: '#2b2118' }, grid: ['.A....A.', '.AA..AA.', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '..A..A..'] },
  ghost: { name: 'Loop ghost', unlock: { badge: 'loops' }, colors: { A: '#eef0fa', a: '#2b2b4a' }, grid: ['..AAAA..', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '.AAAAAA.', '.A.AA.A.'] },
  dragon: { name: 'Baby dragon', unlock: { xp: 1800 }, colors: { A: '#d9483b', a: '#f4cf49' }, grid: ['A...A...', 'AAAAA..a', '.AaAAAAA', '.AAAAAAA', '..AA..AA', '..A....A'] },
};

export const SLOTS = {
  skin: { label: 'Skin', swatches: SKINS },
  hairColor: { label: 'Hair color', swatches: HAIRS },
  hair: { label: 'Hair', items: HAIR },
  outfit: { label: 'Outfit', swatches: OUTFITS.map((o) => o.color), locks: OUTFITS.map((o) => o.unlock) },
  hat: { label: 'Hat', items: HATS },
  held: { label: 'Holding', items: HELD },
  pet: { label: 'Pet', items: PETS },
};

export const defaultAvatar = (seed = '') => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { skin: h % 5, hairColor: (h >> 3) % 5, hair: ['short', 'spiky', 'long', 'puffs'][(h >> 5) % 4], outfit: (h >> 7) % 4, hat: 'none', held: 'none', pet: 'none' };
};

/** Is an item open to this student? stats comes from statsFor(). */
export const isUnlocked = (unlock, stats) => {
  if (!unlock) return true;
  if (unlock.xp !== undefined) return stats.xp >= unlock.xp;
  if (unlock.badge) return stats.badges.includes(unlock.badge);
  return false;
};
export const unlockLabel = (unlock, badgeName) => (unlock.xp !== undefined ? `${unlock.xp} XP` : `${badgeName(unlock.badge)} badge`);

const cache = new Map();

/** Draw a character to a PNG data URL. 24 by 16 cells: 16 for the hero, 8 for the pet. */
export function avatarURL(av, scale = 6) {
  const a = { ...defaultAvatar(), ...(av || {}) };
  const key = JSON.stringify(a) + scale;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 24 * scale;
  c.height = 16 * scale;
  const g = c.getContext('2d');
  const put = (x, y, color) => { g.fillStyle = color; g.fillRect(x * scale, y * scale, scale, scale); };
  const shade = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const d = (v) => Math.floor(v * 0.72).toString(16).padStart(2, '0');
    return `#${d(n >> 16)}${d((n >> 8) & 255)}${d(n & 255)}`;
  };
  const outfit = OUTFITS[a.outfit] ? OUTFITS[a.outfit].color : OUTFITS[0].color;
  const palette = { S: SKINS[a.skin] || SKINS[0], E: '#1b1b28', O: outfit, P: shade(outfit), B: '#2b2118', H: HAIRS[a.hairColor] || HAIRS[0] };
  BASE.forEach((row, y) => [...row].forEach((ch, x) => { if (palette[ch]) put(x, y, palette[ch]); }));
  const overlay = (grid, colors) => {
    for (const y of Object.keys(grid)) [...grid[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, colors[ch] || palette[ch]); });
  };
  overlay((HAIR[a.hair] || HAIR.none).grid, palette);
  const hat = HATS[a.hat] || HATS.none;
  overlay(hat.grid, hat.colors || {});
  const held = HELD[a.held] || HELD.none;
  overlay(held.grid, held.colors || {});
  const pet = PETS[a.pet] || PETS.none;
  pet.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') put(16 + x, 10 + y, pet.colors[ch]); }));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
