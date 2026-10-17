// @ts-check
// Small shared props: the "nap spot" cushion cats sit on.
import { ellipsePts, soft } from './brush.js';

/**
 * Plump square-ish cushion with corner tassels and a center button.
 * Drawn with its top surface at y = -10 so a cat placed at (0,-10) sits on it.
 * @param {import('./brush.js').Pen} pen @param {number} lw @param {string} [base] @param {string} [dark]
 */
export function drawCushion(pen, lw, base = '#F4B7C2', dark = '#DE8FA1') {
  const ctx = pen.ctx;
  for (const s of [-1, 1]) {
    pen.blob(ellipsePts(s * 92, 4, 7, 9, 10), '#F2C14E', { width: lw * 0.8 });
  }
  const pts = ellipsePts(0, 0, 96, 26, 32, (a) => 1 + 0.1 * Math.cos(4 * a));
  pen.blob(pts, soft(ctx, 0, -6, 96, '#FFE1E7', base, dark));
  pen.line([{ x: -78, y: 2 }, { x: 0, y: 8 }, { x: 78, y: 2 }], { color: dark, width: lw * 1.1 });
  pen.blob(ellipsePts(0, -2, 5, 3.5, 10), dark, { width: lw * 0.7 });
}
