// @ts-check
// Procedural score player (no audio files). Songs live in songs.js; this file turns them into Web Audio notes.
// Two layers per song: "base" (melody, pad, bass) always plays; "drive" (drums, arpeggios) fades in during waves.
// The director at the bottom watches the game and picks the song: title lullaby, world theme, boss theme.
import { audioOut, isSilent } from './sfx.js';
import { SONGS, WORLD_SONG, parseBar, parseChord, midiToHz } from './songs.js';

/** @typedef {import('./songs.js').SongDef} SongDef */
/** @typedef {(s: Synth, t: number, e8: number, out: AudioNode) => void} PlayFn */
/**
 * What a scheduled note is, for anything that wants to react to the music (the journey's visuals).
 * @typedef {{part: 'lead'|'pad'|'bass'|'drum'|'chime'|'arp', bar: number, step?: number, midi?: number, dur?: number, notes?: number[], kind?: string}} NoteMeta
 */
/** @typedef {{step: number, layer: 0|1, play: PlayFn, breathe: boolean, meta: NoteMeta}} Ev */

const AHEAD = 0.25; // seconds of notes scheduled ahead of the clock
const TICK_MS = 60;
const MUSIC_MAX = 1;
const DUCK_PAUSED = 0.35;

// ---------------------------------------------------------------- instruments

export class Synth {
  /** @param {BaseAudioContext} ac @param {AudioBuffer} noise */
  constructor(ac, noise) {
    this.ac = ac;
    this.noise = noise;
    this.nOff = 0;
  }

  /** @param {OscillatorType} type @param {number} hz @param {number} t @param {number} stop @param {AudioNode} dest @param {number} [cents] */
  osc(type, hz, t, stop, dest, cents = 0) {
    const o = this.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (cents) o.detune.setValueAtTime(cents, t);
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  /** Gain with a percussive envelope (attack, exponential decay). @param {number} t @param {number} a @param {number} len @param {number} vol @param {AudioNode} dest */
  perc(t, a, len, vol, dest) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + len);
    g.connect(dest);
    return g;
  }

  /** Gain with a held envelope (attack, sustain for dur, release). @param {number} t @param {number} a @param {number} dur @param {number} r @param {number} vol @param {AudioNode} dest */
  hold(t, a, dur, r, vol, dest) {
    const g = this.ac.createGain();
    const end = t + Math.max(a, dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, end);
    g.gain.linearRampToValueAtTime(0, end + r);
    g.connect(dest);
    return g;
  }

  /** @param {BiquadFilterType} type @param {number} hz @param {number} q @param {AudioNode} dest */
  filter(type, hz, q, dest) {
    const f = this.ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  /** @param {number} t @param {number} len @param {AudioNode} dest */
  noiseAt(t, len, dest) {
    const src = this.ac.createBufferSource();
    src.buffer = this.noise;
    src.connect(dest);
    this.nOff = (this.nOff + 0.137) % Math.max(0.01, this.noise.duration - len - 0.05);
    src.start(t, this.nOff, len + 0.05);
    return src;
  }

  /**
   * @param {import('./songs.js').LeadKind} kind @param {number} midi @param {number} t @param {number} dur seconds
   * @param {AudioNode} out @param {number} [vel]
   */
  lead(kind, midi, t, dur, out, vel = 1) {
    const hz = midiToHz(midi);
    if (kind === 'pluck') {
      const len = Math.min(1.5, dur + 0.45);
      const g = this.perc(t, 0.004, len, 0.2 * vel, out);
      const f = this.filter('lowpass', 3400, 0.7, g);
      f.frequency.setValueAtTime(3400, t);
      f.frequency.exponentialRampToValueAtTime(1000, t + 0.3);
      this.osc('triangle', hz, t, t + len + 0.05, f);
      const h = this.ac.createGain();
      h.gain.value = 0.35;
      h.connect(f);
      this.osc('sine', hz * 2, t, t + len + 0.05, h);
    } else if (kind === 'keys') {
      const len = Math.min(2, dur + 0.6);
      const g = this.perc(t, 0.006, len, 0.16 * vel, out);
      this.osc('sine', hz, t, t + len + 0.05, g);
      const h = this.ac.createGain();
      h.gain.value = 0.22;
      h.connect(g);
      this.osc('sine', hz * 2, t, t + len + 0.05, h);
      const tine = this.perc(t, 0.002, 0.12, 0.035 * vel, out);
      this.osc('sine', hz * 4, t, t + 0.2, tine);
    } else if (kind === 'koto') {
      const len = Math.min(1.8, dur + 0.7);
      const g = this.perc(t, 0.003, len, 0.15 * vel, out);
      const f = this.filter('lowpass', 2800, 1.8, g);
      f.frequency.setValueAtTime(2800, t);
      f.frequency.exponentialRampToValueAtTime(650, t + 0.4);
      const o = this.osc('sawtooth', hz * 1.012, t, t + len + 0.05, f);
      o.frequency.exponentialRampToValueAtTime(hz, t + 0.06);
      const body = this.ac.createGain();
      body.gain.value = 0.6;
      body.connect(g);
      this.osc('sine', hz, t, t + len + 0.05, body);
    } else if (kind === 'bell') {
      const g = this.perc(t, 0.003, 1.7, 0.15 * vel, out);
      this.osc('sine', hz, t, t + 1.8, g);
      const p2 = this.perc(t, 0.003, 0.5, 0.045 * vel, out);
      this.osc('sine', hz * 2, t, t + 0.6, p2);
      const p3 = this.perc(t, 0.002, 0.22, 0.02 * vel, out);
      this.osc('sine', hz * 3.01, t, t + 0.3, p3);
    } else if (kind === 'reed') {
      const g = this.hold(t, 0.025, dur * 0.85, 0.07, 0.085 * vel, out);
      const f = this.filter('lowpass', 950, 1.2, g);
      this.osc('square', hz, t, t + dur + 0.15, f);
      const lfo = this.ac.createOscillator();
      lfo.frequency.value = 5.5;
      const depth = this.ac.createGain();
      depth.gain.value = 9; // cents of wobble, for the villain
      lfo.connect(depth);
      const body = this.osc('triangle', hz / 2, t, t + dur + 0.15, f);
      depth.connect(body.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.15);
    }
  }

  /** Two detuned triangles per note through a lowpass. @param {number[]} notes @param {number} t @param {number} dur @param {{vol:number, cut:number, a:number, r:number}} o @param {AudioNode} out */
  pad(notes, t, dur, o, out) {
    const g = this.hold(t, o.a, dur, o.r, o.vol, out);
    const f = this.filter('lowpass', o.cut, 0.5, g);
    const stop = t + Math.max(o.a, dur) + o.r + 0.05;
    for (const m of notes) {
      const hz = midiToHz(m);
      this.osc('triangle', hz, t, stop, f, -7);
      this.osc('triangle', hz, t, stop, f, 7);
    }
  }

  /** @param {number} midi @param {number} t @param {number} dur @param {number} vol @param {AudioNode} out */
  bass(midi, t, dur, vol, out) {
    const hz = midiToHz(midi);
    // Three stacked oscillators: scale so the bass sits level with the melody, not over it.
    const g = this.hold(t, 0.012, dur, 0.09, vol * 0.26, out);
    const f = this.filter('lowpass', 750, 0.8, g);
    const stop = t + dur + 0.15;
    this.osc('triangle', hz, t, stop, f);
    this.osc('sine', hz, t, stop, f);
    const h = this.ac.createGain();
    h.gain.value = 0.3; // second harmonic so laptop speakers can hear it
    h.connect(f);
    this.osc('sine', hz * 2, t, stop, h);
  }

  /** @param {'kick'|'snap'|'snare'|'shaker'|'brush'|'ride'|'tom'|'block'|'drip'} kind @param {number} t @param {number} vol @param {AudioNode} out @param {number} [hz] */
  drum(kind, t, vol, out, hz = 0) {
    vol *= 1.6;
    switch (kind) {
      case 'kick': {
        const g = this.perc(t, 0.003, 0.28, vol, out);
        const o = this.osc('sine', 130, t, t + 0.35, g);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        break;
      }
      case 'tom': {
        const g = this.perc(t, 0.004, 0.32, vol, out);
        const o = this.osc('sine', hz || 150, t, t + 0.4, g);
        o.frequency.exponentialRampToValueAtTime((hz || 150) * 0.7, t + 0.25);
        break;
      }
      case 'block': {
        const g = this.perc(t, 0.002, 0.07, vol, out);
        this.osc('sine', hz || 880, t, t + 0.1, g);
        this.osc('triangle', (hz || 880) * 1.5, t, t + 0.1, g);
        break;
      }
      case 'drip': {
        const g = this.perc(t, 0.003, 0.13, vol, out);
        const o = this.osc('sine', hz || 1100, t, t + 0.18, g);
        o.frequency.exponentialRampToValueAtTime((hz || 1100) * 2, t + 0.07);
        break;
      }
      case 'snap':
        this.noiseAt(t, 0.08, this.filter('bandpass', 1900, 1.5, this.perc(t, 0.002, 0.07, vol, out)));
        break;
      case 'snare': {
        this.noiseAt(t, 0.16, this.filter('bandpass', 1500, 0.8, this.perc(t, 0.002, 0.14, vol, out)));
        const g = this.perc(t, 0.002, 0.08, vol * 0.6, out);
        const o = this.osc('triangle', 190, t, t + 0.12, g);
        o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        break;
      }
      case 'shaker':
        this.noiseAt(t, 0.06, this.filter('highpass', 6500, 0.7, this.perc(t, 0.004, 0.045, vol, out)));
        break;
      case 'brush':
        this.noiseAt(t, 0.26, this.filter('bandpass', 3000, 0.6, this.perc(t, 0.04, 0.2, vol, out)));
        break;
      case 'ride':
        this.noiseAt(t, 0.2, this.filter('highpass', 8000, 0.5, this.perc(t, 0.002, 0.16, vol, out)));
        break;
    }
  }
}

// ---------------------------------------------------------------- compiling a song into a loop of events

const PADS = {
  warm: { vol: 0.03, cut: 1500, a: 0.35, r: 0.7 },
  steam: { vol: 0.03, cut: 900, a: 1.0, r: 1.2 },
  air: { vol: 0.026, cut: 2300, a: 0.7, r: 1.0 },
};

/** @param {number} root @param {number[]} notes */
function thirdOf(root, notes) {
  for (const m of notes) {
    const iv = (((m - root) % 12) + 12) % 12;
    if (iv === 3 || iv === 4) return root + iv;
  }
  return root + 4;
}

/** Turn a song into one loop of timed events (steps are eighth notes). @param {SongDef} song */
export function compile(song) {
  const E = song.beats * 2;
  const bars = song.chords.length;
  const chords = song.chords.map(parseChord);
  const shift = song.shift ?? 0;
  /** @type {Ev[]} */
  const evs = [];
  /** @param {number} step @param {0|1} layer @param {PlayFn} play @param {NoteMeta} meta @param {boolean} [breathe] */
  const add = (step, layer, play, meta, breathe = false) => evs.push({ step, layer, play, breathe, meta: { ...meta, step } });

  chords.forEach((c, i) => {
    const b = i * E;
    const next = chords[(i + 1) % bars];
    const firstHalf = !!song.breathe && i < bars / 2;
    const r = c.bass;

    for (const n of parseBar(song.melody[i])) {
      add(b + n.at, 0, (s, t, e8, out) => s.lead(song.lead, n.midi + shift, t, n.dur * e8, out), { part: 'lead', midi: n.midi + shift, dur: n.dur, bar: i }, firstHalf);
    }

    // Pad / comping
    const pm = { part: /** @type {const} */ ('pad'), notes: c.notes, bar: i };
    if (song.pad === 'comp') {
      add(b, 0, (s, t, e8, out) => c.notes.forEach((m) => s.lead('keys', m, t, 1.5 * e8, out, 0.3)), pm);
      add(b + 3, 0, (s, t, e8, out) => c.notes.forEach((m) => s.lead('keys', m, t, 2.5 * e8, out, 0.26)), pm);
    } else if (song.pad === 'stabs') {
      for (const k of [0, 3, 6]) add(b + k, 0, (s, t, e8, out) => c.notes.forEach((m) => s.lead('reed', m, t, 0.7 * e8, out, k ? 0.32 : 0.42)), pm);
    } else {
      const o = PADS[song.pad];
      add(b, 0, (s, t, e8, out) => s.pad(c.notes, t, E * e8, o, out), pm);
    }

    // Bass
    /** @param {number} m */
    const bm = (m) => ({ part: /** @type {const} */ ('bass'), midi: m, bar: i });
    if (song.bass === 'root5') {
      add(b, 0, (s, t, e8, out) => s.bass(r, t, 3 * e8, 0.2, out), bm(r));
      add(b + 4, 0, (s, t, e8, out) => s.bass(r + 7, t, 3 * e8, 0.17, out), bm(r + 7));
    } else if (song.bass === 'walk') {
      let appr = next.bass - 1;
      while (appr - r > 7) appr -= 12;
      while (r - appr > 7) appr += 12;
      [r, thirdOf(r, c.notes), r + 7, appr].forEach((m, k) => add(b + k * 2, 0, (s, t, e8, out) => s.bass(m, t, 1.7 * e8, k ? 0.17 : 0.2, out), bm(m)));
    } else if (song.bass === 'drone') {
      add(b, 0, (s, t, e8, out) => s.bass(r, t, 5.5 * e8, 0.2, out), bm(r));
      add(b + 6, 0, (s, t, e8, out) => s.bass(r + 12, t, 1.6 * e8, 0.1, out), bm(r + 12));
    } else if (song.bass === 'waltz') {
      add(b, 0, (s, t, e8, out) => s.bass(r, t, 3.5 * e8, 0.18, out), bm(r));
      add(b + 4, 0, (s, t, e8, out) => s.bass(r + 7, t, 1.6 * e8, 0.1, out), bm(r + 7));
    } else if (song.bass === 'ostinato') {
      [0, 0, 12, 0, 7, 0, 8, 7].forEach((iv, k) => add(b + k, 0, (s, t, e8, out) => s.bass(r + iv, t, 0.7 * e8, k % 2 ? 0.13 : 0.19, out), bm(r + iv)));
    }

    // Drums (wave layer)
    /** @param {number} step @param {Parameters<Synth['drum']>[0]} kind @param {number} vol @param {number} [hz] */
    const hit = (step, kind, vol, hz) => add(b + step, 1, (s, t, _e8, out) => s.drum(kind, t, vol, out, hz), { part: 'drum', kind, bar: i });
    switch (song.kit) {
      case 'farm':
        hit(0, 'kick', 0.3);
        hit(4, 'kick', 0.24);
        hit(2, 'snap', 0.12);
        hit(6, 'snap', 0.12);
        for (let k = 0; k < 8; k++) hit(k, 'shaker', k % 2 ? 0.05 : 0.03);
        break;
      case 'brush':
        hit(0, 'kick', 0.22);
        hit(2, 'brush', 0.1);
        hit(6, 'brush', 0.1);
        for (const k of [0, 2, 3, 4, 6, 7]) hit(k, 'ride', k % 2 ? 0.04 : 0.06);
        break;
      case 'bath':
        hit(0, 'tom', 0.3, 110);
        hit(5, 'tom', 0.2, 130);
        hit(3, 'block', 0.06, 880);
        hit(6, 'block', 0.05, 1175);
        hit((i * 5 + 2) % 8, 'drip', 0.07, 900 + ((i * 7) % 5) * 120);
        hit(2, 'shaker', 0.03);
        hit(7, 'shaker', 0.03);
        break;
      case 'sky':
        hit(0, 'kick', 0.22);
        hit(2, 'shaker', 0.05);
        hit(4, 'shaker', 0.05);
        if (i % 2 === 0) {
          const cm = c.notes[c.notes.length - 1] + 24;
          add(b, 1, (s, t, e8, out) => s.lead('bell', cm, t, 2 * e8, out, 0.3), { part: 'chime', midi: cm, bar: i });
        }
        break;
      case 'boss':
        hit(0, 'kick', 0.32);
        hit(4, 'kick', 0.28);
        hit(2, 'snare', 0.13);
        hit(6, 'snare', 0.13);
        hit(3, 'tom', 0.16, 196);
        hit(7, 'tom', 0.16, 147);
        for (let k = 0; k < 8; k++) hit(k, 'shaker', k % 2 ? 0.04 : 0.025);
        break;
    }

    // Arpeggios (wave layer)
    if (song.arp) {
      const up = [...c.notes.map((m) => m + 12), c.notes[0] + 24];
      /** @type {[number[], number[], number, number, import('./songs.js').LeadKind]} steps, indexes, length, velocity, voice */
      const spec =
        song.arp === 'up8'
          ? [[0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 2, 1, 0, 1], 1, 0.3, 'pluck']
          : song.arp === 'penta'
            ? [[0, 3, 4, 6], [0, 2, 1, 3], 2, 0.45, 'koto']
            : [[0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 2, 1], 1.2, 0.28, 'bell'];
      spec[0].forEach((st, k) => {
        const m = up[spec[1][k] % up.length];
        add(b + st, 1, (s, t, e8, out) => s.lead(spec[4], m, t, spec[2] * e8, out, spec[3]), { part: 'arp', midi: m, bar: i });
      });
    }
  });
  evs.sort((a, b) => a.step - b.step);
  return { evs, steps: bars * E };
}

// ---------------------------------------------------------------- playing a song

class Track {
  /**
   * @param {Engine} eng @param {string} id @param {number} start audio time of the first bar @param {boolean} drive
   */
  constructor(eng, id, start, drive) {
    const ac = eng.ac;
    this.eng = eng;
    this.id = id;
    this.song = SONGS[id];
    const { evs, steps } = compile(this.song);
    this.evs = evs;
    this.e8 = 30 / this.song.bpm;
    this.loopDur = steps * this.e8;
    this.loopT = start;
    /** Audio time of the very first bar (beat clock origin). */
    this.start = start;
    this.i = 0;
    this.cycle = 0;
    this.gain = ac.createGain();
    this.gain.gain.setValueAtTime(0, ac.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, start + 0.5);
    this.gain.connect(eng.bus);
    const send = ac.createGain();
    send.gain.value = this.song.reverb;
    this.gain.connect(send).connect(eng.reverb);
    this.base = ac.createGain();
    this.base.connect(this.gain);
    this.drive = ac.createGain();
    this.drive.connect(this.gain);
    this.driveOn = drive || !!this.song.alwaysDrive;
    this.drive.gain.setValueAtTime(this.driveOn ? 1 : 0, ac.currentTime);
    this.driveOffAt = this.driveOn ? Infinity : -Infinity;
    this.dead = false;
  }

  /** @param {boolean} on */
  setDrive(on) {
    on = on || !!this.song.alwaysDrive;
    if (on === this.driveOn) return;
    this.driveOn = on;
    const now = this.eng.ac.currentTime;
    this.drive.gain.cancelScheduledValues(now);
    this.drive.gain.setTargetAtTime(on ? 1 : 0, now, on ? 0.35 : 0.9);
    this.driveOffAt = on ? Infinity : now;
  }

  /** @param {number} ev step @returns {number} */
  timeOf(step) {
    const sw = Number.isInteger(step) && step % 2 === 1 ? this.song.swing : 0;
    return this.loopT + (step + sw) * this.e8;
  }

  /** Schedule every note that starts before `until`. @param {number} until @param {boolean} silent */
  scheduleUntil(until, silent) {
    const now = this.eng.ac.currentTime;
    // After a long stall (hidden tab), skip whole loops instead of replaying them.
    if (now - this.loopT > this.loopDur * 2) {
      const skip = Math.floor((now - this.loopT) / this.loopDur) - 1;
      this.loopT += skip * this.loopDur;
      this.cycle += skip;
      this.i = 0;
    }
    for (let guard = 0; guard < 5000; guard++) {
      const ev = this.evs[this.i];
      const t = this.timeOf(ev.step);
      if (t > until) break;
      const fresh = t >= now - 0.02;
      const driveAudible = ev.layer === 0 || this.driveOn || now - this.driveOffAt < 4;
      const resting = ev.breathe && this.cycle % 2 === 1;
      if (fresh && !silent && driveAudible && !resting) {
        try {
          ev.play(this.eng.syn, Math.max(t, now), this.e8, ev.layer ? this.drive : this.base);
          this.eng.onNote?.(ev.meta, Math.max(t, now), this);
        } catch {
          /* a single bad note must never stop the music */
        }
      }
      if (++this.i >= this.evs.length) {
        this.i = 0;
        this.loopT += this.loopDur;
        this.cycle++;
      }
    }
  }

  /** @param {number} fade seconds */
  stop(fade) {
    if (this.dead) return;
    this.dead = true;
    const now = this.eng.ac.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0, now, fade / 3);
    setTimeout(() => this.gain.disconnect(), (fade + 2.5) * 1000);
  }
}

/** Mixer + reverb + the currently playing track. Works with a live or an offline AudioContext. */
export class Engine {
  /** @param {BaseAudioContext} ac @param {AudioNode} out */
  constructor(ac, out) {
    this.ac = ac;
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    this.bus.connect(comp).connect(out);
    this.reverb = ac.createConvolver();
    this.reverb.buffer = impulse(ac, 2.2);
    this.reverb.connect(this.bus);
    this.syn = new Synth(ac, noiseBuffer(ac));
    /** @type {Track|null} */
    this.track = null;
    /** Notes played by a person (the journey): same mixer and reverb as the score. */
    this.player = ac.createGain();
    this.player.gain.value = 1;
    this.player.connect(this.bus);
    const ps = ac.createGain();
    ps.gain.value = 0.3;
    this.player.connect(ps).connect(this.reverb);
    /** Called for every note the score actually plays, with its audio start time. @type {((meta: NoteMeta, t: number, track: Track) => void)|null} */
    this.onNote = null;
  }

  /** Fade the current song out and stop scheduling. @param {number} [fade] */
  stop(fade = 1.2) {
    this.track?.stop(fade);
    this.track = null;
  }

  /** @param {number} level 0..1 */
  setLevel(level) {
    this.bus.gain.setTargetAtTime(level, this.ac.currentTime, 0.25);
  }

  /** Switch songs (crossfade). Same song: just update the wave layer. @param {string|null} id @param {boolean} drive */
  play(id, drive) {
    if (this.track && this.track.id === id) {
      this.track.setDrive(drive);
      return;
    }
    this.track?.stop(1.2);
    this.track = id && SONGS[id] ? new Track(this, id, this.ac.currentTime + 0.12, drive) : null;
  }

  /** @param {number} until @param {boolean} [silent] */
  schedule(until, silent = false) {
    this.track?.scheduleUntil(until, silent);
  }
}

/** @param {BaseAudioContext} ac */
function noiseBuffer(ac) {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = buf.getChannelData(0);
  let s = 987654321;
  for (let i = 0; i < d.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return buf;
}

/** Soft stereo room tail made of decaying noise. @param {BaseAudioContext} ac @param {number} secs */
function impulse(ac, secs) {
  const len = Math.floor(ac.sampleRate * secs);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let s = 2024 + c * 7919;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const k = 1 - i / len;
      d[i] = ((s / 0x7fffffff) * 2 - 1) * k * k * k * 0.5;
    }
  }
  return buf;
}

// ---------------------------------------------------------------- live player (one per page)

let musicVolume = 0.5;
let duck = 1;
/** @type {Engine|null} */
let engine = null;
/** @type {{song: string|null, drive: boolean}} */
let want = { song: null, drive: false };
let timer = 0;

/** @param {number} v 0..1 */
export function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(1, v));
  engine?.setLevel(level());
}
export const getMusicVolume = () => musicVolume;
const level = () => MUSIC_MAX * musicVolume * duck;

/** For ?debug=1: what is playing right now. */
export function musicState() {
  const t = engine?.track;
  return { want, playing: t?.id ?? null, drive: t?.driveOn ?? false, cycle: t?.cycle ?? 0, ctx: engine?.ac.state ?? 'none', level: level() };
}

function pump() {
  const out = audioOut();
  if (!out || out.ac.state !== 'running') return;
  if (!engine) {
    engine = new Engine(out.ac, out.master);
    engine.setLevel(level());
  }
  const song = musicVolume > 0 ? want.song : null;
  engine.play(song, want.drive);
  engine.schedule(out.ac.currentTime + AHEAD, isSilent());
}

/**
 * Ask for a song. Safe to call every frame; nothing changes unless the request does.
 * @param {string|null} song id in SONGS, or null for silence @param {{drive?: boolean, paused?: boolean}} [o]
 */
export function music(song, o = {}) {
  want = { song, drive: !!o.drive };
  const d = o.paused ? DUCK_PAUSED : 1;
  if (d !== duck) {
    duck = d;
    engine?.setLevel(level());
  }
  if (!timer) timer = window.setInterval(pump, TICK_MS);
}

/**
 * Director for the game page: title lullaby on menus, the world's theme in levels (drums join during waves),
 * the boss theme while a boss is on the field, and a short hush for the win/lose jingle.
 * @param {import('../game/game.js').Game} game
 */
export function installMusic(game) {
  let endedAt = 0;
  const update = () => {
    if (game.frozen) return;
    if (game.mode === 'diorama') {
      endedAt = 0;
      music('title');
      return;
    }
    const sim = game.sim;
    const lvl = game.level;
    if (game.mode !== 'level' || !sim || !lvl) {
      music(null);
      return;
    }
    const world = /** @type {Record<string, string>} */ (WORLD_SONG)[lvl.world] ?? 'countryside';
    if (sim.phase === 'won' || sim.phase === 'lost') {
      endedAt ||= performance.now();
      music(performance.now() - endedAt < 3800 ? null : world);
      return;
    }
    endedAt = 0;
    const boss = sim.enemies.some((e) => e.alive && e.boss && !e.friendly);
    music(boss ? 'boss' : world, { drive: boss || (sim.phase === 'wave' && !sim.boundary), paused: game.paused });
  };
  window.setInterval(update, 200);
  update();
}
