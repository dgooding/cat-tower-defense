// @ts-check
// Tubby McSoak: a mint clawfoot bathtub in a polka-dot shower cap, foaming with bubbles
// that bob and spill over the rim, with a rubber duck peeking out. "Who wants a bath?"
// Idle fidget: blows a big bubble that pops.
import { googlyEye, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const TUB = '#BFE6D3';
const TUB_L = '#EAF8F0';
const TUB_D = '#86BFA3';
const ENAMEL = '#FBF7EE';
const BRASS = '#E0AE4E';
const BRASS_L = '#F8DC94';
const BRASS_D = '#A87A2C';
const CAP = '#F4A6B7';
const CAP_L = '#FFD8E1';
const CAP_D = '#D47A93';
const FOAM = '#FFFDF6';
const FOAM_D = '#CFE6F0';
const DUCK = '#FFD84A';

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** @param {EGeo} g @param {number} x @param {number} y @param {number} r @param {number} [a] */
function bubble(g, x, y, r, a = 1) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.globalAlpha *= a;
  pen.blob(ellipsePts(x, y, r, r, 14), soft(ctx, x, y, r, '#FFFFFF', FOAM, FOAM_D), { width: lw * 0.8 });
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.4, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Claw foot. @param {EGeo} g @param {EnemyState} st @param {number} x @param {number} dir @param {number} phase @param {boolean} back */
function clawFoot(g, st, x, dir, phase, back) {
  const { pen, ctx, lw } = g;
  const ph = Math.sin(st.walk + phase) * st.moving;
  const lift = Math.max(0, ph) * 12;
  const fx = x + dir * 8 + ph * 7;
  ctx.save();
  if (back) ctx.globalAlpha *= 1;
  const fill = back ? BRASS_D : BRASS;
  pen.tube(
    [
      { x, y: -44 },
      { x: x + dir * 2, y: -26 - lift * 0.5 },
      { x: fx, y: -12 - lift },
    ],
    12,
    fill,
  );
  pen.blob(ellipsePts(fx, -9 - lift, 10, 8, 12), back ? BRASS_D : soft(ctx, fx - 2, -12 - lift, 10, BRASS_L, BRASS, BRASS_D));
  for (const t of [-1, 0, 1]) {
    pen.blob(ellipsePts(fx + t * 7 + dir * 3, -3 - lift, 4.2, 3.6, 8), back ? BRASS_D : BRASS, { width: lw * 0.7 });
  }
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st @param {number} jump */
function duck(g, st, jump) {
  const { pen, ctx, lw } = g;
  const x = 98;
  const y = -136 + Math.sin(st.t * 2.6) * 2 - jump * 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(st.t * 2) * 0.12 + jump * 0.6);
  pen.blob(ellipsePts(-2, 8, 15, 9, 14), soft(ctx, -4, 4, 14, '#FFF4AE', DUCK, '#E3A22A'), { width: lw * 0.8 });
  pen.blob(ellipsePts(0, -6, 11, 10.5, 16), soft(ctx, -3, -9, 12, '#FFF4AE', DUCK, '#E3A22A'), { width: lw * 0.8 });
  pen.blob(
    [
      { x: 8, y: -7 },
      { x: 19, y: -5 },
      { x: 18, y: -1 },
      { x: 9, y: 0 },
    ],
    '#F59A3A',
    { width: lw * 0.8 },
  );
  googlyEye(g, st, 'tm-duck', 3, -9, 4.6, { lid: jump > 0.2 ? 0 : 0.5, lidColor: DUCK, pupil: 0.55 });
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st @param {boolean} hit */
function showerCap(g, st, hit) {
  const { pen, ctx, lw } = g;
  ctx.save();
  const sway = Math.sin(st.t * 1.7) * 0.03 + Math.sin(st.walk) * 0.03 * st.moving - (hit ? st.hit * 0.15 : 0);
  ctx.translate(-6, -166 - (hit ? st.hit * 12 : 0));
  ctx.rotate(sway);
  const dome = ellipsePts(0, 0, 60, 44, 28, (a) => (Math.sin(a) > 0 ? 0.2 : 1));
  const w = pen.blob(dome, soft(ctx, -16, -18, 64, CAP_L, CAP, CAP_D));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,253,246,0.9)';
  for (const [dx, dy] of [[-38, -12], [-18, -28], [4, -14], [26, -30], [40, -10], [-4, -36], [18, -2], [-26, 0]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Frilly elastic band.
  /** @type {Pt[]} */
  const frill = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? 1 : 1.07;
    frill.push({ x: Math.cos(a) * 63 * r, y: 6 + Math.sin(a) * 6 * r });
  }
  pen.blob(frill, CAP_L, { width: lw * 0.85 });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-28, -28, 12, 4, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'tubby-mcsoak',
  height: 200,
  width: 260,
  gait: 'waddle',
  deathText: 'glub glub',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const jig = 1 + st.moving * 1.5 + st.hit * 3;

    // Back feet (darker), then front feet.
    clawFoot(g, st, -62, -1, Math.PI, true);
    clawFoot(g, st, 102, 1, 0, true);

    // Bubble mound inside the tub (behind the body).
    const mound = [
      [-104, -128, 15], [-84, -138, 19], [-58, -150, 20], [-30, -156, 21], [0, -158, 22], [30, -156, 21], [58, -150, 20],
      [84, -142, 18], [108, -130, 15], [-70, -128, 16], [70, -128, 16], [-76, -160, 13], [72, -162, 12],
    ];
    mound.forEach(([x, y, r], i) => bubble(g, x, y + Math.sin(st.t * 2.2 + i * 1.3) * 2.5 * jig, r));

    // Tub body.
    /** @type {Pt[]} */
    const body = [
      { x: -124, y: -126 },
      { x: -120, y: -104 },
      { x: -110, y: -72 },
      { x: -92, y: -48 },
      { x: -60, y: -36 },
      { x: 0, y: -32 },
      { x: 60, y: -36 },
      { x: 92, y: -48 },
      { x: 110, y: -72 },
      { x: 120, y: -104 },
      { x: 124, y: -122 },
      { x: 60, y: -116 },
      { x: 0, y: -114 },
      { x: -60, y: -117 },
    ];
    pen.blob(body, soft(ctx, -40, -100, 140, TUB_L, TUB, TUB_D));
    // Enamel-white inner band peeking under the rim.
    pen.line(
      [
        { x: -116, y: -112 },
        { x: -60, y: -107 },
        { x: 0, y: -105 },
        { x: 60, y: -107 },
        { x: 116, y: -110 },
      ],
      { width: 3, color: 'rgba(255,255,255,0.6)', amp: 0 },
    );
    // Front feet.
    clawFoot(g, st, -84, -1, 0, false);
    clawFoot(g, st, 80, 1, Math.PI, false);

    // Rolled rim.
    pen.tube(
      [
        { x: -130, y: -128 },
        { x: -60, y: -120 },
        { x: 0, y: -118 },
        { x: 60, y: -120 },
        { x: 130, y: -125 },
      ],
      11,
      ENAMEL,
    );

    // Foam spilling over the rim.
    const drip = (/** @type {number} */ x, /** @type {number} */ len, /** @type {number} */ i) => {
      const l = len + Math.sin(st.t * 1.6 + i) * 3;
      pen.blob(
        [
          { x: x - 9, y: -124 },
          { x: x + 9, y: -124 },
          { x: x + 7, y: -124 + l * 0.7 },
          { x: x + 3, y: -124 + l },
          { x: x - 3, y: -124 + l },
          { x: x - 7, y: -124 + l * 0.7 },
        ],
        FOAM,
        { width: lw * 0.8 },
      );
    };
    drip(-92, 22, 0);
    drip(44, 16, 1);
    const front = [[-112, -126, 12], [-90, -128, 13], [-40, -126, 11], [18, -124, 12], [52, -126, 10], [116, -126, 11]];
    front.forEach(([x, y, r], i) => bubble(g, x, y + Math.sin(st.t * 2.6 + i * 2.1) * 2 * jig, r));

    duck(g, st, hit ? st.hit : 0);
    showerCap(g, st, hit);

    // Face.
    const lid = hit ? 0 : 0.4;
    googlyEye(g, st, 'tm-l', -32, -86, 16, { lid, lidTilt: 0.12, lidColor: TUB, pupil: 0.5 });
    googlyEye(g, st, 'tm-r', 14, -87, 15, { lid, lidTilt: -0.12, lidColor: TUB, pupil: 0.5 });
    const bu = hit ? -8 : 0;
    pen.line([{ x: -50, y: -106 + bu }, { x: -33, y: -104 + bu }, { x: -18, y: -100 + bu }], { width: lw * 1.7 });
    pen.line([{ x: 0, y: -100 + bu }, { x: 15, y: -104 + bu }, { x: 31, y: -106 + bu }], { width: lw * 1.7 });
    if (hit) mouth(g, -8, -66, 10, 'o');
    else mouth(g, -8, -66, 28, 'grin');

    // Splash on hit.
    if (st.hit > 0.05 && !dying) {
      const k = 1 - st.hit;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.4;
        const d = 30 + k * 60;
        const x = -8 + Math.cos(a) * d * 1.6;
        const y = -170 + Math.sin(a) * d + k * k * 60;
        pen.blob(ellipsePts(x, y, 4, 5.5, 10, (b) => 1 + (Math.sin(b) < 0 ? -Math.sin(b) * 0.5 : 0)), '#9FD3EA', { width: lw * 0.6 });
      }
    }

    // Idle: a big bubble floats up and pops.
    if (st.mode === 'idle' && !hit) {
      const u = (st.t % 2.6) / 2.6;
      const bx = 40 + Math.sin(u * 6) * 6;
      const by = -170 - u * 50;
      if (u < 0.82) {
        bubble(g, bx, by, 6 + smooth(0, 0.6, u) * 12, 0.9);
      } else {
        const k = (u - 0.82) / 0.18;
        ctx.save();
        ctx.globalAlpha *= 1 - k;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          pen.line(
            [
              { x: bx + Math.cos(a) * (10 + k * 8), y: by + Math.sin(a) * (10 + k * 8) },
              { x: bx + Math.cos(a) * (16 + k * 10), y: by + Math.sin(a) * (16 + k * 10) },
            ],
            { width: lw * 0.9 },
          );
        }
        ctx.restore();
      }
    }
  },
};
