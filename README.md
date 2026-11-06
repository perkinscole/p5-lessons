# Pixel Trail

A web app that teaches students to make games in p5.js from a blank canvas. Each student builds one game of their own over a whole trail of 30 to 40 minute lessons.

## The trail

Everyone starts together, then chooses a road. The roads teach the same concepts through different games and meet again at each Crossing.

| Stage | Lessons | What students learn |
| --- | --- | --- |
| Base Camp (shared) | 6 | Coordinates, color, variables, input, conditionals, a first game |
| First Fork (by road) | 3 | Movement, collision, win and lose |
| First Crossing (shared) | 2 | Functions, sprites |
| Second Fork (by road) | 3 | For loops, arrays, objects |
| Second Crossing (shared) | 2 | Classes, game states |
| Third Fork (by road) | 2 | 2D data and a first real algorithm |
| Last Crossing (shared) | 1 | Searching and selection sort |
| The Summit (shared) | 1 | Polish, playtest, publish |

The roads are **The High Road** (platformer, ending in procedural generation), **The Wild Road** (top-down adventure, ending in breadth-first search), and **The Star Road** (arcade shooter, ending in a state machine with aiming). That is 36 lessons in all, and 20 for each student, or about 12 hours of class time.

## Try it now

```bash
npm start
```

Then open http://localhost:8080 and choose **Explore as the teacher**, or pick a demo student. Demo mode needs no setup, and its data stays in that browser.

## Going live with real classes

Demo mode can't be shared between computers. Real classes need a free Supabase project for accounts and data, and a host such as GitHub Pages for the site.

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. In **Authentication → Sign In / Providers**, turn on **Allow anonymous sign-ins**. Student logins depend on it.
4. In the same area, decide on **Confirm email**. If it stays on, teachers confirm by email before their first sign-in.
5. In **Project Settings → API**, copy the project URL and the `anon` public key into [`config.js`](config.js). The anon key is designed to be public. Never put the `service_role` key in this project.
6. In the GitHub repo, go to **Settings → Pages**, and deploy from the `main` branch's root folder.

Anyone who finds the site can create a teacher account. They can only see their own classes, but you may want to turn off new signups in Supabase once your teachers have accounts.

### Before using this with students

- **Check your school's rules.** This stores student names, code, and grades with a third party (Supabase). Ask whether your district needs a data privacy agreement, especially for students under 13.
- **Use first name and last initial.** Classmates can see these names on the journey map.

## How it protects students

- Students have no email. Teachers create them, and they log in with a class code, username, and passcode. Passcodes are stored hashed, and five wrong tries locks that login for five minutes.
- Grades and feedback are visible only to that student and their teacher. Points, ranks, and badges are public to the class, so they are never calculated from grades.
- Student code runs in a locked-down iframe that can't reach this site, login sessions, the database, or the network. Loops that never end get stopped.
- Teachers can remove any shared game or sprite in their class. Sharing is always the student's choice.

## Grading and points

Students keep moving after submitting: they don't wait for approval to unlock the next lesson. Teachers score a rubric of 1 to 4 on three rows, write feedback, then approve the work or send it back. Approved work is locked.

| Earned for | XP |
| --- | --- |
| Submitting with all checks passing | 50 (25 if not) |
| Teacher approves | 50 more |
| Each stretch goal (self-reported, up to 3) | 10 |
| Each badge a teacher gives | 25 |

Automatic checks look for code patterns. They guide students, and they can't tell if a game is good, or spot every valid approach. A student can always submit anyway, and you'll see how many checks passed. Rules live in [`js/game/rules.js`](js/game/rules.js).

## Changing lessons

Lessons are plain data in [`js/curriculum/`](js/curriculum/). Each step's `code` and `at` say what to show and where it goes, and the app applies those same edits to build the answer key, so instructions and answers can't drift apart.

```js
{
  title: 'Add a sun', mins: 5,
  say: 'Add this inside `draw()`, below `background`:',
  code: '  ellipse(340, 60, 70, 70);',
  at: { after: 'background(135, 206, 235);' },  // or before, replace, endOf, top, end
  check: /ellipse\s*\(/,                          // what counts as done
  hint: 'It goes between the { and } of draw().', // optional
  // reveal: true hides the code behind a "Show me an example" button
}
```

Lessons with no `starter` continue the student's own game. If you edit one, keep the names that later lessons rely on: `playerX`, `playerY`, `playerSize`, `score`, `won`, `lost`, and `resetGame()`.

## Testing

```bash
npm install
```

```bash
npm test
```

This checks that all lessons fit 30 to 40 minutes and build on every road, and attacks the database's privacy rules on a real Postgres engine. To run every answer key in the real sandbox, start the app and open http://localhost:8080/tests/lessons.html with the tab visible.

## Credits

Built on [p5.js](https://p5js.org) (LGPL), [CodeMirror 5](https://codemirror.net/5/) (MIT), and [supabase-js](https://github.com/supabase/supabase-js) (MIT), all in [`vendor/`](vendor/). [Piskel](https://www.piskelapp.com) is linked as an outside tool. All lessons, characters, and starter sprites are original to this project.
