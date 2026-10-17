// @ts-check
// Game controller: owns the sim + renderer, runs the fixed-step loop at 1×/2×/3×, feeds events to UI/audio.
import { Sim, DT } from '../sim/sim.js';
import { AutoBot } from '../sim/autobot.js';
import { Renderer } from './renderer.js';
import { getLayout, getRoom } from '../data/layout.js';
import { LEVEL_BY_ID } from '../data/levels.js';
import { CAT_IDS } from '../data/ids.js';
import { STAGE_W, STAGE_H } from '../art/rooms/common.js';
import { sfx } from '../audio/sfx.js';
import { isHalloween } from '../core/season.js';

/** @typedef {import('../data/levels.js').LevelDef} LevelDef */

const PITCH = { pudding: 1, 'granny-purl': 0.85, 'mama-mittens': 0.95, sriracha: 1.6, whiskerton: 1.1, 'maneki-mochi': 1.2, chonkington: 0.65, 'dr-nip': 1.05 };

export class Game {
  /**
   * @param {{stage: HTMLElement, canvas: HTMLCanvasElement, debug?: boolean, autoplay?: boolean, reducedMotion?: boolean,
   *   onArtError?: (id:string, err:unknown)=>void, onAutosave?: (level: LevelDef, snap: any)=>void}} o
   */
  constructor(o) {
    this.o = o;
    this.stage = o.stage;
    this.renderer = new Renderer(o.canvas, { debug: o.debug, reducedMotion: o.reducedMotion, onArtError: o.onArtError });
    /** @type {Sim|null} */
    this.sim = null;
    /** @type {LevelDef|null} */
    this.level = null;
    /** @type {'none'|'diorama'|'level'} */
    this.mode = 'none';
    this.speed = 1;
    this.paused = false;
    this.frozen = false; // Boss Key: skip all work
    /** @type {AutoBot|null} */
    this.bot = null;
    this.acc = 0;
    this.last = performance.now();
    this.k = 1;
    this.hz = 1;
    /** @type {Set<(ev:any)=>void>} */
    this.listeners = new Set();
    /** @type {Set<(dt:number)=>void>} */
    this.frameListeners = new Set();
    this.saveDue = false;
    this.fps = 60;
    this.perf = { sim: 0, upd: 0, draw: 0, frames: 0 };
    this.layout();
    window.addEventListener('resize', () => this.layout());
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Letterbox the 1920×1080 stage into the window. */
  layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const k = Math.min(w / STAGE_W, h / STAGE_H);
    const sw = Math.floor(STAGE_W * k);
    const sh = Math.floor(STAGE_H * k);
    this.k = sw / STAGE_W;
    Object.assign(this.stage.style, { width: sw + 'px', height: sh + 'px', left: Math.floor((w - sw) / 2) + 'px', top: Math.floor((h - sh) / 2) + 'px' });
    this.stage.style.setProperty('--k', String(this.k));
    // Small screens: grow the HUD so buttons stay finger-sized (~44 CSS px) and switch to the phone layout.
    const hz = Math.max(1, Math.min(1.7, 0.58 / this.k));
    this.hz = hz >= 1.15 ? hz : 1;
    this.stage.style.setProperty('--hz', this.hz.toFixed(3));
    document.body.classList.toggle('phone', this.hz > 1);
    // No letterbox margin beside the stage: the window-pinned Boss Key button would sit on top of the HUD.
    document.body.classList.toggle('edge', (w - sw) / 2 < 52);
    this.renderer.resize(sw, sh);
  }

  /** Client (window) coordinates → stage coordinates. @param {number} cx @param {number} cy */
  toStage(cx, cy) {
    const r = this.stage.getBoundingClientRect();
    return { x: (cx - r.left) / this.k, y: (cy - r.top) / this.k };
  }

  /**
   * @param {LevelDef} level @param {any} [snapshot]
   * @param {{hero?: string|null, challenge?: 'iron'|'nap'|null, hats?: Record<string, string>}} [opts]
   */
  startLevel(level, snapshot, opts = {}) {
    const layout = getLayout(level);
    const room = getRoom(level);
    this.sim = snapshot ? Sim.restore(snapshot, { level, layout }) : new Sim({ level, layout, hero: opts.hero ?? null, challenge: opts.challenge ?? null });
    this.level = level;
    this.renderer.setScene(this.sim, room, layout, { hats: opts.hats });
    this.bot = this.o.autoplay ? new AutoBot(this.sim) : null;
    if (this.o.autoplay) this.speed = 3;
    this.mode = 'level';
    this.paused = false;
    this.acc = 0;
    this.renderer.highlightEmpty = !this.sim.towers.some(Boolean);
  }

  /** Title/level-grid backdrop: 1-1 with a few cats napping, no waves. */
  diorama() {
    const base = LEVEL_BY_ID['1-1'];
    const level = { ...base, cats: [...CAT_IDS], startTreats: 99999 };
    const layout = getLayout(base);
    const sim = new Sim({ level, layout, events: false });
    const picks = ['pudding', 'granny-purl', 'chonkington', 'maneki-mochi', 'sriracha', 'mama-mittens'];
    layout.spots.forEach((_, i) => {
      if (i % 2 === 0 && picks.length) sim.build(i, /** @type {string} */ (picks.shift()));
    });
    sim.towers.forEach((t, i) => {
      if (t) t.idleT = i * 3; // some already sleepy
    });
    sim.autoStartIn = null;
    this.sim = sim;
    this.level = level;
    this.renderer.setScene(sim, getRoom(base), layout, { costumes: isHalloween() });
    this.bot = null;
    this.mode = 'diorama';
    this.paused = false;
    this.renderer.highlightEmpty = false;
  }

  /** @param {boolean} p */
  setPaused(p) {
    this.paused = p;
  }

  cycleSpeed() {
    this.speed = this.speed >= 3 ? 1 : this.speed + 1;
    return this.speed;
  }

  /** @param {(ev:any)=>void} fn */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Is the stage point on the hero? @param {number} x @param {number} y */
  heroAt(x, y) {
    const h = this.sim?.hero;
    if (!h || !h.alive) return false;
    return Math.abs(x - h.x) < 55 && y < h.y + 30 && y > h.y - 110;
  }

  /** @param {number} now */
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    if (this.frozen || this.mode === 'none' || !this.sim) return;
    const sim = this.sim;
    const running = this.mode === 'level' && !this.paused && sim.phase !== 'won' && sim.phase !== 'lost';
    if (running) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= DT && steps < 14) {
        this.bot?.update();
        const s0 = performance.now();
        sim.step();
        this.perf.sim += performance.now() - s0;
        this.drain();
        this.acc -= DT;
        steps++;
      }
      if (steps >= 14) this.acc = 0;
      if (this.saveDue) {
        this.saveDue = false;
        if (sim.phase === 'wave' && this.level && this.o.onAutosave) this.o.onAutosave(this.level, sim.serialize());
      }
    }
    if (this.mode === 'diorama') {
      // Keep the napping cats sleepy-ish and mostly idle.
      for (const t of sim.towers) if (t) t.idleT += dt;
    }
    const animDt = this.paused ? 0 : dt * (running ? this.speed : 1);
    const u0 = performance.now();
    this.renderer.update(animDt);
    const u1 = performance.now();
    this.renderer.draw();
    this.perf.upd += u1 - u0;
    this.perf.draw += performance.now() - u1;
    this.perf.frames++;
    for (const f of this.frameListeners) f(dt);
  }

  drain() {
    const sim = /** @type {Sim} */ (this.sim);
    if (!sim.events.length) return;
    for (const ev of sim.events) {
      this.renderer.onEvent(ev);
      this.sound(ev);
      if (ev.type === 'wave' || ev.type === 'waveClear') this.saveDue = true;
      if (ev.type === 'place') this.renderer.highlightEmpty = false;
      for (const l of this.listeners) l(ev);
    }
    sim.events.length = 0;
  }

  /** @param {any} ev */
  sound(ev) {
    switch (ev.type) {
      case 'place':
        sfx('meow', { pitch: /** @type {Record<string, number>} */ (PITCH)[ev.cat] ?? 1, gap: 0.2 });
        break;
      case 'upgrade':
        sfx('boing');
        break;
      case 'sell':
        sfx('coin');
        break;
      case 'attack':
        if (ev.kind === 'hiss') sfx('hiss', { gap: 0.5 });
        break;
      case 'hit':
        if (this.sim?.enemyById.get(ev.eid)?.type === 'rubber-duckie') sfx('squeak', { gap: 0.08 });
        break;
      case 'kill':
        sfx('pop', { pitch: 0.8 + Math.random() * 0.5, gap: 0.05 });
        break;
      case 'leak':
        sfx('thoom', { gap: 0.2 });
        break;
      case 'befriend':
      case 'income':
        sfx('coin', { gap: 0.15 });
        break;
      case 'startle':
        sfx('hiss', { gap: 0.3 });
        break;
      case 'boom':
      case 'flopHit':
        sfx('thoom', { pitch: ev.type === 'flopHit' ? 1.4 : 0.8, gap: 0.15 });
        break;
      case 'mugHit':
        sfx('crash');
        break;
      case 'power':
        if (ev.id === 'zoomies') sfx('boing', { pitch: 1.4 });
        if (ev.id === 'yowl') sfx('meow', { pitch: 0.55 });
        break;
      case 'wave':
        sfx('drum');
        break;
      case 'win':
        sfx('win');
        break;
      case 'lose':
        sfx('lose');
        break;
      case 'heroAttack':
        sfx('pop', { pitch: 1.3, gap: 0.25 });
        break;
      case 'heroAbility':
        sfx('boing', { pitch: 1.2 });
        break;
      case 'heroLevel':
      case 'nineLives':
        sfx('coin');
        break;
      case 'heroDown':
        sfx('meow', { pitch: 0.7 });
        break;
      case 'unplug':
        sfx('crash');
        break;
      case 'mood':
      case 'screens':
        sfx('drum');
        break;
      case 'smoke':
      case 'sock':
        sfx('pop', { pitch: 0.7, gap: 0.2 });
        break;
    }
  }

  /** Slot of the seated cat under a stage point, or -1. @param {number} x @param {number} y */
  towerAt(x, y) {
    if (!this.sim) return -1;
    let best = -1;
    let bestD = Infinity;
    this.sim.towers.forEach((t, i) => {
      if (!t) return;
      const dx = Math.abs(x - t.x);
      const dy = y - t.y;
      const hit = dx < 62 && dy < 34 && dy > -105;
      const d = dx + Math.abs(dy + 40);
      if (hit && d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
}
