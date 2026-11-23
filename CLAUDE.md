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

In the preview, sign in as anyone with `http://localhost:8081/?as=ari@school.test`. The deploying teacher is `teacher@school.test`. `PT_PORT=8203 node tools/gas-preview.mjs` runs it on another port, and `PT_DIST=name` serves a copy of `dist/` kept in the repository folder (for trying a file cut short).

To run every lesson's answer key in the real sandbox, run `npm start` and open `http://localhost:8080/tests/lessons.html` with the tab visible. Browsers pause animation in hidden tabs and off-screen frames, so a blank canvas or "BRAIN not-ready" there isn't necessarily a bug. Confirm ml5 training with an on-screen game. Add `?only=t1,mind/m6` to run just those lessons, or `?at=1` to run one at a time. Running four at a time in headless Chromium can leave some lessons without a frame drawn in time, so rerun failures with `?at=1` before treating them as bugs.

The teacher installs a build by pasting `dist/` files into the Apps Script editor. A paste of `App` has twice arrived cut short, which left the app not starting with no useful message. So `tools/build-gas.mjs` wraps the packed text into 4,000-character lines and opens `App` and `P5` with a small check (`CHECK`) that knows how long the contents should be and says on screen when they are not. Keep both.

`docs/APPS_SCRIPT_COMPRESSION.md` has measured sizes and ordered steps for making the Apps Script build smaller and the map's first draw faster. Step 1 is done: the build gzips each library before base64, the loader in `App.html` and `js/pack.js` unpack them in the browser, and ml5 travels in two files instead of five. The app still reads older uncompressed files, so a project with a mix keeps working. Step 2 is done: the build sets `DEMO` to false so esbuild leaves `js/data/local.js` out of the packed app; the build fails if the demo store is found in the bundle, and the packed app throws a plain message if `google.script` is missing. Keep the `DEMO` test in `js/main.js` in a form esbuild can fold. Step 4 is done: `buildWorld` in `map3d.js` is a generator that `prepareWorld` runs 30 ms at a time while `mapView` shows `loading()`, so the page keeps responding; add a `yield` to any new slow pass, never inside a callback. Step 3 (lessons by road) is deliberately not done.

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
- Opening a page should be one trip. At startup `main.js` asks for the session and, guessing from `pixeltrail.boot` (role and class id only, never a name), for what Home needs in the same trip. `loadMe(withCode)` asks `myWorks` for code only for the lessons a page will use; the rest arrive as details with `full: false` (`metaRows_`). Only the lesson page needs code, and it refuses to open if a lesson it needs came without it, because an empty editor would be saved over real work.
- A student action must not read a whole tab. `findRows_` finds rows with Sheets' own search, and `myWorkList_` / `myWorkRow_` read just one student's lessons. Whole-tab reads (`rows_`, `metaWorks_`) are for teacher pages and class-wide views.
- `classBoard_` is shared through `CacheService` for 20 seconds. Teacher writes replace it (anything not in `TEACHER_READS`), as do the student routes in `BOARD_WRITES` and a first save of a lesson. Routine autosaves don't, so `step_at` can lag by 20 seconds.
- One script lock is shared by every save in the app, so the time a save holds it sets how many students can work at once. Keep work inside `withLock_` to the fewest Sheet calls. `myWorkRow_` remembers a lesson's row number in the cache and checks it by reading the row; `teamOf_` remembers that there are no groups; `whoAmI_` remembers who someone is for two minutes (`whoCached_`). Every write goes through `update_`, `insert_`, or `deleteRows_`, which call `wrote_` to forget what a change makes stale. Anything that writes rows another way must call `wrote_` itself, and a route that writes a person's row must read it again inside the lock, as `updateProfile` does.
- A routine autosave waits only 6 seconds for the lock and is sent once (`ONCE` in `appsscript.js`, `once` in the queue); the lesson page saves again later. A submit waits the full 20 seconds and is retried.
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
- ml5 is about 4 MB (1.4 MB compressed), so it loads only when the code contains `ml5.`, and the build splits it into `ML5_n` files that the server sends one at a time.
- ml5 needs an in-memory `localStorage` stand-in and `setBackend('webgl')`, both added in `buildDoc`.
- The sandbox can't open a camera. `createCapture` is replaced with a canvas, and the parent page sends in image frames. Other people's games use `askCamera` to ask the viewer first.
- `protectLoops` adds a stop check to loops so an infinite loop can't freeze the tab.

### Moving through a lesson

A question made with `first(...)` in `checks.js` is a "read first" question: it sits on its step's own card and the step's code, place marker and type-along stay hidden until it is answered (`pending`, `readFirst`), so a line is read before it is copied. The teacher asked for this after students typed a line and then couldn't say what its numbers meant. Code shown in a step is colored by the editor's own tokenizer (`snippet`). The step dots run across the page under the lesson's name (`.step-track`), and the three panels and the messages under the game are resizable (`splitter`, sizes kept in this browser under `pixeltrail.panes`); the game is scaled to its frame inside the sandbox (`FIT_CANVAS`). What the variables lessons (`t3`, `t4`) taught us, after a class finished them unable to say what a variable is: a value the student cannot see must be put on screen (`text` shows `saucerX` counting up); a card carries one idea, not a definition plus syntax plus scope; a new idea gets an experiment where one change has a visible effect before it is built on; a reflection or check only asks about a word or contrast a card has taught (`t4` asked for the difference between made and built-in variables without ever stating it); and each core idea gets one question that carries it outside the lesson. Hold new lessons to these. Every lesson ends with a check question that puts its idea in another setting (a map app, a vending machine) and a reflection that asks where else the idea would be useful, and a test requires both. A step's card shows `shownCode(step)`: its `show`, its `code`, or every piece of its `edits`; a test fails if a step that adds code shows none (fifteen Low Poly and sound steps once said "Add this" over an empty card). Where a step brings in a new idea, its entry in `briefs.js` names the idea before saying where the code goes, because an idea left under "Why?" goes unread. The game takes the room in its panel first (`fitGame`): the messages give way and the buttons over it shrink (`compact`). `pronounce` makes what matters in an instruction stand out: **Run** and **Grid** look like their buttons, code is a chip that never breaks across lines, and a word that matches one of the lesson's key ideas in `today.js` is a yellow chip that opens that idea. A student's top bar is Home, Journey, and two menus, Tools and Arcade; inside a lesson a tool opens over the lesson through `app.lessonTools`.

The teacher then found the one-line instructions too terse: fragments such as "`x` is horizontal. `y` is vertical and counts down" did not say what a thing is or why a step is being done, and lesson 1 never explained what the Grid is. So the first three lessons (`t1`, `t3`, `t4`, the `PLAIN` set in the tests) have instructions in `briefs.js` written as whole sentences in two or three short paragraphs: the idea first, in plain words, and the action last. The page shows the last paragraph bold and the rest as ordinary text, and the checklist uses the last paragraph as a hidden step's goal. A plain instruction may be up to 75 words but no sentence may pass 26. When another lesson is rewritten this way, add it to `PLAIN`; do not go back to fragments to save words. "I'm stuck" is a full-width yellow button under the step (`.help-ask`), because as a small link students did not find it.

In `js/views/lesson.js`, `gate()` is the first unanswered check question; a student can't open anything past it, and `kindOf(step)` labels each step as something to do or only to read. Answered questions are restored from `quiz_first` when a lesson is reopened. Steps themselves are not locked: an unfinished one can be skipped, because a check that wrongly fails must never trap a student. An idle student gets a nudge (the `nudge` class, added by a timer in the lesson page): the next thing to do pulses after 25 seconds, and after 50 the editor shows the place marker with the code to type. It is browser-only and must stay that way: no request, nothing stored. Lessons in `TYPE_ALONG` (the first three) open the line for a coding step and show its `code` as ghost text that shrinks as it is typed (`startTyping`, `updateTyping`); auto-closing brackets are off while it runs. `submit()` sends once however many times the button is pressed, shows "Submitting…", and on failure says so on the Finish page; afterwards it works out the new stats from the server's answer instead of asking again, because the whole class submits in the same minute. `markCelebrated` only ever adds to what a browser has celebrated, since the class board can be behind and a shrinking record made badges pop up repeatedly. **Reset code** (`cleanCopy`) offers the code as it should be at the current step (`buildThrough`), keeping answers and place. Each passing step pays `XP.step` at once (`gainXP`), counted from `checks_passed`, which the class board now carries. The teacher's private stalled list (`stalledList` in `report.js`, `stalledCard` in `feedback.js`) reads `updated_at` from `classWork` once a minute and must never be shown on the projected display.

### The journey map

The map is 3D by default (`js/views/map3d.js`), with the flat one (`buildMap` in `js/views/map.js`) behind a **Flat map** button; `mapView` picks between them from the `mapFlat` Display setting. Both are used on the student's Journey page and the teacher's Journey tab.

How the 3D one works, with no 3D library:

- `js/game/overworld.js` plans and paints a top-down pixel picture of the land: a different land for each stage in trail order (`ORDER`), with props kept off stops, labels, and trails (`planOverworld`, which has no drawing and is tested). `paintGround` gives the ground alone; `spritePixels` gives each standing thing as pixels.
- `js/game/terrain.js` (`buildHeights`, tested) says how high the ground is. Each run of stops on a high road is a mesa and each on a low road a canyon, reached by a ramp along the trail so a road never jumps a cliff. Mountains and pyramids are terrain too. The land is built from blocks (`step`, `block`): every block has one height, a whole number of steps, with rolling hills (`hills`) that flatten toward the trails and stops (`calm`). The teacher asked for this block-game look after finding the smooth version read as an untextured model.
- `map3d.js` draws it the way old flight games did: for each strip of ground from near to far, each screen column looks up the height and paints down to what is already there. Where the ground stands higher than the strip in front of it, the lower part of what shows is a block's side, painted earth or stone (`S`) with a line at each block. Tops are speckled and each block is a slightly different shade. Standing things are planted as the strips pass them, so nearer land hides them. The world is lit once, when it is built: a low sun in the north-west casts shadows from taller blocks, corners are dimmer, and high ground is brighter. Each land also has its own character there (`ROUGH` for how hilly, `POOLS` for water, `DOTS` for what lies on the ground, `LIGHT` for its tint, `SIDES` for what its blocks are made of), and some crystals become spires of land. Trails are painted onto the ground picture, so they follow the land. It draws at half size and only when the map is scrolled or resized. The built world is kept for the visit in `worlds`, keyed by the student's road; `performance.getEntriesByType('measure')` shows how long building and the first draw took.
- Life: castles and watchtowers are laid block by block (`castlePlan` in `terrain.js`, placed by `SITES`), a river crosses the lake land with a plank bridge where the trail meets it, and the land climbs into wooded foothills along the back (`foothills`) and carries on past both ends as a mirror image, so the trail is never out on an empty plain. Animals (`js/game/critters.js`, `HABITATS`) are small page elements with slow CSS movement, placed only where no nearer land hides them; flocks of birds hang in the sky and slide past as the map scrolls. All of it is decoration: none of it is clickable or read aloud, and it stops moving for anyone who has asked for reduced motion.
- Each lesson stop is a small building (`js/game/stops.js`): castles and towers on the high roads, cottages and cabins below them, cave mouths on the low roads, and each land's own landmark on the shared trail, with a badge in the road's colour for done, next, or not yet. Characters stand on the road beside their stop, each with a shadow at their feet. The teacher asked for both after disliking number tiles and characters floating above markers, and did not like balloons in the sky; birds stayed.
- Lesson stops, names, and characters are ordinary page elements placed over the picture (`.pin`). That keeps them sharp, clickable, reachable by keyboard, and never hidden behind a hill. Keep it that way: the teacher's first complaint about the map was that characters were hard to see.

The map was then reworked after the teacher's next round of notes (stops sat on the road, the road was hard to see, the far land was uniform, a boat was on dry land, characters looked pasted on). What that changed, and must be kept:

- Each stop has a plot set back from the road (`sites` in `buildWorld`): a paved yard, a path to the road, and a cast shadow. The pin stays on the road and the building is carried back by `--by`/`--bs`.
- Roads are laid as cobbles in the road's own colour with a pale edge and a dark kerb (`layRoads`, `paving`), are never fully in shadow, and a sight-line pass lowers hills in front of them. The shared trail is slate, since cream vanished on sand and snow.
- The far country is real terrain (`backLand`): ridges, buttes, forests, rock and snow, different behind each land (`LOOK[land].far`). Each land has a stronger 3D-only palette (`LOOK`, passed to `paintGround`), the terraces are taller steps (`LIFT`, `BAND`), and low roads have cave mouths cut in the canyon wall (`hole`).
- `canLive` in `critters.js` (tested) decides where an animal fits: a boat needs water under its whole width and drift, a walker needs dry level ground for its whole walk. `mayStand` keeps props out of water, off roads, plots and cliff edges.
- Characters have a thin dark outline and a contact shadow, not a white sticker edge. `crowdSlots` in `stops.js` (tested) stands a group in rows beside its own stop, narrow enough not to cover the next stop's building, with the signed-in student always in the front row nearest the stop and drawn on top.

The teacher's history with this picture: a busy blocky side-view world hid the characters and drew roads as boxy pipes; a flat map fixed that but lost the charm; a top-down pixel overworld brought charm back but not depth; they then asked for a view at an angle with roads climbing into the distance. So keep the depth, keep the palette soft, and keep characters and the student's own road the brightest things on it. `js/game/world.js` still draws the scenery behind the class display's race; the map no longer uses it.

### The class display's race

`racePanel` in `js/views/project.js` draws today's lesson as a hill of blocks: each step is one block higher (`--rise`), with its number and name on the block's face, and the finish is the top. The teacher asked for names to show at all times and for the parts to grow and shrink around the students, so: a block's width follows the names standing on it (`roomFor`, never narrower than the longest word, `widestWord`), long names wrap, and `fitTrail` searches for the largest character height (`--ph`) at which nothing runs out of height. Don't bring back a size at which names hide. The race shows the lesson most students are on unless the teacher picks one in **Set up today** (`plan.lesson`, cleaned by `cleanPlan_`); a picked lesson places every student who has work on it, and the question and standards follow it. Each step has its own colour (`STEP_HUES`) on its block, a band behind its characters, and their name tags, so it is plain from the back of the room where someone is. Who asked for help still only shows as a hop and a glow.

Teacher buttons that only flip a setting (**✓ Helped**, Trail Quest, Music Maker) change on screen at once and save in the background, putting things back with a message if the save fails. On a busy day the save can take seconds, and waiting for it made the buttons seem broken.

While anything loads, show `loading()` from `ui.js` (a hiker hopping along a trail), not plain text. `Index.html` shows the same thing before the app's code has run.

### Celebrations

`js/celebrate.js` holds every chime and reward animation (`chime`, `sparkle`, `confetti`, `pop`, `correct`, `incorrect`, `splash`, `popBadge`, `popRank`, `flyXP`, `celebrateNew`). `splash` is the full-screen moment for a finished lesson, a badge, or a rank; they queue and a tap or key moves on. The student's XP sits in the top bar (`xpPurse`), and `flyXP` sends coins into it. Use it for any new "you did it" moment rather than playing sounds directly, so the Display sound setting and reduced-motion are respected in one place. Don't give a pop-up card a class that an existing component uses (`badge` restyled it once).

### Feedback and help

`#/feedback` (`viewAllFeedback`, linked from the Classes page and each class's Feedback tab) shows every class's feedback added together. `mergeFeedback` in `report.js` (tested) adds up what `lessonRatings` returns for each class into the same shape, so the page and the report are the ones a single class uses. It asks for all classes in one trip and needs nothing new from the server. `js/views/feedback.js` has the student controls (`confusingButton`, `helpBox`, `ratingBox`) and the teacher's Feedback tab and live `helpCard`. `js/curriculum/report.js` builds the Markdown report with no DOM, so it is tested. On the server, `Flags` holds one row per student, lesson, and target (`step:3` or `quiz:1`, both counted from 0), plus an append-only row with reason `help` each time a student asks for help on a new step; `Help` holds at most one open request per student. `helpRequests` and `myHelp` are polled, so `appsscript.js` lists them in `LIVE`: never cached, and never clearing the cache. First tries on check questions are kept once in the `quiz_first` column (`firstTries_`). Flags and first tries are stored by step and question position, so inserting a step or question in the middle of a live lesson shifts what earlier feedback points at; add to the end or accept the shift.

### Materials: slides, worksheet, checklist

`js/curriculum/materials.js` (no screen code, tested in `tests/materials.test.mjs`) turns any lesson into slides to project (`slidesFor`), a one-page worksheet (`worksheetFor`), its answer key (`answerKeyFor`) and a half-page checklist (`checklistFor`). Nothing is written by hand for a lesson: key ideas come from `today.js`, questions from `checks.js`, steps and reflection from the lesson, standards from `alignment.js`. So never add per-lesson text here; fix the lesson data and the materials follow. `js/views/materials.js` draws them at `#/materials/<lesson>/<road>/<tab>`, a teacher-only route linked from each card on the Lessons page and from a lesson's teacher preview. It asks the server for nothing and stores nothing. Keep it that way.

- The Today card was the first "intro slide", and the slides build on it: `demoFor` (in `materials.js`) decides whether a finished game can run with nothing to load, and both the Today card and the "You will build" slide use it. On a slide the player is made with `takeFocus: false`, so the arrow keys (and a clicker) keep moving slides until the game is clicked.
- `LIMITS` sets the most words on a slide, a worksheet and a checklist, and the most lines of code that are projected or printed. The tests hold all 52 lessons to them. Students get overwhelmed by text: shorten the lesson data, do not raise a limit.
- The worksheet object carries no answers at all (no `answer`, no `why`, meanings in a mixed order that is the same every time). Only `answerKeyFor` knows them, and a test checks nothing leaks. A new worksheet part must keep that split.
- Slides show one or two of the lesson's own code questions, and the answer stays hidden until the next key press. The worksheet uses the lesson's other code questions first; most lessons have one, so a second comes from an earlier lesson on the road and is marked "Look back". The closing slide is the last question after the last step.
- Standards are passed through as `{ code, text }` straight from `standards.js` and drawn with `translate: 'no'`, as is all code. Fixed labels reuse the app's existing wording where there is one, so translations are shared.
- A slide is 16 by 9 and sizes everything from its own height (`cqh`), so a thumbnail and the projector match. Its section class is `kind-<kind>`; `slide-<kind>` names are inner parts (sharing them once shrank a whole slide). Present mode is an overlay that tries full screen and still fills the page where that is refused, as it may be on Apps Script.
- Printing prints what is on screen (`window.print()` with the `@media print` rules at the end of `app.css`), not a hidden copy, because `translate.js` needs time to translate what it is shown. That is why "All worksheets" is a tab that lays out a road's core worksheets. Paper is black on white in every theme. Every worksheet, key and pair of checklists is one page on Letter and A4; after changing the sheet layout, check that again with `page.pdf()` for all lessons.

### Did they do the work?

`js/curriculum/effort.js` (no screen code, tested) reads one piece of handed-in work for signs it was clicked through: fewer than 60% of steps done, three or more questions with a third or fewer right on the first try, a reflection under four words, and, when the code is given, code unchanged from the lesson's starter. One sign is "worth a look", two or more "likely clicked through". The Grades tab lists them (`lookCard`), marks them in the gradebook grid, and the review page shows the same for one piece of work (`effortPanel`). It uses only what `classWork` and `getWorkFull` already return. These are reasons to look, never a verdict, and they are for the teacher only: never on the projected display, and never an input to points, ranks, or badges. There is no time-on-task, because a lesson's start is not recorded.

### Language and problem reports

Screens are written in English only. `js/translate.js` watches the page and swaps text for its translation, a sentence at a time, so don't add a second copy of any string. Mark anything that must stay as written with `translate: 'no'` (names, what a person typed, standards text); `pre`, `code`, and the editor are always skipped. A translation is only ever put on the page as text and copies of the page's own `strong`/`em`/`code` elements, never as HTML. `translate_` on the server translates each sentence once with `LanguageApp`, outside the lock, and keeps it in the cache and the `Translations` tab. To add a language, add it to `LANGS_` and to `languageChoice` in `settings.js`. Text that changes constantly (clocks, counts with names) costs a translation each time, so mark it `translate: 'no'`.

`js/views/bugs.js` has the report form and the teacher's list; `buildBugReport` in `report.js` makes the Markdown. `noteError` keeps the page's last five errors to send along. Reports are capped per person per day on the server.

### Student view

A teacher's **Student view** runs student routes as a pretend student (`previewStudent_`, `asStudent_` in `Code.gs`). That student's email and class id are `preview:<teacher email>`, which no Google account can be, and the class row's `teacher_email` is the same value rather than the teacher's, so every teacher page that lists classes by owner skips it. Keep it that way: don't list classes or students without filtering by owner. In the browser, `store.setPreview(true)` makes `appsscript.js` send every call through `asStudent`, and `app.session.preview` is set; the character page uses it to show every item unlocked.

### Trail Quest

`js/game/quest.js` holds the rules and the floor generator with no drawing, so `tests/quest.test.mjs` can check that every floor is fair at any depth (stairs and everything else reachable, only vault chests behind cracked rocks, nothing spawning on the player). A run is an endless race through rooms. A room is exactly one screen (`W` by `H` tiles equals the canvas), so nothing is ever off screen: the teacher found a scrolling map slow and confusing, so don't make rooms bigger. Each has a key, then a door (`world.door`), and a par time for a speed bonus. `generateFloor(seed, depth)` makes each room from the run's seed, and `difficulty(depth)` is the one place that says what gets harder. Arriving in a room is safe for a moment (`ARRIVE_SAFE`), nothing moves for a beat (`ARRIVE_HOLD`), and each door gives one heart back, after the teacher saw students knocked out the instant they entered a room. Everyone can dash; gear and relics (`RELICS`, `pickRelic`) make it stronger, `BOOSTS` are short pickups, and none of it is saved after the run. `tests/quest.html?depth=6&gear=1` (with `npm start`) opens any room to look at, and adding `&auto=1` plays a run by itself. `js/views/quest.js` draws and runs it on a plain canvas in the app's own page, not the sandbox, since it is our code. `powersFor` maps character slots to powers; a new slot power goes there and in `POWERS`.

The server (`world*_` in `Code.gs`) only keeps time and coins. Play time is counted from submitted `Works` rows, never stored, so it can't be granted from the browser. `worldEnter_` stamps a run and `worldRun_` holds the reported seconds and coins to what that run allowed. The server also keeps the deepest floor (`best_floor`, the last column, read by `worldMeta_`) and holds it to what the run's time allowed. A run records player 1's position every half second, with a marker each time they go down the stairs (`encodePath`); a best run is kept as that student's ghost with its world seed, and `worldGhosts_` returns classmates' ghosts for a seed so a race replays them in the same world. Paths are checked against `WORLD_PATH` on the way in and out, and `worldState_` reads only `WORLD_META` so the board never carries them. Two players on one keyboard is purely in the browser. A student who edits the browser code can still play for free, since the game is client-side; the limits protect the class board. Live multiplayer isn't possible on Apps Script, so don't add polling for other players' positions.

## Not yet verified

`js/game/pace.js` and `js/game/blame.js` run on both sides: the build strips `export` and appends them to `dist/Code.gs`, so they can't import anything and their names end in `_`. Every Google Classroom route must check `ownerOnly_`, because the app runs with the deploying teacher's access.

Group projects share one document. Each file has its own keyboard (the `Teams` row's `holders`, which lapse after `TEAM_HOLD_MS`), so members edit different files at the same time. `mergeTeamDoc_` keeps a saver's version only of files they hold or just created, and keeps the group's version of everything else, so a stale browser can't undo a teammate's work. `local.js` follows the same rules. `driver_id` and `driver_until` are unused leftovers kept so existing rows keep their columns. The server credits lines in `blame.js`, and the code is mirrored to each member's `Works` row so grading and later lessons don't need to know about groups.

`js/curriculum/classroom.js` (no screen code, tested) owns what each Classroom assignment covers (`lessonSlots`) and says (`assignmentDescription`): the stop on the trail, the lesson, how to hand it in, and its standards quoted exactly from `standards.js`, with each road named under whether it assesses or only practices a standard. The server takes the description as plain text (`description_`: line breaks kept, `<` and `>` removed, 8,000 characters), attaches a link ending `?stop=L7` (`stopUrl_`), and `main.js` turns that into the lesson on the student's own road at startup (`stopFromLink`, `lessonForStop`). `classroomTopic_` files assignments under a "Pixel Trail" topic only if the `classroom.topics` scope has been added to the manifest; it is deliberately left out, because adding a scope locks everyone out until the owner re-approves, and any failure there must fall back to no topic. `updateAssignments_` patches only the description of assignments the app already made.

Grades can only be written to Classroom assignments this app's Google Cloud project created, so `pushGrades_` makes its own and records them in `GradeSync`. Changing the script's Cloud project would make those assignments unwritable.

These need a real deployment: anything on real Apps Script, `LanguageApp` translation (quality, speed, daily quota, and whether it asks for a new permission), the Google Classroom API (including grade writes on students who haven't turned anything in, patching a description, topics, and whether a `?stop=` link reaches the page through `google.script.url`) and daily email, full-class quota limits, whether Apps Script's outer frame permits the camera, and loading an actual Teachable Machine model.
