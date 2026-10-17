// @ts-check
// Hand-drawn props for storybook panels (1600×900 logical stage). Plain Canvas2D plus the shared Pen.
import { Pen, ellipsePts, soft, fxText } from '../../art/brush.js';
import { drawCushion } from '../../art/props.js';
import { drawStash } from '../../art/rooms/common.js';
import { INK } from '../../art/palette.js';

export { fxText };

const pen = new Pen(null);

/** Subdivide polygon edges so Pen's smoothing keeps corners crisp. @param {{x:number,y:number}[]} pts @param {number} [n] */
export function dense(pts, n = 10) {
  /** @type {{x:number,y:number}[]} */
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}
/** @param {CanvasRenderingContext2D} ctx @param {number} t @param {boolean} calm @param {number} [w] */
export function usePen(ctx, t, calm, w = 3) {
  pen.ctx = ctx;
  pen.begin(t, { boil: !calm, width: w, amp: 0.9 });
  return pen;
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} t @param {boolean} calm @param {string} [base] @param {string} [dark] */
export function cushion(ctx, x, y, s, t, calm, base, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const p = usePen(ctx, t, calm, 3 / s);
  drawCushion(p, 3 / s, base, dark);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} t @param {boolean} calm */
export function stash(ctx, x, y, s, t, calm) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const p = usePen(ctx, t, calm, 3 / s);
  drawStash(p, 0, 0, t, 3 / s);
  ctx.restore();
}

/**
 * A cat food bowl. `fill` 0 = empty (one sad crumb), 1 = heaped with kibble.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} fill @param {number} t @param {boolean} calm
 */
export function bowl(ctx, x, y, s, fill, t, calm) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const p = usePen(ctx, t, calm, 4 / s);
  ctx.fillStyle = 'rgba(59,58,74,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 130, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (fill > 0) {
    const hgt = 70 * fill;
    const mound = ellipsePts(0, -66, 104, 20 + hgt, 30).filter((q) => q.y <= -60);
    p.blob([{ x: -104, y: -64 }, ...mound.sort((a, b) => a.x - b.x), { x: 104, y: -64 }], soft(ctx, -20, -66 - hgt * 0.6, 120, '#E7B07A', '#C98A52', '#9E6638'));
    ctx.fillStyle = '#8A5530';
    for (let i = 0; i < 26; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = ((i * 37) % 90) / 100;
      const kx = Math.cos(a) * 90 * r;
      const ky = -66 - Math.sqrt(Math.max(0, 1 - (kx / 104) ** 2)) * hgt * (0.3 + 0.6 * (1 - r)) + 6;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 5, 3.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const body = [
    { x: -124, y: -66 },
    { x: -112, y: -30 },
    { x: -86, y: -4 },
    { x: 0, y: 4 },
    { x: 86, y: -4 },
    { x: 112, y: -30 },
    { x: 124, y: -66 },
  ];
  p.blob(body, soft(ctx, -40, -50, 140, '#FFFDF6', '#9FD3EA', '#5E9AB8'));
  p.blob(ellipsePts(0, -66, 124, 18, 32), fill > 0 ? null : '#E9F1F2');
  if (fill <= 0) {
    ctx.fillStyle = '#B98A60';
    ctx.beginPath();
    ctx.ellipse(18, -64, 5, 3.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // a little fish doodle on the side
  p.line([{ x: -30, y: -32 }, { x: 10, y: -26 }, { x: -30, y: -20 }], { color: '#FFFDF6', width: 4 / s });
  p.line([{ x: 10, y: -26 }, { x: 22, y: -34 }, { x: 22, y: -18 }, { x: 10, y: -26 }], { color: '#FFFDF6', width: 4 / s });
  ctx.restore();
}

/** Floating z's. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} t @param {number} [size] */
export function zzz(ctx, x, y, t, size = 30) {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.45 + i / 3) % 1;
    fxText(ctx, 'z', x + k * 40 + Math.sin(k * 6 + i) * 8, y - k * 90, size * (0.6 + k * 0.7), INK, Math.sin(k * Math.PI));
  }
}

/** Four-point sparkle cluster. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} t @param {string} [color] @param {number} [n] */
export function sparkles(ctx, x, y, r, t, color = '#F2C14E', n = 7) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + t * 0.4;
    const d = r * (0.4 + ((i * 53) % 60) / 100);
    const k = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
    star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 8 + k * 12);
  }
  ctx.restore();
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
export function star4(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r * 0.3 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Low table with a quilted blanket (a kotatsu). @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} t @param {boolean} calm */
export function kotatsu(ctx, x, y, w, t, calm) {
  const p = usePen(ctx, t, calm, 4);
  const hw = w / 2;
  p.blob(
    dense([
      { x: x - hw - 30, y: y },
      { x: x - hw - 10, y: y - 90 },
      { x: x + hw + 10, y: y - 90 },
      { x: x + hw + 30, y: y },
    ]),
    soft(ctx, x - hw * 0.5, y - 70, w, '#F7B7A3', '#E58F7B', '#B9634F'),
  );
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#FFF6EA';
  ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (i * hw) / 3.5, y - 86);
    ctx.lineTo(x + (i * (hw + 25)) / 3.5, y - 4);
    ctx.stroke();
  }
  ctx.restore();
  p.blob(
    dense([
      { x: x - hw - 24, y: y - 104 },
      { x: x + hw + 24, y: y - 104 },
      { x: x + hw + 18, y: y - 88 },
      { x: x - hw - 18, y: y - 88 },
    ]),
    '#A0764F',
  );
  // tea cup + mikan
  p.blob(ellipsePts(x + hw * 0.45, y - 120, 20, 16, 14), '#9DB58A');
  p.blob(ellipsePts(x - hw * 0.4, y - 118, 16, 14, 14), '#F29E4C');
  if (!calm) for (let i = 0; i < 2; i++) {
    const k = (t * 0.6 + i * 0.5) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * Math.sin(k * Math.PI)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.45 + i * 8 - 4, y - 140 - k * 50);
    ctx.quadraticCurveTo(x + hw * 0.45 + 12, y - 150 - k * 50, x + hw * 0.45 + i * 8, y - 160 - k * 50);
    ctx.stroke();
  }
}

/** Office whiteboard with handwritten lines. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string[]} lines @param {number} t @param {boolean} calm */
export function whiteboard(ctx, x, y, lines, t, calm) {
  const p = usePen(ctx, t, calm, 4);
  p.line([{ x: x + 30, y: y + 250 }, { x: x + 50, y: y + 360 }], { width: 5 });
  p.line([{ x: x + 330, y: y + 250 }, { x: x + 310, y: y + 360 }], { width: 5 });
  p.blob(dense([{ x, y }, { x: x + 360, y: y - 4 }, { x: x + 364, y: y + 252 }, { x: x + 2, y: y + 256 }]), '#FFFDF6');
  ctx.fillStyle = 'rgba(59,58,74,0.08)';
  ctx.fillRect(x + 20, y + 228, 80, 10);
  ctx.save();
  ctx.fillStyle = '#3B6EA8';
  ctx.font = '600 30px Fredoka, "Arial Rounded MT Bold", sans-serif';
  ctx.textBaseline = 'top';
  lines.forEach((ln, i) => {
    ctx.fillStyle = i === 0 ? '#D2483C' : '#3B6EA8';
    ctx.fillText(ln, x + 24, y + 22 + i * 46);
  });
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} t */
export function moon(ctx, x, y, r, t) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4);
  g.addColorStop(0, 'rgba(255,244,207,0.55)');
  g.addColorStop(1, 'rgba(255,244,207,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = soft(ctx, x, y, r, '#FFFDF0', '#FFF4CF', '#EAD9A0');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(201,180,120,0.3)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.12], [0.05, 0.4, 0.09]]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  void t;
}

/** Twinkling stars over the top part of the stage. @param {CanvasRenderingContext2D} ctx @param {number} t @param {number} [n] @param {number} [maxY] */
export function starfield(ctx, t, n = 50, maxY = 520) {
  ctx.save();
  ctx.fillStyle = '#FFE58A';
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.2 + i * 1.3));
    const x = (i * 197.3) % 1600;
    const y = (i * 83.7) % maxY;
    if (i % 5 === 0) star4(ctx, x, y, 7);
    else ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
}

/** Diagonal rain streaks. @param {CanvasRenderingContext2D} ctx @param {number} t @param {number} [alpha] */
export function rain(ctx, t, alpha = 0.45) {
  ctx.save();
  ctx.strokeStyle = `rgba(200,225,235,${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = ((i * 173.1 + t * 260) % 1760) - 80;
    const y = ((i * 97.7 + t * 900) % 1000) - 60;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 10, y + 34);
  }
  ctx.stroke();
  ctx.restore();
}

/** Paper lanterns. @param {CanvasRenderingContext2D} ctx @param {{x:number,y:number,r?:number}[]} list @param {number} t @param {boolean} calm */
export function lanterns(ctx, list, t, calm) {
  const p = usePen(ctx, t, calm, 3);
  list.forEach((l, i) => {
    const r = l.r ?? 34;
    const sw = calm ? 0 : Math.sin(t * 1.4 + i) * 4;
    const glow = ctx.createRadialGradient(l.x + sw, l.y, 4, l.x + sw, l.y, r * 3);
    glow.addColorStop(0, 'rgba(242,158,76,0.5)');
    glow.addColorStop(1, 'rgba(242,158,76,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(l.x + sw, l.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    p.line([{ x: l.x, y: l.y - r - 40 }, { x: l.x + sw, y: l.y - r }], { width: 2 });
    p.blob(ellipsePts(l.x + sw, l.y, r * 0.85, r, 18), soft(ctx, l.x + sw, l.y, r, '#FFE2B0', '#F29E4C', '#D2483C'));
  });
}

/** Speech bubble with a tail toward (tx, ty). @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string} text @param {number} tx @param {number} ty @param {number} [size] */
export function bubble(ctx, x, y, text, tx, ty, size = 30) {
  ctx.save();
  ctx.font = `600 ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
  const w = ctx.measureText(text).width + size * 1.4;
  const hh = size * 1.9;
  ctx.fillStyle = '#FFFDF6';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2);
  ctx.moveTo(x - 14, y + hh / 2 - 2);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + 14, y + hh / 2 - 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(x - 12, y + hh / 2 - 6, 24, 6);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/** Confetti rain. @param {CanvasRenderingContext2D} ctx @param {number} t @param {number} [n] */
export function confetti(ctx, t, n = 60) {
  const cols = ['#F4A6B7', '#F2C14E', '#BFE6D3', '#D9CCF2', '#9FD3EA', '#FFD3B5'];
  for (let i = 0; i < n; i++) {
    const x = (((i * 131.7 + Math.sin(t + i) * 30) % 1600) + 1600) % 1600;
    const y = ((i * 71.3 + t * (80 + (i % 5) * 20)) % 980) - 60;
    ctx.save();
    ctx.fillStyle = cols[i % cols.length];
    ctx.translate(x, y);
    ctx.rotate(t * 2 + i);
    ctx.fillRect(-7, -4, 14, 8);
    ctx.restore();
  }
}

/** Tiny fish-cracker treat. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} rot */
export function treat(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = '#F2C14E';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
  ctx.moveTo(18, 0);
  ctx.lineTo(34, -12);
  ctx.lineTo(34, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-10, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Simple floating island. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} t @param {boolean} calm */
export function island(ctx, x, y, w, t, calm) {
  const bob = calm ? 0 : Math.sin(t * 0.8 + x) * 6;
  const p = usePen(ctx, t, calm, 3);
  p.blob(
    [
      { x: x - w / 2, y: y + bob },
      { x: x - w * 0.2, y: y + w * 0.45 + bob },
      { x: x + w * 0.05, y: y + w * 0.6 + bob },
      { x: x + w * 0.3, y: y + w * 0.3 + bob },
      { x: x + w / 2, y: y + bob },
    ],
    soft(ctx, x, y + w * 0.2 + bob, w * 0.5, '#C9D3E8', '#8C84C9', '#5A538F'),
  );
  p.blob(ellipsePts(x, y + bob, w / 2, w * 0.1, 22), soft(ctx, x, y + bob, w / 2, '#BFE6A6', '#8DBF6A', '#5E9A4E'));
}

/** Gentle cloud whale silhouette. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s @param {number} t @param {boolean} calm */
export function cloudWhale(ctx, x, y, s, t, calm) {
  ctx.save();
  ctx.translate(x + (calm ? 0 : Math.sin(t * 0.3) * 20), y + (calm ? 0 : Math.sin(t * 0.6) * 8));
  ctx.scale(s, s);
  const p = usePen(ctx, t, calm, 3 / s);
  p.blob(ellipsePts(0, 0, 220, 80, 36, (a) => 1 + 0.08 * Math.sin(a * 5)), soft(ctx, -60, -30, 220, '#FFFFFF', '#E6ECF7', '#BFC8E4'));
  p.blob([{ x: 200, y: -10 }, { x: 290, y: -70 }, { x: 270, y: 0 }, { x: 290, y: 60 }], '#E6ECF7');
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-150, -10, 7, 0, Math.PI * 2);
  ctx.fill();
  p.line([{ x: -200, y: 20 }, { x: -150, y: 34 }, { x: -100, y: 26 }], { width: 3 / s });
  ctx.restore();
}

/** Darken/tint the whole stage. @param {CanvasRenderingContext2D} ctx @param {string} color */
export function wash(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1600, 900);
}

/** Soft vignette. @param {CanvasRenderingContext2D} ctx @param {number} [k] */
export function vignette(ctx, k = 0.35) {
  const g = ctx.createRadialGradient(800, 450, 300, 800, 450, 980);
  g.addColorStop(0, 'rgba(59,58,74,0)');
  g.addColorStop(1, `rgba(59,58,74,${k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 900);
}
