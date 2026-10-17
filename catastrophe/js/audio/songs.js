// @ts-check
// Original score for the game, written as plain data (no audio files). Pure: safe to import in Node tests.
// Notation, one string per bar:
//   chords  'F2: A3 C4 E4'   bass note, then the voicing the pad/arp use
//   melody  'C5:2 A4:1 r:2'  note:duration in eighth notes ('r' = rest). Each bar sums to beats × 2.

/**
 * @typedef {'pluck'|'keys'|'koto'|'bell'|'reed'} LeadKind
 * @typedef {'warm'|'comp'|'steam'|'air'|'stabs'} PadKind
 * @typedef {'root5'|'walk'|'drone'|'waltz'|'ostinato'} BassKind
 * @typedef {'farm'|'brush'|'bath'|'sky'|'boss'} KitKind
 * @typedef {'up8'|'penta'|'harp'} ArpKind
 * @typedef {Object} SongDef
 * @property {string} name shown nowhere, handy for debugging
 * @property {number} bpm @property {3|4} beats per bar @property {number} swing 0..0.33 of an eighth, off-beats only
 * @property {LeadKind} lead @property {PadKind} pad @property {BassKind} bass
 * @property {KitKind|null} kit drums in the "wave" layer @property {ArpKind|null} arp arpeggio in the "wave" layer
 * @property {number} reverb wet send 0..1 @property {number} [shift] semitones applied to the melody
 * @property {boolean} [breathe] on every other pass the melody sits out the first half
 * @property {boolean} [alwaysDrive] the wave layer never fades out (boss)
 * @property {string[]} chords @property {string[]} melody
 */

/** @type {Record<string, SongDef>} */
export const SONGS = {
  // Title / level select: a music-box lullaby while the cats nap in the diorama.
  title: {
    name: 'Nap Lullaby',
    bpm: 84,
    beats: 3,
    swing: 0,
    lead: 'bell',
    pad: 'air',
    bass: 'waltz',
    kit: null,
    arp: null,
    reverb: 0.4,
    chords: ['C3: G3 C4 E4', 'A2: E3 A3 C4', 'F2: A3 C4 F4', 'G2: B3 D4 F4', 'C3: G3 C4 E4', 'E2: G3 B3 E4', 'F2: A3 C4 F4', 'G2: B3 D4 F4'],
    melody: ['E5:2 G5:2 C6:2', 'B5:4 A5:2', 'A5:2 G5:2 F5:2', 'G5:2 F5:2 D5:2', 'E5:2 G5:2 C6:2', 'B5:4 G5:2', 'A5:2 C6:2 A5:2', 'G5:4 r:2'],
  },
  // World 1: a sunny back-porch guitar tune.
  countryside: {
    name: 'Porch Light Shuffle',
    bpm: 92,
    beats: 4,
    swing: 0.1,
    lead: 'pluck',
    pad: 'warm',
    bass: 'root5',
    kit: 'farm',
    arp: 'up8',
    reverb: 0.2,
    breathe: true,
    chords: [
      'F2: A3 C4 F4', 'A2: G3 C4 E4', 'Bb2: A3 D4 F4', 'C3: G3 C4 E4',
      'F2: A3 C4 F4', 'D2: A3 C4 F4', 'G2: Bb3 D4 F4', 'C3: Bb3 E4 G4',
      'Bb2: A3 D4 F4', 'C3: G3 C4 E4', 'A2: G3 C4 E4', 'D2: A3 C4 F4',
      'G2: Bb3 D4 F4', 'A2: G3 C4 E4', 'Bb2: A3 D4 F4', 'C3: Bb3 E4 G4',
    ],
    melody: [
      'C5:2 A4:1 C5:1 F5:3 E5:1', 'E5:2 C5:2 A4:4', 'D5:2 F5:1 D5:1 Bb4:2 A4:2', 'G4:4 r:2 C5:1 D5:1',
      'C5:2 A4:1 C5:1 F5:2 A5:2', 'G5:2 F5:1 E5:1 D5:4', 'Bb4:2 D5:2 F5:2 E5:2', 'G5:3 E5:1 C5:2 r:2',
      'F5:4 D5:2 F5:2', 'G5:4 E5:4', 'E5:2 C5:2 E5:2 G5:2', 'A5:6 F5:2',
      'G5:2 F5:2 D5:2 Bb4:2', 'C5:4 E5:4', 'D5:2 C5:2 Bb4:2 A4:2', 'G4:4 r:4',
    ],
  },
  // World 2: a lazy living-room lounge tune with a walking bass.
  house: {
    name: 'Kotatsu Lounge',
    bpm: 100,
    beats: 4,
    swing: 0.22,
    lead: 'keys',
    pad: 'comp',
    bass: 'walk',
    kit: 'brush',
    arp: null,
    reverb: 0.22,
    breathe: true,
    chords: [
      'C3: E3 G3 B3', 'A2: G3 C#4 E4', 'D3: F3 A3 C4', 'G2: F3 B3 E4',
      'E3: G3 B3 D4', 'A2: G3 C#4 E4', 'D3: F3 A3 C4', 'G2: F3 B3 D4',
      'F2: E3 A3 C4', 'F2: D3 Ab3 C4', 'E3: G3 B3 D4', 'A2: G3 C#4 E4',
      'D3: F3 A3 C4', 'G2: F3 B3 E4', 'C3: E3 G3 B3', 'G2: F3 B3 D4',
    ],
    melody: [
      'E5:1 G5:1 B5:2 A5:1 G5:1 E5:2', 'G5:3 E5:1 C#5:4', 'D5:1 F5:1 A5:2 C6:2 A5:2', 'B5:3 G5:1 F5:2 D5:2',
      'E5:1 G5:1 B5:2 D6:2 B5:2', 'C#6:3 A5:1 G5:2 E5:2', 'F5:2 A5:2 C6:1 A5:1 F5:2', 'D5:4 F5:2 D5:2',
      'A5:4 G5:2 E5:2', 'Ab5:4 F5:2 D5:2', 'G5:2 E5:1 G5:1 B5:4', 'A5:2 G5:2 E5:2 C#5:2',
      'D5:2 F5:2 A5:2 F5:2', 'G5:3 F5:1 D5:2 B4:2', 'C5:6 r:2', 'r:4 B4:2 D5:2',
    ],
  },
  // World 3: steam, drips and a plucked zither in the bathhouse.
  bathhouse: {
    name: 'Steam & Lanterns',
    bpm: 72,
    beats: 4,
    swing: 0,
    lead: 'koto',
    pad: 'steam',
    bass: 'drone',
    kit: 'bath',
    arp: 'penta',
    reverb: 0.38,
    breathe: true,
    chords: [
      'D2: F3 A3 C4', 'Bb2: F3 A3 D4', 'C3: G3 C4 E4', 'A2: G3 C4 E4',
      'D2: F3 A3 C4', 'Bb2: F3 A3 D4', 'G2: F3 Bb3 D4', 'A2: E3 A3 C4',
      'Bb2: F3 A3 D4', 'C3: G3 C4 E4', 'D2: F3 A3 C4', 'A2: G3 C4 E4',
      'Bb2: F3 A3 D4', 'C3: G3 C4 E4', 'G2: F3 Bb3 D4', 'A2: G3 D4 E4',
    ],
    melody: [
      'A4:2 C5:2 D5:4', 'F5:3 D5:1 C5:2 A4:2', 'G4:4 C5:2 D5:2', 'E5:6 r:2',
      'A5:2 G5:1 F5:1 D5:4', 'F5:2 G5:2 A5:2 F5:2', 'G5:2 F5:2 D5:2 C5:2', 'A4:6 r:2',
      'D5:4 F5:4', 'E5:4 G5:4', 'A5:8', 'G5:2 E5:2 C5:4',
      'D5:2 C5:2 A4:2 F4:2', 'G4:8', 'Bb4:2 C5:2 D5:4', 'E5:2 D5:2 r:4',
    ],
  },
  // World 4: a floating waltz above the clouds.
  sky: {
    name: 'Cloud Whale Waltz',
    bpm: 76,
    beats: 3,
    swing: 0,
    lead: 'bell',
    pad: 'air',
    bass: 'waltz',
    kit: 'sky',
    arp: 'harp',
    reverb: 0.42,
    shift: -12,
    breathe: true,
    chords: [
      'Eb2: G3 Bb3 D4', 'C2: G3 Bb3 Eb4', 'Ab2: G3 C4 Eb4', 'Bb2: F3 Bb3 D4',
      'Eb2: G3 Bb3 D4', 'G2: F3 Bb3 D4', 'Ab2: G3 C4 Eb4', 'Bb2: Ab3 D4 F4',
      'C2: G3 Bb3 Eb4', 'G2: F3 Bb3 D4', 'Ab2: G3 C4 Eb4', 'G2: G3 Bb3 Eb4',
      'F2: Ab3 C4 Eb4', 'Bb2: F3 Bb3 D4', 'Eb2: G3 Bb3 Eb4', 'Bb2: Ab3 D4 F4',
    ],
    melody: [
      'G5:4 Bb5:2', 'Eb6:4 D6:2', 'C6:4 Bb5:2', 'F5:6',
      'G5:2 Bb5:2 Eb6:2', 'D6:4 Bb5:2', 'C6:2 Bb5:2 G5:2', 'Ab5:4 F5:2',
      'G5:2 Eb5:2 G5:2', 'Bb5:4 F5:2', 'C6:4 Ab5:2', 'G5:6',
      'Ab5:2 C6:2 Eb6:2', 'D6:4 C6:2', 'Bb5:6', 'r:2 D5:2 F5:2',
    ],
  },
  // Any boss on the field: a sneaky villain bassoon over a bouncing ostinato.
  boss: {
    name: 'Here Comes Trouble',
    bpm: 132,
    beats: 4,
    swing: 0,
    lead: 'reed',
    pad: 'stabs',
    bass: 'ostinato',
    kit: 'boss',
    arp: null,
    reverb: 0.15,
    shift: -12,
    alwaysDrive: true,
    chords: ['A2: A3 C4 E4', 'A2: A3 C4 E4', 'F2: A3 C4 F4', 'E2: G#3 B3 D4', 'A2: A3 C4 E4', 'A2: A3 C4 E4', 'D2: A3 D4 F4', 'E2: G#3 B3 D4'],
    melody: [
      'A4:2 r:1 A4:1 C5:2 B4:2', 'A4:2 E4:2 r:4', 'F4:2 r:1 F4:1 A4:2 G#4:2', 'E4:2 G#4:2 B4:2 D5:2',
      'A4:2 r:1 A4:1 C5:2 D5:2', 'E5:3 D5:1 C5:2 B4:2', 'A4:2 F4:2 D4:2 F4:2', 'E4:2 r:2 E5:2 r:2',
    ],
  },
};

/** World id (LevelDef.world) → song id. */
export const WORLD_SONG = { countryside: 'countryside', house: 'house', bathhouse: 'bathhouse', sky: 'sky' };

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C#4' → 61 (MIDI). Throws on bad input so tests catch typos. @param {string} name */
export function noteToMidi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return PC[/** @type {keyof typeof PC} */ (m[1])] + acc + (Number(m[3]) + 1) * 12;
}

/** @param {number} midi */
export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Melody bar → notes with start/duration in eighths. Rests are dropped.
 * @param {string} bar @returns {{midi:number, at:number, dur:number}[]}
 */
export function parseBar(bar) {
  const out = [];
  let at = 0;
  for (const tok of bar.trim().split(/\s+/)) {
    const [n, d] = tok.split(':');
    const dur = Number(d);
    if (!(dur > 0)) throw new Error(`Bad duration in "${tok}"`);
    if (n !== 'r') out.push({ midi: noteToMidi(n), at, dur });
    at += dur;
  }
  return out;
}

/** Total length of a melody bar in eighths. @param {string} bar */
export function barLength(bar) {
  return bar
    .trim()
    .split(/\s+/)
    .reduce((s, tok) => s + Number(tok.split(':')[1]), 0);
}

/** 'F2: A3 C4 E4' → {bass, notes}. @param {string} chord */
export function parseChord(chord) {
  const [b, rest] = chord.split(':');
  return { bass: noteToMidi(b.trim()), notes: rest.trim().split(/\s+/).map(noteToMidi) };
}
