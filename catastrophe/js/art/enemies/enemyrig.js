// @ts-check
// Shared enemy rig: gait (waddle/roll/hop/float/slither), googly-eye physics,
// hit reactions and comedic defeat poofs. Each enemy/boss is an EnemySpec whose
// `draw` paints the character at origin = feet center, ~`height` units tall.
import { Pen, ellipsePts, fxText, soft } from '../brush.js';
import { INK, WHITE } from '../palette.js';
import { Spring, Blink } from '../../anim/rig.js';
import { mulberry32, clamp, hash2 } from '../../core/rng.js';

/** @typedef {'walk'|'idle'|'hit'|'death'|'dead'} EnemyMode */
/** @typedef {'waddle'|'roll'|'hop'|'float'|'slither'} Gait */

/**
 * @typedef {Object} EnemyState
 * @property {number} t seconds alive
 * @property {number} walk walk cycle phase in radians (advances while walking)
 * @property {number} moving 0..1 how much the enemy is walking (eases in/out)
 * @property {number} hit 1 at impact, decays to 0 over ~0.4s
 * @property {number} blink 0..1 eyelid closure
 * @property {number} lookX -1..1 @property {number} lookY -1..1
 * @property {EnemyMode} mode
 * @property {number} phase boss phase index (0-based)
 * @property {number} deathT seconds since death started
 * @property {Record<string, any>} mem per-instance scratch (googly-eye physics etc.)
 */
/**
 * @typedef {Object} EGeo
 * @property {Pen} pen @property {CanvasRenderingContext2D} ctx
 * @property {number} lw ink width in local units @property {number} t time
 */
/**
 * @typedef {Object} EnemySpec
 * @property {string} id
 * @property {number} [height] approximate height in units (default 180; bosses ~400)
 * @property {number} [width] approximate width (shadow size), default height*0.8
 * @property {Gait} [gait]
 * @property {string} deathText comic text shown on defeat ("bonk.", "squeak!")
 * @property {string[]} [phases] boss phase names
 * @property {number} [scale] draw-scale multiplier for callers (duckies are small, bosses big)
 * @property {boolean} [friendly] defeat is a happy flop: no spin/shrink/poof, just a slow fade (Good Boy)
 * @property {(g:EGeo, st:EnemyState) => void} draw
 */

export class EnemyRig {
  /** @param {EnemySpec} spec @param {number} [seed] */
  constructor(spec, seed = 1) {
    this.spec = spec;
    this.rng = mulberry32(seed);
    this.blinker = new Blink(this.rng);
    this.squash = new Spring(240, 12);
    this.shake = new Spring(300, 9);
    this.moveK = new Spring(40, 12, 1);
    /** @type {EnemyState} */
    this.st = { t: 0, walk: 0, moving: 1, hit: 0, blink: 0, lookX: 0, lookY: 0, mode: 'walk', phase: 0, deathT: 0, mem: {} };
    /** @type {Pen|null} */
    this.pen = null;
  }

  /** @param {EnemyMode} m */
  setMode(m) {
    if (m === 'hit') return this.hit();
    if (m === 'death') return this.die();
    this.st.mode = m;
    this.st.deathT = 0;
    this.moveK.target = m === 'walk' ? 1 : 0;
  }

  hit() {
    if (this.st.mode === 'death' || this.st.mode === 'dead') return;
    this.st.hit = 1;
    this.squash.kick(3);
    this.shake.kick(this.rng() < 0.5 ? -60 : 60);
  }

  die() {
    if (this.st.mode === 'death' || this.st.mode === 'dead') return;
    this.st.mode = 'death';
    this.st.deathT = 0;
    this.st.hit = 1;
    this.squash.kick(4);
  }

  /** @param {number} dt @param {{x:number,y:number}|null} [look] */
  update(dt, look = null) {
    const st = this.st;
    st.t += dt;
    st.moving = clamp(this.moveK.step(dt), 0, 1.2);
    st.walk += dt * 7 * st.moving;
    st.hit = Math.max(0, st.hit - dt * 2.5);
    st.blink = st.mode === 'death' ? 1 : this.blinker.update(dt);
    this.squash.step(dt);
    this.shake.step(dt);
    const lx = look ? look.x : Math.sin(st.t * 0.7) * 0.4;
    const ly = look ? look.y : Math.cos(st.t * 0.5) * 0.2;
    st.lookX += (lx - st.lookX) * Math.min(1, dt * 8);
    st.lookY += (ly - st.lookY) * Math.min(1, dt * 8);
    if (st.mode === 'death') {
      st.deathT += dt;
      if (st.deathT > 1.4) st.mode = 'dead';
    } else if (st.mode === 'dead') {
      st.deathT += dt;
    }
  }

  get isGone() {
    return this.st.mode === 'dead';
  }

  /**
   * Draw at origin = feet center.
   * @param {CanvasRenderingContext2D} ctx @param {number} scale on-screen px per unit
   * @param {{reducedMotion?:boolean, flip?:boolean}} [o] flip = face left
   */
  draw(ctx, scale, o = {}) {
    const S = this.spec;
    const st = this.st;
    const pen = this.pen ?? (this.pen = new Pen(ctx));
    pen.ctx = ctx;
    pen.begin(st.t, { boil: !o.reducedMotion, width: (1.5 + 1.7 * Math.min(1, scale)) / scale, amp: 0.8 / scale });
    pen.ink = INK;
    const lw = pen.width;
    const H = S.height ?? 180;
    const W = S.width ?? H * 0.8;
    const gait = S.gait ?? 'waddle';
    const m = st.moving;

    let y = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    if (gait === 'waddle') {
      y = -Math.abs(Math.sin(st.walk)) * H * 0.04 * m;
      rot = Math.sin(st.walk) * 0.07 * m;
    } else if (gait === 'roll') {
      y = -Math.abs(Math.sin(st.walk * 2)) * H * 0.012 * m;
      rot = Math.sin(st.walk * 0.5) * 0.02 * m;
    } else if (gait === 'hop') {
      const ph = (st.walk / Math.PI) % 2;
      const air = ph < 1 ? Math.sin(ph * Math.PI) : 0;
      y = -air * H * 0.18 * m;
      const land = ph >= 1 ? Math.sin((ph - 1) * Math.PI) : 0;
      sx += land * 0.12 * m;
      sy -= land * 0.12 * m;
    } else if (gait === 'float') {
      y = -H * 0.25 + Math.sin(st.t * 2.2) * H * 0.05;
      rot = Math.sin(st.t * 1.3) * 0.06;
    } else if (gait === 'slither') {
      rot = Math.sin(st.walk * 0.5) * 0.03 * m;
    }
    if (st.mode !== 'walk') rot += Math.sin(st.t * 1.4) * 0.015;
    const sq = clamp(this.squash.x, -0.3, 0.3);
    sx *= 1 + sq;
    sy *= 1 - sq;

    // Shadow (stays on the ground).
    const shadowK = gait === 'float' ? 0.6 : 1 + y / (H * 2);
    ctx.fillStyle = 'rgba(59,58,74,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 2, (W / 2) * shadowK, Math.max(4, H * 0.045), 0, 0, Math.PI * 2);
    ctx.fill();

    if (st.mode === 'dead') {
      drawDeathText(ctx, S, st, H);
      return;
    }

    ctx.save();
    if (o.flip) ctx.scale(-1, 1);
    ctx.translate(this.shake.x * 0.05, y);
    let dk = 1;
    if (st.mode === 'death') {
      if (S.friendly) {
        ctx.globalAlpha *= 1 - clamp((st.deathT - 1.1) / 0.3, 0, 1);
      } else {
        const k = clamp(st.deathT / 0.9, 0, 1);
        dk = 1 - k * k;
        rot += k * k * 6;
        ctx.globalAlpha *= 1 - clamp((st.deathT - 0.7) / 0.3, 0, 1);
      }
    }
    ctx.translate(0, -H * 0.5);
    ctx.rotate(rot);
    ctx.scale(sx * dk, sy * dk);
    ctx.translate(0, H * 0.5);
    S.draw({ pen, ctx, lw, t: st.t }, st);
    ctx.restore();

    if (st.hit > 0 && st.mode !== 'death') {
      ctx.save();
      ctx.fillStyle = '#FFF6B8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.globalAlpha = st.hit;
      const r = Math.min(H * 0.16, 34) * (1.4 - st.hit * 0.4);
      const bx = W * 0.5 + r * 0.4;
      const by = -H * 0.95;
      burst(ctx, bx, by, r, 8);
      ctx.fill();
      ctx.stroke();
      fxText(ctx, 'pow', bx, by, r * 0.55, INK, st.hit);
      ctx.restore();
    }
    if (st.mode === 'death') {
      if (!S.friendly) drawPoof(ctx, pen, st, H, lw);
      drawDeathText(ctx, S, st, H);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} n */
function burst(ctx, x, y, r, n) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.55 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {EnemyState} st @param {number} H @param {number} lw */
function drawPoof(ctx, pen, st, H, lw) {
  const k = clamp(st.deathT / 1.2, 0, 1);
  ctx.save();
  ctx.globalAlpha *= 1 - k;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + hash2(i, 5);
    const d = H * (0.15 + k * 0.45);
    const r = H * (0.12 + 0.06 * hash2(i, 9)) * (1 - k * 0.4);
    pen.blob(ellipsePts(Math.cos(a) * d, -H * 0.45 + Math.sin(a) * d * 0.7, r, r, 12), '#FFFDF6', { width: lw * 0.8 });
  }
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {EnemySpec} S @param {EnemyState} st @param {number} H */
function drawDeathText(ctx, S, st, H) {
  const k = st.deathT;
  if (k > 2.2) return;
  const a = k < 0.15 ? k / 0.15 : k > 1.7 ? (2.2 - k) / 0.5 : 1;
  fxText(ctx, S.deathText, 0, -H * 0.95 - k * H * 0.12, Math.max(14, H * 0.14), INK, clamp(a, 0, 1));
}

/**
 * Googly eye with pendulum pupil physics. Call every frame with a stable `key`.
 * @param {EGeo} g @param {EnemyState} st @param {string} key
 * @param {number} x @param {number} y @param {number} r
 * @param {{lid?:number, lidTilt?:number, lidColor?:string, pupil?:number, white?:string, look?:number, iris?:string}} [o]
 */
export function googlyEye(g, st, key, x, y, r, o = {}) {
  const { ctx, pen, lw } = g;
  const mem = (st.mem[key] ??= { ang: 0, vel: 0 });
  const dt = 1 / 60;
  const sway = Math.sin(st.walk) * 1.2 * st.moving + st.hit * 3 * Math.sin(st.t * 40);
  mem.vel += (-12 * Math.sin(mem.ang - sway * 0.25) - 2.2 * mem.vel) * dt;
  mem.ang += mem.vel * dt * 3;
  mem.ang = clamp(mem.ang, -1.3, 1.3);
  const look = o.look ?? 1;
  const pr = r * (o.pupil ?? 0.5) * (st.hit > 0.5 ? 0.7 : 1);
  const reach = r - pr - r * 0.08;
  const px = x + Math.sin(mem.ang) * reach * 0.8 + st.lookX * reach * 0.4 * look;
  const py = y + Math.cos(mem.ang) * reach * 0.6 + st.lookY * reach * 0.3 * look;
  const w = pen.blob(ellipsePts(x, y, r, r, 18), o.white ?? WHITE, { width: lw });
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  if (o.iris) {
    ctx.fillStyle = o.iris;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2B2633';
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.32, 0, Math.PI * 2);
  ctx.fill();
  const lid = Math.max(st.blink, o.lid ?? 0);
  if (lid > 0.02) {
    const tilt = o.lidTilt ?? 0;
    const top = y - r - 2;
    const H = r * 2 + 4;
    ctx.fillStyle = o.lidColor ?? '#D9CDB8';
    ctx.beginPath();
    ctx.moveTo(x - r - 2, top - 2);
    ctx.lineTo(x + r + 2, top - 2);
    ctx.lineTo(x + r + 2, top + H * clamp(lid + tilt, 0, 1));
    ctx.lineTo(x - r - 2, top + H * clamp(lid - tilt, 0, 1));
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r - 2, top + H * clamp(lid - tilt, 0, 1));
    ctx.lineTo(x + r + 2, top + H * clamp(lid + tilt, 0, 1));
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Two tiny legs with little shoes that alternate while walking. Feet land at y = 0.
 * @param {EGeo} g @param {EnemyState} st @param {number} x center x @param {number} y hip y (negative)
 * @param {number} spread half distance between legs @param {{shoe?:string, leg?:string, width?:number}} [o]
 */
export function tinyLegs(g, st, x, y, spread, o = {}) {
  const { pen } = g;
  const len = -y;
  for (const s of [-1, 1]) {
    const ph = Math.sin(st.walk + (s > 0 ? Math.PI : 0)) * st.moving;
    const fx = x + s * spread + ph * len * 0.35;
    const lift = Math.max(0, ph) * len * 0.25;
    pen.line(
      [
        { x: x + s * spread * 0.8, y },
        { x: (x + s * spread * 0.8 + fx) / 2, y: (y - lift) / 2 },
        { x: fx, y: -lift - 4 },
      ],
      { width: o.width ?? g.lw * 2.2, color: o.leg ?? INK },
    );
    pen.blob(ellipsePts(fx + s * 3, -lift - 3, 10, 6, 12), o.shoe ?? '#E07D95', { width: g.lw * 0.8 });
  }
}

/**
 * Simple cartoon mouth helper.
 * @param {EGeo} g @param {number} x @param {number} y @param {number} w half width
 * @param {'smile'|'frown'|'o'|'grin'|'flat'|'zigzag'} kind
 */
export function mouth(g, x, y, w, kind) {
  const { pen, ctx, lw } = g;
  switch (kind) {
    case 'o':
      pen.blob(ellipsePts(x, y + w * 0.3, w * 0.45, w * 0.55, 14), '#6B3A47', { width: lw });
      break;
    case 'grin': {
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x, y + w * 1.4, x + w, y);
      ctx.closePath();
      ctx.fillStyle = '#6B3A47';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = WHITE;
      ctx.fillRect(x - w, y, w * 2, w * 0.22);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x, y + w * 1.4, x + w, y);
      ctx.closePath();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.stroke();
      break;
    }
    case 'frown':
      pen.line([{ x: x - w, y: y + w * 0.4 }, { x, y: y - w * 0.15 }, { x: x + w, y: y + w * 0.4 }], { width: lw * 1.1 });
      break;
    case 'flat':
      pen.line([{ x: x - w, y }, { x: x + w, y: y + 1 }], { width: lw * 1.1 });
      break;
    case 'zigzag':
      pen.line(
        [
          { x: x - w, y },
          { x: x - w * 0.5, y: y + w * 0.35 },
          { x, y },
          { x: x + w * 0.5, y: y + w * 0.35 },
          { x: x + w, y },
        ],
        { width: lw * 1.1, amp: 0 },
      );
      break;
    default:
      pen.line([{ x: x - w, y }, { x, y: y + w * 0.5 }, { x: x + w, y }], { width: lw * 1.1 });
  }
}

/** Re-exported so enemy files only need one import. */
export { ellipsePts, soft, fxText, INK, WHITE };
