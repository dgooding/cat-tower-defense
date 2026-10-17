// @ts-check
// Guided first level (1-1, first visit only): a sticky-note coach that walks through picking a cat,
// seating it beside the road, slowing with Granny Purl, starting the wave and upgrading. A pulsing
// paw on the map suggests a good spot (best road coverage), but any green spot works.
import { coverage, nearestOnTracks } from '../sim/geometry.js';
import { CAT_BY_ID } from '../data/cats.js';
import { loadProgress, saveProgress } from './save.js';

/** @param {string} html @returns {HTMLElement} */
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return /** @type {HTMLElement} */ (t.content.firstElementChild);
}

const KEY = 'tutorial:place';
/** @typedef {{at:'tray'|'go'|'top'|'left', text:string, hint?:'first'|'second'}} Step */
/** @type {Step[]} */
const STEPS = [
  { at: 'tray', text: '<b>1/5 · Pick a cat.</b> Click <b>Pudding</b> in the tray (or press <kbd>1</kbd>).' },
  { at: 'top', hint: 'first', text: '<b>2/5 · Seat it beside the road.</b> Enemies walk the road; the circle is Pudding’s reach. Green = OK, red = not here. The 🐾 marks a great spot: click there (or anywhere green).' },
  { at: 'top', hint: 'second', text: '<b>3/5 · Slow them down.</b> Pick <b>Granny Purl</b> in the tray (<kbd>2</kbd>) and seat her <i>earlier</i> along the road, so enemies crawl into Pudding’s circle.' },
  { at: 'go', text: '<b>4/5 · Ready?</b> Press <b>GO!</b> when you are. Enemies follow the road to your Snack Stash. Don’t let them reach it!' },
  { at: 'left', text: '<b>5/5 · Upgrade.</b> Click a seated cat, then its upgrade button. A strong cat beats two weak ones. Cats can also <b>↔ Move</b> for free between waves.' },
];

export class Coach {
  /** @param {import('../game/game.js').Game} game @param {import('./hud.js').Hud} hud @param {HTMLElement} ui */
  constructor(game, hud, ui) {
    this.game = game;
    this.hud = hud;
    this.step = -1;
    /** @type {{x:number, y:number}|null} */
    this.firstSpot = null;
    this.el = h('<div class="coach" hidden role="status" aria-live="polite"><div class="coach-text"></div><button class="coach-skip" type="button">Skip tutorial ✕</button></div>');
    ui.appendChild(this.el);
    /** @type {HTMLElement} */ (this.el.querySelector('.coach-skip')).addEventListener('click', () => this.finish(false));
    game.on((ev) => this.onEvent(ev));
    game.frameListeners.add(() => this.update());
  }

  /** Should the guided level run for this level? @param {string} levelId */
  static wanted(levelId) {
    return levelId === '1-1' && !loadProgress().seen[KEY];
  }

  start() {
    const p = loadProgress();
    p.seenTips = true; // the coach replaces the first-run tip toasts
    saveProgress(p);
    this.firstSpot = null;
    this.go(0);
  }

  get active() {
    return this.step >= 0;
  }

  /** @param {number} i */
  go(i) {
    this.step = i;
    const s = STEPS[i];
    this.el.className = `coach at-${s.at}`;
    this.el.hidden = false;
    // Touch screens: "tap" instead of "click", and no keyboard hints.
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const text = touch ? s.text.replace(/ ?\((?:or press )?<kbd>[^<]*<\/kbd>\)/g, '').replace(/\bClick\b/g, 'Tap').replace(/\bclick\b/g, 'tap') : s.text;
    /** @type {HTMLElement} */ (this.el.querySelector('.coach-text')).innerHTML = text;
    this.game.renderer.hint = s.hint ? this.suggest(s.hint) : null;
  }

  /** @param {boolean} done finished every step (vs skipped / left the level) */
  finish(done) {
    if (this.step < 0) return;
    this.step = -1;
    this.el.hidden = true;
    this.game.renderer.hint = null;
    const p = loadProgress();
    p.seen[KEY] = true;
    saveProgress(p);
    if (done) this.hud.toast('You’ve got it! 🐾 Psst: press ` (backtick) if your manager walks by.', 5);
  }

  /** Leave the level without finishing: hide, and try again next visit. */
  abort() {
    this.step = -1;
    this.el.hidden = true;
    this.game.renderer.hint = null;
  }

  update() {
    if (this.step < 0) return;
    if (this.game.mode !== 'level' || this.hud.root.hidden) return this.abort();
    if (this.hud.ended) return this.finish(false);
    const pl = this.hud.placing;
    if (this.step === 0 && pl && pl.slot < 0) this.go(1);
    else if (this.step === 1 && !pl && !this.game.sim?.towers.some(Boolean)) this.go(0);
  }

  /** @param {any} ev */
  onEvent(ev) {
    if (this.step < 0 || !this.game.sim) return;
    if (ev.type === 'place') {
      // While learning, the first wave waits for GO instead of a 15 s countdown.
      if (this.game.sim.phase === 'prep') this.game.sim.autoStartIn = null;
      const seated = this.game.sim.towers.filter(Boolean).length;
      if (this.step <= 1) {
        this.firstSpot = { x: ev.x, y: ev.y };
        this.go(seated >= 2 ? 3 : 2);
      } else if (this.step === 2) this.go(3);
    } else if (ev.type === 'wave' && this.step <= 3) this.go(4);
    else if (ev.type === 'upgrade' && this.step === 4) this.finish(true);
  }

  /** Is a stage point under the note (or close enough that the cat would hide behind it)? @param {number} x @param {number} y */
  covers(x, y) {
    const n = this.el;
    if (n.hidden || !n.offsetWidth) return false;
    const pad = 40;
    const r = n.getBoundingClientRect();
    const a = this.game.toStage(r.left, r.top);
    const b = this.game.toStage(r.right, r.bottom);
    return x > a.x - pad - 60 && x < b.x + pad + 60 && y > a.y - pad && y < b.y + 130;
  }

  /**
   * A good free spot: the most road in range. 'second' prefers spots earlier along the road than the first cat.
   * @param {'first'|'second'} which @returns {{x:number, y:number, label:string}|null}
   */
  suggest(which) {
    const sim = this.game.sim;
    if (!sim) return null;
    const cat = which === 'first' ? 'pudding' : 'granny-purl';
    const range = CAT_BY_ID[cat]?.tiers[0].range ?? 260;
    const first = which === 'second' ? this.firstSpot ?? sim.towers.find(Boolean) ?? null : null;
    const before = first ? nearestOnTracks(sim.tracks, first) : null;
    /** @type {{x:number, y:number, score:number}|null} */
    let best = null;
    for (let x = 120; x <= 1800; x += 30) {
      for (let y = 180; y <= 1000; y += 30) {
        if (sim.canPlace(x, y) || this.hud.overHud(x, y) || this.covers(x, y)) continue;
        if (before) {
          const n = nearestOnTracks(sim.tracks, { x, y });
          if (n.track !== before.track || n.d > before.d - 120) continue;
        }
        const score = coverage(sim.tracks, { x, y }, range);
        if (!best || score > best.score) best = { x, y, score };
      }
    }
    return best ? { x: best.x, y: best.y, label: which === 'first' ? 'Pudding here?' : 'Granny here?' } : null;
  }
}
