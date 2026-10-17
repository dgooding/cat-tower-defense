// @ts-check
// Halloween costumes: hat-layer accessories worn automatically in October (hub scene, title diorama, Haunted Hayride).
// Contract (keep stable): COSTUMES (id → {name, draw}) and costumeFor(catId) → Accessory[] for CatRig.extra.
// Same drawing contract as js/art/hats.js: draw(g) paints on the head using Geo from catrig.js. The head center is
// (0, g.hy), its half-width g.hrx (76 * headW), the crown about g.hy - 56, the ears reach g.hy - 96 at x = ±58.
// Widths scale with g.hrx so a costume fits Chonkington and a tiny kitten alike.
import { ellipsePts, soft } from './brush.js';
import { star } from './cats/catrig.js';
import { INK } from './palette.js';

/** @typedef {import('./cats/catrig.js').Geo} Geo */
/** @typedef {import('./brush.js').Pt} Pt */
/** @typedef {{name:string, draw:(g: Geo) => void}} Costume */

/** Width scale for the current head. @param {Geo} g */
const K = (g) => g.hrx / 76;

/**
 * A tapered shape around a spine (cone of a hat, a horn): widths are half-widths per spine point.
 * @param {Pt[]} spine @param {number[]} widths @returns {Pt[]}
 */
function taper(spine, widths) {
  /** @type {Pt[]} */
  const left = [];
  /** @type {Pt[]} */
  const right = [];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const p = spine[i];
    left.push({ x: p.x + nx * widths[i], y: p.y + ny * widths[i] });
    right.unshift({ x: p.x - nx * widths[i], y: p.y - ny * widths[i] });
  }
  return [...left, ...right];
}

/** Clip to a traced point list. @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function clipTo(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** A band hugging the top of the head (headbands). @param {Geo} g @param {number} width @param {string} color */
function headband(g, width, color) {
  const { pen, hy } = g;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1.16 + 0.68 * (i / 10));
    pts.push({ x: Math.cos(a) * g.hrx * 0.93, y: hy + Math.sin(a) * 54 });
  }
  pen.tube(pts, width, color);
}

/** @type {Record<string, Costume>} */
export const COSTUMES = {
  witch: {
    name: 'Witch Hat',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(-4 * k, hy - 54);
      ctx.rotate(-0.08);
      const CLOTH = soft(ctx, -16 * k, -50, 64 * k, '#8A7AAA', '#4A3B5C', '#2C2238');
      pen.blob(ellipsePts(0, 2, 66 * k, 12, 32, (a, i) => 1 + (i % 2 ? 0.015 : -0.01)), CLOTH);
      // Crooked cone: the tip flops over to one side and bobs a little.
      const flop = Math.sin(t * 1.6) * 3;
      /** @type {Pt[]} */
      const spine = [
        { x: 0, y: -2 },
        { x: 3 * k, y: -26 },
        { x: 6 * k, y: -48 },
        { x: 11 * k, y: -66 },
        { x: 22 * k, y: -80 + flop * 0.3 },
        { x: 36 * k, y: -84 + flop * 0.6 },
        { x: 48 * k, y: -75 + flop },
      ];
      const cone = pen.blob(taper(spine, [33 * k, 26 * k, 19 * k, 13 * k, 8 * k, 5 * k, 1.5]), CLOTH);
      ctx.save();
      clipTo(ctx, cone);
      // A stitched-on green patch and a crease.
      ctx.fillStyle = '#6A9A5A';
      ctx.fillRect(4 * k, -44, 12 * k, 11);
      ctx.strokeStyle = '#E9F1D8';
      ctx.lineWidth = lw * 0.5;
      ctx.setLineDash([2.5, 2.5]);
      ctx.strokeRect(5.5 * k, -42.5, 9 * k, 8);
      ctx.setLineDash([]);
      ctx.restore();
      pen.line([{ x: 14 * k, y: -70 }, { x: 22 * k, y: -72 }], { color: '#2C2238', width: lw * 0.7, amp: 0 });
      // Orange band with a gold buckle.
      pen.tube([{ x: -30 * k, y: -7 }, { x: 0, y: -4 }, { x: 30 * k, y: -7 }], 8, '#F29E4C');
      pen.blob(
        [
          { x: -6 * k, y: -11 },
          { x: 6 * k, y: -11 },
          { x: 6 * k, y: 1 },
          { x: -6 * k, y: 1 },
        ],
        null,
        { ink: '#F2C14E', width: lw * 1.1, amp: 0 },
      );
      // A tiny star charm dangles from the tip.
      const tip = spine[spine.length - 1];
      const swing = Math.sin(t * 2.4) * 3;
      pen.line([tip, { x: tip.x + swing, y: tip.y + 13 }], { width: lw * 0.5, amp: 0 });
      ctx.fillStyle = '#FFE58A';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.6;
      star(ctx, tip.x + swing, tip.y + 18, 5.5, 0.45, swing * 0.05);
      ctx.stroke();
      ctx.restore();
    },
  },
  pumpkin: {
    name: 'Pumpkin Cap',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      ctx.save();
      ctx.translate(6 * k, hy - 74);
      ctx.rotate(0.1);
      const O = soft(ctx, -12 * k, -12, 40 * k, '#FFD29A', '#F28C28', '#C25E14');
      for (const x of [-22, 22]) pen.blob(ellipsePts(x * k, 2, 16 * k, 23, 18), O);
      for (const x of [-11, 11]) pen.blob(ellipsePts(x * k, 1, 17 * k, 25, 18), O);
      pen.blob(ellipsePts(0, 0, 16 * k, 26, 18), O);
      // Carved face, glowing from inside (a soft candle flicker).
      const flick = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      const GLOW = `rgba(255,${Math.round(214 + 30 * flick)},${Math.round(110 + 40 * flick)},1)`;
      const cut = { width: lw * 0.7, amp: 0 };
      for (const s of [-1, 1]) {
        pen.blob(
          [
            { x: s * 6 * k, y: -2 },
            { x: s * 19 * k, y: -2 },
            { x: s * 13 * k, y: -13 },
          ],
          GLOW,
          cut,
        );
      }
      pen.blob(
        [
          { x: -3 * k, y: 6 },
          { x: 3 * k, y: 6 },
          { x: 0, y: 2 },
        ],
        GLOW,
        cut,
      );
      pen.blob(
        [
          { x: -20 * k, y: 9 },
          { x: -12 * k, y: 12 },
          { x: -8 * k, y: 9 },
          { x: -2 * k, y: 13 },
          { x: 4 * k, y: 9 },
          { x: 10 * k, y: 13 },
          { x: 20 * k, y: 9 },
          { x: 14 * k, y: 19 },
          { x: 0, y: 22 },
          { x: -14 * k, y: 19 },
        ],
        GLOW,
        cut,
      );
      // Stem, a curly vine and a leaf.
      pen.blob(
        [
          { x: -4 * k, y: -22 },
          { x: -3 * k, y: -36 },
          { x: 6 * k, y: -40 },
          { x: 5 * k, y: -34 },
          { x: 3 * k, y: -22 },
        ],
        soft(ctx, 0, -30, 10, '#B08A5E', '#7A5A3A', '#5A4028'),
        { width: lw * 0.8 },
      );
      /** @type {Pt[]} */
      const vine = [];
      for (let i = 0; i <= 14; i++) {
        const a = i * 0.75;
        const r = 2 + i * 0.75;
        vine.push({ x: 3 * k + i * 1.6 * k + Math.cos(a) * r * 0.5, y: -26 - Math.sin(a) * r * 0.5 });
      }
      pen.line(vine, { color: '#5A9448', width: lw * 0.9 });
      const leaf = ellipsePts(0, 0, 10 * k, 5, 14).map((p) => ({ x: -10 * k + p.x * 0.9 - p.y * 0.5, y: -27 + p.x * 0.4 + p.y * 0.9 }));
      pen.blob(leaf, '#8DBF6A', { width: lw * 0.6 });
      ctx.restore();
    },
  },
  bat: {
    name: 'Bat-Wing Headband',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      headband(g, 7, '#3B3346');
      const MEMBRANE = soft(ctx, 20, -20, 50, '#7E7094', '#3B3346', '#241E2E');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 50 * k, hy - 46);
        ctx.scale(s, 1);
        ctx.rotate(0.12 - Math.sin(t * 6) * 0.14);
        /** @type {Pt[]} */
        const wing = [
          { x: -4 * k, y: 4 },
          { x: -2 * k, y: -6 },
          { x: 22 * k, y: -20 },
          { x: 46 * k, y: -26 },
          { x: 64 * k, y: -14 },
          { x: 55 * k, y: -2 },
          { x: 47 * k, y: -9 },
          { x: 39 * k, y: 4 },
          { x: 29 * k, y: -3 },
          { x: 19 * k, y: 10 },
        ];
        pen.blob(wing, MEMBRANE, { width: lw * 0.9 });
        for (const [x, y] of [[46, -26], [47, -9], [29, -3]]) pen.line([{ x: 0, y: -2 }, { x: x * k * 0.9, y: y * 0.9 }], { color: '#9C90B8', width: lw * 0.5, amp: 0, alpha: 0.7 });
        ctx.restore();
      }
      // A tiny bat mascot perched on the crown.
      const y = hy - 62 + Math.sin(t * 3) * 1.5;
      for (const s of [-1, 1]) {
        pen.blob(
          [
            { x: s * 3 * k, y: y - 6 },
            { x: s * 8 * k, y: y - 17 },
            { x: s * 10 * k, y: y - 4 },
          ],
          '#3B3346',
          { width: lw * 0.6 },
        );
      }
      pen.blob(ellipsePts(0, y, 11 * k, 9, 16), soft(ctx, -3, y - 3, 11, '#7E7094', '#3B3346', '#241E2E'), { width: lw * 0.7 });
      ctx.fillStyle = '#FFFDF6';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 4 * k, y - 1, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = INK;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 4 * k + 0.4, y - 0.6, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFDF6';
      ctx.beginPath();
      ctx.moveTo(1, y + 3);
      ctx.lineTo(3.4, y + 3);
      ctx.lineTo(2.2, y + 6);
      ctx.closePath();
      ctx.fill();
    },
  },
  devil: {
    name: 'Tiny Devil Horns',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g);
      headband(g, 5, '#C23B3B');
      const RED = soft(ctx, -2, -18, 22, '#FFB0A0', '#E0483C', '#A82E2A');
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 27 * k, hy - 57);
        ctx.scale(s, 1);
        ctx.rotate(0.12);
        /** @type {Pt[]} */
        const spine = [
          { x: 0, y: 2 },
          { x: -1 * k, y: -10 },
          { x: 2 * k, y: -20 },
          { x: 9 * k, y: -27 },
          { x: 15 * k, y: -29 },
        ];
        pen.blob(taper(spine, [9 * k, 7.5 * k, 5.5 * k, 3 * k, 0.8]), RED, { width: lw * 0.9 });
        pen.line([{ x: -4 * k, y: -6 }, { x: -3 * k, y: -15 }], { color: '#FFD8CC', width: lw * 0.8, amp: 0, alpha: 0.8 });
        ctx.restore();
      }
      // A little twinkle between the horns: mischief, not menace.
      const tw = Math.max(0, Math.sin(t * 2.6)) ** 6;
      if (tw > 0.03) {
        ctx.save();
        ctx.globalAlpha *= tw;
        ctx.fillStyle = '#FFE58A';
        star(ctx, 0, hy - 74, 6, 0.3, 0);
        ctx.restore();
      }
    },
  },
  ghost: {
    name: 'Ghost Buddy',
    draw(g) {
      const { pen, ctx, hy, lw, t } = g;
      const k = K(g) * 0.95;
      ctx.save();
      ctx.translate(8 * k, hy - 58 + Math.sin(t * 2.4) * 2.5);
      ctx.rotate(0.08 + Math.sin(t * 1.7) * 0.06);
      /** @type {Pt[]} */
      const sheet = [];
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI + (Math.PI * i) / 16;
        sheet.push({ x: Math.cos(a) * 21 * k, y: -22 + Math.sin(a) * 26 });
      }
      sheet.push({ x: 23 * k, y: -6 }, { x: 24 * k, y: 2 });
      const wave = Math.sin(t * 4) * 1.5;
      for (let i = 0; i <= 8; i++) {
        const x = 24 * k - (48 * k * i) / 8;
        sheet.push({ x, y: (i % 2 ? -5 : 2) + (i % 2 ? wave : -wave) });
      }
      sheet.push({ x: -23 * k, y: -6 });
      pen.blob(sheet, soft(ctx, -6 * k, -34, 30 * k, '#FFFFFF', '#F7F4FB', '#D9D2EA'));
      // Nubby arms waving hello.
      const hi = Math.sin(t * 5) * 3;
      pen.blob(ellipsePts(-22 * k, -16 + hi, 6 * k, 4.5, 10), '#F7F4FB', { width: lw * 0.6 });
      pen.blob(ellipsePts(22 * k, -18, 6 * k, 4.5, 10), '#F7F4FB', { width: lw * 0.6 });
      ctx.fillStyle = INK;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * 7 * k, -28, 2.8, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFDF6';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * 7 * k - 0.9, -29.4, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(244,140,160,0.55)';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * 13 * k, -21, 3.6, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      pen.blob(ellipsePts(0, -19, 2.6, 3.2, 10), '#6B3A47', { width: lw * 0.5 });
      ctx.restore();
    },
  },
};

/** Which costume each character wears (cats, kittens, heroes). @type {Record<string, string>} */
const WEARS = {
  pudding: 'pumpkin',
  whiskerton: 'bat',
  'granny-purl': 'witch',
  'mama-mittens': 'ghost',
  'dr-nip': 'witch',
  chonkington: 'pumpkin',
  sriracha: 'devil',
  'maneki-mochi': 'bat',
  beans: 'devil',
  biscuit: 'pumpkin',
  noodle: 'bat',
  tofu: 'ghost',
  'ronin-biscuit': 'bat',
  nebula: 'witch',
  'big-tom': 'devil',
};

/** Accessories for a character's costume (empty if none). @param {string} id */
export function costumeFor(id) {
  const c = COSTUMES[WEARS[id] ?? 'witch'];
  return c ? [{ layer: /** @type {'head'} */ ('head'), hat: true, draw: c.draw }] : [];
}
