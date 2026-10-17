// @ts-check
// Wardrobe hats. Contract: HATS[id] = { name, cost (paw prints), blurb, draw(g) } where draw paints a hat
// on the head using Geo from catrig.js. The head center is (0, g.hy), its half-width is g.hrx (76 * headW),
// the crown is about g.hy - 56 and the ears rise to about g.hy - 96 at x = ±58. Every hat scales its width
// with g.hrx so it sits right on Chonkington's huge head and on a tiny kitten alike.
// Callers wear a hat via: rig.extra = [{ layer: 'head', draw: HATS[id].draw }].
import { ellipsePts, soft } from './brush.js';
import { star } from './cats/catrig.js';
import { hash2 } from '../core/rng.js';
import { INK } from './palette.js';

/** @typedef {import('./cats/catrig.js').Geo} Geo */
/** @typedef {import('./brush.js').Pt} Pt */
/** @typedef {{name:string, cost:number, blurb:string, draw:(g: Geo) => void}} Hat */

/** Width scale for the current head. @param {Geo} g */
const K = (g) => g.hrx / 76;

/** Keep polygon corners crisp under the rounded brush path. @param {Pt[]} pts @param {number} [r] */
function boxy(pts, r = 2) {
  /** @type {Pt[]} */
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n];
    const p = pts[i];
    const b = pts[(i + 1) % n];
    const ka = Math.min(r / (Math.hypot(a.x - p.x, a.y - p.y) || 1), 0.45);
    const kb = Math.min(r / (Math.hypot(b.x - p.x, b.y - p.y) || 1), 0.45);
    out.push({ x: p.x + (a.x - p.x) * ka, y: p.y + (a.y - p.y) * ka }, { x: p.x + (b.x - p.x) * kb, y: p.y + (b.y - p.y) * kb });
  }
  return out;
}

/** Top half of an ellipse closed by a gently sagging base. @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} [sag] */
function dome(cx, cy, rx, ry, sag = 4) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (Math.PI * i) / 20;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  pts.push({ x: cx + rx * 0.5, y: cy + sag * 0.8 }, { x: cx, y: cy + sag }, { x: cx - rx * 0.5, y: cy + sag * 0.8 });
  return pts;
}

/** Clip to a traced point list (straight segments are fine for clipping). @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function clipTo(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** 5-point star outline. @param {number} x @param {number} y @param {number} R @param {number} r @param {number} rot */
function starPts(x, y, R, r, rot) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: x + Math.cos(a) * (i % 2 ? r : R), y: y + Math.sin(a) * (i % 2 ? r : R) });
  }
  return pts;
}

/** Five round petals around a center. @param {Geo} g @param {number} x @param {number} y @param {number} r @param {string} petal @param {string} center */
function blossom(g, x, y, r, petal, center) {
  const { pen, lw } = g;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    pen.blob(ellipsePts(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.5, 10), petal, { width: lw * 0.6 });
  }
  pen.blob(ellipsePts(x, y, r * 0.34, r * 0.34, 10), center, { width: lw * 0.6 });
}

/** Daisy: many thin petals. @param {Geo} g @param {number} x @param {number} y @param {number} r */
function daisy(g, x, y, r) {
  const { pen, lw } = g;
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pen.blob(
      ellipsePts(0, 0, r * 0.55, r * 0.2, 10).map((p) => ({ x: x + (p.x + r * 0.5) * c - p.y * s, y: y + (p.x + r * 0.5) * s + p.y * c })),
      '#FFFDF6',
      { width: lw * 0.5 },
    );
  }
  pen.blob(ellipsePts(x, y, r * 0.33, r * 0.33, 10), '#F2C14E', { width: lw * 0.6 });
}

/** Pointed leaf. @param {Geo} g @param {number} x @param {number} y @param {number} len @param {number} ang */
function leaf(g, x, y, len, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  /** @type {Pt[]} */
  const pts = [
    { x: 0, y: 0 },
    { x: len * 0.5, y: -len * 0.28 },
    { x: len, y: 0 },
    { x: len * 0.5, y: len * 0.28 },
  ];
  g.pen.blob(
    boxy(pts, 1.2).map((p) => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c })),
    '#8DBF6A',
    { width: g.lw * 0.6 },
  );
}

// ---------------------------------------------------------------------------

/** @type {Record<string, Hat>} */
export const HATS = {
  'straw-hat': {
    name: 'Straw Hat',
    cost: 4,
    blurb: 'Sun-ready. Nap-ready. Mostly nap-ready.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(0, hy - 58);
      ctx.rotate(-0.06);
      const STRAW = soft(ctx, -24 * k, -6, 86 * k, '#FFF3CC', '#EED38A', '#C9A85A');
      pen.blob(ellipsePts(0, 0, 86 * k, 16, 40, (a, i) => 1 + (i % 2 ? 0.012 : -0.01)), STRAW);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        pen.line([{ x: Math.cos(a) * 46 * k, y: Math.sin(a) * 8.5 }, { x: Math.cos(a) * 80 * k, y: Math.sin(a) * 14.6 }], { color: '#C9A85A', width: lw * 0.5, amp: 0, alpha: 0.6 });
      }
      const cw = 38 * k;
      const crown = pen.blob(dome(0, 2, cw, 34, 5), soft(ctx, -12 * k, -18, cw, '#FFF3CC', '#EED38A', '#C9A85A'));
      ctx.save();
      clipTo(ctx, crown);
      for (const y of [-26, -18, -10]) pen.line([{ x: -cw, y }, { x: 0, y: y + 3 }, { x: cw, y }], { color: '#C9A85A', width: lw * 0.55, amp: 0, alpha: 0.7 });
      ctx.restore();
      pen.tube([{ x: -cw * 0.98, y: -3 }, { x: 0, y: 2 }, { x: cw * 0.98, y: -3 }], 8, '#D2483C');
      const f = Math.sin(t * 3.4) * 3;
      for (const [dx, dy] of [[14, 20], [24, 16]]) pen.tube([{ x: cw * 0.8, y: -1 }, { x: cw * 0.8 + dx * 0.6, y: dy * 0.5 + f * 0.5 }, { x: cw * 0.8 + dx, y: dy + f }], 6, '#D2483C');
      ctx.restore();
    },
  },
  'frog-beanie': {
    name: 'Frog Beanie',
    cost: 3,
    blurb: 'Ribbit is a lifestyle.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      const y = hy - 42;
      const w = 62 * k;
      const GREEN = soft(ctx, -20 * k, y - 34, w, '#BDE4A0', '#7FBF5E', '#5A9448');
      // Eye bumps (behind the dome edge) and the dome.
      for (const s of [-1, 1]) pen.blob(ellipsePts(s * 24 * k, y - 46, 16 * k, 14, 16), GREEN);
      const d = pen.blob(dome(0, y - 2, w, 44, 3), GREEN);
      ctx.save();
      clipTo(ctx, d);
      ctx.strokeStyle = 'rgba(70,120,60,0.45)';
      ctx.lineWidth = lw * 0.55;
      ctx.beginPath();
      for (let row = 0; row < 4; row++) {
        const yy = y - 12 - row * 9;
        for (let x = -w; x <= w; x += 8) {
          ctx.moveTo(x - 2.4, yy - 2);
          ctx.lineTo(x, yy + 2);
          ctx.lineTo(x + 2.4, yy - 2);
        }
      }
      ctx.stroke();
      ctx.restore();
      // Googly frog eyes.
      for (const s of [-1, 1]) {
        const ex = s * 24 * k;
        const ey = y - 50;
        pen.blob(ellipsePts(ex, ey, 10.5 * k, 10, 14), '#FFFDF6', { width: lw * 0.8 });
        const look = Math.sin(t * 0.9) * 2;
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(ex + look + s * 1.5, ey + 1, 4.6, 5.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFDF6';
        ctx.beginPath();
        ctx.arc(ex + look + s * 1.5 - 1.6, ey - 1.6, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Ribbed cuff with a wide frog smile.
      pen.blob(
        boxy([
          { x: -w * 1.02, y: y - 8 },
          { x: w * 1.02, y: y - 8 },
          { x: w * 1.04, y: y + 6 },
          { x: -w * 1.04, y: y + 6 },
        ], 5),
        soft(ctx, -20 * k, y - 4, w, '#A6D88A', '#6AAE4E', '#4F8A3E'),
      );
      for (let x = -w + 5; x < w; x += 6) pen.line([{ x, y: y - 6 }, { x, y: y + 4 }], { color: '#4F8A3E', width: lw * 0.5, amp: 0, alpha: 0.6 });
      pen.line([{ x: -w * 0.5, y: y - 18 }, { x: 0, y: y - 11 }, { x: w * 0.5, y: y - 18 }], { width: lw * 1.1 });
      ctx.fillStyle = 'rgba(244,140,160,0.6)';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * w * 0.62, y - 18, 6, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  'tiny-crown': {
    name: 'Tiny Crown',
    cost: 8,
    blurb: 'Royalty, but small. Like the cat.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g) * 0.95;
      ctx.save();
      ctx.translate(6 * k, hy - 56);
      ctx.rotate(0.12);
      const GOLD = soft(ctx, -6, -16, 26 * k, '#FFF1B8', '#F2C14E', '#C99A2E');
      pen.blob(
        boxy([
          { x: -20 * k, y: 0 },
          { x: -23 * k, y: -23 },
          { x: -11 * k, y: -12 },
          { x: 0, y: -28 },
          { x: 11 * k, y: -12 },
          { x: 23 * k, y: -23 },
          { x: 20 * k, y: 0 },
        ], 1.5),
        GOLD,
      );
      pen.line([{ x: -21 * k, y: -7 }, { x: 21 * k, y: -7 }], { color: '#C99A2E', width: lw * 0.8, amp: 0 });
      for (const [x, y] of [[-23, -23], [0, -28], [23, -23]]) pen.blob(ellipsePts(x * k, y - 2, 3.4, 3.4, 10), '#FFFDF6', { width: lw * 0.6 });
      pen.blob(ellipsePts(0, -3, 4.2 * k, 3.4, 10), '#D2483C', { width: lw * 0.6 });
      for (const s of [-1, 1]) pen.blob(ellipsePts(s * 12 * k, -3, 2.8 * k, 2.6, 8), '#6FA0E0', { width: lw * 0.5 });
      const tw = Math.max(0, Math.sin(t * 2.2)) ** 4;
      if (tw > 0.03) {
        ctx.globalAlpha *= tw;
        ctx.fillStyle = '#FFFDF6';
        star(ctx, 16 * k, -30, 8, 0.25, 0);
      }
      ctx.restore();
    },
  },
  'chef-toque': {
    name: "Chef's Toque",
    cost: 5,
    blurb: 'Yes, chef. No, you may not have a bite.',
    draw(g) {
      const { pen, ctx, hy, lw } = g;
      const k = K(g);
      const y = hy - 50;
      const WHITE = soft(ctx, -14 * k, y - 40, 44 * k, '#FFFFFF', '#F7F4EE', '#DCD6CC');
      pen.blob(
        ellipsePts(0, y - 40, 42 * k, 26, 40, (a) => (Math.sin(a) < 0.1 ? 1 + 0.14 * Math.abs(Math.sin(a * 3)) ** 0.6 : 1)),
        WHITE,
      );
      pen.line([{ x: -12 * k, y: y - 46 }, { x: -6 * k, y: y - 30 }], { color: '#DCD6CC', width: lw * 0.8, amp: 0 });
      pen.line([{ x: 14 * k, y: y - 48 }, { x: 10 * k, y: y - 30 }], { color: '#DCD6CC', width: lw * 0.8, amp: 0 });
      const band = [
        { x: -29 * k, y: y + 2 },
        { x: -33 * k, y: y - 22 },
        { x: 33 * k, y: y - 22 },
        { x: 29 * k, y: y + 2 },
      ];
      pen.blob(boxy(band, 3), WHITE);
      for (let i = -3; i <= 3; i++) pen.line([{ x: i * 8 * k, y: y - 20 }, { x: i * 7.3 * k, y: y }], { color: '#DCD6CC', width: lw * 0.6, amp: 0 });
      // Embroidered fish.
      const fx = 14 * k;
      const fy = y - 10;
      pen.blob(ellipsePts(fx, fy, 6, 3.4, 10), '#6FA0E0', { width: lw * 0.5 });
      pen.blob([{ x: fx - 5, y: fy }, { x: fx - 10, y: fy - 4 }, { x: fx - 10, y: fy + 4 }], '#6FA0E0', { width: lw * 0.5 });
    },
  },
  'wizard-hat': {
    name: 'Wizard Hat',
    cost: 7,
    blurb: 'Casts Level 1 Nap. Also Level 2 Nap.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      const by = hy - 56;
      const sway = Math.sin(t * 1.8) * 5;
      const INDIGO = soft(ctx, -14 * k, by - 50, 60 * k, '#7E70C9', '#4B3F8F', '#2F2766');
      pen.blob(ellipsePts(0, by + 2, 58 * k, 11, 30), INDIGO);
      /** @type {Pt[]} */
      const left = [];
      /** @type {Pt[]} */
      const right = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        const cx = 36 * k * u ** 2.4 + sway * u ** 3;
        const cy = by - 104 * u + 10 * u ** 4;
        const w = 31 * k * (1 - u) ** 1.05 + 1.2;
        left.push({ x: cx - w, y: cy });
        right.unshift({ x: cx + w, y: cy });
      }
      const cone = pen.blob([...left, ...right], INDIGO);
      ctx.save();
      clipTo(ctx, cone);
      ctx.fillStyle = '#FFE58A';
      for (const [x, y, r] of [[-12, -28, 6], [10, -52, 4.5], [-2, -76, 3.5], [16, -20, 3]]) star(ctx, x * k, by + y, r, 0.42, 0.3);
      ctx.restore();
      pen.tube([{ x: -30 * k, y: by - 4 }, { x: 0, y: by }, { x: 30 * k, y: by - 4 }], 7, '#F2C14E');
      const tip = left[left.length - 1];
      pen.blob(boxy(starPts(tip.x + 1, tip.y - 4, 8, 3.5, sway * 0.05), 1), '#FFE58A', { width: lw * 0.7 });
    },
  },
  'fish-bucket-hat': {
    name: 'Fish Bucket Hat',
    cost: 5,
    blurb: 'Smells faintly of victory (and tuna).',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      const y = hy - 68;
      const BLUE = soft(ctx, -10 * k, y - 10, 50 * k, '#BDE3F5', '#7FB8D6', '#4F86A6');
      // Tail fin waving off the left side.
      const wag = Math.sin(t * 3.2) * 0.18;
      ctx.save();
      ctx.translate(-42 * k, y);
      ctx.rotate(wag);
      pen.blob(
        [
          { x: 4, y: 0 },
          { x: -24 * k, y: -16 },
          { x: -18 * k, y: 0 },
          { x: -24 * k, y: 16 },
        ],
        soft(ctx, -10, 0, 20, '#BDE3F5', '#6FA6C6', '#4F86A6'),
      );
      ctx.restore();
      pen.blob(
        [
          { x: -6 * k, y: y - 20 },
          { x: 6 * k, y: y - 34 },
          { x: 18 * k, y: y - 20 },
        ],
        '#6FA6C6',
        { width: lw * 0.8 },
      );
      const body = pen.blob(ellipsePts(0, y, 46 * k, 23, 30, (a) => 1 + (Math.cos(a) > 0 ? 0.05 * Math.cos(a) : 0)), BLUE);
      ctx.save();
      clipTo(ctx, body);
      ctx.fillStyle = 'rgba(255,253,246,0.45)';
      ctx.beginPath();
      ctx.ellipse(0, y + 14, 46 * k, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,253,246,0.7)';
      ctx.lineWidth = lw * 0.6;
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 4; i++) {
          const sx = -26 * k + i * 12 * k + r * 6 * k;
          const sy = y - 8 + r * 9;
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      }
      ctx.restore();
      // Fish face.
      pen.blob(ellipsePts(26 * k, y - 4, 7, 7, 12), '#FFFDF6', { width: lw * 0.7 });
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(27.5 * k, y - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      pen.blob(ellipsePts(43 * k, y + 5, 3, 3.6, 10), '#E98A9A', { width: lw * 0.6 });
      pen.line([{ x: 16 * k, y: y - 14 }, { x: 13 * k, y }, { x: 16 * k, y: y + 12 }], { color: '#4F86A6', width: lw * 0.8, amp: 0 });
      // The bucket brim.
      pen.blob(
        boxy([
          { x: -44 * k, y: y + 12 },
          { x: 44 * k, y: y + 12 },
          { x: 58 * k, y: y + 30 },
          { x: 0, y: y + 34 },
          { x: -58 * k, y: y + 30 },
        ], 5),
        soft(ctx, -14 * k, y + 18, 58 * k, '#A9D3EA', '#6FA6C6', '#4F86A6'),
      );
      ctx.save();
      ctx.setLineDash([3, 3]);
      pen.line([{ x: -50 * k, y: y + 25 }, { x: 0, y: y + 29 }, { x: 50 * k, y: y + 25 }], { color: '#FFFDF6', width: lw * 0.5, amp: 0, alpha: 0.8 });
      ctx.restore();
    },
  },
  'party-hat': {
    name: 'Party Hat',
    cost: 2,
    blurb: 'For celebrating. Or for no reason at all.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(10 * k, hy - 52);
      ctx.rotate(0.22);
      const w = 20 * k;
      const cone = pen.blob(
        boxy([
          { x: -w, y: 0 },
          { x: 0, y: -62 },
          { x: w, y: 0 },
        ], 2),
        '#F4A6B7',
      );
      ctx.save();
      clipTo(ctx, cone);
      ctx.fillStyle = '#9FD3EA';
      for (let i = -4; i < 6; i += 2) {
        ctx.beginPath();
        ctx.moveTo(-40, i * 12);
        ctx.lineTo(40, i * 12 - 30);
        ctx.lineTo(40, i * 12 - 20);
        ctx.lineTo(-40, i * 12 + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#F2C14E';
      for (const [x, y] of [[-8, -10], [6, -22], [-2, -38], [10, -6]]) {
        ctx.beginPath();
        ctx.arc(x * k, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      pen.blob(boxy([{ x: -w, y: 0 }, { x: 0, y: -62 }, { x: w, y: 0 }], 2), null);
      const bob = Math.sin(t * 5) * 1.5;
      pen.blob(ellipsePts(0, -66 + bob, 8, 8, 16, (a, i) => 1 + (i % 2 ? 0.16 : -0.04)), soft(ctx, -2, -68, 8, '#FFF1B8', '#F2C14E', '#D9A43A'), { width: lw * 0.8 });
      ctx.restore();
    },
  },
  'flower-crown': {
    name: 'Flower Crown',
    cost: 4,
    blurb: 'Spring has sprung. On your head, specifically.',
    draw(g) {
      const { pen, hy, hrx } = g;
      const c = hy - 60;
      const R = hrx * 0.8;
      const r = 11;
      const P = (/** @type {number} */ th) => ({ x: Math.cos(th) * R, y: c + Math.sin(th) * r });
      // Back of the ring (peeking over the crown), then the vine, then the front flowers.
      for (const [th, kind] of [[1.25, 0], [1.5, 1], [1.75, 2]]) {
        const p = P(th * Math.PI);
        if (kind === 1) daisy(g, p.x, p.y - 2, 8);
        else blossom(g, p.x, p.y - 1, 8, kind ? '#C9B6F2' : '#F4A6B7', '#F2C14E');
      }
      /** @type {Pt[]} */
      const vine = [];
      for (let i = 0; i <= 16; i++) vine.push(P(-0.05 * Math.PI + (i / 16) * 1.1 * Math.PI));
      pen.tube(vine, 3.5, '#6FA05A');
      for (let i = 0; i < 8; i++) {
        const th = (0.03 + i * 0.13) * Math.PI;
        const p = P(th);
        leaf(g, p.x, p.y, 12, (i % 2 ? -0.6 : 0.6) + (p.x < 0 ? Math.PI : 0) + hash2(i, 5) * 0.4);
      }
      const front = [
        [0.08, 'd'],
        [0.27, 'p'],
        [0.5, 'd'],
        [0.73, 'y'],
        [0.92, 'l'],
      ];
      for (const [th, kind] of front) {
        const p = P(/** @type {number} */ (th) * Math.PI);
        if (kind === 'd') daisy(g, p.x, p.y, 11);
        else blossom(g, p.x, p.y, 11, kind === 'p' ? '#F4A6B7' : kind === 'y' ? '#FFE58A' : '#C9B6F2', kind === 'y' ? '#F29E4C' : '#F2C14E');
      }
    },
  },
  'cowboy-hat': {
    name: 'Cowboy Hat',
    cost: 6,
    blurb: 'Yee-haw, but quietly. Someone is napping.',
    draw(g) {
      const { pen, ctx, hy, lw } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(0, hy);
      ctx.rotate(-0.05);
      const BROWN = soft(ctx, -14 * k, -84, 60 * k, '#E3B07A', '#B07A4A', '#7E5230');
      pen.blob(
        [
          { x: -34 * k, y: -56 },
          { x: -37 * k, y: -86 },
          { x: -24 * k, y: -103 },
          { x: -8 * k, y: -96 },
          { x: 0, y: -93 },
          { x: 8 * k, y: -96 },
          { x: 24 * k, y: -103 },
          { x: 37 * k, y: -86 },
          { x: 34 * k, y: -56 },
        ],
        BROWN,
      );
      pen.line([{ x: 0, y: -92 }, { x: 0, y: -74 }], { color: '#7E5230', width: lw * 0.9, alpha: 0.7 });
      pen.tube([{ x: -35 * k, y: -63 }, { x: 0, y: -60 }, { x: 35 * k, y: -63 }], 8, '#5A3A28');
      pen.blob(boxy(starPts(0, -61, 7, 3.2, 0), 1), '#F2C14E', { width: lw * 0.7 });
      pen.blob(
        [
          { x: -86 * k, y: -78 },
          { x: -64 * k, y: -62 },
          { x: -32 * k, y: -55 },
          { x: 0, y: -54 },
          { x: 32 * k, y: -55 },
          { x: 64 * k, y: -62 },
          { x: 86 * k, y: -78 },
          { x: 86 * k, y: -72 },
          { x: 66 * k, y: -52 },
          { x: 32 * k, y: -43 },
          { x: 0, y: -41 },
          { x: -32 * k, y: -43 },
          { x: -66 * k, y: -52 },
          { x: -86 * k, y: -72 },
        ],
        soft(ctx, -20 * k, -56, 86 * k, '#E3B07A', '#A87244', '#7E5230'),
      );
      pen.line([{ x: -70 * k, y: -60 }, { x: -32 * k, y: -50 }, { x: 0, y: -48 }, { x: 32 * k, y: -50 }, { x: 70 * k, y: -60 }], { color: '#7E5230', width: lw * 0.6, amp: 0, alpha: 0.7 });
      ctx.restore();
    },
  },
  beret: {
    name: 'Beret',
    cost: 3,
    blurb: 'Very artistic. Paints exclusively in paw prints.',
    draw(g) {
      const { pen, ctx, hy, lw } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(12 * k, hy - 60);
      ctx.rotate(0.16);
      pen.tube([{ x: 2, y: -18 }, { x: 4, y: -28 }], 4, '#A8344A');
      pen.blob(
        ellipsePts(0, 0, 50 * k, 16, 30, (a) => 1 + (Math.sin(a) < 0 ? 0.32 * -Math.sin(a) : 0)),
        soft(ctx, -14 * k, -10, 50 * k, '#F08A9E', '#C8435A', '#962B42'),
      );
      pen.line([{ x: -44 * k, y: 6 }, { x: 0, y: 12 }, { x: 44 * k, y: 6 }], { color: '#962B42', width: lw * 1.4, amp: 0 });
      // Paw-print brooch.
      const bx = -22 * k;
      const by = 2;
      ctx.fillStyle = '#F2C14E';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.5;
      ctx.beginPath();
      ctx.ellipse(bx, by + 1.5, 4.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(bx - 4.5 + i * 4.5, by - 4 - (i === 1 ? 1.5 : 0), 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  'propeller-beanie': {
    name: 'Propeller Beanie',
    cost: 4,
    blurb: 'Achieves lift-off at roughly zero miles per hour.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      const cy = hy - 46;
      const rx = 52 * k;
      const ry = 38;
      const d = pen.blob(dome(0, cy, rx, ry, 4), '#F4F1EA');
      ctx.save();
      clipTo(ctx, d);
      const cols = ['#D2483C', '#F2C14E', '#6FA0E0', '#8DBF6A'];
      for (let p = 0; p < 4; p++) {
        const b0 = -1 + p / 2;
        const b1 = -1 + (p + 1) / 2;
        /** @type {Pt[]} */
        const pts = [];
        for (let i = 0; i <= 10; i++) {
          const v = i / 10;
          pts.push({ x: b0 * rx * 1.02 * Math.sqrt(1 - v * v), y: cy + 6 - v * (ry + 6) });
        }
        for (let i = 10; i >= 0; i--) {
          const v = i / 10;
          pts.push({ x: b1 * rx * 1.02 * Math.sqrt(1 - v * v), y: cy + 6 - v * (ry + 6) });
        }
        ctx.fillStyle = cols[p];
        ctx.beginPath();
        pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.closePath();
        ctx.fill();
      }
      const shine = ctx.createLinearGradient(-rx, cy - ry, rx * 0.4, cy);
      shine.addColorStop(0, 'rgba(255,255,255,0.35)');
      shine.addColorStop(1, 'rgba(0,0,40,0.12)');
      ctx.fillStyle = shine;
      ctx.fillRect(-rx * 1.1, cy - ry - 4, rx * 2.2, ry + 12);
      ctx.restore();
      pen.blob(dome(0, cy, rx, ry, 4), null);
      pen.blob(
        boxy([
          { x: -rx * 1.03, y: cy - 5 },
          { x: rx * 1.03, y: cy - 5 },
          { x: rx * 1.04, y: cy + 5 },
          { x: -rx * 1.04, y: cy + 5 },
        ], 4),
        '#3E4C7A',
      );
      // Spinning propeller.
      const top = cy - ry;
      pen.line([{ x: 0, y: top + 2 }, { x: 0, y: top - 12 }], { width: lw * 1.6 });
      const ph = t * 13;
      const L = 30 * k;
      ctx.save();
      ctx.globalAlpha *= 0.35;
      pen.line([{ x: -L, y: top - 13 }, { x: 0, y: top - 17 }, { x: L, y: top - 13 }], { color: '#FFFDF6', width: lw * 2.4 });
      ctx.restore();
      for (const [s, col] of [[1, '#D2483C'], [-1, '#F2C14E']]) {
        const c = Math.cos(ph) * /** @type {number} */ (s);
        if (Math.abs(c) < 0.06) continue;
        pen.blob(ellipsePts((c * L) / 2, top - 13, Math.abs(c) * L * 0.5, 4.5, 14), /** @type {string} */ (col), { width: lw * 0.7 });
      }
      pen.blob(ellipsePts(0, top - 13, 4, 4, 10), '#FFFDF6', { width: lw * 0.7 });
    },
  },
  'sleep-mask': {
    name: 'Sleep Mask',
    cost: 2,
    blurb: 'Pushed up on the forehead, ready for the next nap. Which is now.',
    draw(g) {
      const { pen, ctx, hy, hrx, lw } = g;
      const k = K(g);
      const y = hy - 52;
      const w = 44 * k;
      for (const s of [-1, 1]) {
        const at = (/** @type {number} */ dy) => ({ x: s * hrx * 0.97 * Math.sqrt(1 - (dy / 58) ** 2), y: hy + dy });
        pen.tube([{ x: s * w * 0.8, y: y - 1 }, at(-44), at(-36), at(-28)], 5, '#9C87CF');
      }
      const mask = pen.blob(
        ellipsePts(0, y, w, 13, 36, (a) => {
          const dB = a - Math.PI / 2;
          const dT = a - (3 * Math.PI) / 2;
          return 1 - 0.3 * Math.exp(-(dB * dB) / 0.04) - 0.12 * Math.exp(-(dT * dT) / 0.03);
        }),
        soft(ctx, -14 * k, y - 6, w, '#EDE4FF', '#C9B6F2', '#9C87CF'),
      );
      ctx.save();
      ctx.beginPath();
      mask.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.strokeStyle = '#F4A6B7';
      ctx.lineWidth = lw * 0.8;
      ctx.setLineDash([2.5, 2.5]);
      ctx.stroke();
      ctx.restore();
      // Embroidered sleepy eyes.
      for (const s of [-1, 1]) {
        const ex = s * 20 * k;
        pen.line([{ x: ex - 8, y: y - 2 }, { x: ex, y: y + 3 }, { x: ex + 8, y: y - 2 }], { color: '#5B4A8A', width: lw * 0.9 });
        for (const d of [-5, 0, 5]) pen.line([{ x: ex + d, y: y + 2 }, { x: ex + d * 1.3, y: y + 6 }], { color: '#5B4A8A', width: lw * 0.6, amp: 0 });
      }
    },
  },
  'top-hat': {
    name: 'Tiny Top Hat',
    cost: 6,
    blurb: 'Monocle sold separately. Dignity included.',
    draw(g) {
      const { pen, ctx, hy, lw } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(-12 * k, hy - 56);
      ctx.rotate(-0.16);
      const DARK = soft(ctx, -8 * k, -30, 30 * k, '#6E6A86', '#3E3B52', '#2A2838');
      pen.blob(ellipsePts(0, 0, 32 * k, 6.5, 24), DARK);
      pen.blob(
        boxy([
          { x: -19 * k, y: -1 },
          { x: -21 * k, y: -46 },
          { x: 21 * k, y: -46 },
          { x: 19 * k, y: -1 },
        ], 3),
        DARK,
      );
      pen.blob(ellipsePts(0, -46, 21 * k, 5, 18), '#55516C', { width: lw * 0.8 });
      pen.blob(
        boxy([
          { x: -19.5 * k, y: -14 },
          { x: 19.5 * k, y: -14 },
          { x: 19.2 * k, y: -6 },
          { x: -19.2 * k, y: -6 },
        ], 1.5),
        '#C8435A',
        { width: lw * 0.8 },
      );
      daisy(g, 13 * k, -14, 7);
      pen.line([{ x: -12 * k, y: -40 }, { x: -13 * k, y: -18 }], { color: '#FFFFFF', width: lw * 1.1, alpha: 0.3, amp: 0 });
      ctx.restore();
    },
  },
  toast: {
    name: 'Toast',
    cost: 2,
    blurb: 'You have been breaded. Congratulations.',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(0, hy - 56);
      ctx.rotate(-0.08);
      /** @type {Pt[]} */
      const pts = [{ x: -27 * k, y: 4 }, { x: -29 * k, y: -22 }];
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI * 1.08 + (i / 16) * Math.PI * 0.84;
        const lobe = 1 + 0.07 * Math.abs(Math.sin((i / 16) * Math.PI * 2));
        pts.push({ x: Math.cos(a) * 36 * k * lobe, y: -30 + Math.sin(a) * 24 * lobe });
      }
      pts.push({ x: 29 * k, y: -22 }, { x: 27 * k, y: 4 });
      pen.blob(pts, soft(ctx, -10 * k, -24, 40 * k, '#E8A860', '#C98A4A', '#9C6232'));
      const cx = 0;
      const cy = -18;
      pen.blob(
        pts.map((p) => ({ x: cx + (p.x - cx) * 0.8, y: cy + (p.y - cy) * 0.78 })),
        soft(ctx, -8 * k, -26, 32 * k, '#FFF0C8', '#F6D9A0', '#E6B878'),
        { stroke: false },
      );
      ctx.fillStyle = 'rgba(201,138,74,0.45)';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc((hash2(i, 2) - 0.5) * 36 * k, -6 - hash2(i, 3) * 30, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Butter, slowly melting.
      const melt = 0.5 + 0.5 * Math.sin(t * 0.8);
      pen.blob(ellipsePts(7 * k, -15 + melt * 2, 3.2, 3.5 + melt * 2.5, 10), '#FFE58A', { width: lw * 0.6 });
      pen.blob(
        boxy([
          { x: -10 * k, y: -31 },
          { x: 10 * k, y: -32 },
          { x: 11 * k, y: -17 },
          { x: -9 * k, y: -16 },
        ], 3.5),
        soft(ctx, -4 * k, -28, 12 * k, '#FFF6C8', '#FFE58A', '#F2C14E'),
        { width: lw * 0.8 },
      );
      pen.line([{ x: -6 * k, y: -28 }, { x: 2 * k, y: -28.5 }], { color: '#FFFDF6', width: lw * 0.9, amp: 0, alpha: 0.9 });
      ctx.restore();
    },
  },
};
