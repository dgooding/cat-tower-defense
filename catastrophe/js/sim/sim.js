// @ts-check
// PURE deterministic simulation (no DOM). Fixed 60 Hz step, seeded RNG.
// The renderer mirrors this state and drains `events` after every step.
import { mulberry32 } from '../core/rng.js';
import { CAT_BY_ID, nextTiers } from '../data/cats.js';
import { ENEMY_BY_ID, WORLD_HP, BOSS_PHASES } from '../data/enemies.js';
import { endlessWave } from '../data/waves.js';
import { sampleTrack, nearestOnTracks, buildTracks } from './geometry.js';
import { onWaveStart, moodOf, updateCover, createHero, stepHero, heroOnKill, heroRangeBonus, hurtHero, heroMove, heroAbility, HERO_ID } from './extras.js';

export const DT = 1 / 60;
export const SPEED_UNIT = 60; // speed 1.0 = 60 px/s
export const SELL_REFUND = 0.7;
export const FIRST_WAVE_DELAY = 15;
export const WAVE_GAP = 20;
export const REVEAL_R = 200; // cats notice stealthy enemies this close (then get startled)

/** @typedef {import('../data/cats.js').TierStats} TierStats */
/** @typedef {import('../data/enemies.js').EnemyDef} EnemyDef */
/** @typedef {import('../data/levels.js').LevelDef} LevelDef */
/** @typedef {import('../data/ids.js').TargetMode} TargetMode */
/** @typedef {import('../art/rooms/common.js').Layout} Layout */

export const POWERS = {
  zoomies: { id: 'zoomies', name: 'Zoomies', key: 'Q', icon: '💨', cd: 40, dmg: 70, desc: 'A cat sprints the whole path, bonking everything.' },
  mug: { id: 'mug', name: 'Knock It Off The Table', key: 'W', icon: '☕', cd: 25, dmg: 170, radius: 130, stun: 1, desc: 'Drop a mug anywhere. Big splash damage.', aim: true },
  yowl: { id: 'yowl', name: '3 AM Yowl', key: 'E', icon: '🌙', cd: 60, stun: 2.5, desc: 'Every enemy freezes in confusion.' },
};
/** @typedef {keyof typeof POWERS} PowerId */

/**
 * @typedef {Object} Enemy
 * @property {number} id @property {string} type @property {EnemyDef} def @property {boolean} boss
 * @property {number} hp @property {number} maxHp @property {number} shield
 * @property {number} x @property {number} y @property {number} d @property {number} track @property {boolean} fly
 * @property {number} off lateral offset px @property {number} hx @property {number} hy heading
 * @property {number} speed px/s @property {number} size
 * @property {number} slowK @property {number} slowT @property {number} stunT @property {number} vibeT @property {number} vibeCd
 * @property {number} markK @property {number} markT @property {number} shred
 * @property {boolean} hidden @property {number} blockedBy kitten id (0 = free)
 * @property {boolean} enraged @property {number} pairId
 * @property {number} phase @property {number} abT @property {number} abT2
 * @property {boolean} jar @property {number} jarT @property {boolean} overheat @property {number} sprint
 * @property {number} stuckT @property {number} drainT
 * @property {boolean} friendly @property {number} friendlyT
 * @property {boolean} alive @property {number} bounty @property {number} snacks
 * @property {number} sprayT @property {number} boomT
 * @property {boolean} hasted @property {number} lastHitT @property {number} bornT
 * @property {boolean} covered hidden under the kotatsu @property {number} tauntT held by Shop's Closed
 * @property {number} unplugT Sucktator suction disabled @property {number} plugX @property {number} plugY
 */
/**
 * @typedef {Object} Kitten
 * @property {number} id @property {number} towerId @property {string} name @property {number} slot
 * @property {number} x @property {number} y @property {number} hp @property {number} maxHp
 * @property {number} cd @property {number} target enemy id @property {number} respawnT @property {boolean} alive
 * @property {number} dizzyT @property {number} lastAtkT @property {boolean} [smoked] ninja smoke used this life
 */
/**
 * @typedef {Object} Tower
 * @property {number} id @property {number} spot @property {number} x @property {number} y
 * @property {string} cat @property {import('../data/cats.js').CatDef} def @property {number} tier
 * @property {TierStats} s @property {number} spent @property {TargetMode} mode
 * @property {number} cd @property {number} skillT @property {number} target last target id
 * @property {number[]} beams beam target ids @property {number} beamT
 * @property {number} wetT @property {number} stunT @property {number} boxT
 * @property {boolean} sad @property {number} lastAtkT @property {number} idleT
 * @property {{x:number,y:number,track:number,d:number}|null} rally @property {number[]} kittens
 * @property {number} kills @property {number} dmgDone
 */
/**
 * @typedef {Object} Projectile
 * @property {number} id @property {string} fx @property {number} tid
 * @property {number} sx @property {number} sy @property {number} x @property {number} y
 * @property {number} tx @property {number} ty @property {number} eid
 * @property {number} t @property {number} dur @property {boolean} lob @property {any} hit
 */
/**
 * @typedef {Object} Zone
 * @property {number} id @property {'catnip'|'web'|'sticky'|'nap'} kind @property {number} tid
 * @property {number} x @property {number} y @property {number} r @property {number} t @property {number} life
 * @property {number} dps @property {number} vibe @property {number} slow
 */
/**
 * @typedef {Object} Runner
 * @property {number} id @property {'zoomies'|'bigOne'} kind @property {number} track
 * @property {number} d @property {number} dEnd @property {number} v
 * @property {number} dmg @property {'bonk'|'sparkle'|'chaos'} dtype @property {number} knock
 * @property {number[]} hitIds @property {number} tid @property {number} x @property {number} y
 */

const tmp = { x: 0, y: 0, dx: 0, dy: 0 };

export class Sim {
  /**
   * @param {{level: LevelDef, layout: Layout, seed?: number, endless?: boolean, events?: boolean,
   *   challenge?: 'iron'|'nap'|null, hero?: string|null}} o
   */
  constructor(o) {
    this.level = o.level;
    this.layout = o.layout;
    this.endless = !!o.endless || o.level.id === 'endless';
    this.seed = (o.seed ?? o.level.seed) >>> 0;
    this.rng = mulberry32(this.seed);
    this.recordEvents = o.events !== false;
    /** @type {'iron'|'nap'|null} */
    this.challenge = o.challenge ?? null;
    this.gimmick = o.level.gimmick ?? null;
    const tr = buildTracks(o.layout);
    this.tracks = tr.ground;
    this.flyTracks = tr.fly;
    this.worldHp = this.endless ? 1 : WORLD_HP[o.level.worldIdx] ?? 1;
    this.bountyMul = this.endless ? 1 : 1 + 0.35 * o.level.worldIdx;
    this.tick = 0;
    this.time = 0;
    this.treats = o.level.startTreats;
    this.lives = o.level.lives;
    this.maxLives = o.level.lives;
    this.waveIdx = 0;
    this.totalWaves = this.endless ? Infinity : o.level.waves.length;
    /** @type {'prep'|'wave'|'won'|'lost'} */
    this.phase = 'prep';
    /** @type {number|null} */
    this.autoStartIn = null;
    /** @type {number|null} */
    this.nextIn = null;
    this.waveT = 0;
    /** @type {{t:number, id:string, path:number|'a', hpMul:number}[]} */
    this.spawns = [];
    this.spawnCounter = 0;
    /** @type {(Tower|null)[]} */
    this.towers = o.layout.spots.map(() => null);
    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Map<number, Enemy>} */
    this.enemyById = new Map();
    /** @type {Kitten[]} */
    this.kittens = [];
    /** @type {Projectile[]} */
    this.projectiles = [];
    /** @type {Zone[]} */
    this.zones = [];
    /** @type {Runner[]} */
    this.runners = [];
    /** @type {{at:number, kind:string, x:number, y:number, tid:number, r:number, dmg:number, stun:number, dtype:'bonk'|'sparkle'|'chaos', mark?:number, markT?:number}[]} */
    this.pending = [];
    /** @type {Record<PowerId, number>} */
    this.powerCd = { zoomies: 0, mug: 0, yowl: 0 };
    /** @type {any[]} */
    this.events = [];
    this.nextId = 1;
    this.dark = 0;
    this.endlessHpMul = 1;
    /** @type {Map<number, import('../data/waves.js').SpawnGroup[]>} */
    this.endlessCache = new Map();
    this.stats = { kills: 0, leaks: 0, earned: 0, befriended: 0, built: 0, stolen: 0 };
    this.boundary = true;
    // Challenges (Interactive Mode): Iron Cat = 1 snack, no powers; Nap Time = only the first 4 cushions.
    if (this.challenge === 'iron') this.lives = this.maxLives = 1;
    /** @type {boolean[]} */
    this.spotLocked = o.layout.spots.map((_, i) => this.challenge === 'nap' && i >= 4);
    // Gimmicks / moods.
    this.activePath = 0;
    this.sockSpot = -1;
    /** @type {string|null} */
    this.mood = null;
    this.sunbeamTid = 0;
    /** Box Fort blockers on the path. @type {{id:number, track:number, d:number, x:number, y:number, until:number}[]} */
    this.blockers = [];
    /** Label for the current damage source (e.g. 'mug', 'hero'), reported on kill events. */
    this.dmgSrc = '';
    /** @type {import('./extras.js').Hero|null} */
    this.hero = o.hero ? createHero(this, o.hero) : null;
  }

  // ───────────────────────── hero commands ─────────────────────────
  /** @param {number} x @param {number} y */
  heroMove(x, y) {
    return heroMove(this, x, y);
  }

  /** @param {'a1'|'a2'} which */
  heroAbility(which) {
    return heroAbility(this, which);
  }

  /** Disable the Sucktator's suction (mug or hero on the plug). @param {Enemy} e @param {string} by */
  unplug(e, by) {
    e.unplugT = 8;
    this.stun(e, 2);
    this.emit({ type: 'unplug', eid: e.id, x: e.plugX, y: e.plugY, by });
  }

  /** Can a cat be seated on this cushion right now? @param {number} spot */
  spotUsable(spot) {
    return spot >= 0 && spot < this.towers.length && !this.spotLocked[spot] && this.sockSpot !== spot;
  }

  // ───────────────────────── helpers ─────────────────────────
  /** @param {any} ev */
  emit(ev) {
    if (this.recordEvents) this.events.push(ev);
  }

  /** @param {number} n @param {string} why */
  addTreats(n, why) {
    if (n <= 0) return;
    this.treats += n;
    this.stats.earned += n;
    this.emit({ type: 'treats', amount: n, why });
  }

  /** Groups of wave index i (0-based); endless waves are generated deterministically. @param {number} i */
  waveGroups(i) {
    if (!this.endless) return this.level.waves[i] ?? null;
    let g = this.endlessCache.get(i);
    if (!g) {
      const w = endlessWave(i + 1, mulberry32((this.seed ^ Math.imul(i + 1, 2654435761)) >>> 0));
      g = w.groups;
      this.endlessCache.set(i, g);
    }
    return g;
  }

  /** Preview of the NEXT wave to start: [{id, count}] */
  nextWavePreview() {
    const g = this.waveGroups(this.waveIdx);
    if (!g) return [];
    /** @type {Map<string, number>} */
    const m = new Map();
    for (const s of g) m.set(s.id, (m.get(s.id) ?? 0) + s.n * (s.id === 'snip-snap' ? 2 : 1));
    return [...m].map(([id, count]) => ({ id, count }));
  }

  get canCallEarly() {
    if (this.phase === 'prep') return true;
    return this.phase === 'wave' && this.spawns.length === 0 && this.waveIdx < this.totalWaves;
  }

  get earlyBonus() {
    if (this.phase === 'prep') return 0;
    if (this.nextIn === null) return 0;
    return Math.ceil(this.nextIn);
  }

  // ───────────────────────── commands ─────────────────────────
  /** Start the next wave now (GO / Call Early). Returns the bonus paid. */
  callEarly() {
    if (!this.canCallEarly) return -1;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.addTreats(bonus, 'early');
      this.emit({ type: 'early', bonus });
    }
    this.startNextWave();
    return bonus;
  }

  startNextWave() {
    if (this.waveIdx >= this.totalWaves || this.phase === 'won' || this.phase === 'lost') return;
    const groups = this.waveGroups(this.waveIdx) ?? [];
    let hpMul = 1;
    if (this.endless) {
      hpMul = 1 + 0.09 * (this.waveIdx + 1) + 0.006 * (this.waveIdx + 1) ** 2;
      this.endlessHpMul = hpMul;
    }
    // Each wave's spawns are relative to now (waves can overlap when called early).
    for (const g of groups) for (let i = 0; i < g.n; i++) this.spawns.push({ t: this.waveT + g.at + i * g.gap, id: g.id, path: g.path, hpMul });
    this.spawns.sort((a, b) => a.t - b.t);
    this.waveIdx++;
    this.phase = 'wave';
    this.nextIn = null;
    this.autoStartIn = null;
    this.boundary = false;
    // Wave-start economy: Maneki Mochi income + Golden Paw interest.
    if (this.waveIdx > 1) this.payIncome();
    this.emit({ type: 'wave', n: this.waveIdx, total: this.totalWaves });
    onWaveStart(this);
  }

  payIncome() {
    for (const t of this.towers) {
      if (!t || !t.s.income) continue;
      this.addTreats(t.s.income, 'income');
      this.emit({ type: 'income', tid: t.id, amount: t.s.income });
      if (t.s.interest) {
        const v = Math.min(t.s.interestCap ?? 50, Math.floor(this.treats * t.s.interest));
        this.addTreats(v, 'interest');
      }
    }
  }

  /** @param {number} spot @param {string} catId @returns {boolean} */
  build(spot, catId) {
    if (this.phase === 'won' || this.phase === 'lost') return false;
    if (spot < 0 || spot >= this.towers.length || this.towers[spot] || !this.spotUsable(spot)) return false;
    if (!this.level.cats.includes(/** @type {any} */ (catId))) return false;
    const def = CAT_BY_ID[catId];
    if (!def) return false;
    const cost = def.tiers[0].cost;
    if (this.treats < cost) return false;
    this.treats -= cost;
    const p = this.layout.spots[spot];
    /** @type {Tower} */
    const t = {
      id: this.nextId++,
      spot,
      x: p.x,
      y: p.y,
      cat: catId,
      def,
      tier: 0,
      s: def.tiers[0],
      spent: cost,
      mode: 'first',
      cd: 0.3,
      skillT: 0,
      target: 0,
      beams: [],
      beamT: 0,
      wetT: 0,
      stunT: 0,
      boxT: 0,
      sad: false,
      lastAtkT: -9,
      idleT: 0,
      rally: null,
      kittens: [],
      kills: 0,
      dmgDone: 0,
    };
    this.towers[spot] = t;
    this.setupTower(t);
    this.stats.built++;
    if (this.phase === 'prep' && this.autoStartIn === null) this.autoStartIn = FIRST_WAVE_DELAY;
    this.emit({ type: 'place', tid: t.id, spot, cat: catId });
    return true;
  }

  /** Cost of the next tier for a tower (branch: 3=4A, 4=4B). @param {number} spot @param {number} [branch] */
  upgradeCost(spot, branch) {
    const t = this.towers[spot];
    if (!t) return null;
    const opts = nextTiers(t.tier);
    if (!opts.length) return null;
    const next = opts.length === 1 ? opts[0] : branch ?? opts[0];
    if (!opts.includes(next)) return null;
    return t.def.tiers[next].cost;
  }

  /** @param {number} spot @param {number} [branch] 3 = 4A, 4 = 4B (required at T3) @returns {boolean} */
  upgrade(spot, branch) {
    if (this.phase === 'won' || this.phase === 'lost') return false;
    const t = this.towers[spot];
    if (!t) return false;
    const opts = nextTiers(t.tier);
    if (!opts.length) return false;
    const next = opts.length === 1 ? opts[0] : branch;
    if (next === undefined || !opts.includes(next)) return false;
    const cost = t.def.tiers[next].cost;
    if (this.treats < cost) return false;
    this.treats -= cost;
    t.spent += cost;
    t.tier = next;
    t.s = t.def.tiers[next];
    t.skillT = 0;
    this.setupTower(t);
    this.emit({ type: 'upgrade', tid: t.id, spot, tier: next });
    return true;
  }

  /** @param {number} spot @returns {number} refund (-1 if nothing) */
  sell(spot) {
    const t = this.towers[spot];
    if (!t || this.phase === 'won' || this.phase === 'lost') return -1;
    const refund = Math.floor(t.spent * SELL_REFUND);
    this.treats += refund;
    this.removeKittens(t);
    this.zones = this.zones.filter((z) => z.tid !== t.id);
    this.towers[spot] = null;
    this.emit({ type: 'sell', tid: t.id, spot, refund, cat: t.cat });
    return refund;
  }

  /** @param {number} spot @param {TargetMode} mode */
  setTargeting(spot, mode) {
    const t = this.towers[spot];
    if (t) t.mode = mode;
  }

  /** @param {PowerId} id @param {number} [x] @param {number} [y] @returns {boolean} */
  usePower(id, x = 960, y = 540) {
    const P = POWERS[id];
    if (!P || this.powerCd[id] > 0 || this.phase === 'won' || this.phase === 'lost' || this.challenge === 'iron') return false;
    this.powerCd[id] = P.cd;
    const mul = this.endless ? this.endlessHpMul : this.worldHp;
    if (id === 'zoomies') {
      this.tracks.forEach((tr, ti) => {
        this.runners.push({ id: this.nextId++, kind: 'zoomies', track: ti, d: tr.length, dEnd: 0, v: -1500, dmg: POWERS.zoomies.dmg * mul, dtype: 'chaos', knock: 0, hitIds: [], tid: 0, x: 0, y: 0 });
      });
      this.dmgSrc = 'zoomies';
      for (const e of this.enemies) if (e.fly && e.alive) this.damage(e, POWERS.zoomies.dmg * mul, 'chaos', null);
      this.dmgSrc = '';
    } else if (id === 'mug') {
      this.pending.push({ at: this.time + 0.45, kind: 'mug', x, y, tid: 0, r: POWERS.mug.radius, dmg: POWERS.mug.dmg * mul, stun: POWERS.mug.stun, dtype: 'chaos' });
    } else if (id === 'yowl') {
      for (const e of this.enemies) if (e.alive && !e.friendly) e.stunT = Math.max(e.stunT, e.boss ? 1 : POWERS.yowl.stun);
    }
    this.emit({ type: 'power', id, x, y });
    return true;
  }

  // ───────────────────────── setup ─────────────────────────
  /** (Re)build tower-owned things after build/upgrade/restore. @param {Tower} t */
  setupTower(t) {
    const s = t.s;
    if (t.def.kind === 'barracks' && s.kittens) {
      if (!t.rally) {
        const r = nearestOnTracks(this.tracks, t);
        t.rally = { x: r.x, y: r.y, track: r.track, d: r.d };
      }
      const names = ['beans', 'biscuit', 'noodle', 'tofu'];
      for (let i = 0; i < s.kittens.n; i++) {
        let k = this.kittens.find((q) => q.towerId === t.id && q.slot === i);
        if (!k) {
          k = { id: this.nextId++, towerId: t.id, name: names[i % 4], slot: i, x: t.x, y: t.y, hp: s.kittens.hp, maxHp: s.kittens.hp, cd: 0, target: 0, respawnT: 0, alive: true, dizzyT: 0, lastAtkT: -9 };
          this.kittens.push(k);
          t.kittens.push(k.id);
          this.emit({ type: 'kittenSpawn', kid: k.id, tid: t.id });
        } else {
          k.maxHp = s.kittens.hp;
          if (k.alive) k.hp = k.maxHp;
        }
      }
    }
    if (s.skill === 'tangle') {
      const r = nearestOnTracks(this.tracks, t);
      this.zones = this.zones.filter((z) => z.tid !== t.id);
      this.zones.push({ id: this.nextId++, kind: 'web', tid: t.id, x: r.x, y: r.y, r: s.skillRadius ?? 140, t: 0, life: Infinity, dps: 0, vibe: 0, slow: s.slow ?? 0.6 });
    }
  }

  /** @param {Tower} t */
  removeKittens(t) {
    for (const k of this.kittens) if (k.towerId === t.id) this.releaseKitten(k);
    this.kittens = this.kittens.filter((k) => k.towerId !== t.id);
    t.kittens = [];
  }

  /** @param {Kitten} k */
  releaseKitten(k) {
    if (!k.target) return;
    const e = this.enemyById.get(k.target);
    if (e && e.blockedBy === k.id) e.blockedBy = 0;
    k.target = 0;
  }

  /**
   * @param {string} id @param {number} path @param {boolean} fly @param {number} d @param {number} hpMul
   * @param {number} [pairId]
   */
  spawnEnemy(id, path, fly, d, hpMul, pairId = 0) {
    const def = ENEMY_BY_ID[id];
    if (!def) return null;
    const tracks = fly ? this.flyTracks : this.tracks;
    const track = ((path % tracks.length) + tracks.length) % tracks.length;
    let hp = def.boss ? def.hp * (this.endless ? 0.5 * hpMul : 1) : def.hp * this.worldHp * hpMul;
    const rain = this.gimmick?.kind === 'rain' && id === 'spritz' ? this.gimmick : null;
    if (rain) hp *= rain.hp;
    /** @type {Enemy} */
    const e = {
      id: this.nextId++,
      type: id,
      def,
      boss: !!def.boss,
      hp,
      maxHp: hp,
      shield: 0,
      x: 0,
      y: 0,
      d,
      track,
      fly,
      off: def.boss ? 0 : (this.rng() - 0.5) * 34,
      hx: 1,
      hy: 0,
      speed: def.speed * SPEED_UNIT,
      size: def.size ?? 22,
      slowK: 0,
      slowT: 0,
      stunT: 0,
      vibeT: 0,
      vibeCd: 0,
      markK: 0,
      markT: 0,
      shred: 0,
      hidden: !!def.stealth,
      blockedBy: 0,
      enraged: false,
      pairId,
      phase: 0,
      abT: def.boss ? 4 : 0,
      abT2: 0,
      jar: false,
      jarT: 0,
      overheat: false,
      sprint: 1,
      stuckT: 0,
      drainT: 0,
      friendly: false,
      friendlyT: 0,
      alive: true,
      bounty: Math.round(def.bounty * this.bountyMul),
      snacks: def.snacks,
      sprayT: def.spray ? def.spray.every * 0.6 : 0,
      boomT: def.boom ? def.boom.every * 0.6 : 0,
      hasted: false,
      lastHitT: -9,
      bornT: this.time,
      covered: false,
      tauntT: 0,
      unplugT: 0,
      plugX: 0,
      plugY: 0,
    };
    this.placeEnemy(e);
    this.enemies.push(e);
    this.enemyById.set(e.id, e);
    this.emit({ type: 'spawn', eid: e.id, id, boss: e.boss });
    return e;
  }

  /** @param {Enemy} e */
  placeEnemy(e) {
    const tr = (e.fly ? this.flyTracks : this.tracks)[e.track];
    sampleTrack(tr, e.d, tmp);
    e.hx = tmp.dx;
    e.hy = tmp.dy;
    e.x = tmp.x - tmp.dy * e.off;
    e.y = tmp.y + tmp.dx * e.off;
  }

  // ───────────────────────── combat ─────────────────────────
  /** @param {Tower} t */
  mochiBuffs(t) {
    let dmg = 0;
    let range = 0;
    let wetImmune = false;
    for (const m of this.towers) {
      if (!m || m.def.kind !== 'support' || m === t) continue;
      const r = m.s.range;
      if ((m.x - t.x) ** 2 + (m.y - t.y) ** 2 > r * r) continue;
      dmg = Math.max(dmg, m.s.aura ?? 0);
      range = Math.max(range, m.s.auraRange ?? 0);
      if (m.s.wetImmune) wetImmune = true;
    }
    if (t.def.kind === 'support' && t.s.wetImmune) wetImmune = true;
    range += heroRangeBonus(this, t);
    return { dmg, range, wetImmune };
  }

  /** @param {Tower} t */
  rangeOf(t) {
    return t.s.range * (1 + this.mochiBuffs(t).range);
  }

  /** @param {Tower} t */
  dmgMul(t) {
    let m = 1 + this.mochiBuffs(t).dmg + (t.boxT > 0 ? 0.25 : 0);
    const mood = moodOf(this);
    if (mood?.catDmg) m *= mood.catDmg;
    if (mood?.sunbeam && t.id === this.sunbeamTid) m *= 2;
    return m;
  }

  /** Can tower t attack enemy e at all (ignoring range)? @param {Tower} t @param {Enemy} e */
  canTarget(t, e) {
    if (!e.alive || e.friendly || e.hidden || e.covered) return false;
    if (e.def.immuneToTowers && !t.def.canHitBed) return false;
    if (e.fly && t.def.groundOnly) return false;
    return true;
  }

  /**
   * Pick a target for tower t. `exclude` lets multi-beam towers spread out.
   * @param {Tower} t @param {number} range @param {number[]} [exclude] @returns {Enemy|null}
   */
  acquire(t, range, exclude) {
    let best = null;
    let bestScore = -Infinity;
    let taunted = false;
    for (const e of this.enemies) {
      if (!this.canTarget(t, e)) continue;
      if (exclude && exclude.includes(e.id)) continue;
      const dx = e.x - t.x;
      const dy = e.y - t.y;
      const rr = range + e.size * 0.5;
      const d2 = dx * dx + dy * dy;
      if (d2 > rr * rr) continue;
      const isTaunt = !!e.def.taunt;
      if (taunted && !isTaunt) continue;
      if (isTaunt && !taunted) {
        taunted = true;
        best = null;
        bestScore = -Infinity;
      }
      const len = (e.fly ? this.flyTracks : this.tracks)[e.track].length;
      const progress = e.d / len;
      let score;
      switch (t.mode) {
        case 'last':
          score = -progress;
          break;
        case 'strong':
          score = e.hp + e.shield + progress * 0.01;
          break;
        case 'close':
          score = -d2;
          break;
        default:
          score = progress;
      }
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  /**
   * Apply damage. Returns damage dealt.
   * @param {Enemy} e @param {number} amount @param {'bonk'|'sparkle'|'chaos'} dtype @param {Tower|null} src @param {{quiet?:boolean, crit?:boolean}} [o]
   */
  damage(e, amount, dtype, src, o = {}) {
    if (!e.alive || e.friendly || amount <= 0) return 0;
    let m = 1;
    if (dtype === 'bonk') {
      const armor = e.jar ? 0.95 : e.def.armor ?? 0;
      m *= 1 - Math.max(0, armor - e.shred * 0.05);
    } else if (dtype === 'sparkle') {
      const shine = e.jar ? 0.95 : e.def.shine ?? 0;
      m *= 1 - shine;
    }
    if (e.markT > 0) m *= 1 + e.markK;
    if (e.overheat) m *= 2;
    if (e.stuckT > 0) m *= 1.75; // Bathzilla stuck in the drain: free hits!
    let dmg = amount * m;
    if (e.shield > 0) {
      const a = Math.min(e.shield, dmg);
      e.shield -= a;
      dmg -= a;
    }
    e.hp -= dmg;
    e.lastHitT = this.time;
    if (src) src.dmgDone += dmg;
    if (!o.quiet) this.emit({ type: 'hit', eid: e.id, amount: dmg, x: e.x, y: e.y, crit: !!o.crit, dtype });
    if (e.boss) this.bossPhaseCheck(e);
    if (e.hp <= 0) this.kill(e, src);
    return dmg;
  }

  /** @param {Enemy} e */
  bossPhaseCheck(e) {
    const f = e.hp / e.maxHp;
    const want = f <= 0.33 ? 2 : f <= 0.66 ? 1 : 0;
    if (want <= e.phase || e.hp <= 0) return;
    e.phase = want;
    e.abT = 1.5;
    const names = /** @type {Record<string,string[]>} */ (BOSS_PHASES)[e.type] ?? [];
    if (e.type === 'cucumberto' && want === 1) {
      e.jar = true;
      e.jarT = 9;
    }
    if (e.type === 'cucumberto' && want === 2) {
      e.jar = false;
      e.sprint = 2;
    }
    if (e.type === 'sucktator' && want === 2) e.overheat = true;
    if (e.type === 'great-bowl' && want === 2) this.dark = 1;
    this.emit({ type: 'phase', eid: e.id, id: e.type, phase: want, name: names[want] ?? 'Phase ' + (want + 1) });
  }

  /** @param {Enemy} e @param {Tower|null} src */
  kill(e, src) {
    if (e.def.friendly) {
      e.friendly = true;
      e.hp = 0;
      e.friendlyT = 2.5;
      e.stunT = 0;
      this.releaseBlock(e);
      this.stats.befriended++;
      this.addTreats(e.bounty, 'befriend');
      this.emit({ type: 'befriend', eid: e.id, x: e.x, y: e.y, bounty: e.bounty });
      return;
    }
    e.alive = false;
    this.releaseBlock(e);
    this.stats.kills++;
    if (src) src.kills++;
    let bounty = e.bounty;
    for (const m of this.towers) {
      if (m && m.s.killBonus && (m.x - e.x) ** 2 + (m.y - e.y) ** 2 <= m.s.range * m.s.range) bounty += m.s.killBonus;
    }
    bounty += heroOnKill(this, e);
    this.addTreats(bounty, 'kill');
    this.emit({ type: 'kill', eid: e.id, id: e.type, x: e.x, y: e.y, bounty, boss: e.boss, by: this.dmgSrc || (src ? src.cat : '') });
    const def = e.def;
    if (def.splitInto) {
      for (let i = 0; i < def.splitInto.n; i++) {
        const c = this.spawnEnemy(def.splitInto.id, e.track, e.fly, Math.max(0, e.d - i * 14), 1);
        if (c) c.maxHp = c.hp = c.hp * (this.endless ? this.endlessHpMul : 1);
      }
      this.emit({ type: 'split', eid: e.id, x: e.x, y: e.y });
    }
    if (def.spawnOnDeath) {
      for (let i = 0; i < def.spawnOnDeath.n; i++) this.spawnEnemy(def.spawnOnDeath.id, e.track, e.fly, Math.max(0, e.d - i * 16), this.endless ? this.endlessHpMul : 1);
    }
    if (def.hideCats) this.scareCats(e.x, e.y, 200, 1, 'hide');
    if (def.twin && e.pairId) {
      for (const o of this.enemies) {
        if (o.alive && o.pairId === e.pairId && o !== e && !o.enraged) {
          o.enraged = true;
          this.emit({ type: 'enrage', eid: o.id });
        }
      }
    }
    if (def.surprise) {
      if (this.rng() < 0.5) {
        this.addTreats(15, 'surprise');
        this.emit({ type: 'surprise', kind: 'treats', x: e.x, y: e.y });
      } else {
        for (let i = 0; i < 2; i++) this.spawnEnemy('cucumber-cadet', e.track, false, Math.max(0, e.d - i * 16), 1);
        this.emit({ type: 'surprise', kind: 'cadets', x: e.x, y: e.y });
      }
    }
    if (def.dropsBox) {
      for (const t of this.towers) if (t && (t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= 260 * 260) t.boxT = 8;
      this.emit({ type: 'box', x: e.x, y: e.y });
    }
  }

  /** @param {Enemy} e */
  releaseBlock(e) {
    if (!e.blockedBy) return;
    if (e.blockedBy === HERO_ID && this.hero) this.hero.blocking = this.hero.blocking.filter((id) => id !== e.id);
    const k = this.kittens.find((q) => q.id === e.blockedBy);
    if (k && k.target === e.id) k.target = 0;
    e.blockedBy = 0;
  }

  /** Stun cats near a point (startle / hide). @param {number} x @param {number} y @param {number} r @param {number} dur @param {string} why */
  scareCats(x, y, r, dur, why) {
    /** @type {number[]} */
    const tids = [];
    for (const t of this.towers) {
      if (!t || (t.x - x) ** 2 + (t.y - y) ** 2 > r * r) continue;
      t.stunT = Math.max(t.stunT, dur);
      tids.push(t.id);
    }
    if (tids.length) this.emit({ type: why, tids, x, y });
  }

  /** @param {Tower} t @param {number} dur @returns {boolean} */
  wetCat(t, dur) {
    if (this.mochiBuffs(t).wetImmune) return false;
    t.wetT = Math.max(t.wetT, dur);
    return true;
  }

  /**
   * Resolve a projectile/instant hit on e from tower t.
   * @param {Tower} t @param {Enemy} e @param {any} h hit params @param {boolean} isProjectile
   */
  applyHit(t, e, h, isProjectile) {
    if (!e.alive || e.friendly) return;
    if (isProjectile) {
      if (h.lob && e.def.blockLob) {
        this.emit({ type: 'block', eid: e.id, x: e.x, y: e.y, why: 'umbrella' });
        return;
      }
      if (e.def.shieldFront && e.hx * (t.x - e.x) + e.hy * (t.y - e.y) > 0) {
        this.emit({ type: 'block', eid: e.id, x: e.x, y: e.y, why: 'cone' });
        return;
      }
      if (h.lob && e.def.absorbLob) {
        this.damage(e, h.dmg * 0.25, h.dtype, t);
        for (const o of this.enemies) {
          if (o.alive && o !== e && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 160 * 160) o.shield = Math.min(o.shield + 8 * this.worldHp, 40 * this.worldHp);
        }
        this.emit({ type: 'absorb', eid: e.id, x: e.x, y: e.y });
        return;
      }
    }
    let dmg = h.dmg;
    let crit = false;
    if (h.crit && this.rng() < h.crit) {
      dmg *= h.critMul ?? 3;
      crit = true;
    }
    if (h.radius) {
      const r2 = h.radius * h.radius;
      for (const o of this.enemies) {
        if (!this.canTarget(t, o) || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > r2) continue;
        this.damage(o, o === e ? dmg : dmg * 0.6, h.dtype, t, { crit });
        if (h.slow) this.slow(o, h.slow, h.slowT);
      }
    } else {
      this.damage(e, dmg, h.dtype, t, { crit });
      if (h.slow) this.slow(e, h.slow, h.slowT);
    }
    if (h.shred && e.alive) e.shred = Math.min(10, e.shred + 1);
  }

  /** @param {Enemy} e @param {number} k @param {number} dur */
  slow(e, k, dur) {
    const kk = e.boss ? k * 0.5 : k;
    if (kk >= e.slowK || e.slowT <= 0) e.slowK = kk;
    e.slowT = Math.max(e.slowT, dur);
  }

  /** @param {Enemy} e @param {number} dur */
  vibe(e, dur) {
    if (e.vibeCd > 0 || !e.alive || e.friendly) return;
    e.vibeT = e.boss ? dur * 0.25 : dur;
    e.vibeCd = e.vibeT + 2;
    this.emit({ type: 'vibe', eid: e.id });
  }

  /** @param {Enemy} e @param {number} dur */
  stun(e, dur) {
    e.stunT = Math.max(e.stunT, e.boss ? dur * 0.3 : dur);
  }

  // ───────────────────────── step ─────────────────────────
  step() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    const dt = DT;
    this.tick++;
    this.time += dt;
    for (const k of /** @type {PowerId[]} */ (['zoomies', 'mug', 'yowl'])) if (this.powerCd[k] > 0) this.powerCd[k] = Math.max(0, this.powerCd[k] - dt);
    this.stepWaves(dt);
    this.stepAuras();
    this.stepStealth();
    updateCover(this);
    this.stepEnemies(dt);
    this.stepKittens(dt);
    stepHero(this, dt);
    this.stepTowers(dt);
    this.stepProjectiles(dt);
    this.stepZones(dt);
    this.stepRunners(dt);
    this.stepPending();
    if (this.blockers.length && this.blockers.some((b) => b.until <= this.time)) this.blockers = this.blockers.filter((b) => b.until > this.time);
    this.cleanup();
    this.checkEnd();
  }

  /** @param {number} dt */
  stepWaves(dt) {
    if (this.phase === 'prep') {
      if (this.autoStartIn !== null) {
        this.autoStartIn -= dt;
        if (this.autoStartIn <= 0) this.startNextWave();
      }
      return;
    }
    this.waveT += dt;
    while (this.spawns.length && this.spawns[0].t <= this.waveT) {
      const s = /** @type {any} */ (this.spawns.shift());
      const def = ENEMY_BY_ID[s.id];
      if (!def) continue;
      const fly = !!def.flier;
      const n = (fly ? this.flyTracks : this.tracks).length;
      let path = s.path === 'a' ? this.spawnCounter++ % n : s.path;
      // Sliding screens: ground enemies only use the open route.
      if (this.gimmick?.kind === 'screens' && !fly && s.path === 'a') path = this.activePath % n;
      if (def.twin) {
        const pid = this.nextId++;
        this.spawnEnemy(s.id, path, fly, 0, s.hpMul, pid);
        this.spawnEnemy(s.id, path, fly, -18, s.hpMul, pid);
      } else this.spawnEnemy(s.id, path, fly, 0, s.hpMul);
    }
    if (this.spawns.length === 0 && this.waveIdx < this.totalWaves) {
      if (this.nextIn === null) this.nextIn = WAVE_GAP;
      if (this.enemies.length === 0 && this.nextIn > 5) this.nextIn = 5;
      this.nextIn -= dt;
      if (this.nextIn <= 0) this.startNextWave();
    }
    if (this.spawns.length === 0 && this.enemies.length === 0 && !this.boundary) {
      this.boundary = true;
      this.emit({ type: 'waveClear', n: this.waveIdx });
    }
  }

  stepAuras() {
    for (const e of this.enemies) e.hasted = false;
    for (const t of this.towers) if (t) t.sad = this.dark > 0;
    for (const a of this.enemies) {
      if (!a.alive || a.friendly || !a.def.aura) continue;
      const r2 = (a.def.auraR ?? 160) ** 2;
      if (a.def.aura === 'haste') {
        for (const e of this.enemies) if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 <= r2) e.hasted = true;
      } else if (a.def.aura === 'despair') {
        for (const t of this.towers) if (t && (t.x - a.x) ** 2 + (t.y - a.y) ** 2 <= r2) t.sad = true;
      }
    }
  }

  stepStealth() {
    for (const e of this.enemies) {
      if (!e.hidden || !e.alive) continue;
      let byMochi = false;
      let byCat = false;
      for (const t of this.towers) {
        if (!t) continue;
        const d2 = (t.x - e.x) ** 2 + (t.y - e.y) ** 2;
        if (t.def.kind === 'support' && d2 <= this.rangeOf(t) ** 2) byMochi = true;
        else if (d2 <= REVEAL_R * REVEAL_R) byCat = true;
      }
      if (byMochi || byCat) {
        e.hidden = false;
        this.emit({ type: 'reveal', eid: e.id, x: e.x, y: e.y, startle: !byMochi });
        if (!byMochi) this.scareCats(e.x, e.y, 180, 1, 'startle');
      }
    }
  }

  /** @param {number} dt */
  stepEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.friendly) {
        e.friendlyT -= dt;
        if (e.friendlyT <= 0) {
          e.alive = false;
          this.emit({ type: 'gone', eid: e.id });
        }
        continue;
      }
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.slowK = 0;
      }
      if (e.markT > 0) e.markT -= dt;
      if (e.vibeCd > 0) e.vibeCd -= dt;
      if (e.boss) this.stepBoss(e, dt);
      if (!e.alive) continue;
      this.stepEnemyAbilities(e, dt);
      if (e.stunT > 0) {
        e.stunT -= dt;
        continue;
      }
      if (e.stuckT > 0) {
        e.stuckT -= dt;
        continue;
      }
      if (e.tauntT > 0) {
        // Shop's Closed: stands around arguing with Big Tom.
        e.tauntT -= dt;
        const h = this.hero;
        if (h && h.alive) {
          hurtHero(this, (e.def.atk ?? 3) * 0.5 * this.worldHp ** 0.5 * dt);
          continue;
        }
      }
      if (e.blockedBy === HERO_ID) {
        const h = this.hero;
        if (!h || !h.alive) e.blockedBy = 0;
        else if ((h.x - e.x) ** 2 + (h.y - e.y) ** 2 < 46 * 46) {
          hurtHero(this, (e.def.atk ?? 3) * this.worldHp ** 0.5 * dt * (e.enraged ? 1.5 : 1));
          continue;
        }
      } else if (e.blockedBy) {
        const k = this.kittens.find((q) => q.id === e.blockedBy);
        if (!k || !k.alive || k.target !== e.id) e.blockedBy = 0;
        else if ((k.x - e.x) ** 2 + (k.y - e.y) ** 2 < 34 * 34) {
          // Fighting the kitten: hold position and scratch it.
          const atk = e.def.atk ?? 3;
          const dodge = this.towerOfKitten(k)?.s.kittens?.dodge ?? 0;
          k.hp -= atk * this.worldHp ** 0.5 * dt * (1 - dodge) * (e.enraged ? 1.5 : 1);
          if (k.hp <= 0) this.kittenDown(k);
          continue;
        }
      }
      let v = e.speed * (1 - e.slowK) * (e.hasted ? 1.3 : 1) * (e.enraged ? 1.6 : 1) * e.sprint * (moodOf(this)?.enemySpeed ?? 1);
      if (e.vibeT > 0) {
        e.vibeT -= dt;
        e.d = Math.max(0, e.d - v * 0.6 * dt);
      } else {
        let nd = e.d + v * dt;
        // Box Fort: ground enemies (not bosses) can't get past the box.
        if (!e.fly && !e.boss) {
          for (const b of this.blockers) {
            if (b.track === e.track && e.d <= b.d - 20 && nd > b.d - 24) nd = Math.max(e.d, b.d - 24);
          }
        }
        e.d = nd;
      }
      const tr = (e.fly ? this.flyTracks : this.tracks)[e.track];
      if (e.d >= tr.length) {
        this.leak(e);
        continue;
      }
      this.placeEnemy(e);
    }
  }

  /** @param {Enemy} e @param {number} dt */
  stepEnemyAbilities(e, dt) {
    const def = e.def;
    if (def.spray) {
      const rain = this.gimmick?.kind === 'rain' && e.type === 'spritz' ? this.gimmick : null;
      e.sprayT -= dt;
      if (e.sprayT <= 0) {
        const r2 = def.spray.range ** 2;
        /** @type {Tower[]} */
        const near = [];
        for (const t of this.towers) if (t && t.wetT <= 0 && (t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= r2) near.push(t);
        if (near.length) {
          near.sort((a, b) => (a.x - e.x) ** 2 + (a.y - e.y) ** 2 - ((b.x - e.x) ** 2 + (b.y - e.y) ** 2));
          /** @type {number[]} */
          const tids = [];
          for (const t of near.slice(0, def.spray.count)) if (this.wetCat(t, def.spray.wet * (rain ? rain.wet : 1))) tids.push(t.id);
          if (tids.length) this.emit({ type: 'spray', eid: e.id, tids, x: e.x, y: e.y });
          e.sprayT = def.spray.every * (rain ? rain.every : 1);
        } else e.sprayT = 0.5;
      }
    }
    if (def.boom) {
      e.boomT -= dt;
      if (e.boomT <= 0) {
        e.boomT = def.boom.every;
        this.emit({ type: 'boom', eid: e.id, x: e.x, y: e.y });
        this.scareCats(e.x, e.y, def.boom.range, def.boom.hide, 'hide');
      }
    }
  }

  /** @param {Enemy} e @param {number} dt */
  stepBoss(e, dt) {
    e.abT -= dt;
    const ph = e.phase;
    switch (e.type) {
      case 'cucumberto':
        if (ph === 0 && e.abT <= 0) {
          e.abT = 8;
          for (let i = 0; i < 3; i++) this.spawnEnemy('sneaky-pickle', e.track, false, Math.max(0, e.d - 40 - i * 20), 1);
          this.emit({ type: 'ability', eid: e.id, name: 'Pickle Squad!' });
        }
        if (e.jar) {
          e.jarT -= dt;
          if (e.jarT <= 0) this.popJar(e);
        }
        break;
      case 'sucktator':
        if (ph === 0 && e.abT <= 0) {
          e.abT = 6;
          for (let i = 0; i < 3; i++) this.spawnEnemy('rubber-duckie', e.track, false, Math.max(0, e.d - 30 - i * 14), 1);
          this.emit({ type: 'ability', eid: e.id, name: '*cough* dust bunnies' });
        }
        if (ph === 1) {
          // The cord trails behind it; a mug or the hero on the plug cuts the power.
          sampleTrack(this.tracks[e.track], Math.max(0, e.d - 150), tmp);
          e.plugX = tmp.x - tmp.dy * 40;
          e.plugY = tmp.y + tmp.dx * 40;
          if (e.unplugT > 0) {
            e.unplugT -= dt;
            break;
          }
          for (const p of this.projectiles) {
            if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < 260 * 260) {
              p.dur = -1;
              p.hit = null;
              this.emit({ type: 'inhale', eid: e.id, x: p.x, y: p.y });
            }
          }
          if (e.abT <= 0) {
            e.abT = 5;
            for (const k of this.kittens) if (k.alive && (k.x - e.x) ** 2 + (k.y - e.y) ** 2 < 220 * 220) k.dizzyT = 2;
            this.emit({ type: 'ability', eid: e.id, name: 'SUCK MODE' });
          }
        }
        break;
      case 'bathzilla':
        if (ph === 0 && e.abT <= 0) {
          e.abT = 5;
          /** @type {number[]} */
          const tids = [];
          for (const t of this.towers) if (t && (t.x - e.x) ** 2 + (t.y - e.y) ** 2 < 300 * 300 && this.wetCat(t, 2.5)) tids.push(t.id);
          this.emit({ type: 'spray', eid: e.id, tids, x: e.x, y: e.y });
        }
        if (ph === 1 && e.abT <= 0) {
          e.abT = 6;
          for (let i = 0; i < 5; i++) this.spawnEnemy('rubber-duckie', e.track, false, Math.max(0, e.d - 30 - i * 12), 1);
          this.emit({ type: 'ability', eid: e.id, name: 'Duckie Armada!' });
        }
        if (ph === 2) {
          e.drainT -= dt;
          if (e.drainT <= 0 && e.stuckT <= 0) {
            if (e.sprint > 1) {
              e.sprint = 1;
              e.stuckT = 5;
              e.drainT = 9;
              this.emit({ type: 'ability', eid: e.id, name: 'Stuck in the drain! Free hits!' });
              this.emit({ type: 'drain', eid: e.id, x: e.x, y: e.y, dur: 5 });
            } else {
              e.sprint = 1.6;
              e.drainT = 4;
            }
          }
        }
        break;
      case 'great-bowl':
        if (ph === 0 && e.abT <= 0) {
          e.abT = 10;
          this.spawnEnemy('monday', e.track, false, Math.max(0, e.d - 40), 1);
          this.spawnEnemy('overdue-bill', e.track, false, Math.max(0, e.d - 60), 1);
          this.emit({ type: 'ability', eid: e.id, name: 'Dinner Is Late' });
        }
        if (ph === 1 && e.abT <= 0) {
          e.abT = 3;
          const heal = Math.min(e.maxHp * 0.66 - e.hp, e.maxHp * 0.025);
          if (heal > 0) {
            e.hp += heal;
            this.emit({ type: 'heal', eid: e.id, amount: heal, x: e.x, y: e.y });
          }
        }
        break;
    }
  }

  /** @param {Enemy} e */
  popJar(e) {
    if (!e.jar) return;
    e.jar = false;
    this.emit({ type: 'ability', eid: e.id, name: 'Jar popped!' });
  }

  /** @param {Enemy} e */
  leak(e) {
    e.alive = false;
    this.releaseBlock(e);
    this.stats.leaks++;
    let stolen = 0;
    if (e.def.stealsTreats) {
      stolen = Math.floor(this.treats * e.def.stealsTreats);
      this.treats -= stolen;
      this.stats.stolen += stolen;
    }
    this.lives = Math.max(0, this.lives - e.snacks);
    this.emit({ type: 'leak', eid: e.id, id: e.type, snacks: e.snacks, stolen, x: e.x, y: e.y });
  }

  /** @param {Kitten} k */
  towerOfKitten(k) {
    for (const t of this.towers) if (t && t.id === k.towerId) return t;
    return null;
  }

  /** @param {Kitten} k */
  kittenDown(k) {
    k.alive = false;
    k.hp = 0;
    this.releaseKitten(k);
    const t = this.towerOfKitten(k);
    k.respawnT = t?.s.kittens?.respawn ?? 8;
    this.emit({ type: 'kittenDown', kid: k.id, tid: k.towerId, name: k.name, x: k.x, y: k.y });
  }

  /** @param {number} dt */
  stepKittens(dt) {
    for (const k of this.kittens) {
      const t = this.towerOfKitten(k);
      if (!t || !t.rally || !t.s.kittens) continue;
      const ks = t.s.kittens;
      if (!k.alive) {
        k.respawnT -= dt;
        if (k.respawnT <= 0) {
          k.alive = true;
          k.smoked = false;
          k.hp = k.maxHp = ks.hp;
          k.x = t.x;
          k.y = t.y;
          this.emit({ type: 'kittenSpawn', kid: k.id, tid: t.id });
        }
        continue;
      }
      if (k.dizzyT > 0) {
        k.dizzyT -= dt;
        this.releaseKitten(k);
        continue;
      }
      if (k.hp < k.maxHp && !k.target) k.hp = Math.min(k.maxHp, k.hp + k.maxHp * 0.08 * dt);
      // Ninja Kittens (4A) "Smoke Puff": once per life, vanish in smoke instead of going down.
      if (t.s.skill === 'ninja' && !k.smoked && k.hp < k.maxHp * 0.3) {
        k.smoked = true;
        k.hp = k.maxHp * 0.6;
        for (const o of this.enemies) if (o.alive && !o.friendly && (o.x - k.x) ** 2 + (o.y - k.y) ** 2 < 80 * 80) this.stun(o, 1);
        this.releaseKitten(k);
        this.emit({ type: 'smoke', kid: k.id, x: k.x, y: k.y });
        k.x = t.rally.x;
        k.y = t.rally.y;
        continue;
      }
      const slotA = (k.slot / Math.max(1, ks.n)) * Math.PI * 2;
      const hx = t.rally.x + Math.cos(slotA) * 26;
      const hy = t.rally.y + Math.sin(slotA) * 14;
      let e = k.target ? this.enemyById.get(k.target) : undefined;
      if (e && (!e.alive || e.friendly || e.hidden || e.covered || (e.x - t.rally.x) ** 2 + (e.y - t.rally.y) ** 2 > 190 * 190)) {
        this.releaseKitten(k);
        e = undefined;
      }
      if (!e) {
        // Engage: prefer an unblocked enemy near the rally point.
        let best = null;
        let bestD = 125 * 125;
        let bestFree = false;
        for (const o of this.enemies) {
          if (!o.alive || o.friendly || o.hidden || o.covered) continue;
          if (o.fly && !ks.ranged) continue;
          const d2 = (o.x - t.rally.x) ** 2 + (o.y - t.rally.y) ** 2;
          if (d2 > 125 * 125) continue;
          const free = !o.blockedBy && !o.fly;
          if ((free && !bestFree) || (free === bestFree && d2 < bestD)) {
            best = o;
            bestD = d2;
            bestFree = free;
          }
        }
        if (best) {
          k.target = best.id;
          if (!best.blockedBy && !best.fly) best.blockedBy = k.id;
          e = best;
        }
      }
      const spd = 150 * dt;
      if (e) {
        const dx = e.x - k.x;
        const dy = e.y - k.y;
        const dist = Math.hypot(dx, dy);
        const reach = e.fly || (ks.ranged && e.blockedBy !== k.id) ? 110 : 26;
        if (dist > reach) {
          k.x += (dx / dist) * Math.min(spd, dist - reach * 0.9);
          k.y += (dy / dist) * Math.min(spd, dist - reach * 0.9);
        } else {
          k.cd -= dt;
          if (k.cd <= 0) {
            k.cd = ks.rate;
            k.lastAtkT = this.time;
            this.damage(e, ks.dmg * this.dmgMul(t), 'bonk', t);
            this.emit({ type: 'kittenAttack', kid: k.id, eid: e.id, ranged: dist > 40 });
          }
        }
      } else {
        const dx = hx - k.x;
        const dy = hy - k.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          k.x += (dx / dist) * Math.min(spd, dist);
          k.y += (dy / dist) * Math.min(spd, dist);
        }
      }
    }
  }

  /** @param {number} dt */
  stepTowers(dt) {
    for (const t of this.towers) {
      if (!t) continue;
      t.idleT += dt;
      if (t.boxT > 0) t.boxT -= dt;
      if (t.wetT > 0) {
        t.wetT -= dt;
        t.beams.length = 0;
        continue;
      }
      if (t.stunT > 0) {
        t.stunT -= dt;
        t.beams.length = 0;
        continue;
      }
      let rateMul = t.sad ? 0.7 : 1;
      if (this.dark > 0) rateMul *= 0.8 / 0.7;
      if (t.boxT > 0) rateMul *= 1.25;
      if (t.spot === this.sockSpot) rateMul *= 0.5; // a sock landed on its head
      rateMul *= moodOf(this)?.catRate ?? 1;
      const s = t.s;
      const range = this.rangeOf(t);
      const kind = t.def.kind;
      t.cd -= dt * rateMul;
      if (t.skillT > 0) t.skillT -= dt * rateMul;
      if (kind === 'barracks') continue;
      if (kind === 'beam') {
        this.stepBeam(t, dt * rateMul, range);
        continue;
      }
      if (s.skill === 'tangle' && t.skillT <= 0) {
        // Lost Needle: every few seconds a random enemy in range trips over a stray needle.
        const pool = this.enemies.filter((e) => this.canTarget(t, e) && !e.fly && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= range * range);
        if (pool.length) {
          const e = pool[Math.floor(this.rng() * pool.length)];
          this.stun(e, 0.9);
          this.emit({ type: 'trip', tid: t.id, eid: e.id, x: e.x, y: e.y });
          t.skillT = 3;
        }
      }
      if (s.skill === 'loaf') {
        for (const e of this.enemies) {
          if (!e.alive || e.fly || e.friendly || e.hidden) continue;
          if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 > range * range) continue;
          e.d = Math.max(0, e.d - (s.pull ?? 25) * (e.boss ? 0.3 : 1) * dt);
        }
      }
      if (s.skill === 'banshee' && t.skillT <= 0) {
        let any = false;
        for (const e of this.enemies) {
          if (!this.canTarget(t, e) || (e.x - t.x) ** 2 + (e.y - t.y) ** 2 > range * range) continue;
          any = true;
          this.vibe(e, 1.2);
          this.damage(e, (s.skillDmg ?? 30) * this.dmgMul(t), 'bonk', t);
        }
        if (any) {
          t.skillT = s.every ?? 4;
          this.emit({ type: 'attack', tid: t.id, kind: 'banshee', x: t.x, y: t.y });
        }
      }
      if (t.cd > 0) continue;
      const e = this.acquire(t, range);
      if (!e) {
        t.cd = 0;
        continue;
      }
      t.target = e.id;
      t.cd = s.rate ?? 1;
      t.lastAtkT = this.time;
      t.idleT = 0;
      this.fire(t, e);
    }
  }

  /** @param {Tower} t @param {Enemy} e */
  fire(t, e) {
    const s = t.s;
    const mul = this.dmgMul(t);
    const def = t.def;
    this.emit({ type: 'attack', tid: t.id, eid: e.id, kind: def.kind, skill: s.skill, x: e.x, y: e.y });
    switch (def.kind) {
      case 'lob':
        if (s.skill === 'bigOne') {
          if (e.fly) {
            this.launch(t, e, { dmg: (s.dmg ?? 0) * mul, dtype: 'bonk', lob: true });
          } else {
            this.runners.push({ id: this.nextId++, kind: 'bigOne', track: e.track, d: e.d + 30, dEnd: Math.max(0, e.d - (s.rollLen ?? 300)), v: -700, dmg: (s.dmg ?? 0) * mul, dtype: 'bonk', knock: s.knock ?? 50, hitIds: [], tid: t.id, x: e.x, y: e.y });
            // Sticky Situation: the Big One leaves a slow, gooey puddle where it lands.
            this.zones.push({ id: this.nextId++, kind: 'sticky', tid: t.id, x: e.x, y: e.y, r: 75, t: 0, life: 4, dps: 0, vibe: 0, slow: 0.45 });
          }
        } else this.launch(t, e, { dmg: (s.dmg ?? 0) * mul, dtype: 'bonk', lob: true });
        break;
      case 'yarn':
        this.launch(t, e, { dmg: (s.dmg ?? 0) * mul, dtype: 'bonk', slow: s.slow, slowT: s.slowT, radius: s.radius });
        if (s.skill === 'sweater' && t.skillT <= 0) {
          t.skillT = s.every ?? 5;
          this.stun(e, s.stun ?? 2);
          e.markK = Math.max(e.markK, s.mark ?? 0.25);
          e.markT = Math.max(e.markT, s.markT ?? 4);
          this.emit({ type: 'sweater', tid: t.id, eid: e.id, x: e.x, y: e.y });
        }
        break;
      case 'hiss':
        this.applyHit(t, e, { dmg: (s.dmg ?? 0) * mul, dtype: 'bonk', shred: s.shred, crit: s.crit, critMul: s.critMul }, false);
        break;
      case 'support':
        this.launch(t, e, { dmg: (s.dmg ?? 0) * mul, dtype: 'sparkle' });
        break;
      case 'flop':
        this.pending.push({ at: this.time + 0.35, kind: 'flop', x: e.x, y: e.y, tid: t.id, r: s.radius ?? 100, dmg: (s.dmg ?? 0) * mul, stun: s.stun ?? 1, dtype: 'bonk' });
        break;
      case 'cloud':
        this.launch(t, e, { dmg: 0, dtype: 'sparkle', cloud: true, burst: s.burst ? s.burst * mul : 0 });
        break;
    }
  }

  /** @param {Tower} t @param {Enemy} e @param {any} hit */
  launch(t, e, hit) {
    const dist = Math.hypot(e.x - t.x, e.y - (t.y - 40));
    const speed = t.def.projSpeed ?? 600;
    this.projectiles.push({ id: this.nextId++, fx: t.def.fx, tid: t.id, sx: t.x, sy: t.y - 40, x: t.x, y: t.y - 40, tx: e.x, ty: e.y, eid: e.id, t: 0, dur: Math.max(0.18, dist / speed), lob: !!hit.lob, hit });
  }

  /** @param {Tower} t @param {number} dt @param {number} range */
  stepBeam(t, dt, range) {
    const s = t.s;
    const n = s.beams ?? 1;
    // Keep valid targets (sticky so the ramp matters), then fill empty beams.
    const keep = [];
    for (const id of t.beams) {
      const e = this.enemyById.get(id);
      if (e && this.canTarget(t, e) && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= (range + e.size * 0.5) ** 2) keep.push(id);
    }
    if (keep.length < (t.beams.length || 1) && keep.length === 0) t.beamT = 0;
    // Taunting enemies override sticky beams.
    const first = this.acquire(t, range);
    if (first && first.def.taunt && !keep.includes(first.id)) {
      keep.length = 0;
      t.beamT = 0;
    }
    while (keep.length < n) {
      const e = this.acquire(t, range, keep);
      if (!e) break;
      keep.push(e.id);
    }
    t.beams = keep;
    if (!keep.length) {
      t.beamT = 0;
      return;
    }
    t.beamT += dt;
    t.lastAtkT = this.time;
    t.idleT = 0;
    t.target = keep[0];
    const k = Math.min(1, t.beamT / (s.ramp ?? 2));
    const dps = ((s.dpsMin ?? 5) + ((s.dpsMax ?? 30) - (s.dpsMin ?? 5)) * k) * this.dmgMul(t);
    for (const id of keep) {
      const e = this.enemyById.get(id);
      if (e) this.damage(e, dps * dt, 'sparkle', t, { quiet: true });
    }
    if (s.skill === 'disco' && t.skillT <= 0) {
      t.skillT = s.every ?? 2;
      for (const id of keep) {
        const e = this.enemyById.get(id);
        if (e && e.alive) this.stun(e, s.stun ?? 0.35);
      }
      this.emit({ type: 'attack', tid: t.id, kind: 'disco', x: t.x, y: t.y });
    }
    if (s.skill === 'redDot' && t.skillT <= 0) {
      let best = null;
      for (const e of this.enemies) if (this.canTarget(t, e) && (!best || e.hp > best.hp)) best = e;
      if (best) {
        t.skillT = s.every ?? 8;
        this.pending.push({ at: this.time + 0.8, kind: 'redDot', x: best.x, y: best.y, tid: t.id, r: s.skillRadius ?? 95, dmg: (s.skillDmg ?? 240) * this.dmgMul(t), stun: 0, dtype: 'sparkle', mark: s.mark, markT: s.markT });
        this.emit({ type: 'redDot', tid: t.id, x: best.x, y: best.y });
      }
    }
  }

  /** @param {number} dt */
  stepProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.dur < 0) continue;
      p.t += dt;
      const e = this.enemyById.get(p.eid);
      if (e && e.alive) {
        p.tx = e.x;
        p.ty = e.y;
      }
      const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k;
      p.y = p.sy + (p.ty - p.sy) * k;
      if (k < 1) continue;
      p.dur = -1;
      const t = this.towers.find((q) => q && q.id === p.tid) ?? null;
      if (!t || !p.hit) continue;
      if (p.hit.cloud) {
        const s = t.s;
        this.zones.push({ id: this.nextId++, kind: 'catnip', tid: t.id, x: p.tx, y: p.ty, r: s.radius ?? 90, t: 0, life: s.dur ?? 3, dps: (s.dps ?? 6) * this.dmgMul(t), vibe: s.vibe ?? 0, slow: 0 });
        this.emit({ type: 'cloud', tid: t.id, x: p.tx, y: p.ty, r: s.radius ?? 90 });
        if (p.hit.burst) {
          for (const o of this.enemies) {
            if (!this.canTarget(t, o) || (o.x - p.tx) ** 2 + (o.y - p.ty) ** 2 > (s.radius ?? 90) ** 2) continue;
            this.damage(o, p.hit.burst, 'sparkle', t);
            this.vibe(o, 1);
          }
        }
        continue;
      }
      if (e && e.alive) this.applyHit(t, e, p.hit, true);
      else this.emit({ type: 'fizzle', x: p.x, y: p.y, fx: p.fx });
    }
    if (this.projectiles.some((p) => p.dur < 0)) this.projectiles = this.projectiles.filter((p) => p.dur >= 0);
  }

  /** @param {number} dt */
  stepZones(dt) {
    for (const z of this.zones) {
      z.t += dt;
      const r2 = z.r * z.r;
      const t = z.kind === 'catnip' ? this.towers.find((q) => q && q.id === z.tid) ?? null : null;
      for (const e of this.enemies) {
        if (!e.alive || e.friendly || e.hidden) continue;
        if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 > r2) continue;
        if (z.kind === 'web' || z.kind === 'sticky') {
          if (e.fly) continue;
          this.slow(e, z.slow, 0.15);
        } else if (z.kind === 'nap') {
          // Gravity Nap: everything inside dozes off (bosses just get drowsy).
          if (e.boss) this.slow(e, 0.5, 0.15);
          else e.stunT = Math.max(e.stunT, 0.12);
        } else {
          if (e.def.immuneToTowers || e.covered) continue;
          this.damage(e, z.dps * dt, 'sparkle', t, { quiet: true });
          if (z.vibe && this.rng() < z.vibe * dt) this.vibe(e, 1.5);
        }
      }
    }
    if (this.zones.some((z) => z.t >= z.life)) this.zones = this.zones.filter((z) => z.t < z.life);
  }

  /** @param {number} dt */
  stepRunners(dt) {
    for (const r of this.runners) {
      const nd = Math.max(r.dEnd, r.d + r.v * dt);
      const lo = Math.min(nd, r.d) - 20;
      const hi = Math.max(nd, r.d) + 20;
      const t = r.tid ? this.towers.find((q) => q && q.id === r.tid) ?? null : null;
      for (const e of this.enemies) {
        if (!e.alive || e.friendly || e.fly || e.track !== r.track || e.d < lo || e.d > hi) continue;
        if (r.hitIds.includes(e.id)) continue;
        if (r.kind === 'bigOne' && t && !this.canTarget(t, e)) continue;
        r.hitIds.push(e.id);
        this.dmgSrc = r.kind === 'zoomies' ? 'zoomies' : '';
        this.damage(e, r.dmg, r.dtype, t);
        this.dmgSrc = '';
        if (r.knock && e.alive) {
          e.d = Math.max(0, e.d - (e.boss ? r.knock * 0.2 : r.knock));
          this.placeEnemy(e);
        }
      }
      r.d = nd;
      sampleTrack(this.tracks[r.track], r.d, tmp);
      r.x = tmp.x;
      r.y = tmp.y;
    }
    if (this.runners.some((r) => r.d <= r.dEnd)) this.runners = this.runners.filter((r) => r.d > r.dEnd);
  }

  stepPending() {
    if (!this.pending.length) return;
    const due = this.pending.filter((p) => p.at <= this.time);
    if (!due.length) return;
    this.pending = this.pending.filter((p) => p.at > this.time);
    for (const p of due) {
      const t = p.tid ? this.towers.find((q) => q && q.id === p.tid) ?? null : null;
      this.dmgSrc = p.kind === 'mug' ? 'mug' : p.kind === 'meteor' ? 'hero' : '';
      if (p.kind === 'mug') {
        for (const e of this.enemies) {
          if (e.type === 'sucktator' && e.alive && e.phase === 1 && e.unplugT <= 0 && ((e.plugX - p.x) ** 2 + (e.plugY - p.y) ** 2 < (p.r + 40) ** 2 || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (p.r + 40) ** 2)) this.unplug(e, 'mug');
        }
      }
      for (const e of this.enemies) {
        if (!e.alive || e.friendly) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (p.r + e.size * 0.5) ** 2) continue;
        if (p.kind === 'flop' && (e.fly || e.hidden || e.covered)) continue;
        if (p.kind === 'redDot' && t && !this.canTarget(t, e)) continue;
        if (p.kind === 'meteor' && (e.hidden || e.covered)) continue;
        if (p.kind === 'flop' || p.kind === 'mug') this.popJar(e);
        this.damage(e, p.dmg, p.dtype, t);
        if (p.stun && e.alive) this.stun(e, p.stun);
        if (p.mark && e.alive) {
          e.markK = Math.max(e.markK, p.mark);
          e.markT = Math.max(e.markT, p.markT ?? 4);
        }
      }
      this.dmgSrc = '';
      this.emit({ type: p.kind + 'Hit', tid: p.tid, x: p.x, y: p.y, r: p.r });
    }
  }

  cleanup() {
    let dead = false;
    for (const e of this.enemies) if (!e.alive) dead = true;
    if (!dead) return;
    for (const e of this.enemies) if (!e.alive) this.enemyById.delete(e.id);
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  checkEnd() {
    if (this.lives <= 0) {
      this.phase = 'lost';
      this.emit({ type: 'lose' });
      return;
    }
    if (!this.endless && this.waveIdx >= this.totalWaves && this.spawns.length === 0 && this.enemies.length === 0) {
      this.phase = 'won';
      this.emit({ type: 'win', stars: this.stars });
    }
  }

  get stars() {
    if (this.phase === 'lost') return 0;
    return this.lives >= 18 ? 3 : this.lives >= 10 ? 2 : 1;
  }

  // ───────────────────────── save / load ─────────────────────────
  /**
   * Full snapshot (JSON-safe). The game autosaves at wave boundaries (every wave start
   * and every cleared field); enemies, kittens, projectiles and zones are included so a
   * restore continues exactly where it left off.
   */
  serialize() {
    const rngSeed = Math.floor(this.rng() * 4294967296) >>> 0;
    this.rng = mulberry32(rngSeed);
    /** @param {any} o */
    const plain = (o) => JSON.parse(JSON.stringify(o));
    return {
      v: 2,
      level: this.level.id,
      endless: this.endless,
      seed: this.seed,
      rngSeed,
      scalars: {
        tick: this.tick,
        time: this.time,
        treats: this.treats,
        lives: this.lives,
        waveIdx: this.waveIdx,
        phase: this.phase,
        autoStartIn: this.autoStartIn,
        nextIn: this.nextIn,
        waveT: this.waveT,
        spawnCounter: this.spawnCounter,
        dark: this.dark,
        nextId: this.nextId,
        endlessHpMul: this.endlessHpMul,
        boundary: this.boundary,
        maxLives: this.maxLives,
        activePath: this.activePath,
        sockSpot: this.sockSpot,
        mood: this.mood,
        sunbeamTid: this.sunbeamTid,
      },
      challenge: this.challenge,
      hero: this.hero ? plain(this.hero) : null,
      blockers: plain(this.blockers),
      powerCd: { ...this.powerCd },
      stats: { ...this.stats },
      spawns: plain(this.spawns),
      towers: this.towers.map((t) => (t ? plain({ ...t, def: undefined, s: undefined }) : null)),
      enemies: this.enemies.map((e) => plain({ ...e, def: undefined })),
      kittens: plain(this.kittens),
      projectiles: plain(this.projectiles),
      zones: this.zones.map((z) => ({ ...z, life: z.life === Infinity ? -1 : z.life })),
      runners: plain(this.runners),
      pending: plain(this.pending),
    };
  }

  /**
   * @param {ReturnType<Sim['serialize']>} data @param {{level: LevelDef, layout: Layout, events?: boolean}} o
   */
  static restore(data, o) {
    if (!data || data.v !== 2) throw new Error('Unsupported save version');
    const sim = new Sim({ level: o.level, layout: o.layout, seed: data.seed, endless: data.endless, events: o.events, challenge: data.challenge ?? null, hero: data.hero ? data.hero.id : null });
    sim.rng = mulberry32(data.rngSeed);
    Object.assign(sim, data.scalars);
    if (data.hero) sim.hero = { ...data.hero, blocking: [...data.hero.blocking] };
    sim.blockers = (data.blockers ?? []).map((b) => ({ ...b }));
    sim.powerCd = { ...data.powerCd };
    sim.stats = { ...data.stats };
    sim.spawns = data.spawns.map((s) => ({ ...s }));
    data.towers.forEach((td, spot) => {
      if (!td || spot >= sim.towers.length) return;
      const def = CAT_BY_ID[td.cat];
      if (!def) return;
      sim.towers[spot] = /** @type {Tower} */ ({ ...td, def, s: def.tiers[td.tier] });
    });
    for (const ed of data.enemies) {
      const def = ENEMY_BY_ID[ed.type];
      if (!def) continue;
      /** @type {Enemy} */
      const e = { ...ed, def };
      sim.enemies.push(e);
      sim.enemyById.set(e.id, e);
    }
    sim.kittens = data.kittens.map((k) => ({ ...k }));
    sim.projectiles = data.projectiles.map((p) => ({ ...p }));
    sim.zones = data.zones.map((z) => ({ ...z, life: z.life < 0 ? Infinity : z.life }));
    sim.runners = data.runners.map((r) => ({ ...r, hitIds: [...r.hitIds] }));
    sim.pending = data.pending.map((p) => ({ ...p }));
    sim.events.length = 0;
    return sim;
  }
}
