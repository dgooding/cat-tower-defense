// @ts-check
// Beans: tiny tuxedo kitten, always first into trouble, wearing two very different socks.

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */

const WHITE_FUR = '#FFFCF4';

/** Lopsided white blaze (Mama's is neat; Beans's is not). @param {Geo} g */
function blaze(g) {
  const { ctx, hy } = g;
  ctx.fillStyle = WHITE_FUR;
  ctx.beginPath();
  ctx.moveTo(-20, hy + 22);
  ctx.quadraticCurveTo(-12, hy - 2, -16, hy - 46);
  ctx.quadraticCurveTo(2, hy - 8, 14, hy + 22);
  ctx.closePath();
  ctx.fill();
}

/** Bed-head cowlick. @param {Geo} g */
function cowlick(g) {
  const { pen, hy, t } = g;
  const w = Math.sin(t * 3) * 2;
  const pts = [
    { x: -14, y: hy - 50 },
    { x: -10 + w, y: hy - 74 },
    { x: -2, y: hy - 60 },
    { x: 6 + w, y: hy - 80 },
    { x: 8, y: hy - 58 },
    { x: 18 + w, y: hy - 70 },
    { x: 16, y: hy - 50 },
  ];
  pen.blob(pts, '#4A4754', { stroke: false, amp: 0 });
  pen.line(pts, { amp: 0 });
}

/** One striped sock, one polka-dot sock, neither pulled up properly. @param {Geo} g */
function socks(g) {
  const { pen, ctx, lw } = g;
  const sock = (/** @type {number} */ px, /** @type {number} */ cuff, /** @type {string} */ base, /** @type {string} */ rib, /** @type {number} */ tilt, /** @type {(x:number)=>void} */ deco) => {
    const pts = [
      { x: px - 16, y: -6 },
      { x: px - 9, y: 2 },
      { x: px + 9, y: 2 },
      { x: px + 16, y: -6 },
      { x: px + 13, y: -14 },
      { x: px + 11, y: -cuff + 6 + tilt },
      { x: px - 11, y: -cuff + 6 - tilt },
      { x: px - 13, y: -14 },
    ];
    const w = pen.blob(pts, base);
    ctx.save();
    ctx.beginPath();
    w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    deco(px);
    ctx.restore();
    // Toe seam and little toe bumps.
    pen.line([{ x: px - 12, y: -7 }, { x: px, y: -10 }, { x: px + 12, y: -7 }], { width: lw * 0.6, alpha: 0.55 });
    for (const d of [-4.5, 4.5]) pen.line([{ x: px + d, y: -4 }, { x: px + d, y: 1 }], { width: lw * 0.6, amp: 0 });
    // Ribbed cuff.
    pen.blob(
      [
        { x: px - 11.5, y: -cuff + 8 - tilt },
        { x: px - 11.5, y: -cuff - tilt },
        { x: px + 11.5, y: -cuff + tilt },
        { x: px + 11.5, y: -cuff + 8 + tilt },
      ],
      rib,
      { width: lw * 0.9 },
    );
    for (const dx of [-7, 0, 7]) pen.line([{ x: px + dx, y: -cuff + 1 + (tilt * dx) / 13 }, { x: px + dx, y: -cuff + 7 + (tilt * dx) / 13 }], { width: lw * 0.5, alpha: 0.5, amp: 0 });
  };
  sock(-17, 34, '#FFF4EC', '#E0574A', 0, (px) => {
    ctx.fillStyle = '#E0574A';
    for (let y = -30; y < 4; y += 8) ctx.fillRect(px - 20, y, 40, 4);
  });
  sock(17, 22, '#5FB8A8', '#F2D16B', 3, (px) => {
    ctx.fillStyle = '#F2D16B';
    for (const [dx, dy] of [[-7, -12], [4, -6], [-3, -2], [8, -15], [7, 0], [-8, -4]]) {
      ctx.beginPath();
      ctx.arc(px + dx, dy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Slouchy wrinkles on the short sock.
  for (const y of [-12, -16]) pen.line([{ x: 7, y }, { x: 17, y: y - 2 }, { x: 27, y }], { width: lw * 0.6, alpha: 0.6 });
}

/** @type {CatSpec} */
export const spec = {
  id: 'beans',
  fur: '#4A4754',
  light: '#6E6A7C',
  shade: '#302E39',
  cream: WHITE_FUR,
  muzzle: WHITE_FUR,
  paw: WHITE_FUR,
  stripe: '#3A3844',
  eye: '#9BD16A',
  eyeDark: '#3F7A24',
  eyeLight: '#DDF5A8',
  innerEar: '#E99AAA',
  whisker: '#F4F0E6',
  tailTip: WHITE_FUR,
  nose: '#F29AAB',
  outline: '#26252F',
  mouth: 'smile',
  pupil: 1.1,
  pattern: 'none',
  headPattern: blaze,
  scale: 0.55,
  bodyW: 0.8,
  bodyH: 0.8,
  headW: 1.08,
  earSize: 1.05,
  tailLen: 0.8,
  tiers: {
    T1: [
      { layer: 'neck', draw: socks },
      { layer: 'head', draw: cowlick },
    ],
  },
};

export const tiers = [{ id: 'T1', label: 'T1 · Kitten' }];
