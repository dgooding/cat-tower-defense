// @ts-check
// World map: a hand-drawn paper map that unrolls, four painted regions, a paw-print trail
// between 12 level nodes plus Endless, stars/challenge badges and locks.
import { h, canvas as mkCanvas, starRow, tape } from '../dom.js';
import { makeView, isCalm } from '../stage.js';
import { progress, pawPrints } from '../store.js';
import { isUnlocked, endlessUnlocked } from '../../ui/save.js';
import { LEVELS, WORLD_ORDER, WORLD_NAMES } from '../../data/levels.js';
import { ENEMY_BY_ID } from '../../data/enemies.js';
import { TIPS } from '../../data/quips.js';
import { WORLD_INTRO } from '../story/script.js';
import { WORLD_INFO } from '../lore.js';
import { makeCat, HERO_ART } from '../rigs.js';
import { catmullRom } from '../../core/spline.js';
import { ellipsePts, Pen, soft } from '../../art/brush.js';
import { setAfterStory, clickMeow } from '../ui.js';
import { dense } from '../story/props.js';

const MW = 1000;
const MH = 620;

/** Node positions in map units (1000×620). */
const NODES = {
  '1-1': { x: 86, y: 528 },
  '1-2': { x: 196, y: 452 },
  '1-3': { x: 120, y: 336 },
  '2-1': { x: 240, y: 252 },
  '2-2': { x: 150, y: 140 },
  '2-3': { x: 318, y: 92 },
  '3-1': { x: 452, y: 168 },
  '3-2': { x: 560, y: 300 },
  '3-3': { x: 470, y: 446 },
  '4-1': { x: 640, y: 528 },
  '4-2': { x: 790, y: 440 },
  '4-3': { x: 860, y: 230 },
  endless: { x: 330, y: 482 },
};

/** Painted regions. */
const REGIONS = {
  countryside: { x: 150, y: 440, rx: 210, ry: 210, light: '#DDF0C8', base: '#A9D38A', shade: '#7DB463', label: { x: 168, y: 612 } },
  house: { x: 236, y: 150, rx: 240, ry: 150, light: '#FBF1D6', base: '#E4CF9B', shade: '#C7A770', label: { x: 30, y: 36 } },
  bathhouse: { x: 520, y: 310, rx: 150, ry: 250, light: '#7FB0BC', base: '#3F7685', shade: '#24505E', label: { x: 410, y: 36 } },
  sky: { x: 800, y: 340, rx: 220, ry: 300, light: '#9C96D8', base: '#4A4590', shade: '#262A5C', label: { x: 690, y: 36 } },
};

/** Guard: auto-play the prologue, any unseen world intro, or the ending. @returns {string|null} */
export function guard() {
  const p = progress();
  if (!p.seen['story:prologue']) return '#/story/prologue';
  if ((p.stars['4-3'] ?? 0) > 0 && !p.seen['story:ending']) return '#/story/ending';
  for (let w = 0; w < WORLD_ORDER.length; w++) {
    const id = WORLD_ORDER[w];
    if (isUnlocked(w * 3, p) && !p.seen[`story:${WORLD_INTRO[id]}`]) {
      setAfterStory('#/map');
      return `#/story/${WORLD_INTRO[id]}`;
    }
  }
  return null;
}

export function render() {
  const p = progress();
  const paws = pawPrints(p);
  const totalStars = Object.values(p.stars).reduce((a, b) => a + b, 0);
  const challengeStars = Object.values(p.challenges).reduce((a, c) => a + (c.iron ? 1 : 0) + (c.nap ? 1 : 0), 0);
  // "You are here": the first unlocked level without stars (or the last level).
  let here = LEVELS.findIndex((l, i) => isUnlocked(i, p) && !(p.stars[l.id] > 0));
  if (here < 0) here = LEVELS.length - 1;

  const cv = mkCanvas({ class: 'map-canvas', 'aria-hidden': 'true' });
  const nodes = h('div', { class: 'map-nodes' });

  LEVELS.forEach((lvl, i) => {
    const pos = NODES[lvl.id];
    const open = isUnlocked(i, p);
    const stars = p.stars[lvl.id] ?? 0;
    const ch = p.challenges[lvl.id] ?? {};
    const boss = lvl.boss ? ENEMY_BY_ID[lvl.boss] : null;
    const prev = i > 0 ? LEVELS[i - 1] : null;
    const label = open
      ? `Level ${lvl.id}, ${lvl.name}. ${stars} of 3 stars.${ch.iron ? ' Iron Cat cleared.' : ''}${ch.nap ? ' Nap Time cleared.' : ''}`
      : `Level ${lvl.id}, ${lvl.name}. Locked: beat ${prev?.id} first.`;
    const node = h(
      open ? 'a' : 'button',
      {
        class: `map-node w-${lvl.world}${boss ? ' boss' : ''}${open ? '' : ' locked'}${i === here ? ' here' : ''}${stars ? ' cleared' : ''}`,
        href: open ? `#/briefing/${lvl.id}` : null,
        type: open ? null : 'button',
        'aria-label': label,
        'aria-disabled': open ? null : 'true',
        style: { left: `${(pos.x / MW) * 100}%`, top: `${(pos.y / MH) * 100}%`, '--d': `${0.5 + i * 0.07}s` },
      },
      [
        h('span', { class: 'node-disc' }, [
          h('span', { class: 'node-id', text: open ? (boss ? boss.icon : lvl.id) : '🔒' }),
        ]),
        h('span', { class: 'node-tag' }, [
          h('span', { class: 'node-name', text: `${lvl.id} · ${lvl.name}` }),
          open
            ? h('span', { class: 'node-meta' }, [
                starRow(stars),
                h('span', { class: `chal${ch.iron ? ' on' : ''}`, title: ch.iron ? 'Iron Cat cleared' : 'Iron Cat not cleared yet', text: '🛡' }),
                h('span', { class: `chal${ch.nap ? ' on' : ''}`, title: ch.nap ? 'Nap Time cleared' : 'Nap Time not cleared yet', text: '💤' }),
              ])
            : h('span', { class: 'node-lock', text: `Beat ${prev?.id} first` }),
        ]),
      ],
    );
    if (!open)
      node.addEventListener('click', () => {
        node.classList.remove('nope');
        void node.offsetWidth;
        node.classList.add('nope');
      });
    nodes.append(node);
  });

  // Endless
  const eOpen = endlessUnlocked(p);
  const ePos = NODES.endless;
  nodes.append(
    h(
      eOpen ? 'a' : 'button',
      {
        class: `map-node endless${eOpen ? '' : ' locked'}`,
        href: eOpen ? '#/hero/endless' : null,
        type: eOpen ? null : 'button',
        'aria-label': eOpen ? `Endless: The Infinite Laundry Basket. Best ${p.endlessBest} waves.` : 'Endless: locked. Beat 1-1 first.',
        style: { left: `${(ePos.x / MW) * 100}%`, top: `${(ePos.y / MH) * 100}%`, '--d': '1.4s' },
      },
      [
        h('span', { class: 'node-disc' }, [h('span', { class: 'node-id', text: eOpen ? '🧺' : '🔒' })]),
        h('span', { class: 'node-tag' }, [
          h('span', { class: 'node-name', text: '∞ Infinite Laundry Basket' }),
          h('span', { class: eOpen ? 'node-meta' : 'node-lock', text: eOpen ? `Best: ${p.endlessBest} waves` : 'Beat 1-1 first' }),
        ]),
      ],
    ),
  );

  // Region labels (DOM, for crisp text)
  const labels = h(
    'div',
    { class: 'map-labels', 'aria-hidden': 'true' },
    WORLD_ORDER.map((w, i) => {
      const r = REGIONS[w];
      return h('span', { class: `region-label w-${w}`, style: { left: `${(r.label.x / MW) * 100}%`, top: `${(r.label.y / MH) * 100}%` } }, [
        h('b', { text: `${WORLD_INFO[w].icon} World ${i + 1}` }),
        h('span', { text: WORLD_NAMES[w] }),
      ]);
    }),
  );

  const scroll = h('div', { class: `map-scroll${isCalm() ? '' : ' unroll'}` }, [
    h('span', { class: 'rod left', 'aria-hidden': 'true' }),
    h('div', { class: 'map-sheet' }, [cv, labels, nodes, h('p', { class: 'map-note', 'aria-hidden': 'true', text: 'here be cucumbers 🥒' })]),
    h('span', { class: 'rod right', 'aria-hidden': 'true' }),
  ]);

  // Compact level list, shown instead of the node name tags on narrow (phone) screens.
  const listItem = (/** @type {typeof LEVELS[number]} */ lvl, /** @type {number} */ i) => {
    const open = isUnlocked(i, p);
    const stars = p.stars[lvl.id] ?? 0;
    const ch = p.challenges[lvl.id] ?? {};
    const boss = lvl.boss ? ENEMY_BY_ID[lvl.boss] : null;
    const body = [
      h('span', { class: 'ml-id', text: open ? (boss ? `${lvl.id} ${boss.icon}` : lvl.id) : '🔒' }),
      h('span', { class: 'ml-name', text: lvl.name }),
      open
        ? h('span', { class: 'node-meta' }, [starRow(stars), h('span', { class: `chal${ch.iron ? ' on' : ''}`, text: '🛡' }), h('span', { class: `chal${ch.nap ? ' on' : ''}`, text: '💤' })])
        : h('span', { class: 'node-lock', text: `Beat ${LEVELS[i - 1]?.id} first` }),
    ];
    const cls = `ml-item${open ? '' : ' locked'}${i === here ? ' here' : ''}`;
    return h('li', {}, [open ? h('a', { class: cls, href: `#/briefing/${lvl.id}` }, body) : h('span', { class: cls, 'aria-disabled': 'true' }, body)]);
  };
  const eBody = [h('span', { class: 'ml-id', text: eOpen ? '🧺' : '🔒' }), h('span', { class: 'ml-name', text: '∞ Infinite Laundry Basket' }), h('span', { class: eOpen ? 'node-meta' : 'node-lock', text: eOpen ? `Best: ${p.endlessBest} waves` : 'Beat 1-1 first' })];
  const list = h('nav', { class: 'map-list', 'aria-label': 'Levels' }, [
    ...WORLD_ORDER.map((w) =>
      h('section', { class: `ml-world w-${w}` }, [
        h('h2', { text: `${WORLD_INFO[w].icon} ${WORLD_NAMES[w]}` }),
        h('ol', {}, LEVELS.flatMap((lvl, i) => (lvl.world === w ? [listItem(lvl, i)] : []))),
      ]),
    ),
    h('section', { class: 'ml-world' }, [
      h('ol', {}, [h('li', {}, [eOpen ? h('a', { class: 'ml-item', href: '#/hero/endless' }, eBody) : h('span', { class: 'ml-item locked', 'aria-disabled': 'true' }, eBody)])]),
    ]),
  ]);

  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  const el = h('section', { class: 'page map-page' }, [
    h('div', { class: 'map-head' }, [
      h('div', {}, [h('h1', { class: 'page-title', text: 'The World Map' }), h('p', { class: 'page-sub', text: 'Follow the paw prints. Defend the snacks. Nap responsibly.' })]),
      h('div', { class: 'map-stats' }, [
        h('span', { class: 'sticker gold', title: 'Stars earned' }, ['⭐ ', h('b', { text: totalStars }), ' / 36']),
        h('span', { class: 'sticker mint', title: 'Challenge stars earned' }, ['🛡💤 ', h('b', { text: challengeStars }), ' / 24']),
        h('span', { class: 'sticker pink', title: 'Paw prints: earned − spent' }, ['🐾 ', h('b', { text: paws.available }), h('small', { text: ` (${paws.earned} earned)` })]),
      ]),
    ]),
    h('div', { class: 'map-wrap' }, [scroll]),
    list,
    h('div', { class: 'map-foot' }, [
      h('article', { class: 'sticky-note' }, [tape('pink'), h('p', { text: tip })]),
      h('nav', { class: 'map-links', 'aria-label': 'More' }, [
        h('a', { class: 'btn', href: '#/catalog', text: '📖 Cat-alog' }),
        h('a', { class: 'btn', href: '#/wardrobe', text: '🎩 Wardrobe' }),
        h('a', { class: 'btn', href: '#/achievements', text: '🏆 Cat-chievements' }),
        h('a', { class: 'btn', href: '#/credits', text: '🎬 Credits' }),
        h('a', { class: 'btn ghost', href: '#/story/prologue', text: '📖 Replay prologue' }),
      ]),
    ]),
  ]);

  return {
    el,
    title: 'World Map',
    after: () => startMap(cv, p, here),
  };
}

/** Wobbly blob points around an ellipse. @param {number} x @param {number} y @param {number} rx @param {number} ry @param {number} seed */
const regionPts = (x, y, rx, ry, seed) => ellipsePts(x, y, rx, ry, 40, (a) => 1 + 0.07 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 7 + seed * 2));

/** @param {HTMLCanvasElement} cv @param {import('../store.js').Progress} p @param {number} here */
function startMap(cv, p, here) {
  // Static layer painted once per size; animated bits drawn on top every frame.
  /** @type {HTMLCanvasElement|null} */
  let base = null;
  let baseKey = '';
  const lastHero = localStorage.getItem('cata:lastHero');
  const markerId = lastHero && HERO_ART[lastHero] ? lastHero : 'pudding';
  const marker = makeCat(markerId, 77);
  marker.setExpression('sleepy');
  const hereLvl = LEVELS[here];
  cv.parentElement?.addEventListener('click', (e) => {
    if (/** @type {HTMLElement} */ (e.target) === cv) {
      marker.setExpression(marker.expr === 'sleepy' ? 'happy' : 'sleepy');
      marker.poke();
      clickMeow(1);
    }
  });

  makeView(cv, (v, dt, t) => {
    const key = `${Math.round(v.w)}x${Math.round(v.h)}@${v.dpr}`;
    if (!base || key !== baseKey) {
      base = paintBase(v.w * v.dpr, v.h * v.dpr, p);
      baseKey = key;
    }
    const { ctx } = v;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    const k = v.w / MW;
    ctx.setTransform(v.dpr * k, 0, 0, v.dpr * k, 0, 0);
    const calm = isCalm();
    ambient(ctx, t, calm);
    // the napping "you are here" cat
    const pos = NODES[hereLvl.id];
    marker.update(dt, null);
    ctx.save();
    ctx.translate(pos.x + 34, pos.y - 6);
    const s = 0.16;
    ctx.scale(s, s);
    marker.draw(ctx, s * k, { reducedMotion: calm });
    ctx.restore();
  });
}

/** Ambient life: fireflies, twinkles, drifting clouds, rain over the bathhouse. @param {CanvasRenderingContext2D} ctx @param {number} t @param {boolean} calm */
function ambient(ctx, t, calm) {
  // twinkling stars over the sky region
  ctx.fillStyle = '#FFE58A';
  for (let i = 0; i < 26; i++) {
    const x = 640 + ((i * 71.3) % 330);
    const y = 70 + ((i * 47.9) % 470);
    ctx.globalAlpha = calm ? 0.7 : 0.25 + 0.75 * Math.abs(Math.sin(t * 1.4 + i * 1.7));
    ctx.fillRect(x, y, 2.2, 2.2);
  }
  // fireflies over the countryside
  ctx.fillStyle = '#FFF4A8';
  for (let i = 0; i < 9; i++) {
    const x = 60 + ((i * 53) % 230) + (calm ? 0 : Math.sin(t * 0.7 + i) * 10);
    const y = 380 + ((i * 37) % 160) + (calm ? 0 : Math.cos(t * 0.9 + i * 2) * 8);
    ctx.globalAlpha = calm ? 0.6 : 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + i * 1.3));
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!calm) {
    // rain over the bathhouse
    ctx.strokeStyle = 'rgba(220,236,240,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const x = 400 + ((i * 41.7 + t * 30) % 230);
      const y = 80 + ((i * 63.1 + t * 160) % 470);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 10);
    }
    ctx.stroke();
    // a drifting cloud
    const cx = 120 + ((t * 8) % 260);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy, r] of [[0, 0, 14], [14, -6, 17], [30, 0, 13]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, 300 + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Paint the static map: paper, regions, doodles, trail. @param {number} W @param {number} H @param {import('../store.js').Progress} p */
function paintBase(W, H, p) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W));
  c.height = Math.max(1, Math.round(H));
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const k = c.width / MW;
  ctx.scale(k, k);
  const pen = new Pen(ctx);
  pen.begin(0, { boil: false, width: 2.2, amp: 0.7 });

  // parchment
  const g = ctx.createRadialGradient(MW / 2, MH / 2, 100, MW / 2, MH / 2, 640);
  g.addColorStop(0, '#FBF3E2');
  g.addColorStop(1, '#EBDDBF');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MW, MH);
  ctx.fillStyle = 'rgba(160,118,79,0.06)';
  for (let i = 0; i < 260; i++) ctx.fillRect((i * 137.7) % MW, (i * 89.3) % MH, 2 + (i % 3), 1.5);

  // regions (watercolor blobs)
  WORLD_ORDER.forEach((w, i) => {
    const r = REGIONS[w];
    ctx.save();
    ctx.globalAlpha = 0.9;
    pen.blob(regionPts(r.x, r.y, r.rx, r.ry, i * 1.7), soft(ctx, r.x, r.y, Math.max(r.rx, r.ry), r.light, r.base, r.shade), { width: 2.4, ink: 'rgba(59,58,74,0.55)' });
    ctx.restore();
  });

  doodles(ctx, pen);
  trail(ctx, p);

  // burnt edge
  const e = ctx.createRadialGradient(MW / 2, MH / 2, 330, MW / 2, MH / 2, 620);
  e.addColorStop(0, 'rgba(120,80,40,0)');
  e.addColorStop(1, 'rgba(120,80,40,0.22)');
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, MW, MH);
  return c;
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen */
function doodles(ctx, pen) {
  // Countryside: rice paddies, giant tree, little shrine, hills
  ctx.strokeStyle = 'rgba(94,154,78,0.55)';
  ctx.lineWidth = 1.5;
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(30 + i * 14, 410 + r * 14);
      ctx.lineTo(36 + i * 14, 402 + r * 14);
      ctx.stroke();
    }
  pen.blob(ellipsePts(40, 374, 8, 24, 12), '#8A6242');
  pen.blob(ellipsePts(40, 338, 38, 28, 20, (a) => 1 + 0.12 * Math.sin(a * 6)), soft(ctx, 40, 334, 38, '#BFE6A6', '#6FAA55', '#4E8A42'));
  pen.blob(dense([{ x: 18, y: 478 }, { x: 36, y: 462 }, { x: 54, y: 478 }], 6), '#D9573B');
  pen.blob(dense([{ x: 24, y: 478 }, { x: 48, y: 478 }, { x: 48, y: 496 }, { x: 24, y: 496 }], 6), '#FFF8EC');

  // House: a little roof, tea cup, tatami grid
  pen.blob(dense([{ x: 36, y: 236 }, { x: 92, y: 236 }, { x: 92, y: 270 }, { x: 36, y: 270 }], 8), '#FBF7EE');
  pen.blob(dense([{ x: 24, y: 238 }, { x: 64, y: 204 }, { x: 104, y: 238 }], 8), '#A0764F');
  ctx.strokeStyle = 'rgba(160,118,79,0.6)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(44, 244, 14, 18);
  ctx.strokeRect(68, 244, 14, 18);
  ctx.strokeStyle = 'rgba(160,118,79,0.35)';
  for (let i = 0; i < 4; i++) ctx.strokeRect(24 + (i % 2) * 34, 96 + Math.floor(i / 2) * 22, 34, 22);
  pen.blob(ellipsePts(110, 108, 12, 9, 12), '#9DB58A');

  // Bathhouse: lanterns, bridge, waves
  for (const [x, y] of [[420, 250], [600, 200], [612, 420], [430, 520]]) {
    const gl = ctx.createRadialGradient(x, y, 1, x, y, 22);
    gl.addColorStop(0, 'rgba(242,158,76,0.7)');
    gl.addColorStop(1, 'rgba(242,158,76,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - 22, y - 22, 44, 44);
    pen.blob(ellipsePts(x, y, 6, 8, 10), '#F29E4C', { width: 1.6 });
  }
  ctx.strokeStyle = 'rgba(233,241,242,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(520, 400, 46, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,241,242,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(470 + i * 26, 420, 8, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // Sky: moon, islands, cloud whale
  const mg = ctx.createRadialGradient(930, 92, 4, 930, 92, 70);
  mg.addColorStop(0, 'rgba(255,244,207,0.6)');
  mg.addColorStop(1, 'rgba(255,244,207,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(860, 22, 140, 140);
  pen.blob(ellipsePts(930, 92, 30, 30, 20), soft(ctx, 930, 92, 30, '#FFFDF0', '#FFF4CF', '#EAD9A0'), { width: 2 });
  for (const [x, y, w] of [[720, 380, 60], [930, 380, 50], [700, 170, 46]]) {
    pen.blob([{ x: x - w / 2, y }, { x: x - w * 0.15, y: y + w * 0.5 }, { x: x + w * 0.1, y: y + w * 0.6 }, { x: x + w / 2, y }], '#8C84C9', { width: 1.8 });
    pen.blob(ellipsePts(x, y, w / 2, w * 0.1, 16), '#8DBF6A', { width: 1.8 });
  }
  pen.blob(ellipsePts(780, 580, 70, 22, 22), 'rgba(230,236,247,0.9)', { width: 1.8 });
  pen.blob([{ x: 846, y: 578 }, { x: 876, y: 560 }, { x: 870, y: 580 }, { x: 876, y: 598 }], 'rgba(230,236,247,0.9)', { width: 1.8 });
  ctx.fillStyle = '#3B3A4A';
  ctx.beginPath();
  ctx.arc(732, 578, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Compass rose
  ctx.save();
  ctx.translate(950, 560);
  ctx.strokeStyle = 'rgba(59,58,74,0.55)';
  ctx.fillStyle = 'rgba(244,166,183,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 30);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(30, 0);
  ctx.lineTo(0, -6);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#3B3A4A';
  ctx.font = '700 12px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, -36);
  ctx.fillText('nap', 0, 46);
  ctx.restore();
}

/** Dashed paw-print trail between nodes. @param {CanvasRenderingContext2D} ctx @param {import('../store.js').Progress} p */
function trail(ctx, p) {
  const order = LEVELS.map((l) => NODES[l.id]);
  const pts = catmullRom(order, 18);
  // where the cleared part ends
  let cleared = 0;
  LEVELS.forEach((l, i) => {
    if ((p.stars[l.id] ?? 0) > 0) cleared = i + 1;
  });
  const clearedLen = Math.min(LEVELS.length - 1, cleared);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 9]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(59,58,74,0.28)';
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.stroke();
  ctx.restore();

  // paw prints along the cleared route
  const seg = pts.length / (order.length - 1);
  const until = Math.floor(seg * clearedLen);
  let side = 1;
  let acc = 0;
  for (let i = 1; i < Math.min(until, pts.length); i++) {
    const a = pts[i - 1];
    const b = pts[i];
    acc += Math.hypot(b.x - a.x, b.y - a.y);
    if (acc < 16) continue;
    acc = 0;
    side = -side;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    paw(ctx, b.x - Math.sin(ang) * 4 * side, b.y + Math.cos(ang) * 4 * side, ang, 'rgba(59,58,74,0.72)');
  }
  // endless spur from 1-2
  ctx.save();
  ctx.setLineDash([2, 8]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(59,58,74,0.25)';
  ctx.beginPath();
  ctx.moveTo(NODES['1-2'].x, NODES['1-2'].y);
  ctx.quadraticCurveTo(262, 490, NODES.endless.x, NODES.endless.y);
  ctx.stroke();
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} ang @param {string} col */
function paw(ctx, x, y, ang, col) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 2.6, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-2.6, -2.2], [-0.9, -3.4], [0.9, -3.4], [2.6, -2.2]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
