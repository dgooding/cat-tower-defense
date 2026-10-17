// @ts-check
// The Empty Bowl: a pet food bowl with nothing in it but three crumbs and despair.
// Big sad eyes, one perfect glistening tear on a loop, and a gloomy aura ring on the floor.
// Idle fidget: stares down into itself and heaves a deep sigh.
import { googlyEye, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const H = 110;
const RIM_Y = -74;
const RIM_RX = 56;
const RIM_RY = 13;
const BOWL = '#8EB8DE';
const BOWL_L = '#D3E7F7';
const BOWL_D = '#5F86AE';
const INSIDE = '#BFD8EE';
const STRIPE = '#FFFDF6';
const TEAR = '#BFE6FA';
const AURA = '#8C84C9';

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** Current hop height (mirrors the rig's hop gait) so the aura can stay on the floor. @param {EnemyState} st */
function hopY(st) {
  const ph = (st.walk / Math.PI) % 2;
  const air = ph < 1 ? Math.sin(ph * Math.PI) : 0;
  return -air * H * 0.18 * st.moving;
}

/** @param {EGeo} g @param {EnemyState} st */
function aura(g, st) {
  const { ctx, lw } = g;
  ctx.save();
  ctx.translate(0, -hopY(st));
  ctx.strokeStyle = AURA;
  ctx.lineWidth = lw * 1.4;
  ctx.setLineDash([lw * 4, lw * 3]);
  ctx.lineDashOffset = -st.t * 12;
  const base = ctx.globalAlpha;
  ctx.globalAlpha *= 0.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 82, 18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let k = 0; k < 2; k++) {
    const u = (st.t * 0.45 + k * 0.5) % 1;
    ctx.globalAlpha = base * (1 - u) * 0.35;
    ctx.lineWidth = lw * (1.6 - u);
    ctx.beginPath();
    ctx.ellipse(0, 0, 52 + u * 46, 11 + u * 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Gloomy wisps drifting up.
  ctx.save();
  const base2 = ctx.globalAlpha;
  for (let k = 0; k < 4; k++) {
    const u = (st.t * 0.35 + k / 4) % 1;
    const x = [-70, 62, -46, 76][k] + Math.sin(st.t * 1.5 + k) * 5;
    const y = -8 - u * 70;
    ctx.globalAlpha = base2 * Math.sin(u * Math.PI) * 0.35;
    ctx.fillStyle = AURA;
    ctx.beginPath();
    ctx.arc(x, y, 3.5 + u * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** @returns {Pt[]} */
function bowlPts() {
  /** @type {Pt[]} */
  const pts = [];
  // Back half of the rim (left → right across the top).
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI;
    pts.push({ x: Math.cos(a) * RIM_RX, y: RIM_Y + Math.sin(a) * RIM_RY });
  }
  pts.push({ x: 62, y: -46 });
  pts.push({ x: 69, y: -18 });
  // Front-bottom curve.
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    pts.push({ x: Math.cos(a) * 68, y: -14 + Math.sin(a) * 10 });
  }
  pts.push({ x: -69, y: -18 });
  pts.push({ x: -62, y: -46 });
  return pts;
}

/** Teardrop pointing up. @param {number} x @param {number} y @param {number} r @returns {Pt[]} */
function tearPts(x, y, r) {
  return ellipsePts(x, y, r, r, 16, (a) => {
    const up = -Math.sin(a);
    return up > 0 ? 1 + up * up * 0.9 : 1;
  }).map((p) => ({ x: x + (p.x - x) * (1 - Math.max(0, y - p.y) / (r * 2.4)), y: p.y }));
}

/** @param {EGeo} g @param {EnemyState} st @param {boolean} hit */
function tear(g, st, hit) {
  const { pen, ctx, lw } = g;
  const ex = 21;
  const ey = -40;
  if (hit) {
    // Tear gets flung off.
    const k = 1 - st.hit;
    const x = ex + 18 + k * 30;
    const y = ey - 6 - Math.sin(k * Math.PI) * 18 + k * 20;
    pen.blob(tearPts(x, y, 4.5), TEAR, { width: lw * 0.8 });
    return;
  }
  const P = 3.4;
  const u = (st.t % P) / P;
  let x = ex + 3;
  let y = ey + 12;
  let r = 5;
  if (u < 0.25) {
    r = 1 + smooth(0, 0.25, u) * 4;
  } else if (u < 0.82) {
    const k = smooth(0.25, 0.82, u);
    y += k * 25;
    x += Math.sin(k * 3) * 2;
  } else {
    const k = (u - 0.82) / 0.18;
    y += 25 + k * k * 30;
    ctx.save();
    ctx.globalAlpha *= 1 - k;
  }
  if (u >= 0.25 && u < 0.82) {
    // Glistening trail.
    ctx.save();
    ctx.globalAlpha *= 0.55;
    pen.line([{ x: ex + 3, y: ey + 12 }, { x: x - 0.5, y: (ey + 12 + y) / 2 }, { x, y: y - r }], { width: r * 0.9, color: TEAR, amp: 0 });
    ctx.restore();
  }
  pen.blob(tearPts(x, y, r), soft(ctx, x, y, r, '#FFFFFF', TEAR, '#7FC3E6'), { width: lw * 0.8 });
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (u >= 0.82) ctx.restore();
  // "Perfect" sparkle.
  const sp = Math.max(0, Math.sin(u * Math.PI * 4));
  if (sp > 0.2 && u < 0.82) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha *= sp;
    const sx = x + r + 3;
    const sy = y - r - 2;
    const s = 4 * sp;
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.25, sy);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s * 0.25, sy);
    ctx.closePath();
    ctx.moveTo(sx - s, sy);
    ctx.lineTo(sx, sy + s * 0.25);
    ctx.lineTo(sx + s, sy);
    ctx.lineTo(sx, sy - s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'empty-bowl',
  height: H,
  width: 150,
  gait: 'hop',
  deathText: '…finally full?',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const idle = st.mode === 'idle';

    if (!dying) aura(g, st);

    // Idle sigh: slow deflate.
    const c = st.t % 4;
    const sigh = idle ? Math.sin(smooth(1, 2.6, c) * Math.PI) : 0;
    ctx.save();
    ctx.translate(0, 0);
    ctx.scale(1 + sigh * 0.05, 1 - sigh * 0.08);

    const body = bowlPts();
    pen.blob(body, soft(ctx, -20, -50, 80, BOWL_L, BOWL, BOWL_D));
    // Decorative band + fishbone motif.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(body[0].x, body[0].y);
    for (const p of body) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha *= 0.85;
    pen.line(
      [
        { x: -80, y: -19 },
        { x: 0, y: -9 },
        { x: 80, y: -19 },
      ],
      { width: 6, color: STRIPE, amp: 0 },
    );
    ctx.restore();
    // Paw print on the side.
    const fx = -42;
    const fy = -30;
    ctx.fillStyle = BOWL_D;
    ctx.beginPath();
    ctx.ellipse(fx, fy + 3, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [tx, ty] of [[-6, -3], [-2, -7], [3, -7], [7, -3]]) {
      ctx.beginPath();
      ctx.ellipse(fx + tx, fy + ty, 2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rim + the tragically empty inside.
    pen.blob(ellipsePts(0, RIM_Y, RIM_RX, RIM_RY, 30), BOWL_L);
    const ig = ctx.createLinearGradient(0, RIM_Y - 12, 0, RIM_Y + 12);
    ig.addColorStop(0, '#7FA3C6');
    ig.addColorStop(1, INSIDE);
    pen.blob(ellipsePts(0, RIM_Y + 1, RIM_RX - 7, RIM_RY - 3.5, 28), ig, { width: lw * 0.8 });
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(16, RIM_Y + 3, 14, 2.2, 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Three lonely crumbs.
    for (const [cx, cy, cr] of [[-14, RIM_Y + 4, 2.4], [-6, RIM_Y + 6, 1.8], [8, RIM_Y + 3, 2]]) {
      ctx.fillStyle = '#B58A57';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rim shine.
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(-34, RIM_Y + 8, 9, 2, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Sad face.
    const ox = st.lookX;
    const oy = st.lookY;
    if (idle) {
      st.lookX = 0;
      st.lookY = 0.3 + sigh * 0.7;
    } else if (!hit) {
      st.lookX = Math.sin(st.t * 0.6) * 0.3;
      st.lookY = 0.7;
    }
    const lid = hit ? 0 : 0.32 + sigh * 0.2;
    googlyEye(g, st, 'eb-l', -19, -41, 12.5, { lid, lidTilt: hit ? 0 : -0.18, lidColor: BOWL, pupil: 0.58 });
    googlyEye(g, st, 'eb-r', 19, -41, 12.5, { lid, lidTilt: hit ? 0 : 0.18, lidColor: BOWL, pupil: 0.58 });
    st.lookX = ox;
    st.lookY = oy;
    const bu = hit ? -6 : 0;
    pen.line([{ x: -31, y: -52 + bu }, { x: -21, y: -55 + bu }, { x: -9, y: -60 + bu }], { width: lw * 1.3 });
    pen.line([{ x: 9, y: -60 + bu }, { x: 21, y: -55 + bu }, { x: 31, y: -52 + bu }], { width: lw * 1.3 });
    if (hit) {
      mouth(g, 0, -24, 6, 'o');
    } else {
      const w = Math.sin(st.t * 9) * 0.8;
      pen.line(
        [
          { x: -8, y: -19 + w },
          { x: -3, y: -23 },
          { x: 3, y: -23 - w },
          { x: 8, y: -19 },
        ],
        { width: lw * 1.1 },
      );
    }
    tear(g, st, hit);
    ctx.restore();

    if (sigh > 0.3) {
      // Sigh puff drifting out.
      ctx.save();
      ctx.globalAlpha *= (sigh - 0.3) * 1.2;
      pen.blob(ellipsePts(30 + sigh * 14, -16 - sigh * 6, 6 + sigh * 4, 4 + sigh * 3, 12), '#F2F0FA', { width: lw * 0.6 });
      ctx.restore();
    }
  },
};
