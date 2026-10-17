// @ts-check
// Maneki Mochi: a calico lucky cat with a gold koban, a red collar + bell, and a paw that never
// stops waving (even while asleep). "Every wave is a business opportunity."
import { ellipsePts, soft, fxText } from '../brush.js';
import { star } from './catrig.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('./catrig.js').Accessory} Accessory */
/** @typedef {import('../brush.js').Pt} Pt */

const ORANGE = '#EE9B4A';
const ORANGE_LIGHT = '#F8C283';
const PATCH_BLACK = '#45404B';
const GOLD = ['#FFF1B8', '#F2C14E', '#B9862A'];
const RED = ['#F0726A', '#D2483C', '#9E2A22'];
const PAD = '#F6B3B8';

/** One-shot cue helper that survives replays and big first-frame dt. */
const runs = new WeakMap();
/** @param {CatRig} rig @param {number} t */
function cues(rig, t) {
  let s = runs.get(rig);
  if (!s || t < s.t) {
    s = { t, fired: new Set() };
    runs.set(rig, s);
  }
  s.t = t;
  return (/** @type {string} */ key, /** @type {number} */ at) => {
    if (t >= at && !s.fired.has(key)) {
      s.fired.add(key);
      return true;
    }
    return false;
  };
}

/** Soft-edged calico patch. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} rx @param {number} ry @param {number} rot @param {string} c @param {string} [hi] */
function patch(ctx, x, y, rx, ry, rot, c, hi) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const m = 1 + 0.12 * Math.sin(a * 3 + rx) + 0.06 * Math.sin(a * 5 + ry);
    const px = Math.cos(a) * rx * m;
    const py = Math.sin(a) * ry * m;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (hi) {
    const gr = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 1, 0, 0, Math.max(rx, ry));
    gr.addColorStop(0, hi);
    gr.addColorStop(1, c);
    ctx.fillStyle = gr;
  } else ctx.fillStyle = c;
  ctx.fill();
  ctx.restore();
}

/** @param {Geo} g */
function headPatches(g) {
  const { ctx, hy } = g;
  patch(ctx, -50, hy - 40, 38, 26, -0.5, ORANGE, ORANGE_LIGHT);
  patch(ctx, 54, hy - 30, 28, 22, 0.4, PATCH_BLACK, '#5E5866');
  patch(ctx, 12, hy - 52, 9, 6, 0.2, ORANGE, ORANGE_LIGHT);
}

/** @param {Geo} g @param {{bcy:number, brx:number, bry:number}} b */
function bodyPatches(g, b) {
  const { ctx } = g;
  const { bcy, brx, bry } = b;
  patch(ctx, -brx * 0.82, bcy - bry * 0.15, brx * 0.42, bry * 0.55, 0.3, ORANGE, ORANGE_LIGHT);
  patch(ctx, brx * 0.86, bcy - bry * 0.55, brx * 0.36, bry * 0.36, -0.3, PATCH_BLACK, '#5E5866');
  patch(ctx, brx * 0.72, bcy + bry * 0.45, brx * 0.2, bry * 0.16, 0.2, ORANGE, ORANGE_LIGHT);
}

/**
 * The famous waving paw (her left, raised beside her face). Drawn behind the head so it pokes out
 * beside her cheek; the wrist bends back and forth forever.
 * @param {Geo} g @param {boolean} gold
 */
function wavingPaw(g, gold) {
  const { pen, ctx, S, hy, hrx, lw, t } = g;
  const wave = Math.sin(t * 4.2) * 0.42 + Math.sin(t * 8.4) * 0.05;
  const shoulder = { x: -34, y: hy + 66 };
  const wrist = { x: -hrx - 12, y: hy + 6 };
  const furFill = gold ? soft(ctx, wrist.x, wrist.y - 20, 50, GOLD[0], GOLD[1], GOLD[2]) : S.fur;
  if (gold) {
    const glow = ctx.createRadialGradient(wrist.x, wrist.y - 20, 4, wrist.x, wrist.y - 20, 62);
    glow.addColorStop(0, 'rgba(255,229,138,0.75)');
    glow.addColorStop(1, 'rgba(255,229,138,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(wrist.x, wrist.y - 20, 62, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.tube([shoulder, { x: (shoulder.x + wrist.x) / 2 - 8, y: (shoulder.y + wrist.y) / 2 + 6 }, wrist], 25, gold ? GOLD[1] : S.fur);
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(-0.12 + wave);
  // Paw, palm facing out.
  pen.blob(ellipsePts(0, -18, 17.5, 20, 20, (a) => 1 + (Math.sin(a) < 0 ? 0.05 * Math.cos(a * 4) : 0)), gold ? furFill : soft(ctx, -5, -26, 22, '#FFFFFF', S.fur, S.shade));
  // Toe creases.
  for (const dx of [-6, 6]) pen.line([{ x: dx, y: -37 }, { x: dx * 0.9, y: -30 }], { width: lw * 0.7, amp: 0 });
  // Pink beans (gold ones for the Golden Paw).
  const bean = gold ? '#FFE58A' : PAD;
  pen.blob(ellipsePts(0, -12, 8, 6.5, 12, (a) => 1 + 0.12 * Math.sin(a)), bean, { width: lw * 0.6, amp: 0 });
  for (const [x, y] of [[-8, -25], [0, -28], [8, -25]]) pen.blob(ellipsePts(x, y, 3.2, 3.6, 10), bean, { width: lw * 0.5, amp: 0 });
  ctx.restore();
  // Motion ticks (it really never stops).
  ctx.save();
  ctx.strokeStyle = gold ? '#B9862A' : '#3B3A4A';
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = lw * 0.8;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const a = -Math.PI / 2 - 0.12 + s * 0.62;
    const r0 = 46;
    ctx.beginPath();
    ctx.arc(wrist.x, wrist.y, r0, a - 0.14, a + 0.14);
    ctx.stroke();
  }
  ctx.restore();
  if (gold) {
    ctx.fillStyle = '#FFFDF6';
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.9 + i / 5) % 1;
      const a = hash2(i, Math.floor(t * 0.9 + i / 5)) * Math.PI * 2;
      const r = 26 + ph * 30;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      star(ctx, wrist.x + Math.cos(a) * r, wrist.y - 20 + Math.sin(a) * r, 7 * (1 - ph * 0.5), 0.3, t * 2 + i);
    }
    ctx.globalAlpha = 1;
  }
}

/** @param {Geo} g */
const paw = (g) => wavingPaw(g, false);
/** @param {Geo} g */
const goldPaw = (g) => wavingPaw(g, true);

/** Her left front paw is busy waving, so tuck it into a plump haunch. @param {Geo} g */
function tuckLeftPaw(g) {
  const { pen, ctx, S, brx } = g;
  const x = -brx * 0.56;
  const w = pen.blob(ellipsePts(x, -15, brx * 0.48, 17, 20), soft(ctx, x, -15, 34, S.light, S.fur, S.shade));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  patch(ctx, x - brx * 0.24, -18, 16, 10, 0.2, ORANGE, ORANGE_LIGHT);
  ctx.restore();
  pen.blob(w, null, { amp: 0 });
}

/** Red collar with a gold bell. @param {Geo} g @param {boolean} [trim] */
function collarWith(g, trim = false) {
  const { pen, ctx, hy, hrx, lw, t } = g;
  const y = hy + 52;
  const band = [
    { x: -hrx * 0.7, y: y - 6 },
    { x: 0, y: y + 5 },
    { x: hrx * 0.7, y: y - 6 },
  ];
  pen.tube(band, 10, RED[1]);
  if (trim) {
    for (const d of [-4, 4]) pen.line(band.map((p) => ({ x: p.x, y: p.y + d })), { color: GOLD[1], width: lw * 0.9, amp: 0 });
  }
  const sw = Math.sin(t * 4.2) * 0.12;
  ctx.save();
  ctx.translate(0, y + 5);
  ctx.rotate(sw);
  pen.blob(ellipsePts(0, 10, 10, 10, 16), soft(ctx, -3, 7, 11, GOLD[0], GOLD[1], GOLD[2]));
  pen.line([{ x: -9.5, y: 8 }, { x: 9.5, y: 8 }], { width: lw * 0.7, amp: 0 });
  ctx.fillStyle = '#5E4128';
  ctx.beginPath();
  ctx.arc(0, 14, 2.2, 0, Math.PI * 2);
  ctx.fill();
  pen.line([{ x: 0, y: 14 }, { x: 0, y: 19 }], { width: lw * 0.7, amp: 0 });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-4, 5, 2.6, 1.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** @param {Geo} g */
const collar = (g) => collarWith(g, false);
/** @param {Geo} g */
const goldCollar = (g) => collarWith(g, true);

/** Gold oval koban coin. @param {Geo} g @param {number} x @param {number} y @param {number} k @param {number} [squeeze] horizontal flip (spin) */
function koban(g, x, y, k, squeeze = 1) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * Math.max(0.08, Math.abs(squeeze)), k);
  const w = lw / k;
  pen.blob(ellipsePts(0, 0, 16, 22, 22), soft(ctx, -5, -8, 22, GOLD[0], GOLD[1], GOLD[2]), { width: w });
  pen.blob(ellipsePts(0, 0, 12, 17.5, 20), null, { width: w * 0.6, ink: GOLD[2] });
  ctx.strokeStyle = 'rgba(185,134,42,0.7)';
  ctx.lineWidth = w * 0.6;
  for (const dy of [-10, -5, 0, 5, 10]) {
    const hw = Math.sqrt(Math.max(0, 1 - (dy / 17.5) ** 2)) * 9;
    ctx.beginPath();
    ctx.moveTo(-hw, dy);
    ctx.lineTo(hw, dy);
    ctx.stroke();
  }
  pen.blob(
    [
      { x: -3.5, y: -4 },
      { x: 3.5, y: -4 },
      { x: 3.5, y: 4 },
      { x: -3.5, y: 4 },
    ],
    '#E3A83A',
    { width: w * 0.6, ink: GOLD[2], amp: 0 },
  );
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-7, -10, 3, 5.5, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Koban held against her chest by the right paw. @param {Geo} g */
function heldCoin(g) {
  const { pen, ctx, S, lw, t } = g;
  const glint = (t * 0.5) % 1;
  koban(g, 22, -36, 1.05);
  if (glint < 0.25) {
    ctx.fillStyle = '#FFFDF6';
    star(ctx, 14, -50, 8 * Math.sin((glint / 0.25) * Math.PI), 0.3, 0);
  }
  // Right paw holding it (re-drawn in front of the coin).
  const px = 17;
  pen.blob(ellipsePts(px, -8, 15, 10.5, 16), S.paw ?? S.cream);
  for (const d of [-4.5, 4.5]) pen.line([{ x: px + d, y: -12 }, { x: px + d, y: -4 }], { width: lw * 0.7, amp: 0 });
}

/** Lucky charm pouch hanging off the collar. @param {Geo} g */
function luckyCharm(g) {
  const { pen, ctx, hy, lw, t } = g;
  const sw = Math.sin(t * 4.2 + 0.6) * 0.1;
  ctx.save();
  ctx.translate(-30, hy + 54);
  ctx.rotate(0.18 + sw);
  pen.line([{ x: 0, y: 0 }, { x: 0, y: 8 }], { color: '#C9A24A', width: lw * 0.9 });
  pen.blob(
    [
      { x: -9, y: 9 },
      { x: -4, y: 6 },
      { x: 4, y: 6 },
      { x: 9, y: 9 },
      { x: 9, y: 34 },
      { x: -9, y: 34 },
    ],
    soft(ctx, -3, 14, 20, '#F48CB8', '#C9407A', '#8E2456'),
    { width: lw * 0.85 },
  );
  // Embroidered gold flower.
  ctx.fillStyle = GOLD[1];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 3.6, 22 + Math.sin(a) * 3.6, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFF1B8';
  ctx.beginPath();
  ctx.arc(0, 22, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Knot.
  pen.blob(ellipsePts(0, 8, 3.4, 2.6, 8), GOLD[1], { width: lw * 0.6, amp: 0 });
  ctx.restore();
}

/** A gold-trimmed pile of koban and round coins at her side. @param {Geo} g */
function coinPile(g) {
  const { pen, ctx, lw, brx, t } = g;
  const x0 = brx * 0.95;
  /** @type {[number, number][]} */
  const flats = [
    [-14, -4],
    [12, -4],
    [36, -4],
    [0, -12],
    [24, -12],
    [12, -20],
  ];
  for (const [dx, dy] of flats) {
    const x = x0 + dx;
    const y = dy;
    pen.blob(ellipsePts(x, y + 2, 15, 5.5, 16), GOLD[2], { width: lw * 0.8 });
    pen.blob(ellipsePts(x, y, 15, 5.5, 16), soft(ctx, x - 4, y - 2, 14, GOLD[0], GOLD[1], GOLD[2]), { width: lw * 0.8 });
    pen.blob(ellipsePts(x, y, 9, 3, 12), null, { width: lw * 0.5, ink: GOLD[2], amp: 0 });
  }
  koban(g, x0 + 30, -30, 0.8);
  koban(g, x0 + 4, -40, 0.85);
  const tw = (t * 0.7) % 1;
  ctx.fillStyle = '#FFFDF6';
  star(ctx, x0 + 22, -52, 9 * Math.sin(tw * Math.PI), 0.3, 0);
}

/** Soft halo behind the head. @param {Geo} g */
function halo(g) {
  const { ctx, hy, t, lw } = g;
  const cy = hy - 14;
  const pulse = 1 + 0.03 * Math.sin(t * 1.8);
  ctx.save();
  const gr = ctx.createRadialGradient(0, cy, 40, 0, cy, 130 * pulse);
  gr.addColorStop(0, 'rgba(255,244,207,0.85)');
  gr.addColorStop(0.65, 'rgba(255,229,138,0.4)');
  gr.addColorStop(1, 'rgba(255,229,138,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(0, cy, 130 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242,193,78,0.9)';
  ctx.lineWidth = lw * 1.6;
  ctx.beginPath();
  ctx.arc(0, cy, 104 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,253,246,0.9)';
  ctx.lineWidth = lw * 0.7;
  ctx.setLineDash([4, 9]);
  ctx.lineDashOffset = -t * 10;
  ctx.beginPath();
  ctx.arc(0, cy, 112 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const CHARMS = [
  { x: -132, y: -52, ph: 0, rot: -0.2 },
  { x: 128, y: -84, ph: 1.7, rot: 0.25 },
  { x: 118, y: -196, ph: 3.1, rot: 0.1 },
  { x: -96, y: -232, ph: 4.4, rot: -0.15 },
];

/** Floating paper charms, gently bobbing. @param {Geo} g */
function paperCharms(g) {
  const { pen, ctx, t, lw } = g;
  for (const c of CHARMS) {
    const bob = Math.sin(t * 1.6 + c.ph) * 6;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.rotate(c.rot + Math.sin(t * 1.2 + c.ph) * 0.12);
    pen.blob(
      [
        { x: -8, y: -16 },
        { x: 8, y: -16 },
        { x: 8, y: 16 },
        { x: -8, y: 16 },
      ].flatMap((p, i, arr) => {
        const n = arr[(i + 1) % arr.length];
        return [p, { x: p.x + (n.x - p.x) * 0.15, y: p.y + (n.y - p.y) * 0.15 }, { x: p.x + (n.x - p.x) * 0.85, y: p.y + (n.y - p.y) * 0.85 }];
      }),
      soft(ctx, -3, -8, 18, '#FFFFFF', '#FBF5E9', '#E8DCC4'),
      { width: lw * 0.8 },
    );
    ctx.strokeStyle = RED[1];
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = RED[1];
    ctx.beginPath();
    ctx.arc(0, -6, 1.6, 0, Math.PI * 2);
    ctx.fill();
    pen.line([{ x: -4, y: 3 }, { x: 4, y: 6 }, { x: -4, y: 9 }, { x: 4, y: 12 }], { color: '#3B3A4A', width: lw * 0.6, amp: 0 });
    ctx.restore();
  }
}

/** @type {CatSpec} */
export const manekiMochi = {
  id: 'maneki-mochi',
  fur: '#FAF5EB',
  light: '#FFFFFF',
  shade: '#D9CEBD',
  cream: '#FFFFFF',
  belly: '#FFFFFF',
  muzzle: '#FFFFFF',
  paw: '#FFFFFF',
  stripe: '#E9C9A0',
  eye: '#E2B53E',
  eyeDark: '#8A6414',
  eyeLight: '#FFE58A',
  innerEar: '#F6B3B8',
  nose: '#F29AA8',
  tailColor: ORANGE,
  tailTip: PATCH_BLACK,
  pattern: 'none',
  mouth: 'w',
  bodyW: 1.05,
  headW: 1.05,
  earSize: 0.95,
  tailLen: 0.55,
  tailWidth: 1.25,
  headPattern: headPatches,
  bodyPattern: bodyPatches,
  tiers: {
    T1: [
      { layer: 'neck', draw: tuckLeftPaw },
      { layer: 'neck', draw: paw },
      { layer: 'neck', draw: collar },
      { layer: 'neck', draw: heldCoin },
    ],
    T2: [
      { layer: 'neck', draw: tuckLeftPaw },
      { layer: 'neck', draw: paw },
      { layer: 'neck', draw: collar },
      { layer: 'neck', draw: luckyCharm },
      { layer: 'neck', draw: heldCoin },
    ],
    T3: [
      { layer: 'neck', draw: tuckLeftPaw },
      { layer: 'neck', draw: paw },
      { layer: 'neck', draw: goldCollar },
      { layer: 'neck', draw: luckyCharm },
      { layer: 'neck', draw: coinPile },
      { layer: 'neck', draw: heldCoin },
    ],
    '4A': [
      { layer: 'neck', draw: tuckLeftPaw },
      { layer: 'neck', draw: goldPaw },
      { layer: 'neck', draw: goldCollar },
      { layer: 'neck', draw: coinPile },
      { layer: 'neck', draw: heldCoin },
    ],
    '4B': [
      { layer: 'side', draw: halo },
      { layer: 'side', draw: paperCharms },
      { layer: 'neck', draw: tuckLeftPaw },
      { layer: 'neck', draw: paw },
      { layer: 'neck', draw: goldCollar },
      { layer: 'neck', draw: luckyCharm },
      { layer: 'neck', draw: heldCoin },
    ],
  },
  actions: {
    /** Flip! … spin … spin … *catch* "cha-ching!" ✨ */
    attack: {
      duration: 2.1,
      update(rig, t) {
        const hy = -128;
        const cue = cues(rig, t);
        if (t < 0.16) {
          rig.ov.squash = 0.09 * Math.sin((t / 0.16) * Math.PI * 0.5);
          rig.ov.mouth = 'smile';
        }
        if (cue('toss', 0.16)) {
          rig.squash.kick(-2.4);
          rig.fx.push({
            t: 0,
            life: 1.1,
            x: 22,
            y: -40,
            vy: -720,
            update(/** @type {any} */ f, /** @type {number} */ dt) {
              f.vy += 1300 * dt;
              f.y += f.vy * dt;
              f.x = 22 + Math.pow(Math.max(0, Math.sin((f.t / f.life) * Math.PI)), 0.3) * 80;
              if (f.y > -40) f.y = -40;
            },
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              koban(g, f.x, f.y, 1.05, Math.cos(f.t * 19));
              const { ctx } = g;
              ctx.save();
              for (let i = 1; i < 4; i++) {
                ctx.globalAlpha = 0.6 - i * 0.15;
                ctx.fillStyle = i % 2 ? '#FFE58A' : '#FFFDF6';
                star(ctx, f.x + Math.sin(f.t * 30 + i) * 6, f.y + Math.sign(f.vy || 1) * -i * 14, 5 - i, 0.35, f.t * 6);
              }
              ctx.restore();
            },
          });
        }
        if (t >= 0.16 && t < 1.26) {
          rig.ov.eye = 'sparkle';
          rig.ov.mouth = 'o';
          rig.ov.tilt = 0.08 * Math.sin(((t - 0.16) / 1.1) * Math.PI);
        }
        if (cue('catch', 1.26)) {
          rig.squash.kick(2.6);
          rig.fx.push({
            t: 0,
            life: 1.0,
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const k = f.t / f.life;
              fxText(g.ctx, 'cha-ching!', 10, hy - 104 - k * 24, 28 * (k < 0.15 ? 0.6 + k * 2.7 : 1), '#C8841E', k > 0.7 ? (1 - k) / 0.3 : 1);
            },
          });
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + hash2(i, 2) * 0.4;
            const sp = 150 + hash2(i, 5) * 160;
            rig.fx.push({
              t: 0,
              life: 0.6 + hash2(i, 7) * 0.3,
              x: 22,
              y: -44,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - 80,
              i,
              update(/** @type {any} */ f, /** @type {number} */ dt) {
                f.vx *= 1 - dt * 2.5;
                f.vy *= 1 - dt * 2.5;
                f.vy += 160 * dt;
                f.x += f.vx * dt;
                f.y += f.vy * dt;
              },
              draw(/** @type {any} */ f, /** @type {Geo} */ g) {
                const k = f.t / f.life;
                g.ctx.save();
                g.ctx.globalAlpha *= 1 - k;
                g.ctx.fillStyle = f.i % 3 ? '#F2C14E' : '#FFFDF6';
                star(g.ctx, f.x, f.y, 9 * (1 - k * 0.5), 0.32, f.t * 5);
                g.ctx.strokeStyle = 'rgba(185,134,42,0.8)';
                g.ctx.lineWidth = g.lw * 0.5;
                g.ctx.stroke();
                g.ctx.restore();
              },
            });
          }
        }
        if (t >= 1.26) {
          rig.ov.eye = 'happy';
          rig.ov.mouth = 'smile';
          rig.ov.tilt = 0.07;
        }
      },
    },
  },
};

export const spec = manekiMochi;
export const tiers = [
  { id: 'T1', label: 'T1 · Lucky Mochi' },
  { id: 'T2', label: 'T2 · Fortune Mochi' },
  { id: 'T3', label: 'T3 · Golden Mochi' },
  { id: '4A', label: '4A · Golden Paw' },
  { id: '4B', label: '4B · Shrine Spirit' },
];
