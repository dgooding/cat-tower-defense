// @ts-check
// Cucumber in a Sheet: a cucumber cadet who raided the linen closet for Halloween. A floaty bedsheet ghost
// with two lopsided eye holes (googly eyes peek through), a green cucumber tip poking out under the hem
// and a tiny trick-or-treat pail. While stealthy it is a faint, see-through sheet; when revealed: "boo?"
import { googlyEye, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const SHEET = '#F7F4FB';
const SHEET_L = '#FFFFFF';
const SHEET_D = '#CFC6E2';
const SKIN = '#6DAA4C';
const SKIN_L = '#B9DE8E';
const SKIN_D = '#3E7834';
const PAIL = '#F28C28';

const TOP = -158;
const HEM = -46;

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** Bedsheet outline: rounded top, flared sides, wavy hem that ripples as it floats. @param {EnemyState} st @param {number} puff */
function sheetPts(st, puff) {
  /** @type {Pt[]} */
  const pts = [];
  const rx = 40 + puff * 6;
  const cy = TOP + 44;
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (Math.PI * i) / 18;
    pts.push({ x: Math.cos(a) * rx, y: cy + Math.sin(a) * 44 });
  }
  // Right side flares out toward the hem.
  pts.push({ x: rx + 4, y: cy + 30 }, { x: rx + 12, y: HEM - 14 });
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = rx + 14 - (2 * rx + 28) * u;
    const w = Math.sin(st.t * 4 + u * 9) * 3;
    pts.push({ x, y: HEM + (i % 2 ? -8 : 3) + w });
  }
  pts.push({ x: -rx - 12, y: HEM - 14 }, { x: -rx - 4, y: cy + 30 });
  return pts;
}

/** @param {EGeo} g @param {EnemyState} st */
function cucumberTip(g, st) {
  const { pen, ctx, lw } = g;
  const sway = Math.sin(st.t * 2.2) * 2;
  pen.blob(ellipsePts(sway, HEM + 6, 22, 20, 22, (a) => 1 + (Math.sin(a) > 0 ? 0.06 * Math.sin(a) : 0)), soft(ctx, sway - 4, HEM, 22, SKIN_L, SKIN, SKIN_D));
  ctx.fillStyle = '#4C8A3B';
  for (const [x, y] of [[-9, 10], [6, 16], [12, 4]]) {
    ctx.beginPath();
    ctx.arc(sway + x, HEM + y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.line([{ x: sway - 4, y: HEM + 24 }, { x: sway, y: HEM + 27 }, { x: sway + 4, y: HEM + 24 }], { width: lw * 0.8, color: SKIN_D });
}

/** Tiny pumpkin pail held by a sheet-covered nub. @param {EGeo} g @param {EnemyState} st @param {number} jolt */
function pail(g, st, jolt) {
  const { pen, ctx, lw } = g;
  const sw = Math.sin(st.t * 2.6) * 0.18 + jolt * 0.6;
  ctx.save();
  ctx.translate(46, -96);
  ctx.rotate(sw);
  pen.line([{ x: -12, y: 10 }, { x: 0, y: -4 }, { x: 12, y: 10 }], { width: lw * 0.9 });
  pen.blob(ellipsePts(0, 22, 14, 12, 18, (a) => 1 + (Math.sin(a) < 0 ? -0.08 : 0.04)), soft(ctx, -4, 18, 14, '#FFD29A', PAIL, '#C25E14'), { width: lw * 0.9 });
  ctx.fillStyle = '#5A3A1E';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 3, 18);
    ctx.lineTo(s * 9, 18);
    ctx.lineTo(s * 6, 13);
    ctx.closePath();
    ctx.fill();
  }
  pen.line([{ x: -6, y: 25 }, { x: 0, y: 28 }, { x: 6, y: 25 }], { width: lw * 0.7 });
  ctx.restore();
  pen.blob(ellipsePts(38, -94, 8, 7, 12), SHEET, { width: lw * 0.8 });
}

/** @type {EnemySpec} */
export const spec = {
  id: 'cucumber-ghost',
  height: 160,
  width: 96,
  gait: 'float',
  deathText: 'boo… hoo.',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const idle = st.mode === 'idle';
    const revealed = !!st.mem.reveal || dying;
    const c = st.t % 4.6;
    // Idle fidget: lifts the sheet's "arms" for a hopeful "boo!".
    const boo = idle && !hit ? Math.sin(smooth(0.4, 1.6, c) * Math.PI) : 0;

    ctx.save();
    if (!revealed) ctx.globalAlpha *= Math.max(0.5, st.hit * 0.85);

    cucumberTip(g, st);
    const body = pen.blob(sheetPts(st, boo), soft(ctx, -14, TOP + 30, 70, SHEET_L, SHEET, SHEET_D));
    // Soft folds.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(body[0].x, body[0].y);
    for (const p of body) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    for (const [x0, x1] of [[-22, -30], [10, 18], [28, 40]]) pen.line([{ x: x0, y: -110 }, { x: (x0 + x1) / 2, y: -80 }, { x: x1, y: HEM - 4 }], { color: SHEET_D, width: lw * 0.8, amp: 0, alpha: 0.8 });
    ctx.restore();

    // Eye holes, a little lopsided (cut at home with safety scissors).
    const holes = [
      { x: -13, y: -124, rx: 12, ry: 13 },
      { x: 15, y: -122, rx: 11, ry: 12 },
    ];
    for (const h of holes) pen.blob(ellipsePts(h.x, h.y, h.rx, h.ry, 16, (a, i) => 1 + (i % 3 ? 0.02 : -0.05)), '#3E5A34', { width: lw * 0.9 });
    const ox = st.lookX;
    const oy = st.lookY;
    if (!hit) st.lookY = 0.15;
    googlyEye(g, st, 'cg-l', -13, -124, 8.5, { white: '#FFFDF6', look: 1.6 });
    googlyEye(g, st, 'cg-r', 15, -122, 8, { white: '#FFFDF6', look: 1.6 });
    st.lookX = ox;
    st.lookY = oy;
    // Cheeks and a tiny mouth drawn on the sheet in marker.
    ctx.fillStyle = 'rgba(244,140,160,0.45)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 26, -106, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (hit) mouth(g, 1, -104, 6, 'o');
    else if (boo > 0.2) mouth(g, 1, -104, 4 + boo * 4, 'o');
    else pen.line([{ x: -5, y: -102 }, { x: 1, y: -99 }, { x: 7, y: -102 }], { width: lw * 1.1 });

    // Sheet "arms": the left one goes up for the boo; the right one holds the pail.
    const lift = boo * 22 + (hit ? st.hit * 14 : 0);
    pen.blob(ellipsePts(-46, -90 - lift, 9, 7, 12), SHEET, { width: lw * 0.8 });
    pail(g, st, hit ? st.hit : 0);
    ctx.restore();

    if (boo > 0.3 && revealed) {
      ctx.save();
      ctx.globalAlpha *= smooth(0.3, 0.7, boo);
      ctx.font = `700 22px Fredoka, "Arial Rounded MT Bold", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8C84C9';
      ctx.fillText('boo?', -44, -126 - lift);
      ctx.restore();
    }
  },
};
