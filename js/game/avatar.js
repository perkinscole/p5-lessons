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
  beanie: { name: 'Beanie', unlock: { xp: 50 }, colors: { A: '#3567c9', a: '#f6f1e3' }, grid: { 1: '.......aa.......', 2: '.....AAAAAA.....', 3: '....AAAAAAAA....', 4: '....aaaaaaaa....' } },
  tophat: { name: 'Top hat', unlock: { xp: 400 }, colors: { A: '#23232f', a: '#c4352b' }, grid: { 0: '.....AAAAAA.....', 1: '.....AAAAAA.....', 2: '.....AAAAAA.....', 3: '.....aaaaaa.....', 4: '...AAAAAAAAAA...' } },
  cowboy: { name: 'Cowboy hat', unlock: { xp: 500 }, colors: { A: '#a8743f', a: '#6a4522' }, grid: { 1: '......AAAA......', 2: '.....AAAAAA.....', 3: '.....aaaaaa.....', 4: '.AAAAAAAAAAAAAA.' } },
  chef: { name: 'Chef hat', unlock: { xp: 250 }, colors: { A: '#ffffff', a: '#d4dbe6' }, grid: { 0: '....AAAAAAAA....', 1: '...AAAAAAAAAA...', 2: '....AAAAAAAA....', 3: '.....AaAaAa.....', 4: '.....AAAAAA.....' } },
  pirate: { name: 'Pirate hat', unlock: { xp: 900 }, colors: { A: '#23232f', a: '#f6f1e3' }, grid: { 1: '......AAAA......', 2: '....AAAaaAAA....', 3: '...AAAAaaAAAA...', 4: '..AAAAAAAAAAAA..' } },
  bunny: { name: 'Bunny ears', unlock: { xp: 350 }, colors: { A: '#ffffff', a: '#f7a8c8' }, grid: { 0: '.....A....A.....', 1: '.....a....a.....', 2: '.....a....a.....', 3: '.....A....A.....' } },
  propeller: { name: 'Propeller cap', unlock: { xp: 200 }, colors: { A: '#3567c9', a: '#f4cf49', b: '#d9483b' }, grid: { 1: '....bbbaabbb....', 2: '.......aa.......', 3: '.....AAaaAA.....', 4: '....AAaAAaAA....' } },
  halo: { name: 'Halo', unlock: { badge: 'helper' }, colors: { A: '#ffe14d' }, grid: { 1: '.....AAAAAA.....', 2: '....A......A....' } },
  flag: { name: 'Summit banner', unlock: { badge: 'summit' }, colors: { A: '#f6f1e3', a: '#d9483b' }, grid: { 0: '.......Aaaa.....', 1: '.......Aaaa.....', 2: '.......A........', 3: '.....AAAAAA.....', 4: '....AAAAAAAA....' } },
};

const HELD = {
  none: { name: 'Empty hands', grid: {} },
  wrench: { name: 'Wrench', unlock: { badge: 'function' }, colors: { A: '#9aa5b5' }, grid: { 6: '.............A.A', 7: '.............AAA', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  brush: { name: 'Paintbrush', unlock: { badge: 'artist' }, colors: { A: '#a8743f', a: '#e4619f' }, grid: { 5: '..............a.', 6: '..............a.', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.' } },
  sword: { name: 'Pixel sword', unlock: { xp: 300 }, colors: { A: '#d4dbe6', a: '#a8743f' }, grid: { 3: '..............A.', 4: '..............A.', 5: '..............A.', 6: '..............A.', 7: '..............A.', 8: '.............aaa', 9: '..............a.' } },
  book: { name: 'Book of Arrays', unlock: { badge: 'arrays' }, colors: { A: '#3567c9', a: '#f6f1e3' }, grid: { 8: '.............AAA', 9: '.............AaA', 10: '.............AAA' } },
  trophy: { name: 'Trophy', unlock: { badge: 'published' }, colors: { A: '#f4cf49', a: '#c08a1e' }, grid: { 7: '............AAAA', 8: '............aAAa', 9: '.............AA.', 10: '............aaaa' } },
  hoop: { name: 'Basketball', unlock: { xp: 150 }, colors: { A: '#e8792b', a: '#7a3a12' }, grid: { 8: '.............AA.', 9: '............AaAA', 10: '............AAaA', 11: '.............AA.' } },
  football: { name: 'Football', unlock: { xp: 250 }, colors: { A: '#8a4b22', a: '#ffffff' }, grid: { 9: '.............AA.', 10: '............AaaA', 11: '.............AA.' } },
  soccer: { name: 'Soccer ball', unlock: { xp: 200 }, colors: { A: '#ffffff', a: '#23232f' }, grid: { 12: '.............AA.', 13: '............AaAA', 14: '............AAaA', 15: '.............AA.' } },
  stick: { name: 'Hockey stick', unlock: { xp: 450 }, colors: { A: '#c9a26a', a: '#23232f' }, grid: { 6: '..............A.', 7: '..............A.', 8: '..............A.', 9: '..............A.', 10: '..............A.', 11: '..............A.', 12: '..............A.', 13: '..............A.', 14: '............aaa.' } },
  guitar: { name: 'Guitar', unlock: { xp: 700 }, colors: { A: '#c4352b', a: '#f4cf49', b: '#6a4522' }, grid: { 5: '..............b.', 6: '..............b.', 7: '..............b.', 8: '.............AA.', 9: '............AaAA', 10: '............AAAA', 11: '.............AA.' } },
  pizza: { name: 'Pizza slice', unlock: { xp: 100 }, colors: { A: '#f4cf49', a: '#c4352b', b: '#c9a26a' }, grid: { 8: '............bbbb', 9: '............AaAA', 10: '.............AA.', 11: '.............A..' } },
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

// Things worn on the face. H is the student's own hair colour, so a beard matches their hair.
const FACES = {
  none: { name: 'Nothing', grid: {} },
  stache: { name: 'Mustache', unlock: { xp: 100 }, grid: { 7: '.....HHHHHH.....' } },
  goatee: { name: 'Goatee', unlock: { xp: 200 }, grid: { 7: '......H..H......', 8: '......HHHH......' } },
  beard: { name: 'Big beard', unlock: { xp: 500 }, grid: { 6: '....H......H....', 7: '....HHH..HHH....', 8: '....HHHHHHHH....', 9: '.....HHHHHH.....' } },
  glasses: { name: 'Glasses', unlock: { xp: 50 }, colors: { A: '#d9483b' }, grid: { 6: '....AAEAAEAA....' } },
  shades: { name: 'Cool shades', unlock: { xp: 300 }, colors: { A: '#16161f', a: '#8fd3ff' }, grid: { 6: '....AAaAAAaA....' } },
  monocle: { name: 'Monocle', unlock: { xp: 400 }, colors: { A: '#f4cf49' }, grid: { 5: '........AAA.....', 6: '........AEA.....', 7: '........AAA.....', 8: '..........A.....', 9: '..........A.....' } },
  mask: { name: 'Hero mask', unlock: { xp: 350 }, colors: { A: '#23232f', a: '#ffffff' }, grid: { 5: '....AAAAAAAA....', 6: '....AAaAAaAA....' } },
  patch: { name: 'Eye patch', unlock: { xp: 250 }, colors: { A: '#16161f' }, grid: { 5: '....AAAAAAAA....', 6: '........AAA.....' } },
  clown: { name: 'Clown nose', unlock: { xp: 150 }, colors: { A: '#e2332b' }, grid: { 7: '.......AA.......' } },
  blush: { name: 'Rosy cheeks', unlock: { xp: 75 }, colors: { A: '#f58fa8' }, grid: { 7: '....A......A....' } },
};

// A costume replaces the clothes and can add something to the head (drawn over the hair) and a cape
// of its own. S is the student's skin and E their eyes, so every costume fits every character.
// All of them are our own designs: a sport or a kind of hero, never a real team, person or character.
const COSTUMES = {
  none: { name: 'My own clothes' },
  hoops: { name: 'Hoops star', unlock: { xp: 200 }, colors: { J: '#552583', j: '#fdb927', W: '#ffffff' },
    body: { 9: '....SjJJJJjS....', 10: '...SSJJjjJJSS...', 11: '...S.JJjjJJ.S...', 12: '....JJJJJJJJ....', 13: '....jJJ..JJj....', 14: '....SSS..SSS....', 15: '....WWW..WWW....' },
    head: { 4: '....jjjjjjjj....' } },
  football: { name: 'Football player', unlock: { xp: 450 }, colors: { A: '#c4352b', a: '#ffffff', G: '#9aa5b5', W: '#f6f1e3', k: '#23232f' },
    body: { 9: '..AAAAAAAAAAAA..', 10: '..AAAAaaaaAAAA..', 11: '...SAAaaaaAAS...', 12: '....WWWWWWWW....', 13: '....WWW..WWW....', 14: '....WWW..WWW....', 15: '....kkk..kkk....' },
    head: { 2: '.....AAAAAA.....', 3: '....AAAaaAAA....', 4: '....AAAaaAAA....', 5: '....A......A....', 6: '....A......A....', 7: '....AGGGGGGA....', 8: '.....G.GG.G.....' } },
  soccer: { name: 'Soccer player', unlock: { xp: 300 }, colors: { C: '#3fa7e0', W: '#ffffff', N: '#1f2f6b', k: '#23232f' },
    body: { 9: '....CWCWCWCW....', 10: '...SCWCWCWCWS...', 11: '...SCWCWCWCWS...', 12: '....NNNNNNNN....', 13: '....SSS..SSS....', 14: '....CCC..CCC....', 15: '....kkk..kkk....' } },
  hockey: { name: 'Hockey player', unlock: { xp: 600 }, colors: { J: '#1f7a4d', j: '#ffffff', G: '#23232f', k: '#d4dbe6', V: '#9aa5b5' },
    body: { 9: '...JJJJJJJJJJ...', 10: '...GJJjjjjJJG...', 11: '...GjjjjjjjjG...', 12: '....GGGGGGGG....', 13: '....GGG..GGG....', 14: '....jjj..jjj....', 15: '...kkkk.kkkk....' },
    head: { 2: '.....JJJJJJ.....', 3: '....JJJJJJJJ....', 4: '....JJjjjjJJ....', 5: '....V......V....', 6: '....V......V....', 7: '....VV....VV....' } },
  bat: { name: 'Night Bat', unlock: { xp: 1000 }, colors: { A: '#23232f', D: '#4a4d5e', y: '#f4cf49', w: '#ffffff' }, cape: { C: '#23232f', c: '#3a3d4e' },
    body: { 9: '....DDDDDDDD....', 10: '...ADDAyyADDA...', 11: '...ADDDAADDDA...', 12: '....yyyyyyyy....', 13: '....DDD..DDD....', 14: '....DDD..DDD....', 15: '....AAA..AAA....' },
    head: { 2: '....A......A....', 3: '....AA....AA....', 4: '....AAAAAAAA....', 5: '....AAAAAAAA....', 6: '....AAwAAwAA....', 7: '....AA....AA....' } },
  cat: { name: 'Cat costume', unlock: { xp: 350 }, colors: { A: '#e0913f', b: '#f6e2c0', p: '#f58fa8', k: '#2b2118' },
    body: { 9: '....AAAAAAAA....', 10: '...AAAbbbbAAA.A.', 11: '...AAAbbbbAAA.A.', 12: '....AAbbbbAAAA..', 13: '....AAA..AAA....', 14: '....AAA..AAA....', 15: '....bbb..bbb....' },
    head: { 2: '....A......A....', 3: '....AA....AA....', 4: '....ApAAAApA....', 7: '..k.S..pp..S.k..', 8: '...k.SSSSSS.k...' } },
  ninja: { name: 'Ninja', unlock: { xp: 800 }, colors: { A: '#23232f', r: '#c4352b' },
    body: { 9: '....AAAAAAAA....', 10: '...AAAAAAAAAA...', 11: '...AAAAAAAAAA...', 12: '....rrrrrrrr....', 13: '....AAA..AAA....', 14: '....AAA..AAA....', 15: '....AAA..AAA....' },
    head: { 3: '.....AAAAAA.....', 4: '....AAAAAAAA....', 5: '....rrrrrrrrrr..', 7: '....AAAAAAAA....', 8: '.....AAAAAA.....' } },
  hero: { name: 'Super hero', unlock: { xp: 700 }, colors: { A: '#2f5fc4', r: '#d9483b', y: '#f4cf49' }, cape: { C: '#d9483b', c: '#a42f25' },
    body: { 9: '....AAAAAAAA....', 10: '...SAAAyyAAAS...', 11: '...SAAyyyyAAS...', 12: '....rrrrrrrr....', 13: '....AAA..AAA....', 14: '....AAA..AAA....', 15: '....rrr..rrr....' } },
  tux: { name: 'Fancy tuxedo', unlock: { xp: 550 }, colors: { A: '#23232f', W: '#ffffff', r: '#c4352b', k: '#16161f' },
    body: { 9: '....AArWWrAA....', 10: '...SAAAWWAAAS...', 11: '...SAAAWWAAAS...', 12: '....AAAAAAAA....', 13: '....AAA..AAA....', 14: '....AAA..AAA....', 15: '....kkk..kkk....' } },
  astro: { name: 'Astronaut suit', unlock: { xp: 1200 }, colors: { W: '#eef0fa', b: '#3567c9', g: '#9aa5b5', r: '#d9483b' },
    body: { 9: '...WWWWWWWWWW...', 10: '...gWWbbrWWWg...', 11: '...gWWbbbWWWg...', 12: '....gggggggg....', 13: '....WWW..WWW....', 14: '....WWW..WWW....', 15: '...ggg....ggg...' } },
  robot: { name: 'Robot', unlock: { badge: 'classes' }, colors: { G: '#9aa5b5', g: '#6b7688', y: '#f4cf49', r: '#d9483b', c: '#5cd3ff' },
    body: { 9: '...GGGGGGGGGG...', 10: '...gGGyGGrGGg...', 11: '...gGGGccGGGg...', 12: '....gggggggg....', 13: '....GGG..GGG....', 14: '....GGG..GGG....', 15: '...ggg....ggg...' },
    head: { 1: '.......r........', 2: '.......g........', 3: '....GGGGGGGG....', 4: '....GGGGGGGG....', 5: '....GGGGGGGG....', 6: '....GcGGGGcG....', 7: '....GGGGGGGG....', 8: '....GgggggGG....' } },
  dino: { name: 'Dino onesie', unlock: { xp: 900 }, colors: { A: '#4fae52', b: '#d9f0a8', y: '#f4cf49', w: '#ffffff' },
    body: { 9: '....AAAAAAAA....', 10: '...AAAbbbbAAAA..', 11: '...AAAbbbbAAAAA.', 12: '....AAbbbbAA.AA.', 13: '....AAA..AAA....', 14: '....AAA..AAA....', 15: '...AAAA..AAAA...' },
    head: { 1: '......y.y.y.....', 2: '.....AAAAAA.....', 3: '....AwAAAAwA....', 4: '....AAAAAAAA....', 5: '...AA......AA...', 6: '...A........A...', 7: '...A........A...', 8: '...AA......AA...' } },
  knight: { name: 'Knight armour', unlock: { xp: 1500 }, colors: { G: '#b9c2d0', g: '#7f8ca3', r: '#c4352b', y: '#f4cf49' },
    body: { 9: '...GGGGGGGGGG...', 10: '...gGGGyyGGGg...', 11: '...gGGGyyGGGg...', 12: '....gggggggg....', 13: '....GGG..GGG....', 14: '....GGG..GGG....', 15: '....ggg..ggg....' },
    head: { 1: '.......rr.......', 2: '.....GGrrGG.....', 3: '....GGGGGGGG....', 4: '....GGGGGGGG....', 5: '....Gg....gG....', 7: '....GgGggGgG....', 8: '.....GGGGGG.....' } },
  wizard: { name: 'Wizard robe', unlock: { badge: 'function' }, colors: { A: '#4b3bb5', a: '#f4cf49' },
    body: { 9: '....AAAAAAAA....', 10: '...AAAAaAAAAA...', 11: '...SAAAAAaAAS...', 12: '....AaAAAAAA....', 13: '....AAAAAAAA....', 14: '...AAAAAaAAAA...', 15: '...aaaaaaaaaa...' } },
  pirate: { name: 'Pirate', unlock: { xp: 650 }, colors: { r: '#c4352b', W: '#f6f1e3', b: '#6a4522', k: '#23232f', y: '#f4cf49' },
    body: { 9: '....rWrWrWrW....', 10: '...SrWrWrWrWS...', 11: '...SrWrWrWrWS...', 12: '....bbbyybbb....', 13: '....kkk..kkk....', 14: '....kkk..kkk....', 15: '....bbb..bbb....' } },
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
  face: { label: 'Face', items: FACES },
  costume: { label: 'Costume', items: COSTUMES },
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
  return { skin: h % SKINS.length, hairColor: (h >> 3) % 5, hair: ['short', 'spiky', 'long', 'puffs'][(h >> 5) % 4], outfit: (h >> 7) % 4, face: 'none', costume: 'none', hat: 'none', held: 'none', pet: 'none', cape: 'none', aura: 'none', title: 'none' };
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
export function avatarURL(av, scale = 6, { hand = false } = {}) {
  const a = { ...defaultAvatar(), ...(av || {}) };
  const key = JSON.stringify(a) + scale + (hand ? 'hand' : '');
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
  const costume = COSTUMES[a.costume] || COSTUMES.none;
  // A cape the student chose wins over the one that comes with a costume.
  const picked = CAPES[a.cape] || CAPES.none;
  const cape = picked.colors ? picked : costume.cape ? { colors: costume.cape } : picked;
  if (cape.colors) for (const y of Object.keys(CAPE_GRID)) [...CAPE_GRID[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, cape.colors[ch]); });
  const overlay = (grid, colors = {}) => {
    for (const y of Object.keys(grid)) [...grid[y]].forEach((ch, x) => { if (ch !== '.') put(x, +y, colors[ch] || palette[ch]); });
  };
  BASE.forEach((row, y) => [...row].forEach((ch, x) => { if (palette[ch]) put(x, y, palette[ch]); }));
  if (costume.body) overlay(costume.body, costume.colors);
  if (hand) {
    // A raised hand, for a student asking for help: the right arm goes up beside the head.
    for (const y of [10, 11]) { g.clearRect(12 * scale, y * scale, scale, scale); filled.delete(`12,${y}`); }
    put(12, 9, palette.O);
    put(13, 9, palette.O);
    for (const y of [8, 7, 6]) put(13, y, palette.S);
    for (const [x, y] of [[13, 5], [14, 5], [13, 4], [14, 4], [12, 4], [13, 3], [14, 3]]) put(x, y, palette.S);
  }
  overlay((HAIR[a.hair] || HAIR.none).grid, palette);
  if (costume.head) overlay(costume.head, costume.colors);
  const face = FACES[a.face] || FACES.none;
  overlay(face.grid, face.colors);
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

/** A pet on its own, 8 by 6 cells, for Trail Quest where it follows the hero around. */
export function petURL(id, scale = 1) {
  const pet = PETS[id];
  if (!pet || !pet.grid.length) return '';
  const key = `pet:${id}:${scale}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 8 * scale;
  c.height = 6 * scale;
  const g = c.getContext('2d');
  pet.grid.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = pet.colors[ch]; g.fillRect(x * scale, y * scale, scale, scale); } }));
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
