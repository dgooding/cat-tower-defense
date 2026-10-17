// @ts-check
// Garden Hose Snek: a coiled green garden hose with a brass nozzle head,
// shifty googly eyes, a constant drip, and a forked water tongue. The body
// rolls a sine wave along its length as it slithers.
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
import { WATER } from '../palette.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number,y:number}} Pt */

const H = 90;
const HOSE = '#5FA84E';
const HOSE_L = '#A6DB7C';
const HOSE_D = '#3E7A35';
const BRASS = '#E2B04A';
const BRASS_L = '#F9E3A0';
const BRASS_D = '#A97B22';
const TW = 15;

/** Hose tube with a highlight stripe. @param {EGeo} g @param {Pt[]} pts @param {number} [w] */
function hose(g, pts, w = TW) {
  const { pen, lw } = g;
  pen.tube(pts, w, HOSE);
  pen.line(
    pts.map((p) => ({ x: p.x, y: p.y - w * 0.22 })),
    { color: HOSE_L, width: lw * 1.1, alpha: 0.9 },
  );
}

/** Open ellipse arc as points. @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} a0 @param {number} a1 @param {number} n */
function arc(cx, cy, rx, ry, a0, a1, n) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} lw */
function drop(ctx, x, y, r, lw) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r);
  ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.8);
  ctx.fillStyle = WATER;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'hose-snek',
  height: H,
  width: 300,
  gait: 'slither',
  deathText: 'sssplutter',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const w = st.walk;
    const m = Math.max(0.25, st.moving);

    // Coiled tail pile (back rings first).
    const cx = -104;
    for (let k = 0; k < 3; k++) {
      const ry = -12 - k * 15;
      const ox = Math.sin(w * 0.8 + k * 1.3) * 3 * m;
      const rx = 40 - k * 5;
      hose(g, arc(cx + ox, ry, rx, 10, Math.PI, Math.PI * 2, 12));
    }
    // Tail-end coupling poking out of the top of the coil.
    pen.blob(ellipsePts(cx - 30, -58, 7, 9, 12), soft(ctx, cx - 30, -58, 9, BRASS_L, BRASS, BRASS_D), { width: lw * 0.8 });
    for (let k = 0; k < 3; k++) {
      const ry = -12 - k * 15;
      const ox = Math.sin(w * 0.8 + k * 1.3) * 3 * m;
      const rx = 40 - k * 5;
      hose(g, arc(cx + ox, ry, rx, 10, 0, Math.PI, 12));
    }

    // Body: a travelling sine wave from the coil to the neck.
    const headLift = idle ? 8 + Math.sin(t * 1.4) * 6 : 0;
    const sway = idle ? Math.sin(t * 1.4) * 5 : Math.sin(w * 0.5) * 3 * m;
    /** @type {Pt[]} */
    const body = [];
    const x0 = cx + 36;
    const x1 = 70;
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = x0 + (x1 - x0) * u;
      const amp = 6 * Math.sin(u * Math.PI) * m;
      body.push({ x, y: -11 - Math.max(0, Math.sin(u * 10 - w * 1.4)) * amp * 1.4 });
    }
    const hx = 104 + sway;
    const hy = -50 - headLift;
    body.push({ x: 86, y: -16 }, { x: 96, y: -30 - headLift * 0.5 }, { x: hx - 6, y: hy + 6 });
    hose(g, body);

    // Head: coupling collar + brass nozzle, tilted a touch.
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(1.3, 1.3);
    ctx.rotate(-0.08 + (idle ? Math.sin(t * 1.4 + 1) * 0.08 : Math.sin(w) * 0.04 * m) - st.hit * 0.25);
    pen.blob(
      [
        { x: -12, y: -17 },
        { x: 4, y: -17 },
        { x: 4, y: 17 },
        { x: -12, y: 17 },
      ],
      soft(ctx, -4, -6, 18, BRASS_L, BRASS, BRASS_D),
    );
    for (const gx of [-7, -1]) pen.line([{ x: gx, y: -15 }, { x: gx, y: 15 }], { color: BRASS_D, width: lw * 0.8 });
    pen.blob(
      [
        { x: 2, y: -15 },
        { x: 2, y: -15 },
        { x: 44, y: -8 },
        { x: 44, y: -8 },
        { x: 44, y: 8 },
        { x: 44, y: 8 },
        { x: 2, y: 15 },
        { x: 2, y: 15 },
      ],
      soft(ctx, 14, -6, 34, BRASS_L, BRASS, BRASS_D),
    );
    for (const gx of [30, 36]) pen.line([{ x: gx, y: -9 }, { x: gx, y: 9 }], { color: BRASS_D, width: lw * 0.8 });
    pen.blob(ellipsePts(45, 0, 3.5, 8, 12), '#5A4A30', { width: lw * 0.8 });
    pen.line([{ x: 6, y: -9 }, { x: 26, y: -7 }], { color: WHITE, width: lw * 1.3, alpha: 0.8 });

    // Mouth: sly smirk along the nozzle.
    if (ouch) pen.blob(ellipsePts(20, 6, 5, 4.5, 12), '#6B3A47', { width: lw * 0.9 });
    else pen.line([{ x: 10, y: 5 }, { x: 20, y: 8 }, { x: 28, y: 4 }], { width: lw * 1.1 });

    // Eyes perched on top, half-lidded and shifty.
    const lid = ouch ? 0 : idle ? 0.45 : 0.4;
    googlyEye(g, st, 'hL', -2, -22, 10, { lid, lidTilt: ouch ? 0 : 0.12, lidColor: HOSE_L, pupil: 0.5 });
    googlyEye(g, st, 'hR', 17, -20, 11, { lid, lidTilt: ouch ? 0 : -0.06, lidColor: HOSE_L, pupil: 0.5 });

    // Forked water tongue, flicking.
    const flick = ouch ? 0 : Math.max(0, Math.sin(t * (idle ? 3.2 : 2.1)) * 3 - 2);
    if (flick > 0.02) {
      const L = 22 * flick;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? WATER : INK;
        ctx.lineWidth = pass ? lw * 0.9 : lw * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(47, 0);
        ctx.lineTo(47 + L, 0);
        ctx.lineTo(47 + L + 7 * flick, -5 * flick);
        ctx.moveTo(47 + L, 0);
        ctx.lineTo(47 + L + 7 * flick, 5 * flick);
        ctx.stroke();
      }
    }
    // Bonked: sputtering spray.
    if (st.hit > 0.05) {
      for (let i = 0; i < 6; i++) {
        const a = -0.7 + i * 0.28;
        const d = 10 + (1 - st.hit) * 40 + (i % 2) * 6;
        drop(ctx, 48 + Math.cos(a) * d, Math.sin(a) * d, 3, lw);
      }
    }
    ctx.restore();

    // The drip: forms at the nozzle tip, falls, splats.
    const dp = (t % 1.7) / 1.7;
    const tipX = hx + 58;
    const tipY = hy + 5;
    if (dp < 0.55) drop(ctx, tipX, tipY + 4, 1.5 + dp * 4, lw);
    else {
      const f = (dp - 0.55) / 0.45;
      const yy = tipY + 4 + f * f * (-tipY - 4);
      if (f < 0.92) drop(ctx, tipX, yy, 3.4, lw);
      else pen.line([{ x: tipX - 6, y: -2 }, { x: tipX - 2, y: -5 }], { color: WATER, width: lw });
    }
    if (idle && Math.sin(t * 3.2) > 0.8) fxText(ctx, 'sss', hx + 30, hy - 34, 11, INK, (Math.sin(t * 3.2) - 0.8) * 5);
  },
};
