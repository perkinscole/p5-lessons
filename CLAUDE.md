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

`js/main.js` uses `js/data/appsscript.js` when `window.google.script` exists, and `js/data/local.js` otherwise. Any new data operation must be added to both, and to the `METHODS` list in `appsscript.js`. Each trip to Apps Script costs about a second, so `appsscript.js` sends calls made at the same moment as one `batch` (through `queue.js`) and reuses read-only answers for 15 seconds. A new read-only method goes in `READS`; any other call clears that cache. Views should start all their calls together with `Promise.all`.

`gas/Code.gs` is the real server:

- `api()` is the only entry point. It determines the user from `Session.getActiveUser()`, never from the browser, then dispatches through `TEACHER_ROUTES` or `STUDENT_ROUTES`.
- Top-level functions without a trailing `_` can be called from the browser, so helpers must end in `_`. Arrow-function constants aren't exposed.
- Each table is a Sheet tab defined in `SCHEMA`. Cells hold plain text. `encText_` prefixes anything that could act as a formula.
- Long values are split across `dataN` columns because Sheets cells cap at 50,000 characters. Listing queries read only the metadata columns (`WORK_META`, `SPRITE_META`). Teachers' Sheets now hold real data, so a new `Works` field goes in `WORK_TAIL`, after the `dataN` columns, where existing rows keep their columns. `metaWorks_` reads it with one extra range. Never insert a column before existing ones.
- A whole class shares the deploying teacher's quota, so students autosave every 30 seconds (`saveDelay`).

`tests/fake-gas.mjs` imitates Google's services and `tests/server.test.mjs` attacks the access rules. It is a model. The app has not yet run on real Apps Script.

### Reliability under a full class

Every student's request counts against the deploying teacher's account, which allows about 30 at the same moment. A whole class once overloaded a sibling app this way, and that app then mistook "could not open the Sheet" for "no Sheet" and started an empty one. These rules prevent both, and `tests/server.test.mjs` ("reliability:") and `tests/queue.test.mjs` enforce them:

- `db_()` only creates or adopts a Sheet when `DATA_SHEET_ID` has never been set. After that it opens that id, with retries, or throws `BUSY_`. Never add a fallback that creates storage on an error. `rememberSheet_` keeps every id used in `DATA_SHEET_HISTORY`.
- Reads throw on failure. Don't catch a read and continue with a default that is later saved. `parseList_` is only for notes in script properties.
- An error starting with `BUSY:` means the request did not run, so `js/data/queue.js` retries it with backoff. Only use it before anything has been written. The queue sends one trip at a time per browser; `direct` is for large answers that shouldn't share a batch.
- A student action must not read a whole tab. `findRows_` finds rows with Sheets' own search, and `myWorkList_` / `myWorkRow_` read just one student's lessons. Whole-tab reads (`rows_`, `metaWorks_`) are for teacher pages and class-wide views.
- `classBoard_` is shared through `CacheService` for 20 seconds. Teacher writes replace it (anything not in `TEACHER_READS`), as do the student routes in `BOARD_WRITES` and a first save of a lesson. Routine autosaves don't, so `step_at` can lag by 20 seconds.
- Nothing slow (Classroom, mail, `backup_`) runs inside `withLock_`.
- Anything on a timer that calls the server must skip while `document.hidden` and use the slowest interval that works.
- `dataInfo`, `backupNow`, `dataSwitch`, and `dataCombine` are owner-only (`dataOwner_`). `combinePlan_` only adds or improves, matches students by email, and is safe to run twice.

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

### Moving through a lesson

In `js/views/lesson.js`, `gate()` is the first unanswered check question; a student can't open anything past it, and `kindOf(step)` labels each step as something to do or only to read. Answered questions are restored from `quiz_first` when a lesson is reopened. Steps themselves are not locked: an unfinished one can be skipped, because a check that wrongly fails must never trap a student. An idle student gets a nudge (the `nudge` class, added by a timer in the lesson page): the next thing to do pulses after 25 seconds, and after 50 the editor shows the place marker with the code to type. It is browser-only and must stay that way: no request, nothing stored. Lessons in `TYPE_ALONG` (the first three) open the line for a coding step and show its `code` as ghost text that shrinks as it is typed (`startTyping`, `updateTyping`); auto-closing brackets are off while it runs. Each passing step pays `XP.step` at once (`gainXP`), counted from `checks_passed`, which the class board now carries. The teacher's private stalled list (`stalledList` in `report.js`, `stalledCard` in `feedback.js`) reads `updated_at` from `classWork` once a minute and must never be shown on the projected display.

### The journey map

`js/views/map.js` draws the map as SVG over a pixel overworld. The trails curve out of each fork and back into each crossing (`routePath`), and characters get a white outline, a shadow, and a glow (`map-sticker`, `map-halo`) with a YOU tag on the student's own.

The ground comes from `js/game/overworld.js`: a top-down picture drawn in code, with a different land for each stage in trail order (`ORDER`: camp, forest, lake, autumn, highland, two of snow for the Summit, alpine, grove, crystal, dusk, desert). `planOverworld` decides where everything goes with no drawing, so a test can check that nothing sits under a stop, a label, a trail, or where characters stand; `overworldArt` paints it once. A new prop needs a sprite in `SPRITES` and, if it is bigger than a bush, a size in `ROOM`. The land has height: `map.js` turns each run of stops on a high road into a raised mesa and each on a low road into a sunken canyon (`terraces`, one tier of cliff per lane away from the middle), and `overworldArt` draws the stone faces. That depth is what the teacher missed from the first version, so keep it.

The teacher's history with this picture: the first version was a busy blocky side-view world that hid the characters and drew roads as boxy pipes; a plain flat map fixed that but lost the charm. So keep the palette soft, keep props off the trails, and let characters and the student's own road be the brightest things on it. `js/game/world.js` still draws the scenery behind the class display's race; the map no longer uses it.

### Celebrations

`js/celebrate.js` holds every chime and reward animation (`chime`, `sparkle`, `confetti`, `pop`, `correct`, `incorrect`, `splash`, `popBadge`, `popRank`, `flyXP`, `celebrateNew`). `splash` is the full-screen moment for a finished lesson, a badge, or a rank; they queue and a tap or key moves on. The student's XP sits in the top bar (`xpPurse`), and `flyXP` sends coins into it. Use it for any new "you did it" moment rather than playing sounds directly, so the Display sound setting and reduced-motion are respected in one place. Don't give a pop-up card a class that an existing component uses (`badge` restyled it once).

### Feedback and help

`js/views/feedback.js` has the student controls (`confusingButton`, `helpBox`, `ratingBox`) and the teacher's Feedback tab and live `helpCard`. `js/curriculum/report.js` builds the Markdown report with no DOM, so it is tested. On the server, `Flags` holds one row per student, lesson, and target (`step:3` or `quiz:1`, both counted from 0), plus an append-only row with reason `help` each time a student asks for help on a new step; `Help` holds at most one open request per student. `helpRequests` and `myHelp` are polled, so `appsscript.js` lists them in `LIVE`: never cached, and never clearing the cache. First tries on check questions are kept once in the `quiz_first` column (`firstTries_`). Flags and first tries are stored by step and question position, so inserting a step or question in the middle of a live lesson shifts what earlier feedback points at; add to the end or accept the shift.

### Language and problem reports

Screens are written in English only. `js/translate.js` watches the page and swaps text for its translation, a sentence at a time, so don't add a second copy of any string. Mark anything that must stay as written with `translate: 'no'` (names, what a person typed, standards text); `pre`, `code`, and the editor are always skipped. A translation is only ever put on the page as text and copies of the page's own `strong`/`em`/`code` elements, never as HTML. `translate_` on the server translates each sentence once with `LanguageApp`, outside the lock, and keeps it in the cache and the `Translations` tab. To add a language, add it to `LANGS_` and to `languageChoice` in `settings.js`. Text that changes constantly (clocks, counts with names) costs a translation each time, so mark it `translate: 'no'`.

`js/views/bugs.js` has the report form and the teacher's list; `buildBugReport` in `report.js` makes the Markdown. `noteError` keeps the page's last five errors to send along. Reports are capped per person per day on the server.

### Student view

A teacher's **Student view** runs student routes as a pretend student (`previewStudent_`, `asStudent_` in `Code.gs`). That student's email and class id are `preview:<teacher email>`, which no Google account can be, and the class row's `teacher_email` is the same value rather than the teacher's, so every teacher page that lists classes by owner skips it. Keep it that way: don't list classes or students without filtering by owner. In the browser, `store.setPreview(true)` makes `appsscript.js` send every call through `asStudent`, and `app.session.preview` is set; the character page uses it to show every item unlocked.

### Trail Quest

`js/game/quest.js` holds the rules and the floor generator with no drawing, so `tests/quest.test.mjs` can check that every floor is fair at any depth (stairs and everything else reachable, only vault chests behind cracked rocks, nothing spawning on the player). A run is an endless race through rooms. A room is exactly one screen (`W` by `H` tiles equals the canvas), so nothing is ever off screen: the teacher found a scrolling map slow and confusing, so don't make rooms bigger. Each has a key, then a door (`world.door`), and a par time for a speed bonus. `generateFloor(seed, depth)` makes each room from the run's seed, and `difficulty(depth)` is the one place that says what gets harder. Everyone can dash; gear and relics (`RELICS`, `pickRelic`) make it stronger, `BOOSTS` are short pickups, and none of it is saved after the run. `tests/quest.html?depth=6&gear=1` (with `npm start`) opens any room to look at, and adding `&auto=1` plays a run by itself. `js/views/quest.js` draws and runs it on a plain canvas in the app's own page, not the sandbox, since it is our code. `powersFor` maps character slots to powers; a new slot power goes there and in `POWERS`.

The server (`world*_` in `Code.gs`) only keeps time and coins. Play time is counted from submitted `Works` rows, never stored, so it can't be granted from the browser. `worldEnter_` stamps a run and `worldRun_` holds the reported seconds and coins to what that run allowed. The server also keeps the deepest floor (`best_floor`, the last column, read by `worldMeta_`) and holds it to what the run's time allowed. A run records player 1's position every half second, with a marker each time they go down the stairs (`encodePath`); a best run is kept as that student's ghost with its world seed, and `worldGhosts_` returns classmates' ghosts for a seed so a race replays them in the same world. Paths are checked against `WORLD_PATH` on the way in and out, and `worldState_` reads only `WORLD_META` so the board never carries them. Two players on one keyboard is purely in the browser. A student who edits the browser code can still play for free, since the game is client-side; the limits protect the class board. Live multiplayer isn't possible on Apps Script, so don't add polling for other players' positions.

## Not yet verified

`js/game/pace.js` and `js/game/blame.js` run on both sides: the build strips `export` and appends them to `dist/Code.gs`, so they can't import anything and their names end in `_`. Every Google Classroom route must check `ownerOnly_`, because the app runs with the deploying teacher's access.

Group projects share one document. Each file has its own keyboard (the `Teams` row's `holders`, which lapse after `TEAM_HOLD_MS`), so members edit different files at the same time. `mergeTeamDoc_` keeps a saver's version only of files they hold or just created, and keeps the group's version of everything else, so a stale browser can't undo a teammate's work. `local.js` follows the same rules. `driver_id` and `driver_until` are unused leftovers kept so existing rows keep their columns. The server credits lines in `blame.js`, and the code is mirrored to each member's `Works` row so grading and later lessons don't need to know about groups.

Grades can only be written to Classroom assignments this app's Google Cloud project created, so `pushGrades_` makes its own and records them in `GradeSync`. Changing the script's Cloud project would make those assignments unwritable.

These need a real deployment: anything on real Apps Script, `LanguageApp` translation (quality, speed, daily quota, and whether it asks for a new permission), the Google Classroom API (including grade writes on students who haven't turned anything in) and daily email, full-class quota limits, whether Apps Script's outer frame permits the camera, and loading an actual Teachable Machine model.
