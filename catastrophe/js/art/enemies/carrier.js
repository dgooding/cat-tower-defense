// @ts-check
// The Carrier: a plastic pet carrier on tiny legs. Behind the wire grille,
// two glowing eyes. A vet-clinic sticker says everything. (Ominous cello.)
import { tinyLegs, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */

const H = 150;
const TOP = '#ECE5D4';
const TOP_L = '#FFFFFF';
const TOP_D = '#C4B9A0';
const BOT = '#7B7F95';
const BOT_L = '#A9AEC4';
const BOT_D = '#555970';
const DARK = '#2A2633';
const WIRE = '#C9D3E8';
const GLOW = '#E9F27A';

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

/** A spooky little music note. @param {EGeo} g @param {number} x @param {number} y @param {number} a */
function note(g, x, y, a) {
  const { ctx, lw } = g;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, 4.5, 3.4, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 1);
  ctx.lineTo(x + 4, y - 17);
  ctx.quadraticCurveTo(x + 9, y - 12, x + 11, y - 9);
  ctx.stroke();
  ctx.restore();
}

/** Glowing almond eye behind the bars. @param {EGeo} g @param {EnemyState} st @param {number} x @param {number} y @param {number} s side */
function glowEye(g, st, x, y, s) {
  const { ctx } = g;
  const ouch = st.hit > 0.3;
  const open = 1 - st.blink * 0.9;
  const rx = ouch ? 9 : 11;
  const ry = (ouch ? 9 : 6) * open;
  const gl = ctx.createRadialGradient(x, y, 1, x, y, 24);
  gl.addColorStop(0, 'rgba(233,242,122,0.75)');
  gl.addColorStop(1, 'rgba(233,242,122,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (!ouch) ctx.rotate(s * 0.28);
  ctx.fillStyle = GLOW;
  ctx.beginPath();
  if (ouch) ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  else {
    ctx.moveTo(-rx, 0);
    ctx.quadraticCurveTo(0, -ry * 2, rx, 0);
    ctx.quadraticCurveTo(0, ry * 1.4, -rx, 0);
  }
  ctx.fill();
  if (open > 0.3) {
    ctx.fillStyle = DARK;
    const px = st.lookX * 3;
    ctx.beginPath();
    if (ouch) ctx.arc(px, 0, 2, 0, Math.PI * 2);
    else ctx.ellipse(px, -1, 1.6, ry * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'carrier',
  height: H,
  width: 200,
  gait: 'waddle',
  deathText: '…the vet is cancelled!',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const rattle = (ouch ? Math.sin(t * 50) * 2.5 * st.hit : 0) + (idle ? Math.sin(t * 30) * 0.8 * Math.max(0, Math.sin(t * 1.7)) : 0);

    // Four tiny legs, back pair out of step with the front pair.
    const back = { ...st, walk: st.walk + Math.PI / 2 };
    tinyLegs(g, back, -54, -26, 16, { shoe: '#6E6A7E' });
    tinyLegs(g, st, 50, -26, 16, { shoe: '#6E6A7E' });

    // Handle.
    pen.tube(
      [
        { x: -46, y: -122 },
        { x: -40, y: -146 },
        { x: 6, y: -148 },
        { x: 14, y: -122 },
      ],
      9,
      BOT,
    );

    // Bottom shell, top shell, seam lip with bolts.
    pen.blob(rr(-96, -82, 192, 58, 14), soft(ctx, -30, -60, 120, BOT_L, BOT, BOT_D));
    pen.blob(rr(-92, -130, 184, 54, 28), soft(ctx, -40, -116, 120, TOP_L, TOP, TOP_D));
    pen.blob(rr(-100, -84, 200, 10, 4), soft(ctx, -30, -80, 100, BOT_L, BOT, BOT_D), { width: lw * 0.9 });
    for (let i = 0; i < 5; i++) {
      pen.blob(ellipsePts(-82 + i * 26, -79, 2.6, 2.6, 8), BOT_D, { width: lw * 0.5 });
    }
    // Shine on the lid.
    pen.line([{ x: -78, y: -112 }, { x: -60, y: -122 }, { x: -30, y: -125 }], { color: WHITE, width: lw * 1.6, alpha: 0.85 });

    // Side vents, frowning slightly.
    for (let i = 0; i < 4; i++) {
      const vx = -74 + i * 16;
      pen.blob(rr(vx, -114 + Math.abs(i - 1.5) * 2, 8, 20, 4), '#4A4458', { width: lw * 0.7 });
    }

    // Vet clinic sticker, one corner peeling.
    ctx.save();
    ctx.translate(-48, -52);
    ctx.rotate(-0.12);
    pen.blob(rr(-28, -13, 56, 26, 6), '#FFFDF6', { width: lw * 0.8 });
    ctx.fillStyle = '#D2483C';
    ctx.fillRect(-23, -4, 14, 5);
    ctx.fillRect(-18.5, -8.5, 5, 14);
    ctx.font = '700 11px Fredoka, "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2E3A60';
    ctx.fillText('VET', 9, -2);
    ctx.font = '700 5.5px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText('clinic', 9, 7);
    pen.blob(
      [
        { x: 28, y: 6 },
        { x: 21, y: 13 },
        { x: 23, y: 5 },
      ],
      '#E6DCC6',
      { width: lw * 0.6, amp: 0 },
    );
    ctx.restore();

    // The grille door: a dark doorway, glowing eyes, wire bars.
    ctx.save();
    ctx.translate(rattle, 0);
    pen.blob(rr(26, -122, 70, 92, 16), soft(ctx, 60, -76, 50, '#B7BCCF', '#9196AB', '#6E7389'));
    pen.blob(rr(34, -114, 54, 76, 12), DARK, { width: lw * 0.8 });
    const ey = -84 + (idle ? Math.sin(t * 0.9) * 3 : 0);
    glowEye(g, st, 48, ey, -1);
    glowEye(g, st, 72, ey, 1);
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const bx = 42 + i * 12;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? WIRE : INK;
        ctx.lineWidth = pass ? lw * 0.9 : lw * 2.1;
        ctx.beginPath();
        ctx.moveTo(bx, -112);
        ctx.lineTo(bx, -40);
        ctx.stroke();
      }
    }
    for (const by of [-98, -60]) {
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? WIRE : INK;
        ctx.lineWidth = pass ? lw * 0.9 : lw * 2.1;
        ctx.beginPath();
        ctx.moveTo(36, by);
        ctx.lineTo(86, by);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Door latch.
    pen.blob(rr(84, -86, 10, 16, 3), '#E2B04A', { width: lw * 0.7 });
    ctx.restore();

    // Ominous cello, in idle.
    if (idle) {
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.45 + k * 0.5) % 1;
        note(g, 90 + k * 8 + Math.sin(ph * 9) * 5, -130 - ph * 40, Math.sin(ph * Math.PI));
      }
    }
    if (ouch) fxText(ctx, 'rattle!', -40, -150, 12, INK, st.hit);
  },
};
