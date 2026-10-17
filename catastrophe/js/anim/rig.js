// @ts-check
// Procedural animation controllers shared by every character rig.

/** Damped spring toward `target`. */
export class Spring {
  /** @param {number} [stiff] @param {number} [damp] @param {number} [x] */
  constructor(stiff = 170, damp = 14, x = 0) {
    this.k = stiff;
    this.d = damp;
    this.x = x;
    this.v = 0;
    this.target = x;
  }
  /** @param {number} dt */
  step(dt) {
    const a = this.k * (this.target - this.x) - this.d * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
  /** @param {number} v */
  kick(v) {
    this.v += v;
  }
}

/** Random blinks every 2–6 s with a 20% chance of a double blink. */
export class Blink {
  /** @param {() => number} rng */
  constructor(rng) {
    this.rng = rng;
    this.wait = 0.8 + rng() * 2.5;
    this.p = -1;
    this.again = false;
    this.value = 0;
  }
  /** @param {number} dt */
  update(dt) {
    if (this.p < 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.p = 0;
      this.value = 0;
      return 0;
    }
    this.p += dt / 0.17;
    if (this.p >= 1) {
      this.p = -1;
      if (!this.again && this.rng() < 0.2) {
        this.again = true;
        this.wait = 0.08;
      } else {
        this.again = false;
        this.wait = 2 + this.rng() * 4;
      }
      this.value = 0;
      return 0;
    }
    this.value = Math.sin(this.p * Math.PI);
    return this.value;
  }
}

/** Occasional quick pulses (ear twitches, whisker flicks). */
export class Twitch {
  /** @param {() => number} rng @param {number} [min] @param {number} [max] */
  constructor(rng, min = 3, max = 8) {
    this.rng = rng;
    this.min = min;
    this.max = max;
    this.wait = min + rng() * (max - min);
    this.t = -1;
    this.value = 0;
  }
  /** @param {number} dt */
  update(dt) {
    if (this.t < 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.t = 0;
    } else {
      this.t += dt;
      if (this.t > 0.32) {
        this.t = -1;
        this.wait = this.min + this.rng() * (this.max - this.min);
      }
    }
    this.value = this.t < 0 ? 0 : Math.sin((this.t / 0.32) * Math.PI) * (this.t < 0.16 ? 1 : 0.6);
    return this.value;
  }
}

/** Eyes that wander on their own unless given a target. */
export class LookAt {
  /** @param {() => number} rng */
  constructor(rng) {
    this.rng = rng;
    this.x = new Spring(90, 13);
    this.y = new Spring(90, 13);
    this.wander = 1;
  }
  /** @param {number} dt @param {{x:number,y:number}|null} dir unit-ish vector, or null to wander */
  update(dt, dir) {
    if (dir) {
      this.x.target = dir.x;
      this.y.target = dir.y;
    } else {
      this.wander -= dt;
      if (this.wander <= 0) {
        this.wander = 1.5 + this.rng() * 2.5;
        const r = this.rng() < 0.35 ? 0 : 0.4 + this.rng() * 0.6;
        const a = this.rng() * Math.PI * 2;
        this.x.target = Math.cos(a) * r;
        this.y.target = Math.sin(a) * r * 0.6;
      }
    }
    this.x.step(dt);
    this.y.step(dt);
  }
}
