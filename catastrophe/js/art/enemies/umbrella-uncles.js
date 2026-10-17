// @ts-check
// Umbrella Uncles: two terribly polite umbrellas in bow ties and hats, with
// splendid mustaches, walking on their own crooked handles like canes. Bonk
// one and its canopy whips inside-out.
import { googlyEye, tinyLegs, ellipsePts, soft, INK, WHITE } from './enemyrig.js';
/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {{x:number,y:number}} Pt */

const H = 190;
const WOOD = '#7A4E33';

/**
 * @typedef {Object} Uncle
 * @property {number} x @property {number} k scale @property {string} key
 * @property {string} col @property {string} colL @property {string} colD
 * @property {string} stache @property {string} tie @property {'top'|'bowler'} hat
 * @property {number} walkOff @property {number} tipPhase
 */

/** @type {Uncle[]} */
const UNCLES = [
  { x: -46, k: 0.9, key: 'ua', col: '#3E4C7A', colL: '#7486C2', colD: '#27315A', stache: '#EFE8DA', tie: '#F2C14E', hat: 'top', walkOff: 1.7, tipPhase: 0 },
  { x: 46, k: 1, key: 'ub', col: '#9C3B4A', colL: '#D27484', colD: '#682430', stache: '#C46A3A', tie: '#8FD1C8', hat: 'bowler', walkOff: 0, tipPhase: Math.PI },
];

/** @param {EGeo} g @param {number} y @param {string} col */
function bowTie(g, y, col) {
  const { pen, lw } = g;
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: 0, y },
        { x: s * 13, y: y - 7 },
        { x: s * 15, y: y + 1 },
        { x: s * 13, y: y + 8 },
      ],
      col,
      { width: lw * 0.8 },
    );
  }
  pen.blob(ellipsePts(0, y + 0.5, 3.6, 4, 10), col, { width: lw * 0.8 });
}

/** @param {EGeo} g @param {Uncle} u @param {number} x @param {number} y @param {number} lift */
function hat(g, u, x, y, lift) {
  const { ctx, pen, lw } = g;
  ctx.save();
  ctx.translate(x, y - lift * 16);
  ctx.rotate(-lift * 0.5);
  if (u.hat === 'top') {
    pen.blob(
      [
        { x: -10, y: -2 },
        { x: -10, y: -2 },
        { x: -11, y: -30 },
        { x: -11, y: -30 },
        { x: 11, y: -30 },
        { x: 11, y: -30 },
        { x: 10, y: -2 },
        { x: 10, y: -2 },
      ],
      soft(ctx, -4, -18, 18, '#6A6478', '#4A4458', '#34303F'),
      { width: lw * 0.9 },
    );
    pen.blob(
      [
        { x: -10, y: -10 },
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: -4 },
        { x: 10, y: -4 },
        { x: -10, y: -4 },
        { x: -10, y: -4 },
      ],
      u.tie,
      { width: lw * 0.6 },
    );
    pen.blob(ellipsePts(0, -1, 17, 4, 16), '#4A4458', { width: lw * 0.9 });
  } else {
    pen.blob(ellipsePts(0, -1, 18, 4.5, 16), '#5E4A3A', { width: lw * 0.9 });
    /** @type {Pt[]} */
    const dome = [];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      dome.push({ x: Math.cos(a) * 12, y: -3 + Math.sin(a) * 15 });
    }
    pen.blob(dome, soft(ctx, -3, -12, 14, '#8A6E58', '#5E4A3A', '#3F3126'), { width: lw * 0.9 });
    pen.line([{ x: -11, y: -5 }, { x: 11, y: -5 }], { color: u.tie, width: lw * 1.2 });
  }
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st0 @param {Uncle} u */
function drawUncle(g, st0, u) {
  const { ctx, pen, lw, t } = g;
  const st = { ...st0, walk: st0.walk + u.walkOff };
  const idle = st.mode === 'idle';
  const ouch = st.hit > 0.3;
  const lift = idle ? Math.max(0, Math.sin(t * 1.5 + u.tipPhase)) ** 3 : 0;
  ctx.save();
  ctx.translate(u.x, 0);
  ctx.scale(u.k, u.k);
  // A polite little bow when tipping the hat.
  ctx.rotate(lift * 0.12);

  const rimY = -88;
  const top = -156;
  const RX = 58;

  tinyLegs(g, st, 0, -42, 11, { shoe: '#4A4458' });

  // Shaft + crooked handle planted like a walking cane.
  const cx = Math.sin(st.walk) * 9 * st.moving;
  pen.tube(
    [
      { x: 0, y: top + 4 },
      { x: 0, y: rimY },
      { x: cx * 0.6, y: -50 },
      { x: cx, y: -20 },
      { x: cx + 1, y: -6 },
      { x: cx + 8, y: -1.5 },
      { x: cx + 15, y: -6 },
      { x: cx + 15, y: -13 },
    ],
    5,
    WOOD,
  );
  bowTie(g, rimY + 5, u.tie);

  // Canopy, whipped inside-out by a bonk.
  const f = Math.max(0, Math.min(1, (st.hit - 0.25) / 0.3));
  const s = 1 - 1.65 * f;
  const rim = top + 70 * s;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    pts.push({ x: Math.cos(a) * RX, y: top + (70 + Math.sin(a) * 70) * s });
  }
  /** @type {number[]} */
  const ribX = [];
  for (let j = 0; j <= 6; j++) ribX.push(RX - j * ((RX * 2) / 6));
  for (let j = 0; j < 6; j++) {
    pts.push({ x: ribX[j], y: rim + 4 * s });
    pts.push({ x: (ribX[j] + ribX[j + 1]) / 2, y: rim - 7 * s });
  }
  pen.blob(pts, soft(ctx, -18, top + 26 * s, 70, u.colL, u.col, u.colD));
  for (let j = 1; j < 6; j++) {
    const x = ribX[j];
    pen.line(
      [
        { x: 0, y: top },
        { x: x * 0.82, y: top + 34 * s },
        { x, y: rim + 4 * s },
      ],
      { color: u.colD, width: lw * 0.9, alpha: 0.55 },
    );
  }
  for (const x of ribX) pen.blob(ellipsePts(x, rim + 5 * s, 2.4, 2.4, 8), '#E8DCC8', { width: lw * 0.5 });
  pen.line([{ x: -RX * 0.62, y: top + 40 * s }, { x: -RX * 0.4, y: top + 16 * s }], { color: WHITE, width: lw * 1.4, alpha: 0.5 });
  // Ferrule + hat.
  pen.line([{ x: 0, y: top }, { x: 0, y: top - 10 }], { width: lw * 1.6 });
  hat(g, u, 0, top - 9, lift);

  // Face on the canopy.
  const fy = top + 52 * s;
  const lidV = ouch ? 0 : idle ? 0.35 + lift * 0.45 : 0.42;
  const bu = ouch ? -5 : 0;
  pen.line([{ x: -27, y: fy - 31 + bu }, { x: -8, y: fy - 28 + bu }], { color: u.stache, width: lw * 2.8 });
  pen.line([{ x: 8, y: fy - 28 + bu }, { x: 27, y: fy - 31 + bu }], { color: u.stache, width: lw * 2.8 });
  googlyEye(g, st, u.key + 'L', -15, fy - 15, 11, { lid: lidV, lidColor: u.colL, pupil: 0.5 });
  googlyEye(g, st, u.key + 'R', 15, fy - 15, 11, { lid: lidV, lidColor: u.colL, pupil: 0.5 });
  if (ouch) pen.blob(ellipsePts(0, fy + 12, 4, 5, 10), '#6B3A47', { width: lw * 0.8 });
  // Splendid handlebar mustache (bristles up when startled).
  const curl = ouch ? -5 : Math.sin(t * 2 + u.tipPhase) * 1.2;
  for (const sd of [-1, 1]) {
    pen.tube(
      [
        { x: 0, y: fy + 1 },
        { x: sd * 10, y: fy + 5 },
        { x: sd * 21, y: fy + 4 + curl * 0.5 },
        { x: sd * 29, y: fy - 2 + curl },
        { x: sd * 27, y: fy - 7 + curl },
      ],
      6,
      u.stache,
    );
  }
  pen.blob(ellipsePts(0, fy - 2, 5, 4.4, 10), u.colD, { width: lw * 0.8 });
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'umbrella-uncles',
  height: H,
  width: 200,
  gait: 'waddle',
  deathText: 'Good day, sirs!',
  draw(g, st) {
    const { ctx, pen, lw } = g;
    for (const u of UNCLES) drawUncle(g, st, u);
    if (st.hit > 0.3) {
      ctx.save();
      ctx.globalAlpha *= st.hit;
      for (let k = 0; k < 3; k++) {
        const y = -170 + k * 14;
        pen.line([{ x: -110, y }, { x: -86, y: y - 4 }, { x: -70, y }], { width: lw, color: INK });
      }
      ctx.restore();
    }
  },
};
