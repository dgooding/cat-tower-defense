// @ts-check
// Ronin Biscuit: a ginger cat in home-made cardboard samurai armor, wielding a lacquered chopstick katana.
import { ellipsePts, soft } from '../brush.js';
import { star } from '../cats/catrig.js';
import { hash2, clamp, lerp } from '../../core/rng.js';
import { INK } from '../palette.js';

/** @typedef {import('../cats/catrig.js').CatSpec} CatSpec */
/** @typedef {import('../cats/catrig.js').Geo} Geo */
/** @typedef {import('../cats/catrig.js').CatRig} CatRig */
/** @typedef {import('../brush.js').Pt} Pt */

const FUR = '#EE9A4E';
const PAW = '#FFF2DF';
const CARD = '#D8AE74';
const CARD_LIGHT = '#F2D7A6';
const CARD_DARK = '#B0844E';
const CARD_INK = '#7A5634';
const LACQUER = '#B83C2C';
const LACQUER_LIGHT = '#E0644F';
const WOOD_TIP = '#EBCB98';
const GOLD = '#F2C14E';
const GOLD_LIGHT = '#FBE3A0';
const GOLD_DARK = '#C99A2E';
const NAVY = '#3E4C7A';
const BANNER = '#FFF6E2';
const PAW_RED = '#D2483C';

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
const card = (ctx, x, y, r) => soft(ctx, x, y, r, CARD_LIGHT, CARD, CARD_DARK);
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
const gold = (ctx, x, y, r) => soft(ctx, x, y, r, GOLD_LIGHT, GOLD, GOLD_DARK);
/** @param {number} u */
const ease = (u) => {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
};
/** @param {number} u */
const easeOut = (u) => 1 - (1 - clamp(u, 0, 1)) ** 2;

/** Keep polygon corners crisp under the rounded brush path (boxes should look like boxes). @param {Pt[]} pts @param {number} [r] */
function boxy(pts, r = 2.5) {
  /** @type {Pt[]} */
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n];
    const p = pts[i];
    const b = pts[(i + 1) % n];
    const la = Math.hypot(a.x - p.x, a.y - p.y) || 1;
    const lb = Math.hypot(b.x - p.x, b.y - p.y) || 1;
    const ka = Math.min(r / la, 0.45);
    const kb = Math.min(r / lb, 0.45);
    out.push({ x: p.x + (a.x - p.x) * ka, y: p.y + (a.y - p.y) * ka }, { x: p.x + (b.x - p.x) * kb, y: p.y + (b.y - p.y) * kb });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sword-arm pose, written by actions and read by the arm accessories.
// Keyed by the rig's Pen so every Ronin on screen swings on his own.

/** @typedef {{px:number, py:number, blade:number}} Pose */
/** @type {Pose} */
const REST = { px: 86, py: -60, blade: 0.22 };
/** @type {WeakMap<object, Pose & {at:number}>} */
const POSE = new WeakMap();

/** @param {CatRig} rig @param {number} px @param {number} py @param {number} blade */
function setPose(rig, px, py, blade) {
  if (rig.pen) POSE.set(rig.pen, { px, py, blade, at: rig.time });
}

/** @param {Geo} g @returns {Pose} */
function poseOf(g) {
  const p = POSE.get(g.pen);
  if (p && Math.abs(p.at - g.t) < 1e-4) return p;
  const b = Math.sin(g.t * 1.4);
  return { px: REST.px, py: REST.py + b * 1.5, blade: REST.blade + b * 0.03 };
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
// Outfit.

/** Little paw print. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {string} color */
function pawPrint(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.35, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.62;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 1.35, y + r * 0.2 + Math.sin(a) * r * 1.35, r * 0.36, r * 0.44, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Back banner (a sashimono) with a red paw crest, fluttering. @param {Geo} g */
function banner(g) {
  const { pen, ctx, t, lw } = g;
  const x0 = -60;
  const y0 = -282;
  const W = 48;
  const H = 82;
  pen.tube([{ x: -50, y: -40 }, { x: -55, y: -160 }, { x: x0, y: y0 - 10 }], 7, '#8A5A3B');
  const fl = (/** @type {number} */ u, /** @type {number} */ v) => Math.sin(t * 4.2 - u * 4.5 + v * 1.5) * 5 * u;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 4; i++) pts.push({ x: x0 - (W * i) / 4, y: y0 + fl(i / 4, 0) * 0.15 });
  pts.push({ x: x0 - W + fl(1, 0), y: y0 + 1 });
  for (let i = 1; i <= 4; i++) pts.push({ x: x0 - W + fl(1, i / 4), y: y0 + (H * i) / 4 });
  pts.push({ x: x0 - W + fl(1, 1), y: y0 + H - 1 });
  for (let i = 3; i >= 0; i--) pts.push({ x: x0 - (W * i) / 4 + fl(i / 4, 1) * 0.4, y: y0 + H + Math.sin(t * 4.2 - i) * 2 * (i / 4) });
  pts.push({ x: x0, y: y0 + H - 1 });
  pen.blob(pts, soft(ctx, x0 - W * 0.4, y0 + H * 0.3, W, '#FFFFFF', BANNER, '#E9D9B8'));
  // Navy hem and the clan crest: a big red paw print.
  pen.line(
    [0, 1, 2, 3, 4].map((i) => ({ x: x0 - (W * i) / 4 + fl(i / 4, 0.9) * 0.4, y: y0 + H - 8 })),
    { color: NAVY, width: lw * 2.2, amp: 0 },
  );
  const f = fl(0.5, 0.5);
  pawPrint(ctx, x0 - W / 2 + f * 0.6, y0 + H * 0.46, 8.5, PAW_RED);
  // Crossbar and finial.
  pen.tube([{ x: x0 + 3, y: y0 - 1 }, { x: x0 - W - 5, y: y0 - 1 }], 4, '#8A5A3B');
  pen.blob(ellipsePts(x0, y0 - 14, 6, 6, 12), gold(ctx, x0, y0 - 14, 6), { width: lw * 0.8 });
}

/** Cardboard chest plate laced with red string, plus belt and a tucked chopstick. @param {Geo} g */
function armor(g) {
  const { pen, ctx, brx, lw } = g;
  // Spare chopstick (the "wakizashi") tucked through the belt.
  pen.blob(
    [
      { x: -66, y: -14 },
      { x: -62, y: -10 },
      { x: -16, y: -58 },
      { x: -20, y: -61 },
    ],
    LACQUER,
    { width: lw * 0.8 },
  );
  /** @type {Pt[]} */
  const plate = [
    { x: -38, y: -116 },
    { x: 38, y: -116 },
    { x: 43, y: -74 },
    { x: 46, y: -40 },
    { x: 46, y: -36 },
    { x: 0, y: -31 },
    { x: -46, y: -36 },
    { x: -46, y: -40 },
    { x: -43, y: -74 },
  ];
  pen.blob(plate, card(ctx, -12, -84, 56));
  for (const y of [-78, -64, -50]) {
    pen.line([{ x: -42, y: y + 1 }, { x: 0, y: y + 3 }, { x: 42, y: y + 1 }], { color: CARD_DARK, width: lw * 0.8, amp: 0 });
    for (let x = -30; x <= 30; x += 15) pen.line([{ x, y: y - 4 }, { x: x + 1, y: y + 6 }], { color: LACQUER, width: lw * 1.3, amp: 0 });
  }
  // "This side up" arrows stamped on the box.
  for (const ax of [20, 29]) {
    pen.line([{ x: ax, y: -40 }, { x: ax, y: -56 }], { color: CARD_INK, width: lw * 0.75, amp: 0 });
    pen.line([{ x: ax - 4, y: -51 }, { x: ax, y: -57 }, { x: ax + 4, y: -51 }], { color: CARD_INK, width: lw * 0.75, amp: 0 });
  }
  // Masking tape patch.
  ctx.save();
  ctx.translate(-24, -45);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(247,238,212,0.92)';
  ctx.fillRect(-11, -4, 22, 8);
  ctx.restore();
  // Belt (obi) with a knot.
  pen.tube([{ x: -brx * 0.98, y: -40 }, { x: 0, y: -29 }, { x: brx * 0.98, y: -40 }], 12, NAVY);
  pen.blob(ellipsePts(-30, -33, 8, 7, 12), '#4E5E93', { width: lw * 0.9 });
  pen.line([{ x: -32, y: -28 }, { x: -38, y: -14 }], { color: NAVY, width: lw * 2.4 });
  pen.line([{ x: -27, y: -28 }, { x: -24, y: -15 }], { color: NAVY, width: lw * 2.4 });
}

/** The sword arm's sleeve (drawn under the shoulder pads). @param {Geo} g */
function swordArm(g) {
  const p = poseOf(g);
  const sx = 52;
  const sy = -90;
  g.pen.tube([{ x: sx, y: sy }, { x: (sx + p.px) / 2 + 4, y: (sy + p.py) / 2 + 8 }, { x: p.px, y: p.py }], 20, FUR);
}

/** Box-flap shoulder pads (sode), two layers each, with corrugated cut edges. @param {Geo} g */
function shoulderPads(g) {
  const { pen, ctx, lw } = g;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 60, -96);
    ctx.rotate(s * 0.34);
    for (const [dy, w0] of [[0, 1], [15, 0.9]]) {
      const top = -12 + dy;
      const bot = 14 + dy;
      /** @type {Pt[]} */
      const pts = [
        { x: s * -16, y: top },
        { x: s * 46 * w0, y: top + 2 },
        { x: s * 48 * w0, y: bot },
        { x: s * 48 * w0, y: bot + 1 },
        { x: s * -14, y: bot + 2 },
      ];
      pen.blob(boxy(pts, 4), card(ctx, s * 10, top + 6, 40));
      // Corrugated cut edge along the bottom.
      /** @type {Pt[]} */
      const wave = [];
      for (let x = -12; x <= 44 * w0; x += 2) wave.push({ x: s * x, y: bot - 3 + Math.sin(x * 1.2) * 1.6 });
      pen.line(wave, { color: CARD_INK, width: lw * 0.55, amp: 0, alpha: 0.8 });
      pen.line([{ x: s * 4, y: top + 4 }, { x: s * 6, y: bot - 6 }], { color: LACQUER, width: lw * 1.2, amp: 0 });
      pen.line([{ x: s * 26 * w0, y: top + 5 }, { x: s * 28 * w0, y: bot - 6 }], { color: LACQUER, width: lw * 1.2, amp: 0 });
    }
    ctx.restore();
  }
}

/** Chopstick katana in grip-local space (grip at 0,0; blade points to -y). @param {Geo} g */
function katana(g) {
  const { pen, ctx, lw } = g;
  // Twine-wrapped grip and pommel.
  pen.blob(
    [
      { x: -4.5, y: 25 },
      { x: 4.5, y: 25 },
      { x: 4.5, y: -6 },
      { x: -4.5, y: -6 },
    ],
    '#F3E6C8',
    { width: lw * 0.8 },
  );
  for (let y = -3; y < 22; y += 6) {
    pen.line([{ x: -4.5, y }, { x: 4.5, y: y + 4 }], { color: LACQUER, width: lw * 0.9, amp: 0 });
    pen.line([{ x: 4.5, y }, { x: -4.5, y: y + 4 }], { color: LACQUER, width: lw * 0.9, amp: 0 });
  }
  pen.blob(ellipsePts(0, 26, 5.5, 3.5, 10), GOLD, { width: lw * 0.7 });
  // The blade: one very serious lacquered chopstick.
  const grad = ctx.createLinearGradient(-4, 0, 4, 0);
  grad.addColorStop(0, LACQUER_LIGHT);
  grad.addColorStop(0.5, LACQUER);
  grad.addColorStop(1, '#8E2B20');
  pen.blob(
    [
      { x: -3.8, y: -9 },
      { x: 3.8, y: -9 },
      { x: 1.6, y: -124 },
      { x: 0, y: -130 },
      { x: -1.6, y: -124 },
    ],
    grad,
    { width: lw * 0.85 },
  );
  pen.blob(
    [
      { x: -2.2, y: -100 },
      { x: 2.2, y: -100 },
      { x: 1.5, y: -124 },
      { x: 0, y: -130 },
      { x: -1.5, y: -124 },
    ],
    WOOD_TIP,
    { width: lw * 0.75 },
  );
  pen.line([{ x: -2.4, y: -98 }, { x: 2.4, y: -98 }], { color: GOLD, width: lw * 1.1, amp: 0 });
  pen.line([{ x: -1.2, y: -16 }, { x: -0.6, y: -92 }], { color: '#FFFDF6', width: lw * 0.6, alpha: 0.7, amp: 0 });
  // Bottle-cap hand guard.
  pen.blob(ellipsePts(0, -8, 13, 5, 18, (a, i) => 1 + (i % 2 ? 0.1 : 0)), gold(ctx, -3, -10, 13), { width: lw * 0.85 });
}

/** The katana and the paw gripping it. @param {Geo} g */
function swordHand(g) {
  const { pen, ctx, lw } = g;
  const p = poseOf(g);
  ctx.save();
  ctx.translate(p.px, p.py);
  ctx.rotate(p.blade);
  katana(g);
  ctx.restore();
  pen.blob(ellipsePts(p.px, p.py, 12, 11, 14), PAW);
  for (const d of [-4, 4]) pen.line([{ x: p.px - 10, y: p.py + d }, { x: p.px - 3, y: p.py + d }], { width: lw * 0.6, amp: 0 });
}

/** Little cardboard fish crest emblem. @param {Geo} g @param {number} x @param {number} y @param {number} k */
function fishEmblem(g, x, y, k) {
  const { pen, ctx, lw } = g;
  pen.blob(
    [
      { x: x - 13 * k, y: y - 7 * k },
      { x: x - 7 * k, y },
      { x: x - 13 * k, y: y + 7 * k },
      { x: x - 9 * k, y },
    ],
    GOLD_DARK,
    { width: lw * 0.8 },
  );
  pen.blob(ellipsePts(x + 2 * k, y, 11 * k, 6.5 * k, 16), soft(ctx, x, y - 2, 11 * k, '#FFD9A8', '#F29E4C', '#C97A2E'), { width: lw * 0.85 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 7.5 * k, y - 1.5 * k, 1.6 * k, 0, Math.PI * 2);
  ctx.fill();
  pen.line([{ x: x - 1 * k, y: y - 4 * k }, { x: x + 1 * k, y }, { x: x - 1 * k, y: y + 4 * k }], { width: lw * 0.6, amp: 0 });
}

/** Cardboard kabuto with a gold "horn" crest and a fish emblem. @param {Geo} g */
function helmet(g) {
  const { pen, ctx, hy, hrx, lw } = g;
  const k = hrx / 76;
  const by = hy - 40;
  const rx = 66 * k;
  const ry = 40;
  // Side flaps (fukigaeshi), behind the visor.
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: s * rx * 0.86, y: by - 12 },
        { x: s * rx * 1.26, y: by - 26 },
        { x: s * rx * 1.32, y: by + 1 },
        { x: s * rx * 0.96, y: by + 8 },
      ],
      card(ctx, s * rx * 1.1, by - 10, 22),
    );
    pen.blob(ellipsePts(s * rx * 1.16, by - 8, 3, 3, 8), GOLD, { width: lw * 0.6 });
  }
  // Bowl.
  /** @type {Pt[]} */
  const bowl = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (Math.PI * i) / 18;
    bowl.push({ x: Math.cos(a) * rx, y: by + Math.sin(a) * ry });
  }
  bowl.push({ x: rx, y: by + 2 }, { x: 0, y: by + 5 }, { x: -rx, y: by + 2 });
  pen.blob(bowl, card(ctx, -14, by - 22, rx));
  for (const h of [13, 26]) {
    const xw = rx * Math.sqrt(1 - (h / ry) ** 2) * 0.97;
    /** @type {Pt[]} */
    const band = [];
    for (let i = 0; i <= 8; i++) {
      const u = -1 + (2 * i) / 8;
      band.push({ x: u * xw, y: by - h + 4 * Math.sqrt(1 - u * u) });
    }
    pen.line(band, { color: CARD_DARK, width: lw * 0.85, amp: 0 });
  }
  // Brass paper-fastener "rivets".
  for (let i = -3; i <= 3; i++) {
    const x = i * rx * 0.27;
    const y = by - 8 + 3 * Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2));
    pen.blob(ellipsePts(x, y, 2.6, 2.6, 8), GOLD, { width: lw * 0.5, amp: 0 });
  }
  // Masking tape with a very official warning.
  ctx.save();
  ctx.translate(-rx * 0.48, by - 24);
  ctx.rotate(-0.55);
  ctx.fillStyle = 'rgba(247,238,212,0.95)';
  ctx.fillRect(-17, -5, 34, 10);
  ctx.fillStyle = '#C8432F';
  ctx.font = '700 6.5px Fredoka, "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FRAGILE', 0, 0.5);
  ctx.restore();
  for (const ax of [rx * 0.42, rx * 0.56]) {
    pen.line([{ x: ax, y: by - 12 }, { x: ax, y: by - 26 }], { color: CARD_INK, width: lw * 0.7, amp: 0 });
    pen.line([{ x: ax - 3.5, y: by - 21 }, { x: ax, y: by - 26 }, { x: ax + 3.5, y: by - 21 }], { color: CARD_INK, width: lw * 0.7, amp: 0 });
  }
  // Visor with a corrugated edge.
  pen.blob(
    [
      { x: -rx * 1.06, y: by - 4 },
      { x: 0, y: by - 8 },
      { x: rx * 1.06, y: by - 4 },
      { x: rx * 1.02, y: by + 5 },
      { x: 0, y: by + 4 },
      { x: -rx * 1.02, y: by + 5 },
    ],
    card(ctx, 0, by - 4, rx),
  );
  /** @type {Pt[]} */
  const wave = [];
  for (let x = -rx * 0.98; x <= rx * 0.98; x += 2.5) wave.push({ x, y: by + 1 + Math.sin(x * 1.1) * 1.4 });
  pen.line(wave, { color: CARD_INK, width: lw * 0.5, amp: 0, alpha: 0.75 });
  // Gold horn crest (kuwagata) rising from the brow.
  for (const s of [-1, 1]) {
    /** @type {Pt[]} */
    const outer = [];
    /** @type {Pt[]} */
    const inner = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const cx = s * (5 + 30 * u ** 1.4) * k;
      const cy = by - 10 - 76 * u;
      const w = 5.5 * (1 - u) + 1.4;
      outer.push({ x: cx + s * w, y: cy });
      inner.unshift({ x: cx - s * w, y: cy });
    }
    pen.blob([...outer, ...inner], gold(ctx, s * 18 * k, by - 50, 40));
  }
  pen.blob(ellipsePts(0, by - 14, 11 * k, 9, 14), card(ctx, 0, by - 14, 11));
  fishEmblem(g, 0, by - 15, 0.95 * k);
}

// ---------------------------------------------------------------------------
// Action FX.

/** A white crescent that sweeps with the blade. */
function slashFx() {
  return {
    t: 0,
    life: 0.42,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw } = g;
      const cx = 52;
      const cy = -92;
      const a0 = -1.25;
      const a1 = 0.55;
      const grow = clamp(f.t / 0.1, 0, 1);
      const aEnd = a0 + (a1 - a0) * grow;
      const fade = f.t < 0.16 ? 1 : 1 - (f.t - 0.16) / 0.26;
      /** @type {Pt[]} */
      const pts = [];
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((aEnd - a0) * i) / n;
        pts.push({ x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 150 });
      }
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        const a = a0 + (aEnd - a0) * u;
        const r = 150 - 26 * Math.sin(Math.PI * u) * (0.4 + 0.6 * u);
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      ctx.save();
      ctx.globalAlpha *= clamp(fade, 0, 1);
      pen.blob(pts, 'rgba(226,242,255,0.95)', { width: lw * 0.9 });
      for (const [dr, da] of [[-36, 0.25], [-52, 0.4]]) {
        /** @type {Pt[]} */
        const sl = [];
        for (let i = 0; i <= 5; i++) {
          const a = a0 + da + ((aEnd - a0 - da) * i) / 5;
          sl.push({ x: cx + Math.cos(a) * (150 + dr), y: cy + Math.sin(a) * (150 + dr) });
        }
        if (aEnd - a0 > da) pen.line(sl, { width: lw * 0.7, alpha: 0.6 });
      }
      ctx.fillStyle = GOLD;
      star(ctx, cx + Math.cos(aEnd) * 142, cy + Math.sin(aEnd) * 142, 12, 0.32, f.t * 6);
      ctx.restore();
    },
  };
}

/** @param {Geo} g @param {number} x @param {number} y @param {number} r @param {number} alpha */
function dustPuff(g, x, y, r, alpha) {
  const { ctx } = g;
  if (r <= 0.5 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.fillStyle = '#EFE3CC';
  ctx.strokeStyle = INK;
  ctx.lineWidth = g.lw * 0.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The pop-up cardboard box fort, drawn with its front-bottom center at (0,0). @param {Geo} g @param {number} wob flap wobble */
function drawBox(g, wob) {
  const { pen, ctx, lw } = g;
  const flap = (/** @type {Pt[]} */ pts, /** @type {Pt} */ hinge, /** @type {number} */ ang, /** @type {string|CanvasGradient} */ fill) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    pen.blob(
      boxy(pts.map((p) => ({ x: hinge.x + (p.x - hinge.x) * c - (p.y - hinge.y) * s, y: hinge.y + (p.x - hinge.x) * s + (p.y - hinge.y) * c }))),
      fill,
    );
  };
  // Back flap and left flap (behind the opening).
  flap(
    [
      { x: -24, y: -90 },
      { x: 62, y: -90 },
      { x: 68, y: -122 },
      { x: -18, y: -122 },
    ],
    { x: 20, y: -90 },
    wob * 0.08,
    card(ctx, 10, -112, 50),
  );
  flap(
    [
      { x: -50, y: -74 },
      { x: -24, y: -90 },
      { x: -50, y: -114 },
      { x: -80, y: -96 },
    ],
    { x: -37, y: -82 },
    -wob * 0.15,
    card(ctx, -56, -96, 30),
  );
  // Dark opening.
  pen.blob(
    boxy([
      { x: -50, y: -74 },
      { x: -24, y: -90 },
      { x: 62, y: -90 },
      { x: 36, y: -74 },
    ]),
    '#6E4E2E',
  );
  // Side face.
  pen.blob(
    boxy([
      { x: 36, y: -74 },
      { x: 62, y: -90 },
      { x: 62, y: -14 },
      { x: 36, y: 0 },
    ]),
    soft(ctx, 46, -50, 40, CARD, CARD_DARK, '#8E6A3E'),
  );
  // Front face.
  pen.blob(
    boxy([
      { x: -50, y: -74 },
      { x: 36, y: -74 },
      { x: 36, y: 0 },
      { x: -50, y: 0 },
    ]),
    card(ctx, -20, -50, 60),
  );
  // Marker doodle of a cat face + "this side up" arrows.
  const dx = -12;
  const dy = -24;
  pen.blob(ellipsePts(dx, dy, 14, 12, 16), null, { ink: CARD_INK, width: lw * 0.8 });
  for (const s of [-1, 1]) pen.line([{ x: dx + s * 6, y: dy - 11 }, { x: dx + s * 12, y: dy - 19 }, { x: dx + s * 13, y: dy - 7 }], { color: CARD_INK, width: lw * 0.8 });
  ctx.fillStyle = CARD_INK;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dx + s * 5, dy - 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.line([{ x: dx - 4, y: dy + 4 }, { x: dx - 2, y: dy + 6 }, { x: dx, y: dy + 4 }, { x: dx + 2, y: dy + 6 }, { x: dx + 4, y: dy + 4 }], { color: CARD_INK, width: lw * 0.7 });
  for (const ax of [16, 25]) {
    pen.line([{ x: ax, y: -12 }, { x: ax, y: -32 }], { color: CARD_INK, width: lw * 0.8, amp: 0 });
    pen.line([{ x: ax - 4, y: -26 }, { x: ax, y: -32 }, { x: ax + 4, y: -26 }], { color: CARD_INK, width: lw * 0.8, amp: 0 });
  }
  // Front flap folded down, with tape. Right flap flopped open.
  flap(
    [
      { x: -50, y: -74 },
      { x: 36, y: -74 },
      { x: 33, y: -54 },
      { x: -47, y: -54 },
    ],
    { x: -7, y: -74 },
    0,
    soft(ctx, -10, -66, 46, '#F7E2BA', CARD_LIGHT, CARD),
  );
  ctx.fillStyle = 'rgba(247,238,212,0.95)';
  ctx.fillRect(-14, -75, 14, 22);
  flap(
    [
      { x: 36, y: -74 },
      { x: 62, y: -90 },
      { x: 90, y: -78 },
      { x: 64, y: -62 },
    ],
    { x: 49, y: -82 },
    wob * 0.15,
    soft(ctx, 64, -76, 30, CARD_LIGHT, CARD, CARD_DARK),
  );
}

/** @param {number} x ground x of the box */
function boxFx(x) {
  return {
    t: 0,
    life: 2.25,
    x,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { ctx } = g;
      const land = 0.22;
      const drop = f.t < land ? -240 * (1 - (f.t / land) ** 2) : 0;
      const k = Math.max(0, f.t - land);
      const sq = f.t < land ? -0.08 : 0.26 * Math.exp(-k * 7) * Math.cos(k * 20);
      const fade = f.t > f.life - 0.3 ? (f.life - f.t) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(fade, 0, 1);
      if (f.t >= land) {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + (i / 5) * Math.PI;
          const r = 10 + k * 140;
          dustPuff(g, f.x + Math.cos(a) * r * 0.9, -4 + Math.sin(a) * r * 0.18, 9 - k * 12, 1 - k * 2.2);
        }
      }
      ctx.translate(f.x, drop);
      ctx.scale(1 + sq, 1 - sq);
      drawBox(g, Math.exp(-k * 4) * Math.sin(k * 16) * 2 + Math.sin(g.t * 2) * 0.15);
      ctx.restore();
    },
  };
}

/** Paw with toe beans. @param {Geo} g @param {number} x @param {number} y @param {number} rot */
function slapPaw(g, x, y, rot) {
  const { pen, ctx } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1.25, 1.25);
  pen.blob(ellipsePts(0, 0, 14, 12.5, 14), PAW);
  ctx.fillStyle = '#F2A0AE';
  ctx.beginPath();
  ctx.ellipse(1, 3, 5.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [bx, by] of [[-7, -4], [-1, -7.5], [6, -5]]) {
    ctx.beginPath();
    ctx.ellipse(bx, by, 2.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function flurryFx() {
  return {
    t: 0,
    life: 1.35,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const { pen, ctx, lw } = g;
      const T = { x: 150, y: -116 };
      const bucket = Math.floor(f.t / 0.045);
      const fade = f.t > f.life - 0.15 ? (f.life - f.t) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha *= clamp(fade, 0, 1);
      for (let i = 0; i < 9; i++) {
        const a = hash2(bucket, i) * Math.PI * 2;
        const r0 = 58 + hash2(bucket, i + 20) * 14;
        pen.line(
          [
            { x: T.x + Math.cos(a) * r0, y: T.y + Math.sin(a) * r0 },
            { x: T.x + Math.cos(a) * (r0 + 22), y: T.y + Math.sin(a) * (r0 + 22) },
          ],
          { width: lw * 0.8, alpha: 0.55 },
        );
      }
      for (let b = 3; b >= 0; b--) {
        const id = bucket - b;
        for (let j = 0; j < 2; j++) {
          const px = T.x - 18 + (hash2(id, j * 3) - 0.5) * 70;
          const py = T.y + (hash2(id, j * 3 + 1) - 0.5) * 92;
          const sh = { x: 64, y: -82 - j * 16 };
          ctx.save();
          ctx.globalAlpha *= b === 0 ? 1 : 0.5 - b * 0.12;
          pen.tube([sh, { x: (sh.x + px) / 2, y: (sh.y + py) / 2 + 6 }, { x: px, y: py }], 17, FUR);
          slapPaw(g, px, py, -0.4 + hash2(id, j + 9) * 0.8);
          ctx.restore();
        }
      }
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      const jx = (hash2(bucket, 40) - 0.5) * 30;
      const jy = (hash2(bucket, 41) - 0.5) * 30;
      star(ctx, T.x + 26 + jx, T.y + jy, 18 + hash2(bucket, 42) * 8, 0.38, bucket);
      ctx.stroke();
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------

/** @type {CatSpec} */
export const spec = {
  id: 'ronin-biscuit',
  fur: FUR,
  light: '#FFCC8F',
  shade: '#C9702F',
  cream: '#FFF2DF',
  paw: PAW,
  stripe: '#C4622A',
  eye: '#E9B640',
  eyeDark: '#7A4A0E',
  eyeLight: '#FFE7A1',
  innerEar: '#F5AEB4',
  pattern: 'tabby',
  brow: 'angry',
  bodyW: 1.04,
  bodyH: 1.06,
  headW: 1.0,
  earSize: 0.95,
  tailLen: 1.05,
  tiers: {
    T1: [
      { layer: 'side', draw: banner },
      { layer: 'body', draw: armor },
      { layer: 'neck', draw: swordArm },
      { layer: 'neck', draw: shoulderPads },
      { layer: 'neck', draw: swordHand },
      { layer: 'head', draw: helmet },
    ],
  },
  actions: {
    /** Wind up behind the head, then one clean slash. */
    attack: {
      duration: 0.82,
      update(rig, t) {
        const cue = cueOf(rig, '_roninAtk', t);
        if (t < 0.2) {
          const u = ease(t / 0.2);
          setPose(rig, lerp(REST.px, 64, u), lerp(REST.py, -130, u), lerp(REST.blade, -1.05, u));
          rig.ov.lid = 0.3;
          rig.ov.mouth = 'flat';
          rig.ov.lean = -0.05 * u;
        } else if (t < 0.32) {
          const u = easeOut((t - 0.2) / 0.12);
          setPose(rig, lerp(64, 120, u), lerp(-130, -50, u), lerp(-1.05, 2.0, u));
          rig.ov.mouth = 'open';
          rig.ov.lean = 0.07;
        } else if (t < 0.56) {
          setPose(rig, 120, -50, 2.0);
          rig.ov.mouth = 'flat';
          rig.ov.lid = 0.3;
          rig.ov.lean = 0.07 * (1 - (t - 0.32) / 0.24);
        } else {
          const u = ease((t - 0.56) / 0.24);
          setPose(rig, lerp(120, REST.px, u), lerp(-50, REST.py, u), lerp(2.0, REST.blade, u));
          rig.ov.mouth = 'smirk';
        }
        if (cue('wind', 0)) rig.squash.kick(1.6);
        if (cue('slash', 0.2)) {
          rig.squash.kick(-3.2);
          rig.say('hyah!', 70, -262, 24);
          rig.fx.push(slashFx());
        }
      },
    },
    /** "Box Fort!": a cardboard box drops in. If he fits, he sits. */
    a1: {
      duration: 2.6,
      update(rig, t) {
        const cue = cueOf(rig, '_roninBox', t);
        if (t < 0.35) {
          const u = ease(t / 0.3);
          setPose(rig, lerp(REST.px, 70, u), lerp(REST.py, -150, u), lerp(REST.blade, -0.05, u));
          rig.ov.lid = 0.3;
          rig.ov.mouth = 'open';
        } else if (t < 0.9) {
          const u = easeOut((t - 0.35) / 0.15);
          setPose(rig, lerp(70, 112, u), lerp(-150, -76, u), lerp(-0.05, 1.25, u));
          rig.ov.mouth = 'flat';
          rig.ov.lid = 0.25;
        } else {
          const u = ease((t - 0.9) / 0.3);
          setPose(rig, lerp(112, REST.px, u), lerp(-76, REST.py, u), lerp(1.25, REST.blade, u));
          if (t < 1.5) {
            rig.ov.eye = 'happy';
            rig.ov.mouth = 'smile';
          } else {
            rig.ov.lid = 0.45;
            rig.ov.mouth = 'smirk';
          }
        }
        if (cue('call', 0.02)) {
          rig.squash.kick(-2.2);
          rig.say('Box Fort!', 0, -300, 26);
        }
        if (cue('box', 0.35)) {
          rig.squash.kick(1.4);
          rig.fx.push(boxFx(176));
        }
        if (cue('thud', 0.6)) rig.say('thud.', 220, -24, 16);
        if (cue('fits', 0.95)) rig.say('if I fits…', 170, -200, 20);
        if (cue('sits', 1.55)) {
          rig.squash.kick(-1.8);
          rig.say('…I sits.', 190, -170, 24);
        }
      },
    },
    /** A blur of paws on one target. */
    a2: {
      duration: 1.95,
      update(rig, t) {
        const cue = cueOf(rig, '_roninSlap', t);
        setPose(rig, REST.px - 6, REST.py + 4, REST.blade + 0.35);
        if (t < 0.15) {
          rig.ov.lean = -0.06;
          rig.ov.lid = 0.3;
          rig.ov.mouth = 'flat';
        } else if (t < 1.5) {
          rig.ov.lean = 0.06 + Math.sin(t * 47) * 0.015;
          rig.ov.squash = Math.sin(t * 60) * 0.03;
          rig.ov.lid = 0.25;
          rig.ov.mouth = 'open';
        } else {
          rig.ov.eye = 'happy';
          rig.ov.mouth = 'smile';
        }
        if (cue('wind', 0)) rig.squash.kick(2);
        if (cue('go', 0.15)) rig.fx.push(flurryFx());
        if (cue('s1', 0.2)) rig.say('slap!', 120, -200, 18);
        if (cue('s2', 0.45)) rig.say('slap slap!', 160, -222, 20);
        if (cue('s3', 0.7)) rig.say('slap slap slap!', 150, -244, 22);
        if (cue('s4', 0.95)) rig.say('SLAPSLAPSLAP!!', 140, -268, 27);
        if (cue('pat', 1.45)) {
          rig.squash.kick(-2.5);
          rig.say('…pat.', 190, -150, 18);
        }
      },
    },
  },
};

/** Hero metadata used by gameplay, hero select and the Cat-alog. */
export const hero = {
  id: 'ronin-biscuit',
  name: 'Ronin Biscuit',
  title: 'Cardboard Samurai',
  blurb: 'A ginger cat in cardboard samurai armor with a chopstick katana. If he fits, he sits. Then he slices.',
  style: /** @type {'melee'|'ranged'|'tank'} */ ('melee'),
  abilities: [
    { id: 'a1', key: 'Z', name: 'Box Fort', desc: 'Summons a cardboard box that blocks the path for 6s.' },
    { id: 'a2', key: 'X', name: 'Thousand Paw Slap', desc: 'A flurry of slaps on one target.' },
  ],
  passive: { name: 'Nine Lives', desc: 'Survives one fatal hit per wave.' },
};

export const tiers = [{ id: 'T1', label: 'Hero' }];
