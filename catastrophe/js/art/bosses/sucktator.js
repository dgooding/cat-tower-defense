// @ts-check
// The Sucktator 9000: an upright vacuum with a bristly monobrow, a dust-bag belly
// and a power-cord tail. Phases: Dust Patrol · THE SUCK · Overheat.
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from '../enemies/enemyrig.js';
import { traceClosed } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('../enemies/enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('../enemies/enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('../enemies/enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {'stern'|'idle'|'roar'|'panic'|'surprised'} Mood */
/** @typedef {{body:string, light:string, dark:string, deep:string}} Paint */

/** @type {Paint} */
const COOL = { body: '#4FA3A5', light: '#9FDCD6', dark: '#2F7375', deep: '#245B5E' };
/** @type {Paint} */
const HOT = { body: '#E2644B', light: '#FFB38C', dark: '#A8352A', deep: '#7E2420' };
const CHROME = '#D7DEE6';
const CHROME_L = '#FFFFFF';
const CHROME_D = '#97A3B2';
const BAG = '#EADCC2';
const BAG_L = '#FFF7E6';
const BAG_D = '#B9A585';
const RUBBER = '#4A4858';
const GOLD = '#F2C14E';
const HOSE = '#8C96A3';
const MOUTH_DARK = '#4A2E3A';

/** @param {number} x @param {number} y @returns {Pt} */
const P = (x, y) => ({ x, y });
/** @param {number} x @param {number} y */
const sharp = (x, y) => [P(x, y), P(x, y)];

/** @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} n @param {number} e @param {number} [wob] @param {number} [freq] */
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

/** Point + tangent along a polyline at fraction u. @param {Pt[]} pts @param {number} u */
function along(pts, u) {
  let total = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(d);
    total += d;
  }
  let target = u * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? Math.min(1, target / seg[i]) : 0;
      const a = pts[i];
      const b = pts[i + 1];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x), total };
    }
    target -= seg[i];
  }
  return { x: pts[0].x, y: pts[0].y, ang: 0, total };
}

/** Corrugated hose. @param {EGeo} g @param {Pt[]} pts @param {number} w */
function hose(g, pts, w) {
  const { pen, lw } = g;
  pen.tube(pts, w, HOSE);
  const { total } = along(pts, 0);
  const n = Math.floor(total / 13);
  for (let i = 1; i < n; i++) {
    const p = along(pts, i / n);
    const nx = -Math.sin(p.ang) * w * 0.5;
    const ny = Math.cos(p.ang) * w * 0.5;
    pen.line([P(p.x - nx, p.y - ny), P(p.x + nx, p.y + ny)], { color: 'rgba(59,58,74,0.55)', width: lw * 0.7, amp: 0 });
  }
  pen.line(pts.map((p) => P(p.x - 3, p.y - 4)), { color: 'rgba(255,255,255,0.45)', width: lw * 0.8 });
}

/** @param {EnemyState} st @param {Mood} base @returns {Mood} */
function moodOf(st, base) {
  if (st.hit > 0.25 || st.mode === 'death') return 'surprised';
  if (st.mode === 'idle' && base === 'stern') return 'idle';
  return base;
}

/** Power-cord tail with a plug. @param {EGeo} g @param {EnemyState} st @param {number} heat */
function cord(g, st, heat) {
  const { pen, ctx, lw, t } = g;
  const wag = Math.sin(t * 3.2) * 14 + Math.sin(st.walk) * 6 * st.moving;
  const pts = [P(-62, -64), P(-118, -30), P(-160, -12), P(-196, -26 + wag * 0.5), P(-222, -46 + wag)];
  pen.tube(pts, 9, '#F3EDE0');
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  ctx.save();
  ctx.translate(end.x, end.y);
  ctx.rotate(ang);
  for (const s of [-1, 1]) pen.blob([P(18, s * 6 - 2.5), P(34, s * 6 - 2.5), P(34, s * 6 + 2.5), P(18, s * 6 + 2.5)], CHROME, { width: lw * 0.7, amp: 0 });
  pen.blob([P(-6, -13), P(20, -15), P(22, 15), P(-6, 13)], soft(ctx, 4, -4, 20, '#FFFFFF', '#F3EDE0', '#C9C0AE'));
  ctx.restore();
  if (heat) {
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + i * 2.1;
      const r = 26 + 10 * Math.sin(t * 20 + i);
      const x = end.x + Math.cos(a) * r - 14;
      const y = end.y + Math.sin(a) * r;
      pen.line([P(x, y), P(x + 6, y - 7), P(x + 2, y - 9), P(x + 9, y - 17)], { color: '#F2B43C', width: lw * 1.2, amp: 0 });
    }
  }
}

/** Floor head with brush, headlight, wheels and the 9000 badge. @param {EGeo} g @param {EnemyState} st @param {Paint} c @param {boolean} beam */
function base(g, st, c, beam) {
  const { pen, ctx, lw, t } = g;
  if (beam) {
    const sweep = Math.sin(t * 1.3) * 12;
    const grad = ctx.createLinearGradient(136, 0, 260, 0);
    grad.addColorStop(0, 'rgba(255,236,150,0.55)');
    grad.addColorStop(1, 'rgba(255,236,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(138, -44);
    ctx.lineTo(262, -92 + sweep);
    ctx.lineTo(262, 2 + sweep * 0.3);
    ctx.lineTo(138, -30);
    ctx.closePath();
    ctx.fill();
  }
  // Bristles
  for (let i = 0; i < 14; i++) {
    const x = -96 + i * 17;
    const w = Math.sin(t * 20 + i) * 3 * (0.3 + st.moving);
    pen.line([P(x, -14), P(x + w, -2)], { width: lw * 0.9, amp: 0 });
  }
  pen.blob([P(-118, -60), P(96, -66), P(130, -60), P(146, -40), P(144, -14), P(-120, -12), P(-130, -36)], soft(ctx, -30, -60, 170, c.light, c.body, c.dark));
  pen.blob([P(-124, -26), P(144, -26), P(144, -12), P(-120, -12)], soft(ctx, 0, -24, 150, CHROME_L, CHROME, CHROME_D), { width: lw * 0.9 });
  // Headlight
  const on = beam ? 1 : 0.35;
  pen.blob(ellipsePts(138, -42, 9, 12, 12), `rgba(255,230,120,${on})`, { width: lw * 0.9 });
  fxText(ctx, '9000', 20, -42, 22, '#B8862B');
  // Wheels
  for (const wx of [-86, 76]) {
    pen.blob(ellipsePts(wx, -20, 22, 22, 16), RUBBER);
    pen.blob(ellipsePts(wx, -20, 10, 10, 12), soft(ctx, wx, -20, 10, CHROME_L, CHROME, CHROME_D), { width: lw * 0.8 });
    for (let k = 0; k < 3; k++) {
      const a = st.walk * 1.4 + (k * Math.PI * 2) / 3;
      pen.line([P(wx + Math.cos(a) * 11, -20 + Math.sin(a) * 11), P(wx + Math.cos(a) * 19, -20 + Math.sin(a) * 19)], { color: '#8A8796', width: lw * 0.9, amp: 0 });
    }
  }
}

/** Dust-bag belly. @param {EGeo} g @param {number} puff 1 = normal, >1 inflated, <1 saggy @param {number} heat */
function bag(g, puff, heat) {
  const { pen, ctx, lw, t } = g;
  const breathe = 1 + Math.sin(t * 2.2) * 0.025;
  const rx = 58 * puff * breathe;
  const ry = 92 * (puff > 1 ? 1 + (puff - 1) * 0.4 : 1);
  const cy = -168;
  const w = pen.blob(superPts(6, cy, rx, ry, 36, 2.4, puff < 1 ? 0.04 : 0.02, puff < 1 ? 7 : 9), soft(ctx, -14, cy - 30, ry, BAG_L, BAG, BAG_D));
  ctx.save();
  clipTo(ctx, w);
  for (const k of [-0.5, 0.5]) pen.line([P(6 + rx * k, cy - ry), P(6 + rx * k * 1.15, cy), P(6 + rx * k, cy + ry)], { color: 'rgba(150,125,90,0.45)', width: lw * 0.8 });
  if (puff < 1) for (let i = 0; i < 4; i++) pen.line([P(-30 + i * 18, cy + 30), P(-24 + i * 18, cy + 60)], { color: 'rgba(150,125,90,0.6)', width: lw * 0.8 });
  ctx.restore();
  // Zipper
  pen.line([P(6, cy - ry + 8), P(8, cy + ry - 10)], { color: '#8A7A60', width: lw * 1.3 });
  for (let i = 0; i < 9; i++) {
    const y = cy - ry + 16 + i * ((ry * 2 - 30) / 9);
    pen.line([P(2, y), P(12, y)], { color: '#8A7A60', width: lw * 0.6, amp: 0 });
  }
  pen.blob([P(1, cy - ry + 10), P(13, cy - ry + 10), P(12, cy - ry + 30), P(2, cy - ry + 30)], CHROME, { width: lw * 0.7 });
  // Heart patch with stitches
  const hx = 6 + rx * 0.5;
  const hy = cy + ry * 0.45;
  pen.blob([P(hx, hy + 12), P(hx - 14, hy - 2), P(hx - 10, hy - 12), P(hx, hy - 6), P(hx + 10, hy - 12), P(hx + 14, hy - 2)], '#F4A6B7', { width: lw * 0.8 });
  // Medals for Outstanding Tidiness
  for (let i = 0; i < 2; i++) {
    const mx = 6 - rx * 0.55 + i * 22;
    const my = cy - ry * 0.55;
    pen.blob([P(mx - 7, my - 18), P(mx + 7, my - 18), P(mx + 6, my), P(mx - 6, my)], i ? '#D2483C' : '#6F9AE0', { width: lw * 0.7 });
    pen.blob(ellipsePts(mx, my + 7, 9, 9, 12), soft(ctx, mx, my + 7, 9, '#FFE6A0', GOLD, '#B8862B'), { width: lw * 0.8 });
  }
  if (heat) {
    ctx.save();
    clipTo(ctx, w);
    ctx.fillStyle = `rgba(255,90,60,${0.18 + 0.08 * Math.sin(t * 8)})`;
    ctx.fillRect(-100, cy - ry, 220, ry * 2);
    ctx.restore();
  }
}

/** Bristly monobrow. @param {EGeo} g @param {Mood} mood @param {number} t */
function monobrow(g, mood, t) {
  const { pen, lw } = g;
  /** @type {[number, number, number]} */
  let ys = [-366, -360, -366];
  if (mood === 'stern') ys = [-374, -354, -374];
  else if (mood === 'roar') ys = [-378, -350, -378];
  else if (mood === 'idle') ys = [-362, -364, -362];
  else if (mood === 'surprised') ys = [-368, -392, -368];
  else if (mood === 'panic') ys = [-356 + Math.sin(t * 30) * 2, -380, -356 - Math.sin(t * 30) * 2];
  const pts = [P(-64, ys[0]), P(-30, (ys[0] + ys[1]) / 2 - 2), P(0, ys[1]), P(30, (ys[1] + ys[2]) / 2 - 2), P(64, ys[2])];
  pen.tube(pts, 15, '#3E3446');
  for (let i = 0; i < 12; i++) {
    const p = along(pts, (i + 0.5) / 12);
    const d = 9 + hash2(i, 2) * 4;
    pen.line([P(p.x, p.y - 4), P(p.x + Math.cos(p.ang - Math.PI / 2 - 0.3) * d, p.y + Math.sin(p.ang - Math.PI / 2 - 0.3) * d)], { color: '#3E3446', width: lw * 1.1 });
  }
}

/** Head housing + face + heat gauge. @param {EGeo} g @param {EnemyState} st @param {Paint} c @param {Mood} mood @param {number} gauge 0..1 */
function head(g, st, c, mood, gauge) {
  const { pen, ctx, lw, t } = g;
  pen.blob(superPts(-4, -330, 84, 56, 36, 2.6), soft(ctx, -30, -360, 100, c.light, c.body, c.dark));
  pen.line([P(-70, -296), P(-4, -284), P(64, -296)], { color: 'rgba(255,255,255,0.35)', width: lw * 1.5 });
  // Heat-o-meter
  const gx = 56;
  const gy = -394;
  pen.line([P(gx, gy + 10), P(gx - 4, -378)], { width: lw * 1.6 });
  pen.blob(ellipsePts(gx, gy, 20, 20, 16), WHITE);
  ctx.save();
  ctx.lineWidth = lw * 2.2;
  for (const [a0, a1, col] of /** @type {[number, number, string][]} */ ([[Math.PI, Math.PI * 1.35, '#8DBF6A'], [Math.PI * 1.35, Math.PI * 1.65, GOLD], [Math.PI * 1.65, Math.PI * 2, '#D2483C']])) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(gx, gy + 4, 13, a0, a1);
    ctx.stroke();
  }
  ctx.restore();
  const na = Math.PI * (1.05 + gauge * 0.9) + (gauge > 0.9 ? Math.sin(t * 40) * 0.08 : Math.sin(t * 2) * 0.03);
  pen.line([P(gx, gy + 4), P(gx + Math.cos(na) * 14, gy + 4 + Math.sin(na) * 14)], { color: '#D2483C', width: lw * 1.1, amp: 0 });
  // Eyes
  const lid = mood === 'idle' ? 0.55 : mood === 'stern' ? 0.25 : mood === 'roar' ? 0.32 : 0;
  for (const s of [-1, 1]) {
    googlyEye(g, st, `sv${s}`, s * 30 - 4, -330, mood === 'panic' || mood === 'surprised' ? 25 : 23, {
      lid,
      lidTilt: mood === 'stern' || mood === 'roar' ? -s * 0.18 : 0,
      lidColor: c.dark,
      iris: '#7FC4E8',
      pupil: mood === 'panic' ? 0.32 : 0.5,
    });
  }
  monobrow(g, mood, t);
  // Grille mouth
  if (mood === 'roar') {
    const w = pen.blob(ellipsePts(-4, -290, 40, 22, 18), MOUTH_DARK);
    ctx.save();
    clipTo(ctx, w);
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(160,140,180,${0.6 - k * 0.15})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(-4, -290, 34 - k * 10, 18 - k * 5, -t * 6 + k, 0.3, 5.2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (mood === 'surprised') {
    pen.blob(ellipsePts(-4, -290, 12, 14, 14), MOUTH_DARK);
  } else if (mood === 'panic') {
    pen.blob([P(-30, -298), P(22, -298), P(22, -282), P(-30, -282)], MOUTH_DARK, { width: lw });
    pen.line([P(-28, -290), P(-20, -296), P(-12, -286), P(-4, -296), P(4, -286), P(12, -296), P(20, -290)], { color: WHITE, width: lw * 1.1 });
  } else {
    const smile = mood === 'idle' ? 6 : -2;
    const w = pen.blob([P(-32, -298), P(-4, -300 + smile * 0.3), P(24, -298), P(22, -286 + smile), P(-4, -282 + smile), P(-30, -286 + smile)], soft(ctx, -10, -296, 30, CHROME_L, CHROME, CHROME_D));
    ctx.save();
    clipTo(ctx, w);
    for (let i = 0; i < 6; i++) pen.line([P(-26 + i * 9, -298), P(-26 + i * 9, -280)], { color: 'rgba(59,58,74,0.6)', width: lw * 0.7, amp: 0 });
    ctx.restore();
  }
}

/** @param {EGeo} g @param {number} x @param {number} y @param {number} r @param {number} a */
function puff(g, x, y, r, a) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.globalAlpha *= a;
  pen.blob(ellipsePts(x, y, r, r * 0.85, 14, (k) => 1 + 0.12 * Math.sin(k * 5)), 'rgba(250,250,252,0.92)', { width: lw * 0.8 });
  ctx.restore();
}

/** Dust bunny (fluffy grey puffball with dot eyes). @param {EGeo} g @param {number} x @param {number} y @param {number} r @param {number} rot */
function dustBunny(g, x, y, r, rot) {
  const { pen, ctx, lw } = g;
  pen.blob(ellipsePts(x, y, r, r, 16, (k) => 1 + 0.18 * Math.sin(k * 8 + rot)), '#B9B6C4', { width: lw * 0.7 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'sucktator',
  height: 420,
  width: 300,
  gait: 'roll',
  deathText: '*unplugged*',
  phases: ['Dust Patrol', 'THE SUCK', 'Overheat'],
  draw(g, st) {
    const { pen, ctx, lw, t } = g;
    const ph = st.phase;
    const heat = ph === 2 ? 1 : 0;
    const c = heat ? HOT : COOL;
    const mood = moodOf(st, ph === 1 ? 'roar' : ph === 2 ? 'panic' : 'stern');
    ctx.save();
    if (ph === 1) {
      ctx.translate(-34, 0);
      ctx.rotate(-0.05);
    }
    if (heat) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      const glow = ctx.createRadialGradient(0, -220, 30, 0, -220, 270);
      glow.addColorStop(0, `rgba(255,110,70,${0.35 + pulse * 0.2})`);
      glow.addColorStop(1, 'rgba(255,110,70,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-300, -480, 600, 490);
      ctx.translate(Math.sin(t * 47) * 2.5, 0);
    }
    cord(g, st, heat);
    // Handle
    pen.tube([P(-40, -360), P(-46, -400), P(-52, -424)], 12, CHROME_D);
    pen.tube([P(-52, -424), P(-62, -446), P(-34, -458), P(-6, -446), P(-22, -428)], 13, c.deep);
    // Hose stowed on the side (patrol)
    if (ph === 0) {
      hose(g, [P(70, -66), P(116, -130), P(104, -218), P(66, -256)], 16);
      pen.blob([P(58, -262), P(72, -280), P(84, -272), P(70, -252)], CHROME, { width: lw * 0.8 });
    }
    // Column
    pen.blob(superPts(-8, -176, 68, 132, 36, 3), soft(ctx, -40, -230, 160, c.light, c.body, c.dark));
    pen.line([P(-58, -270), P(-64, -176), P(-58, -80)], { color: 'rgba(255,255,255,0.4)', width: lw * 1.6 });
    base(g, st, c, ph === 0 && st.mode !== 'idle');
    bag(g, ph === 1 ? 1.28 + Math.sin(t * 9) * 0.04 : heat ? 0.9 : 1, heat);
    head(g, st, c, mood, ph === 0 ? 0.15 : ph === 1 ? 0.55 : 1);
    // Patrol: coughs little dust bunnies out the back
    if (ph === 0) {
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.5 + i / 3) % 1;
        dustBunny(g, -80 - u * 120, -110 - u * 70 + Math.sin(u * 9) * 8, 10 + u * 6, t * 3 + i);
      }
      if (st.mode === 'idle') fxText(ctx, 'hmmm\u266A', -128, -392, 22, INK, 0.6 + 0.4 * Math.sin(t * 3));
    }
    // THE SUCK: hose out front with a flared nozzle and a vortex
    if (ph === 1) {
      const nz = P(182, -200);
      for (let i = 0; i < 7; i++) {
        const u = (t * 1.6 + i / 7) % 1;
        const a = i * 0.9 + t * 4;
        const r = (1 - u) * 90;
        const x0 = nz.x + 30 + r * 1.1;
        const y0 = nz.y + Math.sin(a) * r * 0.9;
        ctx.save();
        ctx.globalAlpha *= Math.sin(u * Math.PI);
        pen.line([P(x0, y0), P(x0 - 18 - u * 10, y0 + Math.cos(a) * 10 * (1 - u)), P(nz.x + 36, nz.y + (y0 - nz.y) * 0.3)], { color: '#4F9CC4', width: lw * 1.8 });
        ctx.restore();
      }
      ctx.save();
      ctx.lineWidth = lw * 1.1;
      for (let k = 0; k < 3; k++) {
        const r = ((t * 2 + k / 3) % 1) * 60 + 8;
        ctx.strokeStyle = `rgba(79,156,196,${0.9 - r / 80})`;
        ctx.beginPath();
        ctx.ellipse(nz.x + 40, nz.y, r * 0.5, r, 0, -1.3 + t * 3, 1.6 + t * 3);
        ctx.stroke();
      }
      ctx.restore();
      // Debris being slurped in
      const items = ['bunny', 'sock', 'kibble', 'bunny'];
      items.forEach((kind, i) => {
        const u = (t * 0.7 + i / items.length) % 1;
        const sx = nz.x + 50 + (1 - u) * 80;
        const sy = nz.y + (i % 2 ? -1 : 1) * (1 - u) * (60 + i * 12) + Math.sin(t * 6 + i) * 6 * (1 - u);
        const k = 0.4 + (1 - u) * 0.6;
        ctx.save();
        ctx.globalAlpha *= Math.min(1, (1 - u) * 4);
        ctx.translate(sx, sy);
        ctx.rotate(t * 5 + i);
        ctx.scale(k * 1.25, k * 0.85);
        if (kind === 'bunny') dustBunny(g, 0, 0, 13, t * 4 + i);
        else if (kind === 'sock') pen.blob([P(-8, -16), P(6, -16), P(6, 4), P(16, 8), P(14, 18), P(-6, 16), P(-8, 4)], '#F4A6B7', { width: lw * 0.8 });
        else pen.blob([P(-10, -6), P(0, -10), P(12, -4), P(8, 8), P(-8, 8)], '#C98B4E', { width: lw * 0.8 });
        ctx.restore();
      });
      hose(g, [P(92, -66), P(140, -110), P(150, -170), P(nz.x - 26, nz.y)], 18);
      const w = pen.blob([P(nz.x - 30, nz.y - 12), ...sharp(nz.x + 26, nz.y - 40), P(nz.x + 32, nz.y), ...sharp(nz.x + 26, nz.y + 40), P(nz.x - 30, nz.y + 12)], soft(ctx, nz.x, nz.y - 20, 50, CHROME_L, CHROME, CHROME_D));
      void w;
      pen.blob(ellipsePts(nz.x + 28, nz.y, 9, 36, 14), MOUTH_DARK, { width: lw * 0.9 });
      // Skid marks
      for (let i = 0; i < 3; i++) pen.line([P(-150 - i * 16, -4 + i * 3), P(-120 - i * 16, -4 + i * 3)], { width: lw * 1.2, alpha: 0.5 });
    }
    // Overheat: limp hose, steam, sweat
    if (heat) {
      hose(g, [P(70, -66), P(126, -34), P(178, -14), P(214, -16)], 16);
      pen.blob([P(206, -26), ...sharp(240, -40), P(244, -12), ...sharp(240, 0), P(206, -6)], CHROME, { width: lw * 0.9 });
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.9 + i / 5) % 1;
        const x = (i % 2 ? 1 : -1) * (30 + i * 12) + Math.sin(u * 6 + i) * 14;
        puff(g, x, -390 - u * 70, 12 + u * 22, 1 - u);
      }
      for (let i = 0; i < 2; i++) {
        const u = (t * 1.3 + i * 0.5) % 1;
        const s = i ? 1 : -1;
        const x = s * (92 + u * 30);
        const y = -350 + u * 50;
        ctx.save();
        ctx.globalAlpha *= 1 - u;
        pen.blob([P(x, y - 14), P(x + 8, y + 2), P(x, y + 10), P(x - 8, y + 2)], '#BFE6F5', { width: lw * 0.7 });
        ctx.restore();
      }
      fxText(ctx, '!!', -104, -404 + Math.sin(t * 12) * 4, 40, '#D2483C');
    }
    ctx.restore();
  },
};
