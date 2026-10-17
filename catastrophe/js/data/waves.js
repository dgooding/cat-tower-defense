// @ts-check
// Hand-authored wave scripts. Each wave is a string of spawn groups:
//   <code><count>[/<gap s>][@<start s>][:<path>]
// code = one-letter alias below (or a full lowercase id); path = path index or "a" (alternate, default).
// e.g. "C6/1.2 D10/.4@8" = 6 Cucumber Cadets 1.2s apart, then 10 Duckies 0.4s apart from t=8s.

/** @type {Record<string, string>} */
export const CODES = {
  C: 'cucumber-cadet',
  P: 'sneaky-pickle',
  V: 'vroomba',
  B: 'empty-bowl',
  S: 'spritz',
  K: 'cone-of-shame',
  D: 'rubber-duckie',
  T: 'tubby-mcsoak',
  X: 'snip-snap',
  F: 'party-pooper',
  M: 'monday',
  O: 'closed-door',
  Z: 'fancy-bed',
  L: 'lint-roller',
  R: 'carrier',
  H: 'hose-snek',
  U: 'umbrella-uncles',
  Q: 'thunderclap',
  $: 'overdue-bill',
  G: 'good-boy',
};

/** @typedef {{id:string, n:number, gap:number, at:number, path:number|'a'}} SpawnGroup */

/** @param {string} s @returns {SpawnGroup[]} */
export function parseWave(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const m = /^([A-Z$]|[a-z][a-z-]*)(\d+)(?:\/([\d.]+))?(?:@([\d.]+))?(?::(\w+))?$/.exec(tok);
      if (!m) throw new Error('Bad wave token: ' + tok);
      const id = m[1].length === 1 && CODES[m[1]] ? CODES[m[1]] : m[1];
      return { id, n: +m[2], gap: m[3] ? +m[3] : 1, at: m[4] ? +m[4] : 0, path: m[5] === undefined || m[5] === 'a' ? 'a' : +m[5] };
    });
}

/** @type {Record<string, string[]>} */
export const WAVE_SCRIPTS = {
  '1-1': [
    'C5/2',
    'C8/1.5',
    'C6/1.4 D8/.5@10',
    'C10/1.1 D10/.45@6',
    'C12/1 D12/.4@5',
    'D24/.3 C6/1.2@4',
    'C16/.8 D16/.35@6',
    'C14/.8 D20/.3@3 C8/.7@16',
    'D36/.22 C12/.8@5',
    'C20/.6 D30/.25@4 C10/.5@16',
  ],
  '1-2': [
    'C8/1.3',
    'C6/1.2 P3/2@6',
    'C10/1 D12/.4@8',
    'P6/1.5 C8/1@3',
    'H1 C10/1@4',
    'D24/.3 P5/1.4@6',
    'C14/.8 H1@8 P4/1.5@10',
    'G1 C12/.8@3 D16/.35@10',
    'H2/6 P8/1.1@4 C10/.8@8',
    'D30/.25 C16/.7@4 P6/1@12',
    'H3/5 C20/.6@3 P10/.9@10',
  ],
  '1-3': [
    'C10/1.1',
    'C8/1 V2/3@4',
    'C12/.9 D14/.35@8',
    'V4/2 P4/1.5@5',
    'H2/5 C12/.8@2',
    'D30/.25 V5/1.2@6',
    'P10/1 C14/.7@4',
    'V10/1 H2/6@6 G1@12',
    'C20/.6 D24/.3@6 P8/1@12',
    'H3/4 V10/.9@4 P8/.9@10',
    'C24/.5 V12/.8@5 D30/.25@12',
    'C10/1 cucumberto1@6 P8/1.5@10',
  ],
  '2-1': [
    'C10/1',
    'S3/2 C8/1@3',
    'K4/2 C8/1@2',
    'V6/1.2 S4/2@4',
    'K6/1.6 P6/1.2@5',
    'D30/.25 S5/1.5@5',
    'K8/1.2 V8/1@6',
    'H2/5 S6/1.4@3 C12/.7@8',
    'K10/1 P10/1@4 G1@10',
    'V12/.8 K10/1@5 S8/1.2@10',
  ],
  '2-2': [
    'C12/.9',
    'B2/4 C8/1@2',
    'L3/2 C10/.9@3',
    'K6/1.4 S4/2@4',
    'B4/3 V8/1@4',
    'L5/1.6 D24/.3@4',
    'P10/1 B3/3@5',
    'K8/1.2 L4/2@4 G1@10',
    'B6/2.5 V8/1@3 S6/1.5@8',
    'L8/1.2 K10/1@6 D30/.25@10',
    'B6/2 V10/.8@3 P10/.9@8 L6/1.5@12',
  ],
  '2-3': [
    'C14/.8',
    'X3/2 C6/1@3',
    'Z2/4 C10/.9@2',
    'B3/3 K6/1.3@3',
    'X6/1.2 L4/2@5',
    'Z4/3 V8/1@3',
    'S8/1.2 D30/.25@4',
    'X8/1 B4/2.5@4 G1@10',
    'Z6/2 K10/1@3 L6/1.5@8',
    'V16/.6 X8/1@5 S8/1@10',
    'B6/2 Z6/2@4 K12/.9@8',
    'C12/.8 sucktator1@6 X6/1.5@12',
  ],
  '3-1': [
    'C12/.9',
    'U4/2 C8/1@2',
    'S6/1.5 U4/2@4',
    'K8/1.2 V6/1@4',
    'U8/1.3 P8/1@4',
    'D36/.22 X6/1@6',
    'L6/1.5 U8/1.2@4',
    'Z4/3 B4/3@4 G1@10',
    'H3/4 U10/1@3 S8/1.2@8',
    'V14/.7 U12/.9@4 K10/1@10',
  ],
  '3-2': [
    'C14/.8',
    'T1 D12/.4@4',
    'U6/1.5 S6/1.5@3',
    'T2/6 V8/1@3',
    'X8/1 K8/1.2@4',
    'T3/5 D24/.3@3',
    'B4/3 U10/1@3',
    'L6/1.5 T3/5@3 G1@10',
    'H3/4 X8/1@3 S8/1.2@8',
    'T5/4 V14/.7@3',
    'T6/3 U12/.9@3 K12/.9@8 D30/.25@14',
  ],
  '3-3': [
    'C16/.7',
    'R2/5 C8/1@3',
    'O2/5 U6/1.4@2',
    'T3/5 S6/1.4@3',
    'R4/3 V10/.8@3',
    'O4/3 X8/1@3',
    'B4/3 L6/1.5@3 Z4/3@8',
    'R5/3 K10/1@3 G1@10',
    'T5/4 O4/3@4 S8/1.2@8',
    'V20/.5 R5/3@4',
    'O6/2.5 T6/3@4 U12/.9@8',
    'C12/.8 bathzilla1@6 D30/.3@14 R3/4@20',
  ],
  '4-1': [
    'C14/.8',
    'F6/1.5 C8/1@3',
    'Q2/4 S6/1.4@2',
    'F10/1 V8/1@4',
    'Q4/3 K8/1.2@3',
    'F12/.8 D30/.25@4',
    'T3/5 Q4/3@4',
    'R4/3 F12/.8@3 G1@10',
    'Q6/2.5 X8/1@3 F10/.9@8',
    'F16/.7 Q8/2@4 V14/.7@8',
  ],
  '4-2': [
    'C16/.7',
    'M2/4 C10/.9@2',
    '$4/2 F6/1.4@3',
    'M4/3 V10/.8@3',
    '$6/1.5 Q4/3@3',
    'M5/2.5 X8/1@3',
    'F16/.7 $6/1.5@4',
    'O4/3 M4/3@4 G1@10',
    'T4/4 M6/2@3 Q6/2.5@8',
    '$10/1 F14/.7@4 R4/3@8',
    'M8/2 V16/.6@3 Q8/2@8 $8/1@12',
  ],
  '4-3': [
    'C18/.6',
    'B4/3 F8/1.2@3',
    'M4/3 $6/1.5@3',
    'T4/4 Q4/3@4',
    'R4/3 X10/.9@3',
    'O4/3 B4/3@4 F12/.8@8',
    'M6/2 L6/1.5@3 Z4/3@8',
    'Q8/2 V16/.6@4 G1@10',
    'T6/3 R4/3@4 $8/1.2@8',
    'M8/2 F16/.7@4 O4/3@10',
    'B6/2 Q10/1.6@3 T6/3@8 X10/.9@12',
    'C16/.6 great-bowl1@6 F16/.8@14 M6/2@20',
  ],
};

/** @type {Record<string, SpawnGroup[][]>} */
export const WAVES = Object.fromEntries(Object.entries(WAVE_SCRIPTS).map(([k, v]) => [k, v.map(parseWave)]));

const ENDLESS_POOL = ['C', 'D', 'P', 'V', 'S', 'K', 'H', 'B', 'L', 'X', 'Z', 'U', 'T', 'F', 'Q', 'M', 'O', 'R', '$'];
const ENDLESS_BOSSES = ['cucumberto', 'sucktator', 'bathzilla', 'great-bowl'];

/**
 * Endless wave n (1-based). Deterministic given n and a [0,1) random source.
 * @param {number} n @param {() => number} rnd @returns {{groups: SpawnGroup[], hpMul: number}}
 */
export function endlessWave(n, rnd) {
  const unlocked = Math.min(ENDLESS_POOL.length, 2 + Math.floor(n / 2));
  const kinds = 1 + Math.min(3, Math.floor(n / 4));
  /** @type {string[]} */
  const parts = [];
  let at = 0;
  for (let k = 0; k < kinds; k++) {
    const code = ENDLESS_POOL[Math.floor(rnd() * unlocked)];
    const id = CODES[code];
    const heavy = ['T', 'R', 'O', 'H', 'Z', 'Q', 'M', 'B'].includes(code);
    const count = heavy ? 1 + Math.floor(n / 6) : code === 'D' ? 10 + n * 2 : 5 + Math.floor(n * 0.9);
    const gap = heavy ? 3 : code === 'D' ? 0.3 : Math.max(0.45, 1.1 - n * 0.02);
    parts.push(`${id}${count}/${gap}@${at}`);
    at += 3 + rnd() * 4;
  }
  if (n % 10 === 0) parts.push(`${ENDLESS_BOSSES[(n / 10 - 1) % 4]}1@${at}`);
  if (n % 7 === 0) parts.push(`good-boy1@${at + 2}`);
  return { groups: parseWave(parts.join(' ')), hpMul: 1 + 0.09 * n + 0.006 * n * n };
}
