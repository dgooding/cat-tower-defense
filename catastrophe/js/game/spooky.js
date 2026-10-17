// @ts-check
// The Haunted Hayride's night mood, drawn by the renderer only on level 'halloween': a dusky purple wash over the
// room (under the characters), a few flickering jack-o'-lanterns beside the path and paper bats drifting overhead.
// All plain Canvas2D paths (cheap: a handful of shapes per frame). Reduced motion: no flicker, no flapping, bats still.
import { STAGE_W, STAGE_H } from '../art/rooms/common.js';

/** @typedef {{x:number, y:number}} Pt */
/** @typedef {{x:number, y:number, s:number, seed:number}} Lantern */

const INK = '#3B3A4A';

/**
 * Pick lantern spots beside (not on) the path: a fixed offset from the track, clear of every track, the stash
 * and the layout's suggested cat seats. Deterministic for a layout.
 * @param {{pts: Pt[], length: number, cum: number[]}[]} tracks
 * @param {{stash: Pt, spots: Pt[]}} layout
 * @param {number} [max]
 * @returns {Lantern[]}
 */
export function pickLanterns(tracks, layout, max = 5) {
  /** @type {Lantern[]} */
  const out = [];
  const clearOf = (/** @type {number} */ x, /** @type {number} */ y) => {
    if (x < 90 || x > 1830 || y < 230 || y > 960) return false;
    for (const tr of tracks) for (const q of tr.pts) if ((q.x - x) ** 2 + (q.y - y) ** 2 < 100 * 100) return false;
    if ((layout.stash.x - x) ** 2 + (layout.stash.y - y) ** 2 < 220 * 220) return false;
    for (const s of layout.spots) if ((s.x - x) ** 2 + (s.y - y) ** 2 < 95 * 95) return false;
    for (const l of out) if ((l.x - x) ** 2 + (l.y - y) ** 2 < 300 * 300) return false;
    return true;
  };
  for (const tr of tracks) {
    const pts = tr.pts;
    for (let i = 4; i < pts.length - 4 && out.length < max; i += 9) {
      const a = pts[i - 2];
      const b = pts[i + 2];
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / l;
      const ny = (b.x - a.x) / l;
      for (const side of (i / 9) % 2 ? [1, -1] : [-1, 1]) {
        const x = pts[i].x + nx * 125 * side;
        const y = pts[i].y + ny * 125 * side;
        if (clearOf(x, y)) {
          out.push({ x, y, s: 0.85 + 0.3 * ((out.length * 37) % 10) / 10, seed: out.length * 1.7 + 0.3 });
          break;
        }
      }
    }
  }
  return out;
}

/** Dusky wash over the room. @param {CanvasRenderingContext2D} ctx */
export function drawNightWash(ctx) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
  g.addColorStop(0, 'rgba(38,30,92,0.42)');
  g.addColorStop(0.55, 'rgba(58,40,110,0.26)');
  g.addColorStop(1, 'rgba(30,24,70,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.restore();
}

/**
 * Jack-o'-lanterns with a warm glow pool. @param {CanvasRenderingContext2D} ctx @param {Lantern[]} lanterns
 * @param {number} time @param {boolean} reduced
 */
export function drawLanterns(ctx, lanterns, time, reduced) {
  for (const l of lanterns) {
    const f = reduced ? 0.85 : 0.72 + 0.16 * Math.sin(time * 7.1 + l.seed * 5) + 0.12 * Math.sin(time * 12.7 + l.seed * 11);
    const s = l.s;
    ctx.save();
    ctx.translate(l.x, l.y);
    // Glow pool on the ground.
    const glow = ctx.createRadialGradient(0, -14 * s, 4, 0, -14 * s, 95 * s);
    glow.addColorStop(0, `rgba(255,196,96,${0.42 * f})`);
    glow.addColorStop(1, 'rgba(255,170,70,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, -10 * s, 95 * s, 70 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(59,58,74,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    const body = ctx.createRadialGradient(-8, -30, 3, 0, -20, 34);
    body.addColorStop(0, '#FFC27A');
    body.addColorStop(0.6, '#F28C28');
    body.addColorStop(1, '#B9561A');
    ctx.fillStyle = body;
    for (const [x, rx] of [[-14, 14], [14, 14], [-7, 15], [7, 15], [0, 14]]) {
      ctx.beginPath();
      ctx.ellipse(x, -19, rx, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Stem.
    ctx.fillStyle = '#6E5134';
    ctx.beginPath();
    ctx.moveTo(-3, -37);
    ctx.lineTo(-2, -48);
    ctx.lineTo(5, -50);
    ctx.lineTo(3, -37);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Carved face lit from inside.
    ctx.fillStyle = `rgb(255,${Math.round(205 + 45 * f)},${Math.round(90 + 60 * f)})`;
    ctx.lineWidth = 2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 4, -22);
      ctx.lineTo(sd * 15, -22);
      ctx.lineTo(sd * 10, -31);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-6, -14);
    ctx.lineTo(0, -10);
    ctx.lineTo(6, -14);
    ctx.lineTo(10, -11);
    ctx.lineTo(16, -14);
    ctx.quadraticCurveTo(10, -2, 0, -2);
    ctx.quadraticCurveTo(-10, -2, -16, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

const BATS = [
  { y: 150, speed: 46, off: 0, size: 1, bob: 26 },
  { y: 260, speed: 34, off: 900, size: 0.75, bob: 18 },
  { y: 110, speed: 58, off: 1500, size: 0.6, bob: 14 },
];

/** Paper bats drifting across the sky. @param {CanvasRenderingContext2D} ctx @param {number} time @param {boolean} reduced */
export function drawBats(ctx, time, reduced) {
  const span = STAGE_W + 300;
  for (const [i, b] of BATS.entries()) {
    const x = reduced ? 380 + i * 560 : ((time * b.speed + b.off) % span) - 150;
    const y = b.y + (reduced ? 0 : Math.sin(time * 1.3 + i * 2) * b.bob);
    const flap = reduced ? 0.4 : Math.sin(time * 9 + i * 1.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(b.size * 1.3, b.size * 1.3);
    ctx.rotate(Math.sin(time * 0.8 + i) * (reduced ? 0 : 0.12));
    ctx.fillStyle = '#2E2640';
    ctx.strokeStyle = 'rgba(255,253,246,0.55)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      const lift = -14 * flap;
      ctx.beginPath();
      ctx.moveTo(s * 6, -2);
      ctx.quadraticCurveTo(s * 20, -16 + lift, s * 38, -10 + lift * 1.3);
      ctx.lineTo(s * 33, 0 + lift * 0.6);
      ctx.quadraticCurveTo(s * 28, -4 + lift * 0.5, s * 24, 4 + lift * 0.4);
      ctx.quadraticCurveTo(s * 18, -1 + lift * 0.3, s * 13, 6 + lift * 0.2);
      ctx.quadraticCurveTo(s * 9, 2, s * 5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(-5, -15);
    ctx.lineTo(-1, -9);
    ctx.lineTo(1, -9);
    ctx.lineTo(5, -15);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFF4CF';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 3, -2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
