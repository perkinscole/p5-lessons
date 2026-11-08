import { setMl5Loader } from '../sandbox.js';
// Data store for the real app, which runs on Google Apps Script. Same interface as local.js.
// Everything goes through the server's single api() function, which decides who may do what.

function call(method, ...args) {
  return new Promise((resolve, reject) => {
    window.google.script.run
      .withFailureHandler((e) => reject(new Error(e?.message || 'Could not reach the server. Check your connection.')))
      .withSuccessHandler((text) => {
        const res = JSON.parse(text);
        if (res.ok) resolve(res.data);
        else reject(new Error(res.error));
      })
      .api(method, JSON.stringify(args));
  });
}

const METHODS = [
  'listClasses', 'createClass', 'deleteClass', 'getClass', 'listStudents', 'addStudents', 'removeStudent', 'setStudentPath',
  'classBoard', 'updateProfile', 'myWorks', 'saveWork', 'submitWork', 'setShared', 'classWork', 'getWorkFull', 'saveGrade',
  'getClassPlan', 'saveClassPlan', 'listGoogleCourses', 'importCourses', 'classroomWork', 'classAlerts', 'alertSummary', 'getPace', 'savePace', 'getDigest', 'setDigest', 'giveAward', 'arcade', 'teacherUnshare', 'listSprites', 'mySprites', 'saveSprite', 'deleteSprite',
];

/** ml5 is stored in pieces, because Apps Script files can't comfortably hold it whole. */
async function loadMl5Pieces() {
  let text = '';
  for (let i = 0; ; i++) {
    const part = await call('libraryPart', i);
    if (!part) return text;
    text += part;
  }
}

export function createAppsScriptStore() {
  setMl5Loader(loadMl5Pieces);
  const store = {
    mode: 'appsscript',
    usesPasscodes: false,
    hasClassroom: true,
    // A whole class shares one script's quota, so students autosave far less often than in the demo.
    saveDelay: 30000,
    lastEmail: '',
    async session() {
      const s = await call('session');
      if (!s || !s.role) {
        store.lastEmail = s?.email || '';
        return null;
      }
      return s;
    },
    async signOut() { /* Sign-in belongs to the student's Google account. */ },
  };
  for (const m of METHODS) store[m] = (...args) => call(m, ...args);
  return store;
}
