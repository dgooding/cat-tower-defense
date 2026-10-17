// @ts-check
// Monday: a twin-bell alarm clock with tired eye bags, a droopy clock-hand
// mustache and a coffee mug it will not share. Bells rattle in bursts.
import { googlyEye, tinyLegs, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */

const H = 170;
const CASE = '#6F8FC7';
const CASE_L = '#B3C8EC';
const CASE_D = '#465F94';
const BRASS = '#E2B04A';
const BRASS_L = '#F7DE95';
const BRASS_D = '#A97B22';
const DIAL = '#FFF8EA';
const MUG = '#F6EEDC';

/** Rounded-rect points (straight edges stay straight under the smoothing trace). */
/** @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
function rr(x, y, w, h, r) {
  const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  /** @type {{x:number,y:number}[]} */
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const [cx, cy] = c[i];
    const [px, py] = c[(i + 3) % 4];
    const [nx, ny] = c[(i + 1) % 4];
    const d1 = Math.hypot(px - cx, py - cy);
    const d2 = Math.hypot(nx - cx, ny - cy);
    pts.push({ x: cx + ((px - cx) / d1) * r, y: cy + ((py - cy) / d1) * r });
    pts.push({ x: cx, y: cy });
    pts.push({ x: cx + ((nx - cx) / d2) * r, y: cy + ((ny - cy) / d2) * r });
  }
  return pts;
}

/** Brass bell dome whose rim sits at (x, y), tilted by `ang`. @param {EGeo} g @param {number} x @param {number} y @param {number} ang @param {number} r */
function bell(g, x, y, ang, r) {
  const { ctx, pen, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  pen.line([{ x: 0, y: 0 }, { x: 0, y: r * 1.1 }], { width: lw * 2.2 });
  /** @type {{x:number,y:number}[]} */
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.95 });
  }
  pts.push({ x: r * 1.12, y: r * 0.1 }, { x: -r * 1.12, y: r * 0.1 });
  pen.blob(pts, soft(ctx, 0, -r * 0.45, r, BRASS_L, BRASS, BRASS_D));
  pen.line([{ x: -r * 0.55, y: -r * 0.55 }, { x: -r * 0.2, y: -r * 0.8 }], { color: WHITE, width: lw * 1.2, alpha: 0.8 });
  pen.blob(ellipsePts(0, -r * 1.02, r * 0.2, r * 0.17, 10), BRASS_D);
  ctx.restore();
}

/** @param {EGeo} g @param {number} x @param {number} y @param {number} ang @param {number} t */
function mug(g, x, y, ang, t) {
  const { ctx, pen, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // Handle on the side the hand grabs.
  pen.blob(ellipsePts(16, -2, 8, 9, 14), null, { width: lw * 1.1 });
  ctx.lineWidth = lw * 2.6;
  ctx.strokeStyle = MUG;
  ctx.beginPath();
  ctx.ellipse(16, -2, 8, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  pen.blob(rr(-13, -16, 28, 30, 6), soft(ctx, -2, -6, 20, '#FFFFFF', MUG, '#D8CCB2'));
  pen.blob(ellipsePts(1, -15, 12, 3.2, 14), '#6B4A33', { width: lw * 0.7 });
  pen.line([{ x: -9, y: -6 }, { x: -9, y: 8 }], { color: WHITE, width: lw * 1.2, alpha: 0.9 });
  ctx.fillStyle = '#C0533F';
  ctx.font = '700 9px Fredoka, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ugh', 2, 2);
  // Steam wisps.
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.8 + k * 0.5) % 1;
    const sx = -4 + k * 10;
    const sy = -20 - ph * 22;
    pen.line(
      [
        { x: sx, y: sy + 8 },
        { x: sx + Math.sin(t * 3 + k) * 4, y: sy },
        { x: sx - Math.sin(t * 3 + k) * 4, y: sy - 8 },
      ],
      { color: '#BDB6C8', width: lw * 0.9, alpha: 1 - ph },
    );
  }
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'monday',
  height: H,
  width: 150,
  gait: 'waddle',
  deathText: '…see you next week.',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const cy = -96;
    const R = 58;

    // Bells ring in grumpy little bursts (and always when bonked).
    const ringing = (t % 4.6 < 0.8 ? 1 : 0.15) + st.hit * 1.5;
    const rattle = Math.sin(t * 46) * 0.12 * ringing;

    // Back arm.
    pen.line([{ x: -R + 4, y: cy + 14 }, { x: -R - 12, y: cy + 34 }, { x: -R - 6, y: cy + 50 }], { width: lw * 1.6 });
    pen.blob(ellipsePts(-R - 6, cy + 52, 6, 6, 10), DIAL, { width: lw * 0.8 });

    tinyLegs(g, st, 0, cy + R - 2, 20, { shoe: '#B7A6D9' });

    // Hammer + bells.
    const hx = Math.sin(t * 46) * 13 * Math.min(1, ringing);
    pen.line([{ x: 0, y: cy - R + 2 }, { x: hx * 0.5, y: cy - R - 14 }], { width: lw * 1.4 });
    pen.blob(ellipsePts(hx, cy - R - 16, 5, 5, 10), BRASS_D, { width: lw * 0.8 });
    bell(g, -36, cy - 46, -0.72 + rattle, 25);
    bell(g, 36, cy - 46, 0.72 - rattle, 25);

    // Case, brass bezel, dial.
    pen.blob(ellipsePts(0, cy, R, R, 30), soft(ctx, 0, cy, R, CASE_L, CASE, CASE_D));
    pen.blob(ellipsePts(1, cy + 1, R * 0.84, R * 0.84, 28), soft(ctx, 0, cy, R * 0.84, BRASS_L, BRASS, BRASS_D), { width: lw * 0.8 });
    pen.blob(ellipsePts(1, cy + 1, R * 0.74, R * 0.74, 28), soft(ctx, -6, cy - 6, R * 0.74, '#FFFFFF', DIAL, '#E6DCC6'), { width: lw * 0.8 });
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const big = i % 3 === 0;
      const r0 = R * (big ? 0.6 : 0.65);
      ctx.globalAlpha = big ? 0.8 : 0.45;
      ctx.lineWidth = lw * (big ? 1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(1 + Math.cos(a) * r0, cy + 1 + Math.sin(a) * r0);
      ctx.lineTo(1 + Math.cos(a) * R * 0.7, cy + 1 + Math.sin(a) * R * 0.7);
      ctx.stroke();
    }
    ctx.restore();
    // Shine on the case.
    pen.line([{ x: -R * 0.8, y: cy - R * 0.25 }, { x: -R * 0.62, y: cy - R * 0.62 }, { x: -R * 0.3, y: cy - R * 0.84 }], {
      color: WHITE,
      width: lw * 1.4,
      alpha: 0.7,
    });

    // Eye bags first so the eyes sit on top.
    const ey = cy - 14;
    for (const ex of [-17, 19]) {
      pen.blob(
        [
          { x: ex - 12, y: ey + 9 },
          { x: ex, y: ey + 21 },
          { x: ex + 12, y: ey + 9 },
          { x: ex, y: ey + 14 },
        ],
        'rgba(150,126,178,0.55)',
        { stroke: false },
      );
      pen.line([{ x: ex - 11, y: ey + 13 }, { x: ex, y: ey + 21 }, { x: ex + 11, y: ey + 13 }], { color: '#8E7FA8', width: lw * 0.8 });
    }
    const sip = idle ? Math.max(0, Math.min(1, Math.sin(t * 1.2) * 1.8 - 0.5)) : 0;
    const lid = ouch ? 0 : idle ? 0.5 + sip * 0.3 : 0.48;
    googlyEye(g, st, 'mL', -17, ey, 13, { lid, lidColor: '#E9DFC9', lidTilt: ouch ? 0 : -0.06, pupil: 0.48 });
    googlyEye(g, st, 'mR', 19, ey, 13, { lid, lidColor: '#E9DFC9', lidTilt: ouch ? 0 : 0.06, pupil: 0.48 });

    // Clock hands = droopy 8:20 mustache.
    const hy = cy + 12;
    const droop = ouch ? -8 : 0;
    pen.line([{ x: 1, y: hy }, { x: -9, y: hy + 3 + droop * 0.5 }, { x: -20, y: hy + 9 + droop }], { width: lw * 2.2 });
    pen.line([{ x: 1, y: hy }, { x: 12, y: hy + 3 + droop * 0.5 }, { x: 24, y: hy + 8 + droop }], { width: lw * 2.2 });
    pen.blob(ellipsePts(1, hy, 3.6, 3.6, 8), BRASS_D, { width: lw * 0.7 });

    // Mouth: a "per my last email" smirk, or a yelp.
    if (ouch) {
      pen.blob(ellipsePts(3, hy + 22, 7, 8, 12), '#6B3A47', { width: lw });
    } else {
      pen.line([{ x: -9, y: hy + 21 }, { x: 4, y: hy + 22 }, { x: 13, y: hy + 17 }], { width: lw * 1.1 });
    }

    // Front arm holding the mug (idle = a long, tired sip).
    const mx = 70 + (30 - 70) * sip;
    const my = cy + 34 + (hy + 14 - (cy + 34)) * sip;
    const mang = 0.1 - sip * 0.7;
    const hx2 = mx + Math.cos(mang) * 17 + Math.sin(mang) * 2;
    const hy2 = my + Math.sin(mang) * 17 - Math.cos(mang) * 2;
    pen.line([{ x: R - 6, y: cy + 16 }, { x: R + 22, y: cy + 30 - sip * 16 }, { x: hx2 + 4, y: hy2 + 2 }], { width: lw * 1.6 });
    mug(g, mx, my, mang, t);
    pen.blob(ellipsePts(hx2 + 2, hy2, 6, 6, 10), DIAL, { width: lw * 0.8 });

    if (ringing > 0.9) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, ringing - 0.5);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + s * (0.55 + k * 0.28);
          const r0 = 74 + (k % 2) * 6;
          pen.line(
            [
              { x: Math.cos(a) * r0, y: cy - 30 + Math.sin(a) * r0 },
              { x: Math.cos(a) * (r0 + 12), y: cy - 30 + Math.sin(a) * (r0 + 12) },
            ],
            { width: lw },
          );
        }
      }
      fxText(ctx, 'BRRING', -58, cy - 92, 13, '#C0533F');
      ctx.restore();
    }
  },
};
