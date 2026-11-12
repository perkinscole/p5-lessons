// Pixel Trail server. Runs as the teacher who deployed it and stores everything in a Google Sheet.
//
// Security model: students never touch the Sheet. Every request goes through api(), which works out
// who is asking from their Google sign-in (never from anything the browser sends) and only runs
// what that role is allowed to do. Functions ending in _ can't be called from the browser.

const CELL_CHUNK = 45000; // A Sheets cell holds at most 50,000 characters.
const WORK_CELLS = 12;
const SPRITE_CELLS = 7;
const MAX_WORK_CHARS = CELL_CHUNK * WORK_CELLS;
const MAX_SPRITE_CHARS = CELL_CHUNK * SPRITE_CELLS;

const chunkCols_ = (n) => Array.from({ length: n }, (_, i) => `data${i + 1}`);
// Fields added after classes started using the app go at the end of the row, after the code
// columns, so rows already in a teacher's Sheet keep their columns. metaWorks_ reads them too.
const WORK_TAIL = ['step_at'];
const WORK_META = ['id', 'student_id', 'lesson_id', 'status', 'stretch_done', 'reflection', 'checks_passed', 'checks_total', 'quiz_right', 'quiz_total', 'auto_ok', 'shared', 'submitted_at', 'updated_at'];
const SONG_COLS = ['id', 'class_id', 'student_id', 'teacher_email', 'author_name', 'name', 'data', 'published', 'created_at'];
const SPRITE_META = ['id', 'class_id', 'student_id', 'teacher_email', 'author_name', 'name', 'frames', 'w', 'h', 'published', 'created_at'];

const SCHEMA = {
  Teachers: ['email', 'display_name', 'created_at'],
  // music_open: the teacher lets students use the Music Maker. Blank means closed.
  Classes: ['id', 'teacher_email', 'name', 'created_at', 'music_open'],
  Students: ['id', 'class_id', 'email', 'display_name', 'avatar', 'path', 'game_name', 'created_at', 'google_id'],
  Works: [...WORK_META, ...chunkCols_(WORK_CELLS), ...WORK_TAIL],
  Grades: ['work_id', 'scores', 'total', 'max_total', 'feedback', 'graded_at'],
  Awards: ['id', 'student_id', 'badge_id', 'note', 'created_at'],
  Sprites: [...SPRITE_META, ...chunkCols_(SPRITE_CELLS)],
  Songs: SONG_COLS,
  // holders: who is editing each file ({ file: { id, until } }). driver_id and driver_until are from
  // when a group had one keyboard; they stay so existing rows keep their columns.
  Teams: ['id', 'class_id', 'lesson_id', 'members', 'driver_id', 'driver_until', 'blame', 'started', 'doc_at', 'created_at', 'holders'],
  Contributions: ['team_id', 'lesson_id', 'student_id', 'saves', 'added', 'removed', 'last_at', 'note'],
  // lesson_id holds a lesson number like L6. Roads share numbers, so one assignment covers every road.
  GradeSync: ['class_id', 'lesson_id', 'coursework_id', 'link', 'due', 'pushed_at', 'sent', 'title', 'points'],
  Daily: ['class_id', 'plan', 'updated_at'],
  Links: ['class_id', 'course_id', 'course_name', 'synced_at'],
  Pace: ['class_id', 'term_start', 'term_end', 'updated_at'],
};
const NUMBERS = new Set(['step_at', 'stretch_done', 'checks_passed', 'checks_total', 'quiz_right', 'quiz_total', 'total', 'max_total', 'frames', 'w', 'h', 'driver_until', 'saves', 'added', 'removed']);
const BOOLEANS = new Set(['auto_ok', 'shared', 'published', 'started', 'music_open']);
const OBJECTS = new Set(['holders', 'avatar', 'scores', 'plan', 'members', 'blame', 'sent']);
const PATHS = ['platformer', 'adventure', 'arcade', 'mind'];
const ML5_PARTS = 5; // Set by the build: how many ML5_n files it made.

// Web page ----------------------------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Pixel Trail')
    // The tab icon: Google's mountain emoji, from the same servers as the app's fonts.
    .setFaviconUrl('https://fonts.gstatic.com/s/e/notoemoji/latest/26f0_fe0f/512.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Hands the browser one piece of the ml5 library, to be stitched back together there. */
function libraryPart_(me, i) {
  const n = Number(i);
  if (!Number.isInteger(n) || n < 0 || n >= ML5_PARTS) return '';
  // Each piece is stored inside a text/plain script tag, which Apps Script needs. Send just the text.
  return HtmlService.createHtmlOutputFromFile(`ML5_${n}`).getContent().replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '');
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// The only door in --------------------------------------------------------------------------------

function api(method, argsJson) {
  try {
    const me = whoAmI_();
    const routes = me.role === 'teacher' ? TEACHER_ROUTES : me.role === 'student' ? STUDENT_ROUTES : {};
    if (method === 'batch') return reply_(runBatch_(me, routes, JSON.parse(argsJson || '[]')[0]));
    return reply_(route_(me, routes, method, JSON.parse(argsJson || '[]')));
  } catch (e) {
    console.error(`${method}: ${e && e.stack}`);
    return JSON.stringify({ ok: false, error: String((e && e.message) || e) });
  }
}

function route_(me, routes, method, args) {
  if (method === 'session') return sessionFor_(me);
  if (!Object.prototype.hasOwnProperty.call(routes, method)) throw new Error('You do not have access to that.');
  if (!Array.isArray(args)) throw new Error('Bad request.');
  return routes[method](me, ...args);
}

/** Several calls in one trip, since each trip costs about a second. Each still goes through route_. */
function runBatch_(me, routes, calls) {
  if (!Array.isArray(calls) || calls.length > 12) throw new Error('Too many requests at once.');
  return calls.map((c) => {
    const method = Array.isArray(c) ? String(c[0]) : '';
    try {
      if (method === 'batch') throw new Error('You do not have access to that.');
      const data = route_(me, routes, method, c[1]);
      return { ok: true, data: data === undefined ? null : data };
    } catch (e) {
      console.error(`${method}: ${e && e.stack}`);
      return { ok: false, error: String((e && e.message) || e) };
    }
  });
}

const reply_ = (data) => JSON.stringify({ ok: true, data: data === undefined ? null : data });

function whoAmI_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!email) return { role: null, email: '' };
  const owner = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  let teacher = rows_('Teachers').find((t) => t.email === email);
  if (!teacher && email === owner) {
    teacher = { email, display_name: email.split('@')[0], created_at: now_() };
    withLock_(() => { if (!rows_('Teachers').some((t) => t.email === email)) insert_('Teachers', teacher); });
  }
  if (teacher) return { role: 'teacher', email, teacher };
  const student = rows_('Students').find((s) => s.email === email);
  if (student) return { role: 'student', email, student };
  return { role: null, email };
}

function sessionFor_(me) {
  if (me.role === 'teacher') return { role: 'teacher', teacher: { id: me.email, display_name: me.teacher.display_name } };
  if (me.role === 'student') {
    return { role: 'student', student: publicStudent_(me.student), class: rows_('Classes').find((c) => c.id === me.student.class_id) };
  }
  return { role: null, email: me.email };
}

// Storage -----------------------------------------------------------------------------------------

let spreadsheet_ = null;

/** Uses the Sheet this script is attached to, or else creates one and remembers it. */
function db_() {
  if (spreadsheet_) return spreadsheet_;
  spreadsheet_ = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet_) return spreadsheet_;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('DATA_SHEET_ID');
  if (id) {
    spreadsheet_ = SpreadsheetApp.openById(id);
  } else {
    spreadsheet_ = SpreadsheetApp.create('Pixel Trail Data');
    props.setProperty('DATA_SHEET_ID', spreadsheet_.getId());
  }
  return spreadsheet_;
}

function sheet_(name) {
  const ss = db_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    // Plain text format stops Sheets from turning student text into dates or formulas.
    sh.getRange(1, 1, 1000, cols.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Text starting with these could run as a formula if a teacher ever re-pastes the Sheet. */
const encText_ = (s) => (/^[=+\-@'~]/.test(s) ? `~${s}` : s);
const decText_ = (s) => (s.charAt(0) === '~' ? s.slice(1) : s);

function encode_(field, value) {
  if (value === null || value === undefined) return '';
  if (OBJECTS.has(field)) return encText_(JSON.stringify(value));
  return encText_(String(value));
}

function decode_(field, cell) {
  const s = decText_(String(cell));
  if (BOOLEANS.has(field)) return s === 'true';
  if (NUMBERS.has(field)) return s === '' ? 0 : Number(s);
  if (OBJECTS.has(field)) return s === '' ? null : JSON.parse(s);
  if (s === '' && (field === 'path' || field === 'game_name' || field === 'submitted_at')) return null;
  return s;
}

/** Read a table. Pass `cols` to read just the first few columns and skip heavy stored code. */
function rows_(name, cols) {
  const sh = sheet_(name);
  const fields = (cols || SCHEMA[name]);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, fields.length).getValues().map((vals, i) => {
    const o = { _row: i + 2 };
    fields.forEach((f, c) => { o[f] = f.startsWith('data') ? String(vals[c]) : decode_(f, vals[c]); });
    return o;
  });
}

const toCells_ = (name, obj) => SCHEMA[name].map((f) => (f.startsWith('data') && obj[f] !== undefined ? obj[f] : encode_(f, obj[f])));
const insert_ = (name, obj) => sheet_(name).appendRow(toCells_(name, obj));

function update_(name, row) {
  const cols = SCHEMA[name];
  const sh = sheet_(name);
  sh.getRange(row._row, 1, 1, cols.length).setValues([toCells_(name, row)]);
}

function readRow_(name, rowNumber) {
  const fields = SCHEMA[name];
  const vals = sheet_(name).getRange(rowNumber, 1, 1, fields.length).getValues()[0];
  const o = { _row: rowNumber };
  fields.forEach((f, c) => { o[f] = f.startsWith('data') ? String(vals[c]) : decode_(f, vals[c]); });
  return o;
}

/** Delete bottom-up so earlier row numbers stay valid. */
function deleteRows_(name, predicate, cols) {
  const sh = sheet_(name);
  rows_(name, cols || SCHEMA[name].slice(0, 3)).filter(predicate).map((r) => r._row).sort((a, b) => b - a).forEach((r) => sh.deleteRow(r));
}

/** Split long text across cells, and join it back. Each piece is marked so it can't act as a formula. */
function packChunks_(target, text, count) {
  for (let i = 0; i < count; i++) {
    const part = text.slice(i * CELL_CHUNK, (i + 1) * CELL_CHUNK);
    target[`data${i + 1}`] = part ? `~${part}` : '';
  }
}
function unpackChunks_(row, count) {
  let out = '';
  for (let i = 0; i < count; i++) out += decText_(row[`data${i + 1}`] || '');
  return out;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  const asked = Date.now();
  try {
    lock.waitLock(20000);
  } catch (_) {
    console.warn('LOCK_TIMEOUT: waited 20 s for a turn to save');
    throw new Error('The class is saving a lot right now. Trying again soon.');
  }
  // Shows in Apps Script's Executions log, so a pilot can see saves queuing up before they fail.
  const waited = Date.now() - asked;
  if (waited > 3000) console.warn(`LOCK_SLOW: waited ${waited} ms for a turn to save`);
  try {
    const result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

const now_ = () => new Date().toISOString();
const uuid_ = () => Utilities.getUuid();
const text_ = (v, max) => String(v === null || v === undefined ? '' : v).slice(0, max);

// Shared rules ------------------------------------------------------------------------------------

/** What other people and the browser may see about a student. */
function publicStudent_(s) {
  return { id: s.id, class_id: s.class_id, display_name: s.display_name, username: s.email, avatar: s.avatar, path: s.path, game_name: s.game_name };
}

function ownedClass_(me, classId) {
  const c = rows_('Classes').find((x) => x.id === classId);
  if (!c || c.teacher_email !== me.email) throw new Error('That is not your class.');
  return c;
}

function studentOfTeacher_(me, studentId) {
  const s = rows_('Students').find((x) => x.id === studentId);
  if (!s) throw new Error('That student was not found.');
  ownedClass_(me, s.class_id);
  return s;
}

/** A teacher may view classes they own. A student may view only their own class. */
function canViewClass_(me, classId) {
  if (me.role === 'teacher') ownedClass_(me, classId);
  else if (!me.student || me.student.class_id !== classId) throw new Error('That is not your class.');
}

const stripWorkMeta_ = ({ _row, ...w }) => w;
function metaWorks_() {
  const rows = rows_('Works', WORK_META);
  if (!rows.length) return rows;
  const col = SCHEMA.Works.length - WORK_TAIL.length + 1;
  const tail = sheet_('Works').getRange(2, col, rows.length, WORK_TAIL.length).getValues();
  rows.forEach((r, i) => WORK_TAIL.forEach((f, c) => { r[f] = decode_(f, tail[i][c]); }));
  return rows;
}

function fullWork_(row) {
  const full = readRow_('Works', row._row);
  const doc = JSON.parse(unpackChunks_(full, WORK_CELLS) || '{"code":"","assets":{},"files":{}}');
  const out = {};
  [...WORK_META, ...WORK_TAIL].forEach((f) => { out[f] = full[f]; });
  return { ...out, code: doc.code, assets: doc.assets, files: doc.files || {} };
}

const gradeFor_ = (workId, grades) => {
  const g = grades.find((x) => x.work_id === workId);
  if (!g) return null;
  const { _row, ...rest } = g;
  return rest;
};

function classBoard_(me, classId) {
  canViewClass_(me, classId);
  const students = rows_('Students').filter((s) => s.class_id === classId).sort((a, b) => a.display_name.localeCompare(b.display_name));
  const works = metaWorks_();
  const awards = rows_('Awards');
  const sprites = rows_('Sprites', SPRITE_META);
  // Progress only: never code, grades, feedback, reflections, or emails.
  return students.map((s) => ({
    id: s.id, display_name: s.display_name, avatar: s.avatar, path: s.path, game_name: s.game_name,
    works: works.filter((w) => w.student_id === s.id).map((w) => ({ lesson_id: w.lesson_id, status: w.status, step_at: w.step_at, stretch_done: w.stretch_done, auto_ok: w.auto_ok, shared: w.shared, submitted_at: w.submitted_at })),
    awards: awards.filter((a) => a.student_id === s.id).map((a) => ({ badge_id: a.badge_id, note: a.note, created_at: a.created_at })),
    sprites_shared: sprites.filter((sp) => sp.student_id === s.id && sp.published).length,
  }));
}

function arcade_(me, classId) {
  canViewClass_(me, classId);
  const students = new Map(rows_('Students').filter((s) => s.class_id === classId).map((s) => [s.id, s]));
  return metaWorks_().filter((w) => w.shared && students.has(w.student_id)).map((w) => {
    const full = fullWork_(w);
    const s = students.get(w.student_id);
    return { id: w.id, student_id: w.student_id, lesson_id: w.lesson_id, code: full.code, assets: full.assets, files: full.files, updated_at: w.updated_at, student: { display_name: s.display_name, avatar: s.avatar, game_name: s.game_name, path: s.path } };
  });
}

function spriteOut_(row) {
  const full = readRow_('Sprites', row._row);
  const out = {};
  SPRITE_META.forEach((f) => { out[f] = full[f]; });
  return { ...out, data_url: unpackChunks_(full, SPRITE_CELLS) };
}

function listSprites_(me, classId) {
  canViewClass_(me, classId);
  return rows_('Sprites', SPRITE_META).filter((s) => s.class_id === classId && s.published).map(spriteOut_);
}

function mySprites_(me) {
  const mine = (s) => (me.role === 'student' ? s.student_id === me.student.id : s.teacher_email === me.email);
  return rows_('Sprites', SPRITE_META).filter(mine).map(spriteOut_);
}

function saveSprite_(me, s) {
  const dataUrl = String(s.data_url || '');
  if (!/^data:image\/(png|gif);base64,/.test(dataUrl)) throw new Error('That is not an image.');
  if (dataUrl.length > MAX_SPRITE_CHARS) throw new Error('That sprite is too big to save.');
  const name = text_(s.name, 40);
  if (!name) throw new Error('Give your sprite a name.');
  return withLock_(() => {
    let classId;
    if (me.role === 'student') classId = me.student.class_id;
    else if (s.class_id) { ownedClass_(me, s.class_id); classId = s.class_id; } else classId = '';
    const row = {
      class_id: classId, name,
      student_id: me.role === 'student' ? me.student.id : '',
      teacher_email: me.role === 'teacher' ? me.email : '',
      author_name: me.role === 'student' ? me.student.display_name : me.teacher.display_name,
      frames: Number(s.frames) || 1, w: Number(s.w) || 16, h: Number(s.h) || 16,
      published: !!s.published,
    };
    packChunks_(row, dataUrl, SPRITE_CELLS);
    const existing = s.id && rows_('Sprites', SPRITE_META).find((x) => x.id === s.id);
    if (existing) {
      const owns = me.role === 'student' ? existing.student_id === me.student.id : existing.teacher_email === me.email;
      if (!owns) throw new Error('That is not your sprite.');
      update_('Sprites', { ...row, id: existing.id, created_at: existing.created_at, _row: existing._row });
      return { id: existing.id, created_at: existing.created_at, ...spriteFields_(row), data_url: dataUrl };
    }
    const id = uuid_();
    const created = now_();
    insert_('Sprites', { ...row, id, created_at: created });
    return { id, created_at: created, ...spriteFields_(row), data_url: dataUrl };
  });
}

const spriteFields_ = (r) => { const o = {}; SPRITE_META.forEach((f) => { if (r[f] !== undefined) o[f] = r[f]; }); return o; };

// A shared song can become code in a classmate's project, so only real note names are stored.
function songData_(raw) {
  const text = String(raw || '');
  if (text.length > 3000) throw new Error('That song is too long to save.');
  let song;
  try { song = JSON.parse(text); } catch (e) { throw new Error('That is not a song.'); }
  if (!song || typeof song !== 'object') throw new Error('That is not a song.');
  const track = (t) => {
    const parts = String(t || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 64 || !parts.every((p) => /^(\.|[A-Ga-g][#b]?-?\d|[ksh])$/.test(p))) throw new Error('That is not a song.');
    return parts.join(' ');
  };
  return JSON.stringify({
    tempo: Math.min(240, Math.max(40, Math.round(Number(song.tempo)) || 120)),
    scale: /^\w{1,12}$/.test(String(song.scale)) ? song.scale : 'bright',
    lead: track(song.lead), bass: track(song.bass), drums: track(song.drums),
  });
}

function listSongs_(me, classId) {
  canViewClass_(me, classId);
  return rows_('Songs').filter((s) => s.class_id === classId && s.published);
}

function mySongs_(me) {
  const mine = (s) => (me.role === 'student' ? s.student_id === me.student.id : s.teacher_email === me.email);
  return rows_('Songs').filter(mine);
}

function musicOpen_(classId) {
  const cls = rows_('Classes').find((c) => c.id === classId);
  return !!(cls && cls.music_open);
}

function saveSong_(me, s) {
  const data = songData_(s.data);
  const name = text_(s.name, 40);
  if (!name) throw new Error('Give your song a name.');
  return withLock_(() => {
    let classId;
    if (me.role === 'student' && !musicOpen_(me.student.class_id)) throw new Error('Your teacher has closed the Music Maker for now.');
    if (me.role === 'student') classId = me.student.class_id;
    else if (s.class_id) { ownedClass_(me, s.class_id); classId = s.class_id; } else classId = '';
    const row = {
      class_id: classId, name, data,
      student_id: me.role === 'student' ? me.student.id : '',
      teacher_email: me.role === 'teacher' ? me.email : '',
      author_name: me.role === 'student' ? me.student.display_name : me.teacher.display_name,
      published: !!s.published,
    };
    const existing = s.id && rows_('Songs').find((x) => x.id === s.id);
    if (existing) {
      const owns = me.role === 'student' ? existing.student_id === me.student.id : existing.teacher_email === me.email;
      if (!owns) throw new Error('That is not your song.');
      const saved = { ...row, id: existing.id, created_at: existing.created_at };
      update_('Songs', { ...saved, _row: existing._row });
      return saved;
    }
    const saved = { ...row, id: uuid_(), created_at: now_() };
    insert_('Songs', saved);
    return saved;
  });
}

function deleteSong_(me, id) {
  withLock_(() => {
    const song = rows_('Songs').find((x) => x.id === id);
    if (!song) return;
    let allowed = me.role === 'student' ? song.student_id === me.student.id : song.teacher_email === me.email;
    if (!allowed && me.role === 'teacher' && song.class_id) {
      const c = rows_('Classes').find((x) => x.id === song.class_id);
      allowed = !!c && c.teacher_email === me.email;
    }
    if (!allowed) throw new Error('That is not your song.');
    sheet_('Songs').deleteRow(song._row);
  });
}

function deleteSprite_(me, id) {
  withLock_(() => {
    const sp = rows_('Sprites', SPRITE_META).find((x) => x.id === id);
    if (!sp) return;
    let allowed = me.role === 'student' ? sp.student_id === me.student.id : sp.teacher_email === me.email;
    if (!allowed && me.role === 'teacher' && sp.class_id) {
      const c = rows_('Classes').find((x) => x.id === sp.class_id);
      allowed = !!c && c.teacher_email === me.email;
    }
    if (!allowed) throw new Error('That is not your sprite.');
    sheet_('Sprites').deleteRow(sp._row);
  });
}

// Teacher actions ---------------------------------------------------------------------------------

/** Accepts: "Ari M, ari@school.org", "Ari M <ari@school.org>", or just "ari@school.org". */
function parseRosterLine_(line) {
  const m = line.match(/[^\s,<>;]+@[^\s,<>;]+\.[^\s,<>;]+/);
  if (!m) throw new Error(`No email found in: "${line}". Use one per line, like: Ari M, ari@school.org`);
  const email = m[0].toLowerCase();
  const name = line.replace(m[0], '').replace(/[<>,;\t]/g, ' ').trim().replace(/\s+/g, ' ');
  return { email, display_name: text_(name || email.split('@')[0], 60) };
}

// Google Classroom ---------------------------------------------------------------------------------
// The app runs under the deploying teacher's account, so these calls can see that teacher's courses.
// Other teachers on this deployment must never reach them, so every route here checks ownerOnly_.

const ownerEmail_ = () => String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();

function ownerOnly_(me) {
  if (me.email !== ownerEmail_()) throw new Error('Only the teacher who set up this app can use Google Classroom here.');
}

function allPages_(fetchPage, key) {
  let items = [];
  let token;
  do {
    const page = fetchPage(token);
    items = items.concat(page[key] || []);
    token = page.nextPageToken;
  } while (token);
  return items;
}

const pageOpts_ = (token, extra) => ({ pageSize: 100, ...(extra || {}), ...(token ? { pageToken: token } : {}) });
const myCourses_ = () => allPages_((t) => Classroom.Courses.list(pageOpts_(t, { teacherId: 'me', courseStates: ['ACTIVE'] })), 'courses');
const courseRoster_ = (id) => allPages_((t) => Classroom.Courses.Students.list(id, pageOpts_(t)), 'students');

/** Classmates see this name, so keep only a last initial. */
function shortName_(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return text_(parts[0] || 'Student', 60);
  return text_(`${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}`, 60);
}

const linkFor_ = (classId) => rows_('Links').find((l) => l.class_id === classId);

/** Bring one course's roster in, adding only what's new. Never removes anyone. */
function applyRoster_(me, course, roster) {
  return withLock_(() => {
    let link = rows_('Links').find((l) => l.course_id === course.id);
    let classId;
    if (link) {
      classId = link.class_id;
      ownedClass_(me, classId);
    } else {
      classId = uuid_();
      insert_('Classes', { id: classId, teacher_email: me.email, name: text_(course.name, 80), created_at: now_() });
      insert_('Links', { class_id: classId, course_id: course.id, course_name: text_(course.name, 120), synced_at: now_() });
    }
    const students = rows_('Students');
    const teachers = new Set(rows_('Teachers').map((t) => t.email));
    const seenIds = new Set();
    const result = { name: course.name, class_id: classId, added: 0, matched: 0, skipped: [], gone: 0 };
    for (const entry of roster) {
      const googleId = String(entry.userId);
      const fullName = entry.profile && entry.profile.name && entry.profile.name.fullName;
      const email = String((entry.profile && entry.profile.emailAddress) || '').trim().toLowerCase();
      seenIds.add(googleId);
      if (!email) { result.skipped.push(`${shortName_(fullName)}: Classroom did not share an email`); continue; }
      if (teachers.has(email)) { result.skipped.push(`${shortName_(fullName)}: is a teacher here`); continue; }
      const existing = students.find((s) => s.email === email);
      if (existing && existing.class_id !== classId) { result.skipped.push(`${existing.display_name}: already in another class here`); continue; }
      if (existing) {
        if (existing.google_id !== googleId) update_('Students', { ...existing, google_id: googleId });
        result.matched++;
      } else {
        insert_('Students', { id: uuid_(), class_id: classId, email, display_name: shortName_(fullName), avatar: null, path: null, game_name: null, created_at: now_(), google_id: googleId });
        result.added++;
      }
    }
    result.gone = rows_('Students').filter((s) => s.class_id === classId && s.google_id && !seenIds.has(s.google_id)).length;
    const current = rows_('Links').find((l) => l.class_id === classId);
    update_('Links', { ...current, synced_at: now_() });
    return result;
  });
}

// Sending grades to Classroom. Google only lets an app grade assignments that app created, so
// Pixel Trail makes one assignment per lesson and remembers it in the GradeSync tab.
function dueParts_(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  const at = new Date(y, m - 1, d, 23, 59);
  return { dueDate: { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }, dueTime: { hours: at.getUTCHours(), minutes: at.getUTCMinutes() } };
}

function approvedFor_(classId) {
  const students = rows_('Students').filter((s) => s.class_id === classId);
  const grades = rows_('Grades');
  return metaWorks_().filter((w) => w.status === 'approved').map((w) => {
    const student = students.find((s) => s.id === w.student_id);
    const grade = student && grades.find((g) => g.work_id === w.id);
    return grade ? { student, grade, lesson_id: w.lesson_id } : null;
  }).filter(Boolean);
}

/** Lesson numbers from the browser: [{ key: 'L6', ids: ['p1', 'a1', 's1', 'm1'] }]. */
function cleanSlots_(slots) {
  if (!Array.isArray(slots) || slots.length > 40) throw new Error('Bad request.');
  return slots.map((x) => {
    const key = String(x && x.key);
    const ids = Array.isArray(x && x.ids) ? x.ids.map(String) : [];
    if (!/^L\d{1,2}$/.test(key) || !ids.length || ids.length > 4 || !ids.every((id) => /^[a-z]\d{1,2}$/.test(id))) throw new Error('Bad request.');
    return { key, ids };
  });
}

/** Each student's approved grade for one lesson number, scaled to the assignment's points. */
function slotGrades_(approved, slot, points) {
  const best = new Map();
  approved.filter((a) => slot.ids.includes(a.lesson_id)).forEach((a) => {
    const value = Math.round((a.grade.total / (a.grade.max_total || 1)) * points * 10) / 10;
    const prev = best.get(a.student.id);
    if (!prev || value > prev.value) best.set(a.student.id, { student: a.student, value });
  });
  return [...best.values()];
}

function gradeSyncStatus_(me, classId, slots) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  if (!linkFor_(classId)) return { linked: false };
  const approved = approvedFor_(classId);
  const syncs = rows_('GradeSync').filter((g) => g.class_id === classId);
  return {
    linked: true,
    items: cleanSlots_(slots).map((slot) => {
      const sync = syncs.find((g) => g.lesson_id === slot.key);
      const points = sync ? Number(sync.points) || 100 : 100;
      const grades = slotGrades_(approved, slot, points);
      const sent = (sync && sync.sent) || {};
      return {
        key: slot.key, approved: grades.length, synced: !!sync,
        waiting: sync ? grades.filter((g) => sent[g.student.id] !== g.value).length : grades.length,
        title: sync ? sync.title : '', points: sync ? points : null, link: sync ? sync.link : '', due: sync ? sync.due : '',
      };
    }),
  };
}

/** Make named assignments in the linked Classroom course, before or after any grading. */
function createAssignments_(me, classId, items, opts) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  if (!link) throw new Error('Import this course from Google Classroom first.');
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new Error('Choose up to 30 lessons.');
  const publish = !!(opts && opts.publish);
  const appUrl = String(ScriptApp.getService().getUrl() || '');
  const out = { created: 0, skipped: [], failed: [] };
  items.forEach((it) => {
    const [slot] = cleanSlots_([it]);
    const title = text_(it.title, 150).trim();
    const points = Math.round(Number(it.points));
    const due = String(it.due || '');
    if (!title) { out.failed.push(`${slot.key}: needs a name`); return; }
    if (!(points >= 1 && points <= 1000)) { out.failed.push(`${title}: points must be 1 to 1000`); return; }
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) { out.failed.push(`${title}: bad due date`); return; }
    if (rows_('GradeSync').some((g) => g.class_id === classId && g.lesson_id === slot.key)) { out.skipped.push(`${title}: already in Classroom`); return; }
    try {
      const body = {
        title, description: text_(it.description, 1000), workType: 'ASSIGNMENT', state: publish ? 'PUBLISHED' : 'DRAFT', maxPoints: points,
        ...(due ? dueParts_(due) : {}),
      };
      if (/^https:\/\//.test(appUrl)) body.materials = [{ link: { url: appUrl, title: 'Open Pixel Trail' } }];
      const created = Classroom.Courses.CourseWork.create(body, link.course_id);
      withLock_(() => insert_('GradeSync', {
        class_id: classId, lesson_id: slot.key, coursework_id: String(created.id), link: created.alternateLink || '', due, pushed_at: '', sent: {}, title, points,
      }));
      out.created++;
    } catch (e) {
      out.failed.push(`${title}: ${text_(e && e.message, 160)}`);
    }
  });
  return out;
}

/** Send every approved grade that changed since the last send, to the assignments already made. */
function pushGrades_(me, classId, slots) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  if (!link) throw new Error('Import this course from Google Classroom first.');
  const approved = approvedFor_(classId);
  const syncs = rows_('GradeSync').filter((g) => g.class_id === classId);
  const out = { sent: 0, assignments: 0, skipped: [], failed: [] };
  cleanSlots_(slots).forEach((slot) => {
    const sync = syncs.find((g) => g.lesson_id === slot.key);
    if (!sync) return;
    const points = Number(sync.points) || 100;
    const sent = {};
    const before = sync.sent || {};
    const todo = slotGrades_(approved, slot, points).filter((g) => before[g.student.id] !== g.value);
    if (!todo.length) return;
    out.assignments++;
    let subs;
    try {
      subs = allPages_((t) => Classroom.Courses.CourseWork.StudentSubmissions.list(link.course_id, sync.coursework_id, pageOpts_(t)), 'studentSubmissions');
    } catch (e) {
      out.failed.push(`${sync.title}: ${text_(e && e.message, 160)}`);
      return;
    }
    if (!subs.length) { out.skipped.push(`${sync.title}: no students in it yet. If it is a draft, post it in Classroom first.`); return; }
    todo.forEach(({ student, value }) => {
      if (!student.google_id) { out.skipped.push(`${student.display_name}: not imported from Classroom`); return; }
      const sub = subs.find((x) => String(x.userId) === String(student.google_id));
      if (!sub) { out.skipped.push(`${student.display_name}: not in "${sync.title}"`); return; }
      try {
        Classroom.Courses.CourseWork.StudentSubmissions.patch(
          { draftGrade: value, assignedGrade: value }, link.course_id, sync.coursework_id, sub.id, { updateMask: 'draftGrade,assignedGrade' });
        sent[student.id] = value;
        out.sent++;
      } catch (e) {
        out.failed.push(`${student.display_name}: ${text_(e && e.message, 160)}`);
      }
    });
    withLock_(() => {
      const current = rows_('GradeSync').find((g) => g.class_id === classId && g.lesson_id === slot.key);
      if (current) update_('GradeSync', { ...current, sent: { ...(current.sent || {}), ...sent }, pushed_at: now_() });
    });
  });
  return out;
}

function dueTime_(work) {
  if (!work.dueDate) return null;
  const d = work.dueDate;
  const t = work.dueTime || {};
  return Date.UTC(d.year, d.month - 1, d.day, t.hours === undefined ? 23 : t.hours, t.minutes === undefined ? 59 : t.minutes);
}

function submissionState_(sub, due, now) {
  if (sub.state === 'RETURNED' && sub.assignedGrade !== undefined) return 'graded';
  if (sub.state === 'RETURNED') return 'done';
  if (sub.state === 'TURNED_IN') return sub.late ? 'late' : 'done';
  return due !== null && due < now ? 'missing' : 'assigned';
}

function classroomWork_(me, classId) {
  ownerOnly_(me);
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  if (!link) return { linked: false };
  const now = Date.now();
  const work = allPages_((t) => Classroom.Courses.CourseWork.list(link.course_id, pageOpts_(t, { courseWorkStates: ['PUBLISHED'] })), 'courseWork');
  const subs = allPages_((t) => Classroom.Courses.CourseWork.StudentSubmissions.list(link.course_id, '-', pageOpts_(t)), 'studentSubmissions');
  const dueById = new Map(work.map((w) => [w.id, dueTime_(w)]));
  const students = rows_('Students').filter((s) => s.class_id === classId);
  const metas = metaWorks_();
  const byGoogle = new Map();
  const out = students.map((s) => {
    const row = {
      id: s.id, display_name: s.display_name, cells: {}, missing: 0,
      core_done: metas.filter((w) => w.student_id === s.id && w.status !== 'in_progress' && isCoreLesson_(w.lesson_id)).length,
    };
    if (s.google_id) byGoogle.set(s.google_id, row);
    return row;
  });
  for (const sub of subs) {
    const row = byGoogle.get(String(sub.userId));
    if (!row || !dueById.has(sub.courseWorkId)) continue;
    const state = submissionState_(sub, dueById.get(sub.courseWorkId), now);
    row.cells[sub.courseWorkId] = { state, grade: sub.assignedGrade, link: sub.alternateLink };
    if (state === 'missing') row.missing++;
  }
  const assignments = work
    .map((w) => ({ id: w.id, title: text_(w.title, 80), link: w.alternateLink, max: w.maxPoints, due: dueById.get(w.id) }))
    .sort((a, b) => (b.due || 0) - (a.due || 0));
  return { linked: true, course_name: link.course_name, assignments, students: out };
}

function studentsWithWork_(classId, metas) {
  return rows_('Students').filter((s) => s.class_id === classId).map((s) => ({
    id: s.id, display_name: s.display_name,
    works: metas.filter((w) => w.student_id === s.id).map((w) => ({ lesson_id: w.lesson_id, status: w.status, updated_at: w.updated_at, submitted_at: w.submitted_at })),
  }));
}

const paceFor_ = (classId) => {
  const row = rows_('Pace').find((p) => p.class_id === classId);
  return row ? { term_start: row.term_start, term_end: row.term_end } : null;
};

function classAlerts_(me, classId, includeClassroom) {
  ownedClass_(me, classId);
  const link = linkFor_(classId);
  const result = { linked: !!link, course_name: link ? link.course_name : '', synced_at: link ? link.synced_at : '', students: paceAlerts_(studentsWithWork_(classId, metaWorks_()), paceFor_(classId)) };
  if (includeClassroom && link && me.email === ownerEmail_()) {
    try {
      const work = classroomWork_(me, classId);
      const levels = { behind: 0, watch: 1, ok: 2 };
      for (const s of work.students) {
        if (!s.missing) continue;
        const a = result.students.find((x) => x.id === s.id);
        a.reasons.push(`${s.missing} missing in Classroom`);
        if (s.missing >= 3) a.level = 'behind';
        else if (a.level === 'ok') a.level = 'watch';
      }
      result.students.sort((x, y) => levels[x.level] - levels[y.level] || x.done - y.done);
    } catch (e) {
      console.error(e && e.stack);
      result.classroomError = true;
    }
  }
  return result;
}

function alertLines_(me) {
  const lines = [];
  for (const c of rows_('Classes').filter((x) => x.teacher_email === me.email)) {
    const needing = classAlerts_(me, c.id, true).students.filter((s) => s.level !== 'ok');
    if (!needing.length) continue;
    lines.push(c.name);
    needing.forEach((s) => lines.push(`  ${s.display_name}: ${s.reasons.join('; ')}`));
    lines.push('');
  }
  return lines;
}

const DIGEST_HANDLER = 'dailyProgressEmail';

/** Runs from a daily trigger. It's reachable from a browser, so it refuses anyone but the owner. */
function dailyProgressEmail() {
  const owner = ownerEmail_();
  const active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (active && active !== owner) throw new Error('You do not have access to that.');
  const today = new Date();
  if (today.getDay() === 0 || today.getDay() === 6) return;
  const props = PropertiesService.getScriptProperties();
  const key = today.toISOString().slice(0, 10);
  if (props.getProperty('DIGEST_LAST') === key) return;
  props.setProperty('DIGEST_LAST', key);
  const lines = alertLines_({ role: 'teacher', email: owner });
  if (!lines.length) return;
  MailApp.sendEmail(owner, 'Pixel Trail: students who need a check-in', `${lines.join('\n')}\n${ScriptApp.getService().getUrl() || ''}`);
}

const digestOn_ = () => ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === DIGEST_HANDLER);

/** What a teacher set for today's class display. Text is limited, and standards must look like codes. */
function cleanPlan_(p) {
  const when = String(p.timer_end || '');
  return {
    day: text_(p.day, 10),
    question: text_(p.question, 200),
    focus: text_(p.focus, 300),
    standards: (Array.isArray(p.standards) ? p.standards : []).map(String).filter((c) => /^6-8\.[A-Z]+\.[a-e]\.\d$/.test(c)).slice(0, 3),
    timer_end: when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString() : '',
  };
}

const TEACHER_ROUTES = {
  listGoogleCourses: (me) => {
    ownerOnly_(me);
    const linked = new Set(rows_('Links').map((l) => l.course_id));
    return myCourses_().map((c) => ({ id: c.id, name: c.name, section: c.section || '', linked: linked.has(c.id) }));
  },
  importCourses: (me, ids) => {
    ownerOnly_(me);
    const courses = myCourses_();
    return (Array.isArray(ids) ? ids : []).map((id) => {
      const course = courses.find((c) => c.id === id);
      if (!course) throw new Error('That course was not found in your Google Classroom.');
      return applyRoster_(me, course, courseRoster_(id));
    });
  },
  classroomWork: classroomWork_,
  gradeSyncStatus: gradeSyncStatus_,
  pushGrades: pushGrades_,
  createAssignments: createAssignments_,
  listTeams: listTeams_,
  saveTeams: saveTeams_,
  classAlerts: classAlerts_,
  alertSummary: (me) => Object.fromEntries(rows_('Classes').filter((c) => c.teacher_email === me.email).map((c) => {
    const list = classAlerts_(me, c.id, false).students;
    return [c.id, list.filter((s) => s.level !== 'ok').length];
  })),
  getPace: (me, classId) => { ownedClass_(me, classId); return paceFor_(classId); },
  savePace: (me, classId, pace) => withLock_(() => {
    ownedClass_(me, classId);
    const valid = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? String(d) : '');
    const clean = { class_id: classId, term_start: valid(pace && pace.term_start), term_end: valid(pace && pace.term_end), updated_at: now_() };
    const row = rows_('Pace').find((p) => p.class_id === classId);
    if (row) update_('Pace', { ...clean, _row: row._row });
    else insert_('Pace', clean);
  }),
  getDigest: (me) => (me.email === ownerEmail_() ? { can: true, on: digestOn_() } : { can: false, on: false }),
  setDigest: (me, on) => {
    ownerOnly_(me);
    ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === DIGEST_HANDLER).forEach((t) => ScriptApp.deleteTrigger(t));
    if (on) ScriptApp.newTrigger(DIGEST_HANDLER).timeBased().everyDays(1).atHour(7).create();
  },
  getClassPlan: (me, classId) => {
    ownedClass_(me, classId);
    const row = rows_('Daily').find((d) => d.class_id === classId);
    return row ? row.plan : null;
  },
  saveClassPlan: (me, classId, plan) => withLock_(() => {
    ownedClass_(me, classId);
    const clean = cleanPlan_(plan || {});
    const row = rows_('Daily').find((d) => d.class_id === classId);
    if (row) update_('Daily', { ...row, plan: clean, updated_at: now_() });
    else insert_('Daily', { class_id: classId, plan: clean, updated_at: now_() });
    return clean;
  }),
  libraryPart: libraryPart_,
  listClasses: (me) => rows_('Classes').filter((c) => c.teacher_email === me.email),
  getClass: (me, id) => ownedClass_(me, id),
  setMusicOpen: (me, id, open) => withLock_(() => {
    const cls = ownedClass_(me, id);
    update_('Classes', { ...cls, music_open: !!open });
    return !!open;
  }),
  createClass: (me, name) => withLock_(() => {
    const c = { id: uuid_(), teacher_email: me.email, name: text_(name, 80), created_at: now_() };
    if (!c.name) throw new Error('Give your class a name.');
    insert_('Classes', c);
    return c;
  }),
  deleteClass: (me, id) => withLock_(() => {
    ownedClass_(me, id);
    const ids = new Set(rows_('Students').filter((s) => s.class_id === id).map((s) => s.id));
    const workIds = new Set(metaWorks_().filter((w) => ids.has(w.student_id)).map((w) => w.id));
    deleteRows_('Grades', (g) => workIds.has(g.work_id));
    deleteRows_('Works', (w) => ids.has(w.student_id));
    deleteRows_('Awards', (a) => ids.has(a.student_id));
    deleteRows_('Sprites', (s) => s.class_id === id);
    deleteRows_('Songs', (s) => s.class_id === id);
    rows_('Teams').filter((t) => t.class_id === id).forEach(dropTeam_);
    deleteRows_('GradeSync', (g) => g.class_id === id);
    deleteRows_('Daily', (d) => d.class_id === id);
    deleteRows_('Links', (l) => l.class_id === id);
    deleteRows_('Pace', (p) => p.class_id === id);
    deleteRows_('Students', (s) => s.class_id === id);
    deleteRows_('Classes', (c) => c.id === id);
  }),
  listStudents: (me, classId) => {
    ownedClass_(me, classId);
    return rows_('Students').filter((s) => s.class_id === classId).map(publicStudent_).sort((a, b) => a.display_name.localeCompare(b.display_name));
  },
  addStudents: (me, classId, lines) => withLock_(() => {
    ownedClass_(me, classId);
    const people = lines.map((l) => String(l).trim()).filter(Boolean).map(parseRosterLine_);
    const taken = new Set([...rows_('Students').map((s) => s.email), ...rows_('Teachers').map((t) => t.email)]);
    const seen = new Set();
    for (const p of people) {
      if (taken.has(p.email)) throw new Error(`${p.email} is already on a roster or is a teacher. Nothing was added.`);
      if (seen.has(p.email)) throw new Error(`${p.email} is listed twice. Nothing was added.`);
      seen.add(p.email);
    }
    return people.map((p) => {
      const s = { id: uuid_(), class_id: classId, email: p.email, display_name: p.display_name, avatar: null, path: null, game_name: null, created_at: now_() };
      insert_('Students', s);
      return { id: s.id, display_name: s.display_name, username: s.email };
    });
  }),
  removeStudent: (me, id) => withLock_(() => {
    studentOfTeacher_(me, id);
    const workIds = new Set(metaWorks_().filter((w) => w.student_id === id).map((w) => w.id));
    deleteRows_('Grades', (g) => workIds.has(g.work_id));
    deleteRows_('Works', (w) => w.student_id === id);
    deleteRows_('Awards', (a) => a.student_id === id);
    deleteRows_('Sprites', (s) => s.student_id === id, SPRITE_META);
    deleteRows_('Songs', (s) => s.student_id === id);
    deleteRows_('Contributions', (c) => c.student_id === id);
    rows_('Teams').filter((t) => (t.members || []).includes(id)).forEach((t) => {
      const members = t.members.filter((m) => m !== id);
      if (members.length < 2) dropTeam_(t);
      else update_('Teams', { ...t, members, driver_id: t.driver_id === id ? '' : t.driver_id });
    });
    deleteRows_('Students', (s) => s.id === id);
  }),
  setStudentPath: (me, id, path) => withLock_(() => {
    const s = studentOfTeacher_(me, id);
    if (path && !PATHS.includes(path)) throw new Error('Unknown road.');
    update_('Students', { ...s, path: path || null });
  }),
  classBoard: classBoard_,
  classWork: (me, classId) => {
    ownedClass_(me, classId);
    const ids = new Set(rows_('Students').filter((s) => s.class_id === classId).map((s) => s.id));
    const grades = rows_('Grades');
    return metaWorks_().filter((w) => ids.has(w.student_id)).map((w) => ({ ...stripWorkMeta_(w), grade: gradeFor_(w.id, grades) }));
  },
  getWorkFull: (me, id) => {
    const w = metaWorks_().find((x) => x.id === id);
    if (!w) return null;
    const s = studentOfTeacher_(me, w.student_id);
    const team = teamOf_(w.student_id, w.lesson_id);
    return { ...fullWork_(w), grade: gradeFor_(id, rows_('Grades')), student: publicStudent_(s), team: team ? teamSummary_(team, rows_('Students'), rows_('Contributions')) : null };
  },
  saveGrade: (me, id, g) => withLock_(() => {
    const meta = metaWorks_().find((x) => x.id === id);
    if (!meta) throw new Error('That work was not found.');
    studentOfTeacher_(me, meta.student_id);
    if (!['approved', 'returned', 'submitted'].includes(g.status)) throw new Error('Unknown status.');
    const grade = { scores: g.scores || {}, total: Number(g.total) || 0, max_total: Number(g.max_total) || 0, feedback: text_(g.feedback, 4000), graded_at: now_() };
    const write = (workMeta) => {
      const row = { ...grade, work_id: workMeta.id };
      const existing = rows_('Grades').find((x) => x.work_id === workMeta.id);
      if (existing) update_('Grades', { ...row, _row: existing._row });
      else insert_('Grades', row);
      update_('Works', { ...readRow_('Works', workMeta._row), status: g.status });
    };
    write(meta);
    if (g.to_team) {
      const team = teamOf_(meta.student_id, meta.lesson_id);
      if (team) metaWorks_().filter((w) => team.members.includes(w.student_id) && w.lesson_id === meta.lesson_id && w.id !== id && w.status === 'submitted').forEach(write);
    }
  }),
  giveAward: (me, studentId, badgeId, note) => withLock_(() => {
    studentOfTeacher_(me, studentId);
    deleteRows_('Awards', (a) => a.student_id === studentId && a.badge_id === badgeId, SCHEMA.Awards);
    insert_('Awards', { id: uuid_(), student_id: studentId, badge_id: text_(badgeId, 40), note: text_(note, 140), created_at: now_() });
  }),
  arcade: arcade_,
  teacherUnshare: (me, id) => withLock_(() => {
    const meta = metaWorks_().find((x) => x.id === id);
    if (!meta) return;
    studentOfTeacher_(me, meta.student_id);
    update_('Works', { ...readRow_('Works', meta._row), shared: false });
  }),
  listSprites: listSprites_,
  mySprites: mySprites_,
  saveSprite: saveSprite_,
  deleteSprite: deleteSprite_,
  listSongs: listSongs_,
  mySongs: mySongs_,
  saveSong: saveSong_,
  deleteSong: deleteSong_,
};

// Student actions: these only ever touch the student making the request ----------------------------

/** Extra code files in a project: at most 8, with safe names. */
function cleanFiles_(files) {
  const out = {};
  Object.keys(files && typeof files === 'object' ? files : {}).slice(0, 8).forEach((name) => {
    if (/^[A-Za-z_][\w-]*\.js$/.test(name) && name !== 'sketch.js') out[name] = String(files[name]);
  });
  return out;
}

// Group projects -----------------------------------------------------------------------------------
// Members share one project. Each file has its own keyboard, so group members work at the same time
// in different files, and nobody can overwrite a file someone else is editing. The server decides
// who holds each file and credits each line, so a browser can't claim someone else's work.
const TEAM_HOLD_MS = 180000;
const ROAD_OF_ = { p: 'platformer', a: 'adventure', s: 'arcade', m: 'mind' };
const EMPTY_DOC_ = '{"code":"","assets":{},"files":{}}';
const teamOf_ = (studentId, lessonId) => rows_('Teams').find((t) => t.lesson_id === lessonId && (t.members || []).includes(studentId));
const MAIN_FILE_ = 'sketch.js';
/** Who is editing each file right now: { 'sketch.js': studentId }. Holds lapse after TEAM_HOLD_MS. */
function holdersNow_(team) {
  const out = {};
  for (const [file, hold] of Object.entries(team.holders || {})) if (hold && Number(hold.until) > Date.now()) out[file] = hold.id;
  return out;
}
const holdsAny_ = (team, studentId) => Object.values(holdersNow_(team)).includes(studentId);
/** Renew every file this student holds. */
function renewHolds_(team, studentId) {
  const holders = {};
  const until = Date.now() + TEAM_HOLD_MS;
  for (const [file, id] of Object.entries(holdersNow_(team))) holders[file] = { id, until: id === studentId ? until : team.holders[file].until };
  return holders;
}
const readDoc_ = (meta) => JSON.parse(unpackChunks_(readRow_('Works', meta._row), WORK_CELLS) || EMPTY_DOC_);
const docFiles_ = (doc) => ({ 'sketch.js': String(doc.code || ''), ...(doc.files || {}) });
/** Line credit has to fit in one cell. A project too long for that simply stops tracking lines. */
const safeBlame_ = (blame) => (JSON.stringify(blame).length > CELL_CHUNK ? {} : blame);

function teamDoc_(team) {
  const metas = metaWorks_();
  for (const id of team.members) {
    const meta = metas.find((w) => w.student_id === id && w.lesson_id === team.lesson_id);
    if (meta) {
      const doc = readDoc_(meta);
      if (doc.code) return doc;
    }
  }
  return null;
}

/** Copy the shared code to each member's own record, so grading and later lessons work as usual. */
function mirrorDoc_(team, docText, skipId) {
  const metas = metaWorks_();
  team.members.filter((id) => id !== skipId).forEach((id) => {
    const meta = metas.find((w) => w.student_id === id && w.lesson_id === team.lesson_id);
    if (meta && meta.status === 'approved') return;
    const row = meta ? readRow_('Works', meta._row) : { id: uuid_(), student_id: id, lesson_id: team.lesson_id, status: 'in_progress', stretch_done: 0, reflection: '', checks_passed: 0, checks_total: 0, quiz_right: 0, quiz_total: 0, auto_ok: false, shared: false, submitted_at: null, updated_at: now_() };
    packChunks_(row, docText, WORK_CELLS);
    if (meta) update_('Works', row);
    else insert_('Works', row);
  });
}

function creditMember_(team, studentId, change) {
  const row = rows_('Contributions').find((c) => c.team_id === team.id && c.student_id === studentId);
  const base = row || { team_id: team.id, lesson_id: team.lesson_id, student_id: studentId, saves: 0, added: 0, removed: 0, last_at: '', note: '' };
  const next = { ...base, ...change(base) };
  if (row) update_('Contributions', next);
  else insert_('Contributions', next);
}

function teamFor_(me, lessonId, prevByPath, opts) {
  const options = opts || {};
  const id = me.student.id;
  let team = teamOf_(id, lessonId);
  if (!team) return null;
  if (options.beat && holdsAny_(team, id)) {
    withLock_(() => {
      const fresh = teamOf_(id, lessonId);
      if (fresh && holdsAny_(fresh, id)) update_('Teams', { ...fresh, holders: renewHolds_(fresh, id) });
    });
    team = teamOf_(id, lessonId);
  }
  const students = rows_('Students');
  const lead = students.find((s) => s.id === team.members[0]);
  const mine = rows_('Contributions').find((c) => c.team_id === team.id && c.student_id === id);
  const view = {
    id: team.id, lesson_id: team.lesson_id, started: team.started, doc_at: team.doc_at, holders: holdersNow_(team),
    lead_path: lead ? lead.path : null, my_note: mine ? mine.note : '',
    members: team.members.map((m) => ({ id: m, display_name: (students.find((s) => s.id === m) || {}).display_name || '' })),
  };
  if (options.stamp && options.stamp === team.doc_at) return { ...view, same: true };
  let doc = teamDoc_(team);
  if (!doc && lead && prevByPath && prevByPath[lead.path]) {
    const prev = metaWorks_().find((w) => w.student_id === lead.id && w.lesson_id === String(prevByPath[lead.path]));
    if (prev) doc = readDoc_(prev);
  }
  return { ...view, doc };
}

/** Start editing one file of the group project. Anyone can take a file nobody else is editing. */
function takeKeyboard_(me, lessonId, base, file) {
  const id = me.student.id;
  const name = String(file || MAIN_FILE_);
  if (name !== MAIN_FILE_ && !/^[A-Za-z_][\w-]*\.js$/.test(name)) throw new Error('That is not a file in this project.');
  withLock_(() => {
    const team = teamOf_(id, lessonId);
    if (!team) throw new Error('You are not in a group for this lesson.');
    const holders = holdersNow_(team);
    const other = holders[name];
    if (other && other !== id) throw new Error('Someone else is editing that file. Pick another file, or ask them to let go.');
    const next = { ...team, holders: { ...renewHolds_(team, id), [name]: { id, until: Date.now() + TEAM_HOLD_MS } } };
    if (!team.started) {
      next.started = true;
      let doc = teamDoc_(team);
      if (!doc && base) {
        doc = { code: String(base.code || ''), assets: base.assets || {}, files: cleanFiles_(base.files) };
        const docText = JSON.stringify(doc);
        if (docText.length > MAX_WORK_CHARS) throw new Error('This project is too big to save. Try removing an image.');
        mirrorDoc_(team, docText, null);
      }
      // Whatever the group starts from counts as starter code, not as anyone's contribution.
      if (doc) { next.blame = safeBlame_(attribute_({}, {}, docFiles_(doc), 0).blame); next.doc_at = now_(); }
    }
    update_('Teams', next);
  });
  return teamFor_(me, lessonId, null, {});
}

/** Stop editing one file, or every file when none is named. */
function passKeyboard_(me, lessonId, file) {
  withLock_(() => {
    const team = teamOf_(me.student.id, lessonId);
    if (!team) return;
    const holders = {};
    for (const [name, hold] of Object.entries(team.holders || {})) {
      if (hold.id === me.student.id && (!file || name === file)) continue;
      holders[name] = hold;
    }
    update_('Teams', { ...team, holders });
  });
}

/**
 * A group member's save, merged into the shared project: files they hold take their version, a
 * file they just made becomes theirs, and every other file keeps the group's version.
 * Returns { doc, holders, rejected } where rejected says they changed a file they don't hold.
 */
function mergeTeamDoc_(team, current, incoming, studentId) {
  const holders = holdersNow_(team);
  const until = Date.now() + TEAM_HOLD_MS;
  const nextHolds = renewHolds_(team, studentId);
  const before = docFiles_(current);
  const mine = docFiles_(incoming);
  const out = {};
  let rejected = false;
  for (const name of new Set([...Object.keys(before), ...Object.keys(mine)])) {
    const held = holders[name];
    if (held === studentId) { if (mine[name] !== undefined) out[name] = mine[name]; continue; }
    if (before[name] === undefined && !held && mine[name] !== undefined) {
      out[name] = mine[name];
      nextHolds[name] = { id: studentId, until };
      continue;
    }
    if (before[name] !== undefined) out[name] = before[name];
    if (mine[name] !== before[name]) rejected = true;
  }
  const { [MAIN_FILE_]: code, ...files } = out;
  return { doc: { code: code || '', assets: { ...(current.assets || {}), ...(incoming.assets || {}) }, files: cleanFiles_(files) }, holders: nextHolds, rejected };
}

function teamSummary_(team, students, contribs) {
  const shares = lineShares_(team.blame || {});
  return {
    id: team.id, lesson_id: team.lesson_id, starter_lines: shares[0] || 0,
    members: team.members.map((id, i) => {
      const c = contribs.find((x) => x.team_id === team.id && x.student_id === id) || {};
      return { id, display_name: (students.find((s) => s.id === id) || {}).display_name || '', lines: shares[i + 1] || 0, saves: c.saves || 0, added: c.added || 0, removed: c.removed || 0, note: c.note || '' };
    }),
  };
}

function listTeams_(me, classId) {
  ownedClass_(me, classId);
  const students = rows_('Students');
  const contribs = rows_('Contributions');
  return rows_('Teams').filter((t) => t.class_id === classId).map((t) => teamSummary_(t, students, contribs));
}

function dropTeam_(team) {
  deleteRows_('Contributions', (c) => c.team_id === team.id);
  deleteRows_('Teams', (t) => t.id === team.id);
}

function saveTeams_(me, classId, lessonId, groups) {
  const lesson = String(lessonId);
  if (!/^[a-z]\d{1,2}$/.test(lesson)) throw new Error('Unknown lesson.');
  return withLock_(() => {
    ownedClass_(me, classId);
    const roster = rows_('Students').filter((s) => s.class_id === classId);
    const seen = new Set();
    const road = /^[pasm]\d/.test(lesson) ? ROAD_OF_[lesson[0]] : null;
    const clean = (Array.isArray(groups) ? groups : []).map((g) => {
      const ids = (Array.isArray(g) ? g : []).map(String);
      if (ids.length < 2 || ids.length > 3) throw new Error('Every group needs 2 or 3 students.');
      ids.forEach((id) => {
        const s = roster.find((x) => x.id === id);
        if (!s) throw new Error('That student is not in this class.');
        if (seen.has(id)) throw new Error(`${s.display_name} is in two groups.`);
        if (road && s.path !== road) throw new Error(`${s.display_name} is on a different road, so they can't join this lesson.`);
        seen.add(id);
      });
      return ids;
    });
    const key = (ids) => [...ids].sort().join(',');
    const wanted = new Set(clean.map(key));
    const current = rows_('Teams').filter((t) => t.class_id === classId && t.lesson_id === lesson);
    // A group that didn't change keeps its record of who did what.
    current.filter((t) => !wanted.has(key(t.members))).forEach(dropTeam_);
    const kept = new Set(current.map((t) => key(t.members)));
    clean.filter((ids) => !kept.has(key(ids))).forEach((members) => {
      insert_('Teams', { id: uuid_(), class_id: classId, lesson_id: lesson, members, driver_id: '', driver_until: 0, blame: {}, started: false, doc_at: '', created_at: now_() });
    });
  });
}

function saveMyWork_(me, lessonId, patch, extra) {
  if (!/^[a-z]\d{1,2}$/.test(String(lessonId))) throw new Error('Unknown lesson.');
  const docText = JSON.stringify({ code: String(patch.code === undefined ? '' : patch.code), assets: patch.assets || {}, files: cleanFiles_(patch.files) });
  if (docText.length > MAX_WORK_CHARS) throw new Error('This project is too big to save. Try removing an image.');
  return withLock_(() => {
    const existing = metaWorks_().find((w) => w.student_id === me.student.id && w.lesson_id === lessonId);
    if (existing && existing.status === 'approved') throw new Error('This lesson was approved. Ask your teacher to reopen it.');
    let written = docText;
    let lostTurn = false;
    const team = teamOf_(me.student.id, lessonId);
    if (team) {
      const contribution = patch.contribution === undefined ? undefined : text_(patch.contribution, 2000);
      if (extra && extra.status === 'submitted' && !String(contribution || '').trim()) throw new Error('Write what each person in your group did before you submit.');
      const current = existing ? readDoc_(existing) : JSON.parse(EMPTY_DOC_);
      const currentText = JSON.stringify(current);
      if (patch.code !== undefined) {
        const merged = mergeTeamDoc_(team, current, JSON.parse(docText), me.student.id);
        const mergedText = JSON.stringify(merged.doc);
        if (mergedText.length > MAX_WORK_CHARS) throw new Error('This project is too big to save. Try removing an image.');
        const next = { ...team, holders: merged.holders };
        if (mergedText !== currentText) {
          const who = team.members.indexOf(me.student.id) + 1;
          const credit = attribute_(docFiles_(current), team.blame || {}, docFiles_(merged.doc), who);
          mirrorDoc_(team, mergedText, me.student.id);
          next.blame = safeBlame_(credit.blame);
          next.doc_at = now_();
          creditMember_(team, me.student.id, (c) => ({ saves: c.saves + 1, added: c.added + credit.added, removed: c.removed + credit.removed, last_at: now_() }));
        }
        update_('Teams', next);
        written = mergedText;
        // Their browser tried to change a file someone else holds: it should catch up with the group.
        lostTurn = merged.rejected;
      } else {
        written = currentText;
      }
      if (contribution !== undefined) creditMember_(team, me.student.id, () => ({ note: contribution }));
    }
    const row = {
      ...(existing || { id: uuid_(), student_id: me.student.id, lesson_id: lessonId, status: 'in_progress', shared: false, submitted_at: null }),
      stretch_done: Math.max(0, Math.min(3, Number(patch.stretch_done) || 0)),
      reflection: text_(patch.reflection, 4000),
      checks_passed: Number(patch.checks_passed) || 0,
      checks_total: Number(patch.checks_total) || 0,
      quiz_right: Number(patch.quiz_right) || 0,
      quiz_total: Number(patch.quiz_total) || 0,
      auto_ok: !!patch.auto_ok,
      // How far through the lesson's steps the student has got, for the class display.
      step_at: patch.step_at === undefined ? (existing ? existing.step_at : 0) : Math.max(0, Math.min(40, Math.round(Number(patch.step_at) || 0))),
      updated_at: now_(),
      ...(extra || {}),
    };
    packChunks_(row, written, WORK_CELLS);
    if (existing) update_('Works', row);
    else insert_('Works', row);
    const out = {};
    [...WORK_META, ...WORK_TAIL].forEach((f) => { out[f] = row[f]; });
    const saved = JSON.parse(written);
    return { ...out, code: saved.code, assets: saved.assets, files: saved.files, team_lost: lostTurn };
  });
}

const STUDENT_ROUTES = {
  libraryPart: libraryPart_,
  classBoard: classBoard_,
  arcade: arcade_,
  listSprites: listSprites_,
  mySprites: mySprites_,
  saveSprite: saveSprite_,
  deleteSprite: deleteSprite_,
  listSongs: listSongs_,
  mySongs: mySongs_,
  saveSong: saveSong_,
  deleteSong: deleteSong_,
  updateProfile: (me, patch) => withLock_(() => {
    const s = { ...me.student };
    if (patch.avatar !== undefined) {
      if (JSON.stringify(patch.avatar).length > 2000) throw new Error('That character is too big.');
      s.avatar = patch.avatar;
    }
    if (patch.game_name !== undefined) s.game_name = patch.game_name ? text_(patch.game_name, 60) : null;
    if (patch.path !== undefined) {
      if (s.path && patch.path !== s.path) throw new Error('Only your teacher can change your road.');
      if (patch.path && !PATHS.includes(patch.path)) throw new Error('Unknown road.');
      s.path = patch.path;
    }
    update_('Students', s);
    return publicStudent_(s);
  }),
  teamFor: teamFor_,
  takeKeyboard: takeKeyboard_,
  passKeyboard: passKeyboard_,
  myWorks: (me) => {
    const grades = rows_('Grades');
    return metaWorks_().filter((w) => w.student_id === me.student.id).map((w) => ({ ...fullWork_(w), grade: gradeFor_(w.id, grades) }));
  },
  saveWork: (me, lessonId, patch) => saveMyWork_(me, lessonId, patch),
  submitWork: (me, lessonId, patch) => saveMyWork_(me, lessonId, patch, { status: 'submitted', submitted_at: now_() }),
  setShared: (me, lessonId, shared) => withLock_(() => {
    const meta = metaWorks_().find((w) => w.student_id === me.student.id && w.lesson_id === lessonId);
    if (!meta) throw new Error('Save your lesson first.');
    update_('Works', { ...readRow_('Works', meta._row), shared: !!shared });
  }),
};

// Who needs a check-in. This one file runs in the browser (demo mode) and on the server: the build
// strips "export" and adds it to Code.gs. So it can't import anything, and helper names end in _
// to keep them from being callable from the browser on Apps Script.

const DAY_MS_ = 86400000;
const CORE_LESSONS_ = 15;

/** Beyond the Summit and side trail lessons don't count toward keeping up. */
function isCoreLesson_(id) {
  return !/^([pasm][678]|[de]\d)$/.test(id) && id !== 'c3' && id !== 't2';
}

/** School days between two dates, not counting weekends. */
function weekdaysBetween_(from, to) {
  let days = 0;
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const end = new Date(to);
  end.setHours(12, 0, 0, 0);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

/** How many core lessons a student should have finished by now, or null with no term dates. */
function expectedLessons_(pace, now) {
  if (!pace || !pace.term_start || !pace.term_end) return null;
  const start = new Date(`${pace.term_start}T00:00:00`).getTime();
  const end = new Date(`${pace.term_end}T23:59:59`).getTime();
  if (!(end > start)) return null;
  const share = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  return Math.floor(CORE_LESSONS_ * share);
}

/**
 * Check each student. students: [{ id, display_name, works: [{ lesson_id, status, updated_at, submitted_at }] }].
 * Returns one entry per student, most urgent first. level is 'behind', 'watch', or 'ok'.
 */
function paceAlerts_(students, pace, now = new Date()) {
  const expected = expectedLessons_(pace, now);
  const termStarted = pace && pace.term_start && new Date(`${pace.term_start}T00:00:00`) <= now;
  const rank = { behind: 0, watch: 1, ok: 2 };
  return students.map((s) => {
    const works = s.works || [];
    const finished = works.filter((w) => w.status !== 'in_progress' && isCoreLesson_(w.lesson_id));
    const done = finished.length;
    const reasons = [];
    let level = 'ok';
    const raise = (to, text) => {
      reasons.push(text);
      if (rank[to] < rank[level]) level = to;
    };

    if (expected !== null) {
      const gap = expected - done;
      if (gap >= 3) raise('behind', `${gap} lessons behind`);
      else if (gap === 2) raise('watch', '2 lessons behind');
    }

    const times = works.map((w) => Date.parse(w.updated_at)).filter((t) => !Number.isNaN(t));
    if (times.length) {
      const idle = weekdaysBetween_(new Date(Math.max(...times)), now);
      if (idle >= 10) raise('behind', `No work in ${idle} school days`);
      else if (idle >= 5) raise('watch', `No work in ${idle} school days`);
    } else if (termStarted && weekdaysBetween_(new Date(`${pace.term_start}T00:00:00`), now) >= 3) {
      raise('behind', 'Has not started');
    }

    for (const w of works) {
      if (w.status !== 'returned' || !w.updated_at) continue;
      const waiting = weekdaysBetween_(new Date(w.updated_at), now);
      if (waiting >= 3) { raise('watch', 'Has work to fix and resubmit'); break; }
    }

    return { id: s.id, display_name: s.display_name, done, expected, level, reasons };
  }).sort((a, b) => rank[a.level] - rank[b.level] || a.done - b.done || a.display_name.localeCompare(b.display_name));
}

// Who wrote what in a group project. This one file runs in the browser (demo mode) and on the server:
// the build strips "export" and adds it to Code.gs. So it can't import anything, and names end in _.
//
// Each file keeps one author number per line: 0 is starter code, and 1, 2, 3 are group members.
// Authors are stored as runs ([author, count]), since long stretches usually share one author.

const MAX_COMPARE_ = 4000000;
const clean_ = (line) => line.trim();
const splitLines_ = (text) => (text === '' ? [] : String(text).split('\n'));

/** For each new line, the index of the old line it matches, or -1. Moving spaces doesn't count as a change. */
function matchLines_(oldLines, newLines) {
  const a = oldLines.map(clean_);
  const b = newLines.map(clean_);
  const match = new Array(b.length).fill(-1);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) { match[start] = start; start++; }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; match[endB] = endA; }
  const n = endA - start;
  const m = endB - start;
  if (n === 0 || m === 0 || n * m > MAX_COMPARE_) return match;
  // Longest common subsequence of the part that changed.
  const table = [];
  for (let i = 0; i <= n; i++) table.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[start + i] === b[start + j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[start + i] === b[start + j]) { match[start + j] = start + i; i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return match;
}

function unpackAuthors_(runs) {
  const out = [];
  (runs || []).forEach((run) => { for (let i = 0; i < run[1]; i++) out.push(run[0]); });
  return out;
}

function packAuthors_(authors) {
  const runs = [];
  authors.forEach((who) => {
    const last = runs[runs.length - 1];
    if (last && last[0] === who) last[1]++;
    else runs.push([who, 1]);
  });
  return runs;
}

/**
 * Credit one save. prev and next map file names to text, prevBlame maps file names to runs, and `who`
 * is the author number. Blank lines count for no one. Returns { blame, added, removed }.
 */
function attribute_(prev, prevBlame, next, who) {
  const blame = {};
  let added = 0;
  let removed = 0;
  Object.keys(next).forEach((name) => {
    const oldLines = splitLines_(prev[name] === undefined ? '' : prev[name]);
    const newLines = splitLines_(next[name]);
    const oldAuthors = unpackAuthors_(prevBlame[name]);
    const match = matchLines_(oldLines, newLines);
    const kept = new Set(match.filter((m) => m !== -1));
    oldLines.forEach((line, i) => { if (!kept.has(i) && clean_(line)) removed++; });
    const authors = newLines.map((line, i) => {
      if (match[i] !== -1) return oldAuthors[match[i]] === undefined ? who : oldAuthors[match[i]];
      if (clean_(line)) added++;
      return who;
    });
    blame[name] = packAuthors_(authors);
  });
  Object.keys(prev).forEach((name) => {
    if (next[name] === undefined) splitLines_(prev[name]).forEach((line) => { if (clean_(line)) removed++; });
  });
  return { blame, added, removed };
}

/** How many lines of the finished code each author number wrote. */
function lineShares_(blame) {
  const totals = {};
  Object.keys(blame || {}).forEach((name) => {
    blame[name].forEach((run) => { totals[run[0]] = (totals[run[0]] || 0) + run[1]; });
  });
  return totals;
}
