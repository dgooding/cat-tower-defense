// @ts-check
// Lint Roller: a sticky, self-propelled roller with a long handle. It hoovers
// up cat fur as it goes, getting visibly furrier (the fluff cycles every ~20s).
import { googlyEye, ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */

const H = 150;
const PL = '#4FA3A0';
const PL_L = '#93D6CC';
const PL_D = '#2F7470';
const SHEET = '#F3F0E6';
const FURS = ['#E9A75A', '#9A9AA8', '#FFFDF6', '#5A5468', '#E3CFA8', '#C97A3E'];
const CYCLE = 20;

/** Drum extents. */
const DL = -44;
const DR = 54;
const DT = -66;
const DB = -2;

/** Spots on the drum where fur sticks (avoiding the face), in fill order. */
const SPOTS = [
  [-34, -56], [44, -14], [-30, -12], [40, -58], [-38, -34], [8, -60], [48, -36], [-16, -8],
  [24, -6], [-22, -60], [30, -62], [-6, -6], [-40, -50], [46, -48], [-36, -20], [44, -24],
  [-12, -62], [16, -64], [-26, -40], [36, -10],
];

/** Hash in [0,1). @param {number} n */
function h1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A fur tuft: little outlined hair strokes fanning from a point. @param {EGeo} g @param {number} x @param {number} y @param {number} s @param {string} col @param {number} seed */
function furTuft(g, x, y, s, col, seed) {
  const { ctx, lw } = g;
  ctx.save();
  ctx.lineCap = 'round';
  const n = 6;
  /** @type {number[][]} */
  const strands = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.6 + (h1(seed + i) - 0.5) * 0.5;
    const len = (7 + h1(seed * 3 + i) * 6) * s;
    const bend = (h1(seed * 7 + i) - 0.5) * 6 * s;
    strands.push([x, y, x + Math.cos(a) * len * 0.5 + bend, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len]);
  }
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? col : INK;
    ctx.lineWidth = pass ? lw * 0.9 : lw * 1.9;
    for (const [x0, y0, cx, cy, x1, y1] of strands) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

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

/** @type {EnemySpec} */
export const spec = {
  id: 'lint-roller',
  height: H,
  width: 130,
  gait: 'roll',
  deathText: '*peel*',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    const idle = st.mode === 'idle';
    const ouch = st.hit > 0.3;
    const fur = (t % CYCLE) / CYCLE;
    const cycleN = Math.floor(t / CYCLE);
    const count = fur * SPOTS.length;
    const rock = idle ? Math.sin(t * 2.6) * 6 : 0;
    ctx.save();
    ctx.translate(rock, 0);

    // Speed lines while rolling.
    if (st.moving > 0.3) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 2.2 + k * 0.33) % 1;
        pen.line([{ x: DL - 14 - ph * 30, y: -14 - k * 16 }, { x: DL - 30 - ph * 30, y: -14 - k * 16 }], { width: lw * 0.9, alpha: (1 - ph) * st.moving });
      }
    }

    // Handle trails up and back like it's being pushed by an invisible ghost.
    const hb = { x: 18, y: -74 };
    const ht = { x: -40, y: -146 + Math.sin(st.walk) * 2 * st.moving };
    pen.tube([hb, { x: (hb.x + ht.x) / 2, y: (hb.y + ht.y) / 2 }, ht], 12, PL);
    const gx = hb.x + (ht.x - hb.x) * 0.62;
    const gy = hb.y + (ht.y - hb.y) * 0.62;
    pen.tube([{ x: gx, y: gy }, { x: ht.x + 2, y: ht.y + 2 }], 17, PL_D);
    for (let k = 1; k < 4; k++) {
      const u = k / 4;
      const x = gx + (ht.x - gx) * u;
      const y = gy + (ht.y - gy) * u;
      pen.line([{ x: x - 7, y: y + 6 }, { x: x + 7, y: y - 6 }], { color: PL_L, width: lw * 0.9 });
    }
    // A few hairs stuck to the handle too, once it's properly furry.
    if (fur > 0.6) furTuft(g, hb.x - 18, hb.y - 22, 0.7, FURS[(cycleN + 1) % FURS.length], 91);

    // The sticky drum.
    pen.blob(ellipsePts(DL, (DT + DB) / 2, 9, (DB - DT) / 2, 18), soft(ctx, DL, -34, 30, PL_L, PL, PL_D));
    pen.blob(rr(DL, DT, DR - DL, DB - DT, 18), soft(ctx, -10, -50, 70, '#FFFFFF', SHEET, '#CFC9BA'));
    // Perforated sheet seam rolling around the drum.
    const ph = (st.walk * 0.45) % (Math.PI * 2);
    const vis = Math.cos(ph);
    if (vis > 0) {
      const sy = (DT + DB) / 2 - Math.sin(ph) * ((DB - DT) / 2 - 4);
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.globalAlpha *= vis * 0.6;
      ctx.strokeStyle = '#9C968A';
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(DL + 6, sy);
      ctx.lineTo(DR - 6, sy);
      ctx.stroke();
      ctx.restore();
    }
    // Sticky shine.
    pen.line([{ x: DL + 8, y: DT + 10 }, { x: DR - 30, y: DT + 8 }], { color: WHITE, width: lw * 1.8, alpha: 0.9 });

    // Collected fur.
    for (let i = 0; i < SPOTS.length; i++) {
      const grow = Math.max(0, Math.min(1, count - i));
      if (grow <= 0) break;
      const [x, y] = SPOTS[i];
      const col = FURS[(i * 5 + cycleN * 3) % FURS.length];
      furTuft(g, x, y + 4, 0.45 + grow * 0.5, col, i * 13 + cycleN);
    }

    // Right axle cap + yoke arm up to the handle.
    pen.blob(ellipsePts(DR, (DT + DB) / 2, 9, (DB - DT) / 2, 18), soft(ctx, DR, -34, 30, PL_L, PL, PL_D));
    pen.blob(ellipsePts(DR, (DT + DB) / 2, 3.5, 3.5, 8), PL_D, { width: lw * 0.7 });
    pen.tube([{ x: DR, y: -34 }, { x: DR + 6, y: -60 }, { x: hb.x + 4, y: hb.y - 2 }], 8, PL);

    // Face: smug, sticky, a little too pleased.
    const ey = -42;
    const lid = ouch ? 0 : idle ? 0.55 : 0.36;
    googlyEye(g, st, 'lL', 0, ey, 11, { lid, lidTilt: ouch ? 0 : 0.12, lidColor: '#E6E1D3', pupil: 0.5 });
    googlyEye(g, st, 'lR', 26, ey, 11, { lid, lidTilt: ouch ? 0 : -0.04, lidColor: '#E6E1D3', pupil: 0.5 });
    pen.line([{ x: -10, y: ey - 17 }, { x: 6, y: ey - 14 }], { width: lw * 1.4 });
    pen.line([{ x: 20, y: ey - 14 }, { x: 36, y: ey - 19 }], { width: lw * 1.4 });
    const my = -21;
    if (ouch) {
      pen.blob(ellipsePts(14, my, 6, 7, 12), '#6B3A47', { width: lw });
    } else {
      // Grin with a lip-licking tongue ("mmm, fluff").
      const lick = idle ? Math.max(0, Math.sin(t * 3)) : Math.max(0, Math.sin(t * 1.3) * 3 - 2);
      ctx.beginPath();
      ctx.moveTo(2, my - 2);
      ctx.quadraticCurveTo(14, my + 10, 28, my - 4);
      ctx.closePath();
      ctx.fillStyle = '#6B3A47';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
      if (lick > 0.05) {
        pen.blob(ellipsePts(22 + lick * 4, my + 1 - lick * 2, 5 * lick + 1, 4 * lick + 1, 10), '#F28C9E', { width: lw * 0.8 });
      }
    }

    // Bonked: a tuft goes flying.
    if (st.hit > 0.05) {
      const k = 1 - st.hit;
      furTuft(g, -30 - k * 40, -60 - k * 50, 0.9, FURS[0], 7);
    }
    if (idle && Math.sin(t * 1.1) > 0.75) fxText(ctx, 'mmm, fluff', -66, -100, 11, INK, (Math.sin(t * 1.1) - 0.75) * 4);
    ctx.restore();
  },
};
