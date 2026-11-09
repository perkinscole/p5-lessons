// A stand-in for Google's services, so gas/Code.gs can run here. It copies the limits that matter
// (50,000 characters a cell, formulas in cells). It is a model: real Apps Script may still differ.
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CELL_LIMIT = 50000;

class FakeRange {
  constructor(sheet, row, col, rows, cols) { Object.assign(this, { sheet, row, col, rows, cols }); }
  getValues() {
    this.sheet.reads++;
    return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.cols }, (_, c) => this.sheet.grid[this.row - 1 + r]?.[this.col - 1 + c] ?? ''));
  }
  setValues(values) {
    values.forEach((vals, r) => vals.forEach((v, c) => this.sheet.setCell(this.row + r, this.col + c, v)));
    return this;
  }
  setNumberFormat() { this.sheet.plain = true; return this; }
}

class FakeSheet {
  constructor(name) { this.name = name; this.grid = []; this.reads = 0; this.plain = false; }
  setCell(row, col, v) {
    if (typeof v === 'string' && v.length > CELL_LIMIT) throw new Error(`Cell over ${CELL_LIMIT} characters in ${this.name}`);
    if (typeof v === 'string' && v.startsWith('=')) throw new Error(`Would become a formula in ${this.name}: ${v.slice(0, 30)}`);
    while (this.grid.length < row) this.grid.push([]);
    this.grid[row - 1][col - 1] = v;
  }
  getRange(row, col, rows = 1, cols = 1) { return new FakeRange(this, row, col, rows, cols); }
  getLastRow() { return this.grid.length; }
  appendRow(vals) { const row = this.grid.length + 1; vals.forEach((v, c) => this.setCell(row, c + 1, v)); }
  deleteRow(row) { this.grid.splice(row - 1, 1); }
  setFrozenRows() {}
}

/** Stands in for the Classroom API. Serves `data` two items per page, to exercise paging. */
function fakeClassroom(data) {
  const page = (items, key, token) => {
    const at = Number(token || 0);
    const out = { [key]: items.slice(at, at + 2) };
    if (at + 2 < items.length) out.nextPageToken = String(at + 2);
    return out;
  };
  return {
    Courses: {
      list: (o) => page(data.courses || [], 'courses', o.pageToken),
      Students: { list: (id, o) => page((data.rosters || {})[id] || [], 'students', o.pageToken) },
      CourseWork: {
        list: (id, o) => page((data.work || {})[id] || [], 'courseWork', o.pageToken),
        // Like the real API: grades can only be written on coursework this app created.
        create: (body, courseId) => {
          data.created = data.created || [];
          const work = { ...body, id: `made-${data.created.length + 1}`, courseId, alternateLink: 'https://classroom.test/a' };
          data.created.push(work);
          return work;
        },
        StudentSubmissions: {
          list: (id, workId, o) => page(workId === '-' ? (data.subs || {})[id] || [] : (data.madeSubs || {})[id] || [], 'studentSubmissions', o.pageToken),
          patch: (body, courseId, workId, subId, opts) => {
            if (!(data.created || []).some((w) => w.id === workId)) throw new Error('ProjectPermissionDenied');
            if (!opts.updateMask.includes('draftGrade') || !opts.updateMask.includes('assignedGrade')) throw new Error('bad mask');
            data.patched = data.patched || [];
            data.patched.push({ courseId, workId, subId, ...body });
            return body;
          },
        },
      },
    },
  };
}

/** Create a server. `server.as(email)` returns a function that calls api() as that person. */
export function createServer({ owner = 'teacher@school.test', bound = true, codeFile = '../gas/Code.gs', htmlDir = null, classroom = null } = {}) {
  const sheets = new Map();
  const spreadsheet = {
    getId: () => 'fake-sheet',
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new FakeSheet(n); sheets.set(n, s); return s; },
  };
  let activeEmail = '';
  const mail = [];
  const triggers = [];
  const props = new Map();
  let created = 0;
  const sandbox = {
    console: { error() {}, log() {} },
    Session: { getActiveUser: () => ({ getEmail: () => activeEmail }), getEffectiveUser: () => ({ getEmail: () => owner }) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => (bound ? spreadsheet : null),
      openById: () => spreadsheet,
      create: () => { created++; return spreadsheet; },
      flush() {},
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => randomUUID() },
    Classroom: fakeClassroom(classroom || {}),
    MailApp: { sendEmail: (to, subject, body) => mail.push({ to, subject, body }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.test/exec' }),
      getProjectTriggers: () => triggers,
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (fn) => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create: () => triggers.push({ getHandlerFunction: () => fn }) }) }) }) }),
    },
    HtmlService: { createHtmlOutputFromFile: (name) => ({ getContent: () => readFileSync(new URL(`${htmlDir}/${name}.html`, import.meta.url), 'utf8') }) },
  };
  vm.createContext(sandbox);
  let source = readFileSync(new URL(codeFile, import.meta.url), 'utf8');
  if (codeFile === '../gas/Code.gs') {
    for (const f of ['pace', 'blame']) source += `\n${readFileSync(new URL(`../js/game/${f}.js`, import.meta.url), 'utf8').replace(/^export /gm, '')}`;
  }
  vm.runInContext(source, sandbox, { filename: 'Code.gs' });

  const raw = (email, method, args = []) => {
    activeEmail = email;
    sandbox.spreadsheet_reset?.();
    return JSON.parse(sandbox.api(method, JSON.stringify(args)));
  };
  return {
    sheets,
    mail,
    triggers,
    run: (email, fn) => { activeEmail = email; return sandbox[fn](); },
    createdCount: () => created,
    raw,
    as: (email) => (method, ...args) => {
      const r = raw(email, method, args);
      if (!r.ok) throw new Error(r.error);
      return JSON.parse(JSON.stringify(r.data));
    },
    /** Names a browser could call: every top-level function without a trailing underscore. */
    publicFunctions: () => Object.keys(sandbox).filter((k) => typeof sandbox[k] === 'function' && !k.endsWith('_')),
  };
}
