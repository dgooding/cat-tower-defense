// @ts-check
// Hub page: a living scene. Cats nap on cushions, a cucumber patrols the path, signposts lead to every mode.
// In October the meadow turns into a Halloween night: jack-o'-lanterns, paper bats, costumes and a ghost.
import { CatRig } from './art/cats/catrig.js';
import { EnemyRig } from './art/enemies/enemyrig.js';
import { spec as puddingSpec } from './art/cats/pudding.js';
import { spec as grannySpec } from './art/cats/granny-purl.js';
import { spec as chonkSpec } from './art/cats/chonkington.js';
import { spec as mochiSpec } from './art/cats/maneki-mochi.js';
import { spec as cadetSpec } from './art/enemies/cucumber-cadet.js';
import { room as countryside } from './art/rooms/countryside.js';
import { drawRoom, STAGE_W, STAGE_H } from './art/rooms/common.js';
import { Pen, fxText } from './art/brush.js';
import { INK } from './art/palette.js';
import { Track } from './core/spline.js';
import { costumeFor } from './art/costumes.js';
import { isHalloween } from './core/season.js';
import { unlockAudio, sfx, setVolume, setMuted, isMuted } from './audio/sfx.js';
import { music, setMusicVolume } from './audio/music.js';
import { loadProgress, saveProgress } from './ui/save.js';
import { registerOffline } from './core/pwa.js';

registerOffline();

const SPOOKY = isHalloween();
const TAU = Math.PI * 2;
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('hub-scene'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.body.classList.toggle('spooky', SPOOKY);
for (const el of document.querySelectorAll('[data-season="halloween"]')) /** @type {HTMLElement} */ (el).hidden = !SPOOKY;

// ---------------------------------------------------------------- scene setup

const LAYOUT = countryside.layouts[SPOOKY ? 2 : 0];
const track = new Track(LAYOUT.paths[0], 16);

/**
 * @typedef {{rig: CatRig, x:number, y:number, px:number, seat:string, pitch:number, wakeT:number}} Napper
 */
/** @param {any} spec @param {number} x @param {number} y @param {string} seat @param {number} pitch @param {string} id @param {number} seed @returns {Napper} */
function napper(spec, x, y, seat, pitch, id, seed) {
  const rig = new CatRig(spec, seed);
  if (SPOOKY) rig.extra = costumeFor(id);
  rig.setExpression('sleepy');
  return { rig, x, y, px: 190 * (spec.scale ?? 1), seat, pitch, wakeT: -1 };
}
const cats = SPOOKY
  ? [
      napper(mochiSpec, 200, 470, '#D9B98C', 1.2, 'maneki-mochi', 4),
      napper(puddingSpec, 150, 880, '#F4B7C2', 1, 'pudding', 1),
      napper(grannySpec, 1450, 450, '#BFE0F2', 0.85, 'granny-purl', 2),
      napper(chonkSpec, 1690, 950, '#B9E2C8', 0.65, 'chonkington', 3),
    ]
  : [
      napper(mochiSpec, 210, 360, '#D9B98C', 1.2, 'maneki-mochi', 4),
      napper(puddingSpec, 330, 830, '#F4B7C2', 1, 'pudding', 1),
      napper(grannySpec, 1450, 470, '#BFE0F2', 0.85, 'granny-purl', 2),
      napper(chonkSpec, 1660, 920, '#B9E2C8', 0.65, 'chonkington', 3),
    ];

// The patrolling visitor: a cucumber cadet by day, a cucumber in a sheet in October.
let visitorSpec = cadetSpec;
if (SPOOKY) {
  try {
    const m = await import('./art/enemies/cucumber-ghost.js');
    if (m?.spec) visitorSpec = m.spec;
  } catch {
    /* the ghost isn't drawn yet: a cadet in the dark is spooky enough */
  }
}
const visitor = { rig: new EnemyRig(visitorSpec, 9), d: -120, dir: 1, wait: 2.5, scale: 130 / (visitorSpec.height ?? 150), x: 0, y: 0, alpha: 1, said: false };

const PUMPKINS = [
  { x: 250, y: 630, s: 1 },
  { x: 560, y: 860, s: 1.25 },
  { x: 800, y: 680, s: 0.9 },
  { x: 1250, y: 780, s: 1.1 },
  { x: 1430, y: 560, s: 0.85 },
  { x: 1830, y: 820, s: 1 },
];
const bats = Array.from({ length: SPOOKY ? 6 : 0 }, (_, i) => ({ x: (i * 380) % 1920, y: 90 + (i % 3) * 70, v: 50 + i * 9, ph: i * 1.7 }));
const stars = Array.from({ length: SPOOKY ? 60 : 0 }, (_, i) => ({ x: (i * 97.3) % 1920, y: (i * 53.7) % 360, ph: i }));
const flutters = Array.from({ length: SPOOKY ? 0 : 4 }, (_, i) => ({ x: 300 + i * 420, y: 600 + (i % 2) * 120, ph: i * 2.1, c: ['#F6B3C2', '#FFE27A', '#BFD7F5', '#FFFDF6'][i] }));
/** @type {{x:number, y:number, text:string, t:number, color:string}[]} */
const pops = [];

/** @type {HTMLCanvasElement|null} */
let backdrop = null;
function bake() {
  const c = document.createElement('canvas');
  c.width = STAGE_W;
  c.height = STAGE_H;
  const b = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const pen = new Pen(b);
  try {
    drawRoom(b, pen, countryside, LAYOUT, 0, { light: SPOOKY ? 1 : 0.08, showStash: true, showSpots: false, reducedMotion: true, lw: 3 });
    if (countryside.drawFront) {
      pen.begin(0, { boil: false, width: 3, amp: 1 });
      countryside.drawFront(b, pen, 0, { light: SPOOKY ? 1 : 0.08, layout: LAYOUT, reducedMotion: true });
    }
  } catch (err) {
    console.error('[hub] room failed', err);
  }
  if (SPOOKY) {
    const g = b.createLinearGradient(0, 0, 0, STAGE_H);
    g.addColorStop(0, 'rgba(24,16,58,0.82)');
    g.addColorStop(0.6, 'rgba(46,28,84,0.55)');
    g.addColorStop(1, 'rgba(30,20,60,0.5)');
    b.fillStyle = g;
    b.fillRect(0, 0, STAGE_W, STAGE_H);
  }
  backdrop = c;
}
setTimeout(bake, 0);

// ---------------------------------------------------------------- drawing helpers

/** @param {number} x @param {number} y @param {number} r @param {string} color @param {number} a */
function glow(x, y, r, color, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** @param {{x:number, y:number, s:number}} p @param {number} t @param {number} i */
function jackOLantern(p, t, i) {
  const flick = reduced.matches ? 0.85 : 0.75 + 0.25 * Math.sin(t * 9 + i * 2) * Math.sin(t * 3.7 + i);
  const s = p.s * 44;
  glow(p.x, p.y - s * 0.5, s * 3.2, 'rgba(255,170,60,0.9)', 0.45 * flick);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(20,10,30,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 2, s * 1.1, s * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const [dx, rx] of [[-0.55, 0.55], [0.55, 0.55], [0, 0.6]]) {
    ctx.fillStyle = '#F08A2C';
    ctx.beginPath();
    ctx.ellipse(dx * s, -s * 0.62, rx * s, s * 0.66, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#5E8A3A';
  ctx.beginPath();
  ctx.roundRect(-s * 0.1, -s * 1.5, s * 0.2, s * 0.32, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255,${200 + 40 * flick},90,1)`;
  const face = [
    [-0.42, -0.78, -0.18, -0.78, -0.3, -0.98],
    [0.18, -0.78, 0.42, -0.78, 0.3, -0.98],
  ];
  for (const f of face) {
    ctx.beginPath();
    ctx.moveTo(f[0] * s, f[1] * s);
    ctx.lineTo(f[2] * s, f[3] * s);
    ctx.lineTo(f[4] * s, f[5] * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.5 * s, -0.48 * s);
  ctx.quadraticCurveTo(0, -0.12 * s, 0.5 * s, -0.48 * s);
  ctx.quadraticCurveTo(0, -0.3 * s, -0.5 * s, -0.48 * s);
  ctx.fill();
  ctx.restore();
}

/** @param {number} x @param {number} y @param {number} t */
function bat(x, y, t) {
  const f = reduced.matches ? 0.3 : Math.sin(t * 14);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2A2340';
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * 22, -18 * f - 6, side * 46, -10 * f);
    ctx.quadraticCurveTo(side * 36, 2, side * 30, 8 - 6 * f);
    ctx.quadraticCurveTo(side * 20, 2, 0, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 2, 9, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#FFE27A';
  ctx.fillRect(-5, -2, 3, 3);
  ctx.fillRect(2, -2, 3, 3);
  ctx.restore();
}

/** @param {number} x @param {number} y @param {number} w @param {string} base */
function cushion(x, y, w, base) {
  ctx.fillStyle = 'rgba(59,58,74,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + w * 0.1, w * 0.55, w * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = base;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------- loop

/** Cover the window, but on tall screens keep a wide-enough band of the scene. */
function view() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const k = Math.max(w / STAGE_W, Math.min(h / STAGE_H, w / 1100));
  return { w, h, k, ox: (w - STAGE_W * k) / 2, oy: (h - STAGE_H * k) / 2 };
}
/** @param {number} cx @param {number} cy */
function toStage(cx, cy) {
  const v = view();
  return { x: (cx - v.ox) / v.k, y: (cy - v.oy) / v.k };
}

const ptr = { x: 960, y: 540, t: -99 };
let last = performance.now() / 1000;
let time = 0;

function updateVisitor(dt) {
  const v = visitor;
  if (v.wait > 0) {
    v.wait -= dt;
    v.alpha = 0;
    return;
  }
  const speed = v.dir > 0 ? 70 : 170;
  v.d += v.dir * speed * dt;
  const p = track.at(Math.max(0, v.d));
  v.x = v.d < 0 ? -60 + v.d * 0.3 : p.x;
  v.y = (v.d < 0 ? LAYOUT.paths[0][0].y : p.y) + 18;
  v.alpha = Math.min(1, v.alpha + dt * 2);
  if (v.dir > 0 && v.d > track.length - 260) {
    // Too close to the snacks: the nearest cat wakes up, and the visitor thinks better of it.
    v.dir = -1;
    let near = cats[0];
    for (const c of cats) if (Math.hypot(c.x - v.x, c.y - v.y) < Math.hypot(near.x - v.x, near.y - v.y)) near = c;
    near.rig.setExpression('startled');
    near.wakeT = 2.4;
    pops.push({ x: v.x, y: v.y - 170, text: SPOOKY ? 'boo?' : '!', t: 0, color: SPOOKY ? '#B9A7E6' : '#5E9A4E' });
    v.rig.hit();
  }
  if (v.dir < 0 && v.d < -160) {
    v.dir = 1;
    v.d = -120;
    v.wait = 6 + Math.random() * 6;
  }
  v.rig.setMode('walk');
  v.rig.update(dt, null);
}

function frame() {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;
  time += dt;
  const v = view();
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(v.w * dpr) || canvas.height !== Math.round(v.h * dpr)) {
    canvas.width = Math.round(v.w * dpr);
    canvas.height = Math.round(v.h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, v.h);
  sky.addColorStop(0, SPOOKY ? '#1A1440' : '#BFE3F2');
  sky.addColorStop(0.5, SPOOKY ? '#2E2058' : '#EAF6F0');
  sky.addColorStop(0.51, SPOOKY ? '#2B3326' : '#9CCB73');
  sky.addColorStop(1, SPOOKY ? '#1E2419' : '#6FAA55');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, v.w, v.h);
  ctx.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.ox, dpr * v.oy);
  if (backdrop) ctx.drawImage(backdrop, 0, 0);

  // Sky life.
  for (const s of stars) {
    const a = 0.4 + 0.5 * Math.abs(Math.sin(time * 1.2 + s.ph));
    ctx.fillStyle = `rgba(255,240,200,${a})`;
    ctx.fillRect(s.x, s.y, 3, 3);
  }
  if (SPOOKY) {
    glow(1580, 150, 240, 'rgba(255,236,190,0.6)', 0.7);
    ctx.fillStyle = '#FFF3D0';
    ctx.beginPath();
    ctx.arc(1580, 150, 66, 0, TAU);
    ctx.fill();
  }
  if (SPOOKY) PUMPKINS.forEach((p, i) => jackOLantern(p, time, i));

  // Cats and the visitor, back to front.
  updateVisitor(dt);
  const look = time - ptr.t < 4 ? ptr : null;
  for (const c of cats) {
    if (c.wakeT > 0) {
      c.wakeT -= dt;
      if (c.wakeT <= 0) c.rig.setExpression('sleepy');
      else if (c.wakeT < 1.6 && c.rig.expr === 'startled') c.rig.setExpression('focused');
    }
    const dir = look && c.wakeT > 0 ? { x: Math.max(-1, Math.min(1, (look.x - c.x) / 500)), y: Math.max(-1, Math.min(1, (look.y - c.y + 120) / 500)) } : null;
    c.rig.update(dt, dir);
  }
  /** @type {{y:number, draw:() => void}[]} */
  const order = cats.map((c) => ({
    y: c.y,
    draw: () => {
      const s = c.px / 250;
      cushion(c.x, c.y + 4, c.px * 0.95, c.seat);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(s, s);
      c.rig.draw(ctx, s * v.k, { reducedMotion: reduced.matches });
      ctx.restore();
    },
  }));
  if (visitor.wait <= 0)
    order.push({
      y: visitor.y,
      draw: () => {
        const s = visitor.scale * (visitorSpec.scale ?? 1);
        ctx.save();
        ctx.globalAlpha = visitor.alpha * (SPOOKY ? 0.85 + 0.15 * Math.sin(time * 2) : 1);
        ctx.translate(visitor.x, visitor.y);
        ctx.scale(s, s);
        visitor.rig.draw(ctx, s * v.k, { reducedMotion: reduced.matches, flip: visitor.dir < 0 });
        ctx.restore();
      },
    });
  for (const o of order.sort((a, b) => a.y - b.y)) o.draw();

  for (const f of flutters) {
    const x = f.x + Math.sin(time * 0.4 + f.ph) * 160;
    const y = f.y + Math.sin(time * 1.3 + f.ph) * 40;
    const w = reduced.matches ? 0.6 : Math.abs(Math.sin(time * 10 + f.ph));
    ctx.fillStyle = f.c;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * 9 * w, y, 10 * w + 2, 13, side * 0.3, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }
  for (const b of bats) {
    b.x += b.v * dt;
    if (b.x > 2000) b.x = -80;
    bat(b.x, b.y + Math.sin(time * 1.5 + b.ph) * 30, time + b.ph);
  }
  for (const p of pops) {
    p.t += dt;
    const k = p.t / 1.4;
    fxText(ctx, p.text, p.x, p.y - k * 40, 46, p.color, k > 0.7 ? (1 - k) / 0.3 : 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 1.4) pops.splice(i, 1);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- input, sound

/** @param {number} x @param {number} y */
function catAt(x, y) {
  return cats.find((c) => Math.abs(c.x - x) < c.px * 0.45 && y < c.y + 20 && y > c.y - c.px * 1.05) ?? null;
}

const prefs = loadProgress();
setMuted(!!prefs.muted);
setVolume(typeof prefs.settings?.volume === 'number' ? prefs.settings.volume : 0.4);
setMusicVolume(typeof prefs.settings?.music === 'number' ? prefs.settings.music : 0.5);
const soundBtn = /** @type {HTMLButtonElement} */ (document.getElementById('hub-sound'));
const syncSound = () => {
  soundBtn.textContent = isMuted() ? 'Sound off' : 'Sound on';
  soundBtn.setAttribute('aria-pressed', String(!isMuted()));
};
syncSound();
let started = false;
function startMusic() {
  unlockAudio();
  if (!started) {
    started = true;
    music(SPOOKY ? 'spooky' : 'title');
  }
}
soundBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  const p = loadProgress();
  p.muted = isMuted();
  saveProgress(p);
  syncSound();
  startMusic();
});

canvas.addEventListener('pointermove', (e) => {
  Object.assign(ptr, toStage(e.clientX, e.clientY), { t: performance.now() / 1000 });
  canvas.style.cursor = catAt(ptr.x, ptr.y) ? 'pointer' : '';
});
canvas.addEventListener('pointerdown', (e) => {
  startMusic();
  const p = toStage(e.clientX, e.clientY);
  Object.assign(ptr, p, { t: performance.now() / 1000 });
  const c = catAt(p.x, p.y);
  if (c) {
    c.rig.setExpression(SPOOKY ? 'smug' : 'happy');
    c.rig.poke();
    c.wakeT = 2.2;
    sfx('meow', { pitch: c.pitch, gap: 0.15 });
    pops.push({ x: c.x, y: c.y - c.px * 1.1, text: '\u2665', t: 0, color: '#E07D95' });
    return;
  }
  if (visitor.wait <= 0 && Math.hypot(visitor.x - p.x, visitor.y - 60 - p.y) < 80) {
    visitor.rig.hit();
    sfx('pop', { pitch: 1.3 });
    pops.push({ x: visitor.x, y: visitor.y - 170, text: SPOOKY ? 'eek!' : 'salute!', t: 0, color: '#5E9A4E' });
  }
});
document.addEventListener('keydown', () => startMusic(), { once: true });
