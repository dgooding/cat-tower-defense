// @ts-check
// Achievement counters, tallied in memory from game events and flushed in batches
// (at wave start/clear and at level end), never every frame.
import { bump, bumpMax } from './save.js';

/** Cats seated at once for "If I Fits, I Sits". */
const FULL_HOUSE = 10;

export class Tally {
  /** @param {import('../game/game.js').Game} game @param {{enabled: () => boolean}} [o] */
  constructor(game, o = { enabled: () => true }) {
    this.game = game;
    this.o = o;
    /** @type {Record<string, number>} */
    this.c = {};
    this.filledOnce = false;
    game.on((ev) => this.onEvent(ev));
  }

  /** @param {string} k @param {number} [n] */
  add(k, n = 1) {
    this.c[k] = (this.c[k] ?? 0) + n;
  }

  /** New level: reset per-level flags (the pending tally is kept until flushed). */
  resetLevel() {
    this.filledOnce = false;
  }

  /** @param {any} ev */
  onEvent(ev) {
    const sim = this.game.sim;
    if (!sim || this.game.mode !== 'level' || !this.o.enabled()) return;
    switch (ev.type) {
      case 'place': {
        this.add('catsPlaced');
        // "If I Fits, I Sits": a full house of seated cats at once.
        if (!this.filledOnce && sim.towers.filter(Boolean).length >= FULL_HOUSE) {
          this.filledOnce = true;
          this.add('allSpotsFilled');
        }
        break;
      }
      case 'kill':
        this.add('kills');
        this.add('kill:' + ev.id);
        if (ev.boss) this.add('boss:' + ev.id);
        if (ev.by === 'mug') this.add('mugKills');
        break;
      case 'befriend':
        this.add('befriended');
        break;
      case 'power':
        this.add('powersUsed');
        break;
      case 'upgrade':
        this.add('upgrades');
        if (ev.tier >= 3) this.add('tier4');
        break;
      case 'early':
        this.add('earlyCalls');
        break;
      case 'wave':
      case 'waveClear':
        this.flush();
        break;
    }
  }

  /**
   * Level finished: add result counters and flush.
   * @param {{won: boolean, lives: number, maxLives: number, challenge: 'iron'|'nap'|null, hero: string|null, endlessWaves?: number}} r
   */
  levelEnd(r) {
    if (!this.o.enabled()) return;
    if (r.won) {
      this.add('wins');
      if (r.lives === 1) this.add('oneSnackWins');
      if (r.lives === r.maxLives && r.challenge !== 'iron') this.add('flawlessWins');
      if (r.challenge === 'iron') this.add('ironWins');
      if (r.challenge === 'nap') this.add('napWins');
      if (r.hero) this.add('heroWins');
    }
    this.flush();
    if (typeof r.endlessWaves === 'number') bumpMax('endlessBest', r.endlessWaves);
  }

  flush() {
    const entries = Object.entries(this.c);
    if (!entries.length) return;
    this.c = {};
    for (const [k, n] of entries) bump(k, n);
  }
}
