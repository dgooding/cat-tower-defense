// @ts-check
// Party Pooper: a shiny magenta foil balloon wearing a tiny party hat, looking profoundly bored.
// Crimped seam, mylar sheen, curly ribbon string. Idle fidget: a long eye-roll and a yawn.
import { googlyEye, ellipsePts, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const FOIL = '#C25AA8';
const FOIL_L = '#F7C6EA';
const FOIL_D = '#7E2F72';
const SEAM = '#E79BD3';
const RIBBON = '#F2C14E';
const HAT_A = '#7EC8E3';
const HAT_B = '#FFE58A';

const BX = 0;
const BY = -112;
const BR = 52;

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** Pillowy balloon outline. @param {number} crinkle */
function balloonPts(crinkle) {
  return ellipsePts(BX, BY, BR * 1.04, BR, 40, (a, i) => 1 + 0.03 * Math.cos(a * 4) + crinkle * (i % 2 ? -0.03 : 0.03));
}

/** @param {EGeo} g @param {EnemyState} st */
function ribbon(g, st) {
  const { pen } = g;
  /** @type {Pt[]} */
  const pts = [];
  const n = 40;
  const sway = Math.sin(st.t * 1.6) * 8;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const curl = Math.sin(s * Math.PI * 7 + st.t * 3) * (5 + s * 4);
    pts.push({ x: BX + 2 + curl + sway * s * s, y: BY + BR + 10 + s * 66 });
  }
  pen.tube(pts, 2.6, RIBBON);
}

/** @param {EGeo} g @param {EnemyState} st @param {boolean} hit */
function partyHat(g, st, hit) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(18, BY - BR + 6 - (hit ? st.hit * 14 : 0));
  ctx.rotate(0.38 + Math.sin(st.t * 2.2) * 0.05 + (hit ? st.hit * 0.5 : 0));
  /** @type {Pt[]} */
  const cone = [
    { x: -15, y: 0 },
    { x: 0, y: -36 },
    { x: 15, y: 0 },
  ];
  const w = pen.blob(cone, HAT_A, { width: lw * 0.9 });
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = HAT_B;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-20, -6 - i * 10);
    ctx.lineTo(20, -12 - i * 10);
    ctx.lineTo(20, -17 - i * 10);
    ctx.lineTo(-20, -11 - i * 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  pen.blob(w, null, { width: lw * 0.9, amp: 0 });
  pen.blob(ellipsePts(0, -37, 5.5, 5.5, 10), '#F4A6B7', { width: lw * 0.8 });
  pen.line([{ x: -14, y: 2 }, { x: -24, y: 8 }], { width: lw * 0.6 });
  ctx.restore();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'party-pooper',
  height: 170,
  width: 110,
  gait: 'float',
  deathText: 'POP! 🎉',
  draw(g, st) {
    const { pen, ctx, lw } = g;
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const idle = st.mode === 'idle';
    const c = st.t % 4.4;
    const roll = idle && !hit ? smooth(0.2, 0.7, c) * (1 - smooth(1.8, 2.3, c)) : 0;
    const yawn = idle && !hit ? Math.sin(smooth(2.5, 3.9, c) * Math.PI) : 0;

    ribbon(g, st);
    // Knot / neck tab.
    pen.blob(
      [
        { x: BX - 6, y: BY + BR - 2 },
        { x: BX + 6, y: BY + BR - 2 },
        { x: BX + 4, y: BY + BR + 10 },
        { x: BX - 4, y: BY + BR + 10 },
      ],
      FOIL_D,
      { width: lw * 0.8 },
    );

    // Foil body with metallic banding.
    const body = balloonPts(hit ? st.hit : 0);
    const fg = ctx.createLinearGradient(BX - BR, BY - BR, BX + BR, BY + BR);
    fg.addColorStop(0, FOIL_L);
    fg.addColorStop(0.25, FOIL);
    fg.addColorStop(0.45, '#E58FD0');
    fg.addColorStop(0.62, FOIL);
    fg.addColorStop(1, FOIL_D);
    const w = pen.blob(body, fg);
    // Crimped seam just inside the edge.
    /** @type {Pt[]} */
    const seam = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const r = (i % 2 ? 0.9 : 0.94) * BR;
      seam.push({ x: BX + Math.cos(a) * r * 1.04, y: BY + Math.sin(a) * r });
    }
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < seam.length; i++) {
      if (i === 0) ctx.moveTo(seam[i].x, seam[i].y);
      else ctx.lineTo(seam[i].x, seam[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = SEAM;
    ctx.lineWidth = lw * 0.6;
    ctx.globalAlpha *= 0.8;
    ctx.stroke();
    ctx.restore();
    // Shine.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w[0].x, w[0].y);
    for (const p of w) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(BX, BY, BR * 0.74, Math.PI * 1.1, Math.PI * 1.42);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(BX, BY, BR * 0.74, Math.PI * 1.5, Math.PI * 1.56);
    ctx.stroke();
    // Faint reflection band glides across.
    const gx = BX - BR + ((st.t * 30) % (BR * 3));
    const rg = ctx.createLinearGradient(gx - 14, 0, gx + 14, 0);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(gx - 14, BY - BR, 28, BR * 2);
    ctx.restore();
    if (hit) {
      // Foil crinkles.
      for (const [x0, y0, x1, y1, x2, y2] of [[-30, -138, -22, -132, -28, -126], [28, -100, 36, -96, 30, -88]]) {
        pen.line([{ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x2, y: y2 }], { width: lw * 0.7, color: FOIL_D });
      }
    }

    partyHat(g, st, hit);

    // Bored face.
    const ox = st.lookX;
    const oy = st.lookY;
    if (roll > 0) {
      const ang = -Math.PI / 2 + (roll - 0.5) * 2.2;
      st.lookX = Math.cos(ang) * roll;
      st.lookY = Math.sin(ang) * roll * 1.2;
    } else if (!hit) {
      st.lookX = -0.5;
      st.lookY = 0.35;
    }
    const lid = hit ? 0 : 0.56 - roll * 0.2 + yawn * 0.3;
    googlyEye(g, st, 'pp-l', -16, -118, 12, { lid, lidColor: FOIL, pupil: 0.5, look: 1.6 });
    googlyEye(g, st, 'pp-r', 14, -118, 12, { lid, lidColor: FOIL, pupil: 0.5, look: 1.6 });
    st.lookX = ox;
    st.lookY = oy;
    // Flat, unimpressed brows.
    const bu = hit ? -7 : 0;
    pen.line([{ x: -27, y: -134 + bu }, { x: -6, y: -133 + bu }], { width: lw * 1.2 });
    pen.line([{ x: 4, y: -133 + bu }, { x: 25, y: -134 + bu }], { width: lw * 1.2 });
    if (hit) mouth(g, 0, -98, 6, 'o');
    else if (yawn > 0.15) mouth(g, 2, -100, 4 + yawn * 6, 'o');
    else pen.line([{ x: -7, y: -94 }, { x: 4, y: -94 }, { x: 10, y: -96 }], { width: lw * 1.1 });
  },
};
