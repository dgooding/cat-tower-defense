// @ts-check
// The Snack Symphony: an interactive musical journey. Boot, clock, input, travel map, HUD and credits.
// One clock rules everything: the audio clock. Visuals react to the notes the score plays (Engine.onNote),
// and the player's taps are snapped to the beat, so the whole journey stays in time.
import { Engine } from '../audio/music.js';
import { SONGS, parseChord } from '../audio/songs.js';
import { audioOut, unlockAudio, setVolume, setMuted, isMuted } from '../audio/sfx.js';
import { CHAPTERS, MAP_STOPS } from './chapters.js';
import { Fx, makeActor, drawActor, bakeRoom, bakeMap, fxText, glow, star, lerp, ease, clamp, STAGE_W, STAGE_H } from './kit.js';
import { registerOffline } from '../core/pwa.js';

/** @typedef {import('./chapters.js').J} J */
/** @typedef {import('./chapters.js').Chapter} Chapter */
/** @typedef {import('./kit.js').Actor} Actor */

registerOffline();

const SAVE_KEY = 'cata:journey:v1';
const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';

const $ = (/** @type {string} */ s) => /** @type {HTMLElement} */ (document.querySelector(s));
const canvas = /** @type {HTMLCanvasElement} */ ($('#j'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const ui = {
  start: $('#start'),
  begin: $('#begin'),
  chapters: $('#chapters'),
  hud: $('#hud'),
  title: $('#ch-title'),
  count: $('#count'),
  hint: $('#hint'),
  narr: $('#narr'),
  pause: $('#pause'),
  credits: $('#credits'),
  stats: $('#stats'),
  sound: $('#sound'),
  noaudio: $('#noaudio'),
};

// ---------------------------------------------------------------- settings & saves

/** @returns {{reached:number, finished:boolean}} */
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
    return { reached: Math.max(0, Math.min(CHAPTERS.length - 1, s.reached | 0)), finished: !!s.finished };
  } catch {
    return { reached: 0, finished: false };
  }
}
/** @param {Partial<{reached:number, finished:boolean}>} patch */
function save(patch) {
  const s = { ...loadSave(), ...patch };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}
function gameSettings() {
  try {
    return JSON.parse(localStorage.getItem('cata:save:v1') ?? '{}').settings ?? {};
  } catch {
    return {};
  }
}
const settings = gameSettings();
const REDUCED = !!settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- audio

/** @type {Engine|null} */
let engine = null;
/** @type {AudioContext|null} */
let ac = null;
/** @type {{m: import('../audio/music.js').NoteMeta, t: number, track: any}[]} */
const queue = [];
/** @type {{at:number, fn:() => void}[]} */
let laters = [];
/** @type {Record<string, {bass:number, notes:number[]}[]>} */
const chordCache = {};
const latency = () => clamp(/** @type {any} */ (ac)?.outputLatency || ac?.baseLatency || 0, 0, 0.25);

function startAudio() {
  unlockAudio();
  const out = audioOut();
  if (!out) return false;
  ac = /** @type {AudioContext} */ (out.ac);
  setVolume(typeof settings.volume === 'number' ? settings.volume : 0.4);
  engine = new Engine(ac, out.master);
  // The journey is about the music: keep it audible even if game music is turned way down.
  engine.setLevel(clamp((typeof settings.music === 'number' ? settings.music : 0.5) * 1.6, 0.45, 1));
  engine.onNote = (m, t, track) => queue.push({ m, t, track });
  setInterval(() => {
    if (engine && ac) engine.schedule(ac.currentTime + 0.3, false);
  }, 50);
  return true;
}

// ---------------------------------------------------------------- the J object chapters talk to

const fx = new Fx();
/** @type {Actor[]} */
let actors = [];
const pointer = { x: 960, y: 540, t: -99 };

/** @type {J} */
const J = {
  now: 0,
  dt: 0,
  time: 0,
  beat: 0,
  bar: 0,
  beatDur: 0.5,
  barDur: 2,
  e8: 0.25,
  bpb: 4,
  chord: { bass: 48, notes: [60, 64, 67] },
  fx,
  reduced: REDUCED,
  held: false,
  st: {},
  got: 0,
  goal: 1,
  stats: { purrfect: 0, snacks: 12, stars: 0 },
  shake: 0,
  actor(id, x, y, px, seed) {
    const a = makeActor(id, x, y, px, seed);
    actors.push(a);
    return a;
  },
  remove(a) {
    actors = actors.filter((b) => b !== a);
  },
  tone(i, shift = 12) {
    const notes = [...J.chord.notes].sort((a, b) => a - b);
    const n = notes.length;
    const k = ((i % n) + n) % n;
    return notes[k] + 12 * Math.floor(i / n) + shift;
  },
  toneY(y, shift = 12) {
    return J.tone(clamp(Math.floor(((STAGE_H - y) / STAGE_H) * 7), 0, 6), shift);
  },
  play(kind, midi, o = {}) {
    if (!engine || !ac) return 0;
    const tr = engine.track;
    let at = o.at ?? ac.currentTime + 0.005;
    if (o.quant && tr) {
      const step = o.quant === '8' ? tr.e8 : tr.e8 * 2;
      at = tr.start + Math.ceil((ac.currentTime + 0.02 - tr.start) / step) * step;
    }
    try {
      engine.syn.lead(kind, midi, Math.max(at, ac.currentTime), o.dur ?? J.e8 * 2, engine.player, o.vel ?? 0.9);
    } catch {
      /* a note must never break the journey */
    }
    return at;
  },
  later(at, fn) {
    laters.push({ at, fn });
  },
  judge(grid) {
    const b = J.beat;
    let best = Infinity;
    for (let k = Math.floor(b) - 1; k <= Math.floor(b) + 2; k++) {
      if (grid === 'back' && J.bpb === 4 && k % 2 !== 1) continue;
      const off = Math.abs(b - k) * J.beatDur;
      if (off < best) best = off;
    }
    if (best < 0.085) {
      J.stats.purrfect++;
      return { label: 'Purrfect!', score: 2 };
    }
    if (best < 0.17) return { label: 'Nice!', score: 1 };
    return { label: 'Ok', score: 0 };
  },
  say(text, x, y, color, size) {
    fx.text(x, y, text, color, size);
  },
  gain(n = 1) {
    if (completed) return;
    J.got = Math.min(J.goal, J.got + n);
    hud();
    if (J.got >= J.goal) {
      const more = chapter?.onGoal?.(J);
      if (more !== true) complete();
    }
  },
  setGoal(n, label) {
    J.got = 0;
    J.goal = n;
    goalLabel = label;
    hud();
  },
  drive(on) {
    engine?.track?.setDrive(on);
  },
  hint(text) {
    ui.hint.textContent = text;
  },
  narrate(text) {
    // A chapter speaking up for itself replaces whatever story lines were still queued.
    if (chapter) storyIdx = chapter.story.length;
    showNarration(text);
  },
  barTime(bar) {
    const tr = engine?.track;
    return tr ? tr.start + bar * J.barDur : 0;
  },
  chordAt(bar) {
    const tr = engine?.track;
    if (!tr) return J.chord;
    const list = (chordCache[tr.id] ??= SONGS[tr.id].chords.map(parseChord));
    return list[((bar % list.length) + list.length) % list.length];
  },
};

// ---------------------------------------------------------------- journey state

/** @type {'start'|'travel'|'play'|'outro'|'credits'} */
let mode = 'start';
let idx = 0;
/** @type {Chapter|null} */
let chapter = null;
let completed = false;
let goalLabel = '';
let chStartBar = 0;
let storyIdx = 0;
let narr = { text: '', until: 0 };
/** @type {HTMLCanvasElement|null} */
let backdrop = null;
/** @type {HTMLCanvasElement|null} */
let nextBackdrop = null;
let fadeIn = 0;
let outroEnd = 0;
let paused = false;
const travel = { t0: 0, t1: 1, from: MAP_STOPS[0], to: MAP_STOPS[0], lastBeat: -1, paws: /** @type {{x:number,y:number,a:number,s:number}[]} */ ([]) };
const mapImg = bakeMap(MAP_STOPS, CHAPTERS.map((c) => c.icon));
const traveller = makeActor('pudding', 0, 0, 120, 99);
const startScene = { img: /** @type {HTMLCanvasElement|null} */ (null), tw: /** @type {any[]} */ ([]), pud: makeActor('pudding', 520, 930, 190, 3) };
/** @type {any} */ (startScene.pud.rig).setExpression('sleepy');
startScene.pud.seat = '#B9A7E6';
setTimeout(() => (startScene.img = bakeRoom('countryside', 2, { light: 1, night: 1 })), 0);

/** @param {string} text */
function showNarration(text) {
  narr = { text, until: J.time + 7 };
  ui.narr.textContent = text;
  ui.narr.classList.remove('show');
  void ui.narr.offsetWidth;
  ui.narr.classList.add('show');
}

/** @param {Chapter} c */
const bakeFor = (c) => bakeRoom(c.scene.world, c.scene.layout, c.scene);

function hud() {
  if (!chapter) return;
  ui.title.textContent = `${chapter.num} \u00b7 ${chapter.title}`;
  ui.count.textContent = `${Math.min(J.got, J.goal)} / ${J.goal} ${goalLabel}`;
  ui.count.classList.toggle('done', completed);
}

/** @param {number} i */
function startTravel(i) {
  idx = i;
  chapter = CHAPTERS[i];
  mode = 'travel';
  completed = false;
  ui.hud.hidden = true;
  ui.narr.classList.remove('show');
  if (!engine || !ac) return;
  engine.play(chapter.song, false);
  const tr = /** @type {NonNullable<Engine['track']>} */ (engine.track);
  const barDur = tr.e8 * 2 * tr.song.beats;
  const bars = Math.max(2, Math.ceil(6 / barDur));
  travel.t0 = tr.start;
  travel.t1 = tr.start + bars * barDur;
  travel.from = MAP_STOPS[Math.max(0, i - 1)];
  travel.to = MAP_STOPS[i];
  travel.paws = [];
  travel.lastBeat = -1;
  nextBackdrop = null;
  const c = chapter;
  setTimeout(() => {
    if (chapter === c) nextBackdrop = bakeFor(c);
  }, 60);
  save({ reached: Math.max(loadSave().reached, i) });
}

function enterChapter() {
  const c = /** @type {Chapter} */ (chapter);
  backdrop = nextBackdrop ?? bakeFor(c);
  actors = [];
  fx.list = [];
  laters = [];
  J.st = {};
  J.time = 0;
  J.got = 0;
  J.goal = c.goal;
  J.held = false;
  goalLabel = c.label;
  completed = false;
  chStartBar = J.bar;
  storyIdx = 0;
  mode = 'play';
  fadeIn = 1;
  ui.narr.classList.toggle('at-top', c.narr === 'top');
  ui.narr.classList.toggle('at-mid', c.narr === 'mid');
  c.enter(J);
  ui.hud.hidden = false;
  J.hint(c.hint);
  hud();
}

function complete() {
  completed = true;
  mode = 'outro';
  hud();
  J.hint('');
  showNarration(/** @type {Chapter} */ (chapter).outro);
  const bars = Math.max(2, Math.ceil(5 / J.barDur));
  outroEnd = J.barTime(J.bar + bars);
  save({ reached: Math.min(CHAPTERS.length - 1, Math.max(loadSave().reached, idx + 1)) });
}

function showCredits() {
  mode = 'credits';
  save({ finished: true });
  ui.hud.hidden = true;
  ui.stats.textContent = `Purrfect moments: ${J.stats.purrfect} \u00b7 Melody stars caught: ${J.stats.stars} \u00b7 Snacks saved: ${J.stats.snacks} of 12`;
  ui.credits.hidden = false;
  /** @type {HTMLElement|null} */ (ui.credits.querySelector('button'))?.focus();
}

/** @param {number} i */
function begin(i) {
  if (!engine && !startAudio()) {
    ui.noaudio.hidden = false;
    return;
  }
  ui.start.hidden = true;
  ui.credits.hidden = true;
  J.stats = { purrfect: 0, snacks: 12, stars: 0 };
  startTravel(i);
}

// ---------------------------------------------------------------- frame

function stageRect() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const k = Math.min(w / STAGE_W, h / STAGE_H);
  return { k, x: (w - STAGE_W * k) / 2, y: (h - STAGE_H * k) / 2, w, h };
}
/** @param {number} cx @param {number} cy */
function toStage(cx, cy) {
  const r = stageRect();
  return { x: (cx - r.x) / r.k, y: (cy - r.y) / r.k };
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

let lastNow = 0;
let wallLast = performance.now();

function clock() {
  const tr = engine?.track;
  if (!ac || !tr) return;
  J.e8 = tr.e8;
  J.beatDur = tr.e8 * 2;
  J.bpb = tr.song.beats;
  J.barDur = J.beatDur * J.bpb;
  J.beat = (J.now - tr.start) / J.beatDur;
  J.bar = Math.floor(J.beat / J.bpb);
  J.chord = J.chordAt(J.bar);
}

/** @param {Actor} a @param {number} dt */
function updateActor(a, dt) {
  const fresh = performance.now() / 1000 - pointer.t < 4;
  const look = a.look && fresh ? { x: clamp((pointer.x - a.x) / 500, -1, 1), y: clamp((pointer.y - (a.y - 120)) / 500, -1, 1) } : null;
  try {
    /** @type {any} */ (a.rig).update(dt, look);
  } catch (err) {
    console.error('[journey] rig', a.id, err);
    a.hidden = true;
  }
}

function frame() {
  requestAnimationFrame(frame);
  const wallNow = performance.now();
  const wallDt = Math.min(0.1, (wallNow - wallLast) / 1000);
  wallLast = wallNow;
  let dt = wallDt;
  if (ac && engine) {
    J.now = ac.currentTime - latency();
    dt = clamp(J.now - lastNow, 0, 0.1);
    lastNow = J.now;
    clock();
  }
  J.dt = dt;
  if (mode === 'play' || mode === 'outro' || mode === 'credits') J.time += dt;

  // Deliver the score's notes and the chapter's timed callbacks as they are heard.
  if (engine) {
    for (let i = 0; i < queue.length; ) {
      const q = queue[i];
      if (q.track !== engine.track) queue.splice(i, 1);
      else if (q.t <= J.now) {
        queue.splice(i, 1);
        if (chapter && (mode === 'play' || mode === 'outro' || mode === 'credits')) {
          try {
            chapter.onNote?.(J, q.m);
          } catch (err) {
            console.error('[journey] onNote', err);
          }
        }
      } else i++;
    }
    const due = laters.filter((l) => l.at <= J.now);
    if (due.length) {
      laters = laters.filter((l) => l.at > J.now);
      for (const l of due) l.fn();
    }
  }

  if (mode === 'travel' && J.now >= travel.t1) enterChapter();
  if (mode === 'outro' && J.now >= outroEnd) {
    if (idx >= CHAPTERS.length - 1) showCredits();
    else startTravel(idx + 1);
  }
  if ((mode === 'play' || mode === 'outro') && chapter) {
    const rel = J.bar - chStartBar;
    if (mode === 'play' && storyIdx < chapter.story.length && rel >= storyIdx * 4) showNarration(chapter.story[storyIdx++]);
  }
  if (narr.text && J.time > narr.until) {
    narr.text = '';
    ui.narr.classList.remove('show');
  }

  if (chapter && mode !== 'travel' && mode !== 'start') {
    for (const a of actors) updateActor(a, dt);
    try {
      chapter.update?.(J);
    } catch (err) {
      console.error('[journey] update', err);
    }
  }
  fx.update(dt);
  J.shake = Math.max(0, J.shake - dt * 30);
  draw(wallDt);
}

/** @param {number} wallDt */
function draw(wallDt) {
  const r = stageRect();
  const dpr = canvas.width / Math.max(1, r.w);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#14152C';
  ctx.fillRect(0, 0, r.w, r.h);
  const sx = J.shake ? (Math.random() - 0.5) * J.shake : 0;
  const sy = J.shake ? (Math.random() - 0.5) * J.shake : 0;
  ctx.setTransform(dpr * r.k, 0, 0, dpr * r.k, dpr * (r.x + sx * r.k), dpr * (r.y + sy * r.k));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, STAGE_W, STAGE_H);
  ctx.clip();
  if (mode === 'start') drawStart(wallDt);
  else if (mode === 'travel') drawTravel();
  else drawScene();
  fx.draw(ctx);
  ctx.restore();
}

function drawScene() {
  const c = /** @type {Chapter} */ (chapter);
  if (backdrop) ctx.drawImage(backdrop, 0, 0, STAGE_W, STAGE_H);
  try {
    c.back?.(J, ctx);
    for (const a of [...actors].sort((p, q) => p.y - q.y)) drawActor(ctx, a, REDUCED);
    c.front?.(J, ctx);
  } catch (err) {
    console.error('[journey] draw', err);
  }
  if (fadeIn > 0) {
    ctx.globalAlpha = ease(fadeIn);
    ctx.drawImage(mapImg, 0, 0, STAGE_W, STAGE_H);
    ctx.globalAlpha = 1;
    fadeIn = Math.max(0, fadeIn - J.dt * 1.1);
  }
}

function drawTravel() {
  const c = /** @type {Chapter} */ (chapter);
  ctx.drawImage(mapImg, 0, 0, STAGE_W, STAGE_H);
  const span = Math.max(0.001, travel.t1 - travel.t0);
  const k = clamp((J.now - travel.t0) / span, 0, 1);
  const walk = ease(clamp((k - 0.12) / 0.7, 0, 1));
  const done = MAP_STOPS.slice(0, idx);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(232,170,60,0.85)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  done.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  const px = lerp(travel.from.x, travel.to.x, walk);
  const py = lerp(travel.from.y, travel.to.y, walk);
  if (done.length) ctx.lineTo(px, py);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i <= idx; i++) glow(ctx, MAP_STOPS[i].x, MAP_STOPS[i].y, 90, 'rgba(255,214,120,0.9)', i === idx ? 0.5 + 0.4 * walk : 0.35);
  // A paw print on every beat as Pudding walks.
  const beat = Math.floor(J.beat);
  if (beat !== travel.lastBeat && walk > 0 && walk < 1) {
    travel.lastBeat = beat;
    const ang = Math.atan2(travel.to.y - travel.from.y, travel.to.x - travel.from.x);
    const side = travel.paws.length % 2 ? 1 : -1;
    travel.paws.push({ x: px + Math.cos(ang + Math.PI / 2) * 14 * side, y: py + Math.sin(ang + Math.PI / 2) * 14 * side, a: ang, s: 1 });
  }
  for (const p of travel.paws) drawPaw(p.x, p.y, p.a);
  traveller.x = px;
  traveller.y = py + 10;
  traveller.lift = walk > 0 && walk < 1 ? Math.abs(Math.sin(J.beat * Math.PI)) * 18 : 0;
  updateActor(traveller, J.dt);
  /** @type {any} */ (traveller.rig).setExpression(walk >= 1 ? 'happy' : 'focused');
  drawActor(ctx, traveller, REDUCED);
  // Chapter card.
  const a = clamp(k * 3, 0, 1) * (1 - clamp((k - 0.9) / 0.1, 0, 1));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,250,236,0.82)';
  ctx.strokeStyle = 'rgba(59,58,74,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(510, 70, 900, 230, 30);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  fxText(ctx, c.num, 960, 120, 44, '#B0702A', a);
  fxText(ctx, c.title, 960, 196, 78, '#3B3A4A', a);
  fxText(ctx, c.place, 960, 264, 34, '#6B6A7C', a);
}

/** @param {number} x @param {number} y @param {number} ang */
function drawPaw(x, y, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = 'rgba(90,60,40,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-9, -7], [-3, -12], [3, -12], [9, -7]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** @param {number} dt */
function drawStart(dt) {
  if (startScene.img) ctx.drawImage(startScene.img, 0, 0, STAGE_W, STAGE_H);
  else {
    ctx.fillStyle = '#1E2150';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }
  if (Math.random() < dt * 3) startScene.tw.push({ x: Math.random() * 1920, y: Math.random() * 520, t: 0, c: `hsl(${Math.random() * 360} 80% 85%)` });
  for (const s of startScene.tw) s.t += dt;
  startScene.tw = startScene.tw.filter((s) => s.t < 2);
  for (const s of startScene.tw) {
    const a = Math.sin((s.t / 2) * Math.PI);
    glow(ctx, s.x, s.y, 40, s.c, a * 0.7);
    star(ctx, s.x, s.y, 8, s.t, '#FFFDF6', a);
  }
  updateActor(startScene.pud, dt);
  drawActor(ctx, startScene.pud, REDUCED);
}

requestAnimationFrame(frame);

// ---------------------------------------------------------------- input

canvas.addEventListener('pointerdown', (e) => {
  pointer.t = performance.now() / 1000;
  const p = toStage(e.clientX, e.clientY);
  Object.assign(pointer, p);
  if (paused || !chapter || (mode !== 'play' && mode !== 'outro')) return;
  canvas.setPointerCapture?.(e.pointerId);
  J.held = true;
  chapter.tap?.(J, p.x, p.y);
});
canvas.addEventListener('pointermove', (e) => {
  Object.assign(pointer, toStage(e.clientX, e.clientY), { t: performance.now() / 1000 });
});
const release = () => {
  if (!J.held) return;
  J.held = false;
  if (chapter) chapter.release?.(J);
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (mode === 'start' || mode === 'credits') return;
  if (k === 'Escape' || k.toLowerCase() === 'p') {
    e.preventDefault();
    setPaused(!paused);
    return;
  }
  if (paused || !chapter || (mode !== 'play' && mode !== 'outro')) return;
  if (k === ' ' || k === 'Enter') {
    if (e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (e.repeat) return;
    J.held = true;
    chapter.tap?.(J, null, null);
  } else chapter.key?.(J, k);
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.key === 'Enter') release();
});

/** @param {boolean} p */
function setPaused(p) {
  if (!ac || mode === 'start' || mode === 'credits') return;
  paused = p;
  ui.pause.hidden = !p;
  if (p) {
    J.held = false;
    ac.suspend().catch(() => {});
    /** @type {HTMLElement|null} */ (ui.pause.querySelector('button'))?.focus();
  } else ac.resume().catch(() => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode !== 'start') setPaused(true);
});

document.body.addEventListener('click', (e) => {
  const b = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-a]'));
  if (!b) return;
  const a = b.dataset.a;
  if (a === 'begin') begin(0);
  if (a === 'chapter') begin(Number(b.dataset.i));
  if (a === 'resume') setPaused(false);
  if (a === 'pause') setPaused(true);
  if (a === 'restart') {
    setPaused(false);
    startTravel(idx);
  }
  if (a === 'skip' && chapter) {
    setPaused(false);
    if (idx >= CHAPTERS.length - 1) showCredits();
    else startTravel(idx + 1);
  }
  if (a === 'again') {
    ui.credits.hidden = true;
    J.stats = { purrfect: 0, snacks: 12, stars: 0 };
    startTravel(0);
  }
  if (a === 'sound') {
    setMuted(!isMuted());
    b.textContent = isMuted() ? 'Sound off' : 'Sound on';
    b.setAttribute('aria-pressed', String(!isMuted()));
  }
});

// Chapter select for returning travellers.
{
  const s = loadSave();
  if (s.reached > 0 || s.finished) {
    ui.chapters.hidden = false;
    const list = /** @type {HTMLElement} */ (ui.chapters.querySelector('ol'));
    CHAPTERS.forEach((c, i) => {
      if (i > s.reached) return;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.a = 'chapter';
      btn.dataset.i = String(i);
      btn.textContent = `${c.icon} ${c.num}: ${c.title}`;
      li.append(btn);
      list.append(li);
    });
  }
}
ui.begin.focus();

if (DEBUG) /** @type {any} */ (window).__journey = { J, CHAPTERS, get mode() { return mode; }, get engine() { return engine; }, get idx() { return idx; }, begin, startTravel, enterChapter, complete: () => complete(), actors: () => actors };
