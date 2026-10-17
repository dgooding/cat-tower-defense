// @ts-check
// Storybook player: one canvas, painted panels composed from the real rigs and rooms,
// a typewriter narrator caption, and Next / Back / Skip (→ Space Enter / ← / Esc).
import { h, canvas as mkCanvas, tape } from '../dom.js';
import { makeView, isCalm } from '../stage.js';
import { setSeen } from '../store.js';
import { takeAfterStory, clickMeow } from '../ui.js';
import { SEQUENCES } from '../story/script.js';
import * as P from '../story/props.js';
import { makeCat, makeEnemy, catArt, enemyArt } from '../rigs.js';
import { ROOM_ART } from '../../art/registry.js';
import { Pen } from '../../art/brush.js';

/** @typedef {import('../story/script.js').Panel} Panel */
/** @typedef {import('../story/script.js').Actor} Actor */

const SW = 1600;
const SH = 900;

/** @param {string[]} params */
export function guard(params) {
  return SEQUENCES[params[0]] ? null : '#/map';
}

/** @type {Map<string, HTMLCanvasElement>} */
const bgCache = new Map();
/** Paint a room's scenery once (static, no boil) into a 1600×900 bitmap. @param {string} roomId @param {number} light @param {number} layout */
function roomBitmap(roomId, light, layout) {
  const key = `${roomId}|${light}|${layout}`;
  const hit = bgCache.get(key);
  if (hit) return hit;
  const art = ROOM_ART[roomId];
  if (!art) return null;
  const c = document.createElement('canvas');
  c.width = SW;
  c.height = SH;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  ctx.scale(SW / 1920, SH / 1080);
  const pen = new Pen(ctx);
  pen.begin(0, { boil: false, width: 3, amp: 1 });
  try {
    const L = art.room.layouts[layout] ?? art.room.layouts[0];
    art.room.drawBack(ctx, pen, 0, { light, reducedMotion: true, layout: L });
  } catch (err) {
    console.error('[story] room failed', roomId, err);
  }
  bgCache.set(key, c);
  return c;
}

const ease = (/** @type {number} */ k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const easeIO = (/** @type {number} */ k) => {
  k = Math.min(1, Math.max(0, k));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};

/**
 * @typedef {Object} Live
 * @property {Actor} a @property {any} rig @property {boolean} cat
 * @property {Set<number>} fired indices of exprAt/doAt events already fired
 */

/** @param {Panel} panel @param {number} seed @returns {Live[]} */
function buildActors(panel, seed) {
  /** @type {Live[]} */
  const out = [];
  (panel.actors ?? []).forEach((a, i) => {
    try {
      if (a.cat && catArt(a.cat)) {
        const rig = makeCat(a.cat, seed + i);
        if (a.expr) rig.setExpression(/** @type {any} */ (a.expr));
        out.push({ a, rig, cat: true, fired: new Set() });
      } else if (a.enemy && enemyArt(a.enemy)) {
        const rig = makeEnemy(a.enemy, seed + i);
        rig.setMode(a.mode ?? 'idle');
        if (a.phase) rig.st.phase = a.phase;
        out.push({ a, rig, cat: false, fired: new Set() });
      }
    } catch (err) {
      console.error('[story] actor failed', a, err);
    }
  });
  return out;
}

/** @param {string[]} params */
export function render(params) {
  const seq = SEQUENCES[params[0]];
  const startAt = Math.max(0, Math.min(seq.panels.length - 1, (Number(params[1]) || 1) - 1));
  setSeen(`story:${seq.id}`);
  const then = takeAfterStory() || seq.then;

  const cv = mkCanvas({ class: 'story-canvas', role: 'img', 'aria-label': `${seq.title}, illustrated panel` });
  const typed = h('p', { class: 'caption-text', 'aria-hidden': 'true' });
  const sr = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const dots = h('div', { class: 'story-dots', 'aria-hidden': 'true' }, seq.panels.map(() => h('span', { class: 'dot' })));
  const counter = h('span', { class: 'story-count' });
  const backBtn = h('button', { class: 'btn small', type: 'button', text: '← Back' });
  const skipBtn = h('button', { class: 'btn small ghost', type: 'button', text: 'Skip (Esc)' });
  const nextBtn = h('button', { class: 'btn primary', type: 'button', text: 'Next →' });

  const el = h('section', { class: 'story', 'aria-label': `Storybook: ${seq.title}` }, [
    h('p', { class: 'story-title', text: `📖 ${seq.title}` }),
    h('div', { class: 'story-frame' }, [tape('peach', 'tl'), tape('lilac', 'tr'), cv]),
    h('div', { class: 'story-caption' }, [
      h('span', { class: 'narrator', text: 'The Narrator' }),
      typed,
      sr,
      h('div', { class: 'story-controls' }, [backBtn, dots, counter, skipBtn, nextBtn]),
    ]),
  ]);

  let idx = startAt;
  let T = 0;
  /** @type {Live[]} */
  let live = [];
  let shown = -1;
  let finished = false;

  const panel = () => seq.panels[idx];
  const textStart = () => (isCalm() ? 0 : (panel().textAt ?? 0.35));
  const fullyTyped = () => isCalm() || shown >= panel().text.length;

  function show(i) {
    idx = i;
    T = 0;
    shown = -1;
    live = buildActors(panel(), 11 + i * 7);
    typed.textContent = '';
    sr.textContent = panel().text;
    counter.textContent = `${idx + 1} / ${seq.panels.length}`;
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j <= idx));
    backBtn.toggleAttribute('disabled', idx === 0);
    nextBtn.textContent = idx === seq.panels.length - 1 ? (then === '#/credits' ? 'Roll credits →' : then === '#/map' ? 'To the map →' : 'The end →') : 'Next →';
  }

  function next() {
    if (!fullyTyped()) {
      shown = panel().text.length;
      typed.textContent = panel().text;
      T = Math.max(T, textStart() + 0.01);
      return;
    }
    if (idx < seq.panels.length - 1) show(idx + 1);
    else finish();
  }
  function back() {
    if (idx > 0) show(idx - 1);
  }
  function finish() {
    if (finished) return;
    finished = true;
    location.replace(`${location.pathname}${location.search}${then}`);
  }

  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);
  skipBtn.addEventListener('click', finish);
  cv.addEventListener('click', () => {
    clickMeow(1.1);
    next();
  });

  /** @param {KeyboardEvent} e */
  const onKey = (e) => {
    const onButton = /** @type {HTMLElement} */ (e.target)?.tagName === 'BUTTON' || /** @type {HTMLElement} */ (e.target)?.tagName === 'A';
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    } else if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !onButton)) {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      back();
    }
  };
  document.addEventListener('keydown', onKey);

  show(startAt);

  return {
    el,
    title: `${seq.title} (storybook)`,
    fullscreen: true,
    cleanup: () => document.removeEventListener('keydown', onKey),
    after: () => {
      nextBtn.focus({ preventScroll: true });
      makeView(cv, (v, dt) => {
        T += dt;
        drawPanel(v, dt);
      });
    },
  };

  /** @param {import('../stage.js').View} v @param {number} dt */
  function drawPanel(v, dt) {
    const p = panel();
    const calm = isCalm();
    // typewriter
    const want = calm ? p.text.length : Math.floor(Math.max(0, T - textStart()) * 42);
    if (want !== shown && shown < p.text.length) {
      shown = Math.min(p.text.length, want);
      typed.textContent = p.text.slice(0, shown);
    }

    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.fillStyle = '#FBF5E9';
    ctx.fillRect(0, 0, v.w, v.h);
    const k = Math.min(v.w / SW, v.h / SH);
    ctx.translate((v.w - SW * k) / 2, (v.h - SH * k) / 2);
    ctx.scale(k, k);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SW, SH);
    ctx.clip();
    const zoom = calm ? 1 : 1 + 0.035 * easeIO(T / 9);
    ctx.translate(SW / 2, SH * 0.55);
    ctx.scale(zoom, zoom);
    ctx.translate(-SW / 2, -SH * 0.55);

    if (p.room) {
      const bg = roomBitmap(p.room, p.light ?? 0.3, p.layout ?? 0);
      if (bg) {
        ctx.globalAlpha = p.bgAlpha ?? 0.62;
        ctx.drawImage(bg, 0, 0, SW, SH);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(251,245,233,0.16)';
      ctx.fillRect(0, 0, SW, SH);
    } else {
      ctx.fillStyle = '#F4EAD6';
      ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = 'rgba(59,58,74,0.05)';
      for (let y = 20; y < SH; y += 34) for (let x = (y / 34) % 2 ? 20 : 37; x < SW; x += 34) ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = 'rgba(59,58,74,0.12)';
      ctx.fillRect(0, 800, SW, 3);
    }
    if (p.wash) P.wash(ctx, p.wash);
    p.under?.(ctx, T, calm);

    const items = live.map((L) => ({ L, y: L.a.y + (L.a.z ?? 0) })).sort((a, b) => a.y - b.y);
    for (const { L } of items) drawActor(ctx, L, dt, k * zoom, calm);

    p.over?.(ctx, T, calm);
    for (const s of p.sfx ?? []) {
      const at = s.at ?? 0;
      if (T < at) continue;
      const pop = calm ? 1 : Math.min(1, (T - at) / 0.18);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot ?? 0);
      ctx.scale(0.4 + 0.6 * pop + (calm ? 0 : Math.max(0, 0.25 - (T - at)) * 1.2), 0.4 + 0.6 * pop);
      P.fxText(ctx, s.text, 0, 0, s.size ?? 48, s.color ?? '#3B3A4A', pop);
      ctx.restore();
    }
    ctx.restore();
    P.vignette(ctx, 0.28);
    // fade in from paper
    if (!calm && T < 0.45) {
      ctx.fillStyle = `rgba(251,245,233,${1 - T / 0.45})`;
      ctx.fillRect(0, 0, SW, SH);
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {Live} L @param {number} dt @param {number} k on-screen px per stage px @param {boolean} calm */
  function drawActor(ctx, L, dt, k, calm) {
    const a = L.a;
    a.exprAt?.forEach(([at, e], i) => {
      if (T >= at && !L.fired.has(i)) {
        L.fired.add(i);
        if (L.cat) L.rig.setExpression(e);
      }
    });
    a.doAt?.forEach(([at, act], i) => {
      if (T >= at && !L.fired.has(100 + i)) {
        L.fired.add(100 + i);
        if (act === 'poke') L.rig.poke?.();
        else if (act === 'hit') L.rig.hit?.();
        else if (act === 'die') L.rig.die?.();
        else L.rig.play?.(act);
      }
    });
    let x = a.x;
    let y = a.y;
    let rot = 0;
    if (a.enter) {
      const e = calm ? 1 : ease((T - (a.enter.delay ?? 0)) / (a.enter.dur ?? 1));
      x += (a.enter.dx ?? 0) * (1 - e);
      y += (a.enter.dy ?? 0) * (1 - e);
    }
    if (a.move) {
      const e = calm ? 0 : easeIO((T - (a.move.delay ?? 0)) / a.move.dur);
      x += a.move.dx * e;
      y += (a.move.dy ?? 0) * e;
    }
    if (a.roll) {
      const e = calm ? 1 : ease((T - (a.roll.delay ?? 0)) / a.roll.dur);
      x += a.roll.dx * (1 - e);
      rot = -(1 - e) * a.roll.turns * Math.PI * 2;
    }
    if (a.move && !L.cat && !calm) {
      const moving = T > (a.move.delay ?? 0) && T < (a.move.delay ?? 0) + a.move.dur;
      if (moving && L.rig.st.mode !== 'walk') L.rig.setMode('walk');
      if (!moving && L.rig.st.mode === 'walk') L.rig.setMode('idle');
    }
    L.rig.update(dt, null);
    if (a.cushion) P.cushion(ctx, x, y + 4, 0.75 * (a.s ?? 1), T, calm);
    ctx.save();
    ctx.globalAlpha = a.alpha ?? 1;
    ctx.translate(x, y - (a.cushion ? 18 * (a.s ?? 1) : 0));
    if (L.cat) {
      const s = (a.s ?? 1) * (L.rig.spec.scale ?? 1);
      ctx.scale(a.flip ? -s : s, s);
      L.rig.draw(ctx, s * k, { reducedMotion: calm });
    } else {
      const H = L.rig.spec.height ?? 180;
      const s = (a.h ?? 180) / H;
      if (rot) {
        ctx.translate(0, -(a.h ?? 180) * 0.45);
        ctx.rotate(rot);
        ctx.translate(0, (a.h ?? 180) * 0.45);
      }
      ctx.scale(s, s);
      L.rig.draw(ctx, s * k, { reducedMotion: calm, flip: !!a.flip });
    }
    ctx.restore();
  }
}
