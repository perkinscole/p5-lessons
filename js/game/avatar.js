// Pixel-art characters assembled from layers. Everything is drawn from these text grids,
// so all the art is original and new items are just a few more lines of text.

// One palette of skin colors. Saved characters store a position in this list, so new colors go at
// the end; the character maker shows them sorted by shade (SKIN_ORDER), all as one set.
const SKINS = ['#ffdbb4', '#eab98c', '#c68c5b', '#8d5a36', '#5a3825', '#a5e887', '#b9b4f5'];
const lightness = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
export const SKIN_ORDER = SKINS.map((c, i) => i).sort((a, b) => lightness(SKINS[b]) - lightness(SKINS[a]));
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
  party: { name: 'Party hat', unlock: { xp: 150 }, colors: { A: '#e4619f', a: '#f4cf49' }, grid: { 0: '........a.......', 1: '.......AA.......', 2: '......AaAA......', 3: '.....AAAAaA.....' } },
  phones: { name: 'Headphones', unlock: { badge: 'composer' }, colors: { A: '#2a2b38', a: '#e4619f' }, grid: { 3: '....AAAAAAAA....', 4: '...A........A...', 5: '...a........a...', 6: '..aa........aa..', 7: '..aa........aa..' } },
  flag: { name: 'Summit banner', unlock: { badge: 'summit' }, colors: { A: '#f6f1e3', a: '#d9483b' }, grid: { 0: '.......Aaaa.....', 1: '.......Aaaa.....', 2: '.......A........', 3: '.....AAAAAA.....', 4: '....AAAAAAAA....' } },
};

const HELD = {
  none: { name: 'Empty hands', grid: {} },
  wrench: { name: 'Wrench', unlock: { badge: 'function' }, colors: { A: '#9aa5b5' }, grid: { 6: '.............A.A', 7: '.............AAA', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  brush: { name: 'Paintbrush', unlock: { badge: 'artist' }, colors: { A: '#a8743f', a: '#e4619f' }, grid: { 5: '..............a.', 6: '..............a.', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  sword: { name: 'Pixel sword', unlock: { xp: 300 }, colors: { A: '#d4dbe6', a: '#a8743f' }, grid: { 3: '..............A.', 4: '..............A.', 5: '..............A.', 6: '..............A.', 7: '..............A.', 8: '.............aaa', 9: '..............a.' } },
  book: { name: 'Book of Arrays', unlock: { badge: 'arrays' }, colors: { A: '#3567c9', a: '#f6f1e3' }, grid: { 8: '.............AAA', 9: '.............AaA', 10: '.............AAA' } },
  trophy: { name: 'Trophy', unlock: { badge: 'published' }, colors: { A: '#f4cf49', a: '#c08a1e' }, grid: { 7: '............AAAA', 8: '............aAAa', 9: '.............AA.', 10: '............aaaa' } },
  wand: { name: 'Algorithm wand', unlock: { badge: 'algorithm' }, colors: { A: '#4b3bb5', a: '#f4cf49' }, grid: { 4: '.............a.a', 5: '..............a.', 6: '.............a.a', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
};

const PETS = {
  none: { name: 'No pet', grid: [] },
  slime: { name: 'Slime', unlock: { xp: 200 }, colors: { A: '#6fd16a', a: '#1d3a1c' }, grid: ['........', '........', '..AAAA..', '.AAAAAA.', '.AaAAaA.', 'AAAAAAAA'] },
  bird: { name: 'Pixel bird', unlock: { xp: 1200 }, colors: { A: '#3fa7e0', a: '#f4cf49' }, grid: ['........', '..AA....', '.AAAAa..', 'AAAAA...', '.AAA....', '..a.a...'] },
  bot: { name: 'Tiny bot', unlock: { badge: 'classes' }, colors: { A: '#9aa5b5', a: '#d9483b' }, grid: ['...a....', '...A....', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '..A..A..'] },
  cat: { name: 'Cat', unlock: { xp: 600 }, colors: { A: '#e0913f', a: '#2b2118' }, grid: ['.A....A.', '.AA..AA.', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '..A..A..'] },
  ghost: { name: 'Loop ghost', unlock: { badge: 'loops' }, colors: { A: '#eef0fa', a: '#2b2b4a' }, grid: ['..AAAA..', '.AAAAAA.', '.AaAAaA.', '.AAAAAA.', '.AAAAAA.', '.A.AA.A.'] },
  dragon: { name: 'Baby dragon', unlock: { xp: 1800 }, colors: { A: '#d9483b', a: '#f4cf49' }, grid: ['A...A...', 'AAAAA..a', '.AaAAAAA', '.AAAAAAA', '..AA..AA', '..A....A'] },
};

// A cape hangs behind the body, so it is drawn first.
const CAPES = {
  none: { name: 'No cape', grid: {} },
  red: { name: 'Hero cape', unlock: { xp: 400 }, colors: { C: '#c4352b', c: '#8f231c' } },
  blue: { name: 'Game maker cape', unlock: { badge: 'first-game' }, colors: { C: '#2f5fc4', c: '#1f3f86' } },
  forest: { name: 'Trail cloak', unlock: { badge: 'trailblazer' }, colors: { C: '#2e8b57', c: '#1d5c39' } },
  royal: { name: 'Royal cape', unlock: { xp: 1600 }, colors: { C: '#7a3fc4', c: '#f4cf49' } },
  galaxy: { name: 'Galaxy cape', unlock: { badge: 'beyond' }, colors: { C: '#1c1a46', c: '#f6f1e3' } },
};
const CAPE_GRID = { 9: '...CCCCCCCCCC...', 10: '..CCCCCCCCCCCC..', 11: '..CCCCCCCCCCCC..', 12: '..CcCCCCCCCCcC..', 13: '..CCCCCCCCCCCC..', 14: '...cCCcCCcCCc...' };

// An aura outlines the whole character in a glow, with a few sparkles.
const AURAS = {
  none: { name: 'No glow' },
  spark: { name: 'Golden glow', unlock: { xp: 150 }, color: '#ffd84a' },
  ocean: { name: 'Ocean glow', unlock: { badge: 'loops' }, color: '#5cd3ff' },
  mint: { name: 'Helper glow', unlock: { badge: 'helper' }, color: '#6ff0b4' },
  ember: { name: 'Ember glow', unlock: { xp: 800 }, color: '#ff7a3d' },
  star: { name: 'Starlight', unlock: { badge: 'algorithm' }, color: '#c89bff' },
  rainbow: { name: 'Rainbow', unlock: { xp: 2000 }, color: 'rainbow' },
};
const RAINBOW = ['#ff5e5e', '#ffb13d', '#ffe14d', '#6fe07a', '#55b8ff', '#a77bff'];
const SPARKLES = [[1, 3], [14, 1], [0, 11], [15, 9]];

/** Earned titles show under a student's name. Picked from this list, never typed. */
export const TITLES = {
  none: { name: 'No title' },
  rookie: { name: 'Rookie Coder' },
  doodler: { name: 'Pixel Doodler', unlock: { xp: 100 } },
  decider: { name: 'The Decider', unlock: { badge: 'decider' } },
  loops: { name: 'Loop Wrangler', unlock: { badge: 'loops' } },
  wizard: { name: 'Function Wizard', unlock: { badge: 'function' } },
  artist: { name: 'Sprite Artist', unlock: { badge: 'artist' } },
  bugs: { name: 'Bug Squasher', unlock: { badge: 'debugger' } },
  helper: { name: 'Helpful Hero', unlock: { badge: 'helper' } },
  tester: { name: 'Playtest Pro', unlock: { badge: 'teamwork' } },
  grit: { name: 'Never Gives Up', unlock: { badge: 'persistent' } },
  idea: { name: 'Idea Machine', unlock: { badge: 'creative' } },
  stretch: { name: 'Extra Miler', unlock: { badge: 'stretch-5' } },
  arcade: { name: 'Arcade Star', unlock: { badge: 'published' } },
  composer: { name: 'Chiptune Composer', unlock: { badge: 'composer' } },
  speed: { name: 'Speedrunner', unlock: { xp: 700 } },
  knight: { name: 'Code Knight', unlock: { xp: 1200 } },
  ace: { name: 'Algorithm Ace', unlock: { badge: 'algorithm' } },
  architect: { name: '3D Architect', unlock: { badge: 'low-poly' } },
  legend: { name: 'Summit Legend', unlock: { badge: 'summit' } },
};
export const titleOf = (av) => (av && av.title && TITLES[av.title] && av.title !== 'none' ? TITLES[av.title].name : '');

// Rarity, from how hard an item is to earn. Shown with colors, and legendary items shimmer.
const LEGENDARY_BADGES = new Set(['summit', 'low-poly', 'beyond', 'algorithm', 'high-road', 'wild-road', 'star-road', 'mind-road', 'stretch-20']);
const EPIC_BADGES = new Set(['helper', 'debugger', 'creative', 'persistent', 'teamwork', 'classes', 'composer', 'published', 'loops', 'arrays', 'sorter', 'trainer']);
export const RARITY_NAMES = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
export function rarityOf(unlock) {
  if (!unlock) return 'common';
  if (unlock.badge) return LEGENDARY_BADGES.has(unlock.badge) ? 'legendary' : EPIC_BADGES.has(unlock.badge) ? 'epic' : 'rare';
  return unlock.xp > 1400 ? 'legendary' : unlock.xp > 500 ? 'epic' : 'rare';
}

export const SLOTS = {
  skin: { label: 'Skin', swatches: SKINS, order: SKIN_ORDER },
  hairColor: { label: 'Hair color', swatches: HAIRS },
  hair: { label: 'Hair', items: HAIR },
  outfit: { label: 'Outfit', swatches: OUTFITS.map((o) => o.color), locks: OUTFITS.map((o) => o.unlock), names: OUTFITS.map((o) => `${o.id[0].toUpperCase()}${o.id.slice(1)} outfit`) },
  hat: { label: 'Hat', items: HATS },
  held: { label: 'Holding', items: HELD },
  pet: { label: 'Pet', items: PETS },
  cape: { label: 'Cape', items: CAPES },
  aura: { label: 'Glow', items: AURAS },
  title: { label: 'Title', items: TITLES },
};

/** Every item that has to be earned, for the collection meter and the next-unlock list. */
export function unlockables() {
  const out = [];
  for (const [slot, def] of Object.entries(SLOTS)) {
    if (def.items) for (const [id, item] of Object.entries(def.items)) { if (item.unlock) out.push({ slot, id, name: item.name, unlock: item.unlock, key: `${slot}:${id}` }); }
    else if (def.locks) def.locks.forEach((lock, i) => { if (lock) out.push({ slot, id: i, name: def.names ? def.names[i] : `${def.label} color ${i + 1}`, unlock: lock, key: `${slot}:${i}` }); });
  }
  return out;
}
export const auraColor = (av) => { const a = AURAS[av && av.aura]; return a && a.color ? a.color : ''; };

export const defaultAvatar = (seed = '') => {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { skin: h % SKINS.length, hairColor: (h >> 3) % 5, hair: ['short', 'spiky', 'long', 'puffs'][(h >> 5) % 4], outfit: (h >> 7) % 4, hat: 'none', held: 'none', pet: 'none', cape: 'none', aura: 'none', title: 'none' };
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
  const filled = new Set();
  const put = (x, y, color) => { g.fillStyle = color; g.fillRect(x * scale, y * scale, scale, scale); if (x < 16) filled.add(`${x},${y}`); };
  const shade = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const d = (v) => Math.floor(v * 0.72).toString(16).padStart(2, '0');
    return `#${d(n >> 16)}${d((n >> 8) & 255)}${d(n & 255)}`;
  };
  const outfit = OUTFITS[a.outfit] ? OUTFITS[a.outfit].color : OUTFITS[0].color;
  const palette = { S: SKINS[a.skin] || SKINS[0], E: '#1b1b28', O: outfit, P: shade(outfit), B: '#2b2118', H: HAIRS[a.hairColor] || HAIRS[0] };
  const cape = CAPES[a.cape] || CAPES.none;
  if (cape.colors) for (const y of Object.keys(CAPE_GRID)) [...CAPE_GRID[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, cape.colors[ch]); });
  BASE.forEach((row, y) => [...row].forEach((ch, x) => { if (palette[ch]) put(x, y, palette[ch]); }));
  const overlay = (grid, colors) => {
    for (const y of Object.keys(grid)) [...grid[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, colors[ch] || palette[ch]); });
  };
  overlay((HAIR[a.hair] || HAIR.none).grid, palette);
  const hat = HATS[a.hat] || HATS.none;
  overlay(hat.grid, hat.colors || {});
  const held = HELD[a.held] || HELD.none;
  overlay(held.grid, held.colors || {});
  const aura = AURAS[a.aura] || AURAS.none;
  if (aura.color) {
    // Paint every empty cell that touches the character, then a few sparkles.
    const ring = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (filled.has(`${x},${y}`)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled.has(`${x + dx},${y + dy}`))) ring.push([x, y]);
    }
    g.globalAlpha = 0.8;
    ring.forEach(([x, y], i) => { g.fillStyle = aura.color === 'rainbow' ? RAINBOW[(x + y) % RAINBOW.length] : aura.color; g.fillRect(x * scale, y * scale, scale, scale); });
    g.globalAlpha = 1;
    SPARKLES.forEach(([x, y], i) => { if (!filled.has(`${x},${y}`)) { g.fillStyle = aura.color === 'rainbow' ? RAINBOW[i * 2 % RAINBOW.length] : '#ffffff'; g.fillRect(x * scale, y * scale, scale, scale); } });
  }
  const pet = PETS[a.pet] || PETS.none;
  pet.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') put(16 + x, 10 + y, pet.colors[ch]); }));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
