// @ts-check
// Settings overlay (title + pause menu): volume, mute, reduced motion, screen shake, colorblind mode, reset progress.
// Everything is stored in progress.settings and applied live.
import { loadProgress, saveProgress, clearRun } from './save.js';
import { setVolume, getVolume, setMuted, isMuted } from '../audio/sfx.js';

const OS_REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @typedef {{reducedMotion?: boolean, shake?: boolean, colorblind?: boolean, volume?: number}} Settings */

/** Effective settings (user choices layered over the OS reduced-motion preference). */
export function currentSettings() {
  const s = loadProgress().settings ?? {};
  return {
    volume: typeof s.volume === 'number' ? s.volume : 0.4,
    reducedMotion: !!s.reducedMotion || OS_REDUCED,
    userReduced: !!s.reducedMotion,
    shake: s.shake !== false,
    colorblind: !!s.colorblind,
  };
}

/**
 * Apply settings to audio, renderer and page classes.
 * @param {{renderer: import('../game/renderer.js').Renderer}} game
 */
export function applySettings(game) {
  const s = currentSettings();
  setVolume(s.volume);
  game.renderer.applySettings({ reducedMotion: s.reducedMotion, shake: s.shake, colorblind: s.colorblind });
  document.body.classList.toggle('reduced', s.reducedMotion);
  document.body.classList.toggle('colorblind', s.colorblind);
  return s;
}

/** @param {Partial<Settings>} patch */
function save(patch) {
  const p = loadProgress();
  p.settings = { ...p.settings, ...patch };
  saveProgress(p);
}

/**
 * Open the settings panel inside `host` (the scaled #ui layer).
 * @param {HTMLElement} host @param {{renderer: import('../game/renderer.js').Renderer}} game @param {() => void} [onClose]
 */
export function openSettings(host, game, onClose) {
  host.querySelector('#settings')?.remove();
  const s = currentSettings();
  const wrap = document.createElement('div');
  wrap.id = 'settings';
  wrap.innerHTML = `<div class="panel settings" role="dialog" aria-modal="true" aria-labelledby="set-title"><span class="tape"></span>
    <h2 id="set-title">⚙ Settings</h2>
    <label class="set-row"><span>🔊 Volume</span><input type="range" min="0" max="100" step="5" value="${Math.round(getVolume() * 100)}" data-k="volume" aria-label="Volume"></label>
    <label class="set-row"><span>🔇 Mute</span><input type="checkbox" data-k="mute" ${isMuted() ? 'checked' : ''}></label>
    <label class="set-row"><span>🐢 Reduced motion${OS_REDUCED ? ' (on in your system)' : ''}</span><input type="checkbox" data-k="reducedMotion" ${s.userReduced || OS_REDUCED ? 'checked' : ''} ${OS_REDUCED ? 'disabled' : ''}></label>
    <label class="set-row"><span>📳 Screen shake</span><input type="checkbox" data-k="shake" ${s.shake ? 'checked' : ''}></label>
    <label class="set-row"><span>🎨 Colorblind mode (status icons)</span><input type="checkbox" data-k="colorblind" ${s.colorblind ? 'checked' : ''}></label>
    <div class="set-reset"><button class="btn" data-a="reset">🗑 Reset progress…</button><span class="set-confirm" hidden>Really? Stars, hats and achievements go poof. <button class="btn danger" data-a="yes">Yes, reset</button><button class="btn" data-a="no">Keep it</button></span></div>
    <div class="row"><button class="btn primary big" data-a="close">Done</button></div>
  </div>`;
  host.appendChild(wrap);
  const panel = /** @type {HTMLElement} */ (wrap.querySelector('.panel'));
  wrap.addEventListener('input', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    const k = el.dataset.k;
    if (k === 'volume') {
      save({ volume: Number(el.value) / 100 });
      applySettings(game);
    }
  });
  wrap.addEventListener('change', (e) => {
    const el = /** @type {HTMLInputElement} */ (e.target);
    const k = el.dataset.k;
    if (!k || k === 'volume') return;
    if (k === 'mute') {
      setMuted(el.checked);
      window.dispatchEvent(new CustomEvent('cata:mute'));
      return;
    }
    save({ [k]: el.checked });
    applySettings(game);
  });
  const close = () => {
    wrap.remove();
    onClose?.();
  };
  wrap.addEventListener('click', (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest('[data-a]');
    if (!b) {
      if (e.target === wrap) close();
      return;
    }
    const a = /** @type {HTMLElement} */ (b).dataset.a;
    const confirm = /** @type {HTMLElement} */ (wrap.querySelector('.set-confirm'));
    if (a === 'close') close();
    if (a === 'reset') {
      confirm.hidden = false;
      /** @type {HTMLElement} */ (confirm.querySelector('[data-a="no"]')).focus();
    }
    if (a === 'no') confirm.hidden = true;
    if (a === 'yes') {
      try {
        localStorage.removeItem('cata:save:v1');
      } catch {
        /* ignore */
      }
      clearRun();
      location.hash = '#/';
      location.reload();
    }
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  /** @type {HTMLElement} */ (panel.querySelector('input'))?.focus({ preventScroll: true });
  return close;
}
