// Animals and other small moving things for the 3D journey map. Each is a tiny pixel drawing made
// here in code, and a note of where it lives and how it moves. They are only decoration.

const ART = {
  sheep: [13, 9, (p) => { p(2, 2, 8, 5, '#f4f1ea'); p(3, 1, 6, 1, '#f4f1ea'); p(9, 3, 3, 3, '#3a3340'); p(11, 2, 1, 1, '#3a3340'); p(3, 7, 1, 2, '#3a3340'); p(8, 7, 1, 2, '#3a3340'); p(4, 3, 2, 1, '#ffffff'); }],
  deer: [13, 12, (p) => { p(2, 5, 8, 3, '#b07a48'); p(9, 2, 2, 4, '#b07a48'); p(10, 1, 3, 2, '#b07a48'); p(10, 0, 1, 1, '#7a5a3a'); p(12, 0, 1, 1, '#7a5a3a'); p(2, 8, 1, 4, '#8a5a34'); p(4, 8, 1, 3, '#8a5a34'); p(8, 8, 1, 4, '#8a5a34'); p(1, 5, 1, 1, '#f4f1ea'); p(4, 6, 1, 1, '#e3c59a'); p(6, 5, 1, 1, '#e3c59a'); }],
  duck: [8, 6, (p) => { p(1, 3, 5, 2, '#ffffff'); p(4, 1, 2, 2, '#ffffff'); p(6, 2, 1, 1, '#f39a2b'); p(5, 1, 1, 1, '#2b2350'); p(0, 5, 7, 1, 'rgba(255,255,255,.45)'); }],
  penguin: [7, 9, (p) => { p(2, 1, 3, 7, '#2b3042'); p(3, 3, 1, 4, '#ffffff'); p(1, 3, 1, 3, '#2b3042'); p(5, 3, 1, 3, '#2b3042'); p(3, 2, 1, 1, '#ffffff'); p(4, 2, 1, 1, '#f39a2b'); p(2, 8, 1, 1, '#f39a2b'); p(4, 8, 1, 1, '#f39a2b'); }],
  camel: [14, 11, (p) => { p(2, 4, 9, 3, '#c9975a'); p(4, 2, 3, 2, '#c9975a'); p(8, 2, 2, 2, '#c9975a'); p(11, 1, 1, 5, '#c9975a'); p(11, 0, 3, 2, '#c9975a'); p(2, 7, 1, 4, '#a87a44'); p(4, 7, 1, 3, '#a87a44'); p(8, 7, 1, 4, '#a87a44'); p(10, 7, 1, 3, '#a87a44'); p(1, 4, 1, 2, '#a87a44'); }],
  rabbit: [7, 7, (p) => { p(1, 3, 4, 3, '#efe7dc'); p(4, 2, 2, 2, '#efe7dc'); p(4, 0, 1, 2, '#efe7dc'); p(5, 0, 1, 2, '#e8c7c0'); p(0, 4, 1, 1, '#ffffff'); p(5, 3, 1, 1, '#2b2350'); p(2, 6, 1, 1, '#d8cfc2'); }],
  boat: [13, 12, (p) => { p(1, 8, 11, 2, '#8a5a34'); p(2, 10, 9, 1, '#6b4a2b'); p(6, 0, 1, 8, '#6b4a2b'); p(7, 1, 4, 6, '#fff6e6'); p(3, 3, 3, 4, '#f4e7cf'); p(0, 11, 13, 1, 'rgba(255,255,255,.45)'); }],
  butterfly: [5, 4, (p) => { p(0, 0, 2, 2, '#ff9ec4'); p(3, 0, 2, 2, '#ff9ec4'); p(0, 2, 2, 1, '#ffd84a'); p(3, 2, 2, 1, '#ffd84a'); p(2, 0, 1, 4, '#3a3340'); }],
  firefly: [3, 3, (p) => { p(0, 0, 3, 3, 'rgba(255, 240, 150, .45)'); p(1, 1, 1, 1, '#fff6b0'); }],
  bird: [7, 3, (p) => { p(0, 0, 2, 1, '#3a3f55'); p(2, 1, 1, 1, '#3a3f55'); p(3, 2, 1, 1, '#3a3f55'); p(4, 1, 1, 1, '#3a3f55'); p(5, 0, 2, 1, '#3a3f55'); }],
  balloon: [11, 17, (p) => { for (let i = 0; i < 9; i++) p(1 + i, 1, 1, 9, i % 2 ? '#fff6e6' : '#e2574a'); p(2, 0, 7, 1, '#e2574a'); p(2, 10, 7, 1, '#c8433a'); p(3, 11, 5, 1, '#c8433a'); p(3, 12, 1, 3, '#7a5a3a'); p(7, 12, 1, 3, '#7a5a3a'); p(3, 14, 5, 3, '#b98a5c'); }],
};

const urls = new Map();
/** A critter's drawing as an image address, with its size in art pixels. */
export function critterArt(kind) {
  if (!urls.has(kind)) {
    const [w, h, draw] = ART[kind];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    draw((x, y, ww, hh, color) => { g.fillStyle = color; g.fillRect(x, y, ww, hh); });
    urls.set(kind, { url: canvas.toDataURL('image/png'), w, h });
  }
  return urls.get(kind);
}

/**
 * Who lives where: [kind, how many, how it moves]. `water` ones only go on water; the rest never do.
 * Moves: roam (walks back and forth), hop, bob (floats), flit (darts about), twinkle.
 */
export const HABITATS = {
  camp: [['sheep', 4, 'roam'], ['rabbit', 2, 'hop'], ['butterfly', 3, 'flit']],
  forest: [['deer', 4, 'roam'], ['rabbit', 3, 'hop']],
  lake: [['duck', 6, 'bob', 'water'], ['boat', 2, 'bob', 'water'], ['sheep', 2, 'roam']],
  autumn: [['deer', 2, 'roam'], ['rabbit', 3, 'hop']],
  highland: [['sheep', 3, 'roam']],
  snow: [['penguin', 6, 'hop']],
  alpine: [['sheep', 3, 'roam'], ['butterfly', 5, 'flit'], ['duck', 2, 'bob', 'water']],
  grove: [['firefly', 9, 'twinkle'], ['butterfly', 3, 'flit']],
  crystal: [['firefly', 8, 'twinkle']],
  dusk: [['firefly', 12, 'twinkle']],
  desert: [['camel', 5, 'roam'], ['duck', 1, 'bob', 'water']],
};
