// Runs the packed dist/ app the way Apps Script serves it, with gas/Code.gs behind it on a fake
// Sheet (data is lost on restart). Inside the same kind of locked-down frame Google uses.
// Sign in as anyone: http://localhost:8081/?as=ari@school.test
import { createServer as createHttp } from 'node:http';
import { readFileSync } from 'node:fs';
import { createServer } from '../tests/fake-gas.mjs';

const OWNER = 'teacher@school.test';
// Sample Google Classroom data, since the preview has no real Google account behind it.
const person = (id, fullName, emailAddress) => ({ userId: id, profile: { name: { fullName }, emailAddress } });
const classroom = {
  courses: [{ id: 'gc1', name: 'Game Design A', section: 'Block 2' }, { id: 'gc2', name: 'Game Design B', section: 'Block 5' }],
  rosters: { gc1: [person('u1', 'Ava Lopez', 'ava@school.test'), person('u2', 'Ben Tran', 'ben@school.test'), person('u3', 'Cy Park', 'cy@school.test')], gc2: [person('u2', 'Ben Tran', 'ben@school.test'), person('u4', 'Dee Fox', 'dee@school.test')] },
  work: { gc1: [{ id: 'a1', title: 'Game plan', alternateLink: 'https://classroom.google.com', dueDate: { year: 2020, month: 9, day: 1 } }, { id: 'a2', title: 'Reflection', alternateLink: 'https://classroom.google.com', dueDate: { year: 2099, month: 1, day: 1 } }] },
  subs: { gc1: [{ userId: 'u1', courseWorkId: 'a1', state: 'CREATED' }, { userId: 'u2', courseWorkId: 'a1', state: 'RETURNED', assignedGrade: 9 }, { userId: 'u3', courseWorkId: 'a1', state: 'TURNED_IN', late: true }, { userId: 'u1', courseWorkId: 'a2', state: 'CREATED' }] },
};
const server = createServer({ owner: OWNER, codeFile: '../dist/Code.gs', htmlDir: '../dist', classroom });
const dist = (f) => readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');

/** Do what HtmlService does with Index.html's template tags. */
function renderIndex(email) {
  const shim = `<script>
window.google = { script: { run: (function make(ok, fail) {
  return new Proxy({}, { get(_, name) {
    if (name === 'withSuccessHandler') return (f) => make(f, fail);
    if (name === 'withFailureHandler') return (f) => make(ok, f);
    return (...args) => fetch('/api?as=' + encodeURIComponent(${JSON.stringify(email)}), { method: 'POST', body: JSON.stringify({ name, args }) })
      .then((r) => r.text()).then((t) => ok && ok(t)).catch((e) => fail && fail(e));
  } });
})() } };
</script>`;
  return dist('Index.html').replace(/<\?!= include_\('(\w+)'\) \?>/g, (_, f) => dist(`${f}.html`)).replace('<head>', `<head>${shim}`);
}

createHttp((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const email = url.searchParams.get('as') ?? OWNER;
  if (url.pathname === '/api') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const { name, args } = JSON.parse(body);
      if (name !== 'api') { res.writeHead(404).end(); return; }
      res.end(JSON.stringify(server.raw(email, args[0], JSON.parse(args[1] || '[]'))));
    });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (url.pathname === '/app') { res.end(renderIndex(email)); return; }
  // Same sandbox flags Google gives web apps, so frame-related problems show up here too.
  res.end(`<!doctype html><title>Pixel Trail (Apps Script preview)</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style>
<iframe sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation" src="/app?as=${encodeURIComponent(email)}"></iframe>`);
}).listen(8081, () => console.log('Apps Script preview: http://localhost:8081/?as=teacher@school.test'));
