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

/** Create a server. `server.as(email)` returns a function that calls api() as that person. */
export function createServer({ owner = 'teacher@school.test', bound = true, codeFile = '../gas/Code.gs', htmlDir = null } = {}) {
  const sheets = new Map();
  const spreadsheet = {
    getId: () => 'fake-sheet',
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new FakeSheet(n); sheets.set(n, s); return s; },
  };
  let activeEmail = '';
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
    HtmlService: { createHtmlOutputFromFile: (name) => ({ getContent: () => readFileSync(new URL(`${htmlDir}/${name}.html`, import.meta.url), 'utf8') }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL(codeFile, import.meta.url), 'utf8'), sandbox, { filename: 'Code.gs' });

  const raw = (email, method, args = []) => {
    activeEmail = email;
    sandbox.spreadsheet_reset?.();
    return JSON.parse(sandbox.api(method, JSON.stringify(args)));
  };
  return {
    sheets,
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
