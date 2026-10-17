// @ts-check
// Cucumber Cadet: a shifty, side-eyed cucumber grunt in a patrol cap and tiny boots.
// Its eyes dart left/right constantly. Salutes when idle (and while being bonked away).
import { googlyEye, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const SKIN = '#6DAA4C';
const SKIN_L = '#B9DE8E';
const SKIN_D = '#3E7834';
const BUMP = '#4C8A3B';
const CAP = '#8A8546';
const CAP_L = '#B9B36C';
const CAP_D = '#5E5A2C';
const BOOT = '#5A4636';
const BOOT_L = '#8A6C52';
const GLOVE = '#FFFDF6';
const STAR = '#F2C14E';

const CY = -86;
const RX = 31;
const RY = 60;

/** @param {number} a @param {number} b @param {number} k */
const lerp = (a, b, k) => a + (b - a) * k;
/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** Banana bend: centre-line x at height y. @param {number} y */
function bendX(y) {
  const u = (y - CY) / RY;
  return 3 - 8 * (1 - u * u);
}

/** @returns {Pt[]} */
function bodyPts() {
  /** @type {Pt[]} */
  const pts = [];
  const n = 44;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = Math.sin(a);
    const bump = i % 4 === 0 ? 0.045 : 0;
    const rx = RX * (1 + 0.08 * s) * (1 + bump);
    const y = CY + s * RY * (1 + bump * 0.3);
    pts.push({ x: Math.cos(a) * rx + bendX(y), y });
  }
  return pts;
}

const BUMPS = [
  [-20, -132], [-25, -100], [-22, -66], [-8, -44], [12, -50], [24, -64], [-12, -78], [27, -118], [5, -60],
];

/** @param {EGeo} g @param {EnemyState} st */
function legs(g, st) {
  const { pen, lw } = g;
  const hip = -28;
  const spread = 12;
  const len = -hip;
  for (const s of [-1, 1]) {
    const ph = Math.sin(st.walk + (s > 0 ? Math.PI : 0)) * st.moving;
    const fx = s * spread + ph * len * 0.35;
    const lift = Math.max(0, ph) * len * 0.25;
    pen.line(
      [
        { x: s * spread * 0.7, y: hip },
        { x: (s * spread * 0.7 + fx) / 2, y: (hip - lift) / 2 - 3 },
        { x: fx, y: -lift - 12 },
      ],
      { width: lw * 2.2 },
    );
    const b = -lift;
    pen.blob(
      [
        { x: fx - 7, y: b - 16 },
        { x: fx + 5, y: b - 16 },
        { x: fx + 6, y: b - 8 },
        { x: fx + 16, y: b - 6 },
        { x: fx + 17, y: b },
        { x: fx - 8, y: b },
      ],
      soft(g.ctx, fx, b - 8, 14, BOOT_L, BOOT, '#3E2F24'),
      { width: lw * 0.8 },
    );
    pen.line([{ x: fx - 8, y: b - 1 }, { x: fx + 17, y: b - 1 }], { width: lw * 1.3 });
  }
}

/**
 * Noodle arm with a white glove. @param {EGeo} g
 * @param {Pt[]} pts shoulder, elbow, hand @param {number} rot glove rotation
 */
function arm(g, pts, rot) {
  const { pen, ctx, lw } = g;
  pen.line(pts, { width: lw * 1.9 });
  const h = pts[2];
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(rot);
  pen.blob(ellipsePts(0, 0, 7.5, 5.5, 12), GLOVE, { width: lw * 0.8 });
  ctx.restore();
}

/** @param {Pt[]} a @param {Pt[]} b @param {number} k */
const lerpPose = (a, b, k) => a.map((p, i) => ({ x: lerp(p.x, b[i].x, k), y: lerp(p.y, b[i].y, k) }));

/** @param {EGeo} g @param {EnemyState} st @param {number} pop */
function cap(g, st, pop) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(bendX(-142) + 1, -141 - pop * 22);
  ctx.rotate(-0.1 + pop * 0.5 + (st.mode === 'idle' ? 0 : Math.sin(st.walk) * 0.04 * st.moving));
  // Brim pokes forward (+x).
  pen.blob(
    [
      { x: 10, y: 0 },
      { x: 38, y: 3 },
      { x: 42, y: 8 },
      { x: 30, y: 9 },
      { x: 12, y: 7 },
    ],
    CAP_D,
    { width: lw * 0.9 },
  );
  pen.blob(
    [
      { x: -27, y: 5 },
      { x: -25, y: -12 },
      { x: -22, y: -20 },
      { x: 0, y: -21 },
      { x: 22, y: -20 },
      { x: 26, y: -12 },
      { x: 28, y: 5 },
    ],
    soft(ctx, -4, -10, 30, CAP_L, CAP, CAP_D),
  );
  pen.line([{ x: -26, y: -1 }, { x: 0, y: 0 }, { x: 27, y: -1 }], { width: lw * 0.8, color: CAP_D });
  // Little gold star.
  /** @type {Pt[]} */
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 ? 2.6 : 6;
    star.push({ x: 9 + Math.cos(a) * r, y: -10 + Math.sin(a) * r });
  }
  pen.blob(star, STAR, { width: lw * 0.6, amp: 0 });
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'cucumber-cadet',
  height: 150,
  width: 84,
  gait: 'waddle',
  deathText: '*salutes* bonk.',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const hit = st.hit > 0.3;
    const dying = st.mode === 'death';
    const idle = st.mode === 'idle';

    // Salute: on a loop while idle, held while dying.
    const c = st.t % 3.8;
    const sal = dying ? 1 : idle ? smooth(0.2, 0.55, c) * (1 - smooth(2.7, 3.1, c)) : 0;
    const flail = hit && !dying ? st.hit : 0;
    const sw = Math.sin(st.walk) * st.moving;

    // Back arm.
    const backRest = [
      { x: -30, y: -74 },
      { x: -40, y: -62 },
      { x: -42 + sw * 9, y: -48 },
    ];
    const backFlail = [
      { x: -30, y: -78 },
      { x: -46, y: -92 },
      { x: -48, y: -110 },
    ];
    arm(g, lerpPose(backRest, backFlail, flail), -0.3);

    legs(g, st);

    // Body.
    const body = bodyPts();
    pen.blob(body, soft(ctx, -6, CY - 18, 70, SKIN_L, SKIN, SKIN_D));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(body[0].x, body[0].y);
    for (const p of body) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    // Pale lengthwise stripes.
    ctx.globalAlpha *= 0.4;
    for (const off of [-17, -2, 14]) {
      /** @type {Pt[]} */
      const s = [];
      for (let y = -150; y <= -20; y += 26) s.push({ x: bendX(y) + off * (1 + 0.08 * Math.sin(((y - CY) / RY) * 1.5)), y });
      pen.line(s, { width: 5, color: SKIN_L, amp: 0 });
    }
    ctx.restore();
    // Warty bumps.
    for (const [bx, by] of BUMPS) {
      ctx.fillStyle = BUMP;
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,253,246,0.7)';
      ctx.beginPath();
      ctx.arc(bx - 1, by - 1.2, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Face: shifty darting eyes under half-lids.
    const dart = hit ? 0 : Math.tanh(Math.sin(st.t * 1.15 + 0.6) * 7);
    const ox = st.lookX;
    const oy = st.lookY;
    st.lookX = dart;
    st.lookY = hit ? 0 : 0.2;
    const lid = hit ? 0 : 0.46;
    googlyEye(g, st, 'cc-l', -5, -108, 11.5, { lid, lidTilt: 0.06, lidColor: SKIN, look: 1.9 });
    googlyEye(g, st, 'cc-r', 19, -109, 10.5, { lid, lidTilt: -0.05, lidColor: SKIN, look: 1.9 });
    st.lookX = ox;
    st.lookY = oy;
    const bu = hit ? 7 : 0;
    pen.line([{ x: -15, y: -121 - bu }, { x: -5, y: -123 - bu }, { x: 5, y: -121 - bu }], { width: lw * 1.3 });
    pen.line([{ x: 11, y: -125 - bu }, { x: 19, y: -130 - bu }, { x: 28, y: -127 - bu }], { width: lw * 1.3 });
    if (hit) {
      mouth(g, 8, -92, 7, 'o');
    } else {
      pen.line([{ x: -3, y: -88 }, { x: 8, y: -86 }, { x: 19, y: -92 }], { width: lw * 1.1 });
      pen.line([{ x: 17, y: -94 }, { x: 21, y: -90 }], { width: lw * 0.8 });
    }

    cap(g, st, flail);

    // Front arm: swing, salute or flail.
    const frontRest = [
      { x: 25, y: -74 },
      { x: 35, y: -62 },
      { x: 37 - sw * 9, y: -48 },
    ];
    const frontSalute = [
      { x: 25, y: -76 },
      { x: 48, y: -98 },
      { x: 31, y: -128 },
    ];
    const frontFlail = [
      { x: 26, y: -78 },
      { x: 44, y: -96 },
      { x: 46, y: -114 },
    ];
    const pose = flail > 0 ? lerpPose(frontRest, frontFlail, flail) : lerpPose(frontRest, frontSalute, sal);
    arm(g, pose, lerp(0.3, -0.7, sal));
    if (sal > 0.9 && !dying) {
      // Tiny "snap" ticks beside the salute.
      ctx.save();
      ctx.globalAlpha *= smooth(0.55, 0.7, c) * (1 - smooth(0.9, 1.3, c));
      pen.line([{ x: 44, y: -136 }, { x: 50, y: -142 }], { width: lw * 0.9 });
      pen.line([{ x: 48, y: -128 }, { x: 56, y: -130 }], { width: lw * 0.9 });
      ctx.restore();
    }
  },
};
