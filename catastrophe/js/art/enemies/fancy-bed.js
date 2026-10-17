// @ts-check
// Fancy Cat Bed ($89.99): a smug plum-velvet designer bed with gold piping,
// a monocle, and the price tag still swinging off its side. No cat has ever
// slept in it.
import { googlyEye, tinyLegs, ellipsePts, soft, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */

const H = 110;
const VEL = '#8C5FA8';
const VEL_L = '#C39BDB';
const VEL_D = '#5B3A76';
const SATIN = '#F3E3C8';
const GOLD = '#E2B04A';
const GOLD_L = '#F9E3A0';
const GOLD_D = '#A97B22';

/** Four-point twinkle. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
function twinkle(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFF6C8';
  ctx.fill();
  ctx.strokeStyle = GOLD_D;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Tufting button with little creases. @param {EGeo} g @param {number} x @param {number} y */
function tuft(g, x, y) {
  const { pen, lw } = g;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6;
    pen.line([{ x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 3 }, { x: x + Math.cos(a) * 11, y: y + Math.sin(a) * 7 }], { color: VEL_D, width: lw * 0.7 });
  }
  pen.blob(ellipsePts(x, y, 3.6, 3, 8), GOLD, { width: lw * 0.6 });
}

/** @type {EnemySpec} */
export const spec = {
  id: 'fancy-bed',
  height: H,
  width: 220,
  gait: 'waddle',
  deathText: 'Return policy: 30 days.',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    // Idle fidget: a smug self-fluffing puff.
    const puff = idle ? Math.max(0, Math.sin(t * 2.2)) ** 3 : 0;

    tinyLegs(g, st, 0, -14, 64, { shoe: GOLD });

    // Plush velvet donut with a gold-piped satin cushion.
    const by = -54 - puff * 3;
    pen.blob(
      ellipsePts(0, by, 108 + puff * 3, 52 + puff * 4, 36, (a) => 1 + (Math.sin(a) < 0 ? 0.05 * -Math.sin(a) : 0)),
      soft(ctx, -30, by - 20, 120, VEL_L, VEL, VEL_D),
    );
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.5 + i * ((Math.PI - 1) / 4);
      tuft(g, Math.cos(a) * 90, by - 4 + Math.sin(a) * 44);
    }
    const cy = -70;
    pen.blob(ellipsePts(0, cy, 78, 21, 28), soft(ctx, -10, cy - 4, 80, '#FFF8EA', SATIN, '#D8C3A0'), { width: lw * 0.9 });
    // Inner wall shadow at the back of the cushion.
    pen.line(
      [
        { x: -70, y: cy - 4 },
        { x: -36, y: cy - 16 },
        { x: 0, y: cy - 19 },
        { x: 36, y: cy - 16 },
        { x: 70, y: cy - 4 },
      ],
      { color: '#C8AE86', width: lw * 2.2, alpha: 0.6 },
    );
    // Embroidered crown on the unused cushion.
    pen.line(
      [
        { x: -12, y: cy + 4 },
        { x: -13, y: cy - 6 },
        { x: -6, y: cy },
        { x: 0, y: cy - 9 },
        { x: 6, y: cy },
        { x: 13, y: cy - 6 },
        { x: 12, y: cy + 4 },
        { x: -12, y: cy + 4 },
      ],
      { color: GOLD_D, width: lw * 0.9, amp: 0 },
    );
    // Gold piping around the cushion edge.
    /** @type {{x:number,y:number}[]} */
    const ring = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ring.push({ x: Math.cos(a) * 79, y: cy + Math.sin(a) * 22 });
    }
    pen.tube(ring, lw * 1.3, GOLD);

    // Front rim.
    const fy = -26;
    // Velvet sheen.
    pen.line([{ x: -92, y: fy - 4 }, { x: -76, y: fy - 16 }], { color: WHITE, width: lw * 1.3, alpha: 0.55 });
    // A gold tassel on the far end (the price tag hangs off the near end).
    for (const s of [-1]) {
      const tx = s * 104;
      const tsw = Math.sin(t * 3 + s) * 0.15 + Math.sin(st.walk) * 0.2 * st.moving;
      ctx.save();
      ctx.translate(tx, fy - 18);
      ctx.rotate(tsw);
      pen.blob(ellipsePts(0, 4, 4, 4, 8), GOLD, { width: lw * 0.7 });
      pen.blob(
        [
          { x: -3, y: 7 },
          { x: 3, y: 7 },
          { x: 7, y: 22 },
          { x: -7, y: 22 },
        ],
        GOLD,
        { width: lw * 0.7 },
      );
      for (const lx of [-3, 0, 3]) pen.line([{ x: lx, y: 11 }, { x: lx * 1.6, y: 21 }], { color: GOLD_D, width: lw * 0.5 });
      ctx.restore();
    }

    // Face: smug, one brow raised, monocle on the right eye.
    const ey = fy - 2;
    const lid = ouch ? 0 : idle ? 0.5 + puff * 0.3 : 0.52;
    const bu = ouch ? 5 : 0;
    pen.line([{ x: -34, y: ey - 17 - bu }, { x: -11, y: ey - 16 - bu }], { width: lw * 1.7 });
    pen.line([{ x: 12, y: ey - 22 - bu }, { x: 24, y: ey - 27 - bu }, { x: 37, y: ey - 22 - bu }], { width: lw * 1.7 });
    googlyEye(g, st, 'bL', -22, ey, 12, { lid, lidTilt: ouch ? 0 : 0.1, lidColor: VEL_L, pupil: 0.5 });
    googlyEye(g, st, 'bR', 24, ey, 13, { lid: ouch ? 0 : lid * 0.6, lidColor: VEL_L, pupil: 0.5 });
    // Monocle (pops off when bonked).
    const pop = ouch ? st.hit : 0;
    const mx = 24 + pop * 16;
    const my = ey - pop * 26;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(pop * 2.4);
    ctx.fillStyle = 'rgba(220,240,255,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    pen.blob(ellipsePts(0, 0, 16, 16, 18), null, { width: lw * 2.6, ink: INK });
    pen.blob(ellipsePts(0, 0, 16, 16, 18), null, { width: lw * 1.2, ink: GOLD });
    ctx.restore();
    pen.line(
      [
        { x: mx + 14, y: my + 8 },
        { x: mx + 26, y: my + 20 + Math.sin(t * 2) * 2 },
        { x: 52, y: fy + 4 },
      ],
      { color: GOLD_D, width: lw * 0.9 },
    );
    // Mouth: a "premium memory foam" smirk.
    if (ouch) {
      pen.blob(ellipsePts(0, fy + 13, 6, 6.5, 12), '#6B3A47', { width: lw });
    } else {
      pen.line([{ x: -12, y: fy + 12 }, { x: 2, y: fy + 14 }, { x: 14, y: fy + 9 }], { width: lw * 1.1 });
      pen.line([{ x: 13, y: fy + 6 }, { x: 16, y: fy + 11 }], { width: lw * 0.9 });
    }

    // Price tag on a string, swinging off the right side.
    const sw = Math.sin(t * 2.6) * 0.22 + Math.sin(st.walk) * 0.35 * st.moving + st.hit * Math.sin(t * 28) * 0.5;
    const px = 100;
    const py = fy - 10;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(sw);
    pen.line([{ x: 0, y: 0 }, { x: 4, y: 8 }, { x: 8, y: 16 }], { width: lw * 0.8 });
    ctx.translate(8, 16);
    ctx.rotate(0.2);
    pen.blob(
      [
        { x: 0, y: 0 },
        { x: 9, y: -6 },
        { x: 9, y: -6 },
        { x: 46, y: -6 },
        { x: 46, y: -6 },
        { x: 46, y: 14 },
        { x: 46, y: 14 },
        { x: 9, y: 14 },
        { x: 9, y: 14 },
      ],
      '#FFFDF6',
      { width: lw * 0.8 },
    );
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(5, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.font = '700 11px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$89.99', 28, 4.5);
    ctx.restore();

    if (idle && puff > 0.2) {
      ctx.save();
      ctx.globalAlpha *= puff;
      twinkle(ctx, -70, by - 40, 8 * puff);
      twinkle(ctx, 66, by - 34, 6 * puff);
      twinkle(ctx, -6, by - 52, 5 * puff);
      ctx.restore();
    }
  },
};
