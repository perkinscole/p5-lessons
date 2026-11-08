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
const WORK_META = ['id', 'student_id', 'lesson_id', 'status', 'stretch_done', 'reflection', 'checks_passed', 'checks_total', 'quiz_right', 'quiz_total', 'auto_ok', 'shared', 'submitted_at', 'updated_at'];
const SPRITE_META = ['id', 'class_id', 'student_id', 'teacher_email', 'author_name', 'name', 'frames', 'w', 'h', 'published', 'created_at'];

const SCHEMA = {
  Teachers: ['email', 'display_name', 'created_at'],
  Classes: ['id', 'teacher_email', 'name', 'created_at'],
  Students: ['id', 'class_id', 'email', 'display_name', 'avatar', 'path', 'game_name', 'created_at'],
  Works: [...WORK_META, ...chunkCols_(WORK_CELLS)],
  Grades: ['work_id', 'scores', 'total', 'max_total', 'feedback', 'graded_at'],
  Awards: ['id', 'student_id', 'badge_id', 'note', 'created_at'],
  Sprites: [...SPRITE_META, ...chunkCols_(SPRITE_CELLS)],
  Daily: ['class_id', 'plan', 'updated_at'],
};
const NUMBERS = new Set(['stretch_done', 'checks_passed', 'checks_total', 'quiz_right', 'quiz_total', 'total', 'max_total', 'frames', 'w', 'h']);
const BOOLEANS = new Set(['auto_ok', 'shared', 'published']);
const OBJECTS = new Set(['avatar', 'scores', 'plan']);
const PATHS = ['platformer', 'adventure', 'arcade', 'mind'];
const ML5_PARTS = 5; // Set by the build: how many ML5_n files it made.

// Web page ----------------------------------------------------------------------------------------

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Pixel Trail')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Hands the browser one piece of the ml5 library, to be stitched back together there. */
function libraryPart_(me, i) {
  const n = Number(i);
  if (!Number.isInteger(n) || n < 0 || n >= ML5_PARTS) return '';
  return HtmlService.createHtmlOutputFromFile(`ML5_${n}`).getContent();
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// The only door in --------------------------------------------------------------------------------

function api(method, argsJson) {
  try {
    const me = whoAmI_();
    const routes = me.role === 'teacher' ? TEACHER_ROUTES : me.role === 'student' ? STUDENT_ROUTES : {};
    if (method === 'session') return reply_(sessionFor_(me));
    if (!Object.prototype.hasOwnProperty.call(routes, method)) throw new Error('You do not have access to that.');
    return reply_(routes[method](me, ...JSON.parse(argsJson || '[]')));
  } catch (e) {
    console.error(`${method}: ${e && e.stack}`);
    return JSON.stringify({ ok: false, error: String((e && e.message) || e) });
  }
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
  try {
    lock.waitLock(20000);
  } catch (_) {
    throw new Error('The class is saving a lot right now. Trying again soon.');
  }
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
const metaWorks_ = () => rows_('Works', WORK_META);

function fullWork_(row) {
  const full = readRow_('Works', row._row);
  const doc = JSON.parse(unpackChunks_(full, WORK_CELLS) || '{"code":"","assets":{},"files":{}}');
  const out = {};
  WORK_META.forEach((f) => { out[f] = full[f]; });
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
    works: works.filter((w) => w.student_id === s.id).map((w) => ({ lesson_id: w.lesson_id, status: w.status, stretch_done: w.stretch_done, auto_ok: w.auto_ok, shared: w.shared, submitted_at: w.submitted_at })),
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
    deleteRows_('Daily', (d) => d.class_id === id);
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
    return { ...fullWork_(w), grade: gradeFor_(id, rows_('Grades')), student: publicStudent_(s) };
  },
  saveGrade: (me, id, g) => withLock_(() => {
    const meta = metaWorks_().find((x) => x.id === id);
    if (!meta) throw new Error('That work was not found.');
    studentOfTeacher_(me, meta.student_id);
    if (!['approved', 'returned', 'submitted'].includes(g.status)) throw new Error('Unknown status.');
    const grade = { work_id: id, scores: g.scores || {}, total: Number(g.total) || 0, max_total: Number(g.max_total) || 0, feedback: text_(g.feedback, 4000), graded_at: now_() };
    const existing = rows_('Grades').find((x) => x.work_id === id);
    if (existing) update_('Grades', { ...grade, _row: existing._row });
    else insert_('Grades', grade);
    update_('Works', { ...readRow_('Works', meta._row), status: g.status });
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

function saveMyWork_(me, lessonId, patch, extra) {
  if (!/^[a-z]\d{1,2}$/.test(String(lessonId))) throw new Error('Unknown lesson.');
  const docText = JSON.stringify({ code: String(patch.code === undefined ? '' : patch.code), assets: patch.assets || {}, files: cleanFiles_(patch.files) });
  if (docText.length > MAX_WORK_CHARS) throw new Error('This project is too big to save. Try removing an image.');
  return withLock_(() => {
    const existing = metaWorks_().find((w) => w.student_id === me.student.id && w.lesson_id === lessonId);
    if (existing && existing.status === 'approved') throw new Error('This lesson was approved. Ask your teacher to reopen it.');
    const row = {
      ...(existing || { id: uuid_(), student_id: me.student.id, lesson_id: lessonId, status: 'in_progress', shared: false, submitted_at: null }),
      stretch_done: Math.max(0, Math.min(3, Number(patch.stretch_done) || 0)),
      reflection: text_(patch.reflection, 4000),
      checks_passed: Number(patch.checks_passed) || 0,
      checks_total: Number(patch.checks_total) || 0,
      quiz_right: Number(patch.quiz_right) || 0,
      quiz_total: Number(patch.quiz_total) || 0,
      auto_ok: !!patch.auto_ok,
      updated_at: now_(),
      ...(extra || {}),
    };
    packChunks_(row, docText, WORK_CELLS);
    if (existing) update_('Works', row);
    else insert_('Works', row);
    const out = {};
    WORK_META.forEach((f) => { out[f] = row[f]; });
    const saved = JSON.parse(docText);
    return { ...out, code: saved.code, assets: saved.assets, files: saved.files };
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
