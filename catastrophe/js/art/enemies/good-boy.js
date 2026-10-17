// @ts-check
// Good Boy: a fluffy golden retriever made entirely of joy. Not a villain:
// big shiny eyes, tongue out, tail going a mile a minute, tennis ball bouncing
// along. Bonks are "play" (FRIEND?!), and defeat is a happy flop for belly rubs.
import { ellipsePts, soft, fxText, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {{x:number,y:number}} Pt */

const H = 170;
const GOLD = '#E9B865';
const GOLD_L = '#FCE3B2';
const GOLD_D = '#C48A40';
const FAR = '#D49E52';
const CREAM = '#FBEBCB';
const EAR = '#D6984A';
const NOSE = '#3B3A4A';
const TONGUE = '#F28C9E';
const MOUTH = '#6B3A47';
const BALL = '#D7E84A';
const PAD = '#E9A0AE';

/** Fluffy ellipse: alternating radii give soft fur scallops (bottom half fluffier). */
/** @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} n @param {number} [fluff] */
function fluffy(cx, cy, rx, ry, n, fluff = 0.08) {
  return ellipsePts(cx, cy, rx, ry, n, (a, i) => 1 + (i % 2 ? fluff * (Math.sin(a) > -0.2 ? 1 : 0.4) : 0));
}

/** Heart. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} lw */
function heart(ctx, x, y, r, lw) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = '#F4A6B7';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
}

/** Tennis ball. @param {EGeo} g @param {number} x @param {number} y @param {number} r @param {number} rot */
function ball(g, x, y, r, rot) {
  const { ctx, pen, lw } = g;
  pen.blob(ellipsePts(x, y, r, r, 16), soft(ctx, x, y, r, '#F1F99A', BALL, '#AEBE2E'));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  ctx.arc(-r * 1.25, 0, r * 0.95, -0.75, 0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.75, Math.PI + 0.75);
  ctx.stroke();
  ctx.restore();
}

/** Big shiny friendly eye (two highlights), or a happy closed arc. @param {EGeo} g @param {EnemyState} st @param {number} x @param {number} y @param {number} r @param {boolean} sparkle */
function eye(g, st, x, y, r, sparkle) {
  const { ctx, pen, lw } = g;
  if (st.blink > 0.5 && !sparkle) {
    pen.line([{ x: x - r, y: y + 1 }, { x, y: y - r * 0.7 }, { x: x + r, y: y + 1 }], { width: lw * 1.3 });
    return;
  }
  const rr = sparkle ? r * 1.15 : r;
  pen.blob(ellipsePts(x, y, rr, rr * 1.08, 16), '#5A3522', { width: lw });
  const px = x + st.lookX * r * 0.15;
  const py = y + st.lookY * r * 0.1;
  ctx.fillStyle = '#2B2026';
  ctx.beginPath();
  ctx.arc(px, py + r * 0.05, rr * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  if (sparkle) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const q = i % 2 ? rr * 0.17 : rr * 0.55;
      ctx.lineTo(px - rr * 0.25 + Math.cos(a) * q, py - rr * 0.28 + Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(px - rr * 0.32, py - rr * 0.34, rr * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(px + rr * 0.32, py + rr * 0.3, rr * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** Feathery tail plume along a curling spine. @param {EGeo} g @param {number} bx @param {number} by @param {number} ang @param {number} wag */
function tail(g, bx, by, ang, wag) {
  const { ctx, pen } = g;
  /** @type {Pt[]} */
  const spine = [{ x: bx, y: by }];
  const N = 10;
  let a = ang + wag;
  for (let i = 1; i <= N; i++) {
    a += 0.11 + wag * 0.05;
    const p = spine[i - 1];
    spine.push({ x: p.x + Math.cos(a) * 7, y: p.y + Math.sin(a) * 7 });
  }
  /** @type {Pt[]} */
  const left = [];
  /** @type {Pt[]} */
  const right = [];
  for (let i = 0; i <= N; i++) {
    const p = spine[i];
    const q = spine[Math.min(N, i + 1)];
    const o = spine[Math.max(0, i - 1)];
    const dx = q.x - o.x;
    const dy = q.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const u = i / N;
    const w = (5 + Math.sin(u * Math.PI * 0.85) * 13) * (1 - u * 0.55);
    const fr = i % 2 ? 1.25 : 0.95;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w * fr, y: p.y - ny * w * fr });
  }
  const tip = spine[N];
  const lastA = Math.atan2(tip.y - spine[N - 1].y, tip.x - spine[N - 1].x);
  const pts = [...left, { x: tip.x + Math.cos(lastA) * 8, y: tip.y + Math.sin(lastA) * 8 }, ...right.reverse()];
  pen.blob(pts, soft(ctx, bx, by - 30, 50, GOLD_L, GOLD, GOLD_D));
}

/** Standing leg with a round paw. @param {EGeo} g @param {number} hx @param {number} hy @param {number} ph @param {number} m @param {string} col */
function leg(g, hx, hy, ph, m, col) {
  const { ctx, pen, lw } = g;
  const fx = hx + Math.sin(ph) * 11 * m;
  const lift = Math.max(0, Math.cos(ph)) * 9 * m;
  pen.tube([{ x: hx, y: hy }, { x: (hx + fx) / 2, y: (hy - 8 - lift) / 2 }, { x: fx, y: -9 - lift }], 19, col);
  pen.blob(ellipsePts(fx + 3, -7 - lift, 13, 8, 14), soft(ctx, fx + 3, -9 - lift, 12, GOLD_L, col, GOLD_D), { width: lw * 0.9 });
  for (const tx of [-3, 3, 9]) pen.line([{ x: fx + tx, y: -2 - lift }, { x: fx + tx, y: -6 - lift }], { width: lw * 0.6 });
}

/** The happy flop: belly up, paws in the air, tongue lolling. @param {EGeo} g @param {EnemyState} st */
function flop(g, st) {
  const { ctx, pen, lw, t } = g;
  const k = Math.min(1, st.deathT / 0.35);
  // Tail swishing along the floor.
  tail(g, -70, -22, Math.PI + 0.2, Math.sin(t * 6) * 0.25);
  // Paws up, little beans showing, wiggling with glee.
  const legs = [
    [-44, -50, -52, -86],
    [-24, -56, -22, -94],
    [20, -56, 14, -92],
    [38, -50, 48, -84],
  ];
  legs.forEach(([x0, y0, x1, y1], i) => {
    const w = Math.sin(t * 9 + i * 1.7) * 4;
    const ex = x0 + (x1 - x0) * k + w;
    const ey = y0 + (y1 - y0) * k;
    pen.tube([{ x: x0, y: y0 }, { x: (x0 + ex) / 2 - 3, y: (y0 + ey) / 2 }, { x: ex, y: ey }], 15, i % 3 ? GOLD : FAR);
    pen.blob(ellipsePts(ex, ey - 3, 10, 8, 14), GOLD_L, { width: lw * 0.9 });
    pen.blob(ellipsePts(ex, ey - 2, 4.5, 3.5, 10), PAD, { width: lw * 0.6 });
    for (const bx of [-5, 0, 5]) pen.blob(ellipsePts(ex + bx, ey - 8, 1.8, 1.8, 6), PAD, { width: lw * 0.4 });
  });
  // Body on its back with a big fluffy belly.
  pen.blob(fluffy(-6, -36, 74, 30, 34, 0.06), soft(ctx, -20, -50, 80, GOLD_L, GOLD, GOLD_D));
  pen.blob(ellipsePts(-2, -50, 46, 14, 22), soft(ctx, -10, -54, 46, '#FFF6EA', '#FBE6D6', '#F2CDB8'), { width: lw * 0.8 });
  // Splayed ears.
  pen.blob(ellipsePts(60, -16, 20, 10, 14), EAR, { width: lw * 0.9 });
  // Head, upside-down and blissed out.
  pen.blob(fluffy(76, -34, 34, 30, 26, 0.06), soft(ctx, 70, -44, 36, GOLD_L, GOLD, GOLD_D));
  pen.blob(ellipsePts(104, -26, 22, 14, 18), soft(ctx, 100, -30, 22, '#FFF8EA', CREAM, '#E9CFA0'));
  pen.blob(ellipsePts(124, -30, 7, 6, 12), NOSE, { width: lw * 0.8 });
  pen.blob(ellipsePts(122, -32, 2, 1.4, 6), WHITE, { stroke: false });
  // Content closed eyes.
  for (const ex of [70, 90]) pen.line([{ x: ex - 7, y: -40 }, { x: ex, y: -34 }, { x: ex + 7, y: -40 }], { width: lw * 1.3 });
  // Tongue flopped out the side.
  const tw = Math.sin(t * 4) * 2;
  pen.blob(
    [
      { x: 96, y: -16 },
      { x: 106, y: -16 },
      { x: 108 + tw, y: -4 },
      { x: 102 + tw, y: 2 },
      { x: 96 + tw, y: -4 },
    ],
    TONGUE,
    { width: lw * 0.9 },
  );
  // Floating hearts.
  for (let i = 0; i < 3; i++) {
    const ph = (st.deathT * 0.9 + i * 0.33) % 1;
    ctx.save();
    ctx.globalAlpha *= Math.sin(ph * Math.PI);
    heart(ctx, 20 + i * 30 + Math.sin(ph * 8 + i) * 6, -100 - ph * 60, 7, lw);
    ctx.restore();
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'good-boy',
  height: H,
  width: 220,
  gait: 'waddle',
  friendly: true,
  deathText: '*flops for belly rubs*',
  draw(g, st) {
    const { ctx, pen, lw, t } = g;
    if (st.mode === 'death' || st.mode === 'dead') {
      flop(g, st);
      return;
    }
    const idle = st.mode === 'idle';
    const play = st.hit > 0.15;
    const m = st.moving;
    const w = st.walk;

    // Tail: always wagging; frantic when playing.
    const wagSpeed = play ? 26 : idle ? 20 : 15;
    const wag = Math.sin(t * wagSpeed) * (play ? 0.5 : 0.38);
    tail(g, -80, -92, -2.3, wag);

    // Far legs.
    leg(g, -50, -56, w + Math.PI, m, FAR);
    leg(g, 26, -58, w, m, FAR);

    // Body + chest fluff.
    pen.blob(fluffy(-18, -78, 74, 40, 40, 0.1), soft(ctx, -30, -96, 90, GOLD_L, GOLD, GOLD_D));
    pen.line([{ x: -70, y: -102 }, { x: -46, y: -112 }, { x: -20, y: -115 }], { color: WHITE, width: lw * 1.4, alpha: 0.5 });

    // Near legs.
    leg(g, -36, -52, w, m, GOLD);
    leg(g, 40, -54, w + Math.PI, m, GOLD);
    pen.blob(fluffy(36, -84, 28, 34, 22, 0.1), soft(ctx, 30, -96, 34, '#FFF8EA', CREAM, '#EBCF9C'));

    // Head group (idle = the adorable head tilt).
    const tilt = idle ? Math.sin(t * 1.1) * 0.22 : Math.sin(w) * 0.05 * m + (play ? -0.12 : 0);
    const hb = idle ? 0 : Math.abs(Math.sin(w)) * 2 * m;
    ctx.save();
    ctx.translate(48, -108 - hb);
    ctx.rotate(tilt);
    ctx.translate(-48, 108);

    // Far ear peeking behind.
    pen.blob(ellipsePts(72, -150, 12, 16, 14), EAR, { width: lw * 0.9 });
    // Head.
    pen.blob(fluffy(56, -124, 40, 36, 30, 0.06), soft(ctx, 46, -138, 42, GOLD_L, GOLD, GOLD_D));
    // Collar + heart tag.
    pen.tube(
      [
        { x: 24, y: -106 },
        { x: 40, y: -96 },
        { x: 58, y: -92 },
      ],
      8,
      '#D2483C',
    );
    const ts = Math.sin(t * 5) * 0.3 + Math.sin(w * 2) * 0.3 * m;
    ctx.save();
    ctx.translate(46, -93);
    ctx.rotate(ts);
    pen.line([{ x: 0, y: 0 }, { x: 0, y: 6 }], { width: lw * 0.8 });
    ctx.restore();
    const tx = 46 + Math.sin(ts) * -8;
    const ty = -93 + Math.cos(ts) * 8;
    ctx.save();
    ctx.translate(tx, ty + 4);
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-8, 0, -4, -6, 0, -2);
    ctx.bezierCurveTo(4, -6, 8, 0, 0, 6);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.restore();

    // Snout, open happy mouth, lolling tongue.
    const pant = idle ? Math.sin(t * 9) : Math.sin(w * 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(76, -104);
    ctx.quadraticCurveTo(90, -84 - pant * 1.5, 104, -104);
    ctx.closePath();
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
    const tlen = 22 + pant * 3 + (play ? 6 : 0);
    const tsw = Math.sin(w * 2) * 3 * m + (idle ? Math.sin(t * 9) * 1.5 : 0);
    pen.blob(
      [
        { x: 82, y: -100 },
        { x: 96, y: -100 },
        { x: 97 + tsw, y: -100 + tlen * 0.6 },
        { x: 90 + tsw, y: -100 + tlen },
        { x: 83 + tsw, y: -100 + tlen * 0.6 },
      ],
      soft(ctx, 88, -94, 14, '#FFB3C0', TONGUE, '#D96E84'),
      { width: lw * 0.9 },
    );
    pen.line([{ x: 89, y: -98 }, { x: 89.5 + tsw * 0.8, y: -100 + tlen * 0.7 }], { color: '#D96E84', width: lw * 0.8 });
    pen.blob(fluffy(90, -112, 26, 15, 20, 0.04), soft(ctx, 86, -118, 26, '#FFF8EA', CREAM, '#E9CFA0'));
    pen.line([{ x: 104, y: -112 }, { x: 104, y: -104 }], { width: lw * 0.9 });
    pen.line([{ x: 92, y: -103 }, { x: 104, y: -104 }, { x: 113, y: -106 }], { width: lw * 0.9 });
    pen.blob(ellipsePts(112, -118, 8.5, 6.5, 14), soft(ctx, 110, -120, 8, '#6A6478', NOSE, '#2B2633'), { width: lw * 0.8 });
    pen.blob(ellipsePts(109, -121, 2.6, 1.6, 8), WHITE, { stroke: false });

    // Eyes + happy brows (and the only blush allowed on this side of the war).
    pen.blob(ellipsePts(70, -118, 7, 4, 10), 'rgba(244,150,170,0.55)', { stroke: false });
    eye(g, st, 54, -134, 8.5, play);
    eye(g, st, 78, -132, 10, play);
    const bu = play ? -4 : 0;
    pen.line([{ x: 47, y: -149 + bu }, { x: 54, y: -153 + bu }, { x: 60, y: -150 + bu }], { color: GOLD_D, width: lw * 1.6 });
    pen.line([{ x: 71, y: -150 + bu }, { x: 79, y: -155 + bu }, { x: 87, y: -151 + bu }], { color: GOLD_D, width: lw * 1.6 });

    // Near ear: big floppy, bouncing with each step (perks up when playing).
    const flap = Math.sin(w * 2) * 0.16 * m + (idle ? Math.sin(t * 1.1) * 0.1 : 0) + (play ? -0.7 * st.hit : 0);
    ctx.save();
    ctx.translate(30, -146);
    ctx.rotate(flap);
    pen.blob(
      [
        { x: -4, y: -4 },
        { x: 10, y: -2 },
        { x: 14, y: 16 },
        { x: 10, y: 34 },
        { x: 0, y: 42 },
        { x: -10, y: 36 },
        { x: -14, y: 16 },
      ],
      soft(ctx, -2, 8, 30, '#E8B26A', EAR, '#B07A36'),
    );
    pen.line([{ x: -6, y: 8 }, { x: -6, y: 26 }], { color: '#B07A36', width: lw * 0.8, alpha: 0.7 });
    ctx.restore();
    ctx.restore();

    // The tennis ball: dribbled along while walking, set down hopefully in idle.
    const bounce = Math.abs(Math.sin(w * 0.9)) * 30 * m;
    const bx = 132;
    const by = idle ? -11 : -11 - bounce - (play ? 24 * st.hit : 0);
    ball(g, bx, by, 11, t * 3 * m);
    if (idle && Math.sin(t * 0.9) > 0.3) fxText(ctx, 'throw it?', 104, -178, 12, INK, Math.min(1, (Math.sin(t * 0.9) - 0.3) * 4));
    if (play) fxText(ctx, 'FRIEND?!', 30, -184, 14, '#C0533F', st.hit);
  },
};
