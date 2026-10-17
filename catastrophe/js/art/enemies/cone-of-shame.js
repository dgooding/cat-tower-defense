// @ts-check
// Cone of Shame: a tiny lilac creature completely swallowed by a giant pet cone.
// The face peeks out of the narrow end, eyes averted, hatched blush of pure shame and a sweat drop.
// Idle fidget: shrinks back into the cone and tugs the rim closed. "please don't look"
import { googlyEye, tinyLegs, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const SKIN = '#C9B8E8';
const SKIN_L = '#ECE4FA';
const SKIN_D = '#9A86C4';
const CONE_IN = '#BCD3E3';
const CONE_OUT = '#F6FAFD';
const PLEAT = '#9DB7C8';
const RIM = '#CFE2EE';
const TAB = '#E8F1F7';
const SHAME = '#E8606A';

// Neck ring (narrow end, behind) and rim (wide end, facing forward/right).
const NX = -16;
const NY = -104;
const NRX = 9;
const NRY = 22;
const RX0 = 30;
const RY0 = -102;
const RRX = 34;
const RRY = 62;

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** @param {EGeo} g @param {EnemyState} st @param {number} fx @param {number} fy @param {boolean} hit @param {number} hide */
function face(g, st, fx, fy, hit, hide) {
  const { pen, ctx, lw } = g;
  const ox = st.lookX;
  const oy = st.lookY;
  if (!hit) {
    st.lookX = -0.9 + Math.sin(st.t * 0.9) * 0.15;
    st.lookY = 0.8;
  }
  const lid = hit ? 0 : Math.max(0.28, hide);
  googlyEye(g, st, 'cs-l', fx - 10, fy - 1, 8.5, { lid, lidTilt: hit ? 0 : -0.14, lidColor: SKIN, pupil: 0.55 });
  googlyEye(g, st, 'cs-r', fx + 10, fy - 1, 8.5, { lid, lidTilt: hit ? 0 : 0.14, lidColor: SKIN, pupil: 0.55 });
  st.lookX = ox;
  st.lookY = oy;
  // Worried brows (inner ends up).
  const bu = hit ? -4 : 0;
  pen.line([{ x: fx - 18, y: fy - 9 + bu }, { x: fx - 11, y: fy - 12 + bu }, { x: fx - 4, y: fy - 16 + bu }], { width: lw * 1.1 });
  pen.line([{ x: fx + 4, y: fy - 16 + bu }, { x: fx + 11, y: fy - 12 + bu }, { x: fx + 18, y: fy - 9 + bu }], { width: lw * 1.1 });
  // Hatched blush of shame.
  ctx.save();
  ctx.strokeStyle = SHAME;
  ctx.lineWidth = lw * 0.8;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = fx + s * 19 + (i - 1) * 3.6;
      ctx.beginPath();
      ctx.moveTo(x - 1.6, fy + 14);
      ctx.lineTo(x + 1.6, fy + 9);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (hit) mouth(g, fx, fy + 11, 4.5, 'o');
  else mouth(g, fx, fy + 13, 4.5, 'zigzag');
}

/** @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} a */
const onEll = (cx, cy, rx, ry, a) => ({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });

/** @param {EGeo} g @param {EnemyState} st @param {number} hide @param {boolean} hit */
function cone(g, st, hide, hit) {
  const { pen, ctx, lw } = g;
  const wob = hit ? Math.sin(st.t * 30) * st.hit * 0.05 : 0;
  const rry = RRY * (1 - hide * 0.06) * (1 + wob);
  const rrx = RRX * (1 - wob);

  // Outer wall: hull of the neck ring (left half) and the rim (right half).
  /** @type {Pt[]} */
  const wall = [];
  for (let i = 0; i <= 8; i++) wall.push(onEll(NX, NY, NRX, NRY, Math.PI / 2 + (i / 8) * Math.PI));
  for (let i = 0; i <= 14; i++) wall.push(onEll(RX0, RY0, rrx, rry, -Math.PI / 2 + (i / 14) * Math.PI));
  const wg = ctx.createLinearGradient(0, RY0 - rry, 0, RY0 + rry);
  wg.addColorStop(0, CONE_OUT);
  wg.addColorStop(0.55, '#DCEAF3');
  wg.addColorStop(1, CONE_IN);
  pen.blob(wall, wg);
  // Outside pleats.
  for (const a of [3.5, 3.9, 4.3, 4.7, 5.1, 2.0, 2.4, 2.8]) {
    pen.line([onEll(NX, NY, NRX, NRY, a), onEll(RX0, RY0, rrx * 0.96, rry * 0.97, a)], { width: lw * 0.55, color: PLEAT });
  }
  // Collar tabs on the neck ring.
  for (const a of [2.2, 3.1, 4.0]) {
    const p = onEll(NX, NY, NRX + 3, NRY + 3, a);
    pen.blob(ellipsePts(p.x, p.y, 4, 5, 8), TAB, { width: lw * 0.6 });
  }

  // The opening, looking into the cone.
  const open = ellipsePts(RX0, RY0, rrx, rry, 32);
  const ig = ctx.createRadialGradient(RX0 - 12, RY0, 6, RX0, RY0, rry);
  ig.addColorStop(0, '#8EA8BE');
  ig.addColorStop(1, '#D9E8F1');
  const ow = pen.blob(open, ig);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ow[0].x, ow[0].y);
  for (const p of ow) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pen.line([{ x: RX0 - 12 + Math.cos(a) * 18, y: RY0 + Math.sin(a) * 26 }, onEll(RX0, RY0, rrx, rry, a)], { width: lw * 0.5, color: PLEAT });
  }
  // The shy head, deep inside.
  const hk = 1 - hide * 0.2;
  const hx = RX0 - 6 - hide * 8;
  const hy = RY0 + 2 + hide * 4;
  ctx.translate(hx, hy);
  ctx.scale(hk, hk);
  ctx.translate(-hx, -hy);
  pen.blob(ellipsePts(hx, hy, 28, 30, 22), soft(ctx, hx - 4, hy - 6, 30, SKIN_L, SKIN, SKIN_D), { width: lw * 0.9 });

  face(g, st, hx + 3, hy + 1, hit, hide);
  ctx.restore();
  // Cone shadow falling on the head.
  ctx.save();
  const sh = ctx.createRadialGradient(RX0, RY0, rry * 0.45, RX0, RY0, rry);
  sh.addColorStop(0, 'rgba(59,58,74,0)');
  sh.addColorStop(1, `rgba(59,58,74,${0.22 + hide * 0.3})`);
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(RX0, RY0, rrx, rry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Rolled rim.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(RX0, RY0, rrx - lw * 0.6, rry - lw * 0.6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = lw * 2;
  ctx.stroke();
  ctx.restore();
  pen.blob(open, null, { width: lw * 1.1 });
  // Plastic glare on the wall.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(4, RY0 - 44, 10, 3.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-6, RY0 - 32, 3, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'cone-of-shame',
  height: 160,
  width: 120,
  gait: 'waddle',
  deathText: "please don't look",
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const c = st.t % 3.6;
    const hide = st.mode === 'idle' && !hit ? smooth(0.3, 0.8, c) * (1 - smooth(2.4, 2.9, c)) : dying ? 0.6 : 0;
    const sw = Math.sin(st.walk) * st.moving;

    // Body behind the cone.
    tinyLegs(g, st, -14, -24, 11, { shoe: '#8C84C9' });
    pen.line([{ x: -42, y: -50 }, { x: -50, y: -53 + sw * 2 }], { width: lw * 2.6, color: SKIN_D });
    pen.blob(ellipsePts(-18, -50, 28, 27, 18), soft(ctx, -24, -58, 28, SKIN_L, SKIN, SKIN_D));
    // Back arm grips the underside of the cone.
    const back = { x: 2 - hide * 4, y: -78 + sw * 2 };
    pen.line([{ x: -10, y: -58 }, { x: -2, y: -66 }, back], { width: lw * 1.8 });

    ctx.save();
    ctx.translate(NX, NY);
    ctx.rotate(Math.sin(st.walk) * 0.03 * st.moving + hide * 0.08);
    ctx.translate(-NX, -NY);
    cone(g, st, hide, hit);
    ctx.restore();

    pen.blob(ellipsePts(back.x, back.y, 5.5, 5, 10), SKIN, { width: lw * 0.8 });
    // Front arm tugs the rim.
    const front = { x: 26 - hide * 6, y: -42 - sw * 2 };
    pen.line([{ x: 4, y: -46 }, { x: 16, y: -40 }, front], { width: lw * 1.8 });
    pen.blob(ellipsePts(front.x, front.y, 6, 5.5, 10), SKIN, { width: lw * 0.8 });

    // Nervous sweat drop.
    const sd = (st.t * 0.7) % 1;
    ctx.save();
    ctx.globalAlpha *= hit ? 1 : Math.sin(sd * Math.PI);
    const sx = 72;
    const sy = -150 + sd * 10;
    pen.blob(ellipsePts(sx, sy, 3.5, 5, 12, (a) => 1 + (Math.sin(a) < 0 ? 0.6 * -Math.sin(a) : 0)), '#BFE3F2', { width: lw * 0.7 });
    ctx.restore();
  },
};
