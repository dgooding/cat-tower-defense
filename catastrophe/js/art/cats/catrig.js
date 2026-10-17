// @ts-check
// Generic cat rig: body, head, ears, eyes, mouth, tail + expression system + FX.
// Every cat in the game is a CatSpec (colors, proportions, accessories, actions)
// drawn by this one rig, so all cats share the same animation "soul".
import { Pen, ellipsePts, rotatePts, scalePts, soft, fxText, traceClosed } from '../brush.js';
import { INK, WHITE, NOSE, TONGUE, MOUTH_DARK, WATER } from '../palette.js';
import { Spring, Blink, Twitch, LookAt } from '../../anim/rig.js';
import { mulberry32, clamp, hash2 } from '../../core/rng.js';

/** @typedef {import('../brush.js').Pt} Pt */
/** @typedef {'idle'|'happy'|'focused'|'smug'|'startled'|'wet'|'sad'|'sleepy'|'vibing'|'celebrate'} Expression */
/** @typedef {'open'|'happy'|'closed'|'xx'|'spiral'|'sparkle'} EyeStyle */
/** @typedef {'w'|'blep'|'smile'|'open'|'o'|'flat'|'frown'|'smirk'|'hiss'|'yawn'} MouthShape */

/**
 * @typedef {Object} Geo  Geometry handed to accessories so they can anchor to the body.
 * @property {Pen} pen @property {CanvasRenderingContext2D} ctx @property {CatSpec} S
 * @property {number} hy head center y @property {number} brx body radius x @property {number} bry body radius y
 * @property {number} hrx head radius x @property {number} lw ink width @property {number} t time
 * @property {CatRig} [rig] the rig being drawn (for accessories that react to ears, blinks or expression)
 */
/** `hat: true` marks headwear on the crown; built-in hats are hidden while a Wardrobe hat (also `hat: true`) is worn. */
/** @typedef {{layer:'side'|'body'|'neck'|'head', hat?:boolean, draw:(g:Geo)=>void}} Accessory */
/**
 * @typedef {Object} ActionDef
 * @property {number} duration
 * @property {(rig:CatRig, t:number, dt:number)=>void} update
 */
/**
 * @typedef {Object} CatSpec
 * @property {string} id
 * @property {string} fur @property {string} light @property {string} shade
 * @property {string} cream default belly / muzzle color
 * @property {string|null} [belly] belly patch color (null = no belly patch; default cream)
 * @property {string} [muzzle] muzzle color (default cream)
 * @property {string} [paw] @property {string} stripe
 * @property {string} eye @property {string} eyeDark @property {string} [eyeLight]
 * @property {string} innerEar
 * @property {string} [earFur] outer ear fill (e.g. Siamese points)
 * @property {string} [tailColor] @property {string} [tailTip] last two tail segments
 * @property {string} [lidColor] eyelid fill (default fur)
 * @property {string} [nose] @property {string} [whisker] whisker color (e.g. white on black cats)
 * @property {string} [outline] ink color override (default INK)
 * @property {number} [fluff] 0..1 tufty outline for fluffy cats
 * @property {number} [pupil] pupil size multiplier (default 1; Dr. Nip � 1.5)
 * @property {number} [tailWidth] tail thickness multiplier (default 1)
 * @property {'angry'|'sad'|'up'|'grumpy'|'smug'} [brow] default brows when the expression has none
 * @property {number} [scale] draw-scale multiplier for callers (kittens ≈ 0.55)
 * @property {'tabby'|'none'} pattern built-in pattern; use the hooks below for anything else
 * @property {(g:Geo, b:{bcy:number, brx:number, bry:number}) => void} [bodyPattern] drawn clipped to the body
 * @property {(g:Geo, h:{hrx:number, hry:number}) => void} [headPattern] drawn clipped to the head
 * @property {MouthShape} [mouth]
 * @property {number} [bodyW] @property {number} [bodyH] @property {number} [headW]
 * @property {number} [earSize] @property {number} [tailLen]
 * @property {Record<string, Accessory[]>} [tiers]
 * @property {Record<string, ActionDef>} [actions]
 */

/**
 * @typedef {Object} ExprDef
 * @property {EyeStyle} [eye] @property {number} [lid] @property {number} [lidTilt]
 * @property {number} [pupil] @property {number} [eyeScale]
 * @property {'angry'|'sad'|'up'|'grumpy'|'smug'} [brow]
 * @property {MouthShape} [mouth] @property {number} [ears] @property {number} [puff]
 * @property {number} [blush] @property {number} [bounce] @property {number} [sway]
 * @property {number} [wag] @property {number} [breath]
 */

/** @type {Expression[]} */
export const EXPRESSIONS = ['idle', 'happy', 'focused', 'smug', 'startled', 'wet', 'sad', 'sleepy', 'vibing', 'celebrate'];

export const EXPRESSION_LABELS = {
  idle: '😺 Idle',
  happy: '😸 Happy',
  focused: '😼 Focused',
  smug: '😏 Smug',
  startled: '🙀 Startled',
  wet: '💧 Wet & grumpy',
  sad: '😿 Sad (despair)',
  sleepy: '💤 Sleepy',
  vibing: '🌀 Vibing',
  celebrate: '🎉 Celebrate',
};

/** @type {Record<Expression, ExprDef>} */
const EXPR = {
  idle: {},
  happy: { eye: 'happy', mouth: 'smile', blush: 1.5, bounce: 0.5, wag: 1.6 },
  focused: { lid: 0.34, lidTilt: -0.35, brow: 'angry', mouth: 'flat', ears: 0.25 },
  smug: { lid: 0.5, lidTilt: 0.05, brow: 'smug', mouth: 'smirk', wag: 0.7 },
  startled: { pupil: 0.42, eyeScale: 1.12, brow: 'up', mouth: 'o', puff: 1, ears: -0.15, wag: 0.2 },
  wet: { lid: 0.46, lidTilt: 0.15, brow: 'grumpy', mouth: 'flat', ears: 1, wag: 0.3 },
  sad: { lid: 0.32, lidTilt: 0.4, brow: 'sad', mouth: 'frown', ears: 0.75, wag: 0.25 },
  sleepy: { eye: 'closed', mouth: 'w', ears: 0.3, breath: 1.7, wag: 0.3 },
  vibing: { eye: 'spiral', mouth: 'smile', blush: 1.7, sway: 1, wag: 2 },
  celebrate: { eye: 'sparkle', mouth: 'open', blush: 1.6, bounce: 1, wag: 2.2, ears: -0.1 },
};

export class CatRig {
  /** @param {CatSpec} spec @param {number} [seed] */
  constructor(spec, seed = 1) {
    this.spec = spec;
    this.rng = mulberry32(seed);
    this.blink = new Blink(this.rng);
    this.earL = new Twitch(this.rng, 3, 9);
    this.earR = new Twitch(this.rng, 3, 9);
    this.look = new LookAt(this.rng);
    this.squash = new Spring(260, 11);
    this.tilt = new Spring(60, 10);
    this.ears = new Spring(120, 14);
    this.puff = new Spring(80, 12);
    /** @type {Expression} */
    this.expr = 'idle';
    this.exprT = 0;
    this.tier = 'T1';
    /** Extra accessories worn on top of the tier look (e.g. a Wardrobe hat). @type {Accessory[]} */
    this.extra = [];
    this.time = 0;
    /** @type {ActionDef|null} */
    this.action = null;
    this.actionT = 0;
    /** Per-frame overrides written by actions. @type {{eye?:EyeStyle, mouth?:MouthShape, lid?:number, squash?:number, tilt?:number, lean?:number}} */
    this.ov = {};
    /** @type {{t:number, life:number, update?:(f:any, dt:number)=>void, draw:(f:any, g:Geo)=>void, [k:string]:any}[]} */
    this.fx = [];
    this.idleT = 0;
    this.yawnT = -1;
    /** @type {Pen|null} */
    this.pen = null;
  }

  /** @param {Expression} e */
  setExpression(e) {
    if (e === this.expr) return;
    this.expr = e;
    this.exprT = 0;
    this.idleT = 0;
    this.yawnT = -1;
    this.squash.kick(e === 'startled' ? -3.6 : 1.8);
  }

  poke() {
    this.squash.kick(3.6);
    this.idleT = 0;
    this.yawnT = -1;
  }

  /** @param {string} name */
  play(name) {
    const a = this.spec.actions?.[name];
    if (!a) return;
    this.action = a;
    this.actionT = 0;
    this.idleT = 0;
    this.yawnT = -1;
  }

  /** Floating comic text in rig-local coordinates. @param {string} text @param {number} x @param {number} y @param {number} [size] */
  say(text, x, y, size = 22) {
    this.fx.push({
      t: 0,
      life: 0.9,
      x,
      y,
      draw: (f, g) => {
        const k = f.t / f.life;
        fxText(g.ctx, text, f.x, f.y - k * 26, size * (k < 0.15 ? 0.6 + k * 2.7 : 1), INK, k > 0.7 ? (1 - k) / 0.3 : 1);
      },
    });
  }

  /** @param {number} dt @param {{x:number,y:number}|null} lookDir */
  update(dt, lookDir) {
    this.time += dt;
    this.exprT += dt;
    this.idleT += dt;
    this.ov = {};
    const E = EXPR[this.expr];
    this.blink.update(dt);
    this.earL.update(dt);
    this.earR.update(dt);
    this.look.update(dt, E.eye === 'spiral' ? null : lookDir);
    this.ears.target = E.ears ?? 0;
    this.ears.step(dt);
    this.puff.target = E.puff ?? 0;
    this.puff.step(dt);
    this.squash.step(dt);
    this.tilt.target = this.look.x.x * 0.07;
    this.tilt.step(dt);
    if (this.action) {
      this.actionT += dt;
      this.action.update(this, this.actionT, dt);
      if (this.actionT >= this.action.duration) this.action = null;
    }
    if (this.expr === 'idle' && !this.action && this.idleT > 10) {
      this.yawnT = 0;
      this.idleT = -2;
    }
    if (this.yawnT >= 0) {
      this.yawnT += dt;
      if (this.yawnT > 1.7) this.yawnT = -1;
    }
    for (const f of this.fx) {
      f.t += dt;
      f.update?.(f, dt);
    }
    this.fx = this.fx.filter((f) => f.t < f.life);
  }

  /**
   * Draw with origin at the cat's feet (ground center). Character is ~250 units tall.
   * @param {CanvasRenderingContext2D} ctx @param {number} scale on-screen px per unit
   * @param {{reducedMotion?:boolean}} [o]
   */
  draw(ctx, scale, o = {}) {
    const S = this.spec;
    const E = EXPR[this.expr];
    const ov = this.ov;
    const t = this.time;
    const pen = this.pen ?? (this.pen = new Pen(ctx));
    pen.ctx = ctx;
    const inkPx = 1.5 + 1.7 * Math.min(1, scale);
    pen.begin(t, { boil: !o.reducedMotion, width: inkPx / scale, amp: 0.8 / scale });
    pen.ink = S.outline ?? INK;
    const lw = pen.width;

    const bodyW = S.bodyW ?? 1;
    const bodyH = S.bodyH ?? 1;
    const headW = S.headW ?? 1;
    const yawning = this.yawnT >= 0;
    const yawnK = yawning ? Math.sin(clamp(this.yawnT / 1.7, 0, 1) * Math.PI) : 0;

    const breathRate = E.breath ?? 1;
    const breath = Math.sin((t * 2 * Math.PI) / (3.2 * breathRate)) * breathRate + yawnK * 1.5;
    let hop = 0;
    if (E.bounce) hop = -Math.abs(Math.sin(t * (this.expr === 'celebrate' ? 8 : 5))) * 13 * E.bounce;
    if (this.expr === 'startled') hop -= Math.max(0, 1 - this.exprT * 3.5) * 24;
    if (o.reducedMotion) hop *= 0.3;
    const sway = (E.sway ? Math.sin(t * 3.2) * 0.09 : 0) + (ov.lean ?? 0);
    const sq = clamp(this.squash.x + (ov.squash ?? 0), -0.3, 0.3);
    const p = this.puff.x;
    const wag = E.wag ?? 1;

    /** @type {Geo} */
    const g = { pen, ctx, S, hy: 0, brx: 60 * bodyW, bry: 54 * bodyH, hrx: 76 * headW, lw, t, rig: this };

    // Ground: puddle (wet) and contact shadow.
    if (this.expr === 'wet') {
      ctx.fillStyle = 'rgba(159,211,234,0.55)';
      ctx.beginPath();
      ctx.ellipse(6, 3, 92 * bodyW, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(59,58,74,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 72 * bodyW * (1 + hop / 160), 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hop);
    ctx.rotate(sway);
    ctx.scale(1 + sq, 1 - sq);

    const tierAccs = S.tiers?.[this.tier] ?? [];
    const wardrobeHat = this.extra.some((a) => a.hat);
    const accs = [...(wardrobeHat ? tierAccs.filter((a) => !a.hat) : tierAccs), ...this.extra];
    const layer = (/** @type {Accessory['layer']} */ name) => {
      for (const a of accs) if (a.layer === name) a.draw(g);
    };

    // Body geometry.
    const bk = 1 + breath * 0.018;
    const brx = g.brx;
    const bry = g.bry * bk;
    const bcy = -bry;
    const hy = -128 * bodyH + breath * 1.6 + yawnK * -4;
    g.hy = hy;
    g.bry = bry;

    layer('side');

    // Tail (behind body).
    {
      const pts = [];
      let x = brx * 0.62;
      let y = -16;
      let ang = this.expr === 'startled' ? -0.9 : 0.12;
      const len = 19 * (S.tailLen ?? 1);
      pts.push({ x, y });
      for (let i = 0; i < 6; i++) {
        ang += -0.33 + Math.sin(t * 1.7 * wag - i * 0.6) * 0.17 * Math.min(1.4, wag);
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len;
        pts.push({ x, y });
      }
      const tw = 19 * (S.tailWidth ?? 1) * (1 + p * 0.75 + (S.fluff ?? 0) * 0.35);
      const w = pen.tube(pts, tw, S.tailColor ?? S.fur);
      if (S.tailTip) {
        const tip = w.slice(-3);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tip[0].x, tip[0].y);
        for (const q of tip.slice(1)) ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = S.tailTip;
        ctx.lineWidth = tw;
        ctx.stroke();
      }
      if (S.pattern === 'tabby') {
        for (const i of [2, 4, 6]) {
          const a = w[i];
          const b = w[i - 1];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const l = Math.hypot(dx, dy) || 1;
          const nx = (-dy / l) * tw * 0.45;
          const ny = (dx / l) * tw * 0.45;
          pen.line([{ x: a.x - nx, y: a.y - ny }, { x: a.x + nx, y: a.y + ny }], { color: S.stripe, width: lw * 1.8, amp: 0 });
        }
      }
    }

    // Body.
    const fluff = S.fluff ?? 0;
    const spiky = (/** @type {number} */ base, /** @type {number} */ i) => base + (p * 0.07 + fluff * 0.045) * (i % 2 ? 1 : -0.45);
    const bodyPts = ellipsePts(0, bcy, brx, bry, fluff ? 40 : 32, (a, i) => spiky(1 + 0.1 * Math.sin(a), i));
    const bw = pen.blob(bodyPts, soft(ctx, 0, bcy, brx, S.light, S.fur, S.shade));
    ctx.save();
    ctx.beginPath();
    traceClosed(ctx, bw);
    ctx.clip();
    const belly = S.belly === undefined ? S.cream : S.belly;
    if (belly) {
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(0, bcy + bry * 0.25, brx * 0.48, bry * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    S.bodyPattern?.(g, { bcy, brx, bry });
    if (S.pattern === 'tabby') {
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const y0 = bcy - bry * 0.35 + k * bry * 0.32;
          pen.line(
            [
              { x: s * brx * 1.02, y: y0 },
              { x: s * brx * 0.8, y: y0 + 4 },
              { x: s * brx * 0.62, y: y0 + 2 },
            ],
            { color: S.stripe, width: lw * 2.2, amp: 0 },
          );
        }
      }
    }
    ctx.restore();
    ctx.beginPath();
    traceClosed(ctx, bw);
    ctx.lineWidth = lw;
    ctx.strokeStyle = pen.ink;
    ctx.stroke();

    layer('body');

    // Haunches + front paws.
    for (const s of [-1, 1]) {
      pen.blob(ellipsePts(s * brx * 0.74, -15, 24 * bodyW, 16, 18), soft(ctx, s * brx * 0.74, -15, 24, S.light, S.fur, S.shade));
    }
    for (const s of [-1, 1]) {
      const px = s * 17;
      pen.blob(ellipsePts(px, -8, 15, 10.5, 16), S.paw ?? S.cream);
      for (const d of [-4.5, 4.5]) pen.line([{ x: px + d, y: -12 }, { x: px + d, y: -4 }], { width: lw * 0.7, amp: 0 });
    }

    layer('neck');

    // Head group (tilts around the neck).
    ctx.save();
    const neckY = hy + 50;
    ctx.translate(0, neckY);
    ctx.rotate(this.tilt.x + sway * 0.4 + (ov.tilt ?? 0));
    ctx.translate(0, -neckY);
    this.#drawHead(g, E, ov, { lw, p, yawnK, yawning });
    layer('head');
    ctx.restore();

    this.#drawExpressionFx(g, E);
    for (const f of this.fx) f.draw(f, g);
    ctx.restore();
  }

  /**
   * @param {Geo} g @param {ExprDef} E @param {CatRig['ov']} ov
   * @param {{lw:number, p:number, yawnK:number, yawning:boolean}} k
   */
  #drawHead(g, E, ov, k) {
    const { pen, ctx, S, hy } = g;
    const { lw, p } = k;
    const t = this.time;
    const hrx = g.hrx;
    const hry = 58;

    // Ears.
    const earSize = S.earSize ?? 1;
    for (const s of [-1, 1]) {
      const twitch = s < 0 ? this.earL.value : this.earR.value;
      const inner = { x: s * 18, y: hy - 44 };
      const outer = { x: s * 72, y: hy - 20 };
      const tip = { x: s * 58, y: hy - 46 - 50 * earSize };
      const pv = { x: (inner.x + outer.x) / 2, y: (inner.y + outer.y) / 2 };
      const lerpP = (/** @type {Pt} */ a, /** @type {Pt} */ b, /** @type {number} */ u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
      let pts = [inner, lerpP(inner, tip, 0.82), tip, lerpP(outer, tip, 0.82), outer, { x: pv.x, y: pv.y + 14 }];
      pts = rotatePts(pts, pv.x, pv.y, s * (0.85 * this.ears.x + 0.3 * twitch));
      pen.blob(pts, S.earFur ?? soft(ctx, pv.x, pv.y - 20, 40, S.light, S.fur, S.shade));
      const tip2 = pts[2];
      const innerPts = scalePts(pts, pv.x + (tip2.x - pv.x) * 0.15, pv.y + (tip2.y - pv.y) * 0.15, 0.58);
      pen.blob(innerPts, S.innerEar, { stroke: false });
      const fb = { x: (innerPts[0].x + innerPts[4].x) / 2, y: (innerPts[0].y + innerPts[4].y) / 2 };
      pen.line([fb, { x: fb.x + (tip2.x - fb.x) * 0.35, y: fb.y + (tip2.y - fb.y) * 0.35 }], { color: S.muzzle ?? S.cream, width: lw * 1.1 });
    }

    // Head.
    const fluff = S.fluff ?? 0;
    const headShape = (/** @type {number} */ a, /** @type {number} */ i) => {
      const sn = Math.sin(a);
      const cs = Math.cos(a);
      let m = 1 + 0.06 * cs * cs;
      if (sn < 0) m -= 0.07 * sn * sn;
      const d = Math.min(Math.abs(a - 0.45), Math.abs(a - (Math.PI - 0.45)));
      m += 0.075 * Math.exp((-d * d) / 0.03);
      if (d < 0.32) m += i % 2 ? 0.035 : -0.012;
      return m + (p * 0.05 + fluff * 0.03) * (i % 2 ? 1 : -0.4);
    };
    const headPts = ellipsePts(0, hy, hrx, hry, fluff ? 48 : 40, headShape);
    const hw = pen.blob(headPts, soft(ctx, 0, hy, hrx, S.light, S.fur, S.shade));

    ctx.save();
    ctx.beginPath();
    traceClosed(ctx, hw);
    ctx.clip();
    if (S.pattern === 'tabby') {
      for (const x of [-13, 0, 13]) {
        const top = hy - hry - 4;
        pen.line([{ x, y: top }, { x: x * 0.9, y: top + (x === 0 ? 24 : 17) }], { color: S.stripe, width: lw * 2.1, amp: 0 });
      }
      for (const s of [-1, 1]) {
        for (const dy of [4, 15]) {
          pen.line([{ x: s * hrx * 1.1, y: hy + dy }, { x: s * hrx * 0.78, y: hy + dy + 2 }], { color: S.stripe, width: lw * 2, amp: 0 });
        }
      }
    }
    S.headPattern?.(g, { hrx, hry });
    ctx.fillStyle = S.muzzle ?? S.cream;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 11, hy + 24, 17, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, hy + 36, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const blushK = E.blush ?? 1;
    for (const s of [-1, 1]) {
      const bx = s * 50;
      const by = hy + 20;
      const gr = ctx.createRadialGradient(bx, by, 1, bx, by, 15);
      gr.addColorStop(0, `rgba(244,140,160,${0.55 * blushK})`);
      gr.addColorStop(1, 'rgba(244,140,160,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(bx, by, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    traceClosed(ctx, hw);
    ctx.lineWidth = lw;
    ctx.strokeStyle = pen.ink;
    ctx.stroke();

    // Eyes.
    let eyeStyle = ov.eye ?? E.eye ?? 'open';
    if (k.yawning && k.yawnK > 0.25) eyeStyle = 'closed';
    const lid = Math.max(this.blink.value, ov.lid ?? E.lid ?? 0);
    for (const s of [-1, 1]) this.#drawEye(g, s, eyeStyle, lid, E);

    // Brows.
    const browKind = E.brow ?? S.brow;
    if (browKind) {
      for (const s of [-1, 1]) {
        const cx = s * 31;
        const top = hy - 24;
        const inner = cx - s * 11;
        const outer = cx + s * 13;
        /** @type {Pt[]} */
        let pts;
        switch (browKind) {
          case 'angry':
            pts = [{ x: inner, y: top + 4 }, { x: outer, y: top - 6 }];
            break;
          case 'sad':
            pts = [{ x: inner, y: top - 7 }, { x: outer, y: top + 2 }];
            break;
          case 'up':
            pts = [{ x: inner, y: top - 6 }, { x: cx, y: top - 12 }, { x: outer, y: top - 6 }];
            break;
          case 'grumpy':
            pts = [{ x: inner, y: top + 3 }, { x: outer, y: top + 1 }];
            break;
          default:
            pts = s > 0 ? [{ x: inner, y: top - 6 }, { x: cx, y: top - 13 }, { x: outer, y: top - 7 }] : [{ x: inner, y: top + 1 }, { x: outer, y: top }];
        }
        pen.line(pts, { width: lw * 1.3 });
      }
    }

    // Nose + mouth.
    const ny = hy + 15;
    pen.blob(
      [
        { x: -6, y: ny - 3.5 },
        { x: 6, y: ny - 3.5 },
        { x: 0, y: ny + 3.5 },
      ],
      S.nose ?? NOSE,
      { width: lw * 0.8, amp: 0 },
    );
    const mouth = ov.mouth ?? (k.yawning && k.yawnK > 0.2 ? 'yawn' : E.mouth ?? S.mouth ?? 'w');
    this.#drawMouth(g, mouth, ny + 4, k.yawnK);

    // Whiskers.
    const jig = Math.sin(t * 2.3) * 0.04 + (this.earR.value - this.earL.value) * 0.05;
    for (const s of [-1, 1]) {
      for (const a of [-0.2, 0, 0.2]) {
        const ang = a + jig * s + (E.ears ? E.ears * 0.12 : 0);
        const x0 = s * 26;
        const y0 = hy + 22 + a * 10;
        const len = 38;
        pen.line(
          [
            { x: x0, y: y0 },
            { x: x0 + s * Math.cos(ang) * len * 0.6, y: y0 + Math.sin(ang) * len * 0.6 - 1 },
            { x: x0 + s * Math.cos(ang) * len, y: y0 + Math.sin(ang) * len + 1.5 },
          ],
          { width: lw * 0.55, alpha: 0.65, color: S.whisker },
        );
      }
    }
  }

  /**
   * @param {Geo} g @param {number} s side (-1 left, 1 right) @param {EyeStyle} style
   * @param {number} lid 0 open … 1 closed @param {ExprDef} E
   */
  #drawEye(g, s, style, lid, E) {
    const { pen, ctx, S, hy, lw } = g;
    const t = this.time;
    const es = E.eyeScale ?? 1;
    const cx = s * 31;
    const cy = hy + 1;
    const rx = 16.5 * es;
    const ry = 19.5 * es;

    if (style === 'happy') {
      pen.line([{ x: cx - rx * 0.9, y: cy + 5 }, { x: cx, y: cy - 9 }, { x: cx + rx * 0.9, y: cy + 5 }], { width: lw * 1.6 });
      return;
    }
    if (style === 'closed' || (style !== 'xx' && lid > 0.9)) {
      pen.line([{ x: cx - rx, y: cy - 1 }, { x: cx, y: cy + 7 }, { x: cx + rx, y: cy - 1 }], { width: lw * 1.5 });
      return;
    }
    if (style === 'xx') {
      const tipX = cx - s * rx * 0.55;
      const endX = cx + s * rx * 0.75;
      pen.line([{ x: endX, y: cy - 10 }, { x: tipX, y: cy }, { x: endX, y: cy + 10 }], { width: lw * 1.6, amp: 0 });
      return;
    }

    const w = pen.wob(ellipsePts(cx, cy, rx, ry, 22), pen.amp * 0.4);
    ctx.save();
    ctx.beginPath();
    traceClosed(ctx, w);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.clip();

    const lx = this.look.x.x;
    const ly = this.look.y.x;
    const ix = cx + lx * 5.5;
    const iy = cy + ly * 5 + 2;
    const ir = 13.5 * es;

    if (style === 'spiral') {
      ctx.fillStyle = '#E9DDFB';
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.beginPath();
      const rot = t * 5 * s;
      for (let a = 0; a < Math.PI * 6; a += 0.2) {
        const r = 1 + a * 1.6;
        const x = cx + Math.cos(a + rot) * r;
        const y = cy + Math.sin(a + rot) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#7A5BC7';
      ctx.lineWidth = lw * 1.1;
      ctx.stroke();
    } else {
      const gr = ctx.createLinearGradient(ix, iy - ir, ix, iy + ir);
      gr.addColorStop(0, S.eyeDark);
      gr.addColorStop(0.6, S.eye);
      gr.addColorStop(1, S.eyeLight ?? S.eye);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = S.eyeDark;
      ctx.lineWidth = lw * 0.8;
      ctx.stroke();
      const pk = (E.pupil ?? 1) * (this.spec.pupil ?? 1);
      ctx.fillStyle = '#2B2633';
      ctx.beginPath();
      ctx.ellipse(ix, iy, 6.5 * pk * es, 9 * pk * es, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WHITE;
      if (style === 'sparkle') {
        star(ctx, ix - 3, iy - 4, 8.5, 0.32, t * 2);
        star(ctx, ix + 6, iy + 6, 4, 0.35, -t * 2);
      } else {
        ctx.beginPath();
        ctx.arc(ix - 5, iy - 6, 4.8 * es, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ix + 5, iy + 5, 2.3 * es, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (lid > 0.01) {
      const tilt = E.lidTilt ?? 0;
      const top = cy - ry - 3;
      const H = ry * 2 + 6;
      const inner = cx - s * (rx + 2);
      const outer = cx + s * (rx + 2);
      const yIn = top + H * clamp(lid - tilt * 0.5, 0, 1);
      const yOut = top + H * clamp(lid + tilt * 0.5, 0, 1);
      ctx.fillStyle = S.lidColor ?? S.fur;
      ctx.beginPath();
      ctx.moveTo(inner, top - 4);
      ctx.lineTo(outer, top - 4);
      ctx.lineTo(outer, yOut);
      ctx.quadraticCurveTo(cx, (yIn + yOut) / 2 + 2, inner, yIn);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(inner, yIn);
      ctx.quadraticCurveTo(cx, (yIn + yOut) / 2 + 2, outer, yOut);
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    traceClosed(ctx, w);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.05;
    ctx.stroke();
    // Thicker upper lash line.
    const lash = w.slice(13, 22);
    if (lid < 0.3 && lash.length > 2) pen.line(lash, { width: lw * 1.9, amp: 0 });
  }

  /** @param {Geo} g @param {MouthShape} m @param {number} my @param {number} yawnK */
  #drawMouth(g, m, my, yawnK) {
    const { pen, ctx, lw } = g;
    const W = (/** @type {number} */ o = 0) => {
      pen.line([{ x: 0, y: my - 4 }, { x: 0, y: my + o }], { width: lw * 0.9 });
      pen.line([{ x: -10, y: my - 1 + o }, { x: -5, y: my + 4 + o }, { x: 0, y: my + o }], { width: lw * 0.95 });
      pen.line([{ x: 0, y: my + o }, { x: 5, y: my + 4 + o }, { x: 10, y: my - 1 + o }], { width: lw * 0.95 });
    };
    const open = (/** @type {number} */ wdt, /** @type {number} */ hgt) => {
      ctx.beginPath();
      ctx.moveTo(-wdt, my);
      ctx.quadraticCurveTo(0, my + hgt * 2, wdt, my);
      ctx.closePath();
      ctx.fillStyle = MOUTH_DARK;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = TONGUE;
      ctx.beginPath();
      ctx.ellipse(0, my + hgt * 1.15, wdt * 0.6, hgt * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-wdt, my);
      ctx.quadraticCurveTo(0, my + hgt * 2, wdt, my);
      ctx.closePath();
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.95;
      ctx.stroke();
    };
    switch (m) {
      case 'blep':
        pen.blob(ellipsePts(2.5, my + 6.5, 4.6, 5.8, 12), TONGUE, { width: lw * 0.8, amp: 0 });
        W();
        break;
      case 'smile':
        pen.line([{ x: 0, y: my - 4 }, { x: 0, y: my }], { width: lw * 0.9 });
        open(11, 6);
        break;
      case 'open':
        open(14, 9);
        break;
      case 'o': {
        ctx.fillStyle = MOUTH_DARK;
        ctx.beginPath();
        ctx.ellipse(0, my + 6, 6, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.95;
        ctx.stroke();
        break;
      }
      case 'yawn': {
        const k = 0.3 + yawnK * 0.7;
        ctx.fillStyle = MOUTH_DARK;
        ctx.beginPath();
        ctx.ellipse(0, my + 9 * k, 11 * k, 14 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = TONGUE;
        ctx.beginPath();
        ctx.ellipse(0, my + 17 * k, 7 * k, 5 * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = WHITE;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 7 * k, my - 2 * k);
          ctx.lineTo(s * 4 * k, my + 6 * k);
          ctx.lineTo(s * 1.5 * k, my - 1 * k);
          ctx.fill();
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.95;
        ctx.beginPath();
        ctx.ellipse(0, my + 9 * k, 11 * k, 14 * k, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'flat':
        pen.line([{ x: 0, y: my - 4 }, { x: 0, y: my + 1 }], { width: lw * 0.9 });
        pen.line([{ x: -9, y: my + 3 }, { x: 0, y: my + 1.5 }, { x: 9, y: my + 3 }], { width: lw * 0.95 });
        break;
      case 'frown':
        pen.line([{ x: 0, y: my - 4 }, { x: 0, y: my + 1 }], { width: lw * 0.9 });
        pen.line([{ x: -9, y: my + 7 }, { x: 0, y: my + 1 }, { x: 9, y: my + 7 }], { width: lw * 0.95 });
        break;
      case 'smirk':
        pen.line([{ x: 0, y: my - 4 }, { x: 0, y: my }], { width: lw * 0.9 });
        pen.line([{ x: -9, y: my + 2 }, { x: 3, y: my + 4 }, { x: 12, y: my - 3 }], { width: lw * 0.95 });
        break;
      case 'hiss': {
        open(13, 8);
        ctx.fillStyle = WHITE;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 9, my + 0.5);
          ctx.lineTo(s * 6, my + 8);
          ctx.lineTo(s * 3.5, my + 1);
          ctx.fill();
        }
        break;
      }
      default:
        W();
    }
  }

  /** @param {Geo} g @param {ExprDef} E */
  #drawExpressionFx(g, E) {
    const { ctx, pen, hy, lw } = g;
    const t = this.time;
    const e = this.expr;
    if (e === 'startled') {
      const a = clamp(1 - (this.exprT - 0.6) * 2, 0, 1);
      if (a > 0) {
        fxText(ctx, '!', 70, hy - 92, 44, '#D2483C', a);
        for (const ang of [-2.4, -1.57, -0.74]) {
          const r0 = 98;
          const r1 = 116;
          pen.line(
            [
              { x: Math.cos(ang) * r0, y: hy + Math.sin(ang) * r0 },
              { x: Math.cos(ang) * r1, y: hy + Math.sin(ang) * r1 },
            ],
            { width: lw * 1.4, alpha: a },
          );
        }
      }
    } else if (e === 'sleepy') {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.45 + k / 3) % 1;
        fxText(ctx, 'z', 62 + ph * 42 + Math.sin(ph * 6) * 4, hy - 52 - ph * 70, 14 + ph * 16, '#5B6B9A', Math.sin(ph * Math.PI));
      }
      const r = 3 + 7 * (0.5 + 0.5 * Math.sin(t * 1.4));
      ctx.save();
      ctx.fillStyle = 'rgba(190,230,255,0.45)';
      ctx.strokeStyle = 'rgba(110,170,210,0.9)';
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.arc(8 + r * 0.6, hy + 20 + r * 0.4, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(8 + r * 0.3, hy + 20, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (e === 'wet') {
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.8 + k * 0.27) % 1;
        const x = [-58, -20, 34, 62][k];
        const y = hy + 30 + ph * (Math.abs(hy) - 30);
        drop(ctx, x, y, 5, Math.sin(ph * Math.PI), lw);
      }
      for (const [x, y] of [[-30, -62], [24, -66], [0, -50]]) drop(ctx, x, hy + y, 3.5, 0.9, lw);
    } else if (e === 'sad') {
      const cy = hy - 112 + Math.sin(t * 1.3) * 3;
      ctx.save();
      ctx.fillStyle = '#B8BCC8';
      pen.blob(ellipsePts(0, cy, 38, 15, 20, (a, i) => 1 + (i % 4 < 2 ? 0.12 : 0)), '#B8BCC8', { width: lw * 0.9 });
      for (let k = 0; k < 4; k++) {
        const ph = (t * 1.6 + k * 0.25) % 1;
        const x = -24 + k * 16;
        pen.line([{ x, y: cy + 16 + ph * 26 }, { x: x - 2, y: cy + 24 + ph * 26 }], { color: '#7FA3C4', width: lw, alpha: 1 - ph, amp: 0 });
      }
      ctx.restore();
      const tph = (t * 0.6) % 1;
      drop(ctx, -40, hy + 18 + tph * 22, 4.5, Math.sin(tph * Math.PI), lw);
    } else if (e === 'vibing') {
      for (let k = 0; k < 3; k++) {
        const a = t * 1.3 + (k * Math.PI * 2) / 3;
        fxText(ctx, k % 2 ? '♫' : '♪', Math.cos(a) * 105, hy - 20 + Math.sin(a) * 50, 26, '#7A5BC7', 0.9);
      }
    } else if (e === 'celebrate') {
      const cols = ['#F4A6B7', '#F2C14E', '#8DBF6A', '#9FD3EA', '#C9B6F2'];
      for (let k = 0; k < 16; k++) {
        const ph = (t * 0.5 + hash2(k, 7)) % 1;
        const x = (hash2(k, 3) - 0.5) * 260;
        const y = hy - 140 + ph * 260;
        ctx.save();
        ctx.translate(x + Math.sin(t * 3 + k) * 8, y);
        ctx.rotate(t * 4 + k);
        ctx.fillStyle = cols[k % cols.length];
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }
    } else if (e === 'happy') {
      const ph = (t * 0.55) % 1;
      heart(ctx, 78 + Math.sin(ph * 8) * 5, hy - 50 - ph * 50, 9 + ph * 4, Math.sin(ph * Math.PI), lw);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} alpha @param {number} lw */
function drop(ctx, x, y, r, alpha, lw) {
  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.quadraticCurveTo(x + r, y - r * 0.2, x + r, y + r * 0.3);
  ctx.arc(x, y + r * 0.3, r, 0, Math.PI);
  ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.8);
  ctx.fillStyle = WATER;
  ctx.fill();
  ctx.strokeStyle = '#5E93B3';
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} alpha @param {number} lw */
function heart(ctx, x, y, r, alpha, lw) {
  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.4, x, y - r * 0.5);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fillStyle = '#F48CA0';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  ctx.restore();
}

/** 4-point sparkle. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {number} k inner ratio @param {number} rot */
export function star(ctx, x, y, r, k, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 ? r * k : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
