// @ts-check
// Title screen + level grid (HTML over the live diorama).
import { LEVELS, WORLD_NAMES } from '../data/levels.js';
import { getLayout, getRoom } from '../data/layout.js';
import { drawRoom } from '../art/rooms/common.js';
import { Pen } from '../art/brush.js';
import { TIPS } from '../data/quips.js';
import { loadProgress, isUnlocked, endlessUnlocked } from './save.js';
import { isMuted } from '../audio/sfx.js';
import { isHalloween } from '../core/season.js';

const WORLD_ICONS = { countryside: '🌾', house: '🍵', bathhouse: '🏮', sky: '🌙' };

/** @param {string} html @returns {HTMLElement} */
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return /** @type {HTMLElement} */ (t.content.firstElementChild);
}

/** @param {HTMLElement} host */
export function renderTitle(host) {
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  const el = h(`<div class="screen title">
    <div class="title-card">
      <span class="tape"></span>
      <h1 class="logo">Catastrophe<span class="bang">!</span></h1>
      <p class="subtitle">The Great Snack Defense</p>
      <a class="btn play" href="#/play" id="play-btn" aria-label="Play: pick a level">▶ PLAY</a>
      <div class="row">
        <a class="btn interactive" href="./interactive.html">✨ Interactive Mode</a>
        <a class="btn" href="./index.html">✨ New Feature Page</a>
      </div>
      <div class="row small-row">
        <button class="btn" data-act="settings" aria-label="Settings">⚙ Settings</button>
        <button class="btn" data-act="mute" title="Mute (M)" aria-label="Mute sound">${isMuted() ? '🔇' : '🔊'}</button>
      </div>
      <p class="tip">${tip}</p>
    </div>
  </div>`);
  host.replaceChildren(el);
  /** @type {HTMLElement} */ (el.querySelector('#play-btn')).focus({ preventScroll: true });
  return el;
}

/** @param {HTMLElement} host */
export function renderGrid(host) {
  const p = loadProgress();
  const total = LEVELS.reduce((s, l) => s + (p.stars[l.id] ?? 0), 0);
  const el = h(`<div class="screen grid">
    <header class="grid-head"><a class="btn" href="#/">← Title</a><h2>Pick a level</h2><span class="sticker">★ ${total} / ${LEVELS.length * 3}</span></header>
    <div class="worlds"></div>
    <div class="endless-row"></div>
  </div>`);
  const worlds = /** @type {HTMLElement} */ (el.querySelector('.worlds'));
  /** @type {{canvas: HTMLCanvasElement, level: import('../data/levels.js').LevelDef}[]} */
  const thumbs = [];
  for (let w = 0; w < 4; w++) {
    const first = LEVELS[w * 3];
    const sec = h(`<section class="world w-${first.world}"><h3>${/** @type {Record<string,string>} */ (WORLD_ICONS)[first.world]} ${/** @type {Record<string,string>} */ (WORLD_NAMES)[first.world]}</h3><div class="cards"></div></section>`);
    const cards = /** @type {HTMLElement} */ (sec.querySelector('.cards'));
    for (let j = 0; j < 3; j++) {
      const i = w * 3 + j;
      const l = LEVELS[i];
      const open = isUnlocked(i, p);
      const stars = p.stars[l.id] ?? 0;
      const starHtml = [1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('');
      const tag = open ? 'a' : 'button';
      const card = h(`<${tag} class="lvl${open ? '' : ' locked'}${i === 0 && !stars ? ' pick' : ''}" aria-label="Level ${l.id}: ${l.name}, ${stars} of 3 stars${open ? '' : `, locked: beat ${LEVELS[i - 1]?.id} first`}" ${open ? `href="#/play/${l.id}"` : `type="button" title="Beat ${LEVELS[i - 1]?.id} first"`}>
        <canvas width="384" height="216" aria-hidden="true"></canvas>
        <span class="lvl-id">${l.id}${l.boss ? ' 👑' : ''}</span>
        <span class="lvl-name">${l.name}</span>
        <span class="lvl-stars">${starHtml}</span>
        ${open ? '' : '<span class="lock">🔒</span>'}
      </${tag}>`);
      if (!open) card.addEventListener('click', () => card.classList.add('nope'));
      cards.appendChild(card);
      thumbs.push({ canvas: /** @type {HTMLCanvasElement} */ (card.querySelector('canvas')), level: l });
    }
    worlds.appendChild(sec);
  }
  const eOpen = endlessUnlocked(p);
  const endless = h(`<${eOpen ? 'a' : 'button'} class="lvl endless${eOpen ? '' : ' locked'}" ${eOpen ? 'href="#/play/endless"' : 'type="button" title="Beat 1-1 first"'}>
    <span class="lvl-id">∞ Endless</span><span class="lvl-name">The Infinite Laundry Basket</span>
    <span class="lvl-best">Best: ${p.endlessBest} waves</span>${eOpen ? '' : '<span class="lock">🔒</span>'}</${eOpen ? 'a' : 'button'}>`);
  /** @type {HTMLElement} */ (el.querySelector('.endless-row')).appendChild(endless);
  if (isHalloween()) {
    const cleared = !!p.seen?.['halloween:won'];
    const spooky = h(`<a class="lvl endless halloween" href="#/play/halloween" aria-label="Seasonal bonus level: The Haunted Hayride${cleared ? ', cleared' : ''}">
      <span class="lvl-id">🎃 Bonus</span><span class="lvl-name">The Haunted Hayride</span>
      <span class="lvl-best">${cleared ? '👻 Cleared!' : 'October only'}</span></a>`);
    /** @type {HTMLElement} */ (el.querySelector('.endless-row')).prepend(spooky);
  }
  host.replaceChildren(el);
  // Paint thumbnails progressively so the grid appears instantly.
  let k = 0;
  const next = () => {
    const it = thumbs[k++];
    if (!it || !it.canvas.isConnected) return;
    paintThumb(it.canvas, it.level);
    setTimeout(next, 16);
  };
  setTimeout(next, 30);
  return el;
}

/** @param {HTMLCanvasElement} c @param {import('../data/levels.js').LevelDef} level */
function paintThumb(c, level) {
  try {
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const s = c.width / 1920;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    drawRoom(ctx, new Pen(ctx), getRoom(level), getLayout(level), 0, { reducedMotion: true, lw: 6, layout: getLayout(level) });
  } catch (err) {
    console.warn('[grid] thumbnail failed', level.id, err);
  }
}
