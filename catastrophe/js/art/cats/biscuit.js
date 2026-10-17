// @ts-check
// Biscuit: cream kitten, extremely round, perpetually asking about snack time.
import { ellipsePts, soft } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */

/** Faint forehead stripes. @param {Geo} g */
function forehead(g) {
  const { pen, hy, lw } = g;
  for (const x of [-12, 0, 12]) pen.line([{ x, y: hy - 64 }, { x: x * 0.85, y: hy - (x ? 46 : 40) }], { color: '#E2B47A', width: lw * 2, amp: 0 });
}

/** Snack crumbs on the cheeks. @param {Geo} g */
function crumbs(g) {
  const { ctx, hy, lw } = g;
  ctx.save();
  for (let k = 0; k < 7; k++) {
    const s = k % 2 ? 1 : -1;
    const x = s * (18 + hash2(k, 3) * 22);
    const y = hy + 26 + hash2(k, 5) * 16;
    ctx.fillStyle = k % 3 ? '#C98A4A' : '#8A5A3B';
    ctx.strokeStyle = '#3B3A4A';
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4, 2, hash2(k, 7) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** A half-eaten biscuit "saved for later". @param {Geo} g */
function cookie(g) {
  const { pen, ctx, brx, lw } = g;
  const x = -brx - 14;
  const y = -14;
  const r = 15;
  const pts = ellipsePts(x, y, r, r * 0.9, 20, (a) => {
    const d = Math.abs(a - 5.5);
    return d < 0.6 ? 0.62 + (Math.cos(d * 9) * 0.08) : 1;
  });
  pen.blob(pts, soft(ctx, x, y, r, '#F2C98A', '#D9A05E', '#B07A3E'));
  ctx.fillStyle = '#6B4330';
  for (const [dx, dy] of [[-6, -3], [3, 4], [-2, 7], [-8, 5]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.line([{ x: x + 10, y: y - 14 }, { x: x + 12, y: y - 18 }], { width: lw * 0.8, alpha: 0.6 });
}

/** @type {CatSpec} */
export const spec = {
  id: 'biscuit',
  fur: '#F2D3A0',
  light: '#FFF2DA',
  shade: '#D9AE72',
  cream: '#FFF9EC',
  stripe: '#E2B47A',
  eye: '#B07A3E',
  eyeDark: '#4E2E14',
  eyeLight: '#E2B27A',
  innerEar: '#F4AFB5',
  pupil: 1.15,
  mouth: 'w',
  pattern: 'none',
  headPattern: forehead,
  scale: 0.55,
  bodyW: 1.34,
  bodyH: 0.86,
  headW: 1.18,
  earSize: 0.66,
  tailLen: 0.55,
  tailWidth: 1.25,
  tiers: {
    T1: [
      { layer: 'neck', draw: cookie },
      { layer: 'head', draw: crumbs },
    ],
  },
};

export const tiers = [{ id: 'T1', label: 'T1 · Kitten' }];
