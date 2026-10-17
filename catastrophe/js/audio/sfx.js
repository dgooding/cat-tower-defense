// @ts-check
// Tiny Web Audio synth bank (no files). Office-safe: low master volume, muted on blur and Boss Key.

/** @type {AudioContext|null} */
let ac = null;
/** @type {GainNode|null} */
let master = null;
let muted = false;
let hidden = false;
const MAX_VOLUME = 0.55;
let volume = 0.4; // 0..1 user setting (office-safe default)
const level = () => MAX_VOLUME * volume;
/** @type {Record<string, number>} */
const last = {};
/** @type {AudioBuffer|null} */
let noiseBuf = null;

function ctx() {
  if (ac) return ac;
  const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
  if (!Ctor) return null;
  ac = /** @type {AudioContext} */ (new Ctor());
  master = ac.createGain();
  master.gain.value = muted || hidden ? 0 : level();
  master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return ac;
}

/** Shared context + master bus for other audio modules (music). Null until a user gesture has created it. */
export function audioOut() {
  return ac && master ? { ac, master } : null;
}

/** True while nothing should be heard (user mute, tab hidden, Boss Key). */
export const isSilent = () => muted || hidden;

/** Call from a user gesture so the browser lets us make sound. */
export function unlockAudio() {
  const a = ctx();
  if (a && a.state === 'suspended' && !muted && !hidden) a.resume().catch(() => {});
}

function apply() {
  if (!ac || !master) return;
  const on = !muted && !hidden;
  master.gain.setTargetAtTime(on ? level() : 0, ac.currentTime, 0.01);
  if (on && ac.state === 'suspended') ac.resume().catch(() => {});
}

/** @param {boolean} m */
export function setMuted(m) {
  muted = m;
  apply();
}
export const isMuted = () => muted;

/** @param {number} v 0..1 */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  apply();
}
export const getVolume = () => volume;

/** Temporary silence (tab blur, Boss Key) that doesn't touch the user's mute setting. @param {boolean} h */
export function setHidden(h) {
  hidden = h;
  apply();
}

/**
 * @param {OscillatorType} type @param {number} f0 @param {number} f1 @param {number} dur @param {number} vol @param {number} [delay]
 */
function tone(type, f0, f1, dur, vol, delay = 0) {
  const a = /** @type {AudioContext} */ (ac);
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(/** @type {GainNode} */ (master));
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** @param {number} dur @param {number} freq @param {number} q @param {number} vol @param {BiquadFilterType} [kind] */
function noise(dur, freq, q, vol, kind = 'bandpass') {
  const a = /** @type {AudioContext} */ (ac);
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = kind;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(/** @type {GainNode} */ (master));
  src.start(t);
  src.stop(t + dur);
}

/** @type {Record<string, (p:number) => void>} */
const BANK = {
  pop: (p) => tone('sine', 520 * p, 180 * p, 0.09, 0.35),
  boing: (p) => {
    tone('sine', 300 * p, 90 * p, 0.35, 0.4);
    tone('triangle', 600 * p, 200 * p, 0.25, 0.12);
  },
  squeak: (p) => tone('square', 1400 * p, 2100 * p, 0.08, 0.08),
  coin: (p) => {
    tone('triangle', 988 * p, 988 * p, 0.08, 0.2);
    tone('triangle', 1319 * p, 1319 * p, 0.18, 0.2, 0.07);
  },
  hiss: () => noise(0.22, 4200, 1.2, 0.25),
  thoom: (p) => {
    tone('sine', 120 * p, 40 * p, 0.5, 0.6);
    noise(0.2, 300, 0.8, 0.2, 'lowpass');
  },
  meow: (p) => {
    const a = /** @type {AudioContext} */ (ac);
    const t = a.currentTime;
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * p, t);
    o.frequency.linearRampToValueAtTime(720 * p, t + 0.15);
    o.frequency.linearRampToValueAtTime(420 * p, t + 0.4);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(800, t);
    f.frequency.linearRampToValueAtTime(1500, t + 0.15);
    f.frequency.linearRampToValueAtTime(700, t + 0.4);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(f).connect(g).connect(/** @type {GainNode} */ (master));
    o.start(t);
    o.stop(t + 0.45);
  },
  crash: () => {
    noise(0.35, 2500, 0.6, 0.4, 'highpass');
    tone('triangle', 1800, 1500, 0.3, 0.1, 0.02);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.22, i * 0.11)),
  lose: () => [392, 330, 262].forEach((f, i) => tone('sine', f, f * 0.9, 0.4, 0.25, i * 0.22)),
  drum: () => {
    tone('sine', 90, 50, 0.3, 0.5);
    tone('sine', 90, 50, 0.3, 0.4, 0.18);
  },
};
export const SFX_NAMES = Object.keys(BANK);

/**
 * Play a sound. Throttled per name so swarms don't turn into noise.
 * @param {string} name @param {{pitch?:number, gap?:number}} [o]
 */
export function sfx(name, o = {}) {
  if (muted || hidden) return;
  const a = ctx();
  if (!a || a.state !== 'running') return;
  const now = a.currentTime;
  const gap = o.gap ?? 0.06;
  if (now - (last[name] ?? -9) < gap) return;
  last[name] = now;
  try {
    BANK[name]?.(o.pitch ?? 1);
  } catch {
    /* audio is optional */
  }
}
