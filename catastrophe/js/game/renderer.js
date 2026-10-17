// @ts-check
// Canvas2D renderer: mirrors the sim (never mutates it). 1920×1080 logical stage, letterboxed, DPR ≤ 2.
import { CAT_ART, KITTEN_ART, ENEMY_ART, BOSS_ART, HERO_ART, HATS } from '../art/registry.js';
import { CatRig } from '../art/cats/catrig.js';
import { EnemyRig } from '../art/enemies/enemyrig.js';
import { Pen } from '../art/brush.js';
import { drawRoom, drawStash, drawSeat, STAGE_W, STAGE_H } from '../art/rooms/common.js';
import { TIER_LABELS } from '../data/cats.js';
import { quip } from '../data/quips.js';
import { Fx, drawText } from './fx.js';
import { costumeFor } from '../art/costumes.js';
import { pickLanterns, drawNightWash, drawLanterns, drawBats } from './spooky.js';

const CAT_PX = 76;
/** Per-frame rig-sprite repaint budget (ms of JS time), tuned at runtime between these bounds. */
const PAINT_BUDGET_MIN = 0.4;
const PAINT_BUDGET_MAX = 6;
const ENEMY_PX = 60;
const BOSS_PX = 180;
const KITTEN_NAMES = { beans: 'Beans', biscuit: 'Biscuit', noodle: 'Noodle', tofu: 'Tofu' };

/** @typedef {import('../sim/sim.js').Sim} Sim */
/** @typedef {import('../sim/sim.js').Tower} Tower */
/** @typedef {import('../sim/sim.js').Enemy} Enemy */

/**
 * @typedef {Object} CatView
 * @property {CatRig} rig @property {Tower} t @property {number} seen @property {number} pokeT
 * @property {number} jumpT @property {number} scale @property {string} tierLabel @property {any} [sprite]
 */
/**
 * @typedef {Object} EnemyView
 * @property {EnemyRig} rig @property {Enemy|null} e @property {string} id @property {number} x @property {number} y
 * @property {boolean} flip @property {number} scale @property {number} px @property {boolean} dead @property {boolean} leaked
 * @property {number} seen @property {number} hitT @property {number} lastHit @property {boolean} boss @property {any} [sprite]
 */

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{debug?:boolean, reducedMotion?:boolean, onArtError?:(id:string, err:unknown)=>void}} [o]
   */
  constructor(canvas, o = {}) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.debug = !!o.debug;
    this.reduced = !!o.reducedMotion;
    this.onArtError = o.onArtError ?? (() => {});
    this.pen = new Pen(this.ctx);
    this.fx = new Fx({ reducedMotion: this.reduced });
    this.k = 1;
    this.dpr = 1;
    this.time = 0;
    /** @type {Sim|null} */
    this.sim = null;
    /** @type {import('../art/rooms/common.js').RoomSpec|null} */
    this.room = null;
    /** @type {import('../art/rooms/common.js').Layout|null} */
    this.layout = null;
    /** performance.now() until which a placement quip is still on screen */
    this.quipUntil = 0;
    /** @type {Map<number, CatView>} */
    this.cats = new Map();
    /** @type {Map<number, {rig: CatRig, scale:number, pokeT:number, sprite?: any}>} */
    this.kits = new Map();
    /** @type {Map<number, EnemyView>} */
    this.enemies = new Map();
    /** @type {{y:number, kind:number, ref:any}[]} */
    this.list = [];
    this.listN = 0;
    this.frame = 0;
    /** Selected / hovered cat slot (-1 = none). */
    this.selectedSpot = -1;
    this.hoverSpot = -1;
    /** @type {{spot:number, range:number}|null} */
    this.preview = null;
    /**
     * Placement ghost while seating or moving a cat: why = '' when the spot is fine.
     * @type {{cat:string, x:number, y:number, why:string, label:string, range:number, slot:number}|null}
     */
    this.ghost = null;
    /** @type {{cat:string, rig:CatRig, scale:number, pokeT:number, sprite?:any}|null} */
    this.ghostView = null;
    /** Tutorial suggestion: a pulsing paw ring on the ground. @type {{x:number, y:number, label:string}|null} */
    this.hint = null;
    /** @type {{x:number, y:number, r:number}|null} */
    this.aim = null;
    this.highlightEmpty = false;
    /** @type {'none'|'win'|'lose'} */
    this.ending = 'none';
    /** @type {Set<string>} */
    this.failed = new Set();
    this.hadError = false;
    // Adaptive room caching: draw live if cheap, else redraw into caches at the ink-boil cadence.
    this.roomCost = 0;
    this.roomSamples = 0;
    this.cacheMode = false;
    this.cacheT = -1;
    this.back = document.createElement('canvas');
    this.front = document.createElement('canvas');
    /** @type {CatRig|null} */
    this.zoomie = null;
    /** @type {Map<number, number>} */
    this.runnerPrevX = new Map();
    this.drawMs = 0;
    /** @type {HTMLCanvasElement[]} */
    this.pool = [];
    this.cacheMs = 0;
    this.cacheN = 0;
    /** Rig repaint time spent this frame, and the adaptive per-frame budget for it (see adaptPaintBudget). */
    this.paintMs = 0;
    this.paintBudget = 3;
    this.lastDrawAt = 0;
    this.frameSum = 0;
    this.frameN = 0;
    this.baseDt = 1000 / 60;
    /** Wardrobe: catId|heroId → hatId. @type {Record<string, string>} */
    this.hats = {};
    /** Halloween costumes replace Wardrobe hats (Haunted Hayride, October title diorama). */
    this.costumes = false;
    /** Haunted Hayride night mood: jack-o'-lantern spots, or null when off. @type {import('./spooky.js').Lantern[]|null} */
    this.spooky = null;
    /** @type {{rig: CatRig, scale:number, pokeT:number, sprite?: any, id:string, name:string}|null} */
    this.heroView = null;
    this.heroSelected = false;
    this.colorblind = false;
    /** Screens telegraph: path index that opens next (2-1), or -1. */
    this.screensWarn = -1;
  }

  /** Apply settings live. @param {{reducedMotion?: boolean, shake?: boolean, colorblind?: boolean}} s */
  applySettings(s) {
    this.reduced = !!s.reducedMotion;
    this.fx.reduced = this.reduced;
    this.fx.shakeOn = s.shake !== false;
    this.colorblind = !!s.colorblind;
    this.cacheT = -1;
  }

  /** Wardrobe hat accessory for a cat/hero id, if one is equipped. @param {string} id */
  hatFor(id) {
    if (this.costumes) return costumeFor(id);
    const hat = HATS?.[this.hats[id]];
    return hat ? [{ layer: 'head', hat: true, draw: hat.draw }] : [];
  }

  /**
   * @param {Sim} sim @param {import('../art/rooms/common.js').RoomSpec} room @param {import('../art/rooms/common.js').Layout} layout
   * @param {{hats?: Record<string, string>, costumes?: boolean}} [o] costumes: everyone wears a Halloween costume
   */
  setScene(sim, room, layout, o = {}) {
    this.hats = o.hats ?? {};
    const haunted = sim.level?.id === 'halloween';
    this.costumes = !!o.costumes || haunted;
    this.spooky = haunted ? pickLanterns(sim.tracks, layout) : null;
    this.heroView = null;
    this.heroSelected = false;
    this.screensWarn = -1;
    this.sim = sim;
    this.room = room;
    this.layout = layout;
    this.cats.clear();
    this.kits.clear();
    this.enemies.clear();
    this.fx.clear();
    this.ending = 'none';
    this.selectedSpot = -1;
    this.hoverSpot = -1;
    this.preview = null;
    this.ghost = null;
    this.hint = null;
    this.release(this.ghostView);
    this.ghostView = null;
    this.aim = null;
    this.roomCost = 0;
    this.roomSamples = 0;
    this.cacheMode = false;
    this.cacheT = -1;
  }

  /** Size the backing store for a stage that is w×h CSS px on screen. @param {number} w @param {number} h */
  resize(w, h) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.k = w / STAGE_W;
    const pw = Math.max(1, Math.round(w * this.dpr));
    const ph = Math.max(1, Math.round(h * this.dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
      this.back.width = this.front.width = pw;
      this.back.height = this.front.height = ph;
      this.cacheT = -1;
    }
  }

  /** @param {string} id @param {unknown} err */
  artFail(id, err) {
    this.hadError = true;
    if (this.failed.has(id)) return;
    this.failed.add(id);
    console.warn('[render] art failed for', id, err);
    this.onArtError(id, err);
  }

  // ───────────────────────── events ─────────────────────────
  /** @param {any} ev */
  onEvent(ev) {
    const fx = this.fx;
    const sim = this.sim;
    if (!sim) return;
    switch (ev.type) {
      case 'attack': {
        const v = this.viewOfTower(ev.tid);
        if (!v) break;
        const rapid = (v.t.s.rate ?? 1) < 0.5;
        if (ev.kind === 'flop') v.jumpT = 0.001;
        if (ev.kind === 'hiss') fx.link('hiss', v.t.x + 12, v.t.y - 44, ev.x, ev.y - 24, 0.14);
        if (ev.kind === 'banshee') fx.ring(v.t.x, v.t.y - 30, 240, '#E2463A', 0.6);
        if (ev.kind === 'disco') fx.burst(v.t.x, v.t.y - 60, 10, ['#F4A6B7', '#BFE3F2', '#FFE58A', '#BFE6D3'], 160);
        const act = v.rig.spec.actions?.attack;
        if (act && !v.rig.action && Math.random() < (rapid ? 0.06 : 0.3)) v.rig.play('attack');
        else if (this.time - v.pokeT > 0.4) {
          v.pokeT = this.time;
          v.rig.poke();
        }
        break;
      }
      case 'hit': {
        const v = this.enemies.get(ev.eid);
        if (v && this.time - v.hitT > 0.12) {
          v.hitT = this.time;
          v.rig.hit();
        }
        if (ev.crit) fx.text(Math.round(ev.amount) + '!', ev.x, ev.y - 70, '#D2483C', 30, 0.8);
        else if (ev.amount >= 40) fx.text(String(Math.round(ev.amount)), ev.x + 14, ev.y - 64, '#3B3A4A', 20, 0.6);
        break;
      }
      case 'kill': {
        const v = this.enemies.get(ev.eid);
        if (v && !v.dead) {
          v.dead = true;
          v.rig.die();
        }
        fx.text('+' + ev.bounty + ' 🐟', ev.x, ev.y - 80, '#C98A1B', ev.boss ? 44 : 22, 1.1);
        if (ev.id === 'party-pooper') fx.burst(ev.x, ev.y - 40, 18, ['#F4A6B7', '#FFE58A', '#BFE3F2', '#BFE6D3', '#D9CCF2'], 260);
        if (ev.boss) {
          fx.addShake(16);
          fx.burst(ev.x, ev.y - 90, 40, ['#FFE58A', '#F4A6B7', '#BFE6D3'], 380);
          fx.add('flash', 0, 0, 0.5).color = '#FFF6B8';
        }
        break;
      }
      case 'leak': {
        const v = this.enemies.get(ev.eid);
        if (v) v.leaked = true;
        const st = this.layout?.stash ?? { x: 1700, y: 540 };
        if (ev.stolen) fx.text('-' + ev.stolen + ' 🐟 (Final notice!)', st.x - 60, st.y - 90, '#D2483C', 26, 1.6);
        else if (ev.snacks) fx.text('-' + ev.snacks + ' 🍙 nom!', st.x, st.y - 80, '#D2483C', 28, 1.3);
        fx.addShake(5);
        break;
      }
      case 'befriend': {
        const v = this.enemies.get(ev.eid);
        if (v && !v.dead) {
          v.dead = true;
          v.rig.die(); // Good Boy's "defeat" is a happy belly-flop + fade
        }
        for (let i = 0; i < 4; i++) fx.add('heart', ev.x + (i - 1.5) * 16, ev.y - 70, 1.4);
        fx.text('Good boy! +' + ev.bounty + ' 🐟', ev.x, ev.y - 100, '#C98A1B', 26, 1.6);
        break;
      }
      case 'gone': {
        const v = this.enemies.get(ev.eid);
        if (v && !v.dead) {
          v.dead = true;
          v.rig.die();
        }
        break;
      }
      case 'reveal':
        fx.text('!', ev.x, ev.y - 90, '#D2483C', 44, 0.9);
        break;
      case 'startle':
      case 'hide':
        for (const tid of ev.tids) {
          const v = this.viewOfTower(tid);
          if (!v) continue;
          v.rig.setExpression('startled');
          v.rig.say(ev.type === 'startle' ? 'SKREEE!' : 'eep!', 0, -300, 46);
        }
        break;
      case 'spray':
        for (const tid of ev.tids) {
          const v = this.viewOfTower(tid);
          if (v) fx.link('spray', ev.x, ev.y, v.t.x, v.t.y, 0.6);
        }
        break;
      case 'boom':
        fx.link('bolt', ev.x, ev.y - 40, ev.x, ev.y + 10, 0.3);
        fx.add('flash', 0, 0, 0.25).color = '#FFFDF6';
        fx.text('BOOM.', ev.x, ev.y - 110, '#3B3A4A', 34, 0.9);
        break;
      case 'place': {
        if (ev.x !== undefined) {
          fx.burst(ev.x, ev.y - 10, 12, ['#FFFDF6', '#F4A6B7', '#FFE58A'], 180);
          // One speech quip on screen at a time so bubbles never pile up.
          const now = performance.now();
          if (now >= (this.quipUntil ?? 0)) {
            this.quipUntil = now + 2400;
            fx.text(quip(ev.cat, sim.stats.built + ev.spot), ev.x, ev.y - 110, '#3B3A4A', 20, 2.2);
          }
        }
        break;
      }
      case 'move': {
        const v = this.viewOfTower(ev.tid);
        if (v) {
          v.jumpT = 0.4;
          v.rig.poke();
        }
        fx.burst(ev.fromX, ev.fromY - 10, 8, ['#FFFDF6', '#E9E4D8'], 120);
        fx.burst(ev.x, ev.y - 10, 10, ['#FFFDF6', '#F4A6B7', '#FFE58A'], 160);
        break;
      }
      case 'upgrade': {
        const v = this.viewOfTower(ev.tid);
        if (v) {
          v.rig.poke();
          v.rig.setExpression('celebrate');
          fx.burst(v.t.x, v.t.y - 50, 16, ['#FFE58A', '#F2C14E', '#FFFDF6'], 220);
          fx.text(v.t.s.name, v.t.x, v.t.y - 112, '#3B3A4A', 22, 1.6);
        }
        break;
      }
      case 'sell': {
        if (ev.x !== undefined) {
          fx.text('+' + ev.refund + ' 🐟  *sigh*', ev.x, ev.y - 90, '#C98A1B', 22, 1.4);
          fx.burst(ev.x, ev.y - 20, 10, ['#FFFDF6', '#E9E4D8'], 140);
        }
        break;
      }
      case 'flopHit':
        fx.ring(ev.x, ev.y, ev.r * 1.3, '#FFE58A', 0.5);
        fx.text('FLOMP!', ev.x, ev.y - 60, '#3B3A4A', 30, 0.8);
        fx.addShake(5);
        break;
      case 'mugHit':
        fx.ring(ev.x, ev.y, ev.r * 1.4, '#FFFDF6', 0.6);
        fx.burst(ev.x, ev.y - 10, 22, ['#FFFDF6', '#F4A6B7', '#C9C3B8'], 320);
        fx.text('CRASH!', ev.x, ev.y - 70, '#D2483C', 40, 1);
        fx.addShake(10);
        break;
      case 'redDot':
        fx.add('reticle', ev.x, ev.y, 0.8).r = 60;
        break;
      case 'redDotHit':
        fx.add('skybeam', ev.x, ev.y, 0.5);
        fx.ring(ev.x, ev.y, ev.r * 1.2, '#E2463A', 0.5);
        fx.addShake(6);
        break;
      case 'power':
        if (ev.id === 'zoomies') fx.text('ZOOMIES!', 960, 200, '#E07D95', 64, 1.4);
        if (ev.id === 'mug') fx.add('mug', ev.x, ev.y, 0.45);
        if (ev.id === 'yowl') {
          fx.add('yowl', 960, 540, 1.4);
          fx.add('flash', 0, 0, 0.6).color = '#262A5C';
          fx.text('MRRROOOOWWW (3 AM)', 960, 220, '#8C84C9', 56, 1.6);
        }
        break;
      case 'cloud':
        fx.burst(ev.x, ev.y - 10, 8, ['#97C455', '#BFE6D3'], 120);
        break;
      case 'block':
        fx.text(ev.why === 'umbrella' ? 'brolly!' : 'tink!', ev.x, ev.y - 70, '#6B6A7C', 22, 0.7);
        break;
      case 'absorb':
        fx.text('sticky!', ev.x, ev.y - 70, '#6B6A7C', 22, 0.8);
        break;
      case 'split':
        fx.burst(ev.x, ev.y - 20, 20, ['#9FD3EA', '#FFFDF6', '#FFE58A'], 260);
        fx.text('SPLOOSH!', ev.x, ev.y - 90, '#3E7FA8', 34, 1);
        break;
      case 'enrage': {
        const e = sim.enemyById.get(ev.eid);
        if (e) fx.text('SNIP!!', e.x, e.y - 80, '#D2483C', 30, 1);
        break;
      }
      case 'surprise':
        fx.text(ev.kind === 'treats' ? 'Treats behind the door! +15 🐟' : 'Surprise! More cucumbers!', ev.x, ev.y - 100, '#3B3A4A', 24, 1.6);
        break;
      case 'box':
        fx.text('📦 The box it came in! Cats +25% speed', ev.x, ev.y - 100, '#3B3A4A', 22, 2);
        break;
      case 'phase': {
        const e = sim.enemyById.get(ev.eid);
        if (e) fx.text(ev.name + '!', e.x, e.y - 220, '#D2483C', 44, 1.8);
        fx.addShake(8);
        break;
      }
      case 'ability': {
        const e = sim.enemyById.get(ev.eid);
        if (e) fx.text(ev.name, e.x, e.y - 200, '#3B3A4A', 30, 1.4);
        break;
      }
      case 'heal': {
        fx.text('+' + Math.round(ev.amount) + ' (sad kibble)', ev.x, ev.y - 210, '#5E9A4E', 26, 1.2);
        break;
      }
      case 'kittenDown': {
        const t = sim.towers.find((q) => q && q.id === ev.tid);
        const name = /** @type {Record<string,string>} */ (KITTEN_NAMES)[ev.name] ?? 'Kitten';
        if (t) fx.text(name.toUpperCase() + '! WHAT DID I SAY!', t.x, t.y - 110, '#3B3A4A', 22, 1.6);
        fx.burst(ev.x, ev.y - 10, 8, ['#FFFDF6', '#C9C3B8'], 120);
        break;
      }
      case 'kittenAttack': {
        const kv = this.kits.get(ev.kid);
        if (kv && this.time - kv.pokeT > 0.35) {
          kv.pokeT = this.time;
          kv.rig.poke();
        }
        break;
      }
      case 'income': {
        const v = this.viewOfTower(ev.tid);
        if (v) {
          fx.text('+' + ev.amount + ' 🐟', v.t.x, v.t.y - 100, '#C98A1B', 26, 1.4);
          v.rig.say('ka-ching', 0, -300, 40);
        }
        break;
      }
      case 'win':
        this.ending = 'win';
        break;
      case 'lose':
        this.ending = 'lose';
        break;
      // ── gimmicks, moods, skills, bosses ──
      case 'screens':
        this.screensWarn = -1;
        fx.text('The screens slide open… 🚪', 960, 260, '#3B3A4A', 40, 2);
        break;
      case 'screensWarn':
        this.screensWarn = ev.next;
        break;
      case 'sock': {
        if (ev.x !== undefined) {
          fx.text('🧦 plop!', ev.x, ev.y - 90, '#3B3A4A', 26, 1.4);
          fx.burst(ev.x, ev.y - 20, 8, ['#F4A6B7', '#FFFDF6'], 120);
        }
        break;
      }
      case 'mood':
        fx.add('flash', 0, 0, 0.6).color = '#FFE58A';
        break;
      case 'sunbeam': {
        const v = this.viewOfTower(ev.tid);
        if (v) v.rig.setExpression('happy');
        break;
      }
      case 'trip':
        fx.text('*trip*', ev.x, ev.y - 70, '#E07D95', 22, 0.9);
        break;
      case 'smoke':
        fx.burst(ev.x, ev.y - 20, 16, ['#C9C3B8', '#9E9AA8', '#FFFDF6'], 160);
        fx.text('poof!', ev.x, ev.y - 60, '#6B6A7C', 22, 0.8);
        break;
      case 'unplug':
        fx.text(ev.by === 'hero' ? 'Unplugged! (by paw)' : 'Unplugged!', ev.x, ev.y - 60, '#3E7FA8', 30, 1.6);
        fx.burst(ev.x, ev.y, 14, ['#FFE58A', '#FFFDF6'], 220);
        fx.addShake(4);
        break;
      case 'drain':
        fx.ring(ev.x, ev.y, 160, '#9FD3EA', 0.8);
        break;
      case 'meteorHit':
        fx.ring(ev.x, ev.y, ev.r, '#FFE58A', 0.4);
        fx.burst(ev.x, ev.y - 10, 8, ['#FFE58A', '#D9CCF2', '#FFFDF6'], 200);
        break;
      // ── hero ──
      case 'heroAttack': {
        const hv = this.heroView;
        if (!hv) break;
        if (hv.rig.spec.actions?.attack && !hv.rig.action && Math.random() < 0.35) hv.rig.play('attack');
        else if (this.time - hv.pokeT > 0.3) {
          hv.pokeT = this.time;
          hv.rig.poke();
        }
        const h = sim.hero;
        if (h && ev.style === 'ranged') fx.link('hiss', h.x, h.y - 70, ev.x, ev.y - 30, 0.18);
        break;
      }
      case 'heroAbility': {
        const hv = this.heroView;
        if (hv) {
          if (hv.rig.spec.actions?.[ev.which]) hv.rig.play(ev.which);
          else hv.rig.poke();
        }
        const meta = HERO_ART[ev.id]?.hero;
        const ab = meta?.abilities.find((a) => a.id === ev.which);
        fx.text(ab ? ab.name + '!' : 'Hero!', ev.x, ev.y - 110, '#8C84C9', 32, 1.4);
        if (ev.id === 'ronin-biscuit' && ev.which === 'a2') fx.burst(ev.x, ev.y - 30, 24, ['#FFFDF6', '#F2A65A'], 260);
        if (ev.id === 'big-tom') fx.ring(ev.x, ev.y, ev.which === 'a1' ? 260 : 360, ev.which === 'a1' ? '#D2483C' : '#7CBF7A', 0.7);
        break;
      }
      case 'heroLevel':
        fx.text('Level ' + ev.level + '!', ev.x, ev.y - 130, '#C98A1B', 30, 1.6);
        fx.burst(ev.x, ev.y - 60, 16, ['#FFE58A', '#F2C14E'], 200);
        break;
      case 'heroDown':
        fx.text('*flops over for a nap*', ev.x, ev.y - 110, '#6B6A7C', 22, 2);
        break;
      case 'heroUp':
        fx.text('Refreshed!', ev.x, ev.y - 110, '#5E9A4E', 26, 1.4);
        break;
      case 'nineLives':
        fx.text('Nine Lives! (8 left)', ev.x, ev.y - 120, '#C98A1B', 28, 1.6);
        break;
    }
  }

  /** @param {number} tid */
  viewOfTower(tid) {
    return this.cats.get(tid) ?? null;
  }

  // ───────────────────────── sync + update ─────────────────────────
  sync() {
    const sim = this.sim;
    if (!sim) return;
    const f = ++this.frame;
    if (sim.hero && !this.heroView) {
      const art = HERO_ART[sim.hero.id];
      if (art) {
        const rig = new CatRig(art.spec, 4242);
        rig.extra = this.hatFor(sim.hero.id);
        this.heroView = { rig, scale: (95 / 250) * (art.spec.scale ?? 1), pokeT: -9, id: sim.hero.id, name: art.hero?.name ?? sim.hero.id };
      }
    }
    for (const t of sim.towers) {
      if (!t) continue;
      let v = this.cats.get(t.id);
      if (!v) {
        const art = CAT_ART[t.cat];
        const rig = new CatRig(art.spec, t.id * 31 + 7);
        rig.extra = this.hatFor(t.cat);
        v = { rig, t, seen: f, pokeT: -9, jumpT: 0, scale: (CAT_PX / 250) * (art.spec.scale ?? 1), tierLabel: '' };
        rig.poke();
        this.cats.set(t.id, v);
      }
      v.t = t;
      v.seen = f;
      const label = TIER_LABELS[t.tier];
      if (v.tierLabel !== label) {
        v.tierLabel = label;
        v.rig.tier = label;
      }
    }
    for (const [id, v] of this.cats) {
      if (v.seen === f) continue;
      this.release(v);
      this.cats.delete(id);
    }
    for (const k of sim.kittens) {
      if (!this.kits.has(k.id)) {
        const art = KITTEN_ART[k.name] ?? KITTEN_ART.beans;
        const krig = new CatRig(art.spec, k.id * 17 + 3);
        if (this.costumes) krig.extra = costumeFor(k.name);
        this.kits.set(k.id, { rig: krig, scale: (CAT_PX / 250) * (art.spec.scale ?? 0.55), pokeT: -9 });
      }
    }
    if (this.kits.size > sim.kittens.length) {
      const live = new Set(sim.kittens.map((k) => k.id));
      for (const [id, kv] of this.kits) {
        if (live.has(id)) continue;
        this.release(kv);
        this.kits.delete(id);
      }
    }
    for (const e of sim.enemies) {
      let v = this.enemies.get(e.id);
      if (!v && e.friendly) continue; // befriended Good Boy already flopped away
      if (!v) {
        const art = e.boss ? BOSS_ART[e.type] : ENEMY_ART[e.type];
        const spec = art.spec;
        const px = e.boss ? BOSS_PX : ENEMY_PX * ((e.def.size ?? 22) >= 30 ? 1.25 : 1);
        const hFit = px / (spec.height ?? 180);
        const wFit = spec.width ? (px * 1.5) / spec.width : Infinity;
        v = { rig: new EnemyRig(spec, e.id * 13 + 1), e, id: e.type, x: e.x, y: e.y, flip: e.hx < 0, scale: Math.min(hFit, wFit) * (spec.scale ?? 1), px, dead: false, leaked: false, seen: f, hitT: -9, lastHit: e.lastHitT, boss: e.boss };
        this.enemies.set(e.id, v);
      }
      v.e = e;
      v.seen = f;
    }
    for (const [id, v] of this.enemies) {
      if (v.seen === f) continue;
      if (v.leaked) {
        this.release(v);
        this.enemies.delete(id);
        continue;
      }
      if (!v.dead) {
        v.dead = true;
        v.rig.die();
      }
      v.e = null;
    }
  }

  /** @param {number} dt animation seconds (already scaled by game speed) */
  update(dt) {
    const sim = this.sim;
    if (!sim) return;
    this.time += dt;
    this.sync();
    this.fx.update(dt);
    // Rig springs are explicit Euler: keep their steps small (and slow motion slightly at 3× on slow machines).
    const capped = Math.min(dt, 4 / 60);
    const n = Math.max(1, Math.ceil(capped / (1 / 60) - 1e-6));
    for (let i = 0; i < n; i++) this.updateRigs(capped / n, sim);
  }

  /** @param {number} dt @param {Sim} sim */
  updateRigs(dt, sim) {
    for (const v of this.cats.values()) {
      const t = v.t;
      /** @type {import('../art/cats/catrig.js').Expression} */
      let ex = 'idle';
      if (this.ending === 'win') ex = 'celebrate';
      else if (this.ending === 'lose') ex = 'sad';
      else if (t.wetT > 0) ex = 'wet';
      else if (t.stunT > 0) ex = 'startled';
      else if (t.sad) ex = 'sad';
      else if (sim.time - t.lastAtkT < 1.1) ex = 'focused';
      else if (t.idleT > 8) ex = 'sleepy';
      else if (v.rig.expr === 'celebrate' && v.rig.exprT < 1.2) ex = 'celebrate';
      v.rig.setExpression(ex);
      /** @type {{x:number,y:number}|null} */
      let look = null;
      const e = t.target ? sim.enemyById.get(t.target) : undefined;
      if (e && sim.time - t.lastAtkT < 1.5) {
        const dx = (e.x - t.x) / 280;
        const dy = (e.y - (t.y - 50)) / 280;
        const l = Math.hypot(dx, dy);
        look = l > 1 ? { x: dx / l, y: dy / l } : { x: dx, y: dy };
      }
      if (v.jumpT > 0) {
        v.jumpT += dt;
        if (v.jumpT > 0.4) v.jumpT = 0;
      }
      try {
        v.rig.update(dt, look);
      } catch (err) {
        this.artFail('cat:' + t.cat, err);
      }
    }
    for (const k of sim.kittens) {
      const kv = this.kits.get(k.id);
      if (!kv || !k.alive) continue;
      kv.rig.setExpression(k.dizzyT > 0 ? 'vibing' : this.ending === 'win' ? 'celebrate' : k.target ? 'focused' : 'happy');
      const e = k.target ? sim.enemyById.get(k.target) : undefined;
      try {
        kv.rig.update(dt, e ? { x: Math.max(-1, Math.min(1, (e.x - k.x) / 120)), y: 0 } : null);
      } catch (err) {
        this.artFail('kitten:' + k.name, err);
      }
    }
    for (const [id, v] of this.enemies) {
      const e = v.e;
      if (e) {
        v.x = e.x;
        v.y = e.y;
        if (Math.abs(e.hx) > 0.2) v.flip = e.hx < 0;
        const want = e.stunT > 0 || e.friendly || e.stuckT > 0 || this.isFightingKitten(e) ? 'idle' : 'walk';
        if (v.rig.st.mode !== want && (v.rig.st.mode === 'walk' || v.rig.st.mode === 'idle')) v.rig.setMode(want);
        v.rig.st.phase = e.phase;
        v.rig.st.mem.reveal = !e.hidden;
        // Beams/clouds hurt quietly; still wobble the rig now and then.
        if (e.lastHitT !== v.lastHit) {
          v.lastHit = e.lastHitT;
          if (this.time - v.hitT > 0.45) {
            v.hitT = this.time;
            v.rig.hit();
          }
        }
      }
      try {
        v.rig.update(dt, null);
      } catch (err) {
        this.artFail('enemy:' + v.id, err);
      }
      if (v.dead && v.rig.isGone && v.rig.st.deathT > 1.9) {
        this.release(v);
        this.enemies.delete(id);
      }
    }
    if (this.zoomie) this.zoomie.update(dt, null);
    const h = sim.hero;
    const hv = this.heroView;
    if (h && hv) {
      /** @type {import('../art/cats/catrig.js').Expression} */
      let ex = 'idle';
      if (!h.alive) ex = 'sleepy';
      else if (this.ending === 'win') ex = 'celebrate';
      else if (this.ending === 'lose') ex = 'sad';
      else if (sim.time - h.lastAtkT < 1) ex = 'focused';
      else if (h.moving) ex = 'happy';
      hv.rig.setExpression(ex);
      const e = h.target ? sim.enemyById.get(h.target) : undefined;
      const look = e ? { x: Math.max(-1, Math.min(1, (e.x - h.x) / 250)), y: Math.max(-1, Math.min(1, (e.y - h.y + 70) / 250)) } : null;
      try {
        hv.rig.update(dt, look);
      } catch (err) {
        this.artFail('hero:' + h.id, err);
      }
    }
  }

  /** @param {Enemy} e */
  isFightingKitten(e) {
    if (!e.blockedBy || !this.sim) return false;
    for (const k of this.sim.kittens) if (k.id === e.blockedBy) return k.alive && (k.x - e.x) ** 2 + (k.y - e.y) ** 2 < 34 * 34;
    return false;
  }

  // ───────────────────────── drawing ─────────────────────────
  /** @param {CanvasRenderingContext2D} ctx */
  stageTransform(ctx) {
    const s = this.k * this.dpr;
    let sx = 0;
    let sy = 0;
    if (this.fx.shake > 0) {
      sx = (Math.random() - 0.5) * this.fx.shake;
      sy = (Math.random() - 0.5) * this.fx.shake;
    }
    ctx.setTransform(s, 0, 0, s, sx * s, sy * s);
  }

  /** @param {CanvasRenderingContext2D} ctx @param {boolean} front */
  drawRoomLayer(ctx, front) {
    const room = /** @type {import('../art/rooms/common.js').RoomSpec} */ (this.room);
    const layout = /** @type {import('../art/rooms/common.js').Layout} */ (this.layout);
    const sim = /** @type {Sim} */ (this.sim);
    const light = sim.totalWaves === Infinity ? (sim.waveIdx % 10) / 10 : Math.min(1, sim.waveIdx / Math.max(1, sim.totalWaves));
    const o = { reducedMotion: this.reduced, light, layout, showStash: false, showSpots: false, lw: 3 };
    const prevCtx = this.pen.ctx;
    this.pen.ctx = ctx; // drawRoom/drawNapSpot draw through the pen's own context
    try {
      if (!front) drawRoom(ctx, this.pen, room, layout, this.time, o);
      else if (room.drawFront) {
        this.pen.begin(this.time, { boil: !this.reduced, width: 3, amp: 1 });
        room.drawFront(ctx, this.pen, this.time, o);
      }
    } catch (err) {
      this.artFail('room:' + room.id, err);
      if (!front) {
        ctx.fillStyle = '#E9E4D8';
        ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      }
    } finally {
      this.pen.ctx = prevCtx;
    }
  }

  draw() {
    const t0 = performance.now();
    this.adaptPaintBudget(t0);
    this.drawFrame();
    this.drawMs += (performance.now() - t0 - this.drawMs) * 0.05;
  }

  /**
   * Sprite repaints are mostly rasterized off the main thread, so JS timing undercounts them. Tune the
   * per-frame repaint budget from real frame intervals: shrink it when frames run slow, grow it with headroom.
   * @param {number} now
   */
  adaptPaintBudget(now) {
    const dt = now - this.lastDrawAt;
    this.lastDrawAt = now;
    if (dt <= 0 || dt > 250) return;
    this.frameSum += dt;
    if (++this.frameN < 30) return;
    const avg = this.frameSum / this.frameN;
    this.frameSum = 0;
    this.frameN = 0;
    // The display's own frame interval: the best average seen, relaxing slowly in case it was a fluke.
    this.baseDt = avg < this.baseDt ? avg : this.baseDt + (avg - this.baseDt) * 0.01;
    if (avg > this.baseDt * 1.1) this.paintBudget = Math.max(PAINT_BUDGET_MIN, this.paintBudget * 0.7);
    else if (avg < this.baseDt * 1.04) this.paintBudget = Math.min(PAINT_BUDGET_MAX, this.paintBudget * 1.15);
  }

  drawFrame() {
    const sim = this.sim;
    const ctx = this.ctx;
    if (!sim || !this.room || !this.layout) return;
    this.paintMs = 0;
    if (this.hadError) {
      // A sprite that threw mid-draw may have left unbalanced save()s behind.
      /** @type {any} */ (ctx).reset?.();
      this.hadError = false;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (!this.cacheMode || this.fx.shake > 0) {
      ctx.fillStyle = '#E9E4D8';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Room (back), live or cached.
    if (this.cacheMode) {
      const step = this.reduced ? 2 : 1 / 7.5;
      const wall = performance.now() / 1000;
      if (this.cacheT < 0 || wall - this.cacheT >= step) {
        this.cacheT = wall;
        const c0 = performance.now();
        for (const [c, front] of /** @type {[HTMLCanvasElement, boolean][]} */ ([
          [this.back, false],
          [this.front, true],
        ])) {
          if (front && !this.room.drawFront) continue;
          const cx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
          cx.setTransform(1, 0, 0, 1, 0, 0);
          cx.clearRect(0, 0, c.width, c.height);
          cx.setTransform(this.k * this.dpr, 0, 0, this.k * this.dpr, 0, 0);
          this.drawRoomLayer(cx, front);
        }
        this.cacheMs += performance.now() - c0;
        this.cacheN++;
      }
      this.stageTransform(ctx);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.back, 0, 0);
      ctx.restore();
    } else {
      this.stageTransform(ctx);
      const t0 = performance.now();
      this.drawRoomLayer(ctx, false);
      this.roomCost += performance.now() - t0;
    }
    this.stageTransform(ctx);
    if (this.spooky) {
      drawNightWash(ctx);
      drawLanterns(ctx, this.spooky, this.time, this.reduced);
    }
    const st = this.layout.stash;
    try {
      drawStash(this.pen, st.x, st.y, this.time, 3, 1 - sim.lives / sim.maxLives);
    } catch (err) {
      this.artFail('stash', err);
    }

    this.drawZones(ctx);
    this.drawSpotMarks(ctx);
    this.drawGround(ctx);

    // Depth-sorted characters.
    const list = this.list;
    let n = 0;
    /** @param {number} y @param {number} kind @param {any} ref */
    const push = (y, kind, ref) => {
      let it = list[n];
      if (!it) it = list[n] = { y: 0, kind: 0, ref: null };
      it.y = y;
      it.kind = kind;
      it.ref = ref;
      n++;
    };
    for (const v of this.cats.values()) push(v.t.y, 0, v);
    for (const k of sim.kittens) if (k.alive) push(k.y, 1, k);
    for (const v of this.enemies.values()) push(v.y + (v.e?.fly ? 60 : 0), 2, v);
    for (const r of sim.runners) push(r.y, 3, r);
    if (sim.hero && this.heroView) push(sim.hero.y, 4, sim.hero);
    for (let i = n; i < list.length; i++) list[i].ref = null;
    const view = list.slice(0, n).sort((a, b) => a.y - b.y);
    for (const it of view) {
      if (it.kind === 0) this.drawCat(ctx, it.ref);
      else if (it.kind === 1) this.drawKitten(ctx, it.ref);
      else if (it.kind === 2) this.drawEnemy(ctx, it.ref);
      else if (it.kind === 4) this.drawHero(ctx, it.ref);
      else this.drawRunner(ctx, it.ref);
    }

    this.drawBeams(ctx);
    this.drawProjectiles(ctx);
    this.drawBars(ctx);
    this.drawGhost(ctx);
    this.fx.draw(ctx, this.time);

    if (this.cacheMode) {
      if (this.room.drawFront) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.front, 0, 0);
        ctx.restore();
      }
    } else {
      const t0 = performance.now();
      this.drawRoomLayer(ctx, true);
      this.roomCost += performance.now() - t0;
      if (++this.roomSamples === 30) {
        if (this.roomCost / 30 > 3) this.cacheMode = true;
        this.roomCost = 0;
        this.roomSamples = 0;
      }
    }

    if (this.spooky) drawBats(ctx, this.time, this.reduced);
    if (sim.dark > 0) {
      ctx.fillStyle = 'rgba(20,18,60,0.32)';
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    }
    this.drawAfterFront(ctx);
    if (this.aim) {
      ctx.save();
      ctx.strokeStyle = '#D2483C';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.ellipse(this.aim.x, this.aim.y, this.aim.r, this.aim.r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawText(ctx, '☕ click to drop', this.aim.x, this.aim.y - this.aim.r * 0.6 - 24, 24, '#D2483C');
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawZones(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    for (const z of sim.zones) {
      ctx.save();
      if (z.kind === 'sticky') {
        const k = z.t / z.life;
        ctx.globalAlpha = 0.6 * (k > 0.75 ? (1 - k) / 0.25 : 1);
        ctx.fillStyle = '#B4703A';
        ctx.beginPath();
        ctx.ellipse(z.x, z.y + 6, z.r, z.r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E3A468';
        ctx.beginPath();
        ctx.ellipse(z.x - z.r * 0.25, z.y, z.r * 0.3, z.r * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }
      if (z.kind === 'nap') {
        const k = z.t / z.life;
        const pulse = 1 + Math.sin(this.time * 3) * 0.03;
        ctx.globalAlpha = 0.5 * (k > 0.85 ? (1 - k) / 0.15 : Math.min(1, z.t * 5));
        ctx.fillStyle = '#D9CCF2';
        ctx.strokeStyle = '#8C84C9';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(z.x, z.y - 20, z.r * pulse, z.r * 0.7 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        drawText(ctx, 'z z z', z.x + Math.sin(this.time * 2) * 10, z.y - z.r * 0.6 - 20, 26, '#8C84C9');
        continue;
      }
      if (z.kind === 'web') {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#E07D95';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        for (const rr of [1, 0.66, 0.33]) {
          ctx.beginPath();
          ctx.ellipse(z.x, z.y, z.r * rr, z.r * rr * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.moveTo(z.x, z.y);
          ctx.lineTo(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r * 0.55);
        }
        ctx.stroke();
      } else {
        const k = z.t / z.life;
        ctx.globalAlpha = 0.38 * (k > 0.8 ? (1 - k) / 0.2 : Math.min(1, z.t * 4));
        ctx.fillStyle = '#97C455';
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + this.time * 0.6;
          ctx.beginPath();
          ctx.ellipse(z.x + Math.cos(a) * z.r * 0.45, z.y - 10 + Math.sin(a) * z.r * 0.22, z.r * 0.5, z.r * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha *= 1.6;
        ctx.fillStyle = '#FFFDF6';
        for (let i = 0; i < 5; i++) {
          const a = i * 2.3 + this.time * 1.7;
          ctx.fillRect(z.x + Math.cos(a) * z.r * 0.6, z.y - 20 + Math.sin(a * 1.3) * z.r * 0.3, 4, 4);
        }
      }
      ctx.restore();
    }
  }

  /** Gimmick + hero markers on the ground layer (under characters). @param {CanvasRenderingContext2D} ctx */
  drawGround(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    /** @param {{x:number,y:number}[]} pts */
    const firstOnStage = (pts) => pts.find((p) => p.x > 90 && p.x < 1830 && p.y > 140 && p.y < 980) ?? pts[0];
    // 2-1: the closed route is washed out; the one opening next wave blinks.
    if (sim.gimmick?.kind === 'screens' && sim.tracks.length > 1) {
      sim.tracks.forEach((tr, i) => {
        if (i === sim.activePath) return;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#F6EEDC';
        ctx.lineWidth = 106;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([60, 26]);
        ctx.beginPath();
        tr.pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
        const q = firstOnStage(tr.pts);
        const warn = this.screensWarn === i;
        drawText(ctx, warn ? '⚠ this route opens next wave!' : '🚪 screen closed', q.x + 120, q.y - 56, 26, warn ? '#D2483C' : '#6B6A7C', warn ? 0.55 + 0.45 * Math.sin(this.time * 6) : 0.9);
      });
      const open = sim.tracks[sim.activePath % sim.tracks.length];
      const q = firstOnStage(open.pts);
      drawText(ctx, '➜ open', q.x + 70, q.y - 56, 26, '#5E9A4E');
    }
    // 2-3: the sock lying on the ground (cats under it wear it instead, see drawCat).
    const sock = sim.sockAt();
    if (sock && !sim.catNear(sock.x, sock.y)) this.drawSock(ctx, sock.x, sock.y - 14, 1.3);
    // Box Fort.
    for (const b of sim.blockers) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = '#C9A06A';
      ctx.strokeStyle = '#3B3A4A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-46, -70, 92, 74, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E2C48F';
      ctx.fillRect(-46, -70, 92, 14);
      ctx.strokeRect(-46, -70, 92, 14);
      ctx.fillStyle = 'rgba(244,166,183,0.8)';
      ctx.fillRect(-8, -70, 16, 74);
      ctx.restore();
      drawText(ctx, 'IF I FITS', b.x, b.y - 30, 16, '#3B3A4A');
      drawText(ctx, Math.ceil(b.until - sim.time) + 's', b.x, b.y - 88, 18, '#6B6A7C');
    }
    // Bosses: the Sucktator's plug, Bathzilla's drain.
    for (const e of sim.enemies) {
      if (e.type === 'sucktator' && e.phase === 1 && e.alive) {
        const v = this.enemies.get(e.id);
        const bx = v?.x ?? e.x;
        const by = v?.y ?? e.y;
        const unplugged = e.unplugT > 0;
        const px = e.plugX + (unplugged ? 30 : 0);
        ctx.save();
        ctx.strokeStyle = '#3B3A4A';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(bx, by - 20);
        ctx.quadraticCurveTo((bx + px) / 2, Math.max(by, e.plugY) + 40, px - 14, e.plugY);
        ctx.stroke();
        ctx.fillStyle = unplugged ? '#C9C3B8' : '#F2C14E';
        ctx.fillRect(px - 16, e.plugY - 12, 26, 24);
        ctx.strokeRect(px - 16, e.plugY - 12, 26, 24);
        ctx.fillStyle = '#3B3A4A';
        ctx.fillRect(px + 10, e.plugY - 8, 12, 4);
        ctx.fillRect(px + 10, e.plugY + 4, 12, 4);
        ctx.restore();
        drawText(ctx, unplugged ? 'unplugged!' : '🔌 mug me!', px, e.plugY - 34, 20, unplugged ? '#6B6A7C' : '#D2483C', unplugged ? 1 : 0.6 + 0.4 * Math.sin(this.time * 5));
      }
      if (e.type === 'bathzilla' && e.stuckT > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(62,127,168,0.7)';
        ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + 4, 70 + i * 30, 22 + i * 9, 0, this.time * 3 + i, this.time * 3 + i + 4.4);
          ctx.stroke();
        }
        ctx.restore();
        drawText(ctx, 'STUCK! free hits', e.x, e.y + 50, 24, '#3E7FA8');
      }
    }
    // Endless Sunbeam: a warm light on the lucky cat.
    if (sim.sunbeamTid) {
      const v = this.cats.get(sim.sunbeamTid);
      if (v) {
        ctx.save();
        const g = ctx.createLinearGradient(v.t.x, v.t.y - 300, v.t.x, v.t.y);
        g.addColorStop(0, 'rgba(255,229,138,0)');
        g.addColorStop(1, 'rgba(255,229,138,0.45)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(v.t.x - 30, v.t.y - 300);
        ctx.lineTo(v.t.x + 30, v.t.y - 300);
        ctx.lineTo(v.t.x + 90, v.t.y + 10);
        ctx.lineTo(v.t.x - 90, v.t.y + 10);
        ctx.fill();
        ctx.restore();
      }
    }
    // Hero: selection ring + walk target.
    const h = sim.hero;
    if (h && h.alive) {
      if (this.heroSelected) {
        ctx.save();
        ctx.strokeStyle = '#F2C14E';
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.ellipse(h.x, h.y + 4, 56, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (h.moving) drawText(ctx, '🐾', h.tx, h.ty, 30, '#3B3A4A', 0.8);
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} s */
  drawSock(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#F4A6B7';
    ctx.strokeStyle = '#3B3A4A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -34);
    ctx.lineTo(10, -34);
    ctx.lineTo(10, 0);
    ctx.quadraticCurveTo(34, 2, 32, 14);
    ctx.quadraticCurveTo(30, 22, 0, 20);
    ctx.quadraticCurveTo(-12, 18, -10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFDF6';
    ctx.fillRect(-10, -34, 20, 8);
    ctx.fillRect(-10, -18, 20, 5);
    ctx.restore();
  }

  /** @param {CanvasRenderingContext2D} ctx @param {import('../sim/extras.js').Hero} h */
  drawHero(ctx, h) {
    const hv = this.heroView;
    if (!hv) return;
    const ss = Math.max(0.6, hv.rig.spec.scale ?? 1);
    ctx.save();
    if (!h.alive) ctx.globalAlpha = 0.6;
    else if (h.invulnT > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 30);
    try {
      this.blitRig(ctx, hv, h.x, h.y, 280 * ss, 200 * ss, 140 * ss, 175 * ss, hv.rig.time, (h.facing < 0 ? 'L' : 'R') + (h.alive ? '' : 'z'), (c) => {
        if (h.facing < 0) c.scale(-1, 1);
        c.scale(hv.scale, hv.scale);
        hv.rig.draw(c, hv.scale * this.k, { reducedMotion: this.reduced });
      }, 20);
    } catch (err) {
      this.artFail('hero:' + h.id, err);
    } finally {
      ctx.restore();
    }
  }

  /** Hints drawn over the room's front layer. @param {CanvasRenderingContext2D} ctx */
  drawAfterFront(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    const g = sim.gimmick;
    if (g?.kind === 'kotatsu') {
      let n = 0;
      for (const e of sim.enemies) if (e.covered) n++;
      if (n) drawText(ctx, n > 3 ? '*RUSTLE RUSTLE*' : '*rustle*', g.x + Math.sin(this.time * 9) * 6, g.y - g.ry - 50, 26, '#3B3A4A', 0.85);
    }
    const h = sim.hero;
    const hv = this.heroView;
    if (h && hv) {
      // Name tag + health on top of everything so the hero is always easy to find.
      drawText(ctx, `${hv.name} · Lv${h.level}`, h.x, h.y + 26, 18, '#3B3A4A');
      if (h.alive) this.bar(ctx, h.x, h.y - 118, 60, h.hp / h.maxHp, 0, '#7CBF7A');
      else drawText(ctx, `💤 ${Math.ceil(h.respawnT)}s`, h.x, h.y - 120, 24, '#6B6A7C');
    }
  }

  /** Cushions under seated cats, selection glow, range rings. @param {CanvasRenderingContext2D} ctx */
  drawSpotMarks(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    const moving = this.ghost && this.ghost.slot >= 0 ? this.ghost.slot : -1;
    ctx.save();
    const hint = this.hint;
    if (hint && !(this.ghost && Math.hypot(this.ghost.x - hint.x, this.ghost.y - hint.y) < 40)) {
      const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.strokeStyle = `rgba(210,72,96,${0.55 + 0.35 * pulse})`;
      ctx.fillStyle = `rgba(255,225,231,${0.35 + 0.2 * pulse})`;
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.ellipse(hint.x, hint.y, 70 + 8 * pulse, 28 + 3 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      drawText(ctx, '🐾', hint.x, hint.y - 4 - 6 * pulse, 34);
      drawText(ctx, hint.label, hint.x, hint.y - 60, 24, '#C2405A');
    }
    for (const [i, alpha] of /** @type {[number, number][]} */ ([
      [this.hoverSpot, 0.35],
      [this.selectedSpot, 0.7],
    ])) {
      const t = i >= 0 ? sim.towers[i] : null;
      if (!t || i === moving) continue;
      ctx.fillStyle = `rgba(255,246,184,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 82, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    const prevCtx = this.pen.ctx;
    this.pen.ctx = ctx;
    try {
      for (const t of sim.towers) if (t) drawSeat(this.pen, t.x, t.y, 3, this.room);
    } finally {
      this.pen.ctx = prevCtx;
    }
    const sel = this.selectedSpot >= 0 && this.selectedSpot !== moving ? sim.towers[this.selectedSpot] : null;
    if (sel) this.rangeRing(ctx, sel.x, sel.y, sim.rangeOf(sel), 'rgba(191,227,242,0.16)', 'rgba(59,58,74,0.55)', sel);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r
   * @param {string} fill @param {string} stroke @param {Tower|null} [t] shows a barracks rally point
   */
  rangeRing(ctx, x, y, r, fill, stroke, t) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 9]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (t && t.rally) {
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(224,125,149,0.6)';
      ctx.beginPath();
      ctx.ellipse(t.rally.x, t.rally.y, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** The cat being seated or moved, following the pointer: green ring = OK, red = not here (with the reason). @param {CanvasRenderingContext2D} ctx */
  drawGhost(ctx) {
    const g = this.ghost;
    const sim = this.sim;
    if (!g || !sim) {
      if (this.ghostView) {
        this.release(this.ghostView);
        this.ghostView = null;
      }
      return;
    }
    const ok = !g.why;
    const from = g.slot >= 0 ? sim.towers[g.slot] : null;
    if (from) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59,58,74,0.45)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y - 30);
      ctx.lineTo(g.x, g.y - 30);
      ctx.stroke();
      ctx.restore();
    }
    this.rangeRing(ctx, g.x, g.y, g.range, ok ? 'rgba(124,191,122,0.18)' : 'rgba(210,72,60,0.16)', ok ? 'rgba(62,130,70,0.8)' : 'rgba(210,72,60,0.85)');
    ctx.save();
    ctx.globalAlpha = ok ? 0.85 : 0.5;
    const prevCtx = this.pen.ctx;
    this.pen.ctx = ctx;
    try {
      drawSeat(this.pen, g.x, g.y, 3, this.room);
    } finally {
      this.pen.ctx = prevCtx;
    }
    let gv = this.ghostView;
    const art = CAT_ART[g.cat];
    if (art && (!gv || gv.cat !== g.cat)) {
      this.release(gv);
      const rig = new CatRig(art.spec, 7);
      rig.extra = this.hatFor(g.cat);
      if (from) rig.tier = TIER_LABELS[from.tier];
      gv = this.ghostView = { cat: g.cat, rig, scale: (CAT_PX / 250) * (art.spec.scale ?? 1), pokeT: -9 };
    }
    if (gv) {
      if (from) gv.rig.tier = TIER_LABELS[from.tier];
      gv.rig.setExpression(ok ? 'happy' : 'startled');
      gv.rig.update(1 / 60, null);
      const ss = Math.max(0.5, gv.rig.spec.scale ?? 1);
      const view = gv;
      try {
        this.blitRig(ctx, gv, g.x, g.y - 6, 320 * ss, 185 * ss, 160 * ss, 160 * ss, gv.rig.time, ok ? 'ok' : 'no', (c) => {
          c.scale(view.scale, view.scale);
          view.rig.draw(c, view.scale * this.k, { reducedMotion: this.reduced });
        });
      } catch (err) {
        this.artFail('ghost:' + g.cat, err);
      }
    }
    ctx.restore();
    if (g.label) drawText(ctx, g.label, g.x, g.y - 128, 24, ok ? '#3E8246' : '#D2483C');
  }

  /**
   * Draw a vector rig through a small cached sprite refreshed at ~`hz` (rigs are path-heavy and costly to
   * rasterize; positions still move at full frame rate).
   * @param {CanvasRenderingContext2D} ctx @param {any} holder view object that owns the sprite
   * @param {number} x @param {number} y rig origin on the stage @param {number} w @param {number} h @param {number} ax @param {number} ay
   * @param {number} rigTime @param {string} key forces a redraw when it changes (e.g. flip)
   * @param {(c:CanvasRenderingContext2D)=>void} paint draws the rig at the origin in stage units
   * @param {number} [hz]
   */
  blitRig(ctx, holder, x, y, w, h, ax, ay, rigTime, key, paint, hz = 15) {
    const s = this.k * this.dpr;
    const pw = Math.max(1, Math.ceil(w * s));
    const ph = Math.max(1, Math.ceil(h * s));
    let sp = holder.sprite;
    if (!sp || sp.pw !== pw || sp.ph !== ph) {
      const c = sp?.canvas ?? this.pool.pop() ?? document.createElement('canvas');
      c.width = pw;
      c.height = ph;
      sp = holder.sprite = { canvas: c, cx: /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')), pw, ph, wall: -1, rigT: -1, key: '' };
    }
    const wall = performance.now();
    const must = sp.wall < 0 || sp.key !== key;
    // Crowded screens: once this frame's repaint budget is spent, due sprites keep their last frame
    // (recently repainted ones aren't due next frame, so the rest catch up round-robin).
    if (must || (wall - sp.wall >= 1000 / hz && sp.rigT !== rigTime && this.paintMs < this.paintBudget)) {
      sp.wall = wall;
      sp.rigT = rigTime;
      sp.key = key;
      const cx = sp.cx;
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.globalAlpha = 1;
      cx.clearRect(0, 0, pw, ph);
      cx.setTransform(s, 0, 0, s, ax * s, ay * s);
      try {
        paint(cx);
      } catch (err) {
        /** @type {any} */ (cx).reset?.();
        throw err;
      } finally {
        this.paintMs += performance.now() - wall;
      }
    }
    ctx.drawImage(sp.canvas, x - ax, y - ay, w, h);
  }

  /** @param {any} v */
  release(v) {
    if (v?.sprite && this.pool.length < 80) this.pool.push(v.sprite.canvas);
    if (v) v.sprite = null;
  }

  /** @param {CanvasRenderingContext2D} ctx @param {CatView} v */
  drawCat(ctx, v) {
    const t = v.t;
    const jump = v.jumpT > 0 ? -Math.sin((v.jumpT / 0.4) * Math.PI) * 46 : 0;
    const ss = Math.max(0.5, v.rig.spec.scale ?? 1);
    const beingMoved = this.ghost?.slot === t.spot;
    if (beingMoved) {
      ctx.save();
      ctx.globalAlpha = 0.4;
    }
    try {
      this.blitRig(ctx, v, t.x, t.y - 6 + jump, 320 * ss, 185 * ss, 160 * ss, 160 * ss, v.rig.time, v.tierLabel, (c) => {
        c.scale(v.scale, v.scale);
        v.rig.draw(c, v.scale * this.k, { reducedMotion: this.reduced });
      });
    } catch (err) {
      this.artFail('cat:' + t.cat, err);
      this.release(v);
      this.cats.delete(t.id); // rebuild a fresh rig next frame
    } finally {
      if (beingMoved) ctx.restore();
    }
    if (t.boxT > 0) drawText(ctx, '📦', t.x + 40, t.y - 80, 22);
    const sim = this.sim;
    if (sim && sim.underSock(t)) this.drawSock(ctx, t.x + 4, t.y - 74, 0.9);
    if (this.colorblind) {
      // Shapes/icons for status, not just tints.
      let icons = '';
      if (t.wetT > 0) icons += '💧';
      if (t.stunT > 0) icons += '❗';
      if (t.sad) icons += '☁';
      if (sim && sim.underSock(t)) icons += '🧦';
      if (icons) drawText(ctx, icons, t.x - 40, t.y - 82, 22, '#3B3A4A');
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {import('../sim/sim.js').Kitten} k */
  drawKitten(ctx, k) {
    const kv = this.kits.get(k.id);
    if (!kv) return;
    // Face the enemy they are fighting.
    const e = k.target ? this.sim?.enemyById.get(k.target) : undefined;
    const left = !!e && e.x < k.x;
    try {
      this.blitRig(ctx, kv, k.x, k.y, 180, 110, 90, 95, kv.rig.time, left ? 'L' : 'R', (c) => {
        if (left) c.scale(-1, 1);
        c.scale(kv.scale, kv.scale);
        kv.rig.draw(c, kv.scale * this.k, { reducedMotion: this.reduced });
      });
    } catch (err) {
      this.artFail('kitten:' + k.name, err);
    }
    if (k.hp < k.maxHp) this.bar(ctx, k.x, k.y - 52, 28, k.hp / k.maxHp, 0, '#7CBF7A');
  }

  /** @param {CanvasRenderingContext2D} ctx @param {EnemyView} v */
  drawEnemy(ctx, v) {
    const e = v.e;
    const px = v.px;
    ctx.save();
    try {
      // Stealth art draws itself translucent until st.mem.reveal; add a little extra fade for any other art.
      if (e && e.hidden) ctx.globalAlpha = 0.55;
      this.blitRig(ctx, v, v.x, v.y, px * 2.6, px * 1.95, px * 1.3, px * 1.65, v.rig.st.t, v.flip ? 'L' : 'R', (c) => {
        c.scale(v.scale, v.scale);
        v.rig.draw(c, v.scale * this.k, { reducedMotion: this.reduced, flip: v.flip });
      }, v.boss ? 20 : this.enemies.size > 30 ? 8 : 12);
    } catch (err) {
      this.artFail('enemy:' + v.id, err);
    } finally {
      ctx.restore();
    }
    if (e && !e.hidden) {
      if (this.colorblind && !e.friendly) {
        // Colorblind mode: one readable glyph per status, in a row above the enemy.
        let icons = '';
        if (e.stunT > 0) icons += '✶';
        if (e.slowK > 0 && e.slowT > 0) icons += '▼';
        if (e.vibeT > 0) icons += '♪';
        if (e.markT > 0) icons += '◎';
        if (e.shield > 0) icons += '⛨';
        if (e.hasted) icons += '»';
        if (e.tauntT > 0) icons += '!';
        if (e.blockedBy) icons += '✋';
        if (icons) drawText(ctx, icons, v.x, v.y - v.px - 28, 22, '#3B3A4A');
      }
      if (e.stunT > 0 && !e.friendly) drawText(ctx, '✶', v.x + Math.cos(this.time * 8) * 16, v.y - v.px - 6, 20, '#F2C14E');
      if (e.vibeT > 0) drawText(ctx, '♪', v.x + Math.sin(this.time * 6) * 14, v.y - v.px - 10, 24, '#8C84C9');
      if (e.slowK > 0 && e.slowT > 0) drawText(ctx, '🧶', v.x - 18, v.y - v.px + 6, 16);
      if (e.jar) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#BFE6D3';
        ctx.strokeStyle = '#3B3A4A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(v.x - v.px * 0.45, v.y - v.px * 1.05, v.px * 0.9, v.px * 1.05, 20);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      if (e.friendly) {
        if (Math.random() < 0.05) this.fx.add('heart', v.x, v.y - 40, 1.2);
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {import('../sim/sim.js').Runner} r */
  drawRunner(ctx, r) {
    const px = this.runnerPrevX.get(r.id) ?? r.x + 1;
    this.runnerPrevX.set(r.id, r.x);
    if (this.runnerPrevX.size > 40) this.runnerPrevX.clear();
    const left = r.x < px;
    if (r.kind === 'bigOne') {
      ctx.save();
      ctx.translate(r.x, r.y - 26);
      ctx.rotate(-this.time * 12);
      ctx.fillStyle = '#B4703A';
      ctx.strokeStyle = '#3B3A4A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#7A4520';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 8 + i * 4, i, i + 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    if (!this.zoomie) {
      this.zoomie = new CatRig(CAT_ART.pudding.spec, 77);
      this.zoomie.setExpression('focused');
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(59,58,74,0.45)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const y = r.y - 14 - i * 14;
      ctx.beginPath();
      ctx.moveTo(r.x + (left ? 30 : -30), y);
      ctx.lineTo(r.x + (left ? 90 + i * 10 : -90 - i * 10), y);
      ctx.stroke();
    }
    try {
      ctx.translate(r.x, r.y);
      if (left) ctx.scale(-1, 1);
      const s = 0.22;
      ctx.rotate(0.25);
      ctx.scale(s, s);
      this.zoomie.draw(ctx, s * this.k, { reducedMotion: this.reduced });
    } catch (err) {
      this.artFail('cat:pudding', err);
    }
    ctx.restore();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawBeams(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    for (const t of sim.towers) {
      if (!t || t.def.kind !== 'beam' || !t.beams.length || t.wetT > 0 || t.stunT > 0) continue;
      const k = Math.min(1, t.beamT / (t.s.ramp ?? 2));
      const sx = t.x + 8;
      const sy = t.y - 56;
      for (const id of t.beams) {
        const e = sim.enemyById.get(id);
        if (!e) continue;
        const ex = e.x;
        const ey = e.y - 24;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255,90,80,${0.18 + 0.25 * k})`;
        ctx.lineWidth = 10 + 10 * k;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = t.s.skill === 'disco' ? `hsl(${(this.time * 400) % 360},90%,60%)` : '#FF3B30';
        ctx.lineWidth = 3 + 3 * k;
        ctx.stroke();
        ctx.fillStyle = '#FF3B30';
        ctx.beginPath();
        ctx.arc(ex, ey, 6 + 4 * k + Math.sin(this.time * 30) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawProjectiles(ctx) {
    const sim = /** @type {Sim} */ (this.sim);
    for (const p of sim.projectiles) {
      if (p.dur < 0) continue;
      const k = Math.min(1, p.t / p.dur);
      let y = p.y;
      const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
      if (p.lob || p.fx === 'catnip') y -= Math.sin(k * Math.PI) * Math.min(150, dist * 0.4);
      ctx.save();
      ctx.translate(p.x, y);
      ctx.strokeStyle = '#3B3A4A';
      ctx.lineWidth = 3;
      switch (p.fx) {
        case 'hairball':
          ctx.rotate(this.time * 9);
          ctx.fillStyle = '#B4703A';
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#7A4520';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(2, 1, 5, 0, 2.4);
          ctx.stroke();
          break;
        case 'yarn': {
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = 'rgba(224,125,149,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.quadraticCurveTo((p.sx + p.x) / 2, Math.min(p.sy, y) - 30, p.x, y);
          ctx.stroke();
          ctx.translate(p.x, y);
          ctx.fillStyle = '#F4A6B7';
          ctx.strokeStyle = '#3B3A4A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-7, -4);
          ctx.quadraticCurveTo(0, 2, 7, -4);
          ctx.stroke();
          break;
        }
        case 'coin':
          ctx.scale(Math.abs(Math.cos(this.time * 14)) * 0.8 + 0.2, 1);
          ctx.fillStyle = '#F2C14E';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#C98A1B';
          ctx.fillRect(-2, -5, 4, 10);
          break;
        case 'catnip':
          ctx.rotate(k * 8);
          ctx.fillStyle = '#97C455';
          ctx.beginPath();
          ctx.roundRect(-8, -6, 16, 18, 5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#C9AE7E';
          ctx.fillRect(-4, -14, 8, 8);
          ctx.strokeRect(-4, -14, 8, 8);
          break;
        default:
          ctx.fillStyle = '#FFFDF6';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawBars(ctx) {
    for (const v of this.enemies.values()) {
      const e = v.e;
      if (!e || v.dead || e.hidden || e.friendly || e.boss) continue;
      if (e.hp >= e.maxHp && e.shield <= 0) continue;
      this.bar(ctx, v.x, v.y - v.px - 14, 40, Math.max(0, e.hp / e.maxHp), Math.min(1, e.shield / e.maxHp), e.def.friendly ? '#F4A6B7' : '#E2463A');
    }
  }

  /** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} f @param {number} sh @param {string} color */
  bar(ctx, x, y, w, f, sh, color) {
    ctx.fillStyle = 'rgba(59,58,74,0.75)';
    ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * f, 5);
    if (sh > 0) {
      ctx.fillStyle = '#9FD3EA';
      ctx.fillRect(x - w / 2, y, w * sh, 2);
    }
  }
}
