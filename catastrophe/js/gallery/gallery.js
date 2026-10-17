// @ts-check
// Design Gallery: every character and world, live, straight from the art registry.
import { CatRig, EXPRESSIONS, EXPRESSION_LABELS } from '../art/cats/catrig.js';
import { EnemyRig } from '../art/enemies/enemyrig.js';
import { CAT_ART, KITTEN_ART, ENEMY_ART, BOSS_ART, ROOM_ART, HERO_ART } from '../art/registry.js';
import { drawCushion } from '../art/props.js';
import { Pen } from '../art/brush.js';
import { drawRoom, STAGE_W, STAGE_H } from '../art/rooms/common.js';
import { Track } from '../core/spline.js';
import { meow } from '../audio/meow.js';
import { CATS, KITTENS, ENEMIES, BOSSES, ROOMS } from './concepts.js';
import * as fb from './feedback.js';

const ROUND = 'D1–D3';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** @typedef {import('./concepts.js').Concept} Concept */
/** @typedef {import('../art/registry.js').CatArt} CatArt */
/** @typedef {import('../art/registry.js').EnemyArt} EnemyArt */
/** @typedef {import('../art/registry.js').RoomArt} RoomArt */

// ---------- tiny DOM helper ----------
/**
 * @param {string} tag @param {Record<string, any>} [attrs] @param {(Node|string|null|false|undefined)[]} [kids]
 * @returns {HTMLElement}
 */
function h(tag, attrs = {}, kids = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) el.append(c);
  return el;
}

/** @param {string} id @param {Concept[]} list */
const conceptOf = (id, list) => /** @type {Concept} */ (list.find((c) => c.id === id) ?? { id, name: id, icon: '❓', role: '', look: '', bio: '', quip: '', round: 'D1' });

// ---------- animated canvases ----------
/**
 * @typedef {Object} View
 * @property {HTMLCanvasElement} canvas @property {CanvasRenderingContext2D} ctx
 * @property {number} w @property {number} h @property {number} dpr @property {boolean} visible
 * @property {(v:View, dt:number, t:number) => void} tick
 */
/** @type {View[]} */
const views = [];

/** @param {HTMLCanvasElement} canvas @param {(v:View, dt:number, t:number) => void} tick */
function makeView(canvas, tick) {
  /** @type {View} */
  const v = { canvas, ctx: /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')), w: 1, h: 1, dpr: 1, visible: false, tick };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    v.dpr = Math.min(2, window.devicePixelRatio || 1);
    v.w = Math.max(1, r.width);
    v.h = Math.max(1, r.height);
    canvas.width = Math.round(v.w * v.dpr);
    canvas.height = Math.round(v.h * v.dpr);
  };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((e) => (v.visible = e[0].isIntersecting), { rootMargin: '100px' }).observe(canvas);
  resize();
  views.push(v);
  return v;
}

/** @typedef {'paper'|'meadow'|'night'} Bg */
let catBg = /** @type {Bg} */ ('paper');

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} hgt @param {Bg} bg @param {number} t */
function drawBackground(ctx, w, hgt, bg, t) {
  if (bg === 'paper') {
    ctx.fillStyle = '#FBF5E9';
    ctx.fillRect(0, 0, w, hgt);
    ctx.fillStyle = 'rgba(59,58,74,0.06)';
    for (let y = 12; y < hgt; y += 22) for (let x = (y / 22) % 2 ? 12 : 23; x < w; x += 22) ctx.fillRect(x, y, 2, 2);
    return;
  }
  if (bg === 'meadow') {
    const sky = ctx.createLinearGradient(0, 0, 0, hgt);
    sky.addColorStop(0, '#A9D9EE');
    sky.addColorStop(0.62, '#E4F3F6');
    sky.addColorStop(0.63, '#9CCB73');
    sky.addColorStop(1, '#6FAA55');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hgt);
    ctx.fillStyle = 'rgba(255,248,236,0.95)';
    const cx = ((t * 12) % (w + 240)) - 120;
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [60, 0, 24], [30, 8, 26]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, hgt * 0.2 + dy, r * (hgt / 400), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, hgt);
  sky.addColorStop(0, '#1E2150');
  sky.addColorStop(1, '#4A4590');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, hgt);
  ctx.fillStyle = '#FFF4CF';
  ctx.beginPath();
  ctx.arc(w * 0.82, hgt * 0.2, Math.min(w, hgt) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
    ctx.fillStyle = '#FFE58A';
    ctx.fillRect((i * 97.3) % w, (i * 53.7) % (hgt * 0.7), 2, 2);
  }
  ctx.globalAlpha = 1;
}

// ---------- pointer (eyes follow the cursor) ----------
const pointer = { x: 0, y: 0, last: -99 };
window.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.last = performance.now() / 1000;
});
/** @param {HTMLCanvasElement} canvas @param {number} ox @param {number} oy local css-px point to look from */
function lookFrom(canvas, ox, oy) {
  if (performance.now() / 1000 - pointer.last > 4) return null;
  const r = canvas.getBoundingClientRect();
  let dx = (pointer.x - (r.left + ox)) / 320;
  let dy = (pointer.y - (r.top + oy)) / 320;
  const l = Math.hypot(dx, dy);
  if (l > 1) {
    dx /= l;
    dy /= l;
  }
  return { x: dx, y: dy };
}

let soundOn = false;

// ---------- feedback widget ----------
/** @param {string} id @param {string} [prompt] */
function feedbackBlock(id, prompt = 'Notes (what to change, or what you love)') {
  const e = fb.get(id);
  const approve = h('button', { class: 'fb-btn approve', type: 'button', 'aria-pressed': String(e.status === 'approve'), text: '👍 Approve' });
  const change = h('button', { class: 'fb-btn change', type: 'button', 'aria-pressed': String(e.status === 'change'), text: '✏️ Change' });
  const notes = /** @type {HTMLTextAreaElement} */ (h('textarea', { class: 'fb-notes', rows: 2, placeholder: prompt, 'aria-label': `Notes for ${id}` }));
  notes.value = e.notes;
  const wrap = h('div', { class: 'fb' }, [h('div', { class: 'fb-row' }, [approve, change]), notes]);
  const sync = () => {
    const s = fb.get(id).status;
    approve.setAttribute('aria-pressed', String(s === 'approve'));
    change.setAttribute('aria-pressed', String(s === 'change'));
    wrap.dataset.status = s ?? '';
  };
  approve.addEventListener('click', () => {
    fb.set(id, { status: fb.get(id).status === 'approve' ? null : 'approve' });
    sync();
  });
  change.addEventListener('click', () => {
    fb.set(id, { status: fb.get(id).status === 'change' ? null : 'change' });
    sync();
    notes.focus();
  });
  /** @type {number|undefined} */
  let timer;
  notes.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fb.set(id, { notes: notes.value }), 250);
  });
  sync();
  return wrap;
}

/** @param {string} group @param {{id:string,label:string}[]} items @param {string} current @param {(id:string)=>void} onPick */
function chips(group, items, current, onPick) {
  const row = h('div', { class: 'chips', role: 'group', 'aria-label': group });
  for (const it of items) {
    const b = h('button', { class: 'chip', type: 'button', 'data-id': it.id, 'aria-pressed': String(it.id === current), text: it.label });
    b.addEventListener('click', () => {
      row.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      onPick(it.id);
    });
    row.append(b);
  }
  return row;
}

/** @param {boolean|undefined} stub */
const pendingBadge = (stub) => (stub ? h('span', { class: 'pending', text: '🎨 art in progress' }) : null);

/** @param {Concept} c */
function infoBlock(c) {
  return [
    h('h3', {}, [c.name, c.title ? h('small', { text: ` · ${c.title}` }) : null]),
    c.role ? h('p', { class: 'role', text: c.role }) : null,
    c.look ? h('p', { class: 'look' }, [h('b', { text: 'Look: ' }), c.look]) : null,
    c.bio ? h('p', { class: 'bio', text: c.bio }) : null,
    c.quip ? h('p', { class: 'quip', text: `“${c.quip}”` }) : null,
    c.swatches ? h('div', { class: 'swatches', 'aria-label': 'Palette' }, c.swatches.map((col) => h('span', { style: `background:${col}`, title: col }))) : null,
  ];
}

// ---------- cat cards ----------
/** @param {string} id @param {CatArt} art @param {Concept} c @param {number} seed */
function catCard(id, art, c, seed) {
  const rig = new CatRig(art.spec, seed);
  const k = art.spec.scale ?? 1;
  const big = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'char-canvas', role: 'img', 'aria-label': `${c.name}, animated. Click to poke.` }));
  const small = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'stage-small', role: 'img', 'aria-label': `${c.name} at in-game size` }));
  let lastT = -1;

  makeView(big, (v, dt, t) => {
    if (t !== lastT) {
      lastT = t;
      const s0 = (v.h * 0.58) / 250;
      rig.update(dt, lookFrom(big, v.w * 0.42, v.h * 0.86 - 128 * s0 * k));
    }
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    drawBackground(ctx, v.w, v.h, catBg, t);
    const s = ((v.h * 0.58) / 250) * k;
    ctx.save();
    ctx.translate(v.w * 0.42, v.h * 0.86);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: reduced.matches });
    ctx.restore();
  });
  const cushionPen = new Pen(null);
  makeView(small, (v, dt, t) => {
    if (t !== lastT) {
      lastT = t;
      rig.update(dt, null);
    }
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    drawBackground(ctx, v.w, v.h, 'meadow', t);
    const s = (68 / 250) * k;
    ctx.save();
    ctx.translate(v.w / 2, v.h * 0.82);
    ctx.scale(s / k, s / k);
    cushionPen.ctx = ctx;
    cushionPen.begin(t, { boil: !reduced.matches, width: 2.6 / (s / k), amp: 0.8 / (s / k) });
    drawCushion(cushionPen, cushionPen.width);
    ctx.translate(0, -12);
    ctx.scale(k, k);
    rig.draw(ctx, s, { reducedMotion: reduced.matches });
    ctx.restore();
  });

  big.addEventListener('click', () => {
    rig.poke();
    rig.say(['mrrp!', 'boop.', 'excuse me.', '!!'][Math.floor(Math.random() * 4)], 60, -230, 22);
    if (soundOn) meow(1 / Math.max(0.6, k));
  });

  const exprRow = chips('Expressions', EXPRESSIONS.map((e) => ({ id: e, label: EXPRESSION_LABELS[e] })), 'idle', (e) => rig.setExpression(/** @type {any} */ (e)));
  const tierRow = art.tiers.length > 1 ? chips('Upgrade looks', art.tiers, 'T1', (tid) => ((rig.tier = tid), rig.poke())) : null;
  const ACTION_LABELS = { attack: '⚔️ Attack!', a1: '✨ Ability 1', a2: '💫 Ability 2' };
  const actionNames = Object.keys(art.spec.actions ?? {});
  const attack = actionNames.length
    ? h(
        'div',
        { class: 'row' },
        actionNames.map((name) =>
          h('button', {
            class: 'btn primary',
            type: 'button',
            text: ACTION_LABELS[/** @type {keyof typeof ACTION_LABELS} */ (name)] ?? `▶ ${name}`,
            onclick: () => {
              rig.play(name);
              if (soundOn) setTimeout(() => meow(0.9), 600);
            },
          }),
        ),
      )
    : null;

  return h('article', { class: 'card char', id: `card-${id}` }, [
    h('span', { class: 'tape', 'aria-hidden': 'true' }),
    pendingBadge(art.STUB),
    h('div', { class: 'char-grid' }, [
      h('div', { class: 'char-stage' }, [big, h('div', { class: 'sizes' }, [h('figure', {}, [small, h('figcaption', { text: 'In-game size' })])])]),
      h('div', { class: 'char-info' }, [
        ...infoBlock(c),
        attack,
        h('h4', { text: 'Expressions' }),
        exprRow,
        tierRow ? h('h4', { text: 'Upgrade looks' }) : null,
        tierRow,
        feedbackBlock(id, `${c.name} notes`),
      ]),
    ]),
  ]);
}

// ---------- enemy & boss cards ----------
/** @param {string} id @param {EnemyArt} art @param {Concept} c @param {number} seed @param {boolean} boss */
function enemyCard(id, art, c, seed, boss) {
  const rig = new EnemyRig(art.spec, seed);
  const H = art.spec.height ?? 180;
  const canvas = /** @type {HTMLCanvasElement} */ (h('canvas', { class: boss ? 'char-canvas boss' : 'char-canvas', role: 'img', 'aria-label': `${c.name}, animated` }));
  const small = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'stage-small', role: 'img', 'aria-label': `${c.name} at in-game size` }));
  let respawn = -1;
  let lastT = -1;
  const step = (/** @type {number} */ dt, /** @type {number} */ t) => {
    if (t === lastT) return;
    lastT = t;
    rig.update(dt, lookFrom(canvas, canvas.clientWidth / 2, canvas.clientHeight * 0.5));
    if (rig.isGone) {
      if (respawn < 0) respawn = 1;
      respawn -= dt;
      if (respawn <= 0) {
        respawn = -1;
        const phase = rig.st.phase;
        rig.st.mode = 'walk';
        rig.st.deathT = 0;
        rig.st.phase = phase;
        rig.setMode('walk');
      }
    }
  };
  makeView(canvas, (v, dt, t) => {
    step(dt, t);
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    drawBackground(ctx, v.w, v.h, 'paper', t);
    const s = Math.min((v.h * 0.62) / H, (v.w * 0.82) / (art.spec.width ?? H * 0.8));
    ctx.save();
    ctx.translate(v.w / 2, v.h * 0.88);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: reduced.matches });
    ctx.restore();
  });
  makeView(small, (v, dt, t) => {
    step(dt, t);
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    drawBackground(ctx, v.w, v.h, 'meadow', t);
    const px = boss ? 84 : 60 * Math.min(1, (art.spec.scale ?? 1) * 1.4);
    const s = Math.min(px / H, (v.w * 0.85) / (art.spec.width ?? H * 0.8));
    ctx.save();
    ctx.translate(v.w / 2, v.h * 0.86);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: reduced.matches });
    ctx.restore();
  });
  canvas.addEventListener('click', () => rig.hit());

  const modeRow = chips(
    'Action',
    [
      { id: 'walk', label: '🚶 Walk' },
      { id: 'idle', label: '🧍 Idle' },
      { id: 'hit', label: '💥 Hit' },
      { id: 'death', label: '💨 Defeat' },
    ],
    'walk',
    (m) => {
      if (m === 'hit') rig.hit();
      else if (m === 'death') rig.die();
      else rig.setMode(/** @type {any} */ (m));
    },
  );
  const phases = art.spec.phases ?? [];
  const phaseRow = boss && phases.length ? chips('Boss phase', phases.map((p, i) => ({ id: String(i), label: `${i + 1} · ${p}` })), '0', (p) => ((rig.st.phase = Number(p)), rig.hit())) : null;

  return h('article', { class: boss ? 'card char boss-card' : 'card char enemy', id: `card-${id}` }, [
    h('span', { class: 'tape', 'aria-hidden': 'true' }),
    pendingBadge(art.STUB),
    h('div', { class: boss ? 'char-grid' : '' }, [
      h('div', { class: 'char-stage' }, [canvas, h('div', { class: 'sizes' }, [h('figure', {}, [small, h('figcaption', { text: 'In-game size' })])])]),
      h('div', { class: 'char-info' }, [
        ...infoBlock(c),
        h('h4', { text: 'Try it (or click to bonk)' }),
        modeRow,
        phaseRow ? h('h4', { text: 'Phases' }) : null,
        phaseRow,
        feedbackBlock(id, `${c.name} notes`),
      ]),
    ]),
  ]);
}

// ---------- room cards ----------
const WALKERS = Object.keys(ENEMY_ART);
const SITTERS = Object.keys(CAT_ART);

/** @param {string} id @param {RoomArt} art @param {Concept} c */
function roomCard(id, art, c) {
  const room = art.room;
  const canvas = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'room-canvas', role: 'img', 'aria-label': `${c.name} level layout` }));
  const pen = new Pen(null);
  let layoutIdx = 0;
  let light = 0.2;
  const show = { path: true, spots: true, stash: true, walk: true };
  /** @type {Track[]} */
  let tracks = [];
  /** @type {{rig:EnemyRig, track:Track, d:number, speed:number, hp:number}[]} */
  let walkers = [];
  /** @type {{rig:CatRig, x:number, y:number, cd:number}[]} */
  let sitters = [];
  let spawnCd = 0;
  let spawnN = 0;

  const setup = () => {
    const L = room.layouts[layoutIdx];
    tracks = L.paths.map((p) => new Track(p));
    walkers = [];
    sitters = L.spots.slice(0, 6).map((s, i) => {
      const rig = new CatRig(CAT_ART[SITTERS[i % SITTERS.length]].spec, 40 + i);
      return { rig, x: s.x, y: s.y, cd: 1 + i * 0.4 };
    });
  };
  setup();

  makeView(canvas, (v, dt, t) => {
    const L = room.layouts[layoutIdx];
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    const k = v.w / STAGE_W;
    ctx.save();
    ctx.scale(k, k);
    pen.ctx = ctx;
    drawRoom(ctx, pen, room, L, t, {
      light,
      reducedMotion: reduced.matches,
      showPath: show.path,
      showSpots: show.spots,
      showStash: show.stash,
      lw: Math.max(2.5, 2.6 / k),
    });

    if (show.walk) {
      spawnCd -= dt;
      if (spawnCd <= 0 && tracks.length) {
        spawnCd = 1.6;
        const eid = WALKERS[spawnN % WALKERS.length];
        const tr = tracks[spawnN % tracks.length];
        walkers.push({ rig: new EnemyRig(ENEMY_ART[eid].spec, 100 + spawnN), track: tr, d: 0, speed: 110 + (spawnN % 3) * 30, hp: 3 });
        spawnN++;
      }
      for (const w of walkers) {
        if (w.rig.st.mode !== 'death' && w.rig.st.mode !== 'dead') w.d += w.speed * dt;
        w.rig.update(dt, null);
      }
      walkers = walkers.filter((w) => !w.rig.isGone && w.d < w.track.length);
      for (const s of sitters) {
        let best = null;
        let bd = 330;
        for (const w of walkers) {
          if (w.rig.st.mode === 'death') continue;
          const p = w.track.at(w.d);
          const d = Math.hypot(p.x - s.x, p.y - s.y);
          if (d < bd) {
            bd = d;
            best = { w, p };
          }
        }
        s.cd -= dt;
        if (best) {
          const dx = (best.p.x - s.x) / 300;
          const dy = (best.p.y - 40 - (s.y - 90)) / 300;
          s.rig.update(dt, { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
          if (s.cd <= 0) {
            s.cd = 1.8;
            s.rig.play('attack');
            best.w.hp--;
            if (best.w.hp <= 0) best.w.rig.die();
            else best.w.rig.hit();
          }
        } else s.rig.update(dt, null);
      }

      /** @type {{y:number, draw:()=>void}[]} */
      const items = [];
      for (const w of walkers) {
        const p = w.track.at(w.d);
        const H = w.rig.spec.height ?? 180;
        const s = (62 * Math.min(1, (w.rig.spec.scale ?? 1) * 1.4)) / H;
        items.push({
          y: p.y,
          draw: () => {
            ctx.save();
            ctx.translate(p.x, p.y + 10);
            ctx.scale(s, s);
            w.rig.draw(ctx, s * k, { reducedMotion: reduced.matches, flip: p.dx < 0 });
            ctx.restore();
          },
        });
      }
      for (const st of sitters) {
        const ks = st.rig.spec.scale ?? 1;
        const s = (84 / 250) * ks;
        items.push({
          y: st.y,
          draw: () => {
            ctx.save();
            ctx.translate(st.x, st.y - 6);
            ctx.scale(s, s);
            st.rig.draw(ctx, s * k, { reducedMotion: reduced.matches });
            ctx.restore();
          },
        });
      }
      items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
    }
    room.drawFront?.(ctx, pen, t, { light, reducedMotion: reduced.matches, layout: L });
    ctx.restore();
  });

  const layoutRow = chips(
    'Level layout',
    room.layouts.map((L, i) => ({ id: String(i), label: `${L.id} · ${L.name}` })),
    '0',
    (i) => {
      layoutIdx = Number(i);
      setup();
    },
  );
  /** @param {keyof typeof show} key @param {string} label */
  const toggle = (key, label) => {
    const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(show[key]), text: label });
    b.addEventListener('click', () => {
      show[key] = !show[key];
      b.setAttribute('aria-pressed', String(show[key]));
      if (key === 'walk') setup();
    });
    return b;
  };
  const slider = /** @type {HTMLInputElement} */ (h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: light, 'aria-label': 'Time of day' }));
  slider.addEventListener('input', () => (light = Number(slider.value)));

  return h('article', { class: 'card room', id: `card-${id}` }, [
    h('span', { class: 'tape', 'aria-hidden': 'true' }),
    pendingBadge(art.STUB),
    canvas,
    h('div', { class: 'room-controls' }, [
      h('div', {}, [h('h4', { text: 'Levels' }), layoutRow]),
      h('div', {}, [
        h('h4', { text: 'Show' }),
        h('div', { class: 'chips' }, [toggle('path', '🛤 Path'), toggle('spots', '🛋 Nap spots'), toggle('stash', '🍙 Snack Stash'), toggle('walk', '🚶 Walk test')]),
      ]),
      h('label', { class: 'light' }, [h('h4', { text: '🌅 Morning → dusk' }), slider]),
    ]),
    h('div', { class: 'room-info' }, [...infoBlock(c), feedbackBlock(id, `${c.name} notes`)]),
  ]);
}

function styleCard() {
  return h('article', { class: 'card style' }, [
    h('span', { class: 'tape', 'aria-hidden': 'true' }),
    h('h3', { text: '🎨 Overall art style' }),
    h('p', {
      text: 'The whole cast shares one look: wobbly hand-inked outlines, soft watercolor shading, big two-highlight eyes, rosy cheeks and squishy animation. Approve it here, or tell us what to change (e.g. "thicker lines", "less wobble", "brighter colors").',
    }),
    feedbackBlock('style', 'Overall style notes'),
  ]);
}

/** @param {string} title @param {string} sub @param {HTMLElement[]} cards @param {string} [cls] */
function section(title, sub, cards, cls = 'grid wide') {
  return h('section', { class: 'section' }, [h('h2', { class: 'section-title', text: title }), h('p', { class: 'section-sub', text: sub }), h('div', { class: cls }, cards)]);
}

// ---------- tabs ----------
const TABS = /** @type {const} */ (['cats', 'enemies', 'rooms']);
/** @typedef {typeof TABS[number]} Tab */

let seedN = 5;
/** @type {Record<Tab, () => HTMLElement>} */
const build = {
  cats: () =>
    h('div', {}, [
      h('div', { class: 'lead' }, [styleCard()]),
      h('div', { class: 'toolbar' }, [
        h('h4', { text: 'Background' }),
        chips(
          'Background',
          [
            { id: 'paper', label: '📄 Paper' },
            { id: 'meadow', label: '🌾 Meadow' },
            { id: 'night', label: '🌙 Night' },
          ],
          'paper',
          (b) => (catBg = /** @type {Bg} */ (b)),
        ),
        (() => {
          const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: '🔇 Sound off' });
          b.addEventListener('click', () => {
            soundOn = !soundOn;
            b.setAttribute('aria-pressed', String(soundOn));
            b.textContent = soundOn ? '🔊 Sound on' : '🔇 Sound off';
            if (soundOn) meow(1);
          });
          return b;
        })(),
      ]),
      section(
        'The cats',
        'Eight tower cats. Move your mouse: their eyes follow you. Click a cat to poke it. Try every expression and upgrade look.',
        Object.entries(CAT_ART).map(([id, art]) => catCard(id, art, conceptOf(id, CATS), seedN++)),
      ),
      section(
        "Mama Mittens' kittens",
        'They block the path and wrestle enemies.',
        Object.entries(KITTEN_ART).map(([id, art]) => catCard(id, art, conceptOf(id, KITTENS), seedN++)),
      ),
      section(
        'Heroes (Interactive Mode)',
        'One hero joins you per level. Try their attack and abilities.',
        Object.entries(HERO_ART).map(([id, art]) =>
          catCard(
            id,
            art,
            {
              id,
              name: art.hero.name,
              title: art.hero.title,
              icon: '🦸',
              role: `${art.hero.style} hero · ${art.hero.abilities.map((a) => `${a.key}: ${a.name}`).join(' · ')} · Passive: ${art.hero.passive.name}`,
              look: '',
              bio: art.hero.blurb,
              quip: '',
              round: 'D1',
            },
            seedN++,
          ),
        ),
      ),
    ]),
  enemies: () =>
    h('div', {}, [
      section(
        'Household horrors',
        'Twenty enemies, each with googly eyes and a defeat gag. Click one to bonk it.',
        Object.entries(ENEMY_ART).map(([id, art]) => enemyCard(id, art, conceptOf(id, ENEMIES), seedN++, false)),
        'grid',
      ),
      section(
        'Bosses',
        'One multi-phase boss per world. Switch phases to see each look.',
        Object.entries(BOSS_ART).map(([id, art]) => enemyCard(id, art, conceptOf(id, BOSSES), seedN++, true)),
      ),
    ]),
  rooms: () =>
    h('div', {}, [
      section(
        'The four worlds',
        'Each world has three level layouts. Toggle the walk test to watch enemies wobble along the path while cats defend.',
        Object.entries(ROOM_ART).map(([id, art]) => roomCard(id, art, conceptOf(id, ROOMS))),
        'stack',
      ),
    ]),
};

/** @type {Partial<Record<Tab, HTMLElement>>} */
const built = {};
const app = /** @type {HTMLElement} */ (document.getElementById('app'));

/** @param {Tab} tab */
function show(tab) {
  for (const t of TABS) {
    document.querySelector(`[data-tab="${t}"]`)?.setAttribute('aria-selected', String(t === tab));
    const el = built[t];
    if (el) el.hidden = t !== tab;
  }
  if (!built[tab]) {
    const el = build[tab]();
    el.setAttribute('role', 'tabpanel');
    built[tab] = el;
    app.append(el);
  }
}

function currentTab() {
  const t = location.hash.replace('#', '');
  return /** @type {Tab} */ (TABS.includes(/** @type {any} */ (t)) ? t : 'cats');
}

document.querySelectorAll('[data-tab]').forEach((b) =>
  b.addEventListener('click', () => {
    location.hash = /** @type {HTMLElement} */ (b).dataset.tab ?? 'cats';
  }),
);
window.addEventListener('hashchange', () => show(currentTab()));

// ---------- footer: counts + copy ----------
const countEl = /** @type {HTMLElement} */ (document.getElementById('fb-count'));
const toast = /** @type {HTMLElement} */ (document.getElementById('toast'));
function renderCounts() {
  const c = fb.counts();
  countEl.textContent = `👍 ${c.approve} approved · ✏️ ${c.change} to change`;
}
fb.onChange(renderCounts);
renderCounts();

/** @param {string} msg */
function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

document.getElementById('copy-fb')?.addEventListener('click', async () => {
  const md = fb.toMarkdown(
    [
      { heading: 'Overall style', items: [{ id: 'style', name: 'Art style' }] },
      { heading: 'Cats', items: [...CATS, ...KITTENS] },
      { heading: 'Enemies', items: ENEMIES },
      { heading: 'Bosses', items: BOSSES },
      { heading: 'Rooms', items: ROOMS },
    ],
    ROUND,
  );
  try {
    await navigator.clipboard.writeText(md);
    say('📋 Copied! Paste it into Copilot in one message.');
  } catch {
    const dlg = /** @type {HTMLDialogElement} */ (document.getElementById('fb-dialog'));
    const ta = /** @type {HTMLTextAreaElement} */ (document.getElementById('fb-text'));
    ta.value = md;
    dlg.showModal();
    ta.select();
  }
});
document.getElementById('reset-fb')?.addEventListener('click', () => {
  if (confirm('Clear all your approvals and notes on this device?')) {
    fb.clearAll();
    location.reload();
  }
});

show(currentTab());

// ---------- main loop ----------
let lastNow = performance.now() / 1000;
let time = 0;
function frame() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastNow);
  lastNow = now;
  time += dt;
  for (const v of views) {
    if (!v.visible || v.canvas.closest('[hidden]')) continue;
    try {
      v.tick(v, dt, time);
    } catch (err) {
      console.error(err);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
