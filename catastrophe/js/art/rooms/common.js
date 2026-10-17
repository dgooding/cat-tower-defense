// @ts-check
// Shared room pieces: the room contract, worn paths, nap spots and the Snack Stash.
// Rooms draw in a fixed 1920×1080 logical stage.
import { Pen, ellipsePts, soft, fxText } from '../brush.js';
import { INK } from '../palette.js';
import { catmullRom } from '../../core/spline.js';
import { drawCushion } from '../props.js';
import { hash2 } from '../../core/rng.js';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** @typedef {{x:number, y:number}} Pt */
/**
 * @typedef {Object} Layout one level's geometry (1920×1080 coords)
 * @property {string} id e.g. "1-1" @property {string} name
 * @property {Pt[][]} paths control points per enemy path (start off-screen, end at the stash)
 * @property {Pt[]} spots nap-spot centers (cushions), never on a path
 * @property {Pt} stash Snack Stash position (where paths end)
 * @property {Pt[][]} [flyPaths] optional flier routes
 */
/**
 * @typedef {Object} RoomOpts
 * @property {boolean} [reducedMotion]
 * @property {number} [light] 0 = morning … 1 = dusk/late (lighting drift across waves)
 * @property {Layout} [layout] the layout being shown (rooms may adapt scenery to it)
 */
/**
 * @typedef {Object} RoomSpec
 * @property {string} id @property {string} name
 * @property {{fill:string, edge:string, speck?:string, width?:number}} pathStyle
 * @property {{base?:string, dark?:string}} [cushion] nap-spot cushion colors
 * @property {'cushion'|'deck'|'cloud'} [seat] what a placed cat sits on: a cushion (default), a round wooden deck, or a little cloud
 * @property {(ctx:CanvasRenderingContext2D, pen:Pen, t:number, o:RoomOpts) => void} drawBack scenery behind the path
 * @property {(ctx:CanvasRenderingContext2D, pen:Pen, t:number, o:RoomOpts) => void} [drawMid] scenery drawn after the path, before characters (e.g. bridges, props beside the path)
 * @property {(ctx:CanvasRenderingContext2D, pen:Pen, t:number, o:RoomOpts) => void} [drawFront] foreground framing over everything (edges only, keep the play area readable)
 * @property {Layout[]} layouts exactly 3 levels for this world
 */

/** @type {WeakMap<Pt[], {key:string, canvas:HTMLCanvasElement|OffscreenCanvas, x:number, y:number, k:number, w:number, h:number}>} */
const pathCache = new WeakMap();
const PATH_RES = 1.5;

/**
 * Worn dirt path along control points. Painted once into a cached bitmap per path,
 * then blitted every frame (paths are static).
 * @param {CanvasRenderingContext2D} ctx @param {Pt[]} control @param {RoomSpec['pathStyle']} style
 */
export function drawPath(ctx, control, style) {
  const key = `${style.fill}|${style.edge}|${style.speck}|${style.width}`;
  let c = pathCache.get(control);
  if (!c || c.key !== key) {
    const made = bakePath(control, style, key);
    if (!made) {
      paintPath(ctx, catmullRom(control, 20), style);
      return;
    }
    c = made;
    pathCache.set(control, c);
  }
  ctx.drawImage(c.canvas, c.x, c.y, c.w, c.h);
}

/** @param {Pt[]} control @param {RoomSpec['pathStyle']} style @param {string} key */
function bakePath(control, style, key) {
  const make = (/** @type {number} */ w, /** @type {number} */ h) =>
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: w, height: h }) : null;
  const pts = catmullRom(control, 20);
  const pad = (style.width ?? 92) / 2 + 14;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  x0 = Math.max(-pad, Math.floor(x0 - pad));
  y0 = Math.max(-pad, Math.floor(y0 - pad));
  x1 = Math.min(STAGE_W + pad, Math.ceil(x1 + pad));
  y1 = Math.min(STAGE_H + pad, Math.ceil(y1 + pad));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const canvas = make(Math.ceil(w * PATH_RES), Math.ceil(h * PATH_RES));
  const cctx = /** @type {CanvasRenderingContext2D|null} */ (canvas?.getContext('2d') ?? null);
  if (!canvas || !cctx) return null;
  cctx.scale(PATH_RES, PATH_RES);
  cctx.translate(-x0, -y0);
  paintPath(cctx, pts, style);
  return { key, canvas, x: x0, y: y0, k: PATH_RES, w, h };
}

/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts @param {RoomSpec['pathStyle']} style */
function paintPath(ctx, pts, style) {
  const w = style.width ?? 92;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
  };
  trace();
  ctx.strokeStyle = 'rgba(59,58,74,0.18)';
  ctx.lineWidth = w + 14;
  ctx.stroke();
  trace();
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = w + 6;
  ctx.stroke();
  trace();
  ctx.strokeStyle = style.fill;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.fillStyle = style.speck ?? 'rgba(59,58,74,0.14)';
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    for (let k = 0; k < 2; k++) {
      const ox = (hash2(i, k * 2) - 0.5) * w * 0.8;
      const oy = (hash2(i, k * 2 + 1) - 0.5) * w * 0.8;
      ctx.beginPath();
      ctx.ellipse(p.x + ox, p.y + oy, 3 + hash2(i, k + 7) * 3, 2 + hash2(i, k + 9) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Nap-spot cushion centered at (x, y), sized for the 1920×1080 stage.
 * @param {Pen} pen @param {number} x @param {number} y @param {number} lw @param {RoomSpec['cushion']} [c] @param {boolean} [highlight]
 */
export function drawNapSpot(pen, x, y, lw, c, highlight = false) {
  const ctx = pen.ctx;
  ctx.save();
  ctx.translate(x, y);
  const k = 0.72;
  ctx.scale(k, k);
  if (highlight) {
    ctx.fillStyle = 'rgba(255,246,184,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 130, 50, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawCushion(pen, lw / k, c?.base, c?.dark);
  ctx.restore();
}

/**
 * What a placed cat sits on, themed per world: a cushion; a cushion on a round wooden deck
 * (bathhouse: reads as a floating tub-lid on water); or a cushion on a little cloud (sky islands).
 * @param {Pen} pen @param {number} x @param {number} y @param {number} lw @param {RoomSpec|null|undefined} room
 */
export function drawSeat(pen, x, y, lw, room) {
  const ctx = pen.ctx;
  const seat = room?.seat ?? 'cushion';
  if (seat === 'deck') {
    pen.blob(ellipsePts(x, y + 8, 82, 30, 28), soft(ctx, x, y + 2, 82, '#C99566', '#A8703F', '#7A4B27'), { width: lw });
    ctx.save();
    ctx.strokeStyle = 'rgba(70,40,20,0.45)';
    ctx.lineWidth = 2;
    for (const dy of [-10, 4, 18]) {
      const w = Math.sqrt(Math.max(0, 1 - ((dy - 8) / 30) ** 2)) * 76;
      ctx.beginPath();
      ctx.moveTo(x - w, y + dy);
      ctx.lineTo(x + w, y + dy);
      ctx.stroke();
    }
    ctx.restore();
  } else if (seat === 'cloud') {
    const puffs = [
      [-58, 10, 30],
      [-26, 2, 36],
      [14, 0, 38],
      [52, 8, 30],
      [0, 18, 44],
    ];
    for (const [dx, dy, r] of puffs) pen.blob(ellipsePts(x + dx, y + dy, r, r * 0.62, 16), soft(ctx, x + dx, y + dy - 6, r, '#FFFFFF', '#E6E1F7', '#B9B0E0'), { width: lw * 0.8 });
  }
  drawNapSpot(pen, x, y - (seat === 'cushion' ? 0 : 6), lw, room?.cushion);
}

/**
 * The Snack Stash: a picnic blanket piled with rice balls and fish crackers.
 * @param {Pen} pen @param {number} x @param {number} y @param {number} t @param {number} lw @param {number} [eaten] 0..1 how much has been eaten
 */
export function drawStash(pen, x, y, t, lw, eaten = 0) {
  const ctx = pen.ctx;
  ctx.save();
  ctx.translate(x, y);
  const blanket = ellipsePts(0, 0, 120, 46, 24, (a) => 1 + 0.06 * Math.cos(4 * a));
  pen.blob(blanket, '#F6EEDC', { width: lw });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 118, 44, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(210,72,60,0.55)';
  for (let i = -6; i <= 6; i++) {
    ctx.fillRect(i * 22 - 5, -50, 10, 100);
    ctx.fillRect(-130, i * 14 - 3, 260, 6);
  }
  ctx.restore();
  const left = Math.round(6 * (1 - eaten));
  const items = [
    [-50, -10],
    [-10, -22],
    [32, -8],
    [-28, 12],
    [14, 10],
    [56, 14],
  ];
  for (let i = 0; i < left; i++) {
    const [ix, iy] = items[i];
    const bob = Math.sin(t * 2 + i) * 1.5;
    if (i % 2 === 0) {
      pen.blob([{ x: ix, y: iy - 24 + bob }, { x: ix + 20, y: iy + 8 }, { x: ix - 20, y: iy + 8 }], '#FFFDF6', { width: lw * 0.9 });
      ctx.fillStyle = '#2F4A3A';
      ctx.fillRect(ix - 9, iy - 2, 18, 10);
    } else {
      pen.blob(ellipsePts(ix, iy + bob, 18, 9, 12, (a) => 1 + 0.15 * Math.cos(3 * a)), soft(ctx, ix, iy, 18, '#FFE3A0', '#F2C14E', '#D99A2B'), { width: lw * 0.9 });
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(ix + 9, iy - 2 + bob, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  fxText(ctx, 'Snack Stash', 0, 62, 22, INK, 0.9);
  ctx.restore();
}

/**
 * Convenience: draw a whole room (scenery + paths + stash + spots).
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {RoomSpec} room @param {Layout} layout @param {number} t
 * @param {RoomOpts & {showPath?:boolean, showSpots?:boolean, showStash?:boolean, lw?:number}} [o]
 */
export function drawRoom(ctx, pen, room, layout, t, o = {}) {
  const lw = o.lw ?? 3;
  pen.begin(t, { boil: !o.reducedMotion, width: lw, amp: 1 });
  const opts = { ...o, layout };
  room.drawBack(ctx, pen, t, opts);
  if (o.showPath !== false) for (const p of layout.paths) drawPath(ctx, p, room.pathStyle);
  room.drawMid?.(ctx, pen, t, opts);
  if (o.showStash !== false) drawStash(pen, layout.stash.x, layout.stash.y, t, lw);
  if (o.showSpots !== false) for (const s of layout.spots) drawNapSpot(pen, s.x, s.y, lw, room.cushion);
}
