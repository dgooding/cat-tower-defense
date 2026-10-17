// @ts-check
// Snip & Snap: twin chrome nail clippers with clacking toothy jaws and furious eyebrows.
// Drawn as one spec; their jaws clack in alternation with the hop. Snip has a pink grip, Snap a blue one.
// Idle fidget: they turn to face each other and bicker (clack clack!).
import { googlyEye, tinyLegs, ellipsePts, soft } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const CHROME = '#C9D3E8';
const CHROME_L = '#F5F8FD';
const CHROME_D = '#8792AB';
const MOUTH = '#6B3A47';
const TOOTH = '#FFFDF6';
const HINGE = { x: -32, y: -46 };

/** @param {Pt} p @param {number} a */
function rotH(p, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: HINGE.x + (p.x - HINGE.x) * c - (p.y - HINGE.y) * s, y: HINGE.y + (p.x - HINGE.x) * s + (p.y - HINGE.y) * c };
}

/**
 * One clipper, facing +x, feet at y=0.
 * @param {EGeo} g @param {EnemyState} st @param {string} key @param {number} open 0..1
 * @param {string} grip @param {boolean} hit
 */
function clipper(g, st, key, open, grip, hit) {
  const { pen, ctx, lw } = g;
  tinyLegs(g, st, 0, -24, 9, { shoe: grip });
  const a = -open * 0.42;

  // Lower jaw.
  pen.blob(
    [
      { x: -36, y: -46 },
      { x: -39, y: -35 },
      { x: -30, y: -24 },
      { x: 24, y: -24 },
      { x: 38, y: -30 },
      { x: 43, y: -42 },
      { x: 40, y: -47 },
      { x: 0, y: -45 },
    ],
    soft(ctx, -6, -36, 44, CHROME_L, CHROME, CHROME_D),
  );
  // Upper jaw is hinged at the back; it and everything riding on it rotate by `a`.

  // Mouth wedge + teeth.
  if (open > 0.04) {
    const uf = rotH({ x: 42, y: -49 }, a);
    pen.blob([{ x: HINGE.x + 4, y: HINGE.y - 1 }, uf, { x: 41, y: -46 }], MOUTH, { width: lw * 0.8 });
    ctx.fillStyle = TOOTH;
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 7;
      ctx.beginPath();
      ctx.moveTo(x - 3, -45.5);
      ctx.lineTo(x, -45.5 - 4 - open * 2);
      ctx.lineTo(x + 3, -45.5);
      ctx.closePath();
      ctx.fill();
      const b0 = rotH({ x: x - 3, y: -48.5 }, a);
      const b1 = rotH({ x, y: -48.5 + 4 + open * 2 }, a);
      const b2 = rotH({ x: x + 3, y: -48.5 }, a);
      ctx.beginPath();
      ctx.moveTo(b0.x, b0.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(a);
  ctx.translate(-HINGE.x, -HINGE.y);
  // Lever with a rubber grip, resting on the pin.
  pen.tube(
    [
      { x: 30, y: -84 },
      { x: 0, y: -92 },
      { x: -26, y: -96 },
    ],
    7,
    CHROME,
  );
  pen.tube(
    [
      { x: -14, y: -94 },
      { x: -30, y: -97 },
      { x: -40, y: -104 },
    ],
    10,
    grip,
  );
  pen.blob(
    [
      { x: -38, y: -48 },
      { x: -41, y: -62 },
      { x: -31, y: -78 },
      { x: 8, y: -83 },
      { x: 32, y: -77 },
      { x: 43, y: -63 },
      { x: 43, y: -50 },
      { x: 0, y: -48 },
    ],
    soft(ctx, -8, -70, 46, CHROME_L, CHROME, CHROME_D),
  );
  pen.blob(ellipsePts(30, -82, 4.5, 4.5, 10), CHROME_D, { width: lw * 0.8 });
  // Shine streak.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-20, -72, 9, 2.6, -0.25, 0, Math.PI * 2);
  ctx.fill();
  // Angry face on the upper jaw.
  const lid = hit ? 0 : 0.32;
  googlyEye(g, st, key + 'l', 2, -63, 10, { lid, lidTilt: 0.18, lidColor: CHROME, pupil: 0.55 });
  googlyEye(g, st, key + 'r', 23, -63, 9, { lid, lidTilt: -0.18, lidColor: CHROME, pupil: 0.55 });
  const bu = hit ? -5 : 0;
  pen.line([{ x: -10, y: -80 + bu }, { x: 0, y: -77 + bu }, { x: 10, y: -72 + bu }], { width: lw * 1.9 });
  pen.line([{ x: 15, y: -72 + bu }, { x: 24, y: -77 + bu }, { x: 33, y: -79 + bu }], { width: lw * 1.9 });
  ctx.restore();
  // Hinge rivet.
  pen.blob(ellipsePts(HINGE.x, HINGE.y, 5.5, 5.5, 10), soft(ctx, HINGE.x, HINGE.y, 6, CHROME_L, CHROME, CHROME_D), { width: lw * 0.8 });
  // Clack sparks when the jaws slam shut.
  if (open < 0.08 && st.moving + (st.mode === 'idle' ? 1 : 0) > 0.3) {
    pen.line([{ x: 48, y: -54 }, { x: 55, y: -58 }], { width: lw * 0.8 });
    pen.line([{ x: 49, y: -45 }, { x: 57, y: -45 }], { width: lw * 0.8 });
    pen.line([{ x: 48, y: -37 }, { x: 55, y: -33 }], { width: lw * 0.8 });
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'snip-snap',
  height: 120,
  width: 150,
  gait: 'hop',
  deathText: 'clack…',
  draw(g, st) {
    const { ctx } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const idle = st.mode === 'idle';
    const twins = [
      { key: 'snip', x: -40, phase: 0, grip: '#E07D95', face: 1 },
      { key: 'snap', x: 40, phase: Math.PI * 0.5, grip: '#6D9BD1', face: idle ? -1 : 1 },
    ];
    for (const tw of twins) {
      let open;
      if (hit) open = 0.7 + Math.sin(st.t * 40 + tw.phase) * 0.3;
      else if (dying) open = 1;
      else if (idle) open = Math.pow(Math.max(0, Math.sin(st.t * 7 + tw.phase * 2)), 0.6);
      else open = Math.pow(Math.max(0, Math.sin(st.walk * 1.5 + tw.phase)), 0.7) * st.moving;
      const bob = -Math.max(0, Math.sin(st.walk + tw.phase)) * 6 * st.moving;
      ctx.save();
      ctx.translate(tw.x, bob);
      ctx.scale(tw.face * 0.85, 0.85);
      clipper(g, st, tw.key, open, tw.grip, hit);
      ctx.restore();
    }
  },
};
