// @ts-check
// Journey toolkit: particles, glows, stars, flowers, backdrops and characters. All drawn in code.
import { Pen, fxText } from '../art/brush.js';
import { INK } from '../art/palette.js';
import { drawRoom, STAGE_W, STAGE_H } from '../art/rooms/common.js';
import { ROOM_ART, CAT_ART, KITTEN_ART, ENEMY_ART, BOSS_ART } from '../art/registry.js';
import { CatRig } from '../art/cats/catrig.js';
import { EnemyRig } from '../art/enemies/enemyrig.js';

export { fxText, INK, STAGE_W, STAGE_H };

const TAU = Math.PI * 2;
export const clamp = (/** @type {number} */ v, /** @type {number} */ a, /** @type {number} */ b) => Math.max(a, Math.min(b, v));
export const lerp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ k) => a + (b - a) * k;
export const ease = (/** @type {number} */ k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

/** Pitch class → pastel color, so the same note always has the same color everywhere. @param {number} midi @param {number} [l] */
export const hueOf = (midi, l = 72) => `hsl(${(((midi % 12) + 12) % 12) * 30} 78% ${l}%)`;

/** Additive soft light. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {string} color @param {number} [a] */
export function glow(ctx, x, y, r, color, a = 1) {
  if (a <= 0.01 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(a, 0, 1);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Five-point star. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} rot @param {string} fill @param {number} [a] @param {boolean} [ink] */
export function star(ctx, x, y, r, rot, fill, a = 1, ink = false) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const ang = rot - Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (ink) {
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/** Flower that grows in (k 0→1) and sways. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} size @param {string} color @param {number} k @param {number} sway @param {number} pulse */
export function flower(ctx, x, y, size, color, k, sway, pulse) {
  const s = size * ease(k) * (1 + pulse * 0.25);
  if (s < 1) return;
  const stem = size * 1.5 * ease(Math.min(1, k * 1.6));
  const tx = x + sway * 10;
  const ty = y - stem;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5E9A4E';
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway * 4, y - stem * 0.5, tx, ty);
  ctx.stroke();
  ctx.fillStyle = '#7DBA5E';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.28, y - stem * 0.35, size * 0.26, size * 0.11, -0.6, 0, TAU);
  ctx.fill();
  ctx.translate(tx, ty);
  ctx.rotate(sway * 0.12);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42, s * 0.36, s * 0.24, a, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#FFD86B';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.24, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Music note glyph. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} size @param {string} color @param {number} a */
export function noteGlyph(ctx, x, y, size, color, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.09;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.32, size * 0.24, -0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y - size * 0.08);
  ctx.lineTo(x + size * 0.28, y - size);
  ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.8, x + size * 0.62, y - size * 0.55);
  ctx.stroke();
  ctx.restore();
}

/** Rice-ball snack (the thing everyone wants). @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} rot @param {number} a */
export function drawSnack(ctx, x, y, s, rot, a) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineWidth = Math.max(1.5, s * 0.1);
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 1.1, s * 0.6, 0, s * 0.75);
  ctx.quadraticCurveTo(-s * 1.1, s * 0.6, 0, -s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3B4A3A';
  ctx.fillRect(-s * 0.45, s * 0.15, s * 0.9, s * 0.55);
  ctx.restore();
}

// ---------------------------------------------------------------- particles

/**
 * @typedef {Object} P
 * @property {number} x @property {number} y @property {number} vx @property {number} vy
 * @property {number} t @property {number} life @property {number} g gravity @property {number} size
 * @property {string} color @property {'spark'|'note'|'ring'|'text'|'star'|'petal'|'z'|'heart'|'snack'} kind
 * @property {string} [text] @property {number} [rot] @property {number} [spin] @property {number} [drag]
 */

export class Fx {
  constructor() {
    /** @type {P[]} */
    this.list = [];
    this.max = 500;
  }
  /** @param {Partial<P> & {x:number, y:number}} p */
  add(p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ vx: 0, vy: 0, t: 0, life: 1, g: 0, size: 10, color: '#FFF', kind: 'spark', rot: 0, spin: 0, drag: 0, ...p });
  }
  /** @param {number} x @param {number} y @param {string} color @param {number} [n] @param {number} [speed] */
  burst(x, y, color, n = 10, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 220, life: 0.6 + Math.random() * 0.5, size: 5 + Math.random() * 6, color, kind: Math.random() < 0.4 ? 'star' : 'spark', spin: (Math.random() - 0.5) * 8, drag: 1.5 });
    }
  }
  /** @param {number} x @param {number} y @param {string} color @param {number} [r] */
  ring(x, y, color, r = 60) {
    this.add({ x, y, life: 0.7, size: r, color, kind: 'ring' });
  }
  /** @param {number} x @param {number} y @param {string} color */
  note(x, y, color) {
    this.add({ x, y, vx: (Math.random() - 0.5) * 40, vy: -90, life: 1.6, size: 30, color, kind: 'note' });
  }
  /** @param {number} x @param {number} y @param {string} text @param {string} [color] @param {number} [size] */
  text(x, y, text, color = INK, size = 44) {
    this.add({ x, y, vy: -50, life: 1.1, size, color, kind: 'text', text });
  }
  /** @param {number} dt */
  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot = (p.rot ?? 0) + (p.spin ?? 0) * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    for (const p of this.list) {
      const k = p.t / p.life;
      const a = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4);
      switch (p.kind) {
        case 'spark':
          glow(ctx, p.x, p.y, p.size * 3, p.color, a * 0.8);
          ctx.globalAlpha = a;
          ctx.fillStyle = '#FFFDF6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.35, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'star':
          glow(ctx, p.x, p.y, p.size * 3, p.color, a * 0.6);
          star(ctx, p.x, p.y, p.size, p.rot ?? 0, p.color, a);
          break;
        case 'ring':
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (0.3 + k), p.size * (0.3 + k) * 0.45, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
          break;
        case 'note':
          noteGlyph(ctx, p.x + Math.sin(p.t * 5) * 8, p.y, p.size, p.color, a);
          break;
        case 'text':
          fxText(ctx, p.text ?? '', p.x, p.y, p.size * (k < 0.12 ? 0.6 + k * 3.3 : 1), p.color, a);
          break;
        case 'z':
          fxText(ctx, 'z', p.x + Math.sin(p.t * 3) * 10, p.y, p.size * (0.6 + k * 0.6), '#B9C2F0', a);
          break;
        case 'heart':
          fxText(ctx, '\u2665', p.x, p.y, p.size, p.color, a);
          break;
        case 'snack':
          drawSnack(ctx, p.x, p.y, p.size, p.rot ?? 0, a);
          break;
        case 'petal':
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
      }
    }
  }
}

// ---------------------------------------------------------------- backdrops

/** @param {number} w @param {number} h */
function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Paint a world room once into a bitmap (rooms are detailed; characters and effects animate on top).
 * @param {string} world @param {number} layout @param {{light?:number, path?:boolean, stash?:boolean, night?:number}} [o]
 */
export function bakeRoom(world, layout, o = {}) {
  const c = canvasOf(STAGE_W, STAGE_H);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const room = ROOM_ART[world].room;
  const pen = new Pen(ctx);
  try {
    drawRoom(ctx, pen, room, room.layouts[layout], 0, { light: o.light ?? 0, showPath: o.path !== false, showStash: !!o.stash, showSpots: false, reducedMotion: true, lw: 3 });
    if (room.drawFront) {
      pen.begin(0, { boil: false, width: 3, amp: 1 });
      room.drawFront(ctx, pen, 0, { light: o.light ?? 0, layout: room.layouts[layout], reducedMotion: true });
    }
  } catch (err) {
    console.error('[journey] room failed', world, err);
    ctx.fillStyle = '#E9E4D8';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }
  if (o.night) {
    const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
    g.addColorStop(0, `rgba(16,18,58,${0.9 * o.night})`);
    g.addColorStop(0.55, `rgba(28,30,82,${0.72 * o.night})`);
    g.addColorStop(1, `rgba(20,22,60,${0.6 * o.night})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }
  return c;
}

/** The parchment travel map with the whole route. @param {{x:number,y:number}[]} stops @param {string[]} icons */
export function bakeMap(stops, icons) {
  const c = canvasOf(STAGE_W, STAGE_H);
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const g = ctx.createRadialGradient(960, 540, 200, 960, 540, 1150);
  g.addColorStop(0, '#FBF1D9');
  g.addColorStop(1, '#E2C99A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120,90,50,${0.03 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * STAGE_W, rnd() * STAGE_H, 1 + rnd() * 3, 1);
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * STAGE_W;
    const y = rnd() * STAGE_H;
    const r = 60 + rnd() * 180;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, i % 3 ? 'rgba(140,200,120,0.12)' : 'rgba(120,170,220,0.12)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.setLineDash([2, 22]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(110,80,50,0.45)';
  ctx.beginPath();
  stops.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  stops.forEach((p, i) => {
    ctx.fillStyle = '#FFF8E6';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 46, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.font = '44px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[i] ?? '', p.x, p.y + 2);
  });
  ctx.save();
  ctx.translate(1760, 930);
  ctx.strokeStyle = 'rgba(90,60,40,0.6)';
  ctx.fillStyle = 'rgba(90,60,40,0.25)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(14, 0);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  return c;
}

// ---------------------------------------------------------------- characters

/**
 * @typedef {Object} Actor
 * @property {string} id @property {'cat'|'enemy'} kind @property {CatRig|EnemyRig} rig
 * @property {number} x @property {number} y @property {number} scale @property {boolean} flip
 * @property {number} alpha @property {boolean} hidden @property {number} lift extra height (hops)
 * @property {boolean} look eyes follow the pointer @property {string|null} seat cushion color under a cat
 */

/**
 * A character sized in stage px (cats about px tall, enemies fit into px).
 * @param {string} id @param {number} x @param {number} y @param {number} px @param {number} [seed] @returns {Actor}
 */
export function makeActor(id, x, y, px, seed = 1) {
  const catArt = CAT_ART[id] ?? KITTEN_ART[id];
  if (catArt) {
    return { id, kind: 'cat', rig: new CatRig(catArt.spec, seed), x, y, scale: (px / 250) * (catArt.spec.scale ?? 1), flip: false, alpha: 1, hidden: false, lift: 0, look: true, seat: null };
  }
  const art = ENEMY_ART[id] ?? BOSS_ART[id];
  const spec = art.spec;
  const hFit = px / (spec.height ?? 180);
  const wFit = spec.width ? (px * 1.5) / spec.width : Infinity;
  return { id, kind: 'enemy', rig: new EnemyRig(spec, seed), x, y, scale: Math.min(hFit, wFit) * (spec.scale ?? 1), flip: false, alpha: 1, hidden: false, lift: 0, look: true, seat: null };
}

/** @param {CanvasRenderingContext2D} ctx @param {Actor} a @param {boolean} reduced */
export function drawActor(ctx, a, reduced) {
  if (a.hidden || a.alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a.alpha;
  if (a.seat) cushion(ctx, a.x, a.y + 4, a.scale * 250 * 0.95, a.seat);
  ctx.translate(a.x, a.y - a.lift);
  ctx.scale(a.scale, a.scale);
  if (a.kind === 'cat') /** @type {CatRig} */ (a.rig).draw(ctx, a.scale, { reducedMotion: reduced });
  else /** @type {EnemyRig} */ (a.rig).draw(ctx, a.scale, { reducedMotion: reduced, flip: a.flip });
  ctx.restore();
}

/** Plump cushion. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {string} [base] */
export function cushion(ctx, x, y, w, base = '#F4B7C2') {
  ctx.save();
  ctx.fillStyle = 'rgba(59,58,74,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + w * 0.1, w * 0.55, w * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = base;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
