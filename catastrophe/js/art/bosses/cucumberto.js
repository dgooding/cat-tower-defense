// @ts-check
// Count Cucumberto, the Pickled One: a tall, elegant vampire cucumber in a
// high-collared cape. Phases: Rise of the Brine · Jar Fortress · Bat-Cape Frenzy.
import { googlyEye, tinyLegs, ellipsePts, soft, INK, WHITE } from '../enemies/enemyrig.js';
import { traceClosed, rotatePts } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('../enemies/enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('../enemies/enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('../enemies/enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {'smug'|'idle'|'grumpy'|'sulk'|'manic'|'surprised'} Mood */

const GREEN = '#7DB552';
const G_LIGHT = '#C6E79A';
const G_SHADE = '#4E8638';
const G_DARK = '#33602A';
const LID = '#5F9844';
const CAPE = '#2F2A3D';
const CAPE_HI = '#5A5175';
const RED = '#C8383F';
const RED_LIGHT = '#F07479';
const RED_DARK = '#8C2331';
const GOLD = '#F2C14E';
const GOLD_DARK = '#B8862B';
const MOUTH_DARK = '#6B3A47';
const BLUSH = 'rgba(244,140,160,0.45)';

/** @param {number} x @param {number} y @returns {Pt} */
const P = (x, y) => ({ x, y });
/** Duplicate a vertex so the smoothed outline keeps a crisp point there. @param {number} x @param {number} y */
const sharp = (x, y) => [P(x, y), P(x, y)];

/**
 * Superellipse outline (capsules, jars).
 * @param {number} cx @param {number} cy @param {number} rx @param {number} ry
 * @param {number} n @param {number} e @param {number} [wob] @param {number} [freq]
 */
function superPts(cx, cy, rx, ry, n, e, wob = 0, freq = 0) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const m = 1 + wob * Math.sin(a * freq);
    pts.push(P(cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * rx * m, cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * ry * m));
  }
  return pts;
}

/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function clipTo(ctx, pts) {
  ctx.beginPath();
  traceClosed(ctx, pts);
  ctx.clip();
}

/** Draw `fn` scaled by k around (x, y) while keeping ink widths constant. @param {EGeo} g @param {number} x @param {number} y @param {number} k @param {(g:EGeo)=>void} fn */
function scaled(g, x, y, k, fn) {
  const { ctx, pen } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const w = pen.width;
  const a = pen.amp;
  pen.width = w / k;
  pen.amp = a / k;
  fn({ ...g, lw: g.lw / k });
  pen.width = w;
  pen.amp = a;
  ctx.restore();
}

/** Thick ring with ink edges (monocle). @param {EGeo} g @param {number} x @param {number} y @param {number} r */
function ring(g, x, y, r) {
  const { ctx, lw } = g;
  ctx.save();
  ctx.fillStyle = 'rgba(255,253,246,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = lw * 3.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = lw * 1.6;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, -2.6, -1.9);
  ctx.stroke();
  ctx.restore();
}

/** @param {EnemyState} st @param {Mood} base @returns {Mood} */
function moodOf(st, base) {
  if (st.hit > 0.25 || st.mode === 'death') return 'surprised';
  if (st.mode === 'idle') return base === 'grumpy' ? 'sulk' : base === 'manic' ? 'manic' : 'idle';
  return base;
}

// ───────────────────────────── the Count himself ─────────────────────────────

/** Cucumber body + slicked hair swirl. Bottom ≈ -32, top ≈ -405. @param {EGeo} g @param {EnemyState} st */
function cukeBody(g, st) {
  const { pen, ctx, lw } = g;
  const w = pen.blob(superPts(0, -212, 64, 180, 44, 2.5, 0.016, 13), soft(ctx, -16, -270, 190, G_LIGHT, GREEN, G_SHADE));
  ctx.save();
  clipTo(ctx, w);
  for (const x of [-36, -8, 24]) {
    pen.line([P(x * 0.55, -385), P(x, -212), P(x * 0.55, -40)], { color: 'rgba(222,244,184,0.5)', width: lw * 2.2 });
  }
  ctx.fillStyle = 'rgba(40,80,30,0.18)';
  ctx.beginPath();
  ctx.ellipse(38, -200, 34, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 16; i++) {
    const x = (hash2(i, 3) - 0.5) * 104;
    const y = -55 - hash2(i, 7) * 300;
    if (y < -215 && y > -345 && Math.abs(x) < 56) continue;
    ctx.fillStyle = G_SHADE;
    ctx.beginPath();
    ctx.ellipse(x, y, 4.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Slicked hair with a widow's peak.
  pen.blob(
    [P(-64, -312), P(-60, -352), P(-38, -386), P(0, -398), P(38, -386), P(62, -352), P(66, -312), P(42, -336), P(20, -330), ...sharp(0, -314), P(-20, -330), P(-42, -336)],
    soft(ctx, -10, -370, 70, '#5C8F45', G_DARK, '#244A1E'),
  );
  pen.line([P(-44, -350), P(-26, -374), P(-4, -384)], { color: 'rgba(255,255,255,0.4)', width: lw * 1.3 });
  /** @type {Pt[]} */
  const sp = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * 0.5 + (i / 18) * Math.PI * 2.6;
    const r = 22 - i * 1.0;
    sp.push(P(10 + Math.cos(a) * r, -404 + Math.sin(a) * r * 0.75));
  }
  pen.tube([P(-6, -390), ...sp], 7, G_DARK);
  void st;
}

/** @param {EGeo} g @param {Mood} mood */
function fangs(g, mood) {
  const { pen, lw } = g;
  /** @param {number} x @param {number} y @param {number} s */
  const fang = (x, y, s) => pen.blob([...sharp(x - 5 * s, y), ...sharp(x + 5 * s, y), ...sharp(x, y + 11 * s)], WHITE, { width: lw * 0.8, amp: 0 });
  if (mood === 'surprised') {
    fang(-8, -246, 0.8);
    fang(8, -246, 0.8);
  } else if (mood === 'manic') {
    fang(-17, -251, 1.2);
    fang(17, -251, 1.2);
  } else if (mood === 'grumpy' || mood === 'sulk') {
    fang(9, -244, 1);
  } else {
    fang(-11, -243, 1);
    fang(12, -244, 1);
  }
}

/** Face: brows, googly eyes, monocle, nose, fanged mouth. @param {EGeo} g @param {EnemyState} st @param {Mood} mood */
function cukeFace(g, st, mood) {
  const { pen, ctx, lw, t } = g;
  const ey = -292;
  ctx.fillStyle = BLUSH;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 46, -258, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes
  const lid = { smug: 0.18, idle: 0.5, grumpy: 0.42, sulk: 0.58, manic: 0, surprised: 0 }[mood];
  for (const s of [-1, 1]) {
    googlyEye(g, st, `cc${s}`, s * 29, ey, mood === 'manic' ? 27 : 24, {
      lid,
      lidTilt: mood === 'grumpy' || mood === 'sulk' ? -s * 0.2 : mood === 'smug' ? -s * 0.08 : 0,
      lidColor: LID,
      iris: '#B8434A',
      pupil: mood === 'manic' ? 0.38 : 0.5,
    });
  }
  // Brows
  for (const s of [-1, 1]) {
    let inner = -318;
    let outer = -326;
    if (mood === 'surprised') (inner = -342), (outer = -338);
    else if (mood === 'grumpy' || mood === 'sulk') (inner = -308), (outer = -332);
    else if (mood === 'manic') (inner = -334), (outer = -346);
    else if (mood === 'idle' && s > 0) (inner = -330), (outer = -340);
    else inner = -312;
    pen.tube([P(s * 10, inner), P(s * 32, (inner + outer) / 2 - 6), P(s * 54, outer)], 8, G_DARK);
  }
  // Monocle (pops off when startled, dangles in the frenzy)
  const chainEnd = P(54, -212);
  let mx = 29;
  let my = ey;
  if (mood === 'surprised') (mx = 46), (my = ey - 30);
  if (mood === 'manic') (mx = 84 + Math.sin(t * 13) * 8), (my = -196 + Math.abs(Math.cos(t * 13)) * 10);
  pen.line([P(mx + 18, my + 20), P((mx + chainEnd.x) / 2 + 14, Math.max(my, chainEnd.y) + 22), chainEnd], { color: GOLD_DARK, width: lw * 1.1 });
  ring(g, mx, my, 27);
  // Nose
  pen.blob(ellipsePts(3, -266, 9, 7, 12), soft(ctx, 1, -268, 9, G_LIGHT, GREEN, G_SHADE), { width: lw * 0.9 });
  // Mouth
  if (mood === 'surprised') {
    pen.blob(ellipsePts(0, -236, 13, 15, 14), MOUTH_DARK);
    fangs(g, mood);
  } else if (mood === 'manic') {
    pen.blob([P(-34, -252), P(0, -254), P(34, -252), P(24, -228), P(0, -218), P(-24, -228)], MOUTH_DARK);
    pen.blob(ellipsePts(4, -226, 12, 6, 10), '#F28C9E', { width: lw * 0.7 });
    fangs(g, mood);
  } else if (mood === 'grumpy' || mood === 'sulk') {
    pen.line([P(-24, -238), P(0, -250), P(22, -240)], { width: lw * 1.2 });
    fangs(g, mood);
  } else {
    pen.line([P(-30, -252), P(-6, -240), P(18, -242), P(32, -256)], { width: lw * 1.2 });
    fangs(g, mood);
  }
}

/** High vampire collar behind the head. @param {EGeo} g @param {number} [flare] */
function collar(g, flare = 1) {
  const { pen, ctx } = g;
  for (const s of [-1, 1]) {
    const pts = [P(s * 34, -206), ...sharp(s * (108 + 14 * flare), -350 - 10 * flare), P(s * 92, -318), ...sharp(s * (78 + 6 * flare), -388 - 8 * flare), P(s * 46, -330)];
    pen.blob(pts, CAPE);
    const inner = pts.map((p) => P(s * 34 + (p.x - s * 34) * 0.78, -206 + (p.y + 206) * 0.84));
    pen.blob(inner, soft(ctx, s * 70, -320, 70, RED_LIGHT, RED, RED_DARK), { stroke: false });
  }
}

/** White glove. @param {EGeo} g @param {number} x @param {number} y @param {number} [r] */
function glove(g, x, y, r = 13) {
  g.pen.blob(ellipsePts(x, y, r, r * 0.9, 12, (a) => 1 + 0.12 * Math.sin(a * 4)), WHITE);
}

/** Rising brine bubbles. @param {EGeo} g @param {number} n @param {number} spread @param {number} rise @param {number} base */
function bubbles(g, n, spread, rise, base) {
  const { pen, ctx, lw, t } = g;
  for (let i = 0; i < n; i++) {
    const u = (t * 0.45 + i / n) % 1;
    const s = i % 2 ? 1 : -1;
    const x = s * (spread * 0.55 + hash2(i, 4) * spread * 0.45) + Math.sin(t * 3 + i) * 6;
    const y = base - u * rise;
    const r = 5 + hash2(i, 8) * 7;
    ctx.save();
    ctx.globalAlpha *= 1 - u * u;
    pen.blob(ellipsePts(x, y, r, r, 10), 'rgba(214,240,170,0.7)', { width: lw * 0.6 });
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ───────────────────────────── phases ─────────────────────────────

/** Phase 0 · Rise of the Brine: cape held wide open, green brine glow. @param {EGeo} g @param {EnemyState} st */
function rise(g, st) {
  const { pen, ctx, lw, t } = g;
  const mood = moodOf(st, 'smug');
  const sp = st.mode === 'idle' ? 0.35 : mood === 'surprised' ? 1.15 : 1;
  const fl = Math.sin(t * 2.2) * 0.5 + 0.5;
  // Brine glow + puddle
  const glow = ctx.createRadialGradient(0, -150, 20, 0, -150, 280);
  glow.addColorStop(0, 'rgba(176,226,110,0.35)');
  glow.addColorStop(1, 'rgba(176,226,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-300, -440, 600, 450);
  pen.blob(ellipsePts(0, -4, 185, 20, 22, (a) => 1 + 0.05 * Math.sin(a * 5 + t * 3)), 'rgba(160,210,95,0.55)', { width: lw * 0.8 });
  bubbles(g, 8, 235, 300, -14);
  // Cape (lining toward us)
  /** @param {number} k inset */
  const capePts = (k) => {
    /** @type {Pt[]} */
    const pts = [];
    const hy = -232 - 22 * fl * sp + (1 - sp) * 70;
    const hx = 70 + 100 * sp;
    const half = 64 + 120 * sp - k;
    pts.push(P(-40, -208 + k));
    pts.push(...sharp(-hx + k, hy + k));
    pts.push(P(-half - 6, -130));
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const x = -half + (i / n) * half * 2;
      const tip = i % 2 === 0;
      const y = (tip ? -12 : -40) - k * 0.8 + Math.sin(t * 3 + i * 1.3) * 5;
      if (tip) pts.push(...sharp(x + Math.sin(t * 2 + i) * 6, y));
      else pts.push(P(x, y));
    }
    pts.push(P(half + 6, -130));
    pts.push(...sharp(hx - k, hy + k));
    pts.push(P(40, -208 + k));
    pts.push(P(0, -196 + k));
    return { pts, hx, hy };
  };
  const outer = capePts(0);
  pen.blob(outer.pts, CAPE);
  const inner = capePts(13);
  const lin = pen.blob(inner.pts, soft(ctx, -40, -200, 220, RED_LIGHT, RED, RED_DARK), { stroke: false });
  ctx.save();
  clipTo(ctx, lin);
  for (const s of [-1, 1]) {
    for (const k of [0.3, 0.62]) {
      pen.line([P(s * outer.hx * 0.9, outer.hy + 20), P(s * outer.hx * k * 1.1, -120), P(s * outer.hx * k, -20)], { color: 'rgba(120,20,40,0.45)', width: lw * 1.4 });
    }
  }
  ctx.restore();
  collar(g, sp);
  tinyLegs(g, st, 0, -38, 22, { shoe: CAPE });
  cukeBody(g, st);
  cukeFace(g, st, mood);
  // Arms in black sleeves holding the cape open
  for (const s of [-1, 1]) {
    const hx = s * (outer.hx - 8);
    const hy = outer.hy + 10;
    pen.tube([P(s * 50, -196), P(s * (50 + (outer.hx - 50) * 0.5), hy + 30 * sp), P(hx, hy)], 14, CAPE);
    glove(g, hx, hy);
  }
  // Brine drips from the cape hem
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.8 + i * 0.27) % 1;
    const x = (i - 1.5) * 90 * sp;
    const y = -30 + u * 26;
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    pen.blob([P(x, y - 9), P(x + 6, y + 3), P(x, y + 8), P(x - 6, y + 3)], '#B9E07E', { width: lw * 0.6 });
    ctx.restore();
  }
}

/** Phase 1 · Jar Fortress: sulking inside a sealed pickle jar. @param {EGeo} g @param {EnemyState} st */
function jar(g, st) {
  const { pen, ctx, lw, t } = g;
  const mood = moodOf(st, 'grumpy');
  const jarPts = superPts(0, -204, 132, 168, 48, 4.2);
  tinyLegs(g, st, 0, -40, 54, { shoe: CAPE });
  // Back of the glass
  pen.blob(jarPts, 'rgba(232,246,226,0.55)', { stroke: false });
  // The Count, shrunk to fit and wrapped in his cape like a blanket
  scaled(g, 0, -42, 0.74, (h) => {
    const hp = h.pen;
    collar(h, 0.4);
    cukeBody(h, st);
    hp.blob([P(-58, -214), P(0, -198), P(58, -214), P(84, -150), P(78, -40), P(0, -14), P(-78, -40), P(-84, -150)], soft(h.ctx, -20, -170, 120, CAPE_HI, CAPE, '#1F1B2A'));
    hp.blob([P(-58, -214), P(0, -198), P(58, -214), P(40, -186), P(0, -178), P(-40, -186)], RED, { width: h.lw * 0.8 });
    cukeFace(h, st, mood);
    // Crossed arms (tapping a finger when idle)
    const tap = st.mode === 'idle' ? Math.sin(t * 9) * 5 : 0;
    hp.tube([P(-66, -168), P(-10, -122), P(46, -146)], 18, CAPE_HI);
    hp.tube([P(66, -166), P(10, -130), P(-46, -142)], 18, CAPE_HI);
    glove(h, 50, -146 + tap, 14);
    glove(h, -50, -142, 14);
  });
  // Brine
  const surf = -206;
  ctx.save();
  clipTo(ctx, jarPts);
  /** @type {Pt[]} */
  const wave = [];
  for (let i = 0; i <= 12; i++) wave.push(P(-140 + i * (280 / 12), surf + Math.sin(t * 2.4 + i * 0.9) * 5));
  ctx.beginPath();
  ctx.moveTo(wave[0].x, wave[0].y);
  for (const p of wave) ctx.lineTo(p.x, p.y);
  ctx.lineTo(140, 0);
  ctx.lineTo(-140, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,200,80,0.38)';
  ctx.fill();
  pen.line(wave, { color: 'rgba(90,140,50,0.8)', width: lw });
  // dill sprigs + floating peppercorns
  for (let i = 0; i < 5; i++) {
    const x = -100 + i * 50 + Math.sin(t + i) * 6;
    const y = -60 - hash2(i, 2) * 140;
    ctx.fillStyle = '#5B4636';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of [-1, 1]) {
    pen.line([P(s * 108, -40), P(s * 112, -120), P(s * 100, -200)], { color: '#4E8638', width: lw * 0.9 });
    for (let k = 0; k < 4; k++) pen.line([P(s * (110 - k * 3), -70 - k * 35), P(s * (122 - k * 3), -88 - k * 35)], { color: '#4E8638', width: lw * 0.7 });
  }
  bubbles(g, 6, 110, 180, -40);
  ctx.restore();
  // Glass edge + highlights
  pen.blob(jarPts, null, { width: lw * 1.3 });
  ctx.save();
  clipTo(ctx, jarPts);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(-112, -330, 20, 250, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-84, -320, 8, 120, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(96, -300, 10, 90, 5);
  ctx.fill();
  ctx.restore();
  // Label
  pen.blob([P(-78, -122), P(78, -122), P(80, -66), P(-80, -66)], '#FFF4DC', { width: lw * 0.9 });
  ctx.save();
  ctx.fillStyle = RED;
  ctx.font = '700 22px Fredoka, "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DO NOT', 0, -104);
  ctx.fillText('OPEN', 0, -82);
  ctx.restore();
  // Neck + lid (rattles when struck)
  const pop = st.hit * 26;
  const tilt = st.hit * 0.25 * Math.sin(t * 30);
  pen.blob([P(-116, -384), P(116, -384), P(114, -356), P(-114, -356)], 'rgba(232,246,226,0.8)', { width: lw });
  ctx.save();
  ctx.translate(0, -378 - pop);
  ctx.rotate(tilt);
  pen.blob([P(-120, 0), P(-122, -36), P(-100, -46), P(100, -46), P(122, -36), P(120, 0)], soft(ctx, -40, -30, 140, '#FFE6A0', GOLD, GOLD_DARK));
  for (let i = -5; i <= 5; i++) pen.line([P(i * 20, -6), P(i * 20, -36)], { color: 'rgba(120,80,20,0.45)', width: lw * 0.8 });
  pen.line([P(-90, -40), P(-30, -44)], { color: 'rgba(255,255,255,0.7)', width: lw * 1.2 });
  ctx.restore();
}

/** Phase 2 · Bat-Cape Frenzy: cape becomes flapping bat wings. @param {EGeo} g @param {EnemyState} st */
function frenzy(g, st) {
  const { pen, ctx, lw, t } = g;
  const mood = moodOf(st, 'manic');
  const speed = st.mode === 'idle' ? 7 : 18;
  // Speed lines (behind)
  for (let i = 0; i < 6; i++) {
    const y = -380 + i * 62 + hash2(i, 1) * 20;
    const off = (t * 500 + i * 137) % 70;
    const x0 = -150 - off;
    pen.line([P(x0, y), P(x0 - 30 - hash2(i, 3) * 40, y)], { width: lw * 1.4, alpha: 0.55 * st.moving + 0.2 });
  }
  ctx.save();
  ctx.rotate(0.13);
  const flap = Math.sin(t * speed) * 0.42;
  for (const s of [-1, 1]) {
    const pv = P(s * 42, -228);
    const base = [P(s * 30, -240), ...sharp(s * 128, -336), ...sharp(s * 222, -296), P(s * 182, -258), ...sharp(s * 206, -196), P(s * 156, -176), ...sharp(s * 158, -114), P(s * 104, -136), P(s * 46, -150)];
    const pts = rotatePts(base, pv.x, pv.y, -s * flap);
    pen.blob(pts, CAPE);
    const mem = pts.map((p) => P(pv.x + (p.x - pv.x) * 0.84, pv.y + (p.y - pv.y) * 0.84 + 6));
    pen.blob(mem, soft(ctx, s * 120, -240, 120, RED_LIGHT, RED, RED_DARK), { stroke: false });
    const wrist = pts[1];
    for (const k of [3, 6, 9]) pen.line([wrist, P(pv.x + (pts[k].x - pv.x) * 0.9, pv.y + (pts[k].y - pv.y) * 0.9)], { color: CAPE, width: lw * 1.6 });
    pen.tube([P(s * 48, -200), P(s * 80, -270), wrist], 13, CAPE);
    glove(g, wrist.x, wrist.y, 12);
  }
  collar(g, 1.2);
  tinyLegs(g, st, 0, -38, 22, { shoe: CAPE });
  cukeBody(g, st);
  cukeFace(g, st, mood);
  ctx.restore();
  // Sweat flicks
  for (let i = 0; i < 3; i++) {
    const u = (t * 1.6 + i / 3) % 1;
    const x = -70 - u * 90 - i * 12;
    const y = -370 + i * 26 - Math.sin(u * Math.PI) * 40;
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    pen.blob([P(x, y - 12), P(x + 7, y + 2), P(x, y + 8), P(x - 7, y + 2)], '#BFE6F5', { width: lw * 0.7 });
    ctx.restore();
  }
  // Little bat sidekicks
  for (let i = 0; i < 2; i++) {
    const a = t * 3.2 + i * Math.PI;
    const bx = Math.cos(a) * 205;
    const by = -430 + Math.sin(a * 2) * 22 + i * 26;
    const f = Math.sin(t * 24 + i) * 10;
    pen.blob([P(bx, by + 6), ...sharp(bx - 16, by - 6 - f), P(bx - 26, by + 2 - f * 0.5), ...sharp(bx - 30, by - 4 - f), P(bx - 14, by + 4), P(bx, by + 10), P(bx + 14, by + 4), ...sharp(bx + 30, by - 4 - f), P(bx + 26, by + 2 - f * 0.5), ...sharp(bx + 16, by - 6 - f)], CAPE, { width: lw * 0.7 });
    ctx.fillStyle = '#FFE58A';
    ctx.beginPath();
    ctx.arc(bx - 4, by + 2, 2.2, 0, Math.PI * 2);
    ctx.arc(bx + 4, by + 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'cucumberto',
  height: 410,
  width: 300,
  gait: 'waddle',
  deathText: 'I\u2019ll be\u2026 relished.',
  phases: ['Rise of the Brine', 'Jar Fortress', 'Bat-Cape Frenzy'],
  draw(g, st) {
    if (st.phase === 1) jar(g, st);
    else if (st.phase === 2) frenzy(g, st);
    else rise(g, st);
  },
};
