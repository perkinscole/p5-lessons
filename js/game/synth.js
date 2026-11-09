// The 8-bit synth. Every sound is generated, so there are no audio files to host or license.
// installSynth is written into each game's sandbox as text, as well as used by the Sound Studio,
// so it must stay self-contained: nothing from outside the function, no imports.

/**
 * Adds playSound, playNote, playMusic, stopMusic, and setVolume to `target`.
 * opts: { muted, warn(message) }.
 */
export function installSynth(target, opts) {
  opts = opts || {};
  var muted = !!opts.muted;
  var volume = 0.7;
  var warned = {};
  var warn = function (message) {
    if (warned[message]) return;
    warned[message] = 1;
    if (opts.warn) opts.warn(message);
  };

  // Each sound is a list of segments played in order: [wave, start pitch, end pitch, seconds, loudness].
  // For 'noise', the pitches set a filter, which is what makes noise sound high or low.
  var SOUNDS = {
    coin: [['square', 988, 988, 0.06, 0.5], ['square', 1319, 1319, 0.16, 0.5]],
    gem: [['square', 1568, 1568, 0.05, 0.4], ['square', 2093, 2093, 0.05, 0.4], ['square', 2637, 2637, 0.12, 0.4]],
    jump: [['square', 220, 660, 0.16, 0.45]],
    land: [['triangle', 180, 70, 0.08, 0.7]],
    step: [['noise', 900, 500, 0.04, 0.3]],
    dash: [['noise', 600, 4000, 0.18, 0.4]],
    laser: [['square', 1400, 220, 0.14, 0.4]],
    shoot: [['sawtooth', 700, 150, 0.1, 0.4], ['noise', 3000, 800, 0.05, 0.2]],
    hit: [['noise', 2400, 600, 0.09, 0.6], ['square', 180, 90, 0.07, 0.3]],
    hurt: [['sawtooth', 420, 90, 0.26, 0.5]],
    explode: [['noise', 1800, 90, 0.6, 0.9]],
    bounce: [['triangle', 300, 760, 0.1, 0.6]],
    powerup: [['square', 523, 523, 0.07, 0.4], ['square', 659, 659, 0.07, 0.4], ['square', 784, 784, 0.07, 0.4], ['square', 1047, 1047, 0.18, 0.4]],
    magic: [['triangle', 1200, 2400, 0.1, 0.5], ['triangle', 900, 1800, 0.1, 0.5], ['triangle', 1400, 2800, 0.16, 0.5]],
    key: [['square', 1760, 1760, 0.04, 0.35], ['square', 1319, 1319, 0.04, 0.35], ['square', 1760, 1760, 0.1, 0.35]],
    door: [['sawtooth', 110, 165, 0.3, 0.3], ['noise', 500, 300, 0.08, 0.5]],
    select: [['square', 660, 660, 0.05, 0.35]],
    click: [['square', 1200, 1200, 0.02, 0.3]],
    alarm: [['square', 880, 880, 0.12, 0.35], ['square', 660, 660, 0.12, 0.35], ['square', 880, 880, 0.12, 0.35], ['square', 660, 660, 0.12, 0.35]],
    win: [['square', 523, 523, 0.1, 0.45], ['square', 659, 659, 0.1, 0.45], ['square', 784, 784, 0.1, 0.45], ['square', 1047, 1047, 0.12, 0.45], ['square', 784, 784, 0.08, 0.45], ['square', 1047, 1047, 0.3, 0.45]],
    lose: [['square', 392, 392, 0.14, 0.4], ['square', 349, 349, 0.14, 0.4], ['square', 311, 311, 0.14, 0.4], ['sawtooth', 262, 196, 0.42, 0.4]],
  };

  var W = typeof window !== 'undefined' ? window : null;
  var AC = W && (W.AudioContext || W.webkitAudioContext);
  var ctx = null;
  var master = null;
  var musicBus = null;
  var noiseBuffer = null;

  function audio() {
    if (!ctx && AC) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      var limit = ctx.createDynamicsCompressor();
      master.connect(limit);
      limit.connect(ctx.destination);
      // Chunky noise, held for several samples at a time, which is how old game chips sounded.
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      var held = 0;
      for (var i = 0; i < data.length; i++) {
        if (i % 4 === 0) held = Math.random() * 2 - 1;
        data[i] = held;
      }
    }
    return ctx;
  }

  /** Browsers keep audio asleep until the player clicks or presses a key. */
  function awake() {
    var c = audio();
    if (!c) return false;
    if (c.state === 'suspended') c.resume();
    return c.state === 'running';
  }
  if (W) {
    W.addEventListener('pointerdown', awake, true);
    W.addEventListener('keydown', awake, true);
    W.addEventListener('message', function (e) {
      if (e.data && typeof e.data.ptMute === 'boolean') {
        muted = e.data.ptMute;
        if (master) master.gain.value = muted ? 0 : volume;
      }
    });
  }

  function segment(seg, start, out) {
    var wave = seg[0];
    var end = start + seg[3];
    var amp = ctx.createGain();
    amp.gain.setValueAtTime(seg[4], start);
    amp.gain.setValueAtTime(seg[4], Math.max(start, end - 0.02));
    amp.gain.linearRampToValueAtTime(0.0001, end);
    amp.connect(out);
    if (wave === 'noise') {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(seg[1], start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, seg[2]), end);
      src.connect(filter);
      filter.connect(amp);
      src.start(start, Math.random() * 0.8);
      src.stop(end + 0.01);
    } else {
      var osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(seg[1], start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, seg[2]), end);
      osc.connect(amp);
      osc.start(start);
      osc.stop(end + 0.01);
    }
    return end;
  }

  function noteFreq(note) {
    if (typeof note === 'number') return note > 0 ? note : null;
    var m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(note));
    if (!m) return null;
    var base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[m[1].toLowerCase()];
    var midi = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var DRUMS = {
    k: [['triangle', 160, 45, 0.13, 1]],
    s: [['noise', 4200, 1500, 0.11, 0.55]],
    h: [['noise', 9000, 7000, 0.03, 0.28]],
  };

  /** Split a song's text into steps. A rest is null, and anything unreadable counts as a rest. */
  function parseTrack(text, isDrums) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).map(function (token) {
      if (token === '.') return null;
      if (isDrums ? DRUMS[token] : noteFreq(token) !== null) return isDrums ? token : noteFreq(token);
      warn('I could not read "' + token + '" in your song, so that step is silent.');
      return null;
    });
  }

  function parseSong(song) {
    if (!song || typeof song !== 'object') return null;
    var lead = parseTrack(song.lead, false);
    var bass = parseTrack(song.bass, false);
    var drums = parseTrack(song.drums, true);
    var steps = Math.max(lead.length, bass.length, drums.length);
    if (!steps) return null;
    return { lead: lead, bass: bass, drums: drums, steps: steps, tempo: Math.min(240, Math.max(40, Number(song.tempo) || 120)) };
  }

  var song = null;
  var place = 0;
  var nextTime = 0;
  var timer = null;

  function freshBus() {
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.75;
    musicBus.connect(master);
  }

  function tick() {
    if (!song || !awake()) return;
    if (!musicBus) freshBus();
    var now = ctx.currentTime;
    if (nextTime < now) nextTime = now + 0.05;
    var length = 30 / song.tempo; // Each step is an eighth note.
    while (nextTime < now + 0.14) {
      var at = place % song.steps;
      var lead = song.lead[at % (song.lead.length || 1)];
      var bass = song.bass[at % (song.bass.length || 1)];
      var drum = song.drums[at % (song.drums.length || 1)];
      if (lead) segment(['square', lead, lead, length * 0.85, 0.3], nextTime, musicBus);
      if (bass) segment(['triangle', bass, bass, length * 0.9, 0.55], nextTime, musicBus);
      if (drum) segment(DRUMS[drum][0], nextTime, musicBus);
      if (target.onMusicStep) setTimeout(target.onMusicStep.bind(null, at), Math.max(0, (nextTime - now) * 1000));
      place++;
      nextTime += length;
    }
  }

  target.playSound = function (name) {
    var parts = SOUNDS[name];
    if (!parts) { warn('There is no sound named "' + name + '". Open Sounds to see the list.'); return; }
    if (!awake()) return;
    var t = ctx.currentTime + 0.005;
    parts.forEach(function (part) { t = segment(part, t, master); });
  };

  target.playNote = function (note, seconds, wave) {
    var f = noteFreq(note);
    if (f === null) { warn('"' + note + '" is not a note. Try "C4" or a number like 440.'); return; }
    if (!awake()) return;
    segment([wave || 'square', f, f, seconds || 0.25, 0.4], ctx.currentTime + 0.005, master);
  };

  /** Loops a song. Calling it with the song already playing starts over, unless keepPlace is true. */
  target.playMusic = function (next, keepPlace) {
    var parsed = parseSong(next);
    if (!parsed) { warn('playMusic needs a song with notes in it.'); return; }
    audio();
    song = parsed;
    if (!keepPlace) { place = 0; nextTime = 0; }
    if (!timer) timer = setInterval(tick, 25);
  };

  target.stopMusic = function () {
    song = null;
    place = 0;
    if (timer) clearInterval(timer);
    timer = null;
    // Notes already scheduled go silent along with the bus they were sent to.
    if (musicBus) { musicBus.disconnect(); musicBus = null; }
  };

  target.setVolume = function (level) {
    volume = Math.min(1, Math.max(0, Number(level) || 0));
    if (master) master.gain.value = muted ? 0 : volume;
  };

  target.synthInfo = { sounds: Object.keys(SOUNDS), noteFreq: noteFreq, parseSong: parseSong };
  return target;
}

const TOKEN = /^(\.|[A-Ga-g][#b]?-?\d|[ksh])$/;

/** Songs can come from classmates and become code, so only known note names get through. */
export function cleanSong(song) {
  const track = (text) => String(text || '').trim().split(/\s+/).filter((t) => TOKEN.test(t)).slice(0, 64).join(' ');
  return {
    tempo: Math.min(240, Math.max(40, Math.round(Number(song && song.tempo)) || 120)),
    scale: /^\w{1,12}$/.test(song && song.scale) ? song.scale : 'bright',
    lead: track(song && song.lead),
    bass: track(song && song.bass),
    drums: track(song && song.drums),
  };
}

/** A song as the code students see and can edit in their project. */
export function songCode(song, variable) {
  const s = cleanSong(song);
  return `let ${variable} = {
  tempo: ${s.tempo},
  lead: ${JSON.stringify(s.lead)},
  bass: ${JSON.stringify(s.bass)},
  drums: ${JSON.stringify(s.drums)},
};
`;
}
