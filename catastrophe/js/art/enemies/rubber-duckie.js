// @ts-check
// Rubber Duckie: a classic yellow bath duck with a scheming half-lidded glare and tiny paddling feet.
// Comes in swarms (drawn at half scale). Idle fidget: a smug little squeak.
import { googlyEye, ellipsePts, soft } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const DUCK = '#FFD84A';
const DUCK_L = '#FFF4AE';
const DUCK_D = '#E3A22A';
const BEAK = '#F59A3A';
const BEAK_L = '#FFC889';
const BEAK_D = '#D8712A';

/** @param {Pt[]} pts @param {number} px @param {number} py @param {number} a */
function rot(pts, px, py, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map((p) => ({ x: px + (p.x - px) * c - (p.y - py) * s, y: py + (p.x - px) * s + (p.y - py) * c }));
}

/** @param {EGeo} g @param {EnemyState} st */
function feet(g, st) {
  const { pen, lw } = g;
  for (const s of [-1, 1]) {
    const ph = Math.sin(st.walk * 1.4 + (s > 0 ? Math.PI : 0)) * st.moving;
    const x = -4 + s * 10 + ph * 5;
    const lift = Math.max(0, ph) * 5;
    pen.blob(
      [
        { x: x - 6, y: -lift - 6 },
        { x: x + 2, y: -lift - 6 },
        { x: x + 11, y: -lift - 1 },
        { x: x + 9, y: -lift + 1 },
        { x: x - 6, y: -lift + 1 },
      ],
      BEAK,
      { width: lw * 0.8 },
    );
  }
}

/** @param {EGeo} g @param {EnemyState} st @param {number} open */
function beak(g, st, open) {
  const { pen, ctx, lw } = g;
  const px = 27;
  const py = -47;
  if (open > 0.05) {
    pen.blob(
      [
        { x: px, y: py - 2 },
        { x: px + 14, y: py - 2 + open * 2 },
        { x: px + 12, y: py + 4 + open * 8 },
        { x: px, y: py + 3 },
      ],
      '#7A3A47',
      { width: lw * 0.7 },
    );
  }
  const lower = rot(
    [
      { x: px - 1, y: py },
      { x: px + 13, y: py - 1 },
      { x: px + 11, y: py + 5 },
      { x: px + 1, y: py + 5 },
    ],
    px,
    py,
    open * 0.55,
  );
  pen.blob(lower, BEAK_D, { width: lw * 0.85 });
  const upper = rot(
    [
      { x: px - 2, y: py - 8 },
      { x: px + 8, y: py - 9 },
      { x: px + 17, y: py - 4 },
      { x: px + 16, y: py },
      { x: px + 4, y: py + 1 },
      { x: px - 2, y: py + 1 },
    ],
    px,
    py,
    -open * 0.2,
  );
  pen.blob(upper, soft(ctx, px + 6, py - 6, 12, BEAK_L, BEAK, BEAK_D), { width: lw * 0.9 });
  // Smirk crease at the beak corner.
  pen.line([{ x: px - 1, y: py - 1 }, { x: px - 4, y: py - 4 }], { width: lw * 0.8 });
  if (open > 0.3) {
    // Squeak lines.
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (open - 0.3) * 3);
    for (const [a, l] of [[-0.5, 9], [0, 11], [0.5, 9]]) {
      const sx = px + 21 + Math.cos(a) * 3;
      const sy = py - 1 + Math.sin(a) * 3;
      pen.line([{ x: sx, y: sy }, { x: sx + Math.cos(a) * l, y: sy + Math.sin(a) * l }], { width: lw * 0.9 });
    }
    ctx.restore();
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'rubber-duckie',
  height: 80,
  width: 80,
  gait: 'waddle',
  scale: 0.5,
  deathText: 'squeak!',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const c = st.t % 1.9;
    const squeak = st.mode === 'idle' ? Math.max(0, Math.sin(Math.min(1, c / 0.35) * Math.PI)) : 0;
    const open = hit ? Math.min(1, st.hit * 1.3) : dying ? 1 : squeak;

    feet(g, st);
    // Tail flick.
    const flick = Math.sin(st.walk) * 0.12 * st.moving + (hit ? Math.sin(st.t * 30) * 0.2 : 0);
    pen.blob(
      rot(
        [
          { x: -28, y: -24 },
          { x: -42, y: -42 },
          { x: -38, y: -46 },
          { x: -22, y: -38 },
        ],
        -28,
        -30,
        flick,
      ),
      DUCK_D,
    );
    // Body with a flat bottom.
    pen.blob(
      ellipsePts(-3, -22, 35, 21, 26, (a) => (Math.sin(a) > 0 ? 1 - 0.18 * Math.sin(a) ** 3 : 1)),
      soft(ctx, -12, -32, 40, DUCK_L, DUCK, DUCK_D),
    );
    // Wing.
    const flap = hit ? Math.sin(st.t * 40) * 0.3 * st.hit : Math.sin(st.walk) * 0.06 * st.moving;
    pen.blob(
      rot(
        [
          { x: -22, y: -30 },
          { x: -6, y: -34 },
          { x: 4, y: -28 },
          { x: -2, y: -18 },
          { x: -14, y: -17 },
          { x: -24, y: -23 },
        ],
        -6,
        -30,
        flap,
      ),
      soft(ctx, -10, -28, 16, DUCK, DUCK, DUCK_D),
      { width: lw * 0.8 },
    );
    pen.line([{ x: -16, y: -25 }, { x: -8, y: -23 }, { x: -2, y: -26 }], { width: lw * 0.55, color: DUCK_D });
    // Head.
    pen.blob(ellipsePts(13, -50, 18, 17, 22), soft(ctx, 8, -56, 20, DUCK_L, DUCK, DUCK_D));
    // Little forelock tuft.
    pen.line([{ x: 8, y: -66 }, { x: 10, y: -72 }, { x: 15, y: -70 }], { width: lw * 1 });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(4, -60, 4, 2.4, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-20, -32, 6, 2.6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    beak(g, st, open);
    const lid = hit ? 0 : 0.45;
    googlyEye(g, st, 'rd-l', 9, -55, 7.5, { lid, lidTilt: 0.12, lidColor: DUCK, pupil: 0.55 });
    googlyEye(g, st, 'rd-r', 22, -56, 6.5, { lid, lidTilt: -0.1, lidColor: DUCK, pupil: 0.55 });
    const bu = hit ? -4 : 0;
    pen.line([{ x: 2, y: -65 + bu }, { x: 13, y: -62 + bu }], { width: lw * 1.1 });
    pen.line([{ x: 18, y: -63 + bu }, { x: 27, y: -65 + bu }], { width: lw * 1.1 });
  },
};
