// Sprite Studio (a small built-in pixel editor), the library, and the project picker.
import { h, clear, toast, attempt, modal, confirmBox } from '../ui.js';
import { app } from '../main.js';
import { starterSprites } from '../sprites/library.js';

const PALETTE = ['#1b1b28', '#5e6878', '#9aa5b5', '#ffffff', '#5c3a1f', '#8a5a33', '#c68c5b', '#ffdbb4', '#a42f25', '#d9483b', '#ee8f35', '#f4cf49', '#2f7d3a', '#5cb85a', '#a5e887', '#1f9e95', '#284f9c', '#3f7fe0', '#66d9e8', '#8350c9', '#e4619f'];
const PISKEL_URL = 'https://www.piskelapp.com/p/create/sprite';

const blank = (size) => Array.from({ length: size * size }, () => null);

function framesToPNG(frames, size) {
  const c = document.createElement('canvas');
  c.width = size * frames.length;
  c.height = size;
  const g = c.getContext('2d');
  frames.forEach((f, n) => f.forEach((col, i) => {
    if (!col) return;
    g.fillStyle = col;
    g.fillRect(n * size + (i % size), Math.floor(i / size), 1, 1);
  }));
  return c.toDataURL('image/png');
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('That image could not be read.'));
    img.src = url;
  });
}

/** Read a sprite sheet back into editable frames. Frames are assumed to be square. */
async function pngToFrames(url) {
  const img = await loadImage(url);
  const size = img.height;
  if (size > 64) throw new Error('That image is over 64 pixels tall. Export a smaller size.');
  if (img.width % size !== 0) throw new Error('Frames must be square and side by side.');
  const count = img.width / size;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const frames = [];
  for (let n = 0; n < count; n++) {
    const d = g.getImageData(n * size, 0, size, size).data;
    const f = blank(size);
    for (let i = 0; i < size * size; i++) {
      if (d[i * 4 + 3] > 40) f[i] = `#${[d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    }
    frames.push(f);
  }
  return { frames, size };
}

/** The editor. Calls onSave({name, data_url, frames, w, h}) when the student saves. */
function spriteEditor({ initial, name: startName = '', onSave, saveLabel = 'Save sprite' }) {
  let size = initial?.size || 16;
  let frames = initial?.frames || [blank(size)];
  let at = 0;
  let color = PALETTE[9];
  let tool = 'pen';
  let mirror = false;
  let onion = true;
  const undoStack = [];

  const cv = h('canvas.pixel-canvas', { width: 448, height: 448, 'aria-label': 'Pixel drawing area' });
  const g = cv.getContext('2d');
  const strip = h('div.frames');
  const previewCv = h('canvas.pixel-preview', { width: 96, height: 96, 'aria-label': 'Animation preview' });
  const nameInput = h('input', { value: startName, maxlength: 40, placeholder: 'hero', 'aria-label': 'Sprite name', pattern: '[A-Za-z_][A-Za-z0-9_]*' });
  const toolsBox = h('div.tools');
  const palBox = h('div.palette');
  const custom = h('input', { type: 'color', value: color, 'aria-label': 'Custom color', oninput: (e) => { color = e.target.value; drawPalette(); } });

  const snap = () => { undoStack.push(JSON.stringify({ frames, size })); if (undoStack.length > 60) undoStack.shift(); };
  const undo = () => {
    const prev = undoStack.pop();
    if (!prev) return;
    ({ frames, size } = JSON.parse(prev));
    at = Math.min(at, frames.length - 1);
    draw();
    drawStrip();
  };

  function draw() {
    const px = cv.width / size;
    g.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      g.fillStyle = (x + y) % 2 ? '#e7e4d8' : '#f6f4ea';
      g.fillRect(x * px, y * px, px, px);
    }
    if (onion && at > 0) {
      g.globalAlpha = 0.25;
      frames[at - 1].forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect((i % size) * px, Math.floor(i / size) * px, px, px); } });
      g.globalAlpha = 1;
    }
    frames[at].forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect((i % size) * px, Math.floor(i / size) * px, px, px); } });
    g.strokeStyle = 'rgba(0,0,0,.08)';
    g.beginPath();
    for (let i = 0; i <= size; i++) { g.moveTo(i * px, 0); g.lineTo(i * px, cv.height); g.moveTo(0, i * px); g.lineTo(cv.width, i * px); }
    g.stroke();
  }

  function thumb(frame) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const t = c.getContext('2d');
    frame.forEach((col, i) => { if (col) { t.fillStyle = col; t.fillRect(i % size, Math.floor(i / size), 1, 1); } });
    return c;
  }

  function drawStrip() {
    clear(strip);
    frames.forEach((f, i) => {
      strip.append(h('button.frame', { 'aria-pressed': i === at ? 'true' : 'false', 'aria-label': `Frame ${i + 1}`, onclick: () => { at = i; draw(); drawStrip(); } }, thumb(f)));
    });
  }

  function drawPalette() {
    clear(palBox);
    PALETTE.forEach((c) => palBox.append(h('button.swatch', { style: `background:${c}`, 'aria-label': `Color ${c}`, 'aria-pressed': c === color ? 'true' : 'false', onclick: () => { color = c; if (tool === 'erase' || tool === 'pick') tool = 'pen'; drawTools(); drawPalette(); } })));
    palBox.append(custom);
  }

  function drawTools() {
    clear(toolsBox);
    [['pen', 'Pencil'], ['erase', 'Eraser'], ['fill', 'Fill'], ['pick', 'Pick color']].forEach(([id, label]) => {
      toolsBox.append(h('button.btn.small', { 'aria-pressed': tool === id ? 'true' : 'false', onclick: () => { tool = id; drawTools(); } }, label));
    });
    toolsBox.append(
      h('button.btn.small', { 'aria-pressed': mirror ? 'true' : 'false', onclick: () => { mirror = !mirror; drawTools(); } }, 'Mirror'),
      h('button.btn.small', { 'aria-pressed': onion ? 'true' : 'false', onclick: () => { onion = !onion; draw(); drawTools(); }, title: 'See the last frame faintly while you draw' }, 'Ghost frame'),
      h('button.btn.small', { onclick: undo }, 'Undo'),
    );
  }

  const cellAt = (e) => {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * size);
    const y = Math.floor((e.clientY - r.top) / r.height * size);
    return x >= 0 && y >= 0 && x < size && y < size ? { x, y } : null;
  };
  const setPx = (x, y, val) => {
    const f = frames[at];
    f[y * size + x] = val;
    if (mirror) f[y * size + (size - 1 - x)] = val;
  };
  const flood = (x, y) => {
    const f = frames[at];
    const target = f[y * size + x];
    if (target === color) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= size || cy >= size || f[cy * size + cx] !== target) continue;
      f[cy * size + cx] = color;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };
  let painting = false;
  let lastCell = null;
  const applyAt = (cell) => {
    if (tool === 'pen') setPx(cell.x, cell.y, color);
    if (tool === 'erase') setPx(cell.x, cell.y, null);
  };
  cv.addEventListener('pointerdown', (e) => {
    const cell = cellAt(e);
    if (!cell) return;
    e.preventDefault();
    if (tool === 'pick') {
      const c = frames[at][cell.y * size + cell.x];
      if (c) { color = c; custom.value = c; tool = 'pen'; drawTools(); drawPalette(); }
      return;
    }
    snap();
    if (tool === 'fill') { flood(cell.x, cell.y); draw(); drawStrip(); return; }
    painting = true;
    cv.setPointerCapture(e.pointerId);
    lastCell = cell;
    applyAt(cell);
    draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const cell = cellAt(e);
    if (!cell) return;
    // Fill the gap between pointer events, so fast strokes stay connected.
    const steps = Math.max(Math.abs(cell.x - lastCell.x), Math.abs(cell.y - lastCell.y), 1);
    for (let i = 1; i <= steps; i++) {
      applyAt({ x: Math.round(lastCell.x + (cell.x - lastCell.x) * i / steps), y: Math.round(lastCell.y + (cell.y - lastCell.y) * i / steps) });
    }
    lastCell = cell;
    draw();
  });
  const stopPaint = () => { if (painting) { painting = false; drawStrip(); } };
  cv.addEventListener('pointerup', stopPaint);
  cv.addEventListener('pointercancel', stopPaint);

  let previewFrame = 0;
  const pg = previewCv.getContext('2d');
  const timer = setInterval(() => {
    if (!previewCv.isConnected) { clearInterval(timer); return; }
    previewFrame = (previewFrame + 1) % frames.length;
    pg.imageSmoothingEnabled = false;
    pg.clearRect(0, 0, 96, 96);
    pg.drawImage(thumb(frames[previewFrame]), 0, 0, 96, 96);
  }, 220);

  const importFile = h('input', {
    type: 'file', accept: 'image/png,image/gif', class: 'visually-hidden', id: 'sprite-import',
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
      const got = await attempt(() => pngToFrames(url));
      if (got) { snap(); ({ frames, size } = got); at = 0; draw(); drawStrip(); toast(`Imported ${frames.length} frame${frames.length > 1 ? 's' : ''}.`); }
    },
  });

  const sizeSelect = h('select', {
    'aria-label': 'Sprite size',
    onchange: async (e) => {
      const next = +e.target.value;
      if (next === size) return;
      if (frames.some((f) => f.some(Boolean)) && !(await confirmBox('Change the size?', 'This starts over with a blank sprite. You can use Undo to go back.', 'Start over'))) { e.target.value = size; return; }
      snap();
      size = next;
      frames = [blank(size)];
      at = 0;
      draw();
      drawStrip();
    },
  }, [16, 24, 32].map((n) => h('option', { value: n, selected: n === size }, `${n} × ${n}`)));

  draw();
  drawStrip();
  drawTools();
  drawPalette();

  return h('div.sprite-editor',
    h('div.editor-main', cv),
    h('div.editor-side.stack',
      toolsBox,
      palBox,
      h('div.stack.tight',
        h('h3', 'Frames'),
        strip,
        h('div.row',
          h('button.btn.small', { onclick: () => { snap(); frames.splice(at + 1, 0, blank(size)); at++; draw(); drawStrip(); } }, 'New frame'),
          h('button.btn.small', { onclick: () => { snap(); frames.splice(at + 1, 0, [...frames[at]]); at++; draw(); drawStrip(); } }, 'Duplicate frame'),
          h('button.btn.small', { disabled: false, onclick: () => { if (frames.length < 2) return; snap(); frames.splice(at, 1); at = Math.max(0, at - 1); draw(); drawStrip(); } }, 'Delete frame'),
        ),
      ),
      h('div.row.preview-row', previewCv, h('label.field.small', h('span', 'Size'), sizeSelect)),
      h('details.hint',
        h('summary', 'Want more tools? Use Piskel'),
        h('p.small', 'Piskel is a free pixel art editor. Draw there, choose ', h('strong', 'Export → PNG'), ' with frames in one row, then bring it in here.'),
        h('div.row', h('a.btn.small', { href: PISKEL_URL, target: '_blank', rel: 'noopener noreferrer' }, 'Open Piskel ↗'), h('label.btn.small', { for: 'sprite-import' }, 'Import PNG'), importFile),
      ),
      h('label.field', h('span', 'Name it. Use one word, like hero'), nameInput),
      h('button.btn.primary', {
        onclick: () => {
          const name = nameInput.value.trim();
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { toast('Use one word for the name: letters and numbers only.', 'error'); nameInput.focus(); return; }
          if (!frames.some((f) => f.some(Boolean))) { toast('Draw something first!', 'error'); return; }
          onSave({ name, data_url: framesToPNG(frames, size), frames: frames.length, w: size, h: size });
        },
      }, saveLabel),
    ),
  );
}

export function spriteTile(s, actions) {
  return h('div.sprite-tile',
    h('div.sprite-img', h('img', { src: s.data_url, alt: s.name, style: `width:${s.frames * 64}px;height:64px;max-width:100%;object-fit:contain;image-rendering:pixelated` })),
    h('p.sprite-name', s.name),
    s.author_name && h('p.muted.small', s.author_name),
    s.frames > 1 && h('p.muted.small', `${s.frames} frames`),
    h('div.row.tile-actions', actions),
  );
}

async function classIdForLibrary() {
  if (app.session.role === 'student') return app.session.class.id;
  const classes = await app.store.listClasses();
  return classes[0]?.id || null;
}

/** Modal used inside a lesson: draw or pick a sprite, and put it in this project. */
export function openSpritePicker({ project, suggestedName = '', onChange }) {
  const assets = { ...project };
  modal(() => {
    const body = h('div');
    let tab = 'project';
    const tabs = h('div.tabs', { role: 'tablist' });
    const use = (name, url) => {
      assets[name] = url;
      onChange({ ...assets });
      toast(`Added ${name}. Use it with SPRITES.${name}`);
      tab = 'project';
      draw();
    };
    const useAs = (s) => {
      modal((closeInner) => {
        const inp = h('input', { value: suggestedName || s.name, 'aria-label': 'Name in this project' });
        return h('form.stack', { onsubmit: (e) => { e.preventDefault(); const n = inp.value.trim(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) { toast('Use one word: letters and numbers only.', 'error'); return; } use(n, s.data_url); closeInner(); } },
          h('h2', 'Use in this project'), h('label.field', h('span', 'What should your code call it?'), inp), h('button.btn.primary', { type: 'submit' }, 'Use in this project'));
      });
    };
    const draw = async () => {
      clear(tabs).append(...[['project', 'In this project'], ['draw', 'Draw'], ['mine', 'My sprites'], ['class', 'Class library'], ['starter', 'Starter library']].map(([id, label]) =>
        h('button.tab', { role: 'tab', 'aria-selected': tab === id ? 'true' : 'false', onclick: () => { tab = id; draw(); } }, label)));
      clear(body);
      if (tab === 'project') {
        const names = Object.keys(assets);
        body.append(names.length
          ? h('div.sprite-grid', names.map((n) => spriteTile({ name: n, data_url: assets[n], frames: 1 }, h('button.btn.small', { onclick: () => { delete assets[n]; onChange({ ...assets }); draw(); } }, 'Remove'))))
          : h('p.muted', 'Nothing here yet. Draw a sprite, or pick one from a library.'));
        if (names.length) body.append(h('pre.snippet', h('code', `// Load it in preload():\nmyImg = loadImage(SPRITES.${names[0]});`)));
      } else if (tab === 'draw') {
        body.append(spriteEditor({
          name: suggestedName,
          saveLabel: 'Use in this project',
          onSave: async (s) => {
            await attempt(() => app.store.saveSprite(s));
            use(s.name, s.data_url);
          },
        }));
      } else {
        const list = tab === 'starter' ? starterSprites() : tab === 'mine' ? await app.store.mySprites() : await (async () => { const c = await classIdForLibrary(); return c ? app.store.listSprites(c) : []; })();
        body.append(list.length
          ? h('div.sprite-grid', list.map((s) => spriteTile(s, h('button.btn.small.primary', { onclick: () => useAs(s) }, 'Use'))))
          : h('p.muted', tab === 'mine' ? 'Sprites you draw are kept here.' : 'No shared sprites yet. Be the first! Publish one from the Sprites page.'));
      }
    };
    draw();
    return h('div.stack', h('h2', 'Sprites'), tabs, body);
  }, { wide: true });
}

export async function viewSprites(main) {
  const isStudent = app.session.role === 'student';
  const classes = isStudent ? [] : await app.store.listClasses();
  let classId = isStudent ? app.session.class.id : classes[0]?.id;
  const mineBox = h('div');
  const classBox = h('div');
  const editorBox = h('div');

  const refresh = async () => {
    const [mine, shared] = await Promise.all([app.store.mySprites(), classId ? app.store.listSprites(classId) : []]);
    clear(mineBox).append(mine.length ? h('div.sprite-grid', mine.map((s) => spriteTile(s, [
      h('button.btn.small', { onclick: () => edit(s) }, 'Edit'),
      classId && h('button.btn.small', { onclick: async () => { await attempt(() => app.store.saveSprite({ ...s, class_id: classId, published: !s.published })); toast(s.published ? 'Removed from the class library.' : 'Shared with your class!'); refresh(); } }, s.published ? 'Unshare' : 'Share'),
      h('button.btn.small', { onclick: async () => { if (await confirmBox('Delete this sprite?', `"${s.name}" will be gone for good. Projects already using it keep their copy.`, 'Delete', true)) { await attempt(() => app.store.deleteSprite(s.id)); refresh(); } } }, 'Delete'),
    ]))) : h('p.muted', 'Nothing here yet. Draw one above!'));
    clear(classBox).append(shared.length ? h('div.sprite-grid', shared.map((s) => spriteTile(s, !isStudent && h('button.btn.small', { onclick: async () => { if (await confirmBox('Remove from the class library?', `This deletes "${s.name}" for good.`, 'Remove', true)) { await attempt(() => app.store.deleteSprite(s.id)); refresh(); } } }, 'Remove')))) : h('p.muted', 'No class sprites yet. Share one of yours to get it started.'));
  };

  const showEditor = (initial, name, existing) => {
    clear(editorBox).append(spriteEditor({
      initial, name,
      onSave: async (s) => {
        const saved = await attempt(() => app.store.saveSprite({ ...(existing || {}), ...s }));
        if (saved) { toast(`Saved ${s.name}.`); showEditor(null, ''); refresh(); }
      },
    }));
  };
  const edit = async (s) => {
    const got = await attempt(() => pngToFrames(s.data_url));
    if (got) { showEditor(got, s.name, s); editorBox.scrollIntoView({ behavior: 'smooth' }); }
  };
  showEditor(null, '');
  await refresh();

  return h('div.stack',
    h('div', h('h1', 'Sprite Studio'), h('p.muted', 'Draw pixel art for your game. Frames sit side by side, so your code can animate them.')),
    h('section.card', editorBox),
    h('section.stack', h('h2', 'My sprites'), mineBox),
    !isStudent && classes.length > 1 && h('label.field.small', h('span', 'Class library for'), h('select', { onchange: (e) => { classId = e.target.value; refresh(); } }, classes.map((c) => h('option', { value: c.id }, c.name)))),
    h('section.stack', h('h2', 'Class library'), h('p.muted.small', 'Sprites made and shared by your class. Teachers can remove anything here.'), classBox),
    h('section.stack', h('h2', 'Starter library'), h('p.muted.small', 'Free to use in any game. Add these from the Sprites button in a lesson.'),
      h('div.sprite-grid', starterSprites().map((s) => spriteTile(s)))),
    h('p.small', 'Need more? ', h('a', { href: 'https://kenney.nl/assets', target: '_blank', rel: 'noopener noreferrer' }, 'Kenney'), ' and ', h('a', { href: 'https://opengameart.org', target: '_blank', rel: 'noopener noreferrer' }, 'OpenGameArt'), ' share game art you can reuse. Always check the license, and give credit.'),
  );
}
