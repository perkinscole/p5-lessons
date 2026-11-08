// Demo data store: everything lives in this browser's localStorage. It has the same
// interface as appsscript.js, so the rest of the app can't tell which one it's talking to.
// It is for trying the app. Real classes use Apps Script (see README).
import { buildSolution, getLesson, checkSummary } from '../curriculum/engine.js';
import { sequence } from '../curriculum/graph.js';

const KEY = 'pixeltrail.demo.v1';
const SESSION = 'pixeltrail.demo.session';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));

const WORDS_A = ['blue', 'red', 'gold', 'green', 'pink', 'swift', 'happy', 'brave', 'quiet', 'tiny', 'giant', 'lucky'];
const WORDS_B = ['fox', 'owl', 'bear', 'frog', 'wolf', 'hawk', 'otter', 'tiger', 'panda', 'crab', 'moose', 'whale'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const makePasscode = () => `${pick(WORDS_A)}-${pick(WORDS_B)}-${10 + Math.floor(Math.random() * 90)}`;
const makeClassCode = () => Array.from({ length: 6 }, () => pick([...'ABCDEFGHJKMNPQRSTUVWXYZ23456789'])).join('');

function seed() {
  const db = { teachers: [], classes: [], students: [], works: [], grades: [], awards: [], sprites: [] };
  const teacher = { id: 'demo-teacher', display_name: 'Demo Teacher', email: 'teacher@demo' };
  db.teachers.push(teacher);
  const cls = { id: 'demo-class', teacher_id: teacher.id, name: 'Period 3: Game Design', code: 'DEMO42', created_at: now() };
  db.classes.push(cls);
  // Fictional students spread along the trail, so the map and gradebook have something to show.
  const roster = [
    ['Ari M', 'platformer', 19, 'Canopy Climb'], ['Bea T', 'adventure', 12, 'Sunken Keep'], ['Cam R', 'arcade', 24, 'Comet Patrol'],
    ['Dee L', 'platformer', 10, 'Lava Hop'], ['Eli S', 'adventure', 27, 'The Long Maze'], ['Fin O', null, 4, null],
    ['Gia P', 'mind', 15, 'Mind Maze'], ['Hal W', 'platformer', 7, null], ['Ivy K', 'mind', 8, 'Bot Trap'], ['Jo N', null, 2, null],
    ['Kai B', 'arcade', 36, 'Nova Squad'], ['Lux D', 'platformer', 22, 'Tower of Toast'],
  ];
  const skins = [0, 3, 1, 4, 2, 0, 3, 1, 2, 4, 5, 1];
  const hats = ['cap', 'none', 'wizard', 'none', 'helmet', 'none', 'band', 'none', 'none', 'none', 'crown', 'cap'];
  const pets = ['slime', 'none', 'cat', 'none', 'cat', 'none', 'slime', 'none', 'none', 'none', 'dragon', 'slime'];
  roster.forEach(([name, path, count, game], i) => {
    const s = {
      id: `demo-s${i}`, class_id: cls.id, display_name: name, username: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      passcode: 'demo', path, game_name: game, created_at: now(),
      avatar: { skin: skins[i], hairColor: i % 5, hair: ['short', 'spiky', 'long', 'puffs'][i % 4], outfit: i % 8, hat: hats[i], held: 'none', pet: pets[i] },
    };
    db.students.push(s);
    const seq = sequence(path || 'platformer').slice(0, count);
    seq.forEach((id, n) => {
      const l = getLesson(id);
      const code = buildSolution(id, path || 'platformer');
      const c = checkSummary(l, code);
      const pending = n >= seq.length - 2;
      const w = {
        id: `demo-w${i}-${id}`, student_id: s.id, lesson_id: id, code, assets: {},
        status: pending ? 'submitted' : 'approved', stretch_done: (i + n) % 3, reflection: pending ? 'I changed the colors and tried to make it harder. The tricky part was getting my conditions in the right order.' : '',
        checks_passed: c.passed, checks_total: c.total, auto_ok: true, shared: id === 'c6' || (id === 't6' && i % 3 === 0), submitted_at: now(), updated_at: now(),
      };
      db.works.push(w);
      if (!pending) db.grades.push({ work_id: w.id, scores: { works: 3 + ((i + n) % 2), concept: 3, own: 2 + (n % 3) }, total: 8 + ((i + n) % 2) + (n % 3), max_total: 12, feedback: 'Nice work. Keep going!', graded_at: now() });
    });
  });
  db.awards.push({ id: uid(), student_id: 'demo-s2', badge_id: 'helper', note: 'Helped Fin with their if statements', created_at: now() });
  db.awards.push({ id: uid(), student_id: 'demo-s4', badge_id: 'debugger', note: '', created_at: now() });
  return db;
}

export function createLocalStore() {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch (_) { db = null; }
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Could not save demo data', e); } };
  save();
  const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION)); } catch (_) { return null; } };
  const writeSession = (s) => { try { if (s) localStorage.setItem(SESSION, JSON.stringify(s)); else localStorage.removeItem(SESSION); } catch (_) { /* private mode */ } };
  const publicStudent = ({ passcode, ...s }) => clone(s);
  const me = () => {
    const s = readSession();
    if (!s) return null;
    if (s.role === 'teacher') return { role: 'teacher', teacher: clone(db.teachers.find((t) => t.id === s.id)) };
    const st = db.students.find((x) => x.id === s.id);
    if (!st) return null;
    return { role: 'student', student: publicStudent(st), class: clone(db.classes.find((c) => c.id === st.class_id)) };
  };
  const mine = () => db.students.find((x) => x.id === readSession()?.id);
  const withGrade = (w) => ({ ...clone(w), grade: clone(db.grades.find((g) => g.work_id === w.id) || null) });
  const meta = ({ code, assets, ...w }) => w;

  return {
    mode: 'local',
    usesPasscodes: true,
    session: async () => me(),
    async teacherSignUp(name, email) {
      const t = { id: uid(), display_name: name, email };
      db.teachers.push(t);
      save();
      writeSession({ role: 'teacher', id: t.id });
      return me();
    },
    async teacherSignIn(email) {
      const t = db.teachers.find((x) => x.email === email) || db.teachers[0];
      writeSession({ role: 'teacher', id: t.id });
      return me();
    },
    async studentSignIn(code, username, passcode) {
      const cls = db.classes.find((c) => c.code === code.trim().toUpperCase());
      const st = cls && db.students.find((s) => s.class_id === cls.id && s.username === username.trim().toLowerCase());
      if (!st || st.passcode !== passcode.trim().toLowerCase()) throw new Error('Check your class code, username, and passcode.');
      writeSession({ role: 'student', id: st.id });
      return me();
    },
    async signOut() { writeSession(null); },
    async demoLogin(role, id) { writeSession({ role, id }); return me(); },
    async resetDemo() { db = seed(); save(); },

    listClasses: async () => clone(db.classes.filter((c) => c.teacher_id === readSession()?.id)),
    async createClass(name) {
      const c = { id: uid(), teacher_id: readSession().id, name, code: makeClassCode(), created_at: now() };
      db.classes.push(c);
      save();
      return clone(c);
    },
    async deleteClass(id) {
      const gone = new Set(db.students.filter((s) => s.class_id === id).map((s) => s.id));
      db.classes = db.classes.filter((c) => c.id !== id);
      db.students = db.students.filter((s) => s.class_id !== id);
      db.works = db.works.filter((w) => !gone.has(w.student_id));
      db.sprites = db.sprites.filter((s) => s.class_id !== id);
      save();
    },
    getClass: async (id) => clone(db.classes.find((c) => c.id === id)),
    getClassPlan: async (id) => clone((db.plans || {})[id] || null),
    async saveClassPlan(id, plan) {
      db.plans = db.plans || {};
      db.plans[id] = clone(plan);
      save();
      return clone(plan);
    },

    listStudents: async (classId) => db.students.filter((s) => s.class_id === classId).map(publicStudent).sort((a, b) => a.display_name.localeCompare(b.display_name)),
    async addStudents(classId, names) {
      const out = [];
      for (const raw of names) {
        const name = raw.trim();
        if (!name) continue;
        const base = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';
        let username = base;
        for (let n = 2; db.students.some((s) => s.class_id === classId && s.username === username); n++) username = base + n;
        const passcode = makePasscode();
        const s = { id: uid(), class_id: classId, display_name: name, username, passcode, avatar: null, path: null, game_name: null, created_at: now() };
        db.students.push(s);
        out.push({ id: s.id, display_name: name, username, passcode });
      }
      save();
      return out;
    },
    async resetPasscode(id) {
      const s = db.students.find((x) => x.id === id);
      s.passcode = makePasscode();
      save();
      return s.passcode;
    },
    async removeStudent(id) {
      db.students = db.students.filter((s) => s.id !== id);
      db.works = db.works.filter((w) => w.student_id !== id);
      db.awards = db.awards.filter((a) => a.student_id !== id);
      db.sprites = db.sprites.filter((s) => s.student_id !== id);
      save();
    },
    async setStudentPath(id, path) {
      db.students.find((s) => s.id === id).path = path;
      save();
    },

    classBoard: async (classId) => db.students.filter((s) => s.class_id === classId).sort((a, b) => a.display_name.localeCompare(b.display_name)).map((s) => ({
      id: s.id, display_name: s.display_name, avatar: clone(s.avatar), path: s.path, game_name: s.game_name,
      works: db.works.filter((w) => w.student_id === s.id).map((w) => ({ lesson_id: w.lesson_id, status: w.status, stretch_done: w.stretch_done, auto_ok: w.auto_ok, shared: w.shared, submitted_at: w.submitted_at })),
      awards: db.awards.filter((a) => a.student_id === s.id).map((a) => ({ badge_id: a.badge_id, note: a.note, created_at: a.created_at })),
      sprites_shared: db.sprites.filter((sp) => sp.student_id === s.id && sp.published).length,
    })),

    async updateProfile(patch) {
      Object.assign(mine(), patch);
      save();
      return publicStudent(mine());
    },
    myWorks: async () => db.works.filter((w) => w.student_id === readSession()?.id).map(withGrade),
    async saveWork(lessonId, patch) {
      const sid = readSession().id;
      let w = db.works.find((x) => x.student_id === sid && x.lesson_id === lessonId);
      if (!w) {
        w = { id: uid(), student_id: sid, lesson_id: lessonId, code: '', assets: {}, status: 'in_progress', stretch_done: 0, reflection: '', checks_passed: 0, checks_total: 0, quiz_right: 0, quiz_total: 0, auto_ok: false, shared: false, submitted_at: null };
        db.works.push(w);
      }
      if (w.status === 'approved') throw new Error('This lesson was approved. Ask your teacher to reopen it.');
      Object.assign(w, patch, { updated_at: now() });
      save();
      return clone(w);
    },
    async submitWork(lessonId, patch) {
      return this.saveWork(lessonId, { ...patch, status: 'submitted', submitted_at: now() });
    },
    async setShared(lessonId, shared) {
      const w = db.works.find((x) => x.student_id === readSession().id && x.lesson_id === lessonId);
      if (w) { w.shared = shared; save(); }
    },

    async classWork(classId) {
      const ids = new Set(db.students.filter((s) => s.class_id === classId).map((s) => s.id));
      return db.works.filter((w) => ids.has(w.student_id)).map((w) => ({ ...meta(clone(w)), grade: clone(db.grades.find((g) => g.work_id === w.id) || null) }));
    },
    async getWorkFull(id) {
      const w = db.works.find((x) => x.id === id);
      if (!w) return null;
      return { ...withGrade(w), student: publicStudent(db.students.find((s) => s.id === w.student_id)) };
    },
    async saveGrade(id, g) {
      const { status, ...grade } = g;
      db.grades = db.grades.filter((x) => x.work_id !== id);
      db.grades.push({ work_id: id, ...grade, graded_at: now() });
      db.works.find((w) => w.id === id).status = status;
      save();
    },
    async giveAward(studentId, badgeId, note) {
      db.awards = db.awards.filter((a) => !(a.student_id === studentId && a.badge_id === badgeId));
      db.awards.push({ id: uid(), student_id: studentId, badge_id: badgeId, note, created_at: now() });
      save();
    },

    async arcade(classId) {
      const ids = new Map(db.students.filter((s) => s.class_id === classId).map((s) => [s.id, s]));
      return db.works.filter((w) => w.shared && ids.has(w.student_id)).map((w) => ({ ...clone(w), student: publicStudent(ids.get(w.student_id)) }));
    },
    async teacherUnshare(id) {
      db.works.find((w) => w.id === id).shared = false;
      save();
    },

    listSprites: async (classId) => clone(db.sprites.filter((s) => s.class_id === classId && s.published)),
    async mySprites() {
      const sid = readSession().id;
      return clone(db.sprites.filter((s) => s.student_id === sid || s.teacher_id === sid));
    },
    async saveSprite(s) {
      const sess = me();
      const owner = sess.role === 'student'
        ? { student_id: sess.student.id, class_id: sess.student.class_id, author_name: sess.student.display_name }
        : { teacher_id: sess.teacher.id, author_name: sess.teacher.display_name };
      const existing = s.id && db.sprites.find((x) => x.id === s.id);
      if (existing) { Object.assign(existing, s, owner); save(); return clone(existing); }
      const row = { ...s, ...owner, id: uid(), created_at: now() };
      db.sprites.push(row);
      save();
      return clone(row);
    },
    async deleteSprite(id) {
      db.sprites = db.sprites.filter((s) => s.id !== id);
      save();
    },
  };
}
