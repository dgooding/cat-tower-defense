// @ts-check
// Noodle: long, wiggly grey tabby kitten. Somehow longer every time you look.
/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */

/** Extra stripes all along the long back. @param {Geo} g @param {{bcy:number, brx:number, bry:number}} b */
function backStripes(g, b) {
  const { pen, lw } = g;
  for (let k = -3; k <= 3; k++) {
    const x = k * b.brx * 0.26;
    const top = b.bcy - b.bry * 1.05;
    pen.line([{ x: x - 3, y: top }, { x, y: top + b.bry * 0.38 }, { x: x + 2, y: top + b.bry * 0.55 }], { color: '#6B6C7E', width: lw * 2, amp: 0 });
  }
}

/** A loose cheek tuft so the long face reads as "kitten". @param {Geo} g */
function tuft(g) {
  const { pen, hy, hrx } = g;
  for (const s of [-1, 1]) {
    pen.line(
      [
        { x: s * hrx * 0.95, y: hy + 18 },
        { x: s * hrx * 1.12, y: hy + 24 },
        { x: s * hrx * 0.98, y: hy + 28 },
        { x: s * hrx * 1.1, y: hy + 34 },
      ],
      { width: g.lw * 0.9 },
    );
  }
}

/** @type {CatSpec} */
export const spec = {
  id: 'noodle',
  fur: '#A7A8B4',
  light: '#D5D6DF',
  shade: '#81839A',
  cream: '#EEEDF2',
  stripe: '#6B6C7E',
  eye: '#E6C84A',
  eyeDark: '#8A6A12',
  eyeLight: '#FFF0A0',
  innerEar: '#EDB0BA',
  mouth: 'w',
  pattern: 'tabby',
  bodyPattern: backStripes,
  scale: 0.55,
  bodyW: 1.55,
  bodyH: 0.66,
  headW: 0.9,
  earSize: 1.1,
  tailLen: 1.9,
  tailWidth: 0.62,
  tiers: {
    T1: [{ layer: 'head', draw: tuft }],
  },
};

export const tiers = [{ id: 'T1', label: 'T1 · Kitten' }];
