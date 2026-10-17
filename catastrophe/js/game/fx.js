// @ts-check
// Lightweight effects: floating text, rings, particles and one-shot gags. Pooled, no per-frame allocs.

/**
 * @typedef {Object} Effect
 * @property {boolean} on @property {string} kind @property {number} x @property {number} y
 * @property {number} t @property {number} life @property {number} vx @property {number} vy
 * @property {number} r @property {number} x2 @property {number} y2 @property {string} color
 * @property {string} text @property {number} size
 */

const MAX = 420;

/** @type {Map<string, HTMLCanvasElement>} */
const textCache = new Map();
const TEXT_RES = 2; // sprite pixels per stage pixel (crisp up to 2× zoom)

/**
 * Outlined comic text baked into a small canvas (strokeText every frame is slow). Cached by content.
 * @param {string} text @param {number} size @param {string} color
 */
export function textImg(text, size, color) {
  const key = text + '|' + size + '|' + color;
  let c = textCache.get(key);
  if (c) return c;
  if (textCache.size > 300) textCache.clear();
  c = document.createElement('canvas');
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const font = `700 ${size * TEXT_RES}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width + size * TEXT_RES * 0.6);
  const h = Math.ceil(size * TEXT_RES * 1.5);
  c.width = Math.max(1, w);
  c.height = h;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * TEXT_RES * 0.28;
  ctx.strokeStyle = '#FFFDF6';
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);
  textCache.set(key, c);
  return c;
}

/**
 * Draw cached text centered at (x, y) in stage units.
 * @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} x @param {number} y @param {number} size @param {string} [color] @param {number} [alpha] @param {number} [scale]
 */
export function drawText(ctx, text, x, y, size, color = '#3B3A4A', alpha = 1, scale = 1) {
  if (alpha <= 0) return;
  const img = textImg(text, size, color);
  const w = (img.width / TEXT_RES) * scale;
  const h = (img.height / TEXT_RES) * scale;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * alpha;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.globalAlpha = a;
}

export class Fx {
  /** @param {{reducedMotion:boolean}} o */
  constructor(o) {
    this.reduced = o.reducedMotion;
    /** @type {Effect[]} */
    this.pool = [];
    for (let i = 0; i < MAX; i++) this.pool.push({ on: false, kind: '', x: 0, y: 0, t: 0, life: 1, vx: 0, vy: 0, r: 0, x2: 0, y2: 0, color: '', text: '', size: 0 });
    this.cursor = 0;
    this.shake = 0;
    this.shakeOn = true;
  }

  clear() {
    for (const e of this.pool) e.on = false;
    this.shake = 0;
  }

  /** @param {string} kind @param {number} x @param {number} y @param {number} life @returns {Effect} */
  add(kind, x, y, life) {
    let e = this.pool[this.cursor];
    // Prefer a free slot near the cursor; overwrite the oldest otherwise.
    for (let i = 0; i < 16; i++) {
      const c = this.pool[(this.cursor + i) % MAX];
      if (!c.on) {
        e = c;
        this.cursor = (this.cursor + i) % MAX;
        break;
      }
    }
    this.cursor = (this.cursor + 1) % MAX;
    e.on = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.t = 0;
    e.life = life;
    e.vx = 0;
    e.vy = 0;
    e.r = 0;
    e.x2 = 0;
    e.y2 = 0;
    e.color = '#3B3A4A';
    e.text = '';
    e.size = 24;
    return e;
  }

  /** @param {string} text @param {number} x @param {number} y @param {string} [color] @param {number} [size] @param {number} [life] */
  text(text, x, y, color = '#3B3A4A', size = 24, life = 1) {
    const e = this.add('text', x, y, life);
    e.text = text;
    e.color = color;
    e.size = size;
    e.vy = -40;
  }

  /** @param {number} x @param {number} y @param {number} r @param {string} [color] @param {number} [life] */
  ring(x, y, r, color = '#FFFDF6', life = 0.45) {
    const e = this.add('ring', x, y, life);
    e.r = r;
    e.color = color;
  }

  /** @param {number} x @param {number} y @param {number} n @param {string[]} colors @param {number} [speed] */
  burst(x, y, n, colors, speed = 220) {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const s = speed * (0.4 + Math.random() * 0.8);
      const e = this.add('spark', x, y, 0.5 + Math.random() * 0.4);
      e.vx = Math.cos(a) * s;
      e.vy = Math.sin(a) * s - speed * 0.4;
      e.color = colors[i % colors.length];
      e.size = 4 + Math.random() * 5;
    }
  }

  /** Line-ish effect from (x,y) to (x2,y2). @param {string} kind @param {number} x @param {number} y @param {number} x2 @param {number} y2 @param {number} life @param {string} [color] */
  link(kind, x, y, x2, y2, life, color = '#3B3A4A') {
    const e = this.add(kind, x, y, life);
    e.x2 = x2;
    e.y2 = y2;
    e.color = color;
  }

  /** @param {number} amount */
  addShake(amount) {
    if (!this.reduced && this.shakeOn) this.shake = Math.min(18, this.shake + amount);
  }

  /** @param {number} dt */
  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 40);
    for (const e of this.pool) {
      if (!e.on) continue;
      e.t += dt;
      if (e.t >= e.life) {
        e.on = false;
        continue;
      }
      if (e.kind === 'spark') {
        e.vy += 600 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.kind === 'text') {
        e.y += e.vy * dt;
        e.vy *= 1 - dt * 2;
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {number} time */
  draw(ctx, time) {
    for (const e of this.pool) {
      if (!e.on) continue;
      const k = e.t / e.life;
      switch (e.kind) {
        case 'text': {
          const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.4 : 1;
          drawText(ctx, e.text, e.x, e.y, e.size, e.color, k > 0.7 ? (1 - k) / 0.3 : 1, pop);
          break;
        }
        case 'ring':
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 10 * (1 - k) + 2;
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.r * (0.3 + k * 0.8), e.r * (0.3 + k * 0.8) * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(59,58,74,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          break;
        case 'spark':
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = e.color;
          ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size * 0.7);
          ctx.globalAlpha = 1;
          break;
        case 'hiss': {
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#E2463A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          const n = 6;
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const px = e.x + (e.x2 - e.x) * u;
            const py = e.y + (e.y2 - e.y) * u + (i % 2 ? -8 : 8) * (1 - u * 0.5);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'spray':
          ctx.save();
          ctx.fillStyle = '#7FC4E6';
          ctx.globalAlpha = 1 - k * 0.6;
          for (let i = 0; i < 6; i++) {
            const u = Math.min(1, k * 1.6 + i * 0.05);
            const px = e.x + (e.x2 - e.x) * u + Math.sin(i * 2.1) * 10;
            const py = e.y - 30 + (e.y2 - 30 - (e.y - 30)) * u - Math.sin(u * Math.PI) * 40;
            ctx.beginPath();
            ctx.ellipse(px, py, 5, 7, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        case 'bolt':
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#FFE58A';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - 60);
          for (let i = 1; i <= 5; i++) ctx.lineTo(e.x2 + (e.x - e.x2) * (1 - i / 5) + (i % 2 ? 14 : -14), e.y - 60 + (e.y2 - e.y + 60) * (i / 5));
          ctx.stroke();
          ctx.restore();
          break;
        case 'reticle': {
          ctx.save();
          ctx.strokeStyle = '#E2463A';
          ctx.lineWidth = 4;
          const r = e.r * (1.4 - k * 0.6);
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 20);
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.moveTo(e.x - r - 12, e.y);
          ctx.lineTo(e.x + r + 12, e.y);
          ctx.moveTo(e.x, e.y - r - 12);
          ctx.lineTo(e.x, e.y + r + 12);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'skybeam':
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = 'rgba(255,80,70,0.55)';
          ctx.fillRect(e.x - 24 * (1 - k), 0, 48 * (1 - k), e.y);
          ctx.restore();
          break;
        case 'mug': {
          const fall = Math.min(1, k * 1.0);
          const y = e.y - 700 * (1 - fall * fall);
          ctx.save();
          ctx.translate(e.x, y);
          ctx.rotate(fall * 4);
          ctx.fillStyle = '#FFFDF6';
          ctx.strokeStyle = '#3B3A4A';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(-26, -30, 52, 60, 8);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(30, 0, 14, -1.2, 1.2);
          ctx.stroke();
          ctx.fillStyle = '#F4A6B7';
          ctx.fillRect(-20, -10, 40, 10);
          ctx.restore();
          break;
        }
        case 'yowl':
          ctx.save();
          for (let i = 0; i < 3; i++) {
            const kk = (k + i * 0.18) % 1;
            ctx.globalAlpha = (1 - kk) * 0.5;
            ctx.strokeStyle = '#8C84C9';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 60 + kk * 1200, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          break;
        case 'heart':
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = '#F4A6B7';
          ctx.translate(e.x + Math.sin(k * 9) * 8, e.y - k * 60);
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.bezierCurveTo(-14, -6, -6, -16, 0, -8);
          ctx.bezierCurveTo(6, -16, 14, -6, 0, 6);
          ctx.fill();
          ctx.restore();
          break;
        case 'flash':
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.35;
          ctx.fillStyle = e.color;
          ctx.fillRect(0, 0, 1920, 1080);
          ctx.restore();
          break;
      }
    }
  }
}
