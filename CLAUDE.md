# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Pixel Trail teaches middle schoolers to make games in p5.js. A teacher runs classes, grades work, and sees a branching journey map. See `README.md` for the curriculum outline and deployment steps.

## Requirements from the teacher

- **It must run inside the school on Google Apps Script**, with data in a Google Sheet and sign-in through school Google accounts. Don't add outside hosting, databases, or services.
- **Students get overwhelmed by on-screen text.** Lessons are walkthroughs: one short instruction per step, explanations folded under "Why?", and check questions. Apply this to any new lesson or student screen.
- The core must stay at 10 to 15 lessons per student, each 30 to 40 minutes. Extra material goes in Beyond the Summit.
- Points, ranks, and badges are visible to classmates, so they must never be calculated from grades.
- Standard text in `js/curriculum/standards.js` is quoted verbatim from Massachusetts. Never reword it.

## Commands

```bash
npm install                # once, for esbuild
npm start                  # demo mode at :8080, data in localStorage, caching off
npm run preview            # packed app at :8081 with the real server on a fake Sheet
npm test                   # curriculum and server tests
npm run build              # regenerate dist/
```

Run one test:

```bash
node --test --test-name-pattern="core fits" tests/curriculum.test.mjs
```

In the preview, sign in as anyone with `http://localhost:8081/?as=ari@school.test`. The deploying teacher is `teacher@school.test`.

To run every lesson's answer key in the real sandbox, run `npm start` and open `http://localhost:8080/tests/lessons.html` with the tab visible. Browsers pause animation in hidden tabs and off-screen frames, so a blank canvas or "BRAIN not-ready" there isn't necessarily a bug. Confirm ml5 training with an on-screen game. Add `?only=t1,mind/m6` to run just those lessons, or `?at=1` to run one at a time. Running four at a time in headless Chromium can leave some lessons without a frame drawn in time, so rerun failures with `?at=1` before treating them as bugs.

There is no linter. `dist/` is committed and is what gets deployed, so run `npm run build` after any change to `js/`, `css/`, `gas/`, or `vendor/`.

## Architecture

Plain ES modules with no framework. `index.html` runs them directly in demo mode. `tools/build-gas.mjs` bundles them with esbuild into `dist/`, because Apps Script only accepts `.gs` and `.html` files.

### Two data stores, one interface

`js/main.js` uses `js/data/appsscript.js` when `window.google.script` exists, and `js/data/local.js` otherwise. Any new data operation must be added to both, and to the `METHODS` list in `appsscript.js`. Each trip to Apps Script costs about a second, so `appsscript.js` sends calls made at the same moment as one `batch` and reuses read-only answers for 15 seconds. A new read-only method goes in `READS`; any other call clears that cache. Views should start all their calls together with `Promise.all`.

`gas/Code.gs` is the real server:

- `api()` is the only entry point. It determines the user from `Session.getActiveUser()`, never from the browser, then dispatches through `TEACHER_ROUTES` or `STUDENT_ROUTES`.
- Top-level functions without a trailing `_` can be called from the browser, so helpers must end in `_`. Arrow-function constants aren't exposed.
- Each table is a Sheet tab defined in `SCHEMA`. Cells hold plain text. `encText_` prefixes anything that could act as a formula.
- Long values are split across `dataN` columns because Sheets cells cap at 50,000 characters. Listing queries read only the metadata columns (`WORK_META`, `SPRITE_META`), so new metadata fields go there, before the `dataN` columns.
- A whole class shares the deploying teacher's quota, so students autosave every 30 seconds (`saveDelay`).

`tests/fake-gas.mjs` imitates Google's services and `tests/server.test.mjs` attacks the access rules. It is a model. The app has not yet run on real Apps Script.

### Lessons are data that build their own answer key

`js/curriculum/engine.js` is the core idea. A step's `code` and `at` (or `edits`) are both what the student is shown and the edit applied to build that lesson's solution. `buildSolution` is the starter plus every step's edits, so instructions and answers can't drift apart.

- `at` anchors are literal strings in the previous lesson's solution. Editing one lesson can break anchors in later lessons on that road, and the tests will name which one.
- A lesson with no `starter` continues the student's own game. `graph.js` (`previousGameLesson`) finds what it continues from. Shared lessons (`c2`, `c4`, `c6`) apply to every road, so all roads must keep the names `playerX`, `playerY`, `playerSize`, `score`, `won`, `lost`, `resetGame()`, the comments `// player` and `// score and messages`, and the line `rect(playerX, playerY, playerSize, playerSize);`.
- After `c4`, the game's main function is `playGame`, not `draw`.
- A step's `provides: { name, code }` hands the student a finished helper file. Use it when a lesson needs code from a concept not taught yet. Extra files load before `sketch.js` and carry forward (`filesThrough`), and checks run against all of a project's files.
- `graph.js` defines `STAGES`, the roads, and `SIDE_TRAILS`. Each student's order is the core then Beyond. Beyond lessons run after the capstone (`c6`), so their anchors must still exist in code that has been through it. The Low Poly Road (`d1` to `d5`, last in Beyond) is a fresh 3D project in WEBGL that doesn't depend on any road.

A new lesson needs entries beyond its own definition, and the tests enforce all of these:

- Step `mins` must add up to the lesson's `mins`.
- `alignment.js` needs an entry with standards and evidence.
- `checks.js` needs at least two questions, 18 words or fewer each, and at least one that shows code to read. `review.js` reuses those code questions as warm-ups in later lessons, so they must stand on their own.
- Each step's instruction must be 26 words or fewer. `briefOf` picks it automatically from `say`. To set one by hand, add it to `briefs.js`.
- A `reveal: true` step hides its code, so `say` must state a goal and can't point at the code. Its `check` must fail before the student has done the step. Beware of checks that an earlier lesson's code already satisfies.
- A `skeleton` must be valid code containing `TODO`s, and its step's check must fail until those are finished.

Code support is meant to fade across the roads, and a test enforces that.

### The sandbox

`js/sandbox.js` runs student code in an `<iframe sandbox="allow-scripts">` with a strict CSP. Don't add `allow-same-origin`: shared Arcade games would then run with the viewer's identity.

Constraints that follow from this:

- p5 and ml5 are written inline into each game's page. A frame with no origin can't reliably load scripts, and some browsers refuse outright.
- `js/game/synth.js`'s `installSynth` is written into game frames as text with `toString()`, so it must stay self-contained. Songs are text and are filtered to note names on both client and server, because a shared song becomes code in a classmate's project.
- ml5 is about 4 MB, so it loads only when the code contains `ml5.`, and the build splits it into `ML5_n` files that the server sends one at a time.
- ml5 needs an in-memory `localStorage` stand-in and `setBackend('webgl')`, both added in `buildDoc`.
- The sandbox can't open a camera. `createCapture` is replaced with a canvas, and the parent page sends in image frames. Other people's games use `askCamera` to ask the viewer first.
- `protectLoops` adds a stop check to loops so an infinite loop can't freeze the tab.

## Not yet verified

`js/game/pace.js` and `js/game/blame.js` run on both sides: the build strips `export` and appends them to `dist/Code.gs`, so they can't import anything and their names end in `_`. Every Google Classroom route must check `ownerOnly_`, because the app runs with the deploying teacher's access.

Group projects share one document: only the student holding the keyboard (the `Teams` row's `driver_id`) can change code, the server credits lines in `blame.js`, and the code is mirrored to each member's `Works` row so grading and later lessons don't need to know about groups.

Grades can only be written to Classroom assignments this app's Google Cloud project created, so `pushGrades_` makes its own and records them in `GradeSync`. Changing the script's Cloud project would make those assignments unwritable.

These need a real deployment: anything on real Apps Script, the Google Classroom API (including grade writes on students who haven't turned anything in) and daily email, full-class quota limits, whether Apps Script's outer frame permits the camera, and loading an actual Teachable Machine model.
