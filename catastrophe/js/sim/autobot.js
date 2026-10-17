// @ts-check
// Simple greedy builder used by tools/bot.mjs and the ?autoplay=1 debug flag. Pure (no DOM).
import { CAT_BY_ID, nextTiers } from '../data/cats.js';
import { coverage, sampleTrack } from './geometry.js';

/** Preferred build order (filtered by what the level unlocks). */
const ORDER = ['pudding', 'granny-purl', 'pudding', 'sriracha', 'whiskerton', 'mama-mittens', 'pudding', 'chonkington', 'dr-nip', 'maneki-mochi', 'whiskerton', 'sriracha', 'pudding', 'chonkington'];
/** Tier-4 branch per cat (3 = 4A, 4 = 4B). */
const BRANCH = { pudding: 3, 'granny-purl': 3, 'mama-mittens': 4, sriracha: 4, whiskerton: 4, 'maneki-mochi': 4, chonkington: 3, 'dr-nip': 3 };

export class AutoBot {
  /** @param {import('./sim.js').Sim} sim @param {{powers?: boolean, build?: boolean, callEarly?: boolean, hero?: boolean}} [o] */
  constructor(sim, o = {}) {
    this.sim = sim;
    this.o = { powers: true, build: true, callEarly: true, hero: true, ...o };
    this.t = 0;
    this.built = 0;
    this.heroPosted = false;
    // Path hidden by a gimmick (the kotatsu quilt) doesn't count as coverage.
    const g = sim.gimmick;
    const skip = g?.kind === 'kotatsu' ? (/** @type {number} */ x, /** @type {number} */ y) => ((x - g.x) / g.rx) ** 2 + ((y - g.y) / g.ry) ** 2 < 1 : undefined;
    // Rank spots by how much path a typical cat would cover from them.
    this.spotRank = sim.layout.spots
      .map((p, i) => ({ i, cov: coverage(sim.tracks, p, 270, skip) }))
      .filter((s) => s.cov > 0)
      .sort((a, b) => b.cov - a.cov)
      .map((s) => s.i);
  }

  /** Call once per sim step. */
  update() {
    const sim = this.sim;
    if (sim.phase === 'won' || sim.phase === 'lost') return;
    this.t += 1 / 60;
    if (this.t < 0.25) return;
    this.t = 0;
    if (this.o.build) this.think();
    if (this.o.hero && sim.hero) this.heroThink();
    if (sim.phase === 'prep') {
      if (sim.towers.some(Boolean) || !this.o.build) sim.callEarly();
      return;
    }
    if (this.o.callEarly && sim.canCallEarly && sim.enemies.length === 0) sim.callEarly();
    if (this.o.powers) this.usePowers();
  }

  think() {
    const sim = this.sim;
    for (let guard = 0; guard < 4; guard++) {
      const free = this.spotRank.filter((i) => !sim.towers[i] && sim.spotUsable(i));
      const cats = sim.level.cats;
      const want = ORDER.filter((c) => cats.includes(/** @type {any} */ (c)));
      const nextCat = want[this.built % want.length];
      const buildCost = nextCat ? CAT_BY_ID[nextCat].tiers[0].cost : Infinity;
      // Cheapest upgrade on the best-covering towers.
      let up = null;
      for (const i of this.spotRank) {
        const t = sim.towers[i];
        if (!t) continue;
        const opts = nextTiers(t.tier);
        if (!opts.length) continue;
        const br = opts.length > 1 ? /** @type {Record<string, number>} */ (BRANCH)[t.cat] ?? 3 : opts[0];
        const cost = t.def.tiers[br].cost;
        if (!up || cost < up.cost) up = { i, br, cost };
      }
      const preferBuild = free.length > 0 && (!up || this.built < 3 || buildCost <= up.cost * 1.3);
      if (preferBuild && sim.treats >= buildCost) {
        if (sim.build(free[0], /** @type {string} */ (nextCat))) {
          this.built++;
          continue;
        }
      }
      if (up && (!preferBuild || free.length === 0) && sim.treats >= up.cost) {
        if (sim.upgrade(up.i, up.br)) continue;
      }
      break;
    }
  }

  /** Park the hero on the main route about 2/3 of the way to the stash, and use abilities when enemies are close. */
  heroThink() {
    const sim = this.sim;
    const h = /** @type {import('./extras.js').Hero} */ (sim.hero);
    if (!h.alive) {
      this.heroPosted = false;
      return;
    }
    if (!this.heroPosted && !h.moving) {
      const tr = sim.tracks[sim.activePath % sim.tracks.length];
      const s = { x: 0, y: 0, dx: 0, dy: 0 };
      sampleTrack(tr, tr.length * 0.68, s);
      sim.heroMove(s.x, s.y);
      this.heroPosted = true;
    }
    let near = 0;
    for (const e of sim.enemies) if (e.alive && !e.friendly && (e.x - h.x) ** 2 + (e.y - h.y) ** 2 < 260 * 260) near++;
    if (near >= 2 && h.a1 <= 0) sim.heroAbility('a1');
    if (near >= 1 && h.a2 <= 0) sim.heroAbility('a2');
  }

  usePowers() {
    const sim = this.sim;
    let danger = null;
    let dangerP = 0;
    let deep = 0;
    for (const e of sim.enemies) {
      if (!e.alive || e.friendly) continue;
      const len = (e.fly ? sim.flyTracks : sim.tracks)[e.track].length;
      const p = e.d / len;
      if (p > 0.7) deep++;
      if (p > dangerP) {
        dangerP = p;
        danger = e;
      }
    }
    if (danger && dangerP > 0.6 && sim.powerCd.mug <= 0) sim.usePower('mug', danger.x, danger.y);
    if (sim.enemies.length >= 10 && sim.powerCd.zoomies <= 0) sim.usePower('zoomies');
    if ((deep >= 4 || (danger && danger.boss && dangerP > 0.6)) && sim.powerCd.yowl <= 0) sim.usePower('yowl');
  }
}