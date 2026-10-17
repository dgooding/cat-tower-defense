// @ts-check
// Interactive Mode shell: hash router with View Transitions, header, toasts, paw-print cursor trail.
import { h } from './dom.js';
import { progress, onChange, pawPrints, DEBUG, DEMO, isSeen, setCalm, reducedMotion } from './store.js';
import { clearViews, isCalm } from './stage.js';
import { toast, setSound, soundOn, clickMeow } from './ui.js';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { unlockAudio, setHidden, setVolume } from '../audio/sfx.js';
import { music, setMusicVolume } from '../audio/music.js';

// ---------- debug overlay (?debug=1) ----------
if (DEBUG) {
  const box = h('div', { class: 'debug-overlay', role: 'alert', hidden: true }, [h('b', { text: '🐞 Runtime errors' })]);
  document.body.append(box);
  /** @param {string} msg */
  const show = (msg) => {
    box.hidden = false;
    box.append(h('pre', { text: msg }));
  };
  window.addEventListener('error', (e) => show(`${e.message}\n  at ${e.filename}:${e.lineno}:${e.colno}`));
  window.addEventListener('unhandledrejection', (e) => show(`Unhandled: ${e.reason?.stack ?? e.reason}`));
  window.addEventListener('cata:ix-error', (e) => show(`Canvas: ${/** @type {CustomEvent} */ (e).detail?.stack ?? /** @type {CustomEvent} */ (e).detail}`));
}

/**
 * @typedef {Object} Rendered
 * @property {HTMLElement} el @property {string} [title] @property {boolean} [fullscreen]
 * @property {() => void} [after] runs once the element is in the document
 * @property {() => void} [cleanup] runs when leaving the route
 */
/**
 * @typedef {Object} RouteModule
 * @property {(params:string[]) => (string|null)} [guard] return a hash to redirect instead of rendering
 * @property {(params:string[]) => Promise<Rendered>|Rendered} render
 */

/** @type {[RegExp, string, () => Promise<RouteModule>][]} */
const ROUTES = [
  [/^\/story\/([\w-]+)(?:\/(\d+))?$/, 'story', () => import('./routes/story.js')],
  [/^\/map$/, 'map', () => import('./routes/map.js')],
  [/^\/briefing\/([\w-]+)$/, 'map', () => import('./routes/briefing.js')],
  [/^\/hero\/([\w-]+)$/, 'map', () => import('./routes/hero.js')],
  [/^\/catalog(?:\/([\w-]+))?$/, 'catalog', () => import('./routes/catalog.js')],
  [/^\/wardrobe(?:\/([\w-]+))?$/, 'wardrobe', () => import('./routes/wardrobe.js')],
  [/^\/achievements$/, 'achievements', () => import('./routes/achievements.js')],
  [/^\/credits$/, 'credits', () => import('./routes/credits.js')],
];

const outlet = /** @type {HTMLElement} */ (document.getElementById('outlet'));
let token = 0;
/** @type {(() => void) | undefined} */
let cleanup;
let first = true;

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** @param {() => void} update */
async function swap(update) {
  const doc = /** @type {any} */ (document);
  if (first || isCalm()) {
    update();
    return;
  }
  if (typeof doc.startViewTransition === 'function') {
    // Guard: if the browser can't produce a frame (background tab, throttled iframe), swap anyway.
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      update();
    };
    try {
      const vt = doc.startViewTransition(run);
      vt.finished?.catch(() => {});
      vt.ready?.catch(() => {});
      await Promise.race([vt.updateCallbackDone.catch(() => {}), sleep(450)]);
      if (!done) {
        vt.skipTransition?.();
        run();
      }
      return;
    } catch {
      if (done) return;
    }
  }
  outlet.classList.add('fade-out');
  await sleep(150);
  update();
  outlet.classList.remove('fade-out');
  outlet.classList.add('fade-in');
  setTimeout(() => outlet.classList.remove('fade-in'), 320);
}

async function route() {
  const my = ++token;
  const path = location.hash.replace(/^#/, '') || '/';
  if (path === '/' || path === '') {
    location.replace(`${location.pathname}${location.search}${isSeen('story:prologue') ? '#/map' : '#/story/prologue'}`);
    return;
  }
  const hit = ROUTES.find(([re]) => re.test(path));
  if (!hit) {
    location.replace(`${location.pathname}${location.search}#/map`);
    return;
  }
  const [re, tab, load] = hit;
  const params = /** @type {string[]} */ ((path.match(re) ?? []).slice(1));
  let mod;
  try {
    mod = await load();
  } catch (err) {
    console.error(err);
    showError(err);
    return;
  }
  if (my !== token) return;
  const redirect = mod.guard?.(params);
  if (redirect) {
    location.replace(`${location.pathname}${location.search}${redirect}`);
    return;
  }
  /** @type {Rendered} */
  let r;
  try {
    r = await mod.render(params);
  } catch (err) {
    console.error(err);
    showError(err);
    return;
  }
  if (my !== token) {
    r.cleanup?.();
    return;
  }
  await swap(() => {
    cleanup?.();
    cleanup = r.cleanup;
    clearViews();
    document.body.classList.toggle('story-mode', !!r.fullscreen);
    outlet.replaceChildren(r.el);
    document.title = `${r.title ?? 'Interactive Mode'} · Catastrophe!`;
    for (const a of document.querySelectorAll('.ix-tab')) {
      if (/** @type {HTMLElement} */ (a).dataset.route === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
    r.after?.();
  });
  if (!first) outlet.focus({ preventScroll: true });
  first = false;
}

/** @param {unknown} err */
function showError(err) {
  clearViews();
  document.body.classList.remove('story-mode');
  outlet.replaceChildren(
    h('section', { class: 'page narrow' }, [
      h('article', { class: 'card oops' }, [
        h('h2', { text: '🙀 A cat knocked this page off the table.' }),
        h('p', { text: 'Something failed to load. Try again, or head back to the map.' }),
        DEBUG ? h('pre', { text: String(/** @type {any} */ (err)?.stack ?? err) }) : null,
        h('p', {}, [h('a', { class: 'btn primary', href: '#/map', text: '🗺️ Back to the map' })]),
      ]),
    ]),
  );
}

window.addEventListener('hashchange', route);

// ---------- header ----------
const pawCount = /** @type {HTMLElement} */ (document.getElementById('paw-count'));
const pawChip = /** @type {HTMLElement} */ (document.getElementById('paw-chip'));
let lastPaws = -1;
function syncHeader() {
  const n = pawPrints(progress()).available;
  if (lastPaws >= 0 && n !== lastPaws) {
    pawChip.classList.remove('bump');
    void pawChip.offsetWidth;
    pawChip.classList.add('bump');
  }
  lastPaws = n;
  pawCount.textContent = String(n);
  const calm = reducedMotion();
  document.documentElement.classList.toggle('calm', calm);
  calmBtn.setAttribute('aria-pressed', String(!!progress().settings.reducedMotion));
}
const calmBtn = /** @type {HTMLButtonElement} */ (document.getElementById('calm-btn'));
calmBtn.addEventListener('click', () => {
  const on = !progress().settings.reducedMotion;
  setCalm(on);
  toast(on ? 'Calm motion on. The cats approve of less running.' : 'Calm motion off. Zoomies restored.', { icon: on ? '🐢' : '💨' });
});
const soundBtn = /** @type {HTMLButtonElement} */ (document.getElementById('sound-btn'));
function syncSound() {
  const on = soundOn();
  soundBtn.textContent = on ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', on ? 'Sound on: click meows and music' : 'Sound off');
  // The lullaby only plays after the player opts in (office-safe: never autoplays).
  const s = progress().settings ?? {};
  setVolume(typeof s.volume === 'number' ? s.volume : 0.4);
  setMusicVolume(typeof s.music === 'number' ? s.music : 0.5);
  music(on ? 'title' : null);
}
soundBtn.addEventListener('click', () => {
  setSound(!soundOn());
  if (soundOn()) unlockAudio();
  syncSound();
  clickMeow(1);
});
document.addEventListener('pointerdown', () => soundOn() && unlockAudio(), true);
document.addEventListener('visibilitychange', () => setHidden(document.hidden));
syncSound();
onChange(syncHeader);
syncHeader();
if (DEMO) document.body.classList.add('demo');

// ---------- achievement toasts ----------
window.addEventListener('cata:achievement', (e) => {
  const ids = /** @type {CustomEvent<string[]>} */ (e).detail ?? [];
  for (const id of ids) {
    const a = ACHIEVEMENT_BY_ID[id];
    if (a) toast(a.desc, { icon: a.icon, title: `Cat-chievement: ${a.name}`, kind: 'gold', ms: 5200 });
  }
});

// ---------- paw-print cursor trail ----------
const trail = /** @type {HTMLElement} */ (document.getElementById('paw-trail'));
let px = -999;
let py = -999;
let side = 1;
window.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse' || isCalm() || document.body.classList.contains('story-mode')) return;
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    const d = Math.hypot(dx, dy);
    if (d < 54) return;
    if (d > 400) {
      px = e.clientX;
      py = e.clientY;
      return;
    }
    px = e.clientX;
    py = e.clientY;
    side = -side;
    const ang = Math.atan2(dy, dx);
    const ox = -Math.sin(ang) * 9 * side;
    const oy = Math.cos(ang) * 9 * side;
    const p = h('span', { class: 'paw-print', style: { left: `${px + ox}px`, top: `${py + oy}px`, transform: `translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)` } });
    trail.append(p);
    if (trail.children.length > 12) trail.firstElementChild?.remove();
    setTimeout(() => p.remove(), 900);
  },
  { passive: true },
);

route();
