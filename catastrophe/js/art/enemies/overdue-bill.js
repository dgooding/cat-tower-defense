// @ts-check
// Overdue Bill: a hopping red envelope with a FINAL NOTICE stamp, beady
// eyes under its flap "brows", a wax-seal nose, a postage-stamp mustache and
// a tiny briefcase. Bonk it and the flap pops open in shock.
import { googlyEye, tinyLegs, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */

const H = 120;
const RED = '#D2483C';
const RED_L = '#F07D68';
const RED_D = '#9E2F27';
const STAMP = '#FFF3DA';
const CASE = '#8A5A3B';

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

/** Postage-stamp mustache half: a perforated oval. @param {EGeo} g @param {number} x @param {number} y @param {number} ang */
function stampStache(g, x, y, ang) {
  const { ctx, pen, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  pen.blob(ellipsePts(0, 0, 15, 8, 30, (a, i) => (i % 2 ? 1 : 0.86)), STAMP, { width: lw * 0.8, amp: 0 });
  ctx.strokeStyle = '#6D7FB8';
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9.5, 4.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** @param {EGeo} g @param {number} x @param {number} y @param {number} ang */
function briefcase(g, x, y, ang) {
  const { ctx, pen, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  pen.line([{ x: -6, y: 4 }, { x: -6, y: -1 }, { x: 6, y: -1 }, { x: 6, y: 4 }], { width: lw * 1.4 });
  pen.blob(rr(-17, 4, 34, 24, 4), soft(ctx, -4, 12, 22, '#B07A52', CASE, '#5E3B24'), { width: lw * 0.9 });
  pen.line([{ x: -17, y: 12 }, { x: 17, y: 12 }], { color: '#5E3B24', width: lw * 0.8 });
  pen.blob(rr(-3, 9, 6, 6, 1), '#F2C14E', { width: lw * 0.6 });
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'overdue-bill',
  height: H,
  width: 130,
  gait: 'hop',
  deathText: 'PAID IN FULL',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const L = -58;
    const R = 58;
    const top = -118;
    const bot = -32;

    // Legs and the briefcase arm (back layer).
    tinyLegs(g, st, 0, bot + 2, 18, { shoe: '#4A4458' });
    const swing = Math.sin(st.walk) * 0.25 * st.moving;
    const bx = R + 14;
    const by = bot - 6 + Math.sin(st.walk * 2) * 2 * st.moving;
    pen.line([{ x: R - 4, y: bot - 26 }, { x: R + 8, y: bot - 14 }, { x: bx, y: by }], { width: lw * 1.6 });
    briefcase(g, bx, by, swing);
    pen.blob(ellipsePts(bx, by, 4.5, 4.5, 8), '#FFFDF6', { width: lw * 0.7 });

    // The envelope.
    pen.blob(rr(L, top, R - L, bot - top, 7), soft(ctx, -24, top + 24, 100, RED_L, RED, RED_D));
    // Lower flap seams.
    pen.line([{ x: L + 3, y: bot - 3 }, { x: -10, y: -64 }], { color: RED_D, width: lw * 0.9, alpha: 0.7 });
    pen.line([{ x: R - 3, y: bot - 3 }, { x: 10, y: -64 }], { color: RED_D, width: lw * 0.9, alpha: 0.7 });

    // FINAL NOTICE rubber stamp, slapped on crooked.
    ctx.save();
    ctx.translate(-2, bot - 15);
    ctx.rotate(-0.12);
    ctx.globalAlpha *= 0.95;
    ctx.strokeStyle = STAMP;
    ctx.lineWidth = lw * 1.1;
    ctx.strokeRect(-40, -9, 80, 18);
    ctx.lineWidth = lw * 0.5;
    ctx.strokeRect(-37, -6.5, 74, 13);
    ctx.fillStyle = STAMP;
    ctx.font = '800 10.5px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINAL NOTICE', 0, 0.5);
    ctx.restore();

    // Top flap: angry brows normally, flung open in shock.
    const pop = ouch ? Math.min(1, st.hit * 1.6) : 0;
    const tipY = -78 + pop * (top - 44 - -78);
    pen.blob(
      [
        { x: L + 1, y: top + 2 },
        { x: L + 1, y: top + 2 },
        { x: 0, y: tipY },
        { x: 0, y: tipY },
        { x: R - 1, y: top + 2 },
        { x: R - 1, y: top + 2 },
      ],
      soft(ctx, -10, top + 10, 70, '#E86A57', '#C23F34', RED_D),
      { width: lw * 1.5 },
    );

    // Beady eyes peering from under the flap.
    const ey = -84;
    const lid = ouch ? 0 : idle ? 0.45 : 0.3;
    googlyEye(g, st, 'oL', -21, ey, 8.5, { lid, lidTilt: ouch ? 0 : 0.15, lidColor: '#E86A57', pupil: 0.62 });
    googlyEye(g, st, 'oR', 21, ey, 8.5, { lid, lidTilt: ouch ? 0 : -0.15, lidColor: '#E86A57', pupil: 0.62 });

    // Wax-seal nose.
    pen.blob(ellipsePts(0, -73, 7.5, 7, 14, (a, i) => (i % 3 ? 1 : 0.88)), soft(ctx, -2, -75, 8, '#B04A6A', '#8A2F4A', '#5E1E33'), { width: lw * 0.8 });
    ctx.fillStyle = '#F2C14E';
    ctx.font = '700 8px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, -72.5);

    // Postage-stamp mustache, and a stern little mouth.
    const flick = ouch ? -0.5 : Math.sin(t * 3) * 0.05;
    stampStache(g, -12, -62, 0.22 + flick);
    stampStache(g, 12, -62, -0.22 - flick);
    if (ouch) pen.blob(ellipsePts(0, -50, 4.5, 5, 10), '#6B3A47', { width: lw * 0.8 });
    else pen.line([{ x: -7, y: -50 }, { x: 0, y: -51.5 }, { x: 7, y: -50 }], { width: lw * 1.1 });

    // Free arm: swings while hopping; in idle it wags a "tsk tsk" finger.
    if (idle) {
      const wag = Math.sin(t * 9) * 0.35;
      const hx = L - 16 + Math.sin(wag) * 6;
      const hy = top + 6;
      pen.line([{ x: L + 4, y: -70 }, { x: L - 12, y: -82 }, { x: hx, y: hy + 8 }], { width: lw * 1.6 });
      pen.blob(ellipsePts(hx, hy + 8, 5, 5, 10), '#FFFDF6', { width: lw * 0.7 });
      pen.line([{ x: hx, y: hy + 4 }, { x: hx + Math.sin(wag) * 6, y: hy - 6 }], { width: lw * 2.6 });
      pen.line([{ x: hx, y: hy + 4 }, { x: hx + Math.sin(wag) * 6, y: hy - 6 }], { width: lw * 1.2, color: '#FFFDF6' });
      if (Math.sin(t * 1.3) > 0) fxText(ctx, 'tsk tsk', L - 4, top - 14, 11, INK, Math.min(1, Math.sin(t * 1.3) * 3));
    } else {
      const a = -Math.sin(st.walk) * 0.5 * st.moving;
      const hx = L - 12 + Math.sin(a) * 8;
      const hy = bot - 12 + Math.cos(a) * 4;
      pen.line([{ x: L + 4, y: bot - 26 }, { x: L - 8, y: bot - 20 }, { x: hx, y: hy }], { width: lw * 1.6 });
      pen.blob(ellipsePts(hx, hy, 5, 5, 10), '#FFFDF6', { width: lw * 0.7 });
    }

    // Paper shine.
    pen.line([{ x: L + 6, y: top + 30 }, { x: L + 6, y: top + 12 }], { color: WHITE, width: lw * 1.4, alpha: 0.5 });
  },
};
