// @ts-check
// Tiny synthesized meow (no audio files). Off by default; enabled via the gallery toggle.

/** @type {AudioContext|null} */
let ac = null;

/** @param {number} [pitch] 1 = normal, lower = chonkier cat */
export function meow(pitch = 1) {
  const Ctor = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
  if (!Ctor) return;
  ac = ac ?? new Ctor();
  const a = /** @type {AudioContext} */ (ac);
  const now = a.currentTime;
  const dur = 0.5;
  const osc = a.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(480 * pitch, now);
  osc.frequency.linearRampToValueAtTime(760 * pitch, now + dur * 0.35);
  osc.frequency.linearRampToValueAtTime(430 * pitch, now + dur);
  const formant = a.createBiquadFilter();
  formant.type = 'bandpass';
  formant.Q.value = 3;
  formant.frequency.setValueAtTime(700, now);
  formant.frequency.linearRampToValueAtTime(1500, now + dur * 0.4);
  formant.frequency.linearRampToValueAtTime(650, now + dur);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(formant).connect(gain).connect(a.destination);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}
