// @ts-check
// Thunderclap: a grumpy storm cloud with a zigzag scowl. It drizzles
// constantly and, every few seconds, a lightning bolt flickers out. BOOM.
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */

const H = 150;
const C_L = '#C3C6DE';
const C = '#8E93B4';
const C_D = '#5D6285';
const RAIN = '#6F9AAE';
const BOLT = '#FFE58A';

/** Hash in [0,1). @param {number} n */
function h1(n) {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} k @param {number} lw */
function bolt(ctx, x, y, k, lw) {
  const pts = [
    [-6, 0], [14, 0], [5, 22], [18, 22], [-8, 64], [0, 32], [-13, 32],
  ];
  const glow = ctx.createRadialGradient(x, y + 30, 2, x, y + 30, 50 * k);
  glow.addColorStop(0, 'rgba(255,229,138,0.55)');
  glow.addColorStop(1, 'rgba(255,229,138,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + 30, 50 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * k, y + py * k) : ctx.moveTo(x + px * k, y + py * k)));
  ctx.closePath();
  ctx.fillStyle = BOLT;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'thunderclap',
  height: H,
  width: 220,
  gait: 'float',
  deathText: 'boom…?',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const cy = -80;
    // Idle fidget: puffs itself up and grumbles.
    const puff = idle ? Math.max(0, Math.sin(t * 1.7)) ** 2 : 0;
    const ph = t % 3.4;
    const flash = (ph < 0.42 && Math.sin(t * 64) > -0.3) || st.hit > 0.55;

    // Rain streaks.
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const x = -72 + i * 14 + (h1(i) - 0.5) * 8;
      const span = 70 + h1(i + 9) * 20;
      const y0 = cy + 36 + ((t * (150 + h1(i + 3) * 60) + h1(i + 5) * 200) % span);
      const a = 1 - (y0 - cy - 36) / span;
      ctx.globalAlpha = Math.max(0, a) * (idle ? 1 : 0.85);
      ctx.strokeStyle = RAIN;
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x - 3, y0 + 11);
      ctx.stroke();
    }
    ctx.restore();

    if (flash) bolt(ctx, 34, cy + 34, 1 + (st.hit > 0.55 ? 0.15 : 0), lw);

    // The cloud.
    const rx = 104 * (1 + puff * 0.06);
    const ry = 48 * (1 + puff * 0.1);
    const shape = (/** @type {number} */ a) => {
      const s = Math.sin(a);
      return s < 0 ? 1 + 0.17 * Math.abs(Math.sin(a * 3.5 + 0.5)) : 0.9 + 0.07 * Math.abs(Math.sin(a * 5 + 0.3));
    };
    const pts = ellipsePts(0, cy, rx, ry, 64, shape);
    pen.blob(pts, soft(ctx, -30, cy - 26, 120, C_L, C, C_D));
    if (flash) pen.blob(pts, 'rgba(255,248,210,0.35)', { stroke: false });
    // Puff definition + a darker belly.
    pen.line([{ x: -78, y: cy - 22 }, { x: -64, y: cy - 38 }, { x: -44, y: cy - 44 }], { color: WHITE, width: lw * 1.4, alpha: 0.6 });
    pen.line([{ x: -20, y: cy - 50 }, { x: 0, y: cy - 60 }, { x: 22, y: cy - 56 }], { color: WHITE, width: lw * 1.2, alpha: 0.45 });
    pen.line([{ x: -80, y: cy + 30 }, { x: -20, y: cy + 40 }, { x: 40, y: cy + 39 }, { x: 84, y: cy + 28 }], { color: C_D, width: lw * 2, alpha: 0.35 });

    // Grumpy face.
    const ey = cy - 4;
    const bu = ouch ? -10 : 0;
    pen.line([{ x: -46, y: ey - 26 + bu }, { x: -12, y: ey - 14 + bu * 0.5 }], { width: lw * 3 });
    pen.line([{ x: 10, y: ey - 14 + bu * 0.5 }, { x: 44, y: ey - 26 + bu }], { width: lw * 3 });
    const lid = ouch ? 0 : 0.38 + puff * 0.15;
    googlyEye(g, st, 'tL', -27, ey, 15, { lid, lidTilt: ouch ? 0 : 0.18, lidColor: C, pupil: 0.48 });
    googlyEye(g, st, 'tR', 25, ey, 15, { lid, lidTilt: ouch ? 0 : -0.18, lidColor: C, pupil: 0.48 });

    const my = cy + 24;
    if (ouch) {
      pen.blob(ellipsePts(0, my + 2, 8, 9, 12), '#4E3A4F', { width: lw });
    } else {
      // Sharp zigzag scowl, rattling while it grumbles.
      const jit = idle ? Math.sin(t * 40) * 1.2 * puff : 0;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = -24 + i * 8;
        const y = my + (i % 2 ? -4 : 4) + (i % 2 ? jit : -jit);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 1.3;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Grumble squiggles.
    if (puff > 0.2) {
      ctx.save();
      ctx.globalAlpha *= puff;
      for (const sd of [-1, 1]) {
        const x0 = sd * (rx + 10);
        pen.line(
          [
            { x: x0, y: cy - 10 },
            { x: x0 + sd * 6, y: cy - 4 },
            { x: x0, y: cy + 2 },
            { x: x0 + sd * 6, y: cy + 8 },
          ],
          { width: lw },
        );
      }
      fxText(ctx, 'grrumble', 0, cy - 78, 11, INK, puff);
      ctx.restore();
    }
    if (flash && !ouch) fxText(ctx, 'BOOM', -66, cy - 62, 14, '#C0533F', ph < 0.42 ? 1 - ph / 0.42 : 0);
  },
};
