// @ts-check
// Nebula: an extremely fluffy white Persian astronomer on a crocheted cloud cushion,
// bundled in a star-map scarf and peering through a brass telescope.
import { ellipsePts, soft, fxText } from '../brush.js';
import { star } from '../cats/catrig.js';
import { hash2, clamp, lerp } from '../../core/rng.js';
import { INK } from '../palette.js';

/** @typedef {import('../cats/catrig.js').CatSpec} CatSpec */
/** @typedef {import('../cats/catrig.js').Geo} Geo */
/** @typedef {import('../cats/catrig.js').CatRig} CatRig */
/** @typedef {import('../brush.js').Pt} Pt */

const FUR = '#F6F3EE';
const FUR_SHADE = '#D6D0E0';
const YARN = '#DCE5FA';
const YARN_LIGHT = '#F4F7FF';
const YARN_DARK = '#A9BBE6';
const STITCH = '#9FB2E2';
const PICOT = '#F4A6B7';
const SCARF = '#2E3A7A';
const SCARF_LIGHT = '#4A5AA6';
const STARGOLD = '#FFE58A';
const BRASS = '#D9A441';
const BRASS_LIGHT = '#FBE7A6';
const BRASS_DARK = '#9E7322';
const LEATHER = '#8A5A3B';
const GLASS = '#CFE9F7';
const SPRINKLES = ['#F4A6B7', '#F2C14E', '#9FD3EA', '#BFE6D3', '#C9B6F2', '#FFFDF6'];

/** @param {number} u */
const ease = (u) => {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
};
/** @param {number} u */
const easeOutBack = (u) => {
  const v = clamp(u, 0, 1) - 1;
  return 1 + v * v * (2.7 * v + 1.7);
};

/** Keep polygon corners crisp under the rounded brush path. @param {Pt[]} pts @param {number} [r] */
function boxy(pts, r = 2) {
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

/** 5-point star outline. @param {number} x @param {number} y @param {number} R @param {number} r @param {number} rot */
function starPts(x, y, R, r, rot) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  return pts;
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
// Telescope pose (angle + recoil), written by actions, read by the telescope accessory.

const PAW_X = 80;
const PAW_Y = -60;
const REST_ALPHA = -1.0;
/** @typedef {{alpha:number, recoil:number}} Pose */
/** @type {WeakMap<object, Pose & {at:number}>} */
const POSE = new WeakMap();

/** @param {CatRig} rig @param {number} alpha @param {number} [recoil] */
function setPose(rig, alpha, recoil = 0) {
  if (rig.pen) POSE.set(rig.pen, { alpha, recoil, at: rig.time });
}

/** @param {Geo} g @returns {Pose} */
function poseOf(g) {
  const p = POSE.get(g.pen);
  if (p && Math.abs(p.at - g.t) < 1e-4) return p;
  return { alpha: REST_ALPHA + Math.sin(g.t * 1.1) * 0.04, recoil: 0 };
}

/** World position of the objective lens for a given telescope angle. @param {number} alpha */
function lensAt(alpha) {
  return { x: PAW_X + Math.cos(alpha) * 86, y: PAW_Y + Math.sin(alpha) * 86 };
}

// ---------------------------------------------------------------------------
// Fur details.

/** Forehead tuft and a soft Persian ruff. @param {Geo} g */
function faceFluff(g) {
  const { pen, hy, lw } = g;
  for (const [x, h] of [[-9, 14], [0, 18], [9, 13]]) {
    pen.line([{ x: x * 1.2, y: hy - 58 }, { x: x * 0.8 + 3, y: hy - 58 + h * 0.6 }, { x, y: hy - 58 + h }], { color: FUR_SHADE, width: lw * 1.1, amp: 0 });
  }
  for (const s of [-1, 1]) {
    for (const dy of [26, 38]) pen.line([{ x: s * 74, y: hy + dy - 6 }, { x: s * 64, y: hy + dy }, { x: s * 70, y: hy + dy + 6 }], { color: FUR_SHADE, width: lw * 0.9, amp: 0 });
  }
}

/** Fluffy chest ruff. @param {Geo} g @param {{bcy:number, brx:number, bry:number}} b */
function chestRuff(g, b) {
  const { pen, lw } = g;
  for (let i = 0; i < 7; i++) {
    const x = -42 + i * 14;
    const y = b.bcy - b.bry * 0.35 + Math.abs(x) * 0.25;
    pen.line([{ x: x - 5, y: y - 6 }, { x, y: y + 4 }, { x: x + 5, y: y - 6 }], { color: FUR_SHADE, width: lw * 0.85, amp: 0 });
  }
}

// ---------------------------------------------------------------------------
// Crocheted cloud cushion.

/** Rows of little "v" stitches, clipped to a shape. @param {Geo} g @param {Pt[]} clip @param {number} x0 @param {number} x1 @param {number} y0 @param {number} y1 */
function stitches(g, clip, x0, x1, y0, y1) {
  const { ctx, lw } = g;
  ctx.save();
  ctx.beginPath();
  clip.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = STITCH;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = lw * 0.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let row = 0;
  for (let y = y0; y <= y1; y += 9, row++) {
    for (let x = x0 + (row % 2) * 4; x <= x1; x += 8) {
      ctx.moveTo(x - 2.4, y - 2);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 2.4, y - 2);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Puffy cloud outline: the union of circles, ray-cast from a center point. @param {number} cx @param {number} cy @param {number[][]} circles [x, y, r] */
function cloudPts(cx, cy, circles) {
  /** @type {Pt[]} */
  const pts = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    let best = 0;
    for (const [x, y, r] of circles) {
      const dx = x - cx;
      const dy = y - cy;
      const along = dx * ux + dy * uy;
      const h2 = r * r - (dx * dx + dy * dy - along * along);
      if (h2 > 0) best = Math.max(best, along + Math.sqrt(h2));
    }
    pts.push({ x: cx + ux * best, y: cy + uy * best });
  }
  return pts;
}

/** Back part of the cloud cushion (behind the cat) + pom-pom tassels. @param {Geo} g */
function cushionBack(g) {
  const { pen, ctx, lw, t } = g;
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 2 + s) * 2;
    pen.line([{ x: s * 128, y: 0 }, { x: s * 134 + sw, y: 14 }], { color: '#C9A4D9', width: lw * 1.1 });
    pen.blob(ellipsePts(s * 135 + sw, 20, 7, 7, 12, (a, i) => 1 + (i % 2 ? 0.12 : 0)), soft(ctx, s * 135, 20, 7, '#FFD3E0', PICOT, '#E07D95'), { width: lw * 0.8 });
  }
  const circles = [
    [-110, -16, 24],
    [-84, -36, 30],
    [-44, -50, 32],
    [0, -56, 30],
    [44, -50, 32],
    [84, -36, 30],
    [110, -16, 24],
    [-70, -6, 30],
    [0, -6, 34],
    [70, -6, 30],
  ];
  const w = pen.blob(cloudPts(0, -22, circles), soft(ctx, -30, -40, 130, YARN_LIGHT, YARN, YARN_DARK));
  stitches(g, w, -140, 140, -84, 22);
}

/** Front lip of the cushion: the cat sinks in a little. @param {Geo} g */
function cushionFront(g) {
  const { pen, ctx } = g;
  /** @type {number[][]} */
  const circles = [];
  for (let i = 0; i < 7; i++) circles.push([-102 + i * 34, 10 - Math.abs(i - 3) * 1.5, 17]);
  const w = pen.blob(cloudPts(0, 12, circles), soft(ctx, -20, 2, 118, YARN_LIGHT, YARN, YARN_DARK));
  stitches(g, w, -124, 124, -8, 26);
  ctx.save();
  ctx.fillStyle = PICOT;
  for (let i = 0; i < 21; i++) {
    const x = -112 + i * 11.2;
    const near = circles.reduce((m, c) => (Math.abs(c[0] - x) < Math.abs(m[0] - x) ? c : m));
    const dy = Math.sqrt(Math.max(0, near[2] ** 2 - (x - near[0]) ** 2));
    ctx.beginPath();
    ctx.arc(x, near[1] + dy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Star-map scarf.

/** @param {Geo} g @param {Pt[]} pts constellation points */
function constellation(g, pts) {
  const { pen, ctx, lw } = g;
  pen.line(pts, { color: 'rgba(255,229,138,0.75)', width: lw * 0.5, amp: 0 });
  ctx.fillStyle = STARGOLD;
  pts.forEach((p, i) => star(ctx, p.x, p.y, i % 2 ? 3 : 4.2, 0.4, 0));
}

/** @param {Geo} g */
function scarf(g) {
  const { pen, ctx, t, lw } = g;
  const fl = Math.sin(t * 3.1);
  // The far end flutters out behind the left shoulder.
  pen.blob(
    [
      { x: -40, y: -60 },
      { x: -80, y: -76 + fl * 4 },
      { x: -98, y: -66 + fl * 6 },
      { x: -86, y: -58 + fl * 5 },
      { x: -44, y: -48 },
    ],
    soft(ctx, -70, -66, 30, SCARF_LIGHT, SCARF, '#1F2858'),
  );
  // Wrapped band.
  pen.tube([{ x: -58, y: -60 }, { x: 0, y: -46 }, { x: 58, y: -60 }], 21, SCARF);
  pen.line([{ x: -52, y: -64 }, { x: 0, y: -52 }, { x: 52, y: -64 }], { color: SCARF_LIGHT, width: lw * 1.3, amp: 0, alpha: 0.8 });
  // Hanging end with fringe.
  const sw = Math.sin(t * 2.3) * 3;
  const end = [
    { x: 14, y: -54 },
    { x: 36, y: -56 },
    { x: 46 + sw, y: -14 },
    { x: 24 + sw, y: -10 },
  ];
  pen.blob(boxy(end, 3), soft(ctx, 26, -40, 30, SCARF_LIGHT, SCARF, '#1F2858'));
  for (let i = 0; i <= 4; i++) {
    const x = 25 + sw + i * 5.2;
    const y = -10 - i * 1;
    pen.line([{ x, y }, { x: x + 1 + sw * 0.3, y: y + 8 }], { color: STARGOLD, width: lw * 0.8, amp: 0 });
  }
  constellation(g, [
    { x: 24 + sw * 0.3, y: -44 },
    { x: 33 + sw * 0.5, y: -34 },
    { x: 28 + sw * 0.7, y: -24 },
    { x: 38 + sw * 0.8, y: -18 },
  ]);
  constellation(g, [
    { x: -38, y: -56 },
    { x: -24, y: -50 },
    { x: -12, y: -52 },
  ]);
  ctx.fillStyle = STARGOLD;
  for (const [x, y] of [[-48, -60], [8, -47], [44, -60], [-4, -54]]) {
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Moon pin.
  moon(g, -16, -45, 6, '#F7D777');
}

/** Crescent moon. @param {Geo} g @param {number} cx @param {number} cy @param {number} r @param {string} color */
function moon(g, cx, cy, r, color) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.35 + ((Math.PI * 1.3) * i) / 12;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  const ir = 0.892 * r;
  for (let i = 0; i <= 12; i++) {
    const a = -1.622 - ((2 * Math.PI - 3.244) * i) / 12;
    pts.push({ x: cx + 0.5 * r + Math.cos(a) * ir, y: cy + Math.sin(a) * ir });
  }
  g.pen.blob(pts, color, { width: g.lw * 0.7 });
}

// ---------------------------------------------------------------------------
// Brass telescope.

/** A tube section along +x. @param {Geo} g @param {number} x0 @param {number} x1 @param {number} h0 @param {number} h1 @param {string|CanvasGradient} fill */
function section(g, x0, x1, h0, h1, fill) {
  g.pen.blob(
    boxy([
      { x: x0, y: -h0 },
      { x: x1, y: -h1 },
      { x: x1, y: h1 },
      { x: x0, y: h0 },
    ]),
    fill,
  );
}

/** @param {Geo} g */
function telescopeArm(g) {
  const { pen, ctx, lw, t } = g;
  const p = poseOf(g);
  // Sleeve from the shoulder.
  pen.tube([{ x: 44, y: -76 }, { x: 64, y: -64 }, { x: PAW_X, y: PAW_Y }], 21, FUR);
  ctx.save();
  ctx.translate(PAW_X, PAW_Y);
  ctx.rotate(p.alpha);
  ctx.translate(-p.recoil * 10, 0);
  const brass = ctx.createLinearGradient(0, -13, 0, 13);
  brass.addColorStop(0, BRASS_LIGHT);
  brass.addColorStop(0.45, BRASS);
  brass.addColorStop(1, BRASS_DARK);
  section(g, -42, -33, 4.5, 4.5, brass);
  section(g, -34, -3, 6, 6, brass);
  section(g, -4, 36, 8, 8.5, LEATHER);
  for (let x = 2; x < 34; x += 6) pen.line([{ x, y: -7 }, { x: x + 2, y: 7 }], { color: '#C49270', width: lw * 0.5, amp: 0 });
  section(g, 35, 84, 10, 12.5, brass);
  pen.line([{ x: 40, y: -6 }, { x: 80, y: -8 }], { color: '#FFF6D8', width: lw * 0.8, alpha: 0.7, amp: 0 });
  for (const [x, h] of [[-3, 7.5], [35, 10.5], [84, 13.5]]) {
    pen.blob(boxy([{ x: x - 2.6, y: -h }, { x: x + 2.6, y: -h }, { x: x + 2.6, y: h }, { x: x - 2.6, y: h }], 1.5), BRASS_DARK, { width: lw * 0.8 });
  }
  pen.blob(ellipsePts(87, 0, 3.6, 12.5, 16), soft(ctx, 86, -5, 12, '#FFFFFF', GLASS, '#8FBFDB'), { width: lw * 0.8 });
  ctx.restore();
  // Idle twinkle at the lens.
  const lens = lensAt(p.alpha);
  const tw = Math.max(0, Math.sin(t * 2.4)) ** 6;
  if (tw > 0.02) {
    ctx.save();
    ctx.globalAlpha *= tw;
    ctx.fillStyle = '#FFFDF6';
    star(ctx, lens.x + 6, lens.y - 6, 10, 0.25, 0);
    ctx.restore();
  }
  // Paw on the leather grip.
  pen.blob(ellipsePts(PAW_X, PAW_Y, 13, 12, 14), '#FFFDF8');
  for (const d of [-4, 4]) pen.line([{ x: PAW_X - 11, y: PAW_Y + d }, { x: PAW_X - 4, y: PAW_Y + d }], { width: lw * 0.6, amp: 0 });
}

/** Little gold star hair clip with a moon charm. @param {Geo} g */
function starClip(g) {
  const { pen, ctx, hy, hrx, lw } = g;
  const x = -hrx * 0.6;
  const y = hy - 38;
  moon(g, x - 10, y + 10, 5.5, '#F7D777');
  pen.blob(boxy(starPts(x, y, 11, 5, -0.2), 1.2), soft(ctx, x, y, 11, '#FFF6C8', STARGOLD, '#E0B53A'), { width: lw * 0.8 });
}

// ---------------------------------------------------------------------------
// Action FX.

/** @param {number} x @param {number} y @param {number} alpha */
function starBolt(x, y, alpha) {
  const speed = 640;
  return {
    t: 0,
    life: 0.8,
    x,
    y,
    vx: Math.cos(alpha) * speed,
    vy: Math.sin(alpha) * speed,
    /** @type {Pt[]} */
    trail: [],
    update(/** @type {any} */ f, /** @type {number} */ dt) {
      f.vy += 60 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 12) f.trail.shift();
    },
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw } = g;
      const fade = f.t > 0.6 ? (0.8 - f.t) / 0.2 : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(fade, 0, 1);
      f.trail.forEach((/** @type {Pt} */ p, /** @type {number} */ i) => {
        const k = i / f.trail.length;
        ctx.save();
        ctx.globalAlpha *= k * 0.9;
        ctx.fillStyle = i % 3 === 0 ? '#C9B6F2' : i % 3 === 1 ? STARGOLD : '#FFFDF6';
        star(ctx, p.x + Math.sin(i * 2.1) * 5, p.y + Math.cos(i * 1.7) * 5, 3 + k * 5, 0.3, i);
        ctx.restore();
      });
      const pulse = 1 + Math.sin(f.t * 40) * 0.12;
      pen.blob(boxy(starPts(f.x, f.y, 18 * pulse, 7.5 * pulse, f.t * 9), 1.2), soft(ctx, f.x, f.y, 18, '#FFFDF0', STARGOLD, '#F2B33D'), { width: lw * 0.9 });
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(f.x - 3, f.y - 3, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  };
}

/** A tiny candy-sprinkle meteor. @param {number} i */
function meteor(i) {
  const lx = 60 + hash2(i, 11) * 230;
  const fall = 0.55;
  return {
    t: 0,
    life: fall + 0.45,
    lx,
    color: SPRINKLES[i % SPRINKLES.length],
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw } = g;
      const sx = lx + 100;
      const sy = -360;
      const ey = -6;
      if (f.t < fall) {
        const u = f.t / fall;
        const x = lerp(sx, lx, u);
        const y = lerp(sy, ey, u);
        const ang = Math.atan2(ey - sy, lx - sx);
        const tl = 46;
        const grad = ctx.createLinearGradient(x, y, x - Math.cos(ang) * tl, y - Math.sin(ang) * tl);
        grad.addColorStop(0, 'rgba(255,253,246,0.9)');
        grad.addColorStop(1, 'rgba(255,253,246,0)');
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(ang) * tl, y - Math.sin(ang) * tl);
        ctx.stroke();
        ctx.translate(x, y);
        ctx.rotate(ang);
        pen.blob(ellipsePts(0, 0, 8, 4, 12), f.color, { width: lw * 0.8 });
        ctx.restore();
      } else {
        const k = (f.t - fall) / (f.life - fall);
        ctx.save();
        ctx.globalAlpha *= 1 - k;
        ctx.fillStyle = f.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.6;
        star(ctx, lx, ey - 8, 6 + k * 14, 0.3, k);
        ctx.fill();
        ctx.stroke();
        for (let j = 0; j < 4; j++) {
          const a = -Math.PI * (0.15 + j * 0.23);
          ctx.beginPath();
          ctx.arc(lx + Math.cos(a) * (6 + k * 26), ey - 8 + Math.sin(a) * (6 + k * 26), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
  };
}

/** The Gravity Nap bubble. */
function napBubble() {
  return {
    t: 0,
    life: 2.3,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw, t } = g;
      const cx = 196;
      const cy = -112 + Math.sin(f.t * 2) * 4;
      let R = 76 * easeOutBack(f.t / 0.45);
      let alpha = 1;
      if (f.t > f.life - 0.2) {
        const k = (f.t - (f.life - 0.2)) / 0.2;
        R *= 1 + k * 0.25;
        alpha = 1 - k;
      }
      if (R < 1) return;
      const w = Math.sin(t * 5) * 0.05;
      ctx.save();
      ctx.globalAlpha *= alpha;
      const fill = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      fill.addColorStop(0, 'rgba(240,234,255,0.25)');
      fill.addColorStop(0.75, 'rgba(201,182,242,0.35)');
      fill.addColorStop(1, 'rgba(160,140,220,0.6)');
      ctx.save();
      ctx.globalAlpha *= 0.9;
      pen.blob(ellipsePts(cx, cy, R * (1 + w), R * (1 - w), 32), fill, { width: lw * 0.9 });
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * (1 + w) * 0.98, R * (1 - w) * 0.98, 0, 0, Math.PI * 2);
      ctx.clip();
      moon(g, cx - R * 0.12, cy + R * 0.05, R * 0.3, '#F7D777');
      ctx.fillStyle = '#FFFDF6';
      for (let k = 0; k < 3; k++) {
        const a = t * 0.9 + (k * Math.PI * 2) / 3;
        star(ctx, cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.42, 5, 0.3, a);
      }
      for (let k = 0; k < 3; k++) {
        const ph = (f.t * 0.5 + k / 3) % 1;
        fxText(ctx, k === 1 ? 'Z' : 'z', cx + R * 0.25 + Math.sin(ph * 6 + k) * 8, cy + R * 0.45 - ph * R * 1.1, 13 + ph * 12, '#5B6B9A', Math.sin(ph * Math.PI));
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = lw * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.78, -2.65, -1.95);
      ctx.stroke();
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------

/** @type {CatSpec} */
export const spec = {
  id: 'nebula',
  fur: FUR,
  light: '#FFFFFF',
  shade: FUR_SHADE,
  cream: '#FFFDF8',
  muzzle: '#FFFFFF',
  paw: '#FFFDF8',
  stripe: FUR_SHADE,
  eye: '#6E9BE6',
  eyeDark: '#2F4A91',
  eyeLight: '#C4DCFF',
  innerEar: '#F3B6C4',
  nose: '#F0A2B4',
  whisker: '#8F8AA0',
  pattern: 'none',
  headPattern: faceFluff,
  bodyPattern: chestRuff,
  fluff: 1,
  pupil: 1.1,
  bodyW: 1.16,
  bodyH: 0.98,
  headW: 1.12,
  earSize: 0.62,
  tailLen: 0.85,
  tailWidth: 1.6,
  tiers: {
    T1: [
      { layer: 'side', draw: cushionBack },
      { layer: 'neck', draw: cushionFront },
      { layer: 'neck', draw: scarf },
      { layer: 'neck', draw: telescopeArm },
      { layer: 'head', draw: starClip },
    ],
  },
  actions: {
    /** Aim, and fire a twinkling star bolt from the telescope. */
    attack: {
      duration: 1.0,
      update(rig, t) {
        const cue = cueOf(rig, '_nebAtk', t);
        const aim = -0.28;
        if (t < 0.22) {
          setPose(rig, lerp(REST_ALPHA, aim, ease(t / 0.2)));
          rig.ov.lid = 0.35;
          rig.ov.mouth = 'flat';
          rig.ov.tilt = 0.06;
        } else if (t < 0.6) {
          setPose(rig, aim, Math.exp(-(t - 0.22) * 12));
          rig.ov.mouth = t < 0.36 ? 'o' : 'smile';
          rig.ov.lid = t < 0.36 ? 0.2 : 0;
        } else {
          setPose(rig, lerp(aim, REST_ALPHA, ease((t - 0.6) / 0.35)));
          if (t < 0.85) rig.ov.eye = 'happy';
        }
        if (cue('fire', 0.22)) {
          const l = lensAt(aim);
          rig.squash.kick(-2.2);
          rig.fx.push(starBolt(l.x + 6, l.y, aim));
          rig.say('twinkle!', 140, -230, 20);
        }
      },
    },
    /** Point the telescope skyward: tiny candy-sprinkle meteors rain down. */
    a1: {
      duration: 2.5,
      update(rig, t) {
        const cue = cueOf(rig, '_nebStar', t);
        const up = -1.42;
        if (t < 0.35) {
          setPose(rig, lerp(REST_ALPHA, up, ease(t / 0.3)));
          rig.ov.mouth = 'o';
        } else if (t < 1.9) {
          setPose(rig, up + Math.sin(t * 9) * 0.03);
          rig.ov.eye = 'sparkle';
          rig.ov.mouth = 'open';
          rig.ov.tilt = -0.05;
        } else {
          setPose(rig, lerp(up, REST_ALPHA, ease((t - 1.9) / 0.4)));
          rig.ov.eye = 'happy';
          rig.ov.mouth = 'smile';
        }
        if (cue('call', 0.02)) {
          rig.squash.kick(-2);
          rig.say('Starfall Sprinkles!', 40, -300, 22);
        }
        for (let i = 0; i < 14; i++) if (cue(`m${i}`, 0.4 + i * 0.085)) rig.fx.push(meteor(i));
        if (cue('ooh', 1.95)) rig.say('ooh~', 120, -210, 20);
      },
    },
    /** A big yawn, and a sleepy bubble that makes everything inside take a nap. */
    a2: {
      duration: 2.8,
      update(rig, t) {
        const cue = cueOf(rig, '_nebNap', t);
        if (t < 0.5) {
          setPose(rig, lerp(REST_ALPHA, -0.55, ease(t / 0.4)));
          rig.ov.mouth = 'o';
          rig.ov.eye = 'closed';
          rig.ov.squash = -0.05 * Math.sin((t / 0.5) * Math.PI);
          rig.ov.tilt = -0.08 * Math.sin((t / 0.5) * Math.PI);
        } else if (t < 2.5) {
          setPose(rig, -0.55 + Math.sin(t * 1.5) * 0.04);
          rig.ov.eye = 'closed';
          rig.ov.mouth = 'w';
          rig.ov.tilt = 0.12 * ease((t - 0.5) / 0.4);
        } else {
          setPose(rig, lerp(-0.55, REST_ALPHA, ease((t - 2.5) / 0.3)));
          rig.ov.lid = 0.5;
          rig.ov.tilt = 0.12 * (1 - ease((t - 2.5) / 0.3));
        }
        if (cue('call', 0.02)) rig.say('Gravity Nap…', 10, -290, 20);
        if (cue('bubble', 0.45)) {
          rig.squash.kick(1.6);
          rig.fx.push(napBubble());
        }
        if (cue('zzz', 1.0)) rig.say('zZz', 230, -215, 26);
        if (cue('pop', 2.6)) {
          rig.squash.kick(-1.5);
          rig.say('pop!', 200, -120, 22);
        }
      },
    },
  },
};

/** Hero metadata used by gameplay, hero select and the Cat-alog. */
export const hero = {
  id: 'nebula',
  name: 'Nebula',
  title: 'Astronomer of Naps',
  blurb: 'A fluffy white astronomer on a crocheted cloud cushion, wrapped in a star-map scarf. Has named every star after a snack.',
  style: /** @type {'melee'|'ranged'|'tank'} */ ('ranged'),
  abilities: [
    { id: 'a1', key: 'Z', name: 'Starfall Sprinkles', desc: 'A shower of tiny meteors over an area.' },
    { id: 'a2', key: 'X', name: 'Gravity Nap', desc: 'A sleepy bubble that pauses enemies inside it.' },
  ],
  passive: { name: 'Stargazer', desc: 'Nearby cats get +range.' },
};

export const tiers = [{ id: 'T1', label: 'Hero' }];