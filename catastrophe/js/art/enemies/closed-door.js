// @ts-check
// The Closed Door: a smug walking door with a brass-knob nose, a mail-slot
// mouth and a DO NOT DISTURB hanger dangling off its nose. Something peeks
// out through the slot when it idles.
import { googlyEye, tinyLegs, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */

const H = 220;
const WOOD = '#A0764F';
const WOOD_L = '#CFA273';
const WOOD_D = '#76533A';
const BRASS = '#E2B04A';
const BRASS_L = '#F9E3A0';
const BRASS_D = '#A97B22';
const SLOT = '#2E2A38';

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

/** @param {EGeo} g @param {number} x @param {number} y @param {number} w @param {number} h */
function panel(g, x, y, w, h) {
  const { ctx, pen, lw } = g;
  pen.blob(rr(x, y, w, h, 5), soft(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.7, '#B88A5E', '#97704B', '#86603F'), { width: lw * 0.8 });
  pen.line([{ x: x + 3, y: y + h - 3 }, { x: x + w - 3, y: y + h - 3 }, { x: x + w - 3, y: y + 3 }], { color: WOOD_L, width: lw * 0.8, alpha: 0.8 });
}

/** @type {EnemySpec} */
export const spec = {
  id: 'closed-door',
  height: H,
  width: 110,
  gait: 'waddle',
  deathText: '*creak* …it was a closet.',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const L = -46;
    const R = 46;
    const top = -214;
    const bot = -30;

    tinyLegs(g, st, 0, bot + 2, 22, { shoe: '#5E4A3A' });

    // Slab with wood grain.
    pen.blob(rr(L, top, R - L, bot - top, 10), soft(ctx, -10, -140, 130, WOOD_L, WOOD, WOOD_D));
    ctx.save();
    ctx.globalAlpha *= 0.35;
    for (let k = 0; k < 5; k++) {
      const x = L + 10 + k * 18;
      pen.line(
        [
          { x, y: top + 14 },
          { x: x + 3, y: top + 70 },
          { x: x - 2, y: top + 130 },
          { x: x + 2, y: bot - 10 },
        ],
        { color: WOOD_D, width: lw * 0.6 },
      );
    }
    ctx.restore();

    // Hinges on the hinge side, kick plate at the bottom.
    for (const hy of [top + 22, bot - 34]) pen.blob(rr(L - 5, hy, 9, 20, 2), '#8C8496', { width: lw * 0.8 });
    pen.blob(rr(L + 4, bot - 18, R - L - 8, 12, 3), soft(ctx, 0, bot - 12, 40, BRASS_L, BRASS, BRASS_D), { width: lw * 0.8 });

    // Upper panels and a peephole.
    panel(g, L + 9, top + 10, 30, 26);
    panel(g, 7, top + 10, 30, 26);
    pen.blob(ellipsePts(6, top + 46, 4, 4, 10), BRASS_D, { width: lw * 0.7 });

    // Face: smug brows, shifty half-lidded eyes.
    const ey = -164;
    const brow = ouch ? -8 : 0;
    pen.line([{ x: -24, y: ey - 18 + brow }, { x: -6, y: ey - 15 + brow }], { width: lw * 2.4, color: WOOD_D });
    pen.line([{ x: 14, y: ey - 14 + brow }, { x: 34, y: ey - 20 + brow }], { width: lw * 2.4, color: WOOD_D });
    const lid = ouch ? 0 : idle ? 0.25 + 0.2 * Math.max(0, Math.sin(t * 0.9)) : 0.42;
    googlyEye(g, st, 'dL', -14, ey, 13, { lid, lidTilt: ouch ? 0 : 0.1, lidColor: WOOD_L, pupil: 0.45 });
    googlyEye(g, st, 'dR', 24, ey, 13, { lid, lidTilt: ouch ? 0 : -0.04, lidColor: WOOD_L, pupil: 0.45 });

    // Mail-slot mouth (opens to yelp; in idle, something peeks out).
    const peek = idle ? Math.max(0, Math.min(1, Math.sin(t * 0.8 - 1) * 2.2 - 1)) : 0;
    const open = Math.max(ouch ? st.hit : 0, peek * 0.8, Math.max(0, Math.sin(t * 9)) * 0.12 * st.moving);
    const sy = -60;
    ctx.save();
    ctx.translate(4, sy);
    ctx.rotate(-0.07);
    pen.blob(rr(-28, -11, 56, 22, 6), soft(ctx, -6, -4, 30, BRASS_L, BRASS, BRASS_D), { width: lw * 0.9 });
    const oh = 3 + open * 9;
    pen.blob(rr(-21, -oh / 2, 42, oh, Math.min(3, oh / 2)), SLOT, { width: lw * 0.8 });
    if (peek > 0.3) {
      ctx.fillStyle = '#F4E98A';
      for (const px of [-7, 6]) {
        ctx.beginPath();
        ctx.ellipse(px + Math.sin(t * 2) * 3, 0, 2.6, 1.6 * peek, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The brass flap swings up when the slot opens.
    pen.blob(rr(-21, -oh / 2 - 4 - open * 3, 42, 4, 2), BRASS_D, { width: lw * 0.6 });
    ctx.restore();

    // Knob nose with a backplate.
    const nx = 8;
    const ny = -132;
    pen.blob(rr(nx - 8, ny - 14, 16, 28, 6), soft(ctx, nx, ny, 14, BRASS_L, BRASS, BRASS_D), { width: lw * 0.8 });
    pen.blob(ellipsePts(nx + 2, ny, 11, 11, 16), soft(ctx, nx - 1, ny - 2, 11, '#FFF3C4', BRASS, BRASS_D));
    pen.blob(ellipsePts(nx - 2, ny - 4, 3, 2.4, 8), WHITE, { stroke: false });

    // DO NOT DISTURB hanger, hooked over the nose, swinging.
    const sw = Math.sin(t * 2.4) * 0.12 + Math.sin(st.walk) * 0.25 * st.moving + st.hit * Math.sin(t * 30) * 0.4;
    ctx.save();
    ctx.translate(nx + 2, ny + 4);
    ctx.rotate(sw);
    pen.blob(
      [
        { x: -9, y: -2 },
        { x: -6, y: -14 },
        { x: 6, y: -14 },
        { x: 9, y: -2 },
        { x: 5, y: 14 },
        { x: 19, y: 16 },
        { x: 19, y: 50 },
        { x: -19, y: 50 },
        { x: -19, y: 16 },
        { x: -5, y: 14 },
      ],
      '#D9573B',
      { width: lw * 0.9 },
    );
    pen.blob(ellipsePts(0, -4, 6, 6, 12), WOOD, { width: lw * 0.7 });
    ctx.fillStyle = '#FFF6E6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 9px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText('DO NOT', 0, 26);
    ctx.font = '700 8px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText('DISTURB', 0, 37);
    ctx.fillStyle = '#FFF6E6';
    ctx.beginPath();
    ctx.arc(0, 45, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (peek > 0.6 || ouch) {
      fxText(ctx, ouch ? '*CREAK*' : '*creak*', -52, -112, 12, INK, ouch ? st.hit : peek);
    }
  },
};
