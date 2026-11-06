// Cloud data store (Supabase). Same interface as local.js.
const META = 'id,student_id,lesson_id,status,stretch_done,checks_passed,checks_total,auto_ok,shared,submitted_at,updated_at';

export function createCloudStore(url, key) {
  const sb = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  let me = null;

  return {
    mode: 'cloud',
    async session() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { me = null; return null; }
      me = ok(await sb.rpc('whoami'));
      return me;
    },
    async teacherSignUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
      ok(await sb.from('teachers').insert({ id: data.user.id, display_name: name }));
      return this.session();
    },
    async teacherSignIn(email, password) {
      ok(await sb.auth.signInWithPassword({ email, password }));
      const s = await this.session();
      if (!s) { await sb.auth.signOut(); throw new Error('That account is not set up as a teacher.'); }
      return s;
    },
    async studentSignIn(code, username, passcode) {
      const fail = 'Check your class code, username, and passcode.';
      const { data: { session } } = await sb.auth.getSession();
      if (!session) ok(await sb.auth.signInAnonymously());
      const sid = ok(await sb.rpc('student_login', { p_code: code, p_username: username, p_passcode: passcode }));
      if (!sid) throw new Error(fail);
      return this.session();
    },
    async signOut() { await sb.auth.signOut(); me = null; },

    listClasses: async () => ok(await sb.from('classes').select('*').order('created_at')),
    createClass: async (name) => ok(await sb.rpc('create_class', { p_name: name })),
    deleteClass: async (id) => { ok(await sb.from('classes').delete().eq('id', id)); },
    getClass: async (id) => ok(await sb.from('classes').select('*').eq('id', id).single()),

    listStudents: async (classId) => ok(await sb.from('students').select('id,class_id,display_name,username,avatar,path,game_name').eq('class_id', classId).order('display_name')),
    addStudents: async (classId, names) => ok(await sb.rpc('add_students', { p_class: classId, p_names: names })),
    resetPasscode: async (id) => ok(await sb.rpc('reset_passcode', { p_student: id })),
    removeStudent: async (id) => { ok(await sb.from('students').delete().eq('id', id)); },
    setStudentPath: async (id, path) => { ok(await sb.from('students').update({ path }).eq('id', id)); },

    classBoard: async (classId) => ok(await sb.rpc('class_board', { p_class: classId })),

    async updateProfile(patch) {
      ok(await sb.from('students').update(patch).eq('id', me.student.id));
      Object.assign(me.student, patch);
      return me.student;
    },
    myWorks: async () => ok(await sb.from('works').select('*, grades(*)').eq('student_id', me.student.id)).map((w) => ({ ...w, grade: Array.isArray(w.grades) ? w.grades[0] : w.grades })),
    async saveWork(lessonId, patch) {
      return ok(await sb.from('works').upsert(
        { student_id: me.student.id, lesson_id: lessonId, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,lesson_id' },
      ).select().single());
    },
    async submitWork(lessonId, patch) {
      return this.saveWork(lessonId, { ...patch, status: 'submitted', submitted_at: new Date().toISOString() });
    },
    async setShared(lessonId, shared) {
      ok(await sb.from('works').update({ shared }).eq('student_id', me.student.id).eq('lesson_id', lessonId));
    },

    async classWork(classId) {
      const students = await this.listStudents(classId);
      if (!students.length) return [];
      return ok(await sb.from('works').select(`${META}, grades(*)`).in('student_id', students.map((s) => s.id)))
        .map((w) => ({ ...w, grade: Array.isArray(w.grades) ? w.grades[0] : w.grades }));
    },
    async getWorkFull(id) {
      const w = ok(await sb.from('works').select('*, grades(*), students(id,display_name,path,game_name,class_id)').eq('id', id).single());
      return { ...w, grade: Array.isArray(w.grades) ? w.grades[0] : w.grades, student: w.students };
    },
    saveGrade: async (id, g) => { ok(await sb.rpc('save_grade', { p_work: id, p_scores: g.scores, p_total: g.total, p_max: g.max_total, p_feedback: g.feedback, p_status: g.status })); },
    giveAward: async (studentId, badgeId, note) => { ok(await sb.from('awards').upsert({ student_id: studentId, badge_id: badgeId, note }, { onConflict: 'student_id,badge_id' })); },

    arcade: async (classId) => ok(await sb.rpc('class_arcade', { p_class: classId })),
    teacherUnshare: async (id) => { ok(await sb.rpc('teacher_unshare', { p_work: id })); },

    listSprites: async (classId) => ok(await sb.from('sprites').select('*').eq('class_id', classId).eq('published', true).order('created_at', { ascending: false })),
    async mySprites() {
      const col = me.role === 'student' ? 'student_id' : 'teacher_id';
      const id = me.role === 'student' ? me.student.id : me.teacher.id;
      return ok(await sb.from('sprites').select('*').eq(col, id).order('created_at', { ascending: false }));
    },
    async saveSprite(s) {
      const row = { name: s.name, data_url: s.data_url, frames: s.frames, w: s.w, h: s.h, published: !!s.published, class_id: s.class_id || null };
      if (me.role === 'student') Object.assign(row, { student_id: me.student.id, class_id: me.student.class_id, author_name: me.student.display_name });
      else Object.assign(row, { teacher_id: me.teacher.id, author_name: me.teacher.display_name });
      if (s.id) return ok(await sb.from('sprites').update(row).eq('id', s.id).select().single());
      return ok(await sb.from('sprites').insert(row).select().single());
    },
    deleteSprite: async (id) => { ok(await sb.from('sprites').delete().eq('id', id)); },
  };
}
