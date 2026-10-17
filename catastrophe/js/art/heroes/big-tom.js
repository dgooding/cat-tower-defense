// @ts-check
// Big Tom: a grizzled, burly orange corner-shop cat. Tiny apron, toothpick, notched ear,
// arms crossed, eyes half-closed. Has seen things. Is not impressed by any of them.
import { ellipsePts, soft } from '../brush.js';
import { hash2, clamp, lerp } from '../../core/rng.js';
import { INK } from '../palette.js';

/** @typedef {import('../cats/catrig.js').CatSpec} CatSpec */
/** @typedef {import('../cats/catrig.js').Geo} Geo */
/** @typedef {import('../cats/catrig.js').CatRig} CatRig */
/** @typedef {import('../brush.js').Pt} Pt */

const FUR = '#D9843E';
const FUR_LIGHT = '#F0AE6E';
const FUR_SHADE = '#A9612C';
const STRIPE = '#A8591F';
const PAW = '#F6E7CF';
const APRON = '#3F7A5A';
const APRON_LIGHT = '#5E9C78';
const APRON_DARK = '#2C5A41';
const GRIZZLE = '#BDB3A6';
const SIGN = '#FFF6E2';
const SALMON = '#F59B6B';
const NORI = '#2F4A3A';
const RICE = '#FFFDF6';

/** @param {number} u */
const ease = (u) => {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
};

/** Keep polygon corners crisp under the rounded brush path. @param {Pt[]} pts @param {number} [r] */
function boxy(pts, r = 2.5) {
  /** @type {Pt[]} */
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n];
    const p = pts[i];
    const b = pts[(i + 1) % n];
    const ka = Math.min(r / (Math.hypot(a.x - p.x, a.y - p.y) || 1), 0.45);
    const kb = Math.min(r / (Math.hypot(b.x - p.x, b.y - p.y) || 1), 0.45);
    out.push({ x: p.x + (a.x - p.x) * ka, y: p.y + (a.y - p.y) * ka }, { x: p.x + (b.x - p.x) * kb, y: p.y + (b.y - p.y) * kb });
  }
  return out;
}

/** One-shot cues inside an action timeline. @param {CatRig} rig @param {string} key @param {number} t */
function cueOf(rig, key, t) {
  const R = /** @type {any} */ (rig);
  let st = R[key];
  if (!st || t < st.last) st = R[key] = { last: t };
  st.last = t;
  return (/** @type {string} */ k, /** @type {number} */ at) => {
    if (t >= at && !st[k]) {
      st[k] = true;
      return true;
    }
    return false;
  };
}

// ---------------------------------------------------------------------------
// Per-rig state, keyed by the rig's Pen. Actions write the arm pose; once Tom has
// acted, the face accessory also reads his ears/eyes so the notch and the heavy
// lids follow along.

/** @typedef {{x:number, y:number, item?:'sign'|'sushi'|null, flip?:number, sign?:number, beans?:boolean}} Pose */
/** @type {WeakMap<object, Pose & {at:number}>} */
const POSE = new WeakMap();
/** @type {WeakMap<object, CatRig>} */
const RIGS = new WeakMap();

/** @param {CatRig} rig @param {Pose} p */
function setPose(rig, p) {
  if (!rig.pen) return;
  RIGS.set(rig.pen, rig);
  POSE.set(rig.pen, { ...p, at: rig.time });
}

/** @param {Geo} g @returns {Pose|null} */
function poseOf(g) {
  const p = POSE.get(g.pen);
  return p && Math.abs(p.at - g.t) < 1e-4 ? p : null;
}

const SHOULDER_R = { x: 64, y: -92 };
const SHOULDER_L = { x: -64, y: -90 };

// ---------------------------------------------------------------------------
// Outfit and face.

/** Big cheeks and a little scar over the right eye. @param {Geo} g @param {{hrx:number, hry:number}} h */
function jowls(g, h) {
  const { ctx, hy, pen, lw } = g;
  for (const s of [-1, 1]) {
    const gr = ctx.createRadialGradient(s * h.hrx * 0.78, hy + 34, 2, s * h.hrx * 0.78, hy + 34, 34);
    gr.addColorStop(0, 'rgba(169,97,44,0.35)');
    gr.addColorStop(1, 'rgba(169,97,44,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(s * h.hrx * 0.78, hy + 34, 36, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.line([{ x: 52, y: hy - 36 }, { x: 56, y: hy - 24 }, { x: 59, y: hy - 12 }], { color: '#EDBFA6', width: lw * 1.6, amp: 0 });
  for (const y of [-30, -20]) pen.line([{ x: 52, y: hy + y + 1 }, { x: 61, y: hy + y - 1 }], { color: FUR_SHADE, width: lw * 0.6, amp: 0 });
}

/** Tiny bodega apron, straining heroically around a large belly. @param {Geo} g */
function apron(g) {
  const { pen, ctx, brx, lw } = g;
  pen.tube([{ x: -brx * 0.97, y: -64 }, { x: 0, y: -56 }, { x: brx * 0.97, y: -64 }], 6, APRON_DARK);
  /** @type {Pt[]} */
  const pts = [
    { x: -17, y: -106 },
    { x: 17, y: -106 },
    { x: 19, y: -62 },
    { x: 33, y: -56 },
    { x: 36, y: -22 },
    { x: 0, y: -17 },
    { x: -36, y: -22 },
    { x: -33, y: -56 },
    { x: -19, y: -62 },
  ];
  const w = pen.blob(boxy(pts, 4), soft(ctx, -10, -60, 50, APRON_LIGHT, APRON, APRON_DARK));
  ctx.save();
  ctx.beginPath();
  w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,253,246,0.22)';
  for (let x = -36; x < 40; x += 9) ctx.fillRect(x, -110, 2.2, 100);
  ctx.restore();
  // Pocket with a pencil, and a name tag.
  pen.line([{ x: 22, y: -48 }, { x: 26, y: -32 }], { color: '#F2C14E', width: lw * 2.6 });
  pen.line([{ x: 21.4, y: -50 }, { x: 22.4, y: -46 }], { color: '#E98A9A', width: lw * 2.6, amp: 0 });
  pen.blob(
    boxy([
      { x: 8, y: -38 },
      { x: 30, y: -38 },
      { x: 29, y: -24 },
      { x: 9, y: -24 },
    ]),
    APRON_DARK,
    { width: lw * 0.85 },
  );
  ctx.save();
  ctx.translate(-16, -36);
  ctx.rotate(-0.12);
  pen.blob(
    boxy([
      { x: -13, y: -6 },
      { x: 13, y: -6 },
      { x: 13, y: 6 },
      { x: -13, y: 6 },
    ]),
    SIGN,
    { width: lw * 0.8 },
  );
  ctx.fillStyle = '#C8432F';
  ctx.font = '700 8.5px Fredoka, "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOM', 0, 0.6);
  ctx.restore();
}

/** @param {Geo} g @param {Pt} a shoulder @param {Pt} m elbow-ish @param {Pt} p paw */
function arm(g, a, m, p) {
  const { pen, lw } = g;
  const w = pen.tube([a, m, p], 26, FUR);
  for (const u of [0.35, 0.6]) {
    const i = Math.floor(u * (w.length - 1));
    const q = w[Math.min(w.length - 1, i + 1)];
    const o = w[i];
    const dx = q.x - o.x;
    const dy = q.y - o.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * 9;
    const ny = (dx / l) * 9;
    const c = { x: o.x + (q.x - o.x) * 0.5, y: o.y + (q.y - o.y) * 0.5 };
    pen.line([{ x: c.x - nx, y: c.y - ny }, { x: c.x + nx * 0.4, y: c.y + ny * 0.4 }], { color: STRIPE, width: lw * 1.8, amp: 0 });
  }
}

/** @param {Geo} g @param {number} x @param {number} y @param {number} r @param {boolean} [beans] */
function bigPaw(g, x, y, r, beans = false) {
  const { pen, ctx, lw } = g;
  pen.blob(ellipsePts(x, y, r, r * 0.9, 16), PAW);
  if (beans) {
    ctx.fillStyle = '#E7A0A2';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.22, r * 0.38, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [bx, by] of [[-0.5, -0.3], [0, -0.52], [0.5, -0.3]]) {
      ctx.beginPath();
      ctx.ellipse(x + bx * r, y + by * r, r * 0.17, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (const d of [-0.32, 0.32]) pen.line([{ x: x + d * r, y: y - r * 0.85 }, { x: x + d * r, y: y - r * 0.3 }], { width: lw * 0.65, amp: 0 });
  }
}

/** Arms crossed over the chest (the default), or whatever the current action needs. @param {Geo} g */
function arms(g) {
  const p = poseOf(g);
  if (!p) {
    arm(g, { x: -66, y: -82 }, { x: -18, y: -56 }, { x: 36, y: -62 });
    bigPaw(g, 42, -64, 14);
    arm(g, { x: 66, y: -86 }, { x: 16, y: -66 }, { x: -38, y: -72 });
    bigPaw(g, -44, -74, 14);
    return;
  }
  // Off arm rests at his side.
  arm(g, SHOULDER_L, { x: -82, y: -60 }, { x: -70, y: -32 });
  bigPaw(g, -70, -28, 14);
  const m = { x: (SHOULDER_R.x + p.x) / 2 + 10, y: (SHOULDER_R.y + p.y) / 2 + 12 };
  arm(g, SHOULDER_R, m, p);
  if (p.item === 'sign') closedSign(g, p.x, p.y, p.flip ?? 0, p.sign ?? 1);
  if (p.item === 'sushi') nigiri(g, p.x + 2, p.y - 16, -0.2);
  bigPaw(g, p.x, p.y, 17, p.beans);
}

/** Half-lidded eyes, bags, grizzled muzzle, toothpick and the notched ear. @param {Geo} g */
function face(g) {
  const { pen, ctx, S, hy, lw, t } = g;
  const rig = RIGS.get(g.pen);
  // Notched left ear (follows the ear's own rotation once we know the rig).
  {
    const es = S.earSize ?? 1;
    const inner = { x: -18, y: hy - 44 };
    const outer = { x: -72, y: hy - 20 };
    const tip = { x: -58, y: hy - 46 - 50 * es };
    const pv = { x: (inner.x + outer.x) / 2, y: (inner.y + outer.y) / 2 };
    const ang = rig ? -(0.85 * rig.ears.x + 0.3 * rig.earL.value) : 0;
    const L = (/** @type {Pt} */ a, /** @type {Pt} */ b, /** @type {number} */ u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
    const A = L(outer, tip, 0.48);
    const B = L(outer, tip, 0.7);
    const cen = { x: (inner.x + outer.x + tip.x) / 3, y: (inner.y + outer.y + tip.y) / 3 };
    const mid = L(A, B, 0.5);
    const C = L(mid, cen, 0.42);
    const rot = (/** @type {Pt} */ q) => {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      return { x: pv.x + (q.x - pv.x) * c - (q.y - pv.y) * s, y: pv.y + (q.x - pv.x) * s + (q.y - pv.y) * c };
    };
    const out = (/** @type {Pt} */ q) => ({ x: q.x + (q.x - cen.x) * 0.08, y: q.y + (q.y - cen.y) * 0.08 });
    pen.blob([out(A), C, out(B)].map(rot), FUR_SHADE, { width: lw * 0.9, amp: 0 });
  }
  // Grizzled muzzle.
  ctx.save();
  ctx.fillStyle = GRIZZLE;
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1;
    const x = s * (6 + hash2(i, 4) * 20);
    const y = hy + 18 + hash2(i, 8) * 16;
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Heavy, unbothered lids (only over plain open eyes).
  const showLids =
    !rig ||
    (rig.expr === 'idle' && rig.yawnT < 0 && (!rig.ov.eye || rig.ov.eye === 'open') && (rig.ov.lid ?? 0) < 0.36 && rig.blink.value < 0.36);
  for (const s of [-1, 1]) {
    const cx = s * 31;
    const cy = hy + 1;
    if (showLids) {
      const top = cy - 22.5;
      const H = 45;
      const yIn = top + H * 0.33;
      const yOut = top + H * 0.39;
      const inner = cx - s * 19;
      const outerX = cx + s * 19;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 21, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = S.lidColor ?? S.fur;
      ctx.beginPath();
      ctx.moveTo(inner, top - 4);
      ctx.lineTo(outerX, top - 4);
      ctx.lineTo(outerX, yOut);
      ctx.quadraticCurveTo(cx, (yIn + yOut) / 2 + 2, inner, yIn);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(inner, yIn);
      ctx.quadraticCurveTo(cx, (yIn + yOut) / 2 + 2, outerX, yOut);
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 1.7;
      ctx.stroke();
      ctx.restore();
    }
    pen.line([{ x: cx - s * 9, y: cy + 23 }, { x: cx + s * 2, y: cy + 26 }, { x: cx + s * 12, y: cy + 22 }], { width: lw * 0.7, alpha: 0.45 });
  }
  // Toothpick, chewed thoughtfully.
  const wig = Math.sin(t * 1.3) * 0.08 + Math.sin(t * 5.1) * 0.02;
  const x0 = 8;
  const y0 = hy + 25;
  const len = 42;
  const a = -0.42 + wig;
  pen.blob(
    [
      { x: x0, y: y0 - 1.6 },
      { x: x0 + Math.cos(a) * len, y: y0 + Math.sin(a) * len - 0.8 },
      { x: x0 + Math.cos(a) * (len + 4), y: y0 + Math.sin(a) * (len + 4) },
      { x: x0 + Math.cos(a) * len, y: y0 + Math.sin(a) * len + 0.8 },
      { x: x0, y: y0 + 1.6 },
    ],
    '#E8C48A',
    { width: lw * 0.85 },
  );
}

// ---------------------------------------------------------------------------
// Props and FX.

/** Hanging OPEN/CLOSED sign under the paw. @param {Geo} g @param {number} px @param {number} py @param {number} flip 0 = OPEN, 1 = CLOSED @param {number} scale */
function closedSign(g, px, py, flip, scale) {
  const { pen, ctx, lw, t } = g;
  if (scale <= 0.02) return;
  const swing = Math.sin(t * 3) * 0.06;
  ctx.save();
  ctx.translate(px, py + 6);
  ctx.rotate(swing);
  ctx.scale(scale, scale);
  pen.line([{ x: -22, y: 26 }, { x: 0, y: 2 }, { x: 22, y: 26 }], { width: lw * 0.8 });
  ctx.translate(0, 46);
  const sx = Math.abs(Math.cos(flip * Math.PI));
  ctx.scale(Math.max(0.04, sx), 1);
  const closed = flip > 0.5;
  pen.blob(
    boxy([
      { x: -44, y: -20 },
      { x: 44, y: -20 },
      { x: 44, y: 20 },
      { x: -44, y: 20 },
    ], 5),
    soft(ctx, -10, -8, 50, '#FFFFFF', SIGN, '#E9D9B8'),
  );
  pen.blob(
    boxy([
      { x: -38, y: -14 },
      { x: 38, y: -14 },
      { x: 38, y: 14 },
      { x: -38, y: 14 },
    ], 4),
    null,
    { ink: closed ? '#C8432F' : '#5E9A4E', width: lw * 0.8 },
  );
  ctx.fillStyle = closed ? '#C8432F' : '#5E9A4E';
  ctx.font = `700 ${closed ? 17 : 20}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(closed ? 'CLOSED' : 'OPEN', 0, 1);
  ctx.restore();
}

/** Salmon nigiri. @param {Geo} g @param {number} x @param {number} y @param {number} rot */
function nigiri(g, x, y, rot) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  pen.blob(ellipsePts(0, 4, 17, 9, 16, (a) => 1 + 0.08 * Math.cos(2 * a)), soft(ctx, -4, 0, 17, '#FFFFFF', RICE, '#E6DED0'));
  const fish = pen.blob(ellipsePts(0, -3, 19, 7.5, 16, (a) => 1 + (Math.sin(a) < 0 ? 0.1 : -0.05)), soft(ctx, -4, -6, 19, '#FFC4A0', SALMON, '#E07A4A'));
  ctx.save();
  ctx.beginPath();
  fish.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,230,0.85)';
  ctx.lineWidth = lw * 0.8;
  for (const sx of [-10, -2, 6, 14]) {
    ctx.beginPath();
    ctx.moveTo(sx - 3, -10);
    ctx.lineTo(sx + 3, 4);
    ctx.stroke();
  }
  ctx.restore();
  pen.blob(
    boxy([
      { x: -4, y: -11 },
      { x: 4, y: -11 },
      { x: 4, y: 12 },
      { x: -4, y: 12 },
    ], 1.5),
    NORI,
    { width: lw * 0.7 },
  );
  ctx.restore();
}

/** Maki roll. @param {Geo} g @param {number} x @param {number} y @param {number} rot */
function maki(g, x, y, rot) {
  const { pen, ctx } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  pen.blob(ellipsePts(0, 0, 13, 13, 16), NORI);
  pen.blob(ellipsePts(0, 0, 9.5, 9.5, 14), RICE, { width: g.lw * 0.5 });
  ctx.fillStyle = SALMON;
  ctx.beginPath();
  ctx.arc(-1.5, -1, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8DBF6A';
  ctx.beginPath();
  ctx.arc(3, 2.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** @param {Geo} g @param {number} x @param {number} y @param {number} r @param {number} alpha */
function dust(g, x, y, r, alpha) {
  const { ctx } = g;
  if (r <= 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha);
  ctx.fillStyle = '#EFE3CC';
  ctx.strokeStyle = INK;
  ctx.lineWidth = g.lw * 0.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Ground impact of the paw bop. @param {number} x */
function bopFx(x) {
  return {
    t: 0,
    life: 0.6,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, lw } = g;
      const k = f.t / f.life;
      for (let i = 0; i < 5; i++) {
        const s = i - 2;
        dust(g, x + s * (16 + k * 36), -6 - Math.abs(s) * 2 - k * 10, 10 - k * 9 + (2 - Math.abs(s)), 1 - k);
      }
      for (const a of [-2.6, -2.1, -1.57, -1.05, -0.55]) {
        const r0 = 30 + k * 40;
        pen.line(
          [
            { x: x + Math.cos(a) * r0, y: -14 + Math.sin(a) * r0 * 0.8 },
            { x: x + Math.cos(a) * (r0 + 18), y: -14 + Math.sin(a) * (r0 + 18) * 0.8 },
          ],
          { width: lw * 1.3, alpha: 1 - k },
        );
      }
    },
  };
}

/** Day-old sushi lobbed at the team. Still good. @param {'nigiri'|'maki'} kind @param {number} x @param {number} y @param {number} vx @param {number} vy */
function sushiFx(kind, x, y, vx, vy) {
  return {
    t: 0,
    life: 1.7,
    x,
    y,
    vx,
    vy,
    rot: 0,
    landed: -1,
    update(/** @type {any} */ f, /** @type {number} */ dt) {
      if (f.landed >= 0) return;
      f.vy += 1100 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += dt * 9;
      if (f.y > -12) {
        f.y = -12;
        f.landed = f.t;
        f.rot = 0;
      }
    },
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw, t } = g;
      const fade = f.t > f.life - 0.25 ? (f.life - f.t) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(fade, 0, 1);
      // Wobbly "aroma" lines.
      for (const s of [-1, 1]) {
        const bx = f.x + s * 8;
        /** @type {Pt[]} */
        const pts = [];
        for (let i = 0; i <= 4; i++) pts.push({ x: bx + Math.sin(t * 7 + i * 1.4 + s) * 3, y: f.y - 18 - i * 6 });
        pen.line(pts, { color: '#9DB58A', width: lw * 0.9, alpha: 0.8 });
      }
      if (kind === 'nigiri') nigiri(g, f.x, f.y, f.landed >= 0 ? 0 : f.rot);
      else maki(g, f.x, f.y, f.rot);
      // A small, loyal fly.
      const fa = t * 7 + (kind === 'maki' ? 2 : 0);
      const fx = f.x + Math.cos(fa) * 22;
      const fy = f.y - 30 + Math.sin(fa * 1.3) * 8;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(fx + s * 2.5, fy - 3, 2.6, 1.6, s * 0.5 + Math.sin(t * 60) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
      // Healing sparkles once it lands.
      if (f.landed >= 0) {
        const k = (f.t - f.landed) / 0.9;
        for (let i = 0; i < 4; i++) {
          const ph = (k + i * 0.25) % 1;
          const px = f.x - 24 + i * 16;
          const py = f.y - 20 - ph * 50;
          ctx.save();
          ctx.globalAlpha *= Math.sin(ph * Math.PI);
          if (i % 2) {
            ctx.fillStyle = '#8DBF6A';
            ctx.fillRect(px - 2, py - 7, 4, 14);
            ctx.fillRect(px - 7, py - 2, 14, 4);
          } else {
            ctx.fillStyle = '#F48CA0';
            ctx.beginPath();
            ctx.moveTo(px, py + 5);
            ctx.bezierCurveTo(px - 8, py - 1, px - 4, py - 8, px, py - 3);
            ctx.bezierCurveTo(px + 4, py - 8, px + 8, py - 1, px, py + 5);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------

const ARM_REST = { x: 70, y: -58 };

/** @type {CatSpec} */
export const spec = {
  id: 'big-tom',
  fur: FUR,
  light: FUR_LIGHT,
  shade: FUR_SHADE,
  cream: '#F3E2C6',
  muzzle: '#F6E7CF',
  paw: PAW,
  stripe: STRIPE,
  eye: '#C9C25A',
  eyeDark: '#5B5A1E',
  eyeLight: '#EEE79A',
  innerEar: '#E7A0A2',
  nose: '#C97A6E',
  pattern: 'tabby',
  headPattern: jowls,
  brow: 'grumpy',
  pupil: 0.85,
  bodyW: 1.32,
  bodyH: 1.08,
  headW: 1.16,
  earSize: 0.78,
  tailLen: 0.9,
  tailWidth: 1.35,
  tiers: {
    T1: [
      { layer: 'body', draw: apron },
      { layer: 'neck', draw: arms },
      { layer: 'head', draw: face },
    ],
  },
  actions: {
    /** Raise one enormous paw. Bop. */
    attack: {
      duration: 1.15,
      update(rig, t) {
        const cue = cueOf(rig, '_tomBop', t);
        const up = { x: 104, y: -200 };
        const down = { x: 134, y: -28 };
        if (t < 0.34) {
          const u = ease(t / 0.32);
          setPose(rig, { x: lerp(ARM_REST.x, up.x, u), y: lerp(ARM_REST.y, up.y, u) });
          rig.ov.lid = 0.5;
          rig.ov.mouth = 'flat';
          rig.ov.lean = -0.04 * u;
        } else if (t < 0.43) {
          const u = ((t - 0.34) / 0.09) ** 2;
          setPose(rig, { x: lerp(up.x, down.x, u), y: lerp(up.y, down.y, u), beans: true });
          rig.ov.lean = 0.06;
          rig.ov.lid = 0.4;
        } else if (t < 0.85) {
          setPose(rig, { x: down.x, y: down.y + Math.sin((t - 0.43) * 30) * 2 * Math.exp(-(t - 0.43) * 8), beans: true });
          rig.ov.lid = 0.55;
          rig.ov.mouth = 'smirk';
          rig.ov.lean = 0.06 * (1 - (t - 0.43) / 0.42);
        } else {
          const u = ease((t - 0.85) / 0.25);
          setPose(rig, { x: lerp(down.x, ARM_REST.x, u), y: lerp(down.y, ARM_REST.y, u) });
          rig.ov.lid = 0.5;
          rig.ov.mouth = 'smirk';
        }
        if (cue('lift', 0)) rig.squash.kick(1.2);
        if (cue('bop', 0.42)) {
          rig.squash.kick(-3.6);
          rig.fx.push(bopFx(down.x));
          rig.say('BOP.', 176, -116, 30);
        }
      },
    },
    /** Flip the sign to CLOSED and invite everyone to come complain in person. */
    a1: {
      duration: 2.5,
      update(rig, t) {
        const cue = cueOf(rig, '_tomClosed', t);
        const hold = { x: 122, y: -158 };
        const flip = clamp((t - 0.5) / 0.3, 0, 1);
        if (t < 0.3) {
          const u = ease(t / 0.3);
          setPose(rig, { x: lerp(ARM_REST.x, hold.x, u), y: lerp(ARM_REST.y, hold.y, u), item: 'sign', flip: 0, sign: u });
          rig.ov.lid = 0.5;
          rig.ov.mouth = 'flat';
        } else if (t < 2.05) {
          setPose(rig, { x: hold.x, y: hold.y + Math.sin(t * 2.2) * 2, item: 'sign', flip, sign: 1 });
          rig.ov.lid = flip > 0.5 ? 0.55 : 0.5;
          rig.ov.mouth = flip > 0.5 ? 'smirk' : 'flat';
          if (t > 1.3 && t < 1.9) rig.ov.tilt = -0.08;
        } else {
          const u = ease((t - 2.05) / 0.4);
          setPose(rig, { x: lerp(hold.x, ARM_REST.x, u), y: lerp(hold.y, ARM_REST.y, u), item: 'sign', flip: 1, sign: 1 - u });
          rig.ov.lid = 0.55;
          rig.ov.mouth = 'smirk';
        }
        if (cue('flip', 0.62)) rig.squash.kick(-2.4);
        if (cue('closed', 0.85)) rig.say("Shop's closed.", -40, -300, 22);
        if (cue('taunt', 1.35)) {
          rig.squash.kick(-1.6);
          rig.say("c'mere, pal.", 150, -270, 20);
        }
      },
    },
    /** Lob a little day-old sushi to the team. */
    a2: {
      duration: 2.3,
      update(rig, t) {
        const cue = cueOf(rig, '_tomSushi', t);
        const pocket = { x: 22, y: -36 };
        const lift = { x: 112, y: -172 };
        const follow = { x: 150, y: -118 };
        if (t < 0.3) {
          const u = ease(t / 0.25);
          setPose(rig, { x: lerp(ARM_REST.x, pocket.x, u), y: lerp(ARM_REST.y, pocket.y, u) });
          rig.ov.lid = 0.5;
          rig.ov.tilt = 0.06;
        } else if (t < 0.55) {
          const u = ease((t - 0.3) / 0.25);
          setPose(rig, { x: lerp(pocket.x, lift.x, u), y: lerp(pocket.y, lift.y, u), item: 'sushi' });
          rig.ov.lid = 0.45;
          rig.ov.mouth = 'flat';
        } else if (t < 1.4) {
          const u = ease((t - 0.55) / 0.2);
          setPose(rig, { x: lerp(lift.x, follow.x, u), y: lerp(lift.y, follow.y, u) });
          rig.ov.lid = 0.5;
          rig.ov.mouth = 'smirk';
        } else {
          const u = ease((t - 1.4) / 0.4);
          setPose(rig, { x: lerp(follow.x, ARM_REST.x, u), y: lerp(follow.y, ARM_REST.y, u) });
          rig.ov.lid = 0.55;
          rig.ov.mouth = 'smirk';
        }
        if (cue('say', 0.05)) rig.say('day-old sushi…', -20, -300, 20);
        if (cue('toss', 0.55)) {
          rig.squash.kick(-2);
          rig.fx.push(sushiFx('nigiri', 120, -186, 135, -380));
        }
        if (cue('toss2', 0.75)) rig.fx.push(sushiFx('maki', 140, -140, 175, -300));
        if (cue('good', 0.8)) {
          rig.squash.kick(-1.6);
          rig.say('still good!', 90, -270, 24);
        }
      },
    },
  },
};

/** Hero metadata used by gameplay, hero select and the Cat-alog. */
export const hero = {
  id: 'big-tom',
  name: 'Big Tom',
  title: 'Bodega Legend',
  blurb: 'A grizzled orange corner-shop cat with a tiny apron and a notched ear. Has seen things. Was unimpressed by all of them.',
  style: /** @type {'melee'|'ranged'|'tank'} */ ('tank'),
  abilities: [
    { id: 'a1', key: 'Z', name: "Shop's Closed", desc: 'Taunts all nearby enemies to attack him.' },
    { id: 'a2', key: 'X', name: 'Day-Old Sushi', desc: 'Heals kittens and dries off wet cats.' },
  ],
  passive: { name: 'Regular Customer', desc: '+5 treats per kill nearby.' },
};

export const tiers = [{ id: 'T1', label: 'Hero' }];
