// @ts-check
// Bathzilla: a kaiju-sized clawfoot bathtub with a showerhead horn, rubber-duck
// back spikes and a drain-chain tail. Phases: Shower Spray · Duck Armada · Down the Drain.
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from '../enemies/enemyrig.js';
import { traceClosed } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('../enemies/enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('../enemies/enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('../enemies/enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {'roar'|'idle'|'glee'|'panic'|'surprised'} Mood */

const TUB = '#7FB8D6';
const TUB_L = '#C4E6F4';
const TUB_D = '#4C82A3';
const TUB_DEEP = '#33607D';
const ENAMEL = '#FBFAF4';
const ENAMEL_D = '#D3DEE6';
const WATER = '#9FD3EA';
const WATER_D = '#5FA6C8';
const BRASS = '#E7B24A';
const BRASS_L = '#FFE29C';
const BRASS_D = '#A9772A';
const CHROME = '#D7DEE6';
const CHROME_D = '#97A3B2';
const DUCK = '#FFD94A';
const DUCK_L = '#FFF1A6';
const DUCK_D = '#E3A52C';
const BEAK = '#F28C3C';
const MOUTH_DARK = '#4A2E3A';

/** @param {number} x @param {number} y @returns {Pt} */
const P = (x, y) => ({ x, y });
/** @param {number} x @param {number} y */
const sharp = (x, y) => [P(x, y), P(x, y)];

/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function clipTo(ctx, pts) {
  ctx.beginPath();
  traceClosed(ctx, pts);
  ctx.clip();
}

// The tub's top opening is a tilted ellipse (front end higher).
const RIM = { cx: 0, cy: -300, rx: 206, ry: 26, rot: -0.09 };
/** @param {number} a */
function rimPt(a) {
  const x = RIM.rx * Math.cos(a);
  const y = RIM.ry * Math.sin(a);
  const c = Math.cos(RIM.rot);
  const s = Math.sin(RIM.rot);
  return P(RIM.cx + x * c - y * s, RIM.cy + x * s + y * c);
}
/** Back-edge y at a given x (approx). @param {number} x */
function backY(x) {
  const a = Math.PI + Math.acos(Math.max(-1, Math.min(1, -x / RIM.rx)));
  return rimPt(a).y;
}

/** @param {EnemyState} st @param {Mood} base @returns {Mood} */
function moodOf(st, base) {
  if (st.hit > 0.25 || st.mode === 'death') return 'surprised';
  if (st.mode === 'idle' && base === 'roar') return 'idle';
  return base;
}

/** Rubber duck facing right. @param {EGeo} g @param {number} x @param {number} y bottom @param {number} k scale @param {{goggles?:boolean, flap?:number, dizzy?:boolean}} [o] */
function duck(g, x, y, k, o = {}) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const w = lw / k;
  pen.blob([P(-26, -16), P(-34, -30), P(-18, -24), P(6, -30), P(26, -22), P(28, -8), P(14, 0), P(-18, 0)], soft(ctx, -6, -20, 30, DUCK_L, DUCK, DUCK_D), { width: w });
  pen.blob(ellipsePts(14, -40, 15, 14, 14), soft(ctx, 10, -44, 15, DUCK_L, DUCK, DUCK_D), { width: w });
  pen.blob([P(26, -42), ...sharp(42, -38), P(40, -33), P(26, -34)], BEAK, { width: w * 0.9 });
  const f = o.flap ?? 0;
  pen.blob([P(-10, -18), P(4, -22 - f * 14), P(10, -14), P(-4, -10)], DUCK_D, { width: w * 0.8 });
  if (o.goggles) {
    pen.line([P(2, -46), P(26, -48)], { color: '#7A5A3A', width: w * 1.6 });
    pen.blob(ellipsePts(20, -45, 6, 6, 10), 'rgba(170,220,240,0.9)', { width: w * 0.8 });
  } else if (o.dizzy) {
    pen.line([P(15, -44), P(21, -40), P(18, -46), P(23, -43)], { width: w * 0.8 });
  } else {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(19, -43, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Brass lion-claw foot. @param {EGeo} g @param {number} x @param {number} lift @param {boolean} near */
function clawFoot(g, x, lift, near) {
  const { pen, ctx, lw } = g;
  const k = near ? 1 : 0.82;
  const fill = near ? soft(ctx, x - 6, -60, 50, BRASS_L, BRASS, BRASS_D) : soft(ctx, x, -50, 40, BRASS, BRASS_D, '#7A5520');
  pen.blob([P(x - 18 * k, -84), P(x + 18 * k, -84), P(x + 12 * k, -40 - lift), P(x + 2, -28 - lift), P(x - 10 * k, -40 - lift)], fill);
  pen.blob(ellipsePts(x + 8 * k, -16 - lift, 28 * k, 15 * k, 16), fill);
  for (let i = 0; i < 3; i++) {
    const cx = x - 8 * k + i * 15 * k + 8;
    pen.blob([P(cx - 6 * k, -10 - lift), ...sharp(cx + 9 * k, -2 - lift), P(cx + 4 * k, -12 - lift)], near ? ENAMEL : ENAMEL_D, { width: lw * 0.8 });
  }
}

/** Water surface inside the opening (+ swirl when draining). @param {EGeo} g @param {number} swirl */
function water(g, swirl) {
  const { pen, ctx, lw, t } = g;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < 32; i++) pts.push(rimPt((i / 32) * Math.PI * 2));
  const w = pen.blob(pts, soft(ctx, -60, -310, 200, '#D4EEF8', WATER, WATER_D));
  ctx.save();
  clipTo(ctx, w);
  if (swirl) {
    ctx.strokeStyle = 'rgba(40,90,130,0.55)';
    ctx.lineWidth = lw * 1.2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(0, -302, 40 + k * 40, 6 + k * 6, RIM.rot, -t * 5 + k, -t * 5 + k + 3.6);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const x = -170 + i * 64 + Math.sin(t * 2 + i) * 8;
      pen.line([P(x, -306), P(x + 22, -310)], { color: 'rgba(255,255,255,0.7)', width: lw * 0.9 });
    }
  }
  ctx.restore();
}

/** Foam bubbles peeking over the back rim. @param {EGeo} g @param {number} n */
function foam(g, n) {
  const { pen, lw, t } = g;
  for (let i = 0; i < n; i++) {
    const x = -190 + (i / (n - 1)) * 380;
    const r = 10 + hash2(i, 5) * 10 + Math.sin(t * 3 + i) * 2;
    pen.blob(ellipsePts(x, backY(x) + 4 - r * 0.4, r, r * 0.85, 12), 'rgba(255,255,255,0.95)', { width: lw * 0.7 });
  }
}

/** The tub body, rim lip, face, horn. @param {EGeo} g @param {EnemyState} st @param {Mood} mood @param {{spray:boolean, swirl:number, hat:boolean, rimDucks:number, droop:boolean}} o */
function tub(g, st, mood, o) {
  const { pen, ctx, lw, t } = g;
  const walk = st.walk;
  const m = st.moving;
  // Far feet
  if (!o.swirl) {
    clawFoot(g, -86, Math.max(0, Math.sin(walk + Math.PI)) * 16 * m, false);
    clawFoot(g, 140, Math.max(0, Math.sin(walk)) * 16 * m, false);
  }
  // Showerhead horn pipe (behind the eyes)
  const droop = o.droop ? 1 : 0;
  const pipe = [P(28, -328), P(40, -400), P(84, -446 + droop * 30), P(140, -438 + droop * 70), P(160, -414 + droop * 90)];
  pen.tube(pipe, 12, CHROME);
  const sh = pipe[pipe.length - 1];
  const shAng = 0.75 + droop * 0.6;
  ctx.save();
  ctx.translate(sh.x, sh.y);
  ctx.rotate(shAng);
  pen.blob([P(-6, -10), P(-6, 10), ...sharp(22, 24), P(26, 0), ...sharp(22, -24)], soft(ctx, 6, -8, 30, '#FFFFFF', CHROME, CHROME_D));
  ctx.fillStyle = 'rgba(59,58,74,0.6)';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(24, i * 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const face = P(sh.x + Math.cos(shAng) * 26, sh.y + Math.sin(shAng) * 26);
  // Opening: water + foam + duck spikes + eye domes
  water(g, o.swirl);
  if (!o.swirl) foam(g, 7);
  for (let i = 0; i < o.rimDucks; i++) {
    const x = -176 + i * 52;
    const bob = Math.sin(t * 3 + i * 1.2) * 4;
    duck(g, x, backY(x) + 10 + bob, 0.95, {});
  }
  for (const [x, s] of [[78, -1], [152, 1]]) {
    const y = backY(x);
    pen.blob(ellipsePts(x, y - 16, 38, 36, 18), soft(ctx, x - 10, y - 30, 40, TUB_L, TUB, TUB_D));
    void s;
  }
  // Body
  /** @type {Pt[]} */
  const body = [];
  for (let i = 0; i <= 18; i++) body.push(rimPt((i / 18) * Math.PI));
  body.push(P(-186, -170), P(-150, -84), P(-60, -66), P(60, -66), P(150, -82), P(194, -176));
  const bw = pen.blob(body, soft(ctx, -60, -260, 260, TUB_L, TUB, TUB_D));
  ctx.save();
  clipTo(ctx, bw);
  ctx.fillStyle = 'rgba(40,80,110,0.18)';
  ctx.beginPath();
  ctx.ellipse(40, -60, 260, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  pen.line([P(-170, -250), P(-150, -140), P(-110, -96)], { color: 'rgba(255,255,255,0.5)', width: lw * 3 });
  // painted wave trim
  /** @type {Pt[]} */
  const wave = [];
  for (let i = 0; i <= 24; i++) wave.push(P(-200 + i * 17, -116 + Math.sin(i * 1.3 + t * 1.5) * 6));
  pen.line(wave, { color: ENAMEL, width: lw * 1.6 });
  ctx.restore();
  // Rolled enamel lip
  /** @type {Pt[]} */
  const lip = [];
  for (let i = 0; i <= 18; i++) lip.push(rimPt((i / 18) * Math.PI));
  pen.tube(lip, 13, ENAMEL);
  // Faucet nose with drips
  pen.tube([P(196, -318), P(226, -312), P(234, -294)], 13, CHROME);
  pen.blob(ellipsePts(214, -326, 10, 6, 10), CHROME, { width: lw * 0.8 });
  for (let i = 0; i < 2; i++) {
    const u = (t * 1.1 + i * 0.5) % 1;
    const y = -284 + u * 120;
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    pen.blob([P(234, y - 9), P(240, y + 3), P(234, y + 8), P(228, y + 3)], '#BFE6F5', { width: lw * 0.6 });
    ctx.restore();
  }
  // Eyes on the domes + brows
  const eyeR = mood === 'panic' || mood === 'surprised' ? 30 : 27;
  const lid = mood === 'idle' ? 0.55 : mood === 'roar' ? 0.28 : mood === 'glee' ? 0.15 : 0;
  for (const [x, s] of [[78, -1], [152, 1]]) {
    const y = backY(x) - 22;
    googlyEye(g, st, `bz${s}`, x, y, eyeR, { lid, lidTilt: mood === 'roar' ? -s * 0.2 : 0, lidColor: TUB_D, iris: '#5FA6C8', pupil: mood === 'panic' ? 0.32 : 0.5 });
    let inner = y - 30;
    let outer = y - 38;
    if (mood === 'roar') (inner = y - 22), (outer = y - 44);
    if (mood === 'surprised' || mood === 'panic') (inner = y - 52), (outer = y - 42);
    if (mood === 'glee' && s > 0) (inner = y - 46), (outer = y - 54);
    pen.tube([P(x - s * 6, inner), P(x + s * 14, (inner + outer) / 2 - 4), P(x + s * 32, outer)], 10, TUB_DEEP);
  }
  // Mouth on the tub side
  const mx = 118;
  const my = -224;
  if (mood === 'surprised') {
    pen.blob(ellipsePts(mx, my + 14, 26, 30, 16), MOUTH_DARK);
  } else if (mood === 'panic') {
    pen.blob([P(mx - 56, my), P(mx + 56, my - 8), P(mx + 50, my + 30), P(mx - 50, my + 34)], MOUTH_DARK);
    /** @type {Pt[]} */
    const zz = [];
    for (let i = 0; i <= 8; i++) zz.push(P(mx - 48 + i * 12, my + 12 + (i % 2 ? 8 : -2) + Math.sin(t * 30) * 2));
    pen.line(zz, { color: WHITE, width: lw * 1.3 });
  } else if (mood === 'idle') {
    pen.line([P(mx - 50, my + 4), P(mx, my + 20), P(mx + 50, my - 6)], { width: lw * 1.4 });
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.6 + i / 3) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - u;
      pen.blob(ellipsePts(mx + 60 + u * 30, my - 10 - u * 80, 6 + u * 8, 6 + u * 8, 10), 'rgba(255,255,255,0.8)', { width: lw * 0.6 });
      ctx.restore();
    }
  } else {
    const open = mood === 'glee' ? 52 : 40 + Math.sin(t * 4) * 6;
    const w = pen.blob([P(mx - 62, my - 4), P(mx, my + 2), P(mx + 62, my - 14), P(mx + 40, my + open * 0.8), P(mx - 4, my + open), P(mx - 44, my + open * 0.7)], MOUTH_DARK);
    ctx.save();
    clipTo(ctx, w);
    pen.blob(ellipsePts(mx, my + open + 6, 34, 18, 12), '#F28C9E', { width: lw * 0.8 });
    for (let i = 0; i < 7; i++) {
      const x = mx - 54 + i * 17;
      const y = my - 4 - i * 1.4;
      pen.blob([P(x, y - 4), P(x + 14, y - 5), P(x + 13, y + 11), P(x + 1, y + 12)], ENAMEL, { width: lw * 0.7, amp: 0 });
    }
    ctx.restore();
  }
  // Admiral's paper-boat hat (Duck Armada)
  if (o.hat) {
    const hx = 116;
    const hy = backY(116) - 60;
    pen.blob([P(hx - 50, hy + 8), ...sharp(hx - 34, hy - 16), P(hx, hy - 44), ...sharp(hx + 34, hy - 16), P(hx + 50, hy + 8)], '#FFF4DC');
    pen.blob([P(hx - 54, hy + 2), P(hx + 54, hy + 2), P(hx + 50, hy + 16), P(hx - 50, hy + 16)], '#F2E2C2', { width: lw * 0.9 });
    pen.line([P(hx - 10, hy - 18), P(hx + 10, hy - 18)], { color: '#6F9AE0', width: lw * 0.8 });
  }
  // Near feet
  if (!o.swirl) {
    clawFoot(g, -130, Math.max(0, Math.sin(walk)) * 18 * m, true);
    clawFoot(g, 100, Math.max(0, Math.sin(walk + Math.PI)) * 18 * m, true);
  }
  return face;
}

/** Drain-chain tail with a rubber stopper. @param {EGeo} g @param {EnemyState} st @param {Pt} end */
function chainTail(g, st, end) {
  const { pen, ctx, lw } = g;
  const a = P(-188, -190);
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sag = Math.sin(u * Math.PI) * 40;
    const x = a.x + (end.x - a.x) * u - sag * 0.3;
    const y = a.y + (end.y - a.y) * u + sag * 0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(end.y - a.y, end.x - a.x) + (i % 2 ? Math.PI / 2 : 0));
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, i % 2 ? 3 : 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = CHROME;
    ctx.lineWidth = lw * 1.1;
    ctx.stroke();
    ctx.restore();
  }
  pen.blob([P(end.x - 18, end.y - 16), P(end.x + 18, end.y - 16), P(end.x + 13, end.y + 8), P(end.x - 13, end.y + 8)], soft(ctx, end.x - 4, end.y - 10, 20, '#E07A6E', '#B8483E', '#7E2B26'));
  pen.blob(ellipsePts(end.x, end.y - 20, 6, 5, 10), CHROME, { width: lw * 0.8 });
  void st;
}

/** Water arcs from the showerhead. @param {EGeo} g @param {Pt} from */
function spray(g, from) {
  const { pen, ctx, lw, t } = g;
  for (let i = 0; i < 5; i++) {
    const vx = 150 + i * 32;
    const vy = -60 + i * 28;
    /** @type {Pt[]} */
    const arc = [];
    for (let k = 0; k <= 8; k++) {
      const s = (k / 8) * 1.05;
      arc.push(P(from.x + vx * s, from.y + vy * s + 260 * s * s));
    }
    pen.line(arc, { color: 'rgba(120,190,225,0.85)', width: lw * 2.4 });
    pen.line(arc, { color: 'rgba(255,255,255,0.8)', width: lw * 0.8 });
    for (let d = 0; d < 2; d++) {
      const s = ((t * 1.4 + i * 0.17 + d * 0.5) % 1) * 1.05;
      const x = from.x + vx * s;
      const y = from.y + vy * s + 260 * s * s;
      pen.blob(ellipsePts(x, y, 6, 7, 8), '#BFE6F5', { width: lw * 0.6 });
    }
  }
  ctx.save();
  ctx.globalAlpha *= 0.55;
  pen.blob(ellipsePts(from.x + 110, -6, 70, 9, 14), WATER, { width: lw * 0.6 });
  ctx.restore();
}

/** Ground whirlpool. @param {EGeo} g @param {boolean} front draw the front rim only */
function whirlpool(g, front) {
  const { pen, ctx, lw, t } = g;
  const rx = 250;
  const ry = 46;
  const cy = -6;
  if (!front) {
    const grad = ctx.createRadialGradient(0, cy, 4, 0, cy, rx);
    grad.addColorStop(0, '#24505E');
    grad.addColorStop(0.35, WATER_D);
    grad.addColorStop(1, WATER);
    pen.blob(ellipsePts(0, cy, rx, ry, 28), grad);
    ctx.save();
    ctx.lineWidth = lw * 1.2;
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.75 - k * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(0, cy, 40 + k * 44, 8 + k * 8, 0, t * 4 + k * 1.3, t * 4 + k * 1.3 + 2.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(-rx - 10, cy, rx * 2 + 20, ry + 20);
  ctx.clip();
  pen.blob(ellipsePts(0, cy, rx * 0.86, ry * 0.7, 24), 'rgba(95,166,200,0.75)', { stroke: false });
  ctx.restore();
  /** @type {Pt[]} */
  const edge = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    edge.push(P(Math.cos(a) * rx * 0.86, cy + Math.sin(a) * ry * 0.7));
  }
  pen.line(edge, { color: WHITE, width: lw * 1.6 });
}

/** @type {EnemySpec} */
export const spec = {
  id: 'bathzilla',
  height: 440,
  width: 420,
  gait: 'waddle',
  deathText: '*glug\u2026 glug\u2026 plop*',
  phases: ['Shower Spray', 'Duck Armada', 'Down the Drain'],
  draw(g, st) {
    const { pen, ctx, lw, t } = g;
    const ph = st.phase;
    if (ph === 2) {
      const mood = moodOf(st, 'panic');
      whirlpool(g, false);
      // Ducks spinning around the drain
      for (let i = 0; i < 4; i++) {
        const a = t * 2.4 + (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * 215;
        const y = -6 + Math.sin(a) * 34;
        if (Math.sin(a) < 0) duck(g, x, y + 4, 0.8, { dizzy: true });
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(-400, -600, 800, 594);
      ctx.clip();
      ctx.translate(0, 52);
      ctx.rotate(Math.sin(t * 2.6) * 0.07);
      // a back claw foot waving helplessly in the air
      ctx.save();
      ctx.translate(-196, -236);
      ctx.rotate(-2.3 + Math.sin(t * 10) * 0.35);
      clawFoot(g, 0, 0, true);
      ctx.restore();
      chainTail(g, st, P(-60, -40));
      tub(g, st, mood, { spray: false, swirl: 1, hat: false, rimDucks: 2, droop: true });
      ctx.restore();
      whirlpool(g, true);
      for (let i = 0; i < 4; i++) {
        const a = t * 2.4 + (i / 4) * Math.PI * 2;
        const x = Math.cos(a) * 215;
        const y = -6 + Math.sin(a) * 34;
        if (Math.sin(a) >= 0) duck(g, x, y + 4, 0.8, { dizzy: true });
      }
      // Panic sweat
      for (let i = 0; i < 3; i++) {
        const u = (t * 1.5 + i / 3) % 1;
        const x = 200 + u * 40;
        const y = -380 + i * 20 - Math.sin(u * Math.PI) * 30;
        ctx.save();
        ctx.globalAlpha *= 1 - u;
        pen.blob([P(x, y - 12), P(x + 7, y + 2), P(x, y + 8), P(x - 7, y + 2)], '#BFE6F5', { width: lw * 0.7 });
        ctx.restore();
      }
      return;
    }
    const mood = moodOf(st, ph === 1 ? 'glee' : 'roar');
    const wag = Math.sin(t * 2.4) * 16 + Math.sin(st.walk) * 8 * st.moving;
    chainTail(g, st, P(-246 + wag * 0.4, -14));
    const idle = st.mode === 'idle';
    const face = tub(g, st, mood, { spray: ph === 0 && !idle, swirl: 0, hat: ph === 1, rimDucks: ph === 1 ? 2 : 4, droop: false });
    if (ph === 0 && !idle) spray(g, face);
    if (ph === 1) {
      // Duck Armada: rubber ducks catapulting off the rim
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.55 + i / 5) % 1;
        const x0 = -60 + i * 18;
        const y0 = backY(x0);
        const x = x0 + u * (280 - i * 20) - 90 * u * (1 - u);
        const y = y0 - Math.sin(u * Math.PI) * (80 + i * 10) - u * 20;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, (1 - u) * 5, u * 8);
        for (let k = 1; k <= 3; k++) pen.line([P(x - 30 - k * 12, y - 16 + k * 6), P(x - 46 - k * 12, y - 12 + k * 6)], { width: lw, alpha: 0.5 });
        ctx.translate(x, y);
        ctx.rotate(Math.cos(u * Math.PI) * -0.5);
        duck(g, 0, 0, 0.78, { goggles: true, flap: Math.sin(t * 20 + i) });
        ctx.restore();
      }
      fxText(ctx, 'QUACK!', 200, -470 + Math.sin(t * 5) * 6, 26, '#E3A52C');
    }
  },
};
