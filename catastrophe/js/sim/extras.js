// @ts-check
// Sim extensions (still pure, no DOM): level gimmicks, Endless Cat Moods and the Interactive Mode hero.
// Every function takes the Sim instance; sim.js calls these hooks at fixed points in its step.
import { HEROES, HERO_MAX_LEVEL, HERO_RESPAWN, xpFor, heroMul } from '../data/heroes.js';
import { MOODS, MOOD_BY_ID } from '../data/moods.js';
import { sampleTrack, nearestOnTracks } from './geometry.js';

/** @typedef {import('./sim.js').Sim} Sim */
/** @typedef {import('./sim.js').Enemy} Enemy */

/**
 * @typedef {Object} Hero
 * @property {string} id @property {number} x @property {number} y @property {number} tx @property {number} ty
 * @property {number} postX @property {number} postY @property {boolean} moving
 * @property {number} hp @property {number} maxHp @property {number} level @property {number} xp
 * @property {number} cd attack cooldown @property {number} a1 @property {number} a2 ability cooldowns remaining
 * @property {boolean} alive @property {number} respawnT @property {number} target @property {number[]} blocking
 * @property {number} lastAtkT @property {boolean} nineUsed @property {number} invulnT @property {number} guardT
 * @property {number} spawnX @property {number} spawnY @property {number} facing 1 right, -1 left
 * @property {number} kills
 */

const tmp = { x: 0, y: 0, dx: 0, dy: 0 };
export const HERO_ID = -1; // Enemy.blockedBy value meaning "held by the hero"
const STAGE = { x0: 60, x1: 1860, y0: 150, y1: 920 }; // keep the hero clear of the HUD edges

// ───────────────────────── gimmicks + moods (wave start) ─────────────────────────

/** Called by Sim.startNextWave after waveIdx++. @param {Sim} sim */
export function onWaveStart(sim) {
  const g = sim.gimmick;
  if (g?.kind === 'screens' && sim.tracks.length > 1) {
    const block = Math.floor((sim.waveIdx - 1) / g.every);
    const path = block % sim.tracks.length;
    if (path !== sim.activePath) {
      sim.activePath = path;
      sim.emit({ type: 'screens', path });
    }
    // Telegraph: the last wave of a block warns where the next one will come from.
    if (sim.waveIdx % g.every === 0 && sim.waveIdx < sim.totalWaves) sim.emit({ type: 'screensWarn', next: (block + 1) % sim.tracks.length });
  }
  if (g?.kind === 'socks') {
    // Land on one of the layout's landing points, preferring one without a cat under it.
    const free = [];
    const any = [];
    for (let i = 0; i < sim.layout.spots.length; i++) {
      const p = sim.layout.spots[i];
      any.push(i);
      if (!sim.catNear(p.x, p.y)) free.push(i);
    }
    const pool = free.length ? free : any;
    sim.sockSpot = pool.length ? pool[Math.floor(sim.rng() * pool.length)] : -1;
    const s = sim.sockAt();
    if (s) sim.emit({ type: 'sock', spot: sim.sockSpot, x: s.x, y: s.y });
  }
  if (sim.endless) {
    if (sim.waveIdx % 10 === 0) {
      const options = MOODS.filter((m) => m.id !== sim.mood);
      const m = options[Math.floor(sim.rng() * options.length)];
      sim.mood = m.id;
      sim.emit({ type: 'mood', id: m.id, name: m.name, icon: m.icon, desc: m.desc });
    }
    const m = sim.mood ? MOOD_BY_ID[sim.mood] : null;
    if (m?.bathWet) for (const t of sim.towers) if (t) sim.wetCat(t, m.bathWet);
    if (m?.sunbeam) {
      const ts = sim.towers.filter((t) => t && t.def.kind !== 'support');
      const pick = ts.length ? ts[Math.floor(sim.rng() * ts.length)] : null;
      sim.sunbeamTid = pick ? pick.id : 0;
      if (pick) sim.emit({ type: 'sunbeam', tid: pick.id });
    }
    if (m?.extra) sim.spawns.push({ t: sim.waveT + 2, id: m.extra, path: 'a', hpMul: sim.endlessHpMul });
    sim.spawns.sort((a, b) => a.t - b.t);
  }
  if (sim.hero) sim.hero.nineUsed = false;
}

/** Current mood modifiers (Endless). @param {Sim} sim */
export function moodOf(sim) {
  return sim.mood ? MOOD_BY_ID[sim.mood] ?? null : null;
}

/** Kotatsu cover: ground enemies inside the quilt ellipse are hidden from cats. @param {Sim} sim */
export function updateCover(sim) {
  const g = sim.gimmick;
  if (g?.kind !== 'kotatsu') return;
  for (const e of sim.enemies) {
    if (!e.alive || e.fly) {
      e.covered = false;
      continue;
    }
    const nx = (e.x - g.x) / g.rx;
    const ny = (e.y - g.y) / g.ry;
    e.covered = nx * nx + ny * ny < 1;
  }
}

// ───────────────────────── hero ─────────────────────────

/** @param {Sim} sim @param {string} heroId @returns {Hero|null} */
export function createHero(sim, heroId) {
  const def = HEROES[heroId];
  if (!def) return null;
  // Spawn beside the main path a little before the stash.
  const tr = sim.tracks[0];
  sampleTrack(tr, Math.max(0, tr.length - 260), tmp);
  const sx = clamp(tmp.x - tmp.dy * 70, STAGE.x0, STAGE.x1);
  const sy = clamp(tmp.y + tmp.dx * 70, STAGE.y0, STAGE.y1);
  return {
    id: heroId,
    x: sx,
    y: sy,
    tx: sx,
    ty: sy,
    postX: sx,
    postY: sy,
    moving: false,
    hp: def.hp,
    maxHp: def.hp,
    level: 1,
    xp: 0,
    cd: 0,
    a1: 0,
    a2: 0,
    alive: true,
    respawnT: 0,
    target: 0,
    blocking: [],
    lastAtkT: -9,
    nineUsed: false,
    invulnT: 0,
    guardT: 0,
    spawnX: sx,
    spawnY: sy,
    facing: 1,
    kills: 0,
  };
}

/** @param {number} v @param {number} lo @param {number} hi */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Order the hero to walk to a point (clamped to the stage). @param {Sim} sim @param {number} x @param {number} y */
export function heroMove(sim, x, y) {
  const h = sim.hero;
  if (!h || !h.alive || sim.phase === 'won' || sim.phase === 'lost') return false;
  h.tx = clamp(x, STAGE.x0, STAGE.x1);
  h.ty = clamp(y, STAGE.y0, STAGE.y1);
  h.postX = h.tx;
  h.postY = h.ty;
  h.moving = true;
  releaseHeroBlocks(sim);
  sim.emit({ type: 'heroMove', x: h.tx, y: h.ty });
  return true;
}

/** @param {Sim} sim */
function releaseHeroBlocks(sim) {
  const h = sim.hero;
  if (!h) return;
  for (const id of h.blocking) {
    const e = sim.enemyById.get(id);
    if (e && e.blockedBy === HERO_ID) e.blockedBy = 0;
  }
  h.blocking.length = 0;
}

/** @param {Sim} sim @param {Enemy} e */
function heroCanHit(sim, e) {
  return e.alive && !e.friendly && !e.hidden && !e.covered;
}

/** Densest nearby enemy (for auto-aimed abilities). @param {Sim} sim @param {number} reach */
function bestTarget(sim, reach) {
  const h = /** @type {Hero} */ (sim.hero);
  let best = null;
  let bestScore = -1;
  for (const e of sim.enemies) {
    if (!heroCanHit(sim, e)) continue;
    const d2 = (e.x - h.x) ** 2 + (e.y - h.y) ** 2;
    if (d2 > reach * reach) continue;
    let n = 0;
    for (const o of sim.enemies) if (o.alive && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 130 * 130) n++;
    const score = n * 1000 - Math.sqrt(d2);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/**
 * Use ability a1/a2. Returns true if it fired (and went on cooldown).
 * @param {Sim} sim @param {'a1'|'a2'} which
 */
export function heroAbility(sim, which) {
  const h = sim.hero;
  if (!h || !h.alive || h[which] > 0 || sim.phase === 'won' || sim.phase === 'lost') return false;
  const def = HEROES[h.id];
  const mul = heroMul(h.level);
  let ok = false;
  /** @type {{x:number,y:number}} */
  let at = { x: h.x, y: h.y };
  switch (`${h.id}:${which}`) {
    case 'ronin-biscuit:a1': {
      // Box Fort: a cardboard box on the nearest path blocks it for 6s.
      const r = nearestOnTracks(sim.tracks, h);
      if (r.dist > 420) break;
      sim.blockers.push({ id: sim.nextId++, track: r.track, d: r.d, x: r.x, y: r.y, until: sim.time + 6 });
      at = { x: r.x, y: r.y };
      ok = true;
      break;
    }
    case 'ronin-biscuit:a2': {
      // Thousand Paw Slap: ten quick slaps on one target.
      const e = (h.target && sim.enemyById.get(h.target)) || bestTarget(sim, 170);
      if (!e || !heroCanHit(sim, e)) break;
      sim.dmgSrc = 'hero';
      sim.damage(e, def.dmg * mul * 10, 'bonk', null);
      sim.dmgSrc = '';
      if (e.alive) sim.stun(e, 1.2);
      at = { x: e.x, y: e.y };
      ok = true;
      break;
    }
    case 'nebula:a1': {
      // Starfall Sprinkles: six little meteors over an area.
      const e = bestTarget(sim, 460);
      if (!e) break;
      for (let i = 0; i < 6; i++) {
        const a = sim.rng() * Math.PI * 2;
        const rr = sim.rng() * 110;
        sim.pending.push({ at: sim.time + 0.25 + i * 0.2, kind: 'meteor', x: e.x + Math.cos(a) * rr, y: e.y + Math.sin(a) * rr * 0.6, tid: 0, r: 75, dmg: 38 * mul * sim.worldHp ** 0.6, stun: 0, dtype: 'sparkle' });
      }
      at = { x: e.x, y: e.y };
      ok = true;
      break;
    }
    case 'nebula:a2': {
      // Gravity Nap: a sleepy bubble that pauses enemies inside it.
      const e = bestTarget(sim, 460);
      if (!e) break;
      sim.zones.push({ id: sim.nextId++, kind: 'nap', tid: 0, x: e.x, y: e.y, r: 120 + 4 * h.level, t: 0, life: 4, dps: 0, vibe: 0, slow: 0 });
      at = { x: e.x, y: e.y };
      ok = true;
      break;
    }
    case 'big-tom:a1': {
      // Shop's Closed: everything nearby stops to argue with Big Tom.
      for (const e of sim.enemies) {
        if (!e.alive || e.friendly || e.fly || (e.x - h.x) ** 2 + (e.y - h.y) ** 2 > 260 * 260) continue;
        e.tauntT = e.boss ? 1.5 : 3.5;
      }
      h.guardT = 4;
      ok = true;
      break;
    }
    case 'big-tom:a2': {
      // Day-Old Sushi: heal kittens, dry wet cats, patch himself up.
      for (const k of sim.kittens) if (k.alive && (k.x - h.x) ** 2 + (k.y - h.y) ** 2 < 360 * 360) k.hp = k.maxHp;
      for (const t of sim.towers) if (t && (t.x - h.x) ** 2 + (t.y - h.y) ** 2 < 480 * 480) t.wetT = 0;
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.35);
      ok = true;
      break;
    }
  }
  if (!ok) return false;
  h[which] = def.cd[which];
  sim.emit({ type: 'heroAbility', id: h.id, which, x: at.x, y: at.y });
  return true;
}

/** XP + Regular Customer when an enemy dies near the hero. @param {Sim} sim @param {Enemy} e */
export function heroOnKill(sim, e) {
  const h = sim.hero;
  if (!h || !h.alive) return 0;
  const d2 = (e.x - h.x) ** 2 + (e.y - h.y) ** 2;
  let bonus = 0;
  if (d2 <= 340 * 340) {
    const base = e.maxHp / Math.max(1, sim.worldHp * (sim.endless ? sim.endlessHpMul : 1));
    gainXp(sim, 3 + base / 12);
  }
  if (HEROES[h.id].passive === 'regular' && d2 <= 260 * 260) bonus = 5;
  return bonus;
}

/** @param {Sim} sim @param {number} xp */
function gainXp(sim, xp) {
  const h = /** @type {Hero} */ (sim.hero);
  if (h.level >= HERO_MAX_LEVEL) return;
  h.xp += xp;
  while (h.level < HERO_MAX_LEVEL && h.xp >= xpFor(h.level + 1)) {
    h.level++;
    const def = HEROES[h.id];
    const frac = h.hp / h.maxHp;
    h.maxHp = Math.round(def.hp * heroMul(h.level));
    h.hp = Math.max(h.hp, h.maxHp * frac);
    sim.emit({ type: 'heroLevel', level: h.level, x: h.x, y: h.y });
  }
}

/** Damage to the hero (from enemies holding it). @param {Sim} sim @param {number} amount */
export function hurtHero(sim, amount) {
  const h = sim.hero;
  if (!h || !h.alive || h.invulnT > 0) return;
  const def = HEROES[h.id];
  let a = amount;
  if (def.style === 'tank') a *= 0.7;
  if (h.guardT > 0) a *= 0.6;
  h.hp -= a;
  if (h.hp > 0) return;
  if (def.passive === 'nineLives' && !h.nineUsed) {
    h.nineUsed = true;
    h.hp = 1;
    h.invulnT = 1.5;
    sim.emit({ type: 'nineLives', x: h.x, y: h.y });
    return;
  }
  h.alive = false;
  h.hp = 0;
  h.respawnT = HERO_RESPAWN;
  releaseHeroBlocks(sim);
  sim.emit({ type: 'heroDown', x: h.x, y: h.y });
}

/** Stargazer passive: +10% range for cats near Nebula. @param {Sim} sim @param {{x:number,y:number}} t */
export function heroRangeBonus(sim, t) {
  const h = sim.hero;
  if (!h || !h.alive || HEROES[h.id].passive !== 'stargazer') return 0;
  return (h.x - t.x) ** 2 + (h.y - t.y) ** 2 <= 280 * 280 ? 0.1 : 0;
}

/** @param {Sim} sim @param {number} dt */
export function stepHero(sim, dt) {
  const h = sim.hero;
  if (!h) return;
  const def = HEROES[h.id];
  if (h.a1 > 0) h.a1 = Math.max(0, h.a1 - dt);
  if (h.a2 > 0) h.a2 = Math.max(0, h.a2 - dt);
  if (!h.alive) {
    h.respawnT -= dt;
    if (h.respawnT <= 0) {
      h.alive = true;
      h.hp = h.maxHp;
      h.x = h.tx = h.postX = h.spawnX;
      h.y = h.ty = h.postY = h.spawnY;
      h.moving = false;
      h.invulnT = 1.5;
      sim.emit({ type: 'heroUp', x: h.x, y: h.y });
    }
    return;
  }
  if (h.invulnT > 0) h.invulnT -= dt;
  if (h.guardT > 0) h.guardT -= dt;
  h.cd -= dt;
  const mul = heroMul(h.level);
  if (h.moving) {
    const dx = h.tx - h.x;
    const dy = h.ty - h.y;
    const dist = Math.hypot(dx, dy);
    const step = def.speed * dt;
    if (Math.abs(dx) > 1) h.facing = dx < 0 ? -1 : 1;
    if (dist <= step) {
      h.x = h.tx;
      h.y = h.ty;
      h.moving = false;
    } else {
      h.x += (dx / dist) * step;
      h.y += (dy / dist) * step;
    }
    return; // heroes don't fight while walking
  }
  // Unplug the Sucktator by standing on its plug.
  for (const e of sim.enemies) {
    if (e.type === 'sucktator' && e.alive && e.phase === 1 && e.unplugT <= 0 && (e.plugX - h.x) ** 2 + (e.plugY - h.y) ** 2 < 90 * 90) sim.unplug(e, 'hero');
  }
  // Release held enemies that died or wandered off.
  h.blocking = h.blocking.filter((id) => {
    const e = sim.enemyById.get(id);
    const keep = !!e && e.alive && !e.friendly && e.blockedBy === HERO_ID && (e.x - h.postX) ** 2 + (e.y - h.postY) ** 2 < 220 * 220;
    if (!keep && e && e.blockedBy === HERO_ID) e.blockedBy = 0;
    return keep;
  });
  // Grab new enemies to hold (melee/tank).
  if (def.blocks > 0) {
    for (const e of sim.enemies) {
      if (h.blocking.length >= def.blocks) break;
      if (!heroCanHit(sim, e) || e.fly || e.blockedBy) continue;
      if ((e.x - h.postX) ** 2 + (e.y - h.postY) ** 2 > 130 * 130) continue;
      e.blockedBy = HERO_ID;
      h.blocking.push(e.id);
    }
  }
  // Pick a target: a held enemy, else the nearest one in reach.
  /** @type {Enemy|null} */
  let tgt = null;
  if (h.blocking.length) tgt = sim.enemyById.get(h.blocking[0]) ?? null;
  if (!tgt) {
    const reach = def.style === 'ranged' ? def.range : 130;
    let bestD = reach * reach;
    for (const e of sim.enemies) {
      if (!heroCanHit(sim, e)) continue;
      if (def.style !== 'ranged' && e.fly) continue;
      const d2 = (e.x - h.x) ** 2 + (e.y - h.y) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        tgt = e;
      }
    }
  }
  h.target = tgt ? tgt.id : 0;
  // Melee walks up to its target (leashed to its post); otherwise drifts back to the post.
  const goX = tgt && def.style !== 'ranged' ? tgt.x - h.facing * 26 : h.postX;
  const goY = tgt && def.style !== 'ranged' ? tgt.y : h.postY;
  const ddx = goX - h.x;
  const ddy = goY - h.y;
  const dd = Math.hypot(ddx, ddy);
  if (dd > 4) {
    const step = Math.min(dd, def.speed * 0.8 * dt);
    h.x += (ddx / dd) * step;
    h.y += (ddy / dd) * step;
  }
  if (tgt) {
    if (Math.abs(tgt.x - h.x) > 2) h.facing = tgt.x < h.x ? -1 : 1;
    const reach = def.range + tgt.size * 0.5;
    if (h.cd <= 0 && (tgt.x - h.x) ** 2 + (tgt.y - h.y) ** 2 <= reach * reach) {
      h.cd = def.rate;
      h.lastAtkT = sim.time;
      sim.emit({ type: 'heroAttack', eid: tgt.id, x: tgt.x, y: tgt.y, style: def.style });
      sim.dmgSrc = 'hero';
      sim.damage(tgt, def.dmg * mul, def.dtype, null);
      sim.dmgSrc = '';
    }
  } else if (h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.04 * dt);
  // Ranged heroes get stepped on by passing enemies.
  if (def.style === 'ranged') {
    for (const e of sim.enemies) {
      if (!e.alive || e.friendly || e.fly) continue;
      if ((e.x - h.x) ** 2 + (e.y - h.y) ** 2 < 30 * 30) hurtHero(sim, (e.def.atk ?? 3) * 0.5 * sim.worldHp ** 0.5 * dt);
    }
  }
}

export { HEROES };
