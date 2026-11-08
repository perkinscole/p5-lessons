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
  Students: ['id', 'class_id', 'email', 'display_name', 'avatar', 'path', 'game_name', 'created_at', 'google_id'],
  Works: [...WORK_META, ...chunkCols_(WORK_CELLS)],
  Grades: ['work_id', 'scores', 'total', 'max_total', 'feedback', 'graded_at'],
  Awards: ['id', 'student_id', 'badge_id', 'note', 'created_at'],
  Sprites: [...SPRITE_META, ...chunkCols_(SPRITE_CELLS)],
  Daily: ['class_id', 'plan', 'updated_at'],
  Links: ['class_id', 'course_id', 'course_name', 'synced_at'],
  Pace: ['class_id', 'term_start', 'term_end', 'updated_at'],
};
const NUMBERS = new Set(['stretch_done', 'checks_passed', 'checks_total', 'quiz_right', 'quiz_total', 'total', 'max_total', 'frames', 'w', 'h']);
const BOOLEANS = new Set(['auto_ok', 'shared', 'published']);
const OBJECTS = new Set(['avatar', 'scores', 'plan']);
const PATHS = ['platformer', 'adventure', 'arcade', 'mind'];
const ML5_PARTS = 0; // Set by the build: how many ML5_n files it made.

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
