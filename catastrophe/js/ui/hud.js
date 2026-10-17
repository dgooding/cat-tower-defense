// @ts-check
// In-level HUD: stickers, wave preview, Call Early, Cat Powers, speed/pause/mute,
// cat tray (seat cats anywhere off the path), upgrade card, pause + results overlays, banners and toasts. Plus pointer/keyboard input.
import { CAT_BY_ID, nextTiers, TIER_LABELS } from '../data/cats.js';
import { ENEMY_BY_ID, BOSS_PHASES } from '../data/enemies.js';
import { TARGET_MODES } from '../data/ids.js';
import { POWERS, SELL_REFUND, PLACE_WHY } from '../sim/sim.js';
import { CAT_ART, HERO_ART } from '../art/registry.js';
import { catPortrait, enemyIcon, heroPortrait } from '../game/icons.js';
import { VICTORY_LINES, DEFEAT_LINES, TIPS, quip } from '../data/quips.js';
import { sfx, isMuted, setMuted, unlockAudio } from '../audio/sfx.js';
import { MOOD_BY_ID } from '../data/moods.js';
import { HEROES, xpFor } from '../data/heroes.js';

/** @typedef {import('../game/game.js').Game} Game */
/** @typedef {import('../sim/sim.js').Tower} Tower */

/** @param {string} html @returns {HTMLElement} */
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return /** @type {HTMLElement} */ (t.content.firstElementChild);
}
/** @param {string} s */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Short stat line for a tier. @param {import('../data/cats.js').CatDef} def @param {import('../data/cats.js').TierStats} s */
export function statLine(def, s) {
  const dt = def.dtype === 'sparkle' ? '✨' : '🥊';
  switch (def.kind) {
    case 'beam':
      return `${dt} ${s.dpsMin}→${s.dpsMax} dps${(s.beams ?? 1) > 1 ? ` ×${s.beams}` : ''} · ◎ ${s.range}`;
    case 'barracks':
      return `🐾 ${s.kittens?.n} kittens · ❤ ${s.kittens?.hp} · ${dt} ${s.kittens?.dmg}`;
    case 'cloud':
      return `${dt} ${s.dps} dps cloud · ⌀ ${s.radius} · ◎ ${s.range}`;
    case 'support':
      return `🐟 +${s.income}/wave · +${Math.round((s.aura ?? 0) * 100)}% dmg aura · ◎ ${s.range}`;
    case 'flop':
      return `${dt} ${s.dmg} AoE · stun ${s.stun}s · ◎ ${s.range}`;
    default:
      return `${dt} ${s.dmg} / ${s.rate}s${s.slow ? ` · slow ${Math.round(s.slow * 100)}%` : ''} · ◎ ${s.range}`;
  }
}

export class Hud {
  /**
   * @param {Game} game @param {HTMLElement} ui
   * @param {{onRestart: () => void, onQuit: () => void, onNext: (id:string) => void, onResult: (won:boolean) => void, toggleBossKey: () => void,
   *   onSettings?: () => void, autoplay?: boolean, interactive?: boolean}} hooks
   */
  constructor(game, ui, hooks) {
    this.game = game;
    this.ui = ui;
    this.hooks = hooks;
    this.selected = -1;
    /** @type {'none'|'card'} */
    this.menu = 'none';
    /** Seating a new cat (slot -1) or moving a seated one (slot ≥ 0); `drag` = started by dragging from the tray. @type {{cat:string, slot:number, drag:boolean, sx:number, sy:number}|null} */
    this.placing = null;
    this.aiming = false;
    this.mouse = { x: 960, y: 540, inside: false, t: 0 };
    this.cardSig = '';
    this.vals = /** @type {Record<string, any>} */ ({});
    this.ended = false;
    this.tipIdx = 0;
    this.seenSock = false;
    this.root = h(`<div id="hud" hidden>
      <div class="hud-tl">
        <div class="sticker treats" title="Treats (spend on cats)" aria-label="Treats">🐟 <b data-v="treats">0</b></div>
        <div class="sticker lives" title="Snacks left in the stash" aria-label="Snacks left">🍙 <b data-v="lives">20</b></div>
        <div class="sticker wave" title="Wave" aria-label="Wave">🌊 <b data-v="wave">0/0</b></div>
        <div class="sticker chal" data-v="chal" hidden></div>
        <div class="sticker mood" data-v="mood" hidden></div>
        <div class="level-name" data-v="name"></div>
      </div>
      <div class="hud-tr">
        <div class="preview"><span class="pv-label">Next wave</span><div class="pv-icons"></div></div>
        <button class="btn call" data-act="call" aria-label="Start the next wave">GO! ▶</button>
      </div>
      <div class="hud-bl"></div>
      <div class="tray" role="toolbar" aria-label="Cats: pick one, then click the map to seat it"></div>
      <div class="hero-panel" hidden>
        <button class="hp-portrait" data-act="hero" aria-label="Select hero (H), then click the ground to move"><img alt=""><span class="hp-lv"></span></button>
        <div class="hp-info"><b class="hp-name"></b><div class="hp-bar"><i class="hp-fill"></i></div><div class="xp-bar"><i class="xp-fill"></i></div><span class="hp-state"></span></div>
        <button class="power ability" data-ability="a1"><span class="pw-ring"></span><span class="pw-icon">✦</span><span class="pw-key">Z</span><span class="pw-name"></span></button>
        <button class="power ability" data-ability="a2"><span class="pw-ring"></span><span class="pw-icon">✧</span><span class="pw-key">X</span><span class="pw-name"></span></button>
      </div>
      <div class="hud-br">
        <button class="btn round" data-act="speed" title="Speed (F)" aria-label="Game speed">1×</button>
        <button class="btn round" data-act="pause" title="Pause (Space)" aria-label="Pause">⏸</button>
        <button class="btn round" data-act="mute" title="Mute (M)" aria-label="Mute sound">🔊</button>
      </div>
      <div class="bossbar" hidden role="status"><div class="bb-name"></div><div class="bb-track"><div class="bb-fill"></div></div><div class="bb-phase"></div></div>
    </div>`);
    ui.appendChild(this.root);
    this.menus = h('<div id="menus"></div>');
    ui.appendChild(this.menus);
    this.overlay = h('<div id="overlay" hidden></div>');
    ui.appendChild(this.overlay);
    this.banner = h('<div id="banner" aria-live="polite"></div>');
    ui.appendChild(this.banner);
    this.toasts = h('<div id="toasts" aria-live="polite"></div>');
    ui.appendChild(this.toasts);
    /** @type {Record<string, HTMLElement>} */
    this.v = {};
    for (const el of this.root.querySelectorAll('[data-v]')) this.v[/** @type {HTMLElement} */ (el).dataset.v ?? ''] = /** @type {HTMLElement} */ (el);
    this.pvIcons = /** @type {HTMLElement} */ (this.root.querySelector('.pv-icons'));
    this.callBtn = /** @type {HTMLButtonElement} */ (this.root.querySelector('[data-act="call"]'));
    this.speedBtn = /** @type {HTMLButtonElement} */ (this.root.querySelector('[data-act="speed"]'));
    this.muteBtn = /** @type {HTMLButtonElement} */ (this.root.querySelector('[data-act="mute"]'));
    this.bossbar = /** @type {HTMLElement} */ (this.root.querySelector('.bossbar'));
    /** @type {Record<string, HTMLButtonElement>} */
    this.powerBtns = {};
    const bl = /** @type {HTMLElement} */ (this.root.querySelector('.hud-bl'));
    for (const p of Object.values(POWERS)) {
      const b = /** @type {HTMLButtonElement} */ (h(`<button class="power" data-power="${p.id}" title="${esc(p.name)} (${p.key}) — ${esc(p.desc)}" aria-label="${esc(p.name)}, key ${p.key}"><span class="pw-ring"></span><span class="pw-icon" aria-hidden="true">${p.icon}</span><span class="pw-key">${p.key}</span><span class="pw-name">${esc(p.name)}</span></button>`));
      bl.appendChild(b);
      this.powerBtns[p.id] = b;
    }
    this.heroPanel = /** @type {HTMLElement} */ (this.root.querySelector('.hero-panel'));
    this.tray = /** @type {HTMLElement} */ (this.root.querySelector('.tray'));
    this.tray.addEventListener('pointerdown', (e) => this.onTrayDown(e));
    this.tray.addEventListener('keydown', (e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('.tray-btn');
      if (b && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        this.startPlacing(/** @type {string} */ (/** @type {HTMLElement} */ (b).dataset.cat), -1, false);
      }
    });
    this.root.addEventListener('click', (e) => this.onHudClick(e));
    this.bindInput();
    game.on((ev) => this.onEvent(ev));
    game.frameListeners.add((dt) => this.update(dt));
  }

  get sim() {
    return this.game.sim;
  }
  get active() {
    return this.game.mode === 'level' && !this.root.hidden;
  }

  /** Show for a freshly started (or resumed) level. @param {{resumed?: boolean, quiet?: boolean}} [o] quiet: skip intro toasts (the coach is talking) */
  show(o = {}) {
    this.root.hidden = false;
    this.closeMenus();
    this.hideOverlay();
    this.ended = false;
    this.vals = {};
    this.cardSig = '';
    const sim = this.sim;
    const lvl = this.game.level;
    if (!sim || !lvl) return;
    this.v.name.textContent = lvl.id === 'endless' ? `∞ ${lvl.name}` : `${lvl.id} · ${lvl.name}`;
    this.refreshPreview();
    // Challenge + hero setup.
    const chal = sim.challenge;
    this.v.chal.hidden = !chal;
    this.v.chal.textContent = chal === 'iron' ? '🛡️ Iron Cat: 1 snack, no powers' : chal === 'nap' ? '💤 Nap Time: 4 cats max' : '';
    this.buildTray();
    for (const b of Object.values(this.powerBtns)) b.hidden = chal === 'iron';
    this.v.mood.hidden = true;
    this.heroPanel.hidden = !sim.hero;
    this.ui.classList.toggle('has-hero', !!sim.hero);
    this.game.renderer.heroSelected = false;
    if (sim.hero) {
      const art = HERO_ART[sim.hero.id];
      const meta = art?.hero;
      const url = heroPortrait(sim.hero.id);
      const img = /** @type {HTMLImageElement} */ (this.heroPanel.querySelector('.hp-portrait img'));
      if (url) img.src = url;
      /** @type {HTMLElement} */ (this.heroPanel.querySelector('.hp-name')).textContent = meta?.name ?? sim.hero.id;
      for (const ab of meta?.abilities ?? []) {
        const b = /** @type {HTMLElement} */ (this.heroPanel.querySelector(`[data-ability="${ab.id}"]`));
        if (!b) continue;
        b.title = `${ab.name} (${ab.key}) — ${ab.desc}`;
        b.setAttribute('aria-label', `${ab.name}, key ${ab.key}`);
        /** @type {HTMLElement} */ (b.querySelector('.pw-name')).textContent = ab.name;
      }
      const portrait = /** @type {HTMLElement} */ (this.heroPanel.querySelector('.hp-portrait'));
      portrait.title = `${meta?.name ?? ''}: ${meta?.passive?.name ?? ''} — ${meta?.passive?.desc ?? ''}. Click, then click the ground to move (H).`;
    }
    if (o.resumed) this.toast('Welcome back! Resumed where you left off. 🐾');
    else if (!this.hooks.autoplay && !o.quiet) {
      this.setBanner('Place your cats!', 'Pick a cat below, then click anywhere off the path');
      if (lvl.newCat) this.toast(`New cat: ${CAT_BY_ID[lvl.newCat].name}! ${CAT_BY_ID[lvl.newCat].blurb}`, 5);
      for (const id of lvl.intro ?? []) {
        const d = ENEMY_BY_ID[id];
        if (d) this.toast(`⚠ New threat: ${d.name}. ${d.blurb}`, 6);
      }
      if (lvl.gimmick) this.toast(`✨ ${lvl.gimmick.note}`, 7);
      if (sim.hero) this.toast(`Click ${HERO_ART[sim.hero.id]?.hero?.name ?? 'your hero'} (or press H), then click the ground to move. Z / X for abilities.`, 7);
    }
  }

  hide() {
    this.root.hidden = true;
    this.closeMenus();
    this.hideOverlay();
    this.banner.innerHTML = '';
  }

  // ───────────────────────── frame update ─────────────────────────
  /** @param {number} dt */
  update(dt) {
    void dt;
    const sim = this.sim;
    if (!sim || !this.active) return;
    const set = (/** @type {string} */ k, /** @type {any} */ val, /** @type {(v:any)=>void} */ fn) => {
      if (this.vals[k] === val) return;
      this.vals[k] = val;
      fn(val);
    };
    set('treats', Math.floor(sim.treats), (v) => (this.v.treats.textContent = String(v)));
    set('lives', sim.lives, (v) => {
      this.v.lives.textContent = String(v);
      this.v.lives.parentElement?.classList.toggle('low', v <= 5);
    });
    const total = sim.totalWaves === Infinity ? '∞' : sim.totalWaves;
    set('wave', `${sim.waveIdx}/${total}`, (v) => (this.v.wave.textContent = v));
    set('waveIdx', sim.waveIdx, () => this.refreshPreview());
    // Call Early / GO.
    let call = '';
    if (sim.phase === 'prep') call = sim.autoStartIn !== null ? `GO! ▶ (${Math.ceil(sim.autoStartIn)})` : 'GO! ▶';
    else if (sim.canCallEarly && sim.nextIn !== null) call = `Call Early! +${sim.earlyBonus} 🐟`;
    set('call', call, (v) => {
      this.callBtn.hidden = !v;
      this.callBtn.textContent = v;
      this.callBtn.classList.toggle('go', sim.phase === 'prep');
    });
    set('speed', this.game.speed, (v) => (this.speedBtn.textContent = v + '×'));
    set('paused', this.game.paused, (v) => {
      const b = /** @type {HTMLElement} */ (this.root.querySelector('[data-act="pause"]'));
      b.textContent = v ? '▶' : '⏸';
    });
    set('muted', isMuted(), (v) => (this.muteBtn.textContent = v ? '🔇' : '🔊'));
    // Keep toasts off the Sucktator's plug (and its "mug me!" label): flip the stack to the top while it's below.
    const plug = sim.enemies.find((e) => e.type === 'sucktator' && e.alive && e.phase === 1);
    set('toastsTop', !!plug && plug.plugY > 560 && Math.abs(plug.plugX - 960) < 560, (v) => this.toasts.classList.toggle('top', v));
    for (const p of Object.values(POWERS)) {
      const cd = sim.powerCd[/** @type {import('../sim/sim.js').PowerId} */ (p.id)];
      const f = Math.round((cd / p.cd) * 100) / 100;
      set('pw:' + p.id, f, (v) => {
        const b = this.powerBtns[p.id];
        b.style.setProperty('--p', String(v));
        b.classList.toggle('ready', v <= 0);
        b.classList.toggle('aiming', this.aiming && p.id === 'mug');
      });
    }
    // Endless mood sticker.
    set('mood', sim.mood ?? '', (v) => {
      const m = v ? MOOD_BY_ID[v] : null;
      this.v.mood.hidden = !m;
      if (m) {
        this.v.mood.textContent = `${m.icon} ${m.name}`;
        this.v.mood.title = m.desc;
      }
    });
    // Hero panel.
    const hero = sim.hero;
    if (hero) {
      const def = HEROES[hero.id];
      set('hero', `${Math.ceil((hero.hp / hero.maxHp) * 50)}:${hero.level}:${hero.alive}:${Math.ceil(hero.respawnT)}:${Math.floor(hero.xp)}`, () => {
        /** @type {HTMLElement} */ (this.heroPanel.querySelector('.hp-fill')).style.width = Math.max(0, (hero.hp / hero.maxHp) * 100) + '%';
        const lo = xpFor(hero.level);
        const hi = xpFor(hero.level + 1);
        const xpf = hero.level >= 10 ? 1 : (hero.xp - lo) / Math.max(1, hi - lo);
        /** @type {HTMLElement} */ (this.heroPanel.querySelector('.xp-fill')).style.width = Math.max(0, Math.min(1, xpf)) * 100 + '%';
        /** @type {HTMLElement} */ (this.heroPanel.querySelector('.hp-lv')).textContent = 'Lv' + hero.level;
        /** @type {HTMLElement} */ (this.heroPanel.querySelector('.hp-state')).textContent = hero.alive ? (this.game.renderer.heroSelected ? 'Click the ground to move' : '') : `💤 napping… ${Math.ceil(hero.respawnT)}s`;
        this.heroPanel.classList.toggle('down', !hero.alive);
      });
      for (const which of /** @type {const} */ (['a1', 'a2'])) {
        const f = Math.round((hero[which] / def.cd[which]) * 100) / 100;
        set('ab:' + which, `${f}:${hero.alive}`, () => {
          const b = /** @type {HTMLElement} */ (this.heroPanel.querySelector(`[data-ability="${which}"]`));
          b.style.setProperty('--p', String(hero.alive ? f : 1));
          b.classList.toggle('ready', f <= 0 && hero.alive);
        });
      }
      set('heroSel', this.game.renderer.heroSelected, (v) => this.heroPanel.classList.toggle('selected', v));
    }
    // Boss bar.
    let boss = null;
    for (const e of sim.enemies) if (e.boss && e.alive) boss = e;
    set('boss', boss ? `${boss.id}:${Math.ceil((boss.hp / boss.maxHp) * 200)}:${boss.phase}` : '', () => {
      this.bossbar.hidden = !boss;
      if (!boss) return;
      /** @type {HTMLElement} */ (this.bossbar.querySelector('.bb-name')).textContent = boss.def.name;
      /** @type {HTMLElement} */ (this.bossbar.querySelector('.bb-fill')).style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
      const names = /** @type {Record<string, string[]>} */ (BOSS_PHASES)[boss.type] ?? [];
      /** @type {HTMLElement} */ (this.bossbar.querySelector('.bb-phase')).textContent = `Phase ${boss.phase + 1}: ${names[boss.phase] ?? ''}`;
    });
    // Tray affordability + card refresh.
    const napFull = sim.challenge === 'nap' && sim.towers.filter(Boolean).length >= 4;
    set('tray', `${Math.floor(sim.treats)}:${napFull}`, () => {
      for (const b of this.tray.querySelectorAll('.tray-btn')) {
        const cost = Number(/** @type {HTMLElement} */ (b).dataset.cost);
        b.classList.toggle('poor', sim.treats < cost || napFull);
      }
    });
    set('trayHint', this.game.renderer.highlightEmpty && !this.placing, (v) => this.tray.classList.toggle('hint', v));
    if (this.menu === 'card') {
      const t = sim.towers[this.selected];
      const sig = t ? `${t.id}:${t.tier}:${t.mode}:${Math.floor(sim.treats)}:${sim.betweenWaves}` : 'x';
      if (sig !== this.cardSig) this.openCard(this.selected);
    }
    if (this.placing) this.refreshGhost();
    this.game.renderer.selectedSpot = this.selected;
    this.game.renderer.aim = this.aiming && this.mouse.inside ? { x: this.mouse.x, y: this.mouse.y, r: POWERS.mug.radius } : null;
  }

  refreshPreview() {
    const sim = this.sim;
    if (!sim) return;
    const list = sim.waveIdx < sim.totalWaves ? sim.nextWavePreview() : [];
    this.pvIcons.innerHTML = '';
    if (!list.length) {
      this.pvIcons.appendChild(h('<span class="pv-none">Final wave! 🏁</span>'));
      return;
    }
    for (const it of list.slice(0, 7)) {
      const d = ENEMY_BY_ID[it.id];
      const url = enemyIcon(it.id);
      const img = url ? `<img src="${url}" alt="">` : `<span class="pv-emoji">${d?.icon ?? '?'}</span>`;
      this.pvIcons.appendChild(h(`<div class="pv-item${d?.boss ? ' boss' : ''}" title="${esc(d?.name ?? it.id)} — ${esc(d?.blurb ?? '')}">${img}<span class="pv-n">×${it.count}</span><span class="pv-name">${esc(d?.name ?? it.id)}</span></div>`));
    }
  }

  // ───────────────────────── sim events ─────────────────────────
  /** @param {any} ev */
  onEvent(ev) {
    const sim = this.sim;
    if (!sim || this.game.mode !== 'level') return;
    switch (ev.type) {
      case 'wave': {
        const groups = sim.waveGroups(ev.n - 1) ?? [];
        const boss = groups.find((g) => ENEMY_BY_ID[g.id]?.boss);
        if (boss) this.setBanner(`BOSS WAVE!`, ENEMY_BY_ID[boss.id].name + ' approaches…', true);
        else this.setBanner(`WAVE ${ev.n}`, ev.total === Infinity ? 'Endless' : `of ${ev.total}`);
        break;
      }
      case 'phase':
        this.setBanner(ENEMY_BY_ID[ev.id]?.name ?? 'Boss', `Phase ${ev.phase + 1}: ${ev.name}`, true);
        break;
      case 'spawn':
        if (ev.boss) this.toast(`“${quip(ENEMY_BY_ID[ev.id]?.id ?? '', sim.waveIdx)}”`, 4);
        break;
      case 'sell':
      case 'place':
      case 'upgrade':
        if (this.menu === 'card' && ev.type !== 'place') this.openCard(this.selected);
        break;
      case 'win':
      case 'lose':
        this.closeMenus();
        this.ended = true;
        this.hooks.onResult(ev.type === 'win');
        break;
      case 'mood':
        this.setBanner(`${ev.icon} Cat Mood: ${ev.name}`, ev.desc);
        break;
      case 'screensWarn':
        this.toast('🚪 The shoji screens slide after this wave! Enemies will take the other route.', 4);
        break;
      case 'screens':
        this.setBanner('The screens slid!', 'New route open');
        break;
      case 'sock':
        if (!this.seenSock) {
          this.seenSock = true;
          this.toast('🧦 A sock fell! No seating on it, and a cat under it naps at half speed until the next wave.', 5);
        }
        break;
      case 'unplug':
        this.toast('🔌 Unplugged! The Sucktator can\'t suck for a while.', 3);
        break;
      case 'heroDown':
        this.game.renderer.heroSelected = false;
        this.toast('Your hero is taking a power nap. Back in 15s.', 3);
        break;
      case 'heroLevel':
        if (ev.level === 10) this.toast('⭐ Hero reached max level!', 3);
        break;
    }
  }

  /** @param {string} big @param {string} small @param {boolean} [boss] */
  setBanner(big, small, boss = false) {
    this.banner.innerHTML = '';
    const el = h(`<div class="banner-tape${boss ? ' boss' : ''}"><b>${esc(big)}</b><span>${esc(small)}</span></div>`);
    this.banner.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2900);
  }

  /** @param {string} text @param {number} [secs] */
  toast(text, secs = 3.2) {
    const el = h(`<div class="toast">${esc(text)}</div>`);
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 4) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.classList.add('out'), secs * 1000);
    setTimeout(() => el.remove(), secs * 1000 + 600);
  }

  // ───────────────────────── input ─────────────────────────
  bindInput() {
    const canvas = this.game.renderer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      unlockAudio();
      if (!this.active || this.ended) return;
      const p = this.game.toStage(e.clientX, e.clientY);
      this.mouse = { x: p.x, y: p.y, inside: true, t: performance.now() };
      if (e.button === 2) return;
      if (this.aiming) {
        this.firePower('mug', p.x, p.y);
        return;
      }
      if (this.placing) {
        this.commitPlacing(p.x, p.y, e.shiftKey);
        return;
      }
      const r = this.game.renderer;
      const slot = this.game.towerAt(p.x, p.y);
      // Hero: click to select, click the ground to walk there.
      if (this.sim?.hero && slot < 0) {
        if (this.game.heroAt(p.x, p.y)) {
          r.heroSelected = !r.heroSelected;
          this.closeMenus();
          return;
        }
        if (r.heroSelected) {
          if (this.sim.heroMove(p.x, p.y)) sfx('pop', { pitch: 1.5 });
          r.heroSelected = false;
          return;
        }
      }
      r.heroSelected = false;
      if (slot < 0 || (slot === this.selected && this.menu !== 'none')) {
        this.closeMenus();
        return;
      }
      this.openCard(slot);
    });
    canvas.addEventListener('contextmenu', (e) => {
      if (this.placing || this.aiming) {
        e.preventDefault();
        this.cancelPlacing();
        this.aiming = false;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = this.game.toStage(e.clientX, e.clientY);
      this.mouse = { x: p.x, y: p.y, inside: true, t: performance.now() };
      if (!this.active) return;
      if (this.placing) {
        this.refreshGhost();
        canvas.style.cursor = 'crosshair';
        return;
      }
      const slot = e.pointerType === 'mouse' ? this.game.towerAt(p.x, p.y) : -1;
      this.game.renderer.hoverSpot = slot;
      const onHero = this.game.heroAt(p.x, p.y);
      canvas.style.cursor = this.aiming || this.game.renderer.heroSelected ? 'crosshair' : slot >= 0 || onHero ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => {
      this.mouse.inside = false;
      this.game.renderer.hoverSpot = -1;
      if (this.placing && !this.placing.drag) this.game.renderer.ghost = null;
    });
    // Dragging a cat out of the tray: follow the pointer anywhere, drop on release.
    window.addEventListener('pointermove', (e) => {
      const pl = this.placing;
      if (!pl || !pl.drag || !this.active) return;
      const p = this.game.toStage(e.clientX, e.clientY);
      this.mouse = { x: p.x, y: p.y, inside: true, t: performance.now() };
      this.refreshGhost();
    });
    window.addEventListener('pointerup', (e) => {
      const pl = this.placing;
      if (!pl || !pl.drag || !this.active) return;
      pl.drag = false;
      const p = this.game.toStage(e.clientX, e.clientY);
      // A click on the tray (no real drag) keeps the cat in hand for click-to-place.
      if (Math.hypot(e.clientX - pl.sx, e.clientY - pl.sy) < 12) return;
      if (this.overHud(p.x, p.y)) return this.cancelPlacing();
      this.commitPlacing(p.x, p.y, e.shiftKey);
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  /** @param {PointerEvent} e */
  onTrayDown(e) {
    const b = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('.tray-btn'));
    if (!b || !this.active || this.ended) return;
    unlockAudio();
    e.preventDefault();
    const cat = /** @type {string} */ (b.dataset.cat);
    if (this.placing && this.placing.cat === cat && this.placing.slot < 0 && !this.placing.drag) {
      this.cancelPlacing();
      return;
    }
    this.startPlacing(cat, -1, true, e.clientX, e.clientY);
  }

  /** One button per cat the level unlocks. */
  buildTray() {
    const sim = this.sim;
    this.tray.innerHTML = '';
    if (!sim) return;
    sim.level.cats.forEach((id, i) => {
      const def = CAT_BY_ID[id];
      const cost = def.tiers[0].cost;
      const url = catPortrait(id);
      const img = url ? `<img src="${url}" alt="" draggable="false">` : `<span class="rad-emoji">${def.icon}</span>`;
      const b = h(`<button class="tray-btn" data-cat="${id}" data-cost="${cost}" aria-label="${esc(def.name)}, ${cost} treats, key ${i + 1}" title="${esc(def.name)} (${i + 1}) — ${esc(def.blurb)}">${img}<span class="tray-cost">${cost}🐟</span><span class="tray-key">${i + 1}</span></button>`);
      this.tray.appendChild(b);
    });
  }

  /** Is a stage point under a HUD control (where a cat would be hidden)? @param {number} x @param {number} y */
  overHud(x, y) {
    for (const el of [this.tray, this.root.querySelector('.hud-bl'), this.root.querySelector('.hud-br'), this.heroPanel]) {
      const n = /** @type {HTMLElement|null} */ (el);
      if (!n || n.hidden || !n.offsetWidth) continue;
      const pad = 12;
      if (x > n.offsetLeft - pad && x < n.offsetLeft + n.offsetWidth + pad && y > n.offsetTop - pad && y < n.offsetTop + n.offsetHeight + 40) return true;
    }
    return false;
  }

  /**
   * Pick up a cat to seat (slot -1) or a seated cat to move (slot ≥ 0).
   * @param {string} cat @param {number} slot @param {boolean} drag @param {number} [sx] @param {number} [sy]
   */
  startPlacing(cat, slot, drag, sx = 0, sy = 0) {
    const sim = this.sim;
    if (!sim) return;
    this.closeMenus();
    if (slot < 0) {
      const cost = CAT_BY_ID[cat].tiers[0].cost;
      if (sim.challenge === 'nap' && sim.towers.filter(Boolean).length >= 4) {
        this.toast('💤 Nap Time: only 4 cats allowed. Sell one to seat another.', 2);
        return;
      }
      if (sim.treats < cost) {
        this.toast(`Not enough treats for ${CAT_BY_ID[cat].name} (${cost} 🐟)`, 1.6);
        sfx('pop', { pitch: 0.5 });
        return;
      }
    } else if (!sim.betweenWaves) {
      this.toast('Cats can only move between waves. (Or sell and reseat.)', 1.8);
      return;
    }
    this.placing = { cat, slot, drag, sx, sy };
    this.game.renderer.highlightEmpty = false;
    for (const b of this.tray.querySelectorAll('.tray-btn')) b.classList.toggle('on', /** @type {HTMLElement} */ (b).dataset.cat === cat && slot < 0);
    // Keyboard / no pointer yet: start from the seated cat or the best free suggested spot.
    if (!this.mouse.inside || performance.now() - this.mouse.t > 4000) {
      const t = slot >= 0 ? sim.towers[slot] : null;
      const p = t ?? sim.layout.spots.find((_, i) => sim.spotUsable(i)) ?? { x: 960, y: 540 };
      this.mouse = { x: p.x, y: p.y, inside: true, t: performance.now() };
    }
    this.refreshGhost();
  }

  /** Recompute the ghost at the pointer: where, and why not. */
  refreshGhost() {
    const sim = this.sim;
    const pl = this.placing;
    const r = this.game.renderer;
    if (!sim || !pl || !this.mouse.inside) {
      r.ghost = null;
      return;
    }
    const { x, y } = this.mouse;
    let why = this.overHud(x, y) ? 'Behind the buttons' : '';
    if (!why) {
      const k = pl.slot >= 0 ? (sim.betweenWaves ? sim.canPlace(x, y, pl.slot) : 'wave') : sim.canPlace(x, y);
      why = k ? PLACE_WHY[k] : '';
    }
    const def = CAT_BY_ID[pl.cat];
    const cost = def.tiers[0].cost;
    if (!why && pl.slot < 0 && sim.treats < cost) why = `Need ${cost} 🐟`;
    const t = pl.slot >= 0 ? sim.towers[pl.slot] : null;
    const range = t ? sim.rangeOf(t) : def.tiers[0].range;
    r.ghost = { cat: pl.cat, x, y, why, label: why || (pl.slot >= 0 ? 'Move here' : `${def.name} · ${cost} 🐟`), range, slot: pl.slot };
  }

  /** Try to seat / move the cat in hand at (x, y). @param {number} x @param {number} y @param {boolean} [keep] keep placing the same cat */
  commitPlacing(x, y, keep = false) {
    const sim = this.sim;
    const pl = this.placing;
    if (!sim || !pl) return;
    this.mouse = { x, y, inside: true, t: performance.now() };
    this.refreshGhost();
    const why = this.game.renderer.ghost?.why;
    if (why) {
      this.toast(`🙀 ${why}`, 1.4);
      sfx('pop', { pitch: 0.5 });
      if (pl.drag) pl.drag = false;
      return;
    }
    if (pl.slot >= 0) {
      if (sim.move(pl.slot, x, y) === '') {
        sfx('pop', { pitch: 1.3 });
        const slot = pl.slot;
        this.cancelPlacing();
        this.openCard(slot);
      }
      return;
    }
    const slot = sim.place(pl.cat, x, y);
    if (slot < 0) return;
    const cost = CAT_BY_ID[pl.cat].tiers[0].cost;
    if (keep && sim.treats >= cost) {
      pl.drag = false;
      this.refreshGhost();
    } else this.cancelPlacing();
  }

  cancelPlacing() {
    this.placing = null;
    this.game.renderer.ghost = null;
    for (const b of this.tray.querySelectorAll('.tray-btn.on')) b.classList.remove('on');
  }

  /** @param {KeyboardEvent} e */
  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.active) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.aiming) this.aiming = false;
      else if (this.placing) this.cancelPlacing();
      else if (this.game.renderer.heroSelected) this.game.renderer.heroSelected = false;
      else if (this.menu !== 'none') this.closeMenus();
      else if (!this.ended) this.togglePause();
      e.preventDefault();
      return;
    }
    if (!this.overlay.hidden && k !== ' ') return;
    // Keyboard placing: arrows nudge the cat in hand (Shift = bigger steps), Enter seats it.
    if (this.placing && (k.startsWith('arrow') || k === 'enter')) {
      e.preventDefault();
      if (k === 'enter') return this.commitPlacing(this.mouse.x, this.mouse.y, e.shiftKey);
      const step = e.shiftKey ? 90 : 30;
      const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
      const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
      this.mouse = { x: Math.max(0, Math.min(1920, this.mouse.x + dx)), y: Math.max(0, Math.min(1080, this.mouse.y + dy)), inside: true, t: performance.now() };
      this.refreshGhost();
      return;
    }
    // Keyboard reach for seated cats: Tab / Shift+Tab walk them (when focus isn't already inside a menu).
    if (k === 'tab' && !this.menus.contains(document.activeElement) && !this.tray.contains(document.activeElement)) {
      if (!this.sim?.towers.some(Boolean)) return;
      e.preventDefault();
      this.cycleSpot(e.shiftKey ? -1 : 1);
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      if (!this.ended) this.togglePause();
    } else if (k === 'f') this.game.cycleSpeed();
    else if (k === 'm') this.toggleMute();
    else if (k === 'q') this.firePower('zoomies');
    else if (k === 'w') {
      if (this.mouse.inside && performance.now() - this.mouse.t < 4000) this.firePower('mug', this.mouse.x, this.mouse.y);
      else this.startAim();
    } else if (k === 'e') this.firePower('yowl');
    else if (k === 'z') this.heroAbility('a1');
    else if (k === 'x') this.heroAbility('a2');
    else if (k === 'h' && this.sim?.hero?.alive) {
      this.closeMenus();
      this.game.renderer.heroSelected = !this.game.renderer.heroSelected;
    } else if (/^[1-8]$/.test(k) && this.sim) {
      const cat = this.sim.level.cats[Number(k) - 1];
      if (cat) this.startPlacing(cat, -1, false);
    } else if (k === 'u' && this.menu === 'card') {
      const t = this.sim?.towers[this.selected];
      if (t && nextTiers(t.tier).length === 1) this.upgrade(this.selected);
    } else if (k === 's' && this.menu === 'card') this.sell(this.selected);
    else if (k === 'g' && this.menu === 'card') {
      const t = this.sim?.towers[this.selected];
      if (t) this.startPlacing(t.cat, this.selected, false);
    }
  }

  /** @param {MouseEvent} e */
  onHudClick(e) {
    unlockAudio();
    const el = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-act],[data-power],[data-ability]'));
    if (!el || !this.sim) return;
    if (el.dataset.ability) {
      this.heroAbility(/** @type {'a1'|'a2'} */ (el.dataset.ability));
      return;
    }
    const pw = el.dataset.power;
    if (pw) {
      if (pw === 'mug') this.aiming ? (this.aiming = false) : this.startAim();
      else this.firePower(/** @type {any} */ (pw));
      return;
    }
    switch (el.dataset.act) {
      case 'hero':
        if (this.sim.hero?.alive) {
          this.closeMenus();
          this.game.renderer.heroSelected = !this.game.renderer.heroSelected;
        }
        break;
      case 'call': {
        const bonus = this.sim.callEarly();
        if (bonus > 0) this.toast(`Early bird bonus: +${bonus} 🐟`, 2);
        sfx('coin');
        break;
      }
      case 'speed':
        this.game.cycleSpeed();
        break;
      case 'pause':
        this.togglePause();
        break;
      case 'mute':
        this.toggleMute();
        break;
    }
  }

  startAim() {
    if (!this.sim || this.sim.powerCd.mug > 0) return;
    this.closeMenus();
    this.aiming = true;
    this.toast('Click where the mug should fall ☕ (Esc to cancel)', 2);
  }

  /** @param {import('../sim/sim.js').PowerId} id @param {number} [x] @param {number} [y] */
  firePower(id, x, y) {
    const sim = this.sim;
    if (!sim || this.game.paused || this.ended) return;
    if (sim.challenge === 'iron') {
      this.toast('🛡️ Iron Cat: no Cat Powers in this challenge.', 1.8);
      return;
    }
    if (sim.powerCd[id] > 0) {
      this.toast(`${POWERS[id].name} is recharging… (${Math.ceil(sim.powerCd[id])}s)`, 1.5);
      return;
    }
    if (sim.usePower(id, x, y)) {
      this.aiming = false;
      sfx('pop');
    }
  }

  /** @param {'a1'|'a2'} which */
  heroAbility(which) {
    const sim = this.sim;
    const h = sim?.hero;
    if (!sim || !h || this.game.paused || this.ended) return;
    const meta = HERO_ART[h.id]?.hero;
    const name = meta?.abilities.find((a) => a.id === which)?.name ?? 'Ability';
    if (!h.alive) return this.toast('Your hero is napping.', 1.4);
    if (h[which] > 0) return this.toast(`${name} is recharging… (${Math.ceil(h[which])}s)`, 1.4);
    if (!sim.heroAbility(which)) this.toast(`${name}: nothing in reach. Move closer to the action!`, 1.8);
  }

  /** Keyboard: select the next/previous seated cat and open its card. @param {number} dir */
  cycleSpot(dir) {
    const sim = this.sim;
    if (!sim) return;
    const n = sim.towers.length;
    let i = this.selected;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (sim.towers[i]) break;
    }
    if (!sim.towers[i]) return;
    this.openCard(i);
    const first = /** @type {HTMLElement|null} */ (this.menus.querySelector('.up-btn, .cu-close'));
    first?.focus({ preventScroll: true });
  }

  toggleMute() {
    setMuted(!isMuted());
    window.dispatchEvent(new CustomEvent('cata:mute', { detail: isMuted() }));
  }

  togglePause() {
    if (this.game.paused) this.resume();
    else this.showPause();
  }

  // ───────────────────────── upgrade / sell / move ─────────────────────────
  /** @param {number} spot @param {number} [branch] */
  upgrade(spot, branch) {
    const sim = this.sim;
    if (!sim) return;
    const cost = sim.upgradeCost(spot, branch);
    if (cost === null) return;
    if (sim.treats < cost) {
      this.toast(`Need ${cost} 🐟 for that upgrade`, 1.5);
      return;
    }
    sim.upgrade(spot, branch);
    this.openCard(spot);
  }

  /** @param {number} spot */
  sell(spot) {
    const sim = this.sim;
    if (!sim || !sim.towers[spot]) return;
    sim.sell(spot);
    this.closeMenus();
  }

  closeMenus() {
    this.cancelPlacing();
    this.menus.innerHTML = '';
    this.menu = 'none';
    this.selected = -1;
    this.game.renderer.preview = null;
    this.game.renderer.selectedSpot = -1;
  }

  /** Place a menu element near a stage point, clamped inside the stage. @param {HTMLElement} el @param {number} x @param {number} y @param {number} w @param {number} hgt */
  place(el, x, y, w, hgt) {
    const left = Math.max(10, Math.min(1920 - w - 10, x));
    const top = Math.max(10, Math.min(1080 - hgt - 10, y));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  /** @param {number} spot */
  openCard(spot) {
    const sim = this.sim;
    if (!sim) return;
    const t = sim.towers[spot];
    if (!t) {
      this.closeMenus();
      return;
    }
    if (this.placing) this.cancelPlacing();
    this.menus.innerHTML = '';
    this.selected = spot;
    this.menu = 'card';
    this.cardSig = `${t.id}:${t.tier}:${t.mode}:${Math.floor(sim.treats)}:${sim.betweenWaves}`;
    const def = t.def;
    const artTier = CAT_ART[t.cat]?.tiers?.find((x) => x.id === TIER_LABELS[t.tier]);
    const url = catPortrait(t.cat);
    const opts = nextTiers(t.tier);
    let up = '';
    if (!opts.length) up = '<div class="up-max">★ Max level! Absolutely magnificent.</div>';
    for (const n of opts) {
      const s = def.tiers[n];
      const poor = sim.treats < s.cost;
      up += `<button class="btn up-btn${poor ? ' poor' : ''}" data-up="${n}" aria-label="Upgrade to ${TIER_LABELS[n]} ${esc(s.name)} for ${s.cost} treats"><span class="up-tier">${TIER_LABELS[n]}</span> <span class="up-name">${esc(s.name)}</span><span class="up-cost">${s.cost} 🐟</span><span class="up-stats">${esc(statLine(def, s))}</span></button>`;
    }
    const aims = def.kind === 'barracks' || def.kind === 'flop' ? TARGET_MODES.filter((m) => m !== 'last') : TARGET_MODES;
    const modes = def.kind === 'barracks' ? '' : `<div class="modes" role="group" aria-label="Targeting">${aims.map((m) => `<button class="chip${t.mode === m ? ' on' : ''}" data-mode="${m}" aria-pressed="${t.mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>`;
    const refund = Math.floor(t.spent * SELL_REFUND);
    const canMove = sim.betweenWaves;
    const card = h(`<div class="card-up" role="dialog" aria-label="${esc(def.name)} upgrades">
      <span class="tape"></span>
      <div class="cu-head">${url ? `<img src="${url}" alt="">` : `<span class="rad-emoji">${def.icon}</span>`}<div><b>${esc(def.name)}</b><small>${esc(artTier?.label ?? TIER_LABELS[t.tier] + ' · ' + t.s.name)}</small></div><button class="cu-close" aria-label="Close upgrade card">✕</button></div>
      <div class="cu-stats">${esc(statLine(def, t.s))}${t.kills ? ` · 🏆 ${t.kills}` : ''}</div>
      <div class="cu-up">${up}</div>
      ${modes}
      <div class="cu-foot"><button class="btn move${canMove ? '' : ' poor'}" data-move aria-label="Move this cat (free between waves)" title="${canMove ? 'Pick a new spot (free between waves)' : 'Cats can only move between waves'}">↔ Move</button><button class="btn sell" data-sell aria-label="Sell for ${refund} treats">Sell +${refund} 🐟</button><span class="cu-hint">U upgrade · G move · S sell · Tab next cat</span></div>
    </div>`);
    card.addEventListener('click', (e) => {
      const el = /** @type {HTMLElement} */ (e.target).closest('button');
      if (!el) return;
      if (el.classList.contains('cu-close')) this.closeMenus();
      else if (el.dataset.up) this.upgrade(spot, Number(el.dataset.up));
      else if (el.dataset.mode) {
        sim.setTargeting(spot, /** @type {any} */ (el.dataset.mode));
        this.openCard(spot);
      } else if (el.hasAttribute('data-move')) this.startPlacing(t.cat, spot, false);
      else if (el.hasAttribute('data-sell')) this.sell(spot);
    });
    const W = 400;
    const H = 330;
    this.place(card, t.x > 1200 ? t.x - W - 90 : t.x + 90, t.y - H / 2 - 40, W, H);
    this.menus.appendChild(card);
  }

  // ───────────────────────── overlays ─────────────────────────
  hideOverlay() {
    this.overlay.hidden = true;
    this.overlay.innerHTML = '';
  }

  showPause() {
    if (!this.active || this.ended) return;
    this.game.setPaused(true);
    this.closeMenus();
    this.overlay.innerHTML = '';
    const quitLabel = this.hooks.interactive ? '🗺 Back to Map' : '☰ Quit to levels';
    const el = h(`<div class="panel pause" role="dialog" aria-label="Paused"><span class="tape"></span>
      <h2>Paused</h2><p class="muted">The cats are napping. As one does.</p>
      <div class="col">
        <button class="btn primary big" data-o="resume">▶ Resume</button>
        <button class="btn" data-o="restart">↻ Restart level</button>
        <button class="btn" data-o="settings">⚙ Settings</button>
        <button class="btn" data-o="quit">${quitLabel}</button>
      </div>
      <p class="tip">${esc(TIPS[this.tipIdx++ % TIPS.length])}</p></div>`);
    el.addEventListener('click', (e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('[data-o]');
      if (!b) return;
      const o = /** @type {HTMLElement} */ (b).dataset.o;
      if (o === 'resume') this.resume();
      if (o === 'restart') this.hooks.onRestart();
      if (o === 'settings') this.hooks.onSettings?.();
      if (o === 'quit') this.hooks.onQuit();
    });
    this.overlay.appendChild(el);
    this.overlay.hidden = false;
    /** @type {HTMLElement} */ (el.querySelector('[data-o="resume"]')).focus();
  }

  resume() {
    this.hideOverlay();
    this.game.setPaused(false);
  }

  /**
   * @param {{won:boolean, stars:number, nextId?:string|null, endless?:{waves:number, best:number, newBest:boolean},
   *   challenge?: 'iron'|'nap'|null, hero?: string|null}} r
   */
  showResults(r) {
    const sim = this.sim;
    this.overlay.innerHTML = '';
    const stars = [1, 2, 3].map((i) => `<span class="star${i <= r.stars ? ' on' : ''}" style="--d:${i * 0.25}s">★</span>`).join('');
    const stats = sim ? `🏆 ${sim.stats.kills} defeated · 🍙 ${sim.lives}/${sim.maxLives} snacks left · ⏱ ${Math.floor(sim.time / 60)}:${String(Math.floor(sim.time % 60)).padStart(2, '0')}` : '';
    const chalName = r.challenge === 'iron' ? 'Iron Cat' : r.challenge === 'nap' ? 'Nap Time' : '';
    const chal = r.challenge
      ? r.won
        ? `<p class="chal-star" aria-label="Challenge star earned"><span class="star on" style="--d:1s">${r.challenge === 'iron' ? '🛡️' : '💤'}</span> ${chalName} challenge complete! +1 paw print</p>`
        : `<p class="muted">${chalName} challenge failed. The cats demand a rematch.</p>`
      : '';
    let body;
    if (r.endless) {
      body = `<h2>The laundry basket overflowed!</h2><p>You survived <b>${r.endless.waves}</b> waves. ${r.endless.newBest ? '🎉 New high score!' : `Best: ${r.endless.best}`}</p>`;
    } else if (r.won) {
      body = `<h2>The snacks are safe!</h2><div class="stars" aria-label="${r.stars} of 3 stars">${stars}</div><p>${esc(VICTORY_LINES[0])}</p>${chal}`;
    } else {
      body = `<h2>The snacks have been eaten.</h2><p>The cats are… disappointed in you.</p><p class="muted">${esc(DEFEAT_LINES[0])}</p>${chal}`;
    }
    let buttons;
    if (this.hooks.interactive) {
      buttons = `<button class="btn primary big" data-o="map">🗺 Back to Map</button><button class="btn" data-o="retry">↻ Retry</button>`;
    } else {
      const next = r.won && r.nextId ? `<button class="btn primary big" data-o="next">Next level ▶</button>` : '';
      buttons = `${next}<button class="btn${r.won && r.nextId ? '' : ' primary big'}" data-o="retry">↻ Retry</button><button class="btn" data-o="levels">☰ Levels</button>`;
    }
    const el = h(`<div class="panel results ${r.won ? 'win' : 'lose'}" role="dialog" aria-label="Results"><span class="tape"></span>${body}<p class="muted small">${stats}</p>
      <div class="row">${buttons}</div></div>`);
    el.addEventListener('click', (e) => {
      const b = /** @type {HTMLElement} */ (e.target).closest('[data-o]');
      if (!b) return;
      const o = /** @type {HTMLElement} */ (b).dataset.o;
      if (o === 'next' && r.nextId) this.hooks.onNext(r.nextId);
      if (o === 'retry') this.hooks.onRestart();
      if (o === 'levels' || o === 'map') this.hooks.onQuit();
    });
    this.overlay.appendChild(el);
    this.overlay.hidden = false;
    /** @type {HTMLElement|null} */ (el.querySelector('.btn.primary'))?.focus({ preventScroll: true });
  }
}
