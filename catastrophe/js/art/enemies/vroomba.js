// @ts-check
// Vroomba: Model V-9 robot vacuum. Glowing LED pixel face with shifty slanted eyes,
// a springy antenna, a spinning side brush and a permanent "bonk" dent once it's been hit.
// Idle fidget: "Recalculating…" loading spinner on its face.
import { ellipsePts, soft } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const TOP_Y = -54;
const BOT_Y = -20;
const RX = 80;
const RY = 18;
const LED = '#8AF5DF';
const LED_GLOW = 'rgba(138,245,223,0.28)';
const LED_HOT = '#FF9A8A';
const LED_HOT_GLOW = 'rgba(255,120,110,0.3)';

const COLS = 15;
const ROWS = 5;
const PITCH = 4.4;
const SX = -((COLS - 1) * PITCH) / 2;
const SY = -31;

/** @param {string[]} rows @param {number} col @param {number} row @param {Set<string>} out */
function stamp(rows, col, row, out) {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] === '#') out.add(`${col + i},${row + j}`);
  });
}

const EYE_L = ['#....', '###..', '#####'];
const EYE_R = ['....#', '..###', '#####'];
const EYE_SHUT = ['#####'];
const EYE_X = ['#.#', '.#.', '#.#'];

/** @param {EGeo} g @param {EnemyState} st */
function screen(g, st) {
  const { pen, ctx, lw } = g;
  pen.blob(
    [
      { x: -36, y: -36 },
      { x: 36, y: -36 },
      { x: 37, y: -8 },
      { x: -37, y: -8 },
    ],
    '#1E2531',
    { width: lw * 0.9 },
  );
  const hit = st.hit > 0.3 && st.mode !== 'death';
  const idle = st.mode === 'idle' && !hit;
  /** @type {Set<string>} */
  const on = new Set();
  if (hit) {
    stamp(EYE_X, 2, 0, on);
    stamp(EYE_X, 10, 0, on);
    stamp(['#.#', '###'], 6, 3, on);
  } else if (idle) {
    stamp(['####'], 1, 2, on);
    stamp(['####'], 10, 2, on);
  } else {
    const dart = Math.round(Math.tanh(Math.sin(st.t * 1.3) * 5) * 1.2);
    const shut = st.blink > 0.5 || st.mode === 'death';
    if (shut) {
      stamp(EYE_SHUT, 1 + dart, 2, on);
      stamp(EYE_SHUT, 9 + dart, 2, on);
    } else {
      stamp(EYE_L, 1 + dart, 0, on);
      stamp(EYE_R, 9 + dart, 0, on);
    }
    stamp(['.....#', '#####.'], 5, 3, on);
  }
  const core = hit ? LED_HOT : LED;
  const glow = hit ? LED_HOT_GLOW : LED_GLOW;
  const glitch = hit ? st.hit : 0;
  for (let j = 0; j < ROWS; j++) {
    const jx = glitch ? Math.sin(st.t * 60 + j * 2) * glitch * 2.5 : 0;
    for (let i = 0; i < COLS; i++) {
      const x = SX + i * PITCH + jx;
      const y = SY + j * PITCH + 2.6;
      if (on.has(`${i},${j}`)) {
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, PITCH * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, PITCH * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2C3646';
        ctx.beginPath();
        ctx.arc(x, y, PITCH * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (idle) {
    // Loading spinner between the sleepy eyes.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const head = (Math.floor(st.t * 10) % 8 + 8) % 8;
      const age = (head - k + 8) % 8;
      const x = Math.cos(a) * 6.5;
      const y = -22 + Math.sin(a) * 6.5;
      ctx.fillStyle = age === 0 ? LED_GLOW : 'rgba(0,0,0,0)';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(138,245,223,${Math.max(0.15, 1 - age * 0.15)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Glass glare.
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(-30, -35);
  ctx.lineTo(-14, -35);
  ctx.lineTo(-24, -9);
  ctx.lineTo(-36, -9);
  ctx.closePath();
  ctx.fill();
}

/** @param {EGeo} g @param {EnemyState} st */
function sideBrush(g, st) {
  const { pen, ctx, lw } = g;
  const hx = 62;
  const hy = -3;
  const spin = st.t * (6 + 14 * st.moving) + (st.mode === 'idle' ? st.t * 4 : 0);
  for (let k = 0; k < 3; k++) {
    const a = spin + (k / 3) * Math.PI * 2;
    const ex = hx + Math.cos(a) * 24;
    const ey = hy + Math.sin(a) * 6;
    for (const d of [-0.18, 0, 0.18]) {
      pen.line(
        [
          { x: hx, y: hy },
          { x: hx + Math.cos(a + d) * 24, y: hy + Math.sin(a + d) * 6 },
        ],
        { width: lw * 0.6, color: '#7A6F86' },
      );
    }
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.blob(ellipsePts(hx, hy, 6, 2.6, 10), '#5A5F70', { width: lw * 0.7 });
}

/** @param {EGeo} g @param {EnemyState} st */
function antenna(g, st) {
  const { pen, ctx, lw } = g;
  const bx = -36;
  const by = TOP_Y - 4;
  const idle = st.mode === 'idle';
  const dx =
    Math.sin(st.t * 6) * 4 * st.moving +
    Math.sin(st.walk * 2) * 3 * st.moving +
    st.hit * Math.sin(st.t * 38) * 12 +
    (idle ? Math.sin(st.t * 2.2) * 9 : 0);
  const tip = { x: bx - 6 + dx, y: -88 + Math.abs(dx) * 0.2 };
  pen.line([{ x: bx, y: by }, { x: bx - 1 + dx * 0.3, y: -72 }, tip], { width: lw * 1.1 });
  const pulse = 0.5 + 0.5 * Math.sin(st.t * (idle ? 9 : 4));
  ctx.fillStyle = `rgba(242,100,90,${0.15 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 9, 0, Math.PI * 2);
  ctx.fill();
  pen.blob(ellipsePts(tip.x, tip.y, 5, 5, 10), soft(ctx, tip.x, tip.y, 5, '#FFC2B8', '#F2645A', '#B8433A'), { width: lw * 0.8 });
  pen.blob(ellipsePts(bx, by + 1, 6, 2.5, 10), '#8E95A6', { width: lw * 0.7 });
}

/** @param {EGeo} g @param {EnemyState} st */
function dent(g, st) {
  const { pen, ctx, lw } = g;
  const x = 30;
  const y = TOP_Y - 5;
  pen.blob(
    [
      { x: x - 13, y: y - 1 },
      { x: x - 5, y: y - 6 },
      { x: x + 4, y: y - 4 },
      { x: x + 14, y: y - 5 },
      { x: x + 12, y: y + 2 },
      { x: x + 2, y: y + 5 },
      { x: x - 8, y: y + 4 },
    ],
    '#A3A9B8',
    { width: lw * 0.8 },
  );
  pen.line([{ x: x - 7, y: y - 1 }, { x: x - 1, y: y + 1 }, { x: x + 4, y: y - 2 }], { width: lw * 0.6 });
  pen.line([{ x: x + 3, y: y + 2 }, { x: x + 8, y: y + 1 }], { width: lw * 0.6 });
  // Band-aid over the dent.
  ctx.save();
  ctx.translate(x + 2, y - 2);
  ctx.rotate(-0.35);
  pen.blob(
    [
      { x: -11, y: -3 },
      { x: 11, y: -3 },
      { x: 11, y: 3 },
      { x: -11, y: 3 },
    ],
    '#F2C9A0',
    { width: lw * 0.7 },
  );
  ctx.fillStyle = '#E3AE80';
  ctx.fillRect(-3, -2.2, 6, 4.4);
  ctx.restore();
  if (st.hit > 0.2 && st.mode !== 'death') {
    // Little orbiting stars.
    for (let k = 0; k < 3; k++) {
      const a = st.t * 6 + (k / 3) * Math.PI * 2;
      const sx = x + Math.cos(a) * 20;
      const sy = y - 14 + Math.sin(a) * 5;
      ctx.save();
      ctx.globalAlpha *= st.hit;
      /** @type {Pt[]} */
      const star = [];
      for (let i = 0; i < 10; i++) {
        const b = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 1.8 : 4.5;
        star.push({ x: sx + Math.cos(b) * r, y: sy + Math.sin(b) * r });
      }
      pen.blob(star, '#FFE58A', { width: lw * 0.5, amp: 0 });
      ctx.restore();
    }
  }
}

/** @type {EnemySpec} */
export const spec = {
  id: 'vroomba',
  height: 90,
  width: 170,
  gait: 'roll',
  deathText: 'Recalculating…',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    if (st.hit > 0.85) st.mem.dented = true;

    // Dust puffs trailing behind.
    if (st.moving > 0.05) {
      for (let k = 0; k < 3; k++) {
        const u = (st.t * 2.2 + k / 3) % 1;
        ctx.fillStyle = `rgba(201,195,184,${(1 - u) * 0.55 * st.moving})`;
        ctx.beginPath();
        ctx.arc(-84 - u * 26, -5 - u * 10, 4 + u * 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Wheels peeking out.
    for (const wx of [-50, 46]) pen.blob(ellipsePts(wx, -3, 11, 4, 10), '#3F4352', { width: lw * 0.7 });

    // Side band.
    /** @type {Pt[]} */
    const band = [];
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI;
      band.push({ x: Math.cos(a) * RX, y: TOP_Y + Math.sin(a) * RY });
    }
    for (let i = n; i >= 0; i--) {
      const a = (i / n) * Math.PI;
      band.push({ x: Math.cos(a) * RX, y: BOT_Y + Math.sin(a) * RY });
    }
    const bg = ctx.createLinearGradient(0, -40, 0, 0);
    bg.addColorStop(0, '#7A8094');
    bg.addColorStop(1, '#4B4F60');
    pen.blob(band, bg);
    // Vent slits + front bumper strip.
    for (const vx of [-68, -62, -56]) pen.line([{ x: vx, y: -30 }, { x: vx - 1, y: -14 }], { width: lw * 0.6, color: '#3A3E4C' });
    pen.line([{ x: 46, y: -27 }, { x: 62, y: -24 }, { x: 74, y: -18 }], { width: lw * 1.4, color: '#9AA1B2' });

    // Top lid.
    pen.blob(ellipsePts(0, TOP_Y, RX, RY, 30), soft(ctx, -10, TOP_Y - 4, 82, '#FAFBFD', '#D3D8E2', '#A1A8B8'));
    pen.blob(ellipsePts(-2, TOP_Y - 1, 56, 11.5, 26), null, { width: lw * 0.6, ink: '#8E95A6' });
    pen.blob(ellipsePts(-4, TOP_Y - 2, 11, 4.2, 14), '#E9ECF2', { width: lw * 0.7 });
    const ledOn = 0.5 + 0.5 * Math.sin(st.t * 3);
    ctx.fillStyle = `rgba(110,214,140,${0.4 + 0.6 * ledOn})`;
    ctx.beginPath();
    ctx.arc(-4, TOP_Y - 2.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-40, TOP_Y - 8, 18, 3.5, -0.08, 0, Math.PI * 2);
    ctx.fill();
    // Model badge.
    ctx.fillStyle = '#7A8094';
    ctx.font = `700 7px Fredoka, "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('V-9', 46, TOP_Y + 9);

    if (st.mem.dented) dent(g, st);
    antenna(g, st);
    screen(g, st);
    sideBrush(g, st);
  },
};
