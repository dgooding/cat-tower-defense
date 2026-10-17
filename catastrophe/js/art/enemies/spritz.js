// @ts-check
// Spritz: a smug spray bottle. Nozzle head with a grin, trigger "arm", hand on hip,
// sloshing water inside a bottle labelled "NO!". Puffs a little mist now and then
// (faster double-spritzes while idle).
import { googlyEye, tinyLegs, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const HEAD = '#4FB3A9';
const HEAD_L = '#A6E2D9';
const HEAD_D = '#2E8079';
const PLASTIC_L = '#F1FAFD';
const PLASTIC = '#C7E5F2';
const PLASTIC_D = '#8DBFD9';
const WATER = '#7CC4E4';
const WATER_D = '#4E9CC4';
const MIST = '#E6F5FB';
const HEAD_K = 1.2;
const NOZ = { x: 50 * HEAD_K, y: -118 + (-145 + 118) * HEAD_K };

/** @type {Pt[]} */
const BOTTLE = [
  { x: -20, y: -18 },
  { x: 20, y: -18 },
  { x: 31, y: -20 },
  { x: 33, y: -32 },
  { x: 32, y: -92 },
  { x: 28, y: -104 },
  { x: 16, y: -112 },
  { x: -16, y: -112 },
  { x: -28, y: -104 },
  { x: -32, y: -92 },
  { x: -33, y: -32 },
  { x: -31, y: -20 },
];

/** Squeeze envelope 0..1 and mist age for the current spritz cycle. @param {EnemyState} st */
function spritzCycle(st) {
  const idle = st.mode === 'idle';
  const P = idle ? 1.5 : 2.8;
  const u = st.t % P;
  const sq = u < 0.1 ? u / 0.1 : u < 0.28 ? 1 - (u - 0.1) / 0.18 : 0;
  return { sq, age: u - 0.06, life: 0.9 };
}

/** @param {EGeo} g @param {number} age @param {number} life */
function mist(g, age, life) {
  if (age < 0 || age > life) return;
  const { ctx, lw } = g;
  const k = age / life;
  ctx.save();
  const base = ctx.globalAlpha;
  for (let i = 0; i < 6; i++) {
    const d = k * (36 + i * 5);
    const x = NOZ.x + 4 + d + i * 3;
    const y = NOZ.y + Math.sin(i * 2.3) * (3 + k * 9) - k * 5;
    const r = 3 + k * 9 + (i % 3);
    ctx.globalAlpha = base * (1 - k) * 0.9;
    ctx.fillStyle = MIST;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(111,154,174,0.5)';
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = NOZ.x + 8 + k * (30 + i * 9);
    const y = NOZ.y - 8 + i * 4 + k * k * 18;
    ctx.globalAlpha = base * (1 - k);
    ctx.fillStyle = WATER_D;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st @param {boolean} hit */
function bottle(g, st, hit) {
  const { pen, ctx, lw } = g;
  const w = pen.blob(BOTTLE, soft(ctx, -10, -80, 60, PLASTIC_L, PLASTIC, PLASTIC_D));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  // Sloshing water.
  const slosh = Math.sin(st.walk) * 5 * st.moving + st.hit * Math.sin(st.t * 22) * 9 + Math.sin(st.t * 2) * 1.2;
  const lvl = -70;
  const wg = ctx.createLinearGradient(0, lvl, 0, -18);
  wg.addColorStop(0, WATER);
  wg.addColorStop(1, WATER_D);
  ctx.fillStyle = wg;
  ctx.globalAlpha *= 0.85;
  ctx.beginPath();
  ctx.moveTo(-40, lvl + slosh);
  ctx.quadraticCurveTo(0, lvl + Math.sin(st.t * 4) * 2, 40, lvl - slosh);
  ctx.lineTo(40, 0);
  ctx.lineTo(-40, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha /= 0.85;
  pen.line(
    [
      { x: -34, y: lvl + slosh },
      { x: 0, y: lvl + Math.sin(st.t * 4) },
      { x: 34, y: lvl - slosh },
    ],
    { width: lw * 0.8, color: '#FFFFFF', amp: 0 },
  );
  // Bubbles.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 3; i++) {
    const u = (st.t * 0.5 + i / 3) % 1;
    ctx.beginPath();
    ctx.arc(12 - i * 9 + Math.sin(st.t * 3 + i) * 2, -24 - u * 40, 1.6 + i * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dip tube.
  pen.line([{ x: -4, y: -112 }, { x: -6, y: -60 }, { x: -9, y: -24 }], { width: lw * 1.1, color: 'rgba(255,255,255,0.75)', amp: 0 });
  // Plastic shine.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-24, -66, 3.2, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Label.
  pen.blob(
    [
      { x: -22, y: -64 },
      { x: 23, y: -64 },
      { x: 23, y: -36 },
      { x: -22, y: -36 },
    ],
    '#FFFDF6',
    { width: lw * 0.8 },
  );
  ctx.save();
  ctx.fillStyle = '#D2483C';
  ctx.font = `700 19px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO!', 1, -49);
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st @param {number} sq @param {boolean} hit */
function sprayer(g, st, sq, hit) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(0, -118);
  ctx.scale(HEAD_K, HEAD_K);
  ctx.translate(0, 118);
  // Threaded collar.
  pen.blob(
    [
      { x: -18, y: -124 },
      { x: 19, y: -124 },
      { x: 19, y: -110 },
      { x: -18, y: -110 },
    ],
    HEAD_D,
    { width: lw * 0.9 },
  );
  for (const rx of [-10, -3, 4, 11]) pen.line([{ x: rx, y: -122 }, { x: rx, y: -112 }], { width: lw * 0.5, color: '#1F5F5A' });

  // Trigger "arm" hangs under the nozzle and squeezes back.
  ctx.save();
  ctx.translate(30, -137);
  ctx.rotate(0.15 + sq * 0.45 + (hit ? Math.sin(st.t * 30) * 0.2 : 0));
  pen.tube(
    [
      { x: 0, y: 0 },
      { x: 11, y: 10 },
      { x: 8, y: 26 },
    ],
    8,
    HEAD,
  );
  pen.blob(ellipsePts(7, 28, 5, 4, 10), HEAD_L, { width: lw * 0.8 });
  ctx.restore();

  // Head.
  pen.blob(
    [
      { x: -24, y: -124 },
      { x: -31, y: -140 },
      { x: -27, y: -159 },
      { x: -12, y: -169 },
      { x: 10, y: -169 },
      { x: 22, y: -162 },
      { x: 27, y: -153 },
      { x: 44, y: -153 },
      { x: 46, y: -137 },
      { x: 27, y: -136 },
      { x: 22, y: -129 },
      { x: 18, y: -124 },
    ],
    soft(ctx, -8, -152, 40, HEAD_L, HEAD, HEAD_D),
  );
  // Nozzle tip.
  pen.blob(
    [
      { x: 43, y: -155 },
      { x: 51, y: -155 },
      { x: 51, y: -135 },
      { x: 43, y: -135 },
    ],
    HEAD_D,
    { width: lw * 0.9 },
  );
  ctx.fillStyle = '#1F3A3A';
  ctx.beginPath();
  ctx.arc(51, -145, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-16, -160, 8, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Smug face.
  const lid = hit ? 0 : 0.52;
  googlyEye(g, st, 'sz-l', -13, -150, 8.5, { lid, lidTilt: -0.08, lidColor: HEAD, pupil: 0.55 });
  googlyEye(g, st, 'sz-r', 7, -151, 8, { lid: hit ? 0 : 0.4, lidTilt: 0.05, lidColor: HEAD, pupil: 0.55 });
  const bu = hit ? -4 : 0;
  pen.line([{ x: -21, y: -161 + bu }, { x: -13, y: -162 + bu }, { x: -5, y: -160 + bu }], { width: lw * 1.2 });
  pen.line([{ x: 1, y: -163 + bu }, { x: 8, y: -168 + bu }, { x: 15, y: -164 + bu }], { width: lw * 1.2 });
  if (hit) mouth(g, -2, -139, 5, 'o');
  else mouth(g, -3, -139, 10, 'grin');
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'spritz',
  height: 170,
  width: 90,
  gait: 'waddle',
  deathText: 'Off the counter…',
  draw(g, st) {
    const { pen, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const cyc = dying ? { sq: 0, age: -1, life: 1 } : spritzCycle(st);

    tinyLegs(g, st, 0, -18, 13, { shoe: HEAD_D });
    // Little hand-on-hip arm (smug).
    const sw = Math.sin(st.walk) * st.moving;
    pen.line(
      [
        { x: -32, y: -82 },
        { x: -47 + sw * 2, y: -70 },
        { x: -34, y: -58 },
      ],
      { width: lw * 1.9 },
    );
    pen.blob(ellipsePts(-35, -58, 5.5, 4.5, 10), HEAD_L, { width: lw * 0.8 });

    bottle(g, st, hit);
    sprayer(g, st, cyc.sq, hit);
    mist(g, cyc.age, cyc.life);
    if (st.mode === 'idle' && !hit) {
      // Second, cheekier spritz in the same idle beat.
      mist(g, cyc.age - 0.35, cyc.life);
    }
  },
};
