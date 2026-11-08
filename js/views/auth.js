import { h, clear, toast, attempt } from '../ui.js';
import { app, render, refreshSession, go } from '../main.js';
import { avatarURL } from '../game/avatar.js';

function field(label, input) {
  return h('label.field', h('span', label), input);
}

function studentForm() {
  const code = h('input', { autocomplete: 'off', required: true, placeholder: 'ABC123', style: 'text-transform:uppercase' });
  const user = h('input', { autocomplete: 'username', required: true, autocapitalize: 'none', placeholder: 'yourname' });
  const pass = h('input', { type: 'password', autocomplete: 'current-password', required: true, placeholder: 'blue-fox-42' });
  return h('form.stack', {
    onsubmit: async (e) => {
      e.preventDefault();
      const s = await attempt(() => app.store.studentSignIn(code.value, user.value, pass.value));
      if (s) { app.session = s; go('/'); render(); }
    },
  }, field('Class code', code), field('Username', user), field('Passcode', pass), h('button.btn.primary.big', { type: 'submit' }, 'Start my journey'), h('p.muted.small', 'Your teacher gives you these. Lost your passcode? Your teacher can make a new one.'));
}

function teacherForm() {
  let mode = 'in';
  const box = h('div');
  const draw = () => {
    const name = h('input', { required: true, autocomplete: 'name' });
    const email = h('input', { type: 'email', required: true, autocomplete: 'email' });
    const pass = h('input', { type: 'password', required: true, minlength: 8, autocomplete: mode === 'in' ? 'current-password' : 'new-password' });
    clear(box).append(h('form.stack', {
      onsubmit: async (e) => {
        e.preventDefault();
        const s = await attempt(() => (mode === 'in' ? app.store.teacherSignIn(email.value, pass.value) : app.store.teacherSignUp(name.value, email.value, pass.value)));
        if (s) { app.session = s; go('/'); render(); }
      },
    },
    mode === 'up' && field('Your name, as students see it', name),
    field('Email', email),
    field('Password', pass),
    h('button.btn.primary.big', { type: 'submit' }, mode === 'in' ? 'Sign in' : 'Create teacher account'),
    h('button.btn.link', { type: 'button', onclick: () => { mode = mode === 'in' ? 'up' : 'in'; draw(); } }, mode === 'in' ? 'New here? Create a teacher account' : 'Already have an account? Sign in')));
  };
  draw();
  return box;
}

function demoPanel() {
  const panel = h('section.card.stack', h('h2', 'Look around'), h('p', 'No setup needed. Try it as a teacher, or jump in as a student at any point on the trail.'),
    h('button.btn.primary', { onclick: async () => { app.session = await app.store.demoLogin('teacher', 'demo-teacher'); go('/'); render(); } }, 'Explore as the teacher'));
  const grid = h('div.demo-students');
  panel.append(h('h3', 'Or be a student'), grid);
  app.store.classBoard('demo-class').then((board) => {
    for (const s of board) {
      grid.append(h('button.demo-student', { onclick: async () => { app.session = await app.store.demoLogin('student', s.id); go('/'); render(); } },
        h('img', { src: avatarURL(s.avatar, 3), alt: '' }), h('span', s.display_name)));
    }
  });
  panel.append(h('button.btn.link', {
    onclick: async () => { await app.store.resetDemo(); await refreshSession(); toast('Demo data reset.'); render(); },
  }, 'Reset demo data'));
  return panel;
}

/** Shown on Apps Script to anyone signed in to Google who isn't a teacher or on a roster. */
export function viewNoAccess() {
  const email = app.store.lastEmail;
  return h('div.login-single',
    h('section.card.stack',
      h('h1', 'Pixel Trail'),
      email
        ? [h('h2', "You're not on a class list yet"), h('p', 'You are signed in as ', h('strong', email), '. Ask your teacher to add this address to the class roster, then reload this page.')]
        : [h('h2', "We couldn't tell who you are"), h('p', 'Make sure you are signed in with your school Google account, then reload this page.')],
      h('p', trailArt()),
    ));
}

export function viewLogin() {
  const body = h('div');
  let tab = 'student';
  const tabs = h('div.tabs', { role: 'tablist' });
  const draw = () => {
    clear(tabs).append(
      h('button.tab', { role: 'tab', 'aria-selected': tab === 'student' ? 'true' : 'false', onclick: () => { tab = 'student'; draw(); } }, "I'm a student"),
      h('button.tab', { role: 'tab', 'aria-selected': tab === 'teacher' ? 'true' : 'false', onclick: () => { tab = 'teacher'; draw(); } }, "I'm a teacher"),
    );
    clear(body).append(tab === 'student' ? studentForm() : teacherForm());
  };
  draw();
  return h('main.login',
    h('section.login-hero',
      h('h1', 'Pixel Trail'),
      h('p.lede', 'Make your own video games with code. Start with a blank canvas, choose your road, and end up with a game that is all yours.'),
      trailArt(),
    ),
    h('div.login-side.stack',
      h('section.card', tabs, body),
      app.store.mode === 'local' && demoPanel(),
    ),
  );
}

function trailArt() {
  return h('div.trail-art', { 'aria-hidden': 'true' },
    ...[
      { skin: 0, hairColor: 1, hair: 'short', outfit: 1, hat: 'cap', pet: 'slime' },
      { skin: 3, hairColor: 0, hair: 'puffs', outfit: 0, hat: 'wizard', held: 'wand' },
      { skin: 1, hairColor: 3, hair: 'spiky', outfit: 2, hat: 'helmet', pet: 'cat' },
    ].map((a) => h('img', { src: avatarURL(a, 6), alt: '' })));
}
