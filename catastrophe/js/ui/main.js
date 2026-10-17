// @ts-check
// Quick Play entry (also hosts Interactive Mode levels via ?mode=interactive&hero=<id>&challenge=iron|nap):
// boot, hash routes, wiring between game, HUD, saves, achievements, settings, Boss Key and debug tools.
import { Game } from '../game/game.js';
import { Hud } from './hud.js';
import { Coach } from './coach.js';
import { renderTitle, renderGrid } from './screens.js';
import { installBossKey } from './bosskey.js';
import { openSettings, applySettings, currentSettings } from './settings.js';
import { Tally } from './stats.js';
import { loadProgress, saveProgress, recordStars, recordChallenge, bump, isUnlocked, endlessUnlocked, saveRun, loadRun, clearRun } from './save.js';
import { LEVELS, LEVEL_BY_ID, endlessLevel } from '../data/levels.js';
import { HEROES } from '../data/heroes.js';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { setMuted, isMuted, setHidden, unlockAudio } from '../audio/sfx.js';
import { installMusic, musicState } from '../audio/music.js';
import { registerOffline } from '../core/pwa.js';
import { installDebug } from './debug.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const AUTOPLAY = params.get('autoplay') === '1';
const INTERACTIVE = params.get('mode') === 'interactive';
const HERO = INTERACTIVE && params.get('hero') && HEROES[/** @type {string} */ (params.get('hero'))] ? /** @type {string} */ (params.get('hero')) : null;
const CHALLENGE = /** @type {'iron'|'nap'|null} */ (['iron', 'nap'].includes(params.get('challenge') ?? '') ? params.get('challenge') : null);
const MAP_URL = './interactive.html#/map';
/** @type {(msg:string)=>void} */
const report = /** @type {any} */ (window).__cataReport ?? ((m) => console.error(m));

const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const ui = /** @type {HTMLElement} */ (document.getElementById('ui'));
const screen = /** @type {HTMLElement} */ (document.getElementById('screen'));

const progress = loadProgress();
setMuted(progress.muted);
let endlessRun = 0;
/** Run variant marker so a Quick Play save never resumes as a challenge/hero run (and vice versa). */
const RUN_META = { hero: HERO, challenge: CHALLENGE };

const game = new Game({
  stage,
  canvas,
  debug: DEBUG,
  autoplay: AUTOPLAY,
  reducedMotion: currentSettings().reducedMotion,
  onArtError: (id, err) => report(`Art failed: ${id} — ${err instanceof Error ? err.message : String(err)}`),
  onAutosave: (level, snap) => {
    if (AUTOPLAY) return;
    if (level.id === 'endless') snap.endlessRun = endlessRun;
    snap.meta = RUN_META;
    saveRun(level.id, snap);
  },
});
applySettings(game);
if (!AUTOPLAY) installMusic(game);
if (!AUTOPLAY) registerOffline();

const tally = new Tally(game, { enabled: () => !AUTOPLAY });

const quitTo = () => {
  if (INTERACTIVE) location.href = MAP_URL;
  else location.hash = '#/play';
};

const hud = new Hud(game, ui, {
  autoplay: AUTOPLAY,
  interactive: INTERACTIVE,
  onRestart: () => {
    clearRun();
    const id = currentLevelId();
    if (id) startLevel(id, true);
  },
  onQuit: quitTo,
  onNext: (id) => {
    if (INTERACTIVE) location.href = MAP_URL;
    else location.hash = '#/play/' + id;
  },
  onSettings: () => openSettings(ui, game),
  onResult: (won) => {
    const sim = game.sim;
    const level = game.level;
    if (!sim || !level) return;
    clearRun();
    let r;
    if (level.id === 'endless') {
      const p = loadProgress();
      const waves = Math.max(0, sim.waveIdx - 1);
      const newBest = waves > p.endlessBest;
      p.endlessBest = Math.max(p.endlessBest, waves);
      saveProgress(p);
      tally.levelEnd({ won: false, lives: sim.lives, maxLives: sim.maxLives, challenge: null, hero: null, endlessWaves: waves });
      r = { won: false, stars: 0, endless: { waves, best: p.endlessBest, newBest } };
    } else {
      if (won && !AUTOPLAY) {
        recordStars(level.id, sim.stars);
        if (sim.challenge) recordChallenge(level.id, sim.challenge);
      }
      tally.levelEnd({ won, lives: sim.lives, maxLives: sim.maxLives, challenge: sim.challenge, hero: sim.hero?.id ?? null });
      const i = LEVELS.findIndex((l) => l.id === level.id);
      r = { won, stars: sim.stars, nextId: LEVELS[i + 1]?.id ?? null, challenge: sim.challenge, hero: sim.hero?.id ?? null };
    }
    setTimeout(() => {
      if (game.level === level) hud.showResults(r);
    }, 1600);
  },
  toggleBossKey: () => bossKey.toggle(),
});
const coach = new Coach(game, hud, ui);

const bossKey = installBossKey({
  onShow: () => {
    game.frozen = true;
    if (game.mode === 'level' && !game.paused && !hud.ended) hud.showPause();
    game.setPaused(true);
    if (!AUTOPLAY) bump('bossKey');
  },
  onHide: () => {
    game.frozen = false;
    game.last = performance.now();
    if (game.mode === 'level') hud.toast('Pudding whispers: “…is it gone?”', 2.5);
  },
});
/** @type {HTMLElement} */ (document.getElementById('tie')).addEventListener('click', () => bossKey.toggle());

// 🏆 Achievement toasts (save.js dispatches this when a counter completes one).
window.addEventListener('cata:achievement', (e) => {
  const ids = /** @type {CustomEvent} */ (e).detail ?? [];
  for (const id of ids) {
    const a = ACHIEVEMENT_BY_ID[id];
    if (a) hud.toast(`🏆 ${a.name} — ${a.desc}`, 5);
  }
});

/**
 * Phones: go fullscreen and lock landscape when the player starts playing (needs a tap; Android only;
 * iPhones don't allow it and keep the rotate note). Installed apps are already fullscreen.
 */
function phoneFullscreen() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse || !document.body.classList.contains('phone') || document.fullscreenElement || matchMedia('(display-mode: standalone)').matches) return;
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => /** @type {any} */ (window.screen.orientation)?.lock?.('landscape'))
    .catch(() => {});
}

function currentLevelId() {
  const m = /^#\/play\/([\w-]+)$/.exec(location.hash);
  return m ? m[1] : null;
}

/** @param {any} snap */
function sameVariant(snap) {
  const m = snap?.meta ?? { hero: null, challenge: null };
  return (m.hero ?? null) === RUN_META.hero && (m.challenge ?? null) === RUN_META.challenge;
}

/** @param {string} id @param {boolean} [fresh] */
function startLevel(id, fresh = false) {
  let level;
  let snap = fresh ? null : loadRun(id);
  if (snap && !sameVariant(snap)) snap = null;
  if (id === 'endless') {
    if (snap && typeof snap.endlessRun === 'number') endlessRun = snap.endlessRun;
    else {
      const p = loadProgress();
      endlessRun = p.endlessRuns;
      p.endlessRuns++;
      saveProgress(p);
      snap = null;
    }
    level = endlessLevel(endlessRun);
  } else level = LEVEL_BY_ID[id];
  if (AUTOPLAY) snap = null;
  const opts = { hero: id === 'endless' ? null : HERO, challenge: id === 'endless' ? null : CHALLENGE, hats: loadProgress().hats?.equipped ?? {} };
  try {
    game.startLevel(level, snap ?? undefined, opts);
  } catch (err) {
    report('Could not resume the saved run: ' + (err instanceof Error ? err.message : String(err)));
    clearRun();
    game.startLevel(level, undefined, opts);
    snap = null;
  }
  tally.resetLevel();
  screen.replaceChildren();
  document.body.dataset.screen = 'level';
  const coaching = !AUTOPLAY && !snap && Coach.wanted(level.id);
  hud.show({ resumed: !!snap, quiet: coaching });
  if (coaching) coach.start();
  else if (!AUTOPLAY) firstRunTips(level.id);
}

/** @param {string} levelId */
function firstRunTips(levelId) {
  const p = loadProgress();
  if (p.seenTips || levelId !== '1-1') return;
  p.seenTips = true;
  saveProgress(p);
  const tips = ['Tip: pick a cat in the tray, then click anywhere off the path. Click a seated cat to upgrade or move it.', 'Tip: each cat has a job. Slows at the bends, lasers down long straights, belly flops where the path doubles back.', 'Tip: "Call Early!" starts the next wave now for bonus treats.', 'Tip: press ` (backtick) if your manager walks by. We won\'t tell.'];
  tips.forEach((t, i) => setTimeout(() => game.mode === 'level' && hud.toast(t, 5), 2500 + i * 5200));
}

function showTitle() {
  hud.hide();
  game.diorama();
  document.body.dataset.screen = 'title';
  renderTitle(screen);
}

function route() {
  const hash = location.hash || '#/';
  if (game.mode === 'level' && !hud.ended && game.sim && game.sim.phase === 'wave' && game.level && !AUTOPLAY) {
    tally.flush();
    saveRun(game.level.id, Object.assign(game.sim.serialize(), game.level.id === 'endless' ? { endlessRun } : {}, { meta: RUN_META }));
  }
  if (hash === '#/' || hash === '#' || hash === '') {
    showTitle();
    return;
  }
  if (hash === '#/settings') {
    showTitle();
    openSettings(ui, game, () => (location.hash = '#/'));
    return;
  }
  if (hash === '#/play') {
    hud.hide();
    if (game.mode !== 'diorama') game.diorama();
    document.body.dataset.screen = 'grid';
    renderGrid(screen);
    return;
  }
  const id = currentLevelId();
  if (id === 'endless') {
    if (!endlessUnlocked(loadProgress()) && !AUTOPLAY && !DEBUG) {
      location.hash = '#/play';
      hud.toast('Endless opens after you clear 1-1.');
      return;
    }
    startLevel('endless');
    return;
  }
  if (id && LEVEL_BY_ID[id]) {
    const i = LEVELS.findIndex((l) => l.id === id);
    if (!isUnlocked(i, loadProgress()) && !AUTOPLAY && !DEBUG) {
      if (INTERACTIVE) {
        location.href = MAP_URL;
        return;
      }
      location.hash = '#/play';
      setTimeout(() => hud.toast(`Level ${id} is locked. Beat ${LEVELS[i - 1].id} first!`), 50);
      return;
    }
    startLevel(id);
    return;
  }
  // Unknown route.
  showTitle();
  hud.toast('A cat knocked this page off the table. Here is the title screen instead.');
}

window.addEventListener('hashchange', route);
window.addEventListener('cata:mute', () => {
  const p = loadProgress();
  p.muted = isMuted();
  saveProgress(p);
  for (const b of document.querySelectorAll('[data-act="mute"]')) b.textContent = isMuted() ? '🔇' : '🔊';
  for (const c of document.querySelectorAll('#settings [data-k="mute"]')) /** @type {HTMLInputElement} */ (c).checked = isMuted();
});
screen.addEventListener('click', (e) => {
  unlockAudio();
  if (/** @type {HTMLElement} */ (e.target).closest('a[href^="#/play"]')) phoneFullscreen();
  const b = /** @type {HTMLElement} */ (e.target).closest('[data-act]');
  if (!b) return;
  const act = /** @type {HTMLElement} */ (b).dataset.act;
  if (act === 'mute') {
    setMuted(!isMuted());
    window.dispatchEvent(new CustomEvent('cata:mute'));
  }
  if (act === 'settings') openSettings(ui, game, () => /** @type {HTMLElement|null} */ (screen.querySelector('[data-act="settings"]'))?.focus());
});
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.dataset.screen === 'grid' && !ui.querySelector('#settings')) location.hash = '#/';
  if (e.key.toLowerCase() === 'm' && document.body.dataset.screen !== 'level' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
    setMuted(!isMuted());
    window.dispatchEvent(new CustomEvent('cata:mute'));
  }
});

// Auto-pause + silence when the tab loses focus.
const blur = () => {
  setHidden(true);
  if (AUTOPLAY) return;
  if (game.mode === 'level' && !game.paused && !hud.ended && !bossKey.isOn()) hud.showPause();
  tally.flush();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) blur();
  else if (!bossKey.isOn()) setHidden(false);
});
window.addEventListener('blur', blur);
window.addEventListener('focus', () => {
  if (!bossKey.isOn()) setHidden(false);
});
window.addEventListener('pagehide', () => tally.flush());

if (DEBUG) {
  installDebug(game);
  /** @type {any} */ (window).__cata = { game, hud, tally, music: musicState };
}
route();
