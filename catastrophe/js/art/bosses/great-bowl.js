// @ts-check
// The Great Empty Bowl: a cosmic, enormous, very empty food bowl eclipsing the moon.
// Phases: Dinner Is Late · Diet Food · It's 4 AM. On defeat it is finally full (and overjoyed).
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from '../enemies/enemyrig.js';
import { traceClosed } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('../enemies/enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('../enemies/enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('../enemies/enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {'sad'|'meh'|'ominous'|'sigh'|'surprised'|'joy'} Mood */
/** @typedef {{body:string, light:string, dark:string, rim:string, rimLight:string, rimDark:string, inside:string}} Paint */

/** @type {Paint} */
const COSMIC = { body: '#5E5BAE', light: '#A7A2E6', dark: '#33346E', rim: '#7C78C8', rimLight: '#D3CDF6', rimDark: '#4A4794', inside: '#1E2048' };
/** @type {Paint} */
const MIDNIGHT = { body: '#2E2B5C', light: '#4F4A8C', dark: '#171633', rim: '#3D3974', rimLight: '#6A64A8', rimDark: '#211F44', inside: '#0C0C20' };
/** @type {Paint} */
const HAPPY = { body: '#7A74CF', light: '#C9C3F5', dark: '#4A4794', rim: '#9C96E0', rimLight: '#EEEAFF', rimDark: '#5E5BAE', inside: '#2A2C5E' };
const MOON = '#FFF4CF';
const STAR = '#FFE58A';
const MOUTH_DARK = '#4A2E3A';
const KIBBLE = '#B98A5A';
const KIBBLE_D = '#8A6238';

/** @param {number} x @param {number} y @returns {Pt} */
const P = (x, y) => ({ x, y });

/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function clipTo(ctx, pts) {
  ctx.beginPath();
  traceClosed(ctx, pts);
  ctx.clip();
}

/** Four-point twinkle star. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {string} [c] */
function twinkle(ctx, x, y, r, c = STAR) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** @param {EnemyState} st @param {Mood} base @returns {Mood} */
function moodOf(st, base) {
  if (st.mode === 'death' || st.mode === 'dead') return 'joy';
  if (st.hit > 0.25) return 'surprised';
  if (st.mode === 'idle' && base !== 'ominous') return 'sigh';
  return base;
}

const RIM_Y = -184;
const RIM_RX = 176;
const RIM_RY = 36;

/**
 * Eclipse-moon halo: a big glowing moon with corona rays, eclipsed by the bowl in front.
 * 'gold' = dinner-time glow with a diamond-ring sparkle, 'pale' = washed-out diet
 * silver, 'blood' = 4 AM red, 'full' = golden victory-feast moon.
 * @param {EGeo} g @param {'gold'|'pale'|'blood'|'full'} kind
 */
function halo(g, kind) {
  const { pen, ctx, lw, t } = g;
  const cx = 0;
  const cy = -170;
  const r = 172;
  const rgb = { gold: '255,214,120', pale: '214,220,240', blood: '235,80,120', full: '255,240,180' }[kind];
  const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.6);
  glow.addColorStop(0, `rgba(${rgb},${0.75 + 0.15 * Math.sin(t * 1.5)})`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Corona rays, slowly turning
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.12);
  ctx.fillStyle = `rgba(${rgb},0.55)`;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rr = i % 2 ? r * 1.02 : r * (1.16 + 0.06 * Math.sin(t * 2 + i));
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The moon itself; the bowl in front of it is what does the eclipsing.
  const tone = {
    gold: ['#FFFDF0', MOON, '#F2D98E', 'rgba(230,205,140,0.45)'],
    full: ['#FFFFF6', '#FFF1B8', '#F6CF6A', 'rgba(236,200,120,0.4)'],
    pale: ['#F7F8FC', '#DCE1EE', '#B4BCD3', 'rgba(150,160,190,0.35)'],
    blood: ['#C47080', '#83344C', '#3E1630', 'rgba(30,0,25,0.35)'],
  }[kind];
  const mw = pen.blob(ellipsePts(cx, cy, r, r, 36), soft(ctx, cx, cy, r, tone[0], tone[1], tone[2]), { width: lw * 0.9 });
  ctx.save();
  clipTo(ctx, mw);
  ctx.fillStyle = tone[3];
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(cx - 120 + hash2(i, 1) * 240, cy - 130 + hash2(i, 2) * 120, 10 + hash2(i, 3) * 18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (kind === 'gold' || kind === 'full') {
    const a = -2.35;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const s = 16 + 6 * Math.sin(t * 3);
    twinkle(ctx, x, y, s * 1.6, '#FFFDF0');
    ctx.fillStyle = '#FFFDF0';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Kibble nugget with a tiny face. @param {EGeo} g @param {number} x @param {number} y @param {number} r @param {number} rot @param {'sad'|'happy'|'none'} face */
function kibble(g, x, y, r, rot, face) {
  const { pen, ctx, lw } = g;
  pen.blob(ellipsePts(x, y, r, r * 0.85, 7, (a) => 1 + 0.08 * Math.sin(a * 3 + rot)), soft(ctx, x, y, r, '#E2B784', KIBBLE, KIBBLE_D), { width: lw * 0.7 });
  if (face === 'none') return;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  if (face === 'sad') ctx.arc(x, y + r * 0.45, r * 0.22, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y + r * 0.15, r * 0.22, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

/** Fish-shaped treat. @param {EGeo} g @param {number} x @param {number} y @param {number} k @param {number} rot */
function fishTreat(g, x, y, k, rot) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  pen.blob([P(-18, 0), P(-4, -10), P(12, -8), P(18, 0), P(12, 8), P(-4, 10), P(-18, 0), P(-28, -10), P(-26, 0), P(-28, 10)], '#F29E7A', { width: lw / k });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(9, -2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The bowl body, rim and interior. @param {EGeo} g @param {Paint} c @param {boolean} full */
function bowl(g, c, full) {
  const { pen, ctx, lw, t } = g;
  pen.blob(ellipsePts(0, -26, 120, 16, 20), c.dark);
  /** @type {Pt[]} */
  const body = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    body.push(P(Math.cos(a) * RIM_RX, RIM_Y + Math.sin(a) * RIM_RY));
  }
  body.push(P(-150, -110), P(-124, -38), P(0, -26), P(124, -38), P(150, -110));
  const bw = pen.blob(body, soft(ctx, -70, -140, 210, c.light, c.body, c.dark));
  ctx.save();
  clipTo(ctx, bw);
  for (let i = 0; i < 26; i++) {
    const x = -160 + hash2(i, 11) * 320;
    const y = -40 - hash2(i, 12) * 150;
    const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i));
    ctx.fillStyle = `rgba(255,240,200,${a * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + hash2(i, 13) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.line([P(-140, -150), P(-126, -96), P(-100, -56)], { color: 'rgba(255,255,255,0.35)', width: lw * 3 });
  ctx.restore();
  // Rim donut
  pen.blob(ellipsePts(0, RIM_Y, RIM_RX + 12, RIM_RY + 10, 36), soft(ctx, -60, RIM_Y - 20, 200, c.rimLight, c.rim, c.rimDark));
  const inner = pen.blob(ellipsePts(0, RIM_Y + 2, RIM_RX - 14, RIM_RY - 8, 32), c.inside);
  ctx.save();
  clipTo(ctx, inner);
  const ig = ctx.createLinearGradient(0, RIM_Y - RIM_RY, 0, RIM_Y + RIM_RY);
  ig.addColorStop(0, 'rgba(0,0,0,0.35)');
  ig.addColorStop(1, 'rgba(120,110,200,0.35)');
  ctx.fillStyle = ig;
  ctx.fillRect(-RIM_RX, RIM_Y - RIM_RY, RIM_RX * 2, RIM_RY * 2);
  if (!full) {
    // one lonely crumb
    ctx.fillStyle = KIBBLE;
    ctx.beginPath();
    ctx.arc(30, RIM_Y + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Starry rim speckles
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * (RIM_RX - 1);
    const y = RIM_Y + Math.sin(a) * (RIM_RY + 1);
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
    if (i % 3 === 0) twinkle(ctx, x, y, 5 + tw * 5);
    else {
      ctx.fillStyle = i % 2 ? STAR : WHITE;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + tw * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Heaped treats for the joyful finale. @param {EGeo} g */
function feast(g) {
  const { pen, ctx } = g;
  pen.blob([P(-150, RIM_Y + 6), P(-110, RIM_Y - 40), P(-40, RIM_Y - 74), P(40, RIM_Y - 76), P(112, RIM_Y - 42), P(150, RIM_Y + 6), P(0, RIM_Y + 24)], soft(ctx, -30, RIM_Y - 50, 140, '#E2B784', KIBBLE, KIBBLE_D));
  for (let i = 0; i < 12; i++) {
    const x = -120 + hash2(i, 21) * 240;
    const y = RIM_Y - 10 - hash2(i, 22) * 50 * (1 - Math.abs(x) / 160);
    kibble(g, x, y, 10, i, 'none');
  }
  fishTreat(g, -40, RIM_Y - 70, 1.2, -0.3);
  fishTreat(g, 60, RIM_Y - 60, 1.1, 0.4);
  twinkle(ctx, 10, RIM_Y - 100, 14, WHITE);
}

/** The melancholy face. @param {EGeo} g @param {EnemyState} st @param {Mood} mood @param {Paint} c */
function face(g, st, mood, c) {
  const { pen, ctx, lw, t } = g;
  const ey = -124;
  // Blush (rosy when joyful)
  ctx.fillStyle = mood === 'joy' ? 'rgba(244,140,160,0.6)' : 'rgba(244,140,160,0.25)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 92, -90, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood === 'joy') {
    for (const s of [-1, 1]) {
      pen.line([P(s * 52 - 24, ey + 6), P(s * 52, ey - 18), P(s * 52 + 24, ey + 6)], { width: lw * 2 });
      // happy tears
      const u = (t * 1.5 + (s > 0 ? 0.5 : 0)) % 1;
      pen.blob(ellipsePts(s * (80 + u * 30), ey + 12 + u * 40, 6, 9, 10), '#BFE6F5', { width: lw * 0.6 });
    }
    const w = pen.blob([P(-50, -86), P(0, -84), P(50, -86), P(34, -52), P(0, -40), P(-34, -52)], MOUTH_DARK);
    ctx.save();
    clipTo(ctx, w);
    pen.blob(ellipsePts(0, -44, 22, 12, 12), '#F28C9E', { width: lw * 0.7 });
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.8 + i / 3) % 1;
      const x = (i - 1) * 110 + Math.sin(u * 6) * 10;
      const y = -240 - u * 90;
      ctx.save();
      ctx.globalAlpha *= 1 - u;
      pen.blob([P(x, y + 12), P(x - 14, y - 2), P(x - 8, y - 12), P(x, y - 6), P(x + 8, y - 12), P(x + 14, y - 2)], '#F4A6B7', { width: lw * 0.7 });
      ctx.restore();
    }
    return;
  }
  if (mood === 'ominous') {
    for (const s of [-1, 1]) {
      const gl = ctx.createRadialGradient(s * 52, ey, 4, s * 52, ey, 64);
      gl.addColorStop(0, `rgba(255,214,90,${0.55 + 0.15 * Math.sin(t * 4)})`);
      gl.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(s * 52, ey, 64, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const lid = { sad: 0.32, meh: 0.55, ominous: 0.38, sigh: 0.9, surprised: 0 }[mood] ?? 0;
  for (const s of [-1, 1]) {
    googlyEye(g, st, `gb${s}`, s * 52, ey, mood === 'surprised' ? 36 : 33, {
      lid,
      lidTilt: mood === 'ominous' ? -s * 0.22 : mood === 'meh' ? 0 : s * 0.16,
      lidColor: c.dark,
      white: mood === 'ominous' ? '#FFE27A' : WHITE,
      iris: mood === 'ominous' ? '#F29E4C' : '#8C84C9',
      pupil: mood === 'ominous' ? 0.24 : mood === 'surprised' ? 0.4 : 0.62,
      look: mood === 'meh' ? 0.3 : 1,
    });
    // worried / angry brows
    let inner = ey - 52;
    let outer = ey - 40;
    if (mood === 'ominous') (inner = ey - 34), (outer = ey - 54);
    if (mood === 'meh') (inner = ey - 46), (outer = ey - 46);
    if (mood === 'surprised') (inner = ey - 62), (outer = ey - 56);
    pen.tube([P(s * 24, inner), P(s * 50, (inner + outer) / 2 - 5), P(s * 78, outer)], 8, c.dark);
  }
  // Tear welling up (sad / meh)
  if (mood === 'sad' || mood === 'meh' || mood === 'sigh') {
    const u = (t * 0.45) % 1;
    const tx = -84;
    const ty = ey + 22 + u * 70;
    ctx.save();
    ctx.globalAlpha *= 1 - u * 0.7;
    pen.blob([P(tx, ty - 12), P(tx + 8, ty + 4), P(tx, ty + 11), P(tx - 8, ty + 4)], '#BFE6F5', { width: lw * 0.7 });
    ctx.restore();
  }
  // Mouth
  if (mood === 'surprised') {
    pen.blob(ellipsePts(0, -66, 14, 18, 14), MOUTH_DARK);
  } else if (mood === 'ominous') {
    /** @type {Pt[]} */
    const m = [];
    for (let i = 0; i <= 10; i++) m.push(P(-70 + i * 14, -74 + Math.sin(i * 0.31) * 0 + (i % 2 ? 4 : 0) - Math.sin((i / 10) * Math.PI) * 8));
    pen.line(m, { width: lw * 1.3, color: '#FFD25A' });
  } else if (mood === 'sigh') {
    pen.blob(ellipsePts(0, -70, 9, 6, 10), MOUTH_DARK);
    const u = (t * 0.5) % 1;
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    pen.blob(ellipsePts(18 + u * 50, -70 - u * 30, 12 + u * 16, 8 + u * 10, 12), 'rgba(255,255,255,0.7)', { width: lw * 0.6 });
    ctx.restore();
  } else if (mood === 'meh') {
    pen.line([P(-30, -70), P(-10, -73), P(10, -69), P(30, -72)], { width: lw * 1.3 });
  } else {
    pen.line([P(-34, -62), P(-16, -74), P(0, -76), P(16, -74), P(34, -62)], { width: lw * 1.3 });
    pen.line([P(-6, -78), P(4, -82)], { width: lw * 0.8, alpha: 0.6 });
  }
}

/** Alarm clock being tapped impatiently. @param {EGeo} g @param {EnemyState} st */
function clock(g, st) {
  const { pen, ctx, lw, t } = g;
  const cx = 214;
  const cy = -168;
  const tap = Math.max(0, Math.sin(t * 9));
  const tapping = st.mode !== 'idle';
  // tiny arm from the bowl
  const hand = P(cx - 44 + (tapping ? tap * 8 : -6), cy + 18 - (tapping ? tap * 4 : -10));
  pen.line([P(148, -112), P(184, -112), hand], { width: lw * 2 });
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tapping ? Math.sin(t * 9) * 0.06 : 0);
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * 22, -38, 14, 11, 12), '#F2C14E', { width: lw * 0.9 });
  pen.line([P(-18, 34), P(-26, 46)], { width: lw * 1.6 });
  pen.line([P(18, 34), P(26, 46)], { width: lw * 1.6 });
  pen.blob(ellipsePts(0, 0, 40, 40, 22), '#D2483C');
  pen.blob(ellipsePts(0, 0, 31, 31, 20), WHITE, { width: lw * 0.8 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 25, Math.sin(a) * 25, i % 3 ? 1.4 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const mA = t * 1.6 - Math.PI / 2;
  const hA = Math.PI * 0.75 + t * 0.13;
  pen.line([P(0, 0), P(Math.cos(hA) * 14, Math.sin(hA) * 14)], { width: lw * 1.4, amp: 0 });
  pen.line([P(0, 0), P(Math.cos(mA) * 22, Math.sin(mA) * 22)], { width: lw, amp: 0 });
  ctx.restore();
  pen.blob(ellipsePts(hand.x, hand.y, 10, 9, 10), COSMIC.light, { width: lw * 0.9 });
  if (tapping && tap > 0.9) fxText(ctx, 'tap', cx - 64, cy - 52, 20, INK, 0.8);
}

/** Digital "4:00" clock, glowing. @param {EGeo} g */
function clock4am(g) {
  const { pen, ctx, lw, t } = g;
  const x = 200;
  const y = -300;
  pen.blob([P(x - 52, y - 24), P(x + 52, y - 24), P(x + 52, y + 24), P(x - 52, y + 24)], '#1A1838', { width: lw });
  ctx.save();
  ctx.shadowColor = '#FF5A5A';
  ctx.shadowBlur = 16;
  const blink = Math.sin(t * 3) > -0.4;
  fxText(ctx, blink ? '4:00' : '4 00', x, y + 2, 34, '#FF5A5A');
  ctx.restore();
  void lw;
}

/** @type {EnemySpec} */
export const spec = {
  id: 'great-bowl',
  height: 420,
  width: 360,
  gait: 'float',
  deathText: '\u2026it\u2019s\u2026 full?! \uD83C\uDF5A',
  phases: ['Dinner Is Late', 'Diet Food', "It's 4 AM"],
  draw(g, st) {
    const { pen, ctx, lw, t } = g;
    const ph = st.phase;
    const dying = st.mode === 'death' || st.mode === 'dead';
    const base = ph === 2 ? 'ominous' : ph === 1 ? 'meh' : 'sad';
    const mood = moodOf(st, base);
    const c = dying ? HAPPY : ph === 2 ? MIDNIGHT : COSMIC;
    // Background stars
    for (let i = 0; i < 8; i++) {
      const x = -230 + hash2(i, 31) * 460;
      const y = -360 + hash2(i, 32) * 260;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 2);
      twinkle(ctx, x, y, 4 + tw * 6, ph === 2 && !dying ? '#C9D3E8' : STAR);
    }
    if (ph === 2 && !dying) {
      // creeping 4 AM darkness (a soft aura, no hard edges)
      const dk = ctx.createRadialGradient(0, -190, 60, 0, -190, 320);
      dk.addColorStop(0, `rgba(20,18,50,${0.55 + 0.1 * Math.sin(t * 1.2)})`);
      dk.addColorStop(1, 'rgba(20,18,50,0)');
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.arc(0, -190, 320, 0, Math.PI * 2);
      ctx.fill();
    }
    halo(g, dying ? 'full' : ph === 2 ? 'blood' : ph === 1 ? 'pale' : 'gold');
    // Diet kibble orbit (behind half)
    /** @param {boolean} front */
    const orbit = (front) => {
      for (let i = 0; i < 6; i++) {
        const a = t * 1.1 + (i / 6) * Math.PI * 2;
        if (Math.sin(a) > 0 !== front) continue;
        const x = Math.cos(a) * 232;
        const y = -150 + Math.sin(a) * 60;
        const k = 0.85 + Math.sin(a) * 0.2;
        kibble(g, x, y, 20 * k, a, 'sad');
        if (i === 2) fxText(ctx, 'LITE', x, y - 34 * k, 18, '#8A6238');
      }
    };
    if (ph === 1 && !dying) orbit(false);
    bowl(g, c, dying);
    if (dying) feast(g);
    face(g, st, mood, c);
    if (ph === 1 && !dying) orbit(true);
    if (ph === 0 && !dying) clock(g, st);
    if (ph === 2 && !dying) {
      clock4am(g);
      fxText(ctx, '\u2026feed\u2026', -190, -60 + Math.sin(t * 1.5) * 8, 22, '#C9D3E8', 0.5 + 0.3 * Math.sin(t * 2));
    }
    void pen;
    void lw;
  },
};
