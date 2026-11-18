// The Sound Studio: a library of sound effects, an 8-bit music maker, and the class's songs.
import { h, clear, toast, attempt, modal, confirmBox } from '../ui.js';
import { app, refreshSession } from '../main.js';
import { installSynth, cleanSong, songCode } from '../game/synth.js';

// The studio has its own synth. A student pressing Play here always means to hear it.
const synth = installSynth({}, {});
const SOUND_NAMES = synth.synthInfo.sounds;

// Every note in these scales sounds fine with the others, so nothing a student tries can sound wrong.
const SCALES = {
  bright: { label: 'Bright', lead: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'], bass: ['C3', 'D3', 'E3', 'G3', 'A3'] },
  heroic: { label: 'Heroic', lead: ['G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5'], bass: ['G2', 'A2', 'B2', 'D3', 'E3'] },
  spooky: { label: 'Spooky', lead: ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'], bass: ['A2', 'C3', 'D3', 'E3', 'G3'] },
};
const DRUM_ROWS = [['h', 'Hat'], ['s', 'Snare'], ['k', 'Kick']];
const TRACK_LABEL = { lead: 'Melody', bass: 'Bass', drums: 'Drums' };

const STARTER_SONGS = [
  { name: 'Morning Trail', song: { tempo: 132, scale: 'bright', lead: 'E5 . G5 A5 . G5 E5 . D5 . E5 G5 . E5 C5 .', bass: 'C3 . C3 . G3 . G3 . A3 . A3 . G3 . G3 .', drums: 'k . h . s . h . k . h . s . h h' } },
  { name: 'Brave Little Hero', song: { tempo: 150, scale: 'heroic', lead: 'G4 . G4 A4 B4 . D5 . E5 . D5 B4 A4 . G4 .', bass: 'G2 . D3 . G2 . D3 . E3 . B2 . D3 . A2 .', drums: 'k h s h k h s h k h s h k k s s' } },
  { name: 'Creaky Cave', song: { tempo: 96, scale: 'spooky', lead: 'A4 . . C5 . . E5 . D5 . . C5 . . A4 .', bass: 'A2 . A2 . E3 . E3 . D3 . D3 . E3 . E3 .', drums: 'k . . . s . . h k . . . s . h h' } },
];

const safeVariable = (name) => {
  const words = String(name).replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const joined = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase())).join('');
  return /^[a-z]/.test(joined) ? joined : `song${joined}`;
};

function emptyTracks() {
  return { lead: new Array(32).fill(null), bass: new Array(32).fill(null), drums: new Array(32).fill(null) };
}

/** The music maker. Returns { el, load, stop }. */
function musicMaker({ name: startName = '', onSave, onAdd }) {
  let scale = 'bright';
  let tempo = 120;
  let length = 16;
  let tracks = emptyTracks();
  let playing = false;
  let cells = {};

  const nameInput = h('input', { value: startName, maxlength: 40, placeholder: 'Name your song', 'aria-label': 'Song name' });
  const rowsFor = (track) => (track === 'drums' ? DRUM_ROWS.map((d) => d[0]) : SCALES[scale][track]);
  const labelFor = (track, value) => (track === 'drums' ? DRUM_ROWS.find((d) => d[0] === value)[1] : value);

  const currentSong = () => {
    const text = (track) => tracks[track].slice(0, length).map((row) => (row === null ? '.' : rowsFor(track)[row])).join(' ');
    return cleanSong({ tempo, scale, lead: text('lead'), bass: text('bass'), drums: text('drums') });
  };
  const hasNotes = (s) => /[A-Gksh]/i.test(`${s.lead} ${s.bass} ${s.drums}`);

  const grids = h('div.mm-grids');
  let lastColumn = null;
  const showColumn = (col) => {
    if (lastColumn !== null) (cells.columns[lastColumn] || []).forEach((c) => c.classList.remove('now'));
    lastColumn = col;
    if (col !== null) (cells.columns[col] || []).forEach((c) => c.classList.add('now'));
  };

  const paint = (cell, on) => {
    cell.classList.toggle('on', on);
    cell.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  const hear = (track, value) => {
    if (playing) return;
    if (track === 'drums') synth.playNote({ k: 80, s: 300, h: 2000 }[value], 0.06, 'triangle');
    else synth.playNote(value, 0.2, track === 'bass' ? 'triangle' : 'square');
  };

  function drawGrids() {
    cells = { columns: Array.from({ length }, () => []) };
    clear(grids).append(...['lead', 'bass', 'drums'].map((track) => {
      const rows = rowsFor(track);
      const shown = [...rows.keys()].reverse();
      const table = shown.map(() => []);
      const grid = h(`div.mm-grid.mm-${track}`, { style: `grid-template-columns:3.2rem repeat(${length}, minmax(22px, 1fr))`, role: 'group', 'aria-label': TRACK_LABEL[track] });
      shown.forEach((row, y) => {
        grid.append(h('span.mm-row', labelFor(track, rows[row])));
        for (let col = 0; col < length; col++) {
          const cell = h('button.mm-cell', {
            type: 'button',
            class: `${Math.floor(col / 4) % 2 ? 'alt' : ''}`,
            tabindex: y === 0 && col === 0 ? 0 : -1,
            'aria-label': `${TRACK_LABEL[track]}, step ${col + 1}, ${labelFor(track, rows[row])}`,
            onclick: () => {
              const wasOn = tracks[track][col] === row;
              tracks[track][col] = wasOn ? null : row;
              table.forEach((r) => paint(r[col], false));
              if (!wasOn) { paint(cell, true); hear(track, rows[row]); }
              if (playing) synth.playMusic(currentSong(), true);
            },
            onkeydown: (e) => {
              const move = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
              if (!move) return;
              e.preventDefault();
              const next = table[y + move[0]]?.[col + move[1]];
              if (next) { cell.tabIndex = -1; next.tabIndex = 0; next.focus(); }
            },
          });
          paint(cell, tracks[track][col] === row);
          table[y].push(cell);
          cells.columns[col].push(cell);
          grid.append(cell);
        }
      });
      return h('section.mm-track', h('h3.subhead', TRACK_LABEL[track]), grid);
    }));
    lastColumn = null;
  }

  const playButton = h('button.btn.primary', { type: 'button', onclick: () => (playing ? stop() : start()) }, '▶ Play');
  function start() {
    const s = currentSong();
    if (!hasNotes(s)) { toast('Click some squares first.'); return; }
    playing = true;
    playButton.textContent = '■ Stop';
    synth.onMusicStep = showColumn;
    synth.playMusic(s);
  }
  function stop() {
    playing = false;
    playButton.textContent = '▶ Play';
    synth.onMusicStep = null;
    synth.stopMusic();
    showColumn(null);
  }
  const restartIfPlaying = () => { if (playing) synth.playMusic(currentSong(), true); };

  const tempoLabel = h('output', `${tempo}`);
  const tempoInput = h('input', { type: 'range', min: 70, max: 190, value: tempo, 'aria-label': 'Speed', oninput: (e) => { tempo = +e.target.value; tempoLabel.textContent = `${tempo}`; restartIfPlaying(); } });
  const scaleSelect = h('select', { 'aria-label': 'Mood', onchange: (e) => { scale = e.target.value; drawGrids(); restartIfPlaying(); } },
    Object.entries(SCALES).map(([id, s]) => h('option', { value: id }, s.label)));
  const lengthSelect = h('select', { 'aria-label': 'Length', onchange: (e) => { length = +e.target.value; if (playing) stop(); drawGrids(); } },
    [16, 32].map((n) => h('option', { value: n }, `${n} steps`)));

  function surprise() {
    tracks = emptyTracks();
    let spot = 5;
    for (let i = 0; i < length; i++) {
      spot = Math.min(9, Math.max(0, spot + Math.floor(Math.random() * 5) - 2));
      if (Math.random() < 0.72) tracks.lead[i] = spot;
      if (i % 2 === 0) tracks.bass[i] = i % 8 < 4 ? 0 : 3;
      tracks.drums[i] = i % 8 === 4 ? 1 : i % 4 === 0 ? 2 : i % 2 === 0 ? 0 : null;
    }
    drawGrids();
    restartIfPlaying();
  }

  /** Put a saved song on the grid. */
  function load(saved, name) {
    const s = cleanSong(saved);
    if (playing) stop();
    scale = SCALES[s.scale] ? s.scale : 'bright';
    tempo = s.tempo;
    tracks = emptyTracks();
    const longest = { lead: 0, bass: 0, drums: 0 };
    for (const track of ['lead', 'bass', 'drums']) {
      const rows = rowsFor(track);
      s[track].split(/\s+/).filter(Boolean).slice(0, 32).forEach((token, i) => {
        longest[track] = i + 1;
        if (token === '.') return;
        const row = rows.indexOf(token);
        if (row !== -1) tracks[track][i] = row;
      });
    }
    length = Math.max(...Object.values(longest)) > 16 ? 32 : 16;
    scaleSelect.value = scale;
    lengthSelect.value = String(length);
    tempoInput.value = String(tempo);
    tempoLabel.textContent = `${tempo}`;
    nameInput.value = name;
    drawGrids();
  }

  const named = () => {
    const name = nameInput.value.trim();
    if (!name) { toast('Give your song a name first.', 'error'); nameInput.focus(); return null; }
    if (!hasNotes(currentSong())) { toast('Click some squares first.', 'error'); return null; }
    return name;
  };

  drawGrids();
  const root = h('div.stack.music-maker',
    h('div.row.mm-controls',
      playButton,
      h('label.field.small', h('span', 'Mood'), scaleSelect),
      h('label.field.small', h('span', 'Speed ', tempoLabel), tempoInput),
      h('label.field.small', h('span', 'Length'), lengthSelect),
      h('button.btn', { type: 'button', onclick: surprise }, 'Surprise me'),
      h('button.btn', { type: 'button', onclick: () => { tracks = emptyTracks(); if (playing) stop(); drawGrids(); } }, 'Clear')),
    h('div.mm-scroll', { tabindex: -1 }, grids),
    h('div.row.mm-save',
      h('label.field.small.grow', h('span', 'Name'), nameInput),
      onSave && h('button.btn', { type: 'button', onclick: () => { const n = named(); if (n) onSave(n, currentSong()); } }, 'Save'),
      onAdd && h('button.btn.primary', { type: 'button', onclick: () => { const n = named(); if (n) { stop(); onAdd(n, currentSong()); } } }, 'Add to my game')),
  );
  return { el: root, load, stop };
}

function soundGrid(actions) {
  return h('div.sound-grid', SOUND_NAMES.map((name) => h('div.sound-tile',
    h('button.sound-play', { type: 'button', 'aria-label': `Play ${name}`, onclick: () => synth.playSound(name) }, '▶'),
    h('code', name),
    actions && actions(name))));
}

async function copyCode(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied. Paste it into your code.');
  } catch (_) {
    // Schools and embedded pages often block the clipboard. Show the line instead.
    modal((close) => h('div.stack', h('h2', 'Copy this line'), h('pre.snippet', h('code', text)), h('button.btn', { onclick: close }, 'Done')));
  }
}

/** Library pop-up in a lesson. */
export function openSoundPicker({ onInsert }) {
  modal((close) => h('div.stack',
    h('h2', 'Sounds'),
    h('p.muted', 'Press ▶ to listen.'),
    soundGrid(onInsert && ((name) => h('button.btn.small', { type: 'button', onclick: () => { onInsert(`playSound("${name}");`); close(); } }, 'Add'))),
    h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Close')),
  ), { wide: true });
}

/** Music maker pop-up in a lesson. onAdd receives a file name and its code. */
export function openMusicMaker({ suggestedName = 'theme', onAdd }) {
  let maker;
  modal((close) => {
    maker = musicMaker({
      name: suggestedName,
      onSave: async (name, song) => { if (await attempt(() => app.store.saveSong({ name, data: JSON.stringify(song) }))) toast(`Saved ${name}.`); },
      onAdd: onAdd && ((name, song) => { const v = safeVariable(name); onAdd(`${v}.js`, songCode(song, v), v); close(); }),
    });
    const picker = h('select', { 'aria-label': 'Open a song', onchange: (e) => { const s = songs[e.target.value]; if (s) maker.load(s.song, suggestedName); } }, h('option', { value: '' }, 'Start from...'));
    let songs = [...STARTER_SONGS];
    const fill = () => songs.forEach((s, i) => picker.append(h('option', { value: i }, s.name)));
    fill();
    attempt(() => app.store.mySongs()).then((mine) => {
      if (!mine?.length) return;
      const offset = songs.length;
      const extra = mine.map((s) => ({ name: s.name, song: JSON.parse(s.data) }));
      songs = [...songs, ...extra];
      extra.forEach((s, i) => picker.append(h('option', { value: offset + i }, s.name)));
    });
    return h('div.stack',
      h('div.row.between', h('h2', 'Music Maker'), picker),
      maker.el,
      h('div.row.end', h('button.btn', { type: 'button', onclick: close }, 'Close')),
    );
  }, { wide: true, onClose: () => maker.stop() });
}

export async function viewSounds() {
  if (app.session.role === 'student') await refreshSession();
  const isStudent = app.session.role === 'student';
  // The teacher opens and closes the Music Maker for each class.
  const locked = isStudent && !app.session.class?.music_open;
  const classes = isStudent ? [] : await app.store.listClasses();
  let classId = isStudent ? app.session.class.id : classes[0]?.id;
  const mineBox = h('div');
  const classBox = h('div');
  let editing = null;

  const maker = musicMaker({
    onSave: async (name, song) => {
      const saved = await attempt(() => app.store.saveSong({ ...(editing || {}), name, data: JSON.stringify(song) }));
      if (saved) { editing = saved; toast(`Saved ${name}.`); refresh(); }
    },
  });
  const editorCard = locked
    ? h('section.card.stack', h('h2', '🔒 The Music Maker is closed'), h('p', 'Your teacher has closed it for now. You can still listen to songs and use sound effects.'))
    : h('section.card', maker.el);
  const openOnGrid = (song, name, row = null) => {
    editing = row;
    maker.load(song, name);
    editorCard.scrollIntoView({ behavior: 'smooth' });
  };
  const preview = (song) => h('button.btn.small', { type: 'button', onclick: () => { maker.stop(); synth.onMusicStep = null; synth.playMusic(song); setTimeout(() => synth.stopMusic(), 8000); } }, '▶ Listen');
  const tile = (name, by, actions) => h('div.song-tile', h('strong', name), by && h('span.muted.small', by), h('div.row.tile-actions', actions));

  async function refresh() {
    const [mine, shared] = await Promise.all([app.store.mySongs(), classId ? app.store.listSongs(classId) : []]);
    clear(mineBox).append(mine.length ? h('div.song-grid', mine.map((s) => {
      const song = JSON.parse(s.data);
      return tile(s.name, null, [
        preview(song),
        !locked && h('button.btn.small', { type: 'button', onclick: () => openOnGrid(song, s.name, s) }, 'Edit'),
        !locked && classId && h('button.btn.small', { type: 'button', onclick: async () => { await attempt(() => app.store.saveSong({ ...s, class_id: classId, published: !s.published })); toast(s.published ? 'Removed from the class library.' : 'Shared with your class.'); refresh(); } }, s.published ? 'Unshare' : 'Share'),
        h('button.btn.small', { type: 'button', onclick: async () => { if (await confirmBox('Delete this song?', `"${s.name}" will be gone for good. Games already using it keep their copy.`, 'Delete', true)) { await attempt(() => app.store.deleteSong(s.id)); refresh(); } } }, 'Delete'),
      ]);
    })) : h('p.muted', 'Nothing here yet. Make one above!'));
    clear(classBox).append(shared.length ? h('div.song-grid', shared.map((s) => {
      const song = JSON.parse(s.data);
      return tile(s.name, s.author_name, [
        preview(song),
        !locked && h('button.btn.small', { type: 'button', onclick: () => openOnGrid(song, s.name) }, 'Remix'),
        !isStudent && h('button.btn.small', { type: 'button', onclick: async () => { if (await confirmBox('Remove from the class library?', `"${s.name}" will be deleted.`, 'Remove', true)) { await attempt(() => app.store.deleteSong(s.id)); refresh(); } } }, 'Remove'),
      ]);
    })) : h('p.muted', 'No shared songs yet.'));
  }
  await refresh();
  app.cleanup = () => { maker.stop(); synth.stopMusic(); };

  return h('div.stack',
    h('div', h('h1', 'Sound Studio'), h('p.muted', 'Compose 8-bit music and find sound effects for your game.')),
    h('h2', 'Music Maker'),
    editorCard,
    h('section.stack', h('h2', 'Sound effects'), h('p.muted.small', 'In your code, write the line under a sound to play it.'),
      soundGrid((name) => h('button.btn.small', { type: 'button', onclick: () => copyCode(`playSound("${name}");`) }, 'Copy'))),
    h('section.stack', h('h2', 'My songs'), mineBox),
    !isStudent && classes.length > 1 && h('label.field.small', h('span', 'Class library for'), h('select', { onchange: (e) => { classId = e.target.value; refresh(); } }, classes.map((c) => h('option', { value: c.id }, c.name)))),
    h('section.stack', h('h2', 'Class songs'), h('p.muted.small', 'Made and shared by your class. Credit the composer if you use one.'), classBox),
    h('section.stack', h('h2', 'Starter songs'), h('p.muted.small', 'Free to use in any game, or remix them.'),
      h('div.song-grid', STARTER_SONGS.map((s) => tile(s.name, null, [preview(s.song), !locked && h('button.btn.small', { type: 'button', onclick: () => openOnGrid(s.song, s.name) }, 'Remix')])))),
  );
}
