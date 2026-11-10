// Demo data store: everything lives in this browser's localStorage. It has the same
// interface as appsscript.js, so the rest of the app can't tell which one it's talking to.
// It is for trying the app. Real classes use Apps Script (see README).
import { buildSolution, getLesson, checkSummary, filesThrough } from '../curriculum/engine.js';
import { sequence } from '../curriculum/graph.js';
import { paceAlerts_, isCoreLesson_ } from '../game/pace.js';
import { attribute_, lineShares_ } from '../game/blame.js';

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
  const db = { teachers: [], classes: [], students: [], works: [], grades: [], awards: [], sprites: [], songs: [] };
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
        id: `demo-w${i}-${id}`, student_id: s.id, lesson_id: id, code, assets: {}, files: filesThrough(id, path || 'platformer'),
        status: pending ? 'submitted' : 'approved', stretch_done: (i + n) % 3, reflection: pending ? 'I changed the colors and tried to make it harder. The tricky part was getting my conditions in the right order.' : '',
        checks_passed: c.passed, checks_total: c.total, auto_ok: true, shared: id === 'c6' || (id === 't6' && i % 3 === 0), submitted_at: now(), updated_at: now(),
      };
      db.works.push(w);
      if (!pending) db.grades.push({ work_id: w.id, scores: { works: 3 + ((i + n) % 2), concept: 3, own: 2 + (n % 3) }, total: 8 + ((i + n) % 2) + (n % 3), max_total: 12, feedback: 'Nice work. Keep going!', graded_at: now() });
    });
  });
  // Some demo students have gone quiet, so Keeping up has something to show.
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
  for (const w of db.works) if (['demo-s5', 'demo-s9'].includes(w.student_id)) w.updated_at = daysAgo(16);
  db.links = { 'demo-class': { course_id: 'demo-course', course_name: 'Period 3: Game Design', synced_at: now() } };
  db.pace = { 'demo-class': { term_start: daysAgo(50).slice(0, 10), term_end: daysAgo(-60).slice(0, 10) } };
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
  /** Best approved grade per student for one lesson number, scaled to the assignment's points. */
  const demoSlotGrades = (classId, slot, points) => {
    const best = new Map();
    for (const st of db.students.filter((x) => x.class_id === classId)) {
      for (const w of db.works.filter((x) => x.student_id === st.id && x.status === 'approved' && slot.ids.includes(x.lesson_id))) {
        const g = db.grades.find((x) => x.work_id === w.id);
        if (!g) continue;
        const value = Math.round((g.total / (g.max_total || 1)) * points * 10) / 10;
        if (!best.has(st.id) || value > best.get(st.id).value) best.set(st.id, { id: st.id, value });
      }
    }
    return [...best.values()];
  };
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
  const teamOf = (sid, lessonId) => (db.teams || []).find((t) => t.lesson_id === lessonId && t.members.includes(sid));
  const mirror = (studentId, lessonId, doc) => {
    let w = db.works.find((x) => x.student_id === studentId && x.lesson_id === lessonId);
    if (!w) { w = { id: uid(), student_id: studentId, lesson_id: lessonId, status: 'in_progress', stretch_done: 0, reflection: '', checks_passed: 0, checks_total: 0, quiz_right: 0, quiz_total: 0, auto_ok: false, shared: false, updated_at: now() }; db.works.push(w); }
    if (w.status !== 'approved') Object.assign(w, { code: doc.code, assets: doc.assets || {}, files: doc.files || {} });
  };
  const contributionOf = (team, sid, change) => {
    db.contributions = db.contributions || [];
    let c = db.contributions.find((x) => x.team_id === team.id && x.student_id === sid);
    if (!c) { c = { team_id: team.id, student_id: sid, saves: 0, added: 0, removed: 0, note: '' }; db.contributions.push(c); }
    change(c);
  };
  const teamSummary = (team) => {
    const shares = lineShares_(team.blame || {});
    return { id: team.id, lesson_id: team.lesson_id, starter_lines: shares[0] || 0, members: team.members.map((id, i) => {
      const c = (db.contributions || []).find((x) => x.team_id === team.id && x.student_id === id) || {};
      return { id, display_name: db.students.find((s) => s.id === id)?.display_name || '', lines: shares[i + 1] || 0, saves: c.saves || 0, added: c.added || 0, removed: c.removed || 0, note: c.note || '' };
    }) };
  };

  return {
    mode: 'local',
    usesPasscodes: true,
    hasClassroom: true,
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
      db.songs = (db.songs || []).filter((s) => s.class_id !== id);
      save();
    },
    getClass: async (id) => clone(db.classes.find((c) => c.id === id)),
    async setMusicOpen(id, open) {
      const c = db.classes.find((x) => x.id === id && x.teacher_id === readSession()?.id);
      if (!c) throw new Error('That class was not found.');
      c.music_open = !!open;
      save();
      return c.music_open;
    },
    listGoogleCourses: async () => [
      { id: 'demo-course', name: 'Period 3: Game Design', section: 'Demo', linked: true },
      { id: 'demo-course-2', name: 'Period 6: Game Design', section: 'Demo', linked: !!(db.links || {})['demo-class-6'] },
    ],
    async importCourses(ids) {
      db.links = db.links || {};
      return ids.map((id) => {
        if (id === 'demo-course') return { name: 'Period 3: Game Design', class_id: 'demo-class', added: 0, matched: 12, skipped: [], gone: 0 };
        if (!db.classes.some((c) => c.id === 'demo-class-6')) {
          db.classes.push({ id: 'demo-class-6', teacher_email: readSession().id, teacher_id: readSession().id, name: 'Period 6: Game Design', code: 'DEMO66', created_at: now() });
          [['Maya R', 'mayar'], ['Noah P', 'noahp'], ['Omar S', 'omars']].forEach(([display_name, username], i) => db.students.push({ id: `demo-p6-${i}`, class_id: 'demo-class-6', display_name, username, passcode: 'demo', avatar: null, path: null, game_name: null, created_at: now() }));
          db.links['demo-class-6'] = { course_id: id, course_name: 'Period 6: Game Design', synced_at: now() };
          save();
        }
        return { name: 'Period 6: Game Design', class_id: 'demo-class-6', added: 3, matched: 0, skipped: ['Sam T: already in another class here'], gone: 0 };
      });
    },
    async classroomWork(classId) {
      const link = (db.links || {})[classId];
      if (!link) return { linked: false };
      const day = 86400000;
      const assignments = ['Reading reflection', 'Bug journal', 'Sprite sketch', 'Game plan'].map((title, i) => ({ id: `w${i}`, title, link: 'https://classroom.google.com', due: Date.now() + (i === 0 ? 3 : -4 * i) * day }));
      const states = ['done', 'graded', 'late', 'missing', 'done', 'done', 'missing'];
      const students = db.students.filter((s) => s.class_id === classId).sort((a, b) => a.display_name.localeCompare(b.display_name)).map((s, i) => {
        const cells = {};
        assignments.forEach((a, j) => {
          const state = j === 0 ? 'assigned' : states[(i * 3 + j) % states.length];
          cells[a.id] = { state, grade: state === 'graded' ? 8 + (i % 3) : undefined, link: 'https://classroom.google.com' };
        });
        return { id: s.id, display_name: s.display_name, cells, missing: Object.values(cells).filter((c) => c.state === 'missing').length, core_done: db.works.filter((w) => w.student_id === s.id && w.status !== 'in_progress' && isCoreLesson_(w.lesson_id)).length };
      });
      return { linked: true, course_name: link.course_name, assignments, students };
    },
    async classAlerts(classId, includeClassroom) {
      const link = (db.links || {})[classId];
      const list = db.students.filter((s) => s.class_id === classId).map((s) => ({ id: s.id, display_name: s.display_name, works: db.works.filter((w) => w.student_id === s.id) }));
      const students = paceAlerts_(list, (db.pace || {})[classId] || null);
      if (includeClassroom && link) {
        const work = await this.classroomWork(classId);
        for (const s of work.students) {
          if (!s.missing) continue;
          const a = students.find((x) => x.id === s.id);
          a.reasons.push(`${s.missing} missing in Classroom`);
          if (s.missing >= 3) a.level = 'behind';
          else if (a.level === 'ok') a.level = 'watch';
        }
        const levels = { behind: 0, watch: 1, ok: 2 };
        students.sort((x, y) => levels[x.level] - levels[y.level] || x.done - y.done);
      }
      return { linked: !!link, course_name: link?.course_name || '', synced_at: link?.synced_at || '', students };
    },
    async alertSummary() {
      const out = {};
      for (const c of db.classes.filter((x) => x.teacher_id === readSession()?.id)) out[c.id] = (await this.classAlerts(c.id, false)).students.filter((s) => s.level !== 'ok').length;
      return out;
    },
    getPace: async (id) => clone((db.pace || {})[id] || null),
    async savePace(id, pace) {
      db.pace = db.pace || {};
      db.pace[id] = clone(pace);
      save();
    },
    getDigest: async () => ({ can: true, on: !!db.digest }),
    async setDigest(on) { db.digest = !!on; save(); },
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
      db.songs = (db.songs || []).filter((s) => s.student_id !== id);
      save();
    },
    async setStudentPath(id, path) {
      db.students.find((s) => s.id === id).path = path;
      save();
    },

    classBoard: async (classId) => db.students.filter((s) => s.class_id === classId).sort((a, b) => a.display_name.localeCompare(b.display_name)).map((s) => ({
      id: s.id, display_name: s.display_name, avatar: clone(s.avatar), path: s.path, game_name: s.game_name,
      works: db.works.filter((w) => w.student_id === s.id).map((w) => ({ lesson_id: w.lesson_id, status: w.status, step_at: w.step_at || 0, stretch_done: w.stretch_done, auto_ok: w.auto_ok, shared: w.shared, submitted_at: w.submitted_at })),
      awards: db.awards.filter((a) => a.student_id === s.id).map((a) => ({ badge_id: a.badge_id, note: a.note, created_at: a.created_at })),
      sprites_shared: db.sprites.filter((sp) => sp.student_id === s.id && sp.published).length,
    })),

    async updateProfile(patch) {
      Object.assign(mine(), patch);
      save();
      return publicStudent(mine());
    },
    myWorks: async () => db.works.filter((w) => w.student_id === readSession()?.id).map(withGrade),
    async teamFor(lessonId, prevByPath, opts = {}) {
      const sid = readSession().id;
      const team = teamOf(sid, lessonId);
      if (!team) return null;
      if (opts.beat && team.driver_id === sid) { team.driver_until = Date.now() + 180000; save(); }
      const lead = db.students.find((s) => s.id === team.members[0]);
      const mine = (db.contributions || []).find((c) => c.team_id === team.id && c.student_id === sid);
      const view = { id: team.id, lesson_id: lessonId, started: team.started, doc_at: team.doc_at, driver_id: team.driver_until > Date.now() ? team.driver_id : '', lead_path: lead?.path || null, my_note: mine?.note || '', members: team.members.map((id) => ({ id, display_name: db.students.find((s) => s.id === id)?.display_name || '' })) };
      if (opts.stamp && opts.stamp === team.doc_at) return { ...view, same: true };
      const byMember = team.members.map((id) => db.works.find((w) => w.student_id === id && w.lesson_id === lessonId)).find((w) => w?.code);
      const prev = !byMember && lead && prevByPath?.[lead.path] && db.works.find((w) => w.student_id === lead.id && w.lesson_id === prevByPath[lead.path]);
      const source = byMember || prev;
      return { ...view, doc: source ? clone({ code: source.code, assets: source.assets || {}, files: source.files || {} }) : null };
    },
    async takeKeyboard(lessonId, base) {
      const sid = readSession().id;
      const team = teamOf(sid, lessonId);
      if (!team) throw new Error('You are not in a group for this lesson.');
      if (team.driver_until > Date.now() && team.driver_id !== sid) throw new Error('Someone else has the keyboard. Ask them to pass it.');
      team.driver_id = sid;
      team.driver_until = Date.now() + 180000;
      if (!team.started) {
        team.started = true;
        if (base) {
          team.members.forEach((id) => mirror(id, lessonId, base));
          team.blame = attribute_({}, {}, { 'sketch.js': base.code || '', ...(base.files || {}) }, 0).blame;
          team.doc_at = now();
        }
      }
      save();
      return this.teamFor(lessonId, null, {});
    },
    async passKeyboard(lessonId) {
      const team = teamOf(readSession().id, lessonId);
      if (team && team.driver_id === readSession().id) { team.driver_id = ''; team.driver_until = 0; save(); }
    },
    async listTeams(classId) {
      return (db.teams || []).filter((t) => t.class_id === classId).map(teamSummary);
    },
    async saveTeams(classId, lessonId, groups) {
      const key = (ids) => [...ids].sort().join(',');
      const wanted = new Set(groups.map(key));
      const current = (db.teams || []).filter((t) => t.class_id === classId && t.lesson_id === lessonId);
      const kept = new Set(current.filter((t) => wanted.has(key(t.members))).map((t) => key(t.members)));
      const dropped = new Set(current.filter((t) => !wanted.has(key(t.members))).map((t) => t.id));
      db.teams = [...(db.teams || []).filter((t) => !dropped.has(t.id)), ...groups.filter((g) => !kept.has(key(g))).map((members) => ({ id: uid(), class_id: classId, lesson_id: lessonId, members, driver_id: '', driver_until: 0, blame: {}, started: false, doc_at: '' }))];
      db.contributions = (db.contributions || []).filter((c) => !dropped.has(c.team_id));
      save();
    },
    // Demo stand-in for Google Classroom: assignments are remembered here and grades "sent" instantly.
    async gradeSyncStatus(classId, slots) {
      if (!(db.links || {})[classId]) return { linked: false };
      const synced = db.gradeSync || {};
      return { linked: true, items: slots.map((slot) => {
        const sync = synced[`${classId}/${slot.key}`];
        const grades = demoSlotGrades(classId, slot, sync ? sync.points : 100);
        const sent = sync?.sent || {};
        return { key: slot.key, approved: grades.length, synced: !!sync, waiting: grades.filter((g) => !sync || sent[g.id] !== g.value).length,
          title: sync?.title || '', points: sync?.points ?? null, link: sync?.link || '', due: sync?.due || '' };
      }) };
    },
    async createAssignments(classId, items, { publish } = {}) {
      const out = { created: 0, skipped: [], failed: [] };
      db.gradeSync = db.gradeSync || {};
      for (const it of items) {
        const k = `${classId}/${it.key}`;
        if (db.gradeSync[k]) { out.skipped.push(`${it.title}: already in Classroom`); continue; }
        if (!String(it.title || '').trim()) { out.failed.push(`${it.key}: needs a name`); continue; }
        db.gradeSync[k] = { title: it.title.trim(), points: Number(it.points) || 100, due: it.due || '', link: 'https://classroom.google.com', state: publish ? 'PUBLISHED' : 'DRAFT', sent: {} };
        out.created++;
      }
      save();
      return out;
    },
    async pushGrades(classId, slots) {
      const out = { sent: 0, assignments: 0, skipped: [], failed: [] };
      for (const slot of slots) {
        const sync = (db.gradeSync || {})[`${classId}/${slot.key}`];
        if (!sync) continue;
        const todo = demoSlotGrades(classId, slot, sync.points).filter((g) => sync.sent[g.id] !== g.value);
        if (todo.length) out.assignments++;
        for (const g of todo) { sync.sent[g.id] = g.value; out.sent++; }
      }
      save();
      return out;
    },
    async saveWork(lessonId, incoming) {
      const sid = readSession().id;
      let patch = incoming;
      const team = teamOf(sid, lessonId);
      let lost = false;
      if (team) {
        const { contribution, ...rest } = incoming;
        patch = rest;
        if (incoming.status === 'submitted' && !String(contribution || '').trim()) throw new Error('Write what each person in your group did before you submit.');
        if (patch.code !== undefined && !(team.driver_id === sid && team.driver_until > Date.now())) {
          const { code, assets, files, ...own } = patch;
          patch = own;
          lost = true;
        } else if (patch.code !== undefined) {
          const was = db.works.find((x) => x.student_id === sid && x.lesson_id === lessonId) || {};
          const files = (d) => ({ 'sketch.js': d.code || '', ...(d.files || {}) });
          const credit = attribute_(files(was), team.blame || {}, files(patch), team.members.indexOf(sid) + 1);
          if (credit.added || credit.removed) {
            team.blame = credit.blame;
            team.doc_at = now();
            contributionOf(team, sid, (c) => { c.saves += 1; c.added += credit.added; c.removed += credit.removed; });
            team.members.filter((id) => id !== sid).forEach((id) => mirror(id, lessonId, patch));
          }
          team.driver_until = Date.now() + 180000;
        }
        if (contribution !== undefined) contributionOf(team, sid, (c) => { c.note = contribution; });
      }
      let w = db.works.find((x) => x.student_id === sid && x.lesson_id === lessonId);
      if (!w) {
        w = { id: uid(), student_id: sid, lesson_id: lessonId, code: '', assets: {}, status: 'in_progress', stretch_done: 0, reflection: '', checks_passed: 0, checks_total: 0, quiz_right: 0, quiz_total: 0, auto_ok: false, shared: false, submitted_at: null };
        db.works.push(w);
      }
      if (w.status === 'approved') throw new Error('This lesson was approved. Ask your teacher to reopen it.');
      Object.assign(w, patch, { updated_at: now() });
      save();
      return { ...clone(w), team_lost: lost };
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
      const team = teamOf(w.student_id, w.lesson_id);
      return { ...withGrade(w), student: publicStudent(db.students.find((s) => s.id === w.student_id)), team: team ? teamSummary(team) : null };
    },
    async saveGrade(id, g) {
      const { status, to_team: toTeam, ...grade } = g;
      const work = db.works.find((w) => w.id === id);
      const team = toTeam && teamOf(work.student_id, work.lesson_id);
      const targets = [work, ...(team ? db.works.filter((w) => team.members.includes(w.student_id) && w.lesson_id === work.lesson_id && w.id !== id && w.status === 'submitted') : [])];
      for (const w of targets) {
        db.grades = db.grades.filter((x) => x.work_id !== w.id);
        db.grades.push({ work_id: w.id, ...grade, graded_at: now() });
        w.status = status;
      }
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

    listSongs: async (classId) => clone((db.songs || []).filter((s) => s.class_id === classId && s.published)),
    async mySongs() {
      const sid = readSession().id;
      return clone((db.songs || []).filter((s) => s.student_id === sid || s.teacher_id === sid));
    },
    async saveSong(s) {
      db.songs = db.songs || [];
      const sess = me();
      if (sess.role === 'student' && !db.classes.find((c) => c.id === sess.student.class_id)?.music_open) throw new Error('Your teacher has closed the Music Maker for now.');
      const owner = sess.role === 'student'
        ? { student_id: sess.student.id, class_id: sess.student.class_id, author_name: sess.student.display_name }
        : { teacher_id: sess.teacher.id, author_name: sess.teacher.display_name };
      const existing = s.id && db.songs.find((x) => x.id === s.id);
      if (existing) { Object.assign(existing, s, owner); save(); return clone(existing); }
      const row = { ...s, ...owner, id: uid(), created_at: now() };
      db.songs.push(row);
      save();
      return clone(row);
    },
    async deleteSong(id) {
      db.songs = (db.songs || []).filter((s) => s.id !== id);
      save();
    },
  };
}
