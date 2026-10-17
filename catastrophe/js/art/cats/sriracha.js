// @ts-check
// Sriracha: a tiny black kitten with a permanently poofed tail, furious little eyebrows and a red
// bandana. Hisses at enemies, allies, her own tail and the user interface. "HSSSS. (That means hello.)"
import { ellipsePts, soft, fxText } from '../brush.js';
import { star } from './catrig.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('./catrig.js').Accessory} Accessory */
/** @typedef {import('../brush.js').Pt} Pt */

const RED = ['#F0726A', '#D2483C', '#9E2A22'];
const CHILI = ['#FF8A6E', '#E0402E', '#A52418'];
const STEM = '#5E9A4E';
const FLAME = ['#FFE58A', '#F29E4C', '#D9573B'];

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

/**
 * Lighter brow patches so the (very important) furious eyebrows read on black fur,
 * @param {Geo} g
 */
function face(g) {
  const { ctx, hy } = g;
  for (const s of [-1, 1]) {
    const x = s * 31;
    const y = hy - 27;
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 20);
    gr.addColorStop(0, 'rgba(150,136,156,0.75)');
    gr.addColorStop(0.6, 'rgba(150,136,156,0.35)');
    gr.addColorStop(1, 'rgba(150,136,156,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 13, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {Geo} g @param {number} cx @param {number} cy @param {number} rx @param {number} ry */
function rim(g, cx, cy, rx, ry) {
  const { ctx } = g;
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,170,140,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, -1.0, 0.8);
  ctx.stroke();
  ctx.restore();
}

/** Red polka-dot bandana. @param {Geo} g */
function bandana(g) {
  const { pen, ctx, hy, hrx, lw, t } = g;
  const y = hy + 54;
  // Knot tails flicking on her right.
  for (const k of [0, 1]) {
    const w = Math.sin(t * 6 + k * 1.3) * 4;
    pen.blob(
      [
        { x: hrx * 0.58, y: y - 4 },
        { x: hrx * 0.95 + k * 6, y: y - 12 + k * 14 + w },
        { x: hrx * 0.88 + k * 4, y: y + 2 + k * 12 + w },
        { x: hrx * 0.6, y: y + 6 },
      ],
      RED[2],
      { width: lw * 0.85 },
    );
  }
  pen.tube(
    [
      { x: -hrx * 0.68, y: y - 6 },
      { x: 0, y: y + 4 },
      { x: hrx * 0.68, y: y - 6 },
    ],
    11,
    RED[1],
  );
  const tri = [
    { x: -34, y: y - 1 },
    { x: 34, y: y - 1 },
    { x: 4, y: y + 38 },
  ];
  const w = pen.blob(tri, soft(ctx, -10, y + 4, 40, RED[0], RED[1], RED[2]), { width: lw * 0.95 });
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#FFF4E6';
  for (const [dx, dy] of [[-18, 6], [0, 8], [18, 6], [-8, 18], [10, 18], [2, 28]]) {
    ctx.beginPath();
    ctx.arc(dx, y + dy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Chili pepper shape centered at the origin, pointing right. @param {Geo} g @param {string[]} cols @param {boolean} ghost */
function chiliShape(g, cols, ghost) {
  const { pen, ctx, lw } = g;
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    pts.push({ x: -13 + u * 30, y: -6.5 * (1 - u * u) + Math.sin(u * 3) * 4 });
  }
  for (let i = 8; i >= 0; i--) {
    const u = i / 8;
    pts.push({ x: -13 + u * 30, y: 6.5 * (1 - u * u) + Math.sin(u * 3) * 4 });
  }
  pen.blob(pts, soft(ctx, -6, -3, 18, cols[0], cols[1], cols[2]), { width: lw * 0.85 });
  pen.blob(
    [
      { x: -16, y: -6 },
      { x: -10, y: -7 },
      { x: -10, y: 7 },
      { x: -16, y: 6 },
    ],
    STEM,
    { width: lw * 0.8 },
  );
  pen.line([{ x: -16, y: 0 }, { x: -22, y: -3 }, { x: -24, y: -8 }], { color: STEM, width: lw * 1.3 });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-3, -3, 5, 1.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  if (ghost) {
    ctx.fillStyle = '#3B3A4A';
    for (const x of [-2, 5]) {
      ctx.beginPath();
      ctx.ellipse(x, 1, 1.4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(2, 6, 1.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chili hair clip at the base of her left ear. @param {Geo} g @param {boolean} [ghost] */
function chiliClip(g, ghost = false) {
  const { ctx, hy, t } = g;
  ctx.save();
  ctx.translate(-42, hy - 54);
  ctx.rotate(-0.6 + (ghost ? Math.sin(t * 2.4) * 0.08 : 0));
  ctx.scale(1.45, 1.45);
  chiliShape({ ...g, lw: g.lw / 1.45 }, ghost ? ['#FFFFFF', '#F1ECF8', '#C9C0DA'] : CHILI, ghost);
  ctx.restore();
}

/** @param {Geo} g */
const chili = (g) => chiliClip(g, false);
/** @param {Geo} g */
const ghostChili = (g) => chiliClip(g, true);

/** Teardrop flame tongue. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} h @param {number} lean */
function tongue(ctx, x, y, r, h, lean) {
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.quadraticCurveTo(x - r, y - h * 0.55, x + lean, y - h);
  ctx.quadraticCurveTo(x + r, y - h * 0.55, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.closePath();
}

/** Spooky little ghost-flame aura flickering up behind her. @param {Geo} g */
function ghostAura(g) {
  const { ctx, t, hy, lw } = g;
  const cy = hy * 0.62;
  ctx.save();
  const glow = ctx.createRadialGradient(0, cy, 10, 0, cy, 150);
  glow.addColorStop(0, 'rgba(201,182,242,0.55)');
  glow.addColorStop(1, 'rgba(201,182,242,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, cy, 150, 160, 0, 0, Math.PI * 2);
  ctx.fill();
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const a = Math.PI * (1.08 + u * 0.84);
    const fl = 0.8 + 0.2 * Math.sin(t * 9 + i * 2.1) + 0.1 * Math.sin(t * 23 + i);
    const x = Math.cos(a) * 104;
    const y = cy + 30 + Math.sin(a) * 120;
    const h = (50 + hash2(i, 3) * 26) * fl;
    for (const [r, k, col] of /** @type {[number, number, string][]} */ ([
      [15, 1, i % 2 ? 'rgba(159,211,234,0.75)' : 'rgba(201,182,242,0.8)'],
      [7, 0.6, 'rgba(255,253,246,0.85)'],
    ])) {
      tongue(ctx, x, y, r, h * k, Math.sin(t * 5 + i) * 7 + Math.cos(a) * 14);
      ctx.fillStyle = col;
      ctx.fill();
      if (k === 1) {
        ctx.strokeStyle = 'rgba(122,91,199,0.55)';
        ctx.lineWidth = lw * 0.7;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** Tiny megaphone, for volume. @param {Geo} g */
function megaphone(g) {
  const { pen, ctx, hy, t, S } = g;
  const lw = g.lw / 1.2;
  ctx.save();
  ctx.translate(12, hy + 31);
  ctx.rotate(0.38);
  ctx.scale(1.2, 1.2);
  pen.blob(
    [
      { x: 0, y: -6 },
      { x: 34, y: -17 },
      { x: 38, y: 0 },
      { x: 34, y: 17 },
      { x: 0, y: 6 },
    ],
    soft(ctx, 10, -6, 30, '#FFFDF6', '#F3ECDF', '#C9C0B2'),
    { width: lw },
  );
  pen.line([{ x: 14, y: -10 }, { x: 14, y: 10 }], { color: RED[1], width: lw * 2.2, amp: 0 });
  pen.line([{ x: 25, y: -13.5 }, { x: 25, y: 13.5 }], { color: RED[1], width: lw * 2.2, amp: 0 });
  pen.blob(ellipsePts(36, 0, 4, 17, 14), RED[1], { width: lw * 0.85 });
  pen.blob(
    [
      { x: 8, y: 4 },
      { x: 14, y: 4 },
      { x: 14, y: 18 },
      { x: 8, y: 18 },
    ],
    '#3B3A4A',
    { width: lw * 0.6 },
  );
  pen.blob(ellipsePts(10, 12, 7.5, 6.5, 12), S.paw ?? S.fur, { width: lw });
  // Sound arcs.
  for (let k = 0; k < 3; k++) {
    const ph = (t * 1.6 + k / 3) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.strokeStyle = '#3B3A4A';
    ctx.lineWidth = lw * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(36, 0, 12 + ph * 30, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Red vest with a flame print along the hem. @param {Geo} g */
function flameVest(g) {
  const { pen, ctx, brx, bry, lw, t } = g;
  const sx = brx / 60;
  const sy = bry / 54;
  for (const s of [-1, 1]) {
    /** @type {Pt[]} */
    const pts = [
      { x: 8, y: -98 },
      { x: 40, y: -96 },
      { x: 62, y: -72 },
      { x: 67, y: -40 },
      { x: 63, y: -16 },
      { x: 16, y: -12 },
      { x: 9, y: -44 },
      { x: 16, y: -70 },
    ].map((p) => ({ x: p.x * sx * s, y: p.y * sy }));
    const w = pen.blob(pts, soft(ctx, -30 * s, -80 * sy, 90, '#E2574F', '#B8322E', '#7E1E22'));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w[0].x, w[0].y);
    for (const p of w) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    for (const [ci, col] of [[0, FLAME[1]], [1, FLAME[0]]]) {
      ctx.fillStyle = /** @type {string} */ (col);
      for (let i = 0; i < 5; i++) {
        const x = s * (14 + i * 12) * sx;
        const fl = 1 + 0.15 * Math.sin(t * 8 + i * 1.9);
        const h = (ci ? 14 : 24) * fl + (i % 2) * 6;
        tongue(ctx, x, -12 * sy + 4, ci ? 4 : 6.5, h, Math.sin(t * 4 + i) * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    pen.blob(w, null, { amp: 0 });
  }
  // A tiny sriracha-bottle pin.
  const px = 30 * sx;
  const py = -64 * sy;
  pen.blob(
    [
      { x: px - 4, y: py - 9 },
      { x: px + 4, y: py - 9 },
      { x: px + 6, y: py + 7 },
      { x: px - 6, y: py + 7 },
    ],
    '#E0402E',
    { width: lw * 0.7 },
  );
  pen.blob(ellipsePts(px, py - 11, 2.6, 2.6, 8), STEM, { width: lw * 0.6, amp: 0 });
}

/** @type {Accessory[]} */
const BASE = [{ layer: 'neck', draw: bandana }];

/** @type {CatSpec} */
export const sriracha = {
  id: 'sriracha',
  fur: '#322C34',
  light: '#62566A',
  shade: '#1F1B22',
  cream: '#40384A',
  belly: null,
  muzzle: '#5A4F5F',
  paw: '#4C4352',
  stripe: '#241F27',
  eye: '#F6A93B',
  eyeDark: '#B4551C',
  eyeLight: '#FFE08A',
  innerEar: '#D98A98',
  nose: '#A56C7C',
  whisker: '#F1ECF4',
  outline: '#1E1A21',
  lidColor: '#322C34',
  pupil: 0.82,
  brow: 'angry',
  fluff: 0.9,
  tailWidth: 1.8,
  tailLen: 0.95,
  scale: 0.75,
  pattern: 'none',
  mouth: 'flat',
  bodyW: 0.92,
  bodyH: 0.9,
  headW: 1.06,
  earSize: 1.18,
  headPattern: face,
  bodyPattern: (g, b) => rim(g, 0, b.bcy, b.brx, b.bry),
  tiers: {
    T1: [...BASE],
    T2: [...BASE, { layer: 'head', draw: chili }],
    T3: [{ layer: 'side', draw: ghostAura }, ...BASE, { layer: 'head', draw: ghostChili }],
    '4A': [...BASE, { layer: 'head', draw: chili }, { layer: 'head', draw: megaphone }],
    '4B': [{ layer: 'body', draw: flameVest }, ...BASE, { layer: 'head', draw: chili }],
  },
  actions: {
    /** Crouch… HSSSS! (fur poofs, ears flatten, sparks fly) …hmph. */
    attack: {
      duration: 1.6,
      update(rig, t) {
        const hy = -115;
        const cue = cues(rig, t);
        if (t < 0.2) {
          rig.ov.squash = 0.12 * Math.sin((t / 0.2) * Math.PI * 0.5);
          rig.ov.lid = 0.32;
          rig.ears.x = Math.max(rig.ears.x, 0.5);
        }
        if (cue('hiss', 0.2)) {
          rig.squash.kick(-3.4);
          rig.fx.push({
            t: 0,
            life: 0.9,
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const k = f.t / f.life;
              const shake = k < 0.6 ? Math.sin(f.t * 70) * 2.5 : 0;
              fxText(g.ctx, 'HSSSS!', 6 + shake, hy - 104 - k * 18, 34 * (k < 0.12 ? 0.5 + k * 4.2 : 1), '#D2483C', k > 0.7 ? (1 - k) / 0.3 : 1);
              // Cartoon anger mark.
              const { ctx, lw } = g;
              const ax = 74;
              const ay = hy - 58;
              ctx.save();
              ctx.globalAlpha *= k > 0.7 ? (1 - k) / 0.3 : 1;
              ctx.strokeStyle = '#D2483C';
              ctx.lineWidth = lw * 1.3;
              ctx.lineCap = 'round';
              const pulse = 1 + 0.15 * Math.sin(f.t * 20);
              for (let q = 0; q < 4; q++) {
                const a = (q * Math.PI) / 2 + Math.PI / 4;
                const cx = ax + Math.cos(a) * 7 * pulse;
                const cy = ay + Math.sin(a) * 7 * pulse;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 6 * pulse, a + Math.PI * 0.75, a + Math.PI * 1.25);
                ctx.stroke();
              }
              ctx.restore();
            },
          });
        }
        if (t >= 0.2 && t < 1.0) {
          rig.ov.mouth = 'hiss';
          rig.ov.lid = 0.18;
          rig.ov.lean = 0.07;
          rig.ov.tilt = 0.05 + Math.sin(t * 60) * 0.015;
          rig.puff.x = Math.max(rig.puff.x, 1.25);
          rig.ears.x = Math.max(rig.ears.x, 0.9);
        }
        for (let i = 0; i < 14; i++) {
          if (cue(`spark${i}`, 0.22 + i * 0.05)) {
            const spit = i % 4 === 3;
            rig.fx.push({
              t: 0,
              life: spit ? 0.45 : 0.32 + hash2(i, 1) * 0.12,
              x: 36,
              y: hy + 30,
              vx: 300 + hash2(i, 2) * 220,
              vy: -110 + hash2(i, 3) * 200,
              spit,
              seed: i,
              update(/** @type {any} */ f, /** @type {number} */ dt) {
                if (f.spit) f.vy += 700 * dt;
                f.vx *= 1 - dt * 3;
                f.x += f.vx * dt;
                f.y += f.vy * dt;
              },
              draw(/** @type {any} */ f, /** @type {Geo} */ g) {
                const k = f.t / f.life;
                const { ctx, lw } = g;
                ctx.save();
                ctx.globalAlpha *= 1 - k * k;
                if (f.spit) {
                  ctx.fillStyle = '#DDF1FA';
                  ctx.strokeStyle = '#5E93B3';
                  ctx.lineWidth = lw * 0.5;
                  ctx.beginPath();
                  ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                } else {
                  ctx.fillStyle = FLAME[f.seed % 3];
                  star(ctx, f.x, f.y, 15 * (1 - k * 0.5), 0.33, f.t * 12 + f.seed);
                  ctx.strokeStyle = 'rgba(217,87,59,0.6)';
                  ctx.lineWidth = lw * 1.4;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(f.x, f.y);
                  ctx.lineTo(f.x - f.vx * 0.07, f.y - f.vy * 0.07);
                  ctx.stroke();
                }
                ctx.restore();
              },
            });
          }
        }
        if (t >= 1.0) {
          rig.ov.mouth = 'flat';
          rig.ov.lid = 0.3;
          rig.ov.tilt = -0.06;
        }
        if (cue('hmph', 1.1)) rig.say('hmph.', -58, hy - 70, 18);
      },
    },
  },
};

export const spec = sriracha;
export const tiers = [
  { id: 'T1', label: 'T1 · Sriracha' },
  { id: 'T2', label: 'T2 · Extra Spicy' },
  { id: 'T3', label: 'T3 · Ghost Pepper' },
  { id: '4A', label: '4A · Banshee Yowl' },
  { id: '4B', label: '4B · Spitfire' },
];
