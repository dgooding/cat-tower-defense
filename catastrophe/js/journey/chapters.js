// @ts-check
// The seven chapters of the journey. Each one is a scene, a song, a story, and one way to play along.
// Every interaction is musical: taps snap to the beat and pick notes from the chord that's playing,
// and every note the score plays makes something happen in the scene.
import { Track } from '../core/spline.js';
import { ROOM_ART } from '../art/registry.js';
import { glow, star, flower, hueOf, clamp, lerp, ease, fxText, INK } from './kit.js';

/** @typedef {import('./kit.js').Actor} Actor */
/** @typedef {import('../audio/music.js').NoteMeta} NoteMeta */
/**
 * What a chapter can use (built by main.js).
 * @typedef {Object} J
 * @property {number} now heard audio time (s) @property {number} dt @property {number} time seconds since the chapter began
 * @property {number} beat beats since the song began @property {number} bar @property {number} beatDur @property {number} barDur
 * @property {number} e8 eighth note (s) @property {number} bpb beats per bar @property {{bass:number, notes:number[]}} chord
 * @property {import('./kit.js').Fx} fx @property {boolean} reduced @property {boolean} held @property {any} st chapter state
 * @property {number} got @property {number} goal @property {{purrfect:number, snacks:number, stars:number}} stats
 * @property {(id:string, x:number, y:number, px:number, seed?:number) => Actor} actor
 * @property {(a:Actor) => void} remove
 * @property {(i:number, shift?:number) => number} tone chord tone i (above the chord's voicing by shift semitones)
 * @property {(y:number, shift?:number) => number} toneY chord tone picked by height (higher on screen = higher note)
 * @property {(kind:import('../audio/songs.js').LeadKind, midi:number, o?:{quant?:'8'|'4', at?:number, vel?:number, dur?:number}) => number} play returns the audio time it sounds
 * @property {(at:number, fn:() => void) => void} later run fn when audio time `at` is heard
 * @property {(grid:'beat'|'back') => {label:string, score:number}} judge
 * @property {(text:string, x:number, y:number, color?:string, size?:number) => void} say
 * @property {(n?:number) => void} gain progress toward the goal
 * @property {(n:number, label:string) => void} setGoal
 * @property {(on:boolean) => void} drive drums and arpeggios on/off
 * @property {(text:string) => void} hint @property {(text:string) => void} narrate
 * @property {(bar:number) => number} barTime audio time a bar starts
 * @property {(bar:number) => {bass:number, notes:number[]}} chordAt
 * @property {number} shake
 */
/**
 * @typedef {Object} Chapter
 * @property {string} id @property {string} num @property {string} title @property {string} place @property {string} icon
 * @property {string} song @property {{world:string, layout:number, light?:number, path?:boolean, stash?:boolean, night?:number}} scene
 * @property {number} goal @property {string} label @property {string} hint
 * @property {'top'|'mid'|'bottom'} [narr] where the storyteller's lines go (away from the action)
 * @property {string[]} story narrated every 4 bars @property {string} outro
 * @property {(j:J) => void} enter
 * @property {(j:J, m:NoteMeta) => void} [onNote]
 * @property {(j:J, x:number|null, y:number|null) => void} [tap] x/y null = keyboard (Space)
 * @property {(j:J) => void} [release]
 * @property {(j:J, key:string) => void} [key]
 * @property {(j:J) => boolean|void} [onGoal] return true to keep going (a new goal was set)
 * @property {(j:J) => void} [update]
 * @property {(j:J, ctx:CanvasRenderingContext2D) => void} [back] drawn under the characters
 * @property {(j:J, ctx:CanvasRenderingContext2D) => void} [front] drawn over the characters
 */

const rand = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a);
/** Bob a rig to the music. @param {Actor} a @param {number} [k] */
const bob = (a, k = 1) => {
  const r = /** @type {any} */ (a.rig);
  if (r.squash) r.squash.kick(1.6 * k);
};

// ---------------------------------------------------------------- the fish of light (overture + finale)

const FISH = [
  { x: 640, y: 250 },
  { x: 780, y: 172 },
  { x: 960, y: 142 },
  { x: 1140, y: 172 },
  { x: 1280, y: 250 },
  { x: 1140, y: 328 },
  { x: 960, y: 358 },
  { x: 780, y: 328 },
];
const FISH_TAIL = [{ x: 1410, y: 170 }, { x: 1410, y: 330 }];

/** @param {CanvasRenderingContext2D} ctx @param {boolean[]} lit @param {number} t @param {number} whole 0..1 */
function drawFish(ctx, lit, t, whole) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < FISH.length; i++) {
    const a = FISH[i];
    const b = FISH[(i + 1) % FISH.length];
    if (!lit[i] || !lit[(i + 1) % FISH.length]) continue;
    ctx.strokeStyle = `rgba(255,236,170,${0.35 + 0.25 * whole})`;
    ctx.lineWidth = 3 + whole * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (whole > 0) {
    ctx.strokeStyle = `rgba(255,236,170,${0.6 * whole})`;
    ctx.beginPath();
    ctx.moveTo(FISH[4].x, FISH[4].y);
    ctx.lineTo(FISH_TAIL[0].x, FISH_TAIL[0].y);
    ctx.lineTo(FISH_TAIL[1].x, FISH_TAIL[1].y);
    ctx.closePath();
    ctx.stroke();
    star(ctx, 740, 232, 9 * whole, t, '#FFF1B0', whole);
    glow(ctx, 960, 250, 420, 'rgba(255,230,150,0.35)', whole * (0.6 + 0.2 * Math.sin(t * 2)));
  }
  ctx.restore();
  FISH.forEach((p, i) => {
    const tw = 0.85 + 0.15 * Math.sin(t * 3 + i);
    if (lit[i]) {
      glow(ctx, p.x, p.y, 70 * tw, 'rgba(255,230,150,0.9)', 0.8);
      star(ctx, p.x, p.y, 15 * tw, t * 0.3 + i, '#FFF4C2');
    } else {
      // Sleeping star: a soft pulsing ring so you can see where the fish will be.
      const k = 0.5 + 0.5 * Math.sin(t * 2.4 + i);
      ctx.strokeStyle = `rgba(255,240,190,${0.25 + 0.3 * k})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 + k * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,248,220,0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Twinkles that appear on the score's notes. @param {J} j @param {number} midi @param {number} [y1] */
function twinkle(j, midi, y1 = 560) {
  j.st.tw.push({ x: rand(80, 1840), y: rand(50, y1), t: 0, c: hueOf(midi, 85), r: rand(5, 10) });
}
/** @param {J} j @param {CanvasRenderingContext2D} ctx */
function drawTwinkles(j, ctx) {
  const tw = j.st.tw;
  for (const s of tw) s.t += j.dt;
  j.st.tw = tw.filter((/** @type {any} */ s) => s.t < 1.8);
  for (const s of j.st.tw) {
    const k = s.t / 1.8;
    const a = Math.sin(k * Math.PI);
    glow(ctx, s.x, s.y, s.r * 5, s.c, a * 0.7);
    star(ctx, s.x, s.y, s.r * (0.6 + a * 0.4), k * 2, '#FFFDF6', a);
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} pulse */
function moon(ctx, x, y, pulse) {
  glow(ctx, x, y, 260 + pulse * 60, 'rgba(255,240,200,0.55)', 0.6 + pulse * 0.3);
  ctx.fillStyle = '#FFF6D8';
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,214,170,0.6)';
  for (const [dx, dy, r] of [[-18, -12, 12], [16, 14, 9], [10, -24, 6]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- 0 · Overture

/** @type {Chapter} */
const overture = {
  id: 'overture',
  num: 'Overture',
  title: 'The Night the Stars Fell Asleep',
  place: 'Shrine Steps, after bedtime',
  icon: '\u{1F319}',
  song: 'title',
  scene: { world: 'countryside', layout: 2, light: 1, path: true, night: 1 },
  goal: 8,
  label: 'stars awake',
  hint: 'Tap the sky to wake the stars. (Space works too.)',
  story: ['Once, in a sleepy village, the stars forgot how to shine.', 'Pudding dreamed of a fish made entirely of light.', 'Every star you wake will sing its own note.'],
  outro: 'The fish of light swam across the sky, pointing the way to morning.',
  enter(j) {
    j.st = { lit: FISH.map(() => false), next: 0, fly: [], tw: [], moon: 0, whole: 0 };
    const p = j.actor('pudding', 520, 930, 190, 3);
    p.seat = '#B9A7E6';
    p.look = false;
    /** @type {any} */ (p.rig).setExpression('sleepy');
    j.st.pud = p;
  },
  onNote(j, m) {
    if (m.part === 'lead' && m.midi) twinkle(j, m.midi);
    if (m.part === 'pad') j.st.moon = 1;
    if (m.part === 'bass' && j.got < j.goal) j.fx.add({ kind: 'z', x: j.st.pud.x + 50, y: j.st.pud.y - 150, vx: 14, vy: -40, life: 2.4, size: 40 });
  },
  tap(j, x, y) {
    if (j.st.next >= FISH.length) return;
    const sx = x ?? rand(300, 1600);
    const sy = Math.min(y ?? rand(100, 500), 700);
    const midi = j.toneY(sy, 24);
    const i = j.st.next++;
    const at = j.play('bell', midi, { quant: '8', vel: 0.9 });
    j.later(at, () => {
      j.fx.burst(sx, sy, hueOf(midi, 80), 6, 140);
      j.st.fly.push({ x0: sx, y0: sy, i, t: 0, midi });
    });
  },
  update(j) {
    j.st.moon = Math.max(0, j.st.moon - j.dt * 0.8);
    for (const f of j.st.fly) {
      f.t += j.dt;
      if (f.t >= 0.6 && !j.st.lit[f.i]) {
        j.st.lit[f.i] = true;
        const p = FISH[f.i];
        j.fx.burst(p.x, p.y, '#FFE9A0', 14, 200);
        j.fx.ring(p.x, p.y, '#FFE9A0', 90);
        j.gain();
      }
    }
    j.st.fly = j.st.fly.filter((/** @type {any} */ f) => f.t < 0.6);
    if (j.got >= j.goal) j.st.whole = Math.min(1, j.st.whole + j.dt * 0.6);
  },
  onGoal(j) {
    const r = /** @type {any} */ (j.st.pud.rig);
    r.setExpression('happy');
    r.poke();
    j.say('!', j.st.pud.x + 10, j.st.pud.y - 230, '#FFE9A0', 80);
  },
  back(j, ctx) {
    moon(ctx, 1640, 160, j.st.moon);
    drawTwinkles(j, ctx);
    drawFish(ctx, j.st.lit, j.time, j.st.whole);
    for (const f of j.st.fly) {
      const p = FISH[f.i];
      const k = ease(f.t / 0.6);
      const x = lerp(f.x0, p.x, k);
      const y = lerp(f.y0, p.y, k) - Math.sin(k * Math.PI) * 80;
      for (let s = 1; s <= 6; s++) {
        const kk = Math.max(0, k - s * 0.04);
        glow(ctx, lerp(f.x0, p.x, kk), lerp(f.y0, p.y, kk) - Math.sin(kk * Math.PI) * 80, 22 - s * 2.5, hueOf(f.midi, 80), 0.5 - s * 0.07);
      }
      glow(ctx, x, y, 40, '#FFF1C0', 0.9);
      star(ctx, x, y, 12, f.t * 6, '#FFFDF6');
    }
  },
};

// ---------------------------------------------------------------- 1 · Morning meadow

const MEADOW = ROOM_ART.countryside.room.layouts[0];

/** @type {Chapter} */
const meadow = {
  id: 'meadow',
  num: 'Chapter I',
  title: 'Morning Zoomies Meadow',
  place: 'The Sunbeam Countryside',
  icon: '\u{1F33C}',
  song: 'countryside',
  scene: { world: 'countryside', layout: 0, light: 0.05, path: true, stash: true },
  goal: 6,
  label: 'flowers singing',
  hint: 'Tap the meadow to plant singing flowers.',
  story: ['Morning spilled over the meadow like warm milk.', 'Wherever a note landed, a flower answered.'],
  outro: 'The meadow kept humming long after the last cucumber saluted.',
  enter(j) {
    j.st = { flowers: [], cadets: [], phase: 'bloom', track: new Track(MEADOW.paths[0], 16), lastSpawn: -9 };
    const p = j.actor('pudding', 600, 345, 170, 5);
    p.seat = '#F4B7C2';
    const g = j.actor('granny-purl', 1190, 650, 170, 7);
    g.seat = '#BFE0F2';
    j.st.cats = [p, g];
  },
  onGoal(j) {
    if (j.st.phase !== 'bloom') return false;
    j.st.phase = 'march';
    j.drive(true);
    j.setGoal(8, 'cucumbers bonked');
    j.hint('Tap a marching cucumber on the beat to bonk it.');
    j.narrate('Then came the cucumbers, marching perfectly in time.');
    return true;
  },
  onNote(j, m) {
    const st = j.st;
    if (m.part === 'lead' && st.flowers.length) {
      const f = st.flowers[Math.floor(Math.random() * st.flowers.length)];
      f.pulse = 1;
      if (!j.reduced || Math.random() < 0.4) j.fx.note(f.x, f.y - f.size * 2, hueOf(m.midi ?? 60));
    }
    if (m.part === 'bass') for (const c of st.cats) bob(c, 0.6);
    if (m.part === 'drum' && (m.kind === 'kick' || m.kind === 'snap')) {
      for (const c of st.cadets) if (!c.dead) Object.assign(c, { d0: c.d, d1: c.d + 52, stepT: j.time });
      const bar = m.bar;
      if (m.kind === 'kick' && (m.step ?? 0) % 8 === 0 && st.phase === 'march' && bar % 2 === 0 && st.cadets.filter((/** @type {any} */ c) => !c.dead).length < 6) {
        const a = j.actor('cucumber-cadet', -60, 540, 120, Math.floor(Math.random() * 999));
        st.cadets.push({ a, d: 0, d0: 0, d1: 0, stepT: -9, dead: false, deadT: 0 });
      }
    }
  },
  tap(j, x, y) {
    const st = j.st;
    if (st.phase === 'march') {
      /** @type {any} */
      let best = null;
      let bd = x == null ? Infinity : 95;
      for (const c of st.cadets) {
        if (c.dead) continue;
        const d = x == null || y == null ? -c.d : Math.hypot(c.a.x - x, c.a.y - 55 - y);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      if (best) return bonk(j, best);
    }
    plant(j, x ?? rand(150, 1650), y ?? rand(700, 1000));
  },
  update(j) {
    const st = j.st;
    for (const f of st.flowers) {
      f.k = Math.min(1, f.k + j.dt * 1.8);
      f.pulse = Math.max(0, f.pulse - j.dt * 3);
    }
    for (const c of st.cadets) {
      const k = ease((j.time - c.stepT) / 0.22);
      if (!c.dead) c.d = lerp(c.d0, c.d1, k);
      const p = st.track.at(c.d);
      c.a.x = p.x;
      c.a.y = p.y + 20;
      c.a.flip = p.dx < 0;
      c.a.lift = !c.dead && k < 1 ? Math.sin(k * Math.PI) * 14 : 0;
      if (!c.dead && c.d > st.track.length - 70) {
        c.dead = true;
        c.deadT = j.time;
        c.a.hidden = true;
        j.stats.snacks = Math.max(0, j.stats.snacks - 1);
        j.say('nom.', c.a.x, c.a.y - 120, '#5E9A4E', 40);
      }
    }
    for (const c of st.cadets) if (c.dead && j.time - c.deadT > 1.6) j.remove(c.a);
    st.cadets = st.cadets.filter((/** @type {any} */ c) => !c.dead || j.time - c.deadT <= 1.6);
  },
  back(j, ctx) {
    const sway = Math.sin(j.beat * Math.PI);
    for (const f of [...j.st.flowers].sort((a, b) => a.y - b.y)) flower(ctx, f.x, f.y, f.size, f.color, f.k, sway * (0.5 + (f.x % 7) / 7), f.pulse);
  },
};

/** @param {J} j @param {number} x @param {number} y */
function plant(j, x, y) {
  const st = j.st;
  const yy = clamp(y, 380, 1050);
  const midi = j.toneY(yy, 12);
  const at = j.play('pluck', midi, { quant: '8', vel: 0.9 });
  j.later(at, () => {
    st.flowers.push({ x, y: yy, size: rand(26, 40), color: hueOf(midi), k: 0, pulse: 1 });
    if (st.flowers.length > 60) st.flowers.shift();
    j.fx.burst(x, yy - 30, hueOf(midi), 8, 160);
    if (st.phase === 'bloom') j.gain();
  });
}

/** @param {J} j @param {any} c */
function bonk(j, c) {
  const res = j.judge('beat');
  c.dead = true;
  c.deadT = j.time;
  const r = c.a.rig;
  r.die();
  j.play('pluck', j.tone(0, 24) + (res.score === 2 ? 12 : 0), { vel: 1 });
  j.fx.burst(c.a.x, c.a.y - 60, res.score === 2 ? '#FFE27A' : '#9BE37A', res.score === 2 ? 18 : 10, 300);
  j.say(res.score ? res.label : 'Bonk!', c.a.x, c.a.y - 150, res.score === 2 ? '#E0A100' : '#5E9A4E');
  let near = j.st.cats[0];
  for (const cat of j.st.cats) if (Math.hypot(cat.x - c.a.x, cat.y - c.a.y) < Math.hypot(near.x - c.a.x, near.y - c.a.y)) near = cat;
  const nr = near.rig;
  if (!nr.action) nr.play('attack');
  j.gain();
}

// ---------------------------------------------------------------- 2 · Kotatsu lounge

const CUPS = [700, 860, 1020, 1180].map((x, i) => ({ x, y: 890, color: ['#F6B3C2', '#B9E2C8', '#BFD7F5', '#F8DDA0'][i] }));
const PATTERNS = [
  [0, 2, 1],
  [1, 3, 2, 0],
  [0, 1, 3, 2],
  [3, 1, 0, 2, 1],
];

/** @param {J} j @param {number} i @param {number} [bar] */
const cupMidi = (j, i, bar) => {
  const notes = [...(bar == null ? j.chord : j.chordAt(bar)).notes].sort((a, b) => a - b);
  return notes[i % notes.length] + 12 * Math.floor(i / notes.length) + 12;
};

/** @type {Chapter} */
const lounge = {
  id: 'lounge',
  num: 'Chapter II',
  title: 'The Kotatsu Lounge',
  place: "Grandma's Cozy House, teatime",
  icon: '\u{1F375}',
  song: 'house',
  scene: { world: 'house', layout: 1, light: 0.45, path: false },
  goal: 4,
  narr: 'top',
  label: 'tunes echoed',
  hint: "Watch Mama's teacups, then play them back. Tap the cups or press 1 2 3 4.",
  story: ['Grandma\u2019s house smelled of tea and long naps.', 'Mama Mittens hums a tune on the teacups. The kittens wait for yours.'],
  outro: 'The kittens learned every tune. Some of them even stayed awake for it.',
  enter(j) {
    j.st = { round: 0, phase: 'wait', nextCall: j.bar + 1, callBar: 0, answer: [], light: [0, 0, 0, 0], bulbs: new Array(12).fill(0), lastBar: -1 };
    j.st.mama = j.actor('mama-mittens', 470, 860, 200, 11);
    j.st.mama.seat = '#F8D7A8';
    j.st.kits = [
      j.actor('beans', 1440, 880, 240, 21),
      j.actor('biscuit', 1590, 920, 240, 22),
      j.actor('noodle', 1740, 880, 240, 23),
    ];
  },
  onNote(j, m) {
    if (m.part === 'lead' && m.midi) j.st.bulbs[m.midi % 12] = 1;
    if (m.part === 'bass') {
      const k = j.st.kits[(m.step ?? 0) / 2 % 3 | 0];
      if (k) bob(k, 0.8);
    }
  },
  update(j) {
    const st = j.st;
    st.light = st.light.map((/** @type {number} */ v) => Math.max(0, v - j.dt * 2.2));
    st.bulbs = st.bulbs.map((/** @type {number} */ v) => Math.max(0, v - j.dt * 1.4));
    if (j.bar !== st.lastBar) {
      st.lastBar = j.bar;
      if (st.phase === 'answer' && j.bar >= st.callBar + 5) {
        st.phase = 'wait';
        st.nextCall = j.bar;
        st.answer = [];
      }
      if (st.phase === 'wait' && j.bar >= st.nextCall && st.round < PATTERNS.length) call(j);
    }
  },
  tap(j, x, y) {
    if (x == null || y == null) return;
    const i = CUPS.findIndex((c) => Math.abs(c.x - x) < 75 && Math.abs(c.y - 30 - y) < 95);
    if (i >= 0) press(j, i);
  },
  key(j, k) {
    const i = '1234'.indexOf(k);
    if (i >= 0) press(j, i);
  },
  back(j, ctx) {
    const st = j.st;
    // String lights across the top: each lights up on the melody's notes.
    ctx.save();
    ctx.strokeStyle = 'rgba(59,58,74,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = 160 + (i / 40) * 1600;
      const y = 60 + Math.sin((i / 40) * Math.PI) * 50;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 12; i++) {
      const x = 220 + i * 134;
      const y = 60 + Math.sin(((x - 160) / 1600) * Math.PI) * 50 + 18;
      const c = hueOf(i, 70);
      glow(ctx, x, y, 60, c, 0.25 + st.bulbs[i] * 0.75);
      ctx.fillStyle = st.bulbs[i] > 0.1 ? '#FFFDF6' : c;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Tea tray and cups.
    // The tune as a row of notes: it builds while Mama plays, then ticks off as you echo it.
    if ((st.phase === 'call' || st.phase === 'answer') && st.round < PATTERNS.length) {
      const pat = PATTERNS[st.round];
      const n = st.phase === 'call' ? st.shown ?? 0 : pat.length;
      const x0 = 940 - ((pat.length - 1) * 74) / 2;
      ctx.fillStyle = 'rgba(255,250,236,0.85)';
      ctx.strokeStyle = 'rgba(59,58,74,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x0 - 56, 720, (pat.length - 1) * 74 + 112, 76, 38);
      ctx.fill();
      ctx.stroke();
      for (let k = 0; k < n; k++) {
        const x = x0 + k * 74;
        const done = st.phase === 'answer' && k < st.answer.length;
        const next = st.phase === 'answer' && k === st.answer.length;
        const r = 26 + (next ? 4 * Math.sin(j.time * 8) : 0);
        ctx.globalAlpha = done ? 0.45 : 1;
        ctx.fillStyle = CUPS[pat[k]].color;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.arc(x, 758, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        fxText(ctx, done ? '\u2713' : String(pat[k] + 1), x, 760, 30, INK, done ? 0.6 : 1);
      }
    }
    ctx.fillStyle = '#B7835A';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(610, 895, 660, 60, 18);
    ctx.fill();
    ctx.stroke();
    CUPS.forEach((c, i) => {
      const L = st.light[i];
      glow(ctx, c.x, c.y - 30, 120, c.color, L * 0.9);
      ctx.fillStyle = '#FFFDF6';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 6, 62, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(c.x - 46, c.y - 60);
      ctx.lineTo(c.x + 46, c.y - 60);
      ctx.quadraticCurveTo(c.x + 44, c.y, c.x, c.y);
      ctx.quadraticCurveTo(c.x - 44, c.y, c.x - 46, c.y - 60);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(c.x + 52, c.y - 36, 13, 16, 0, -1.3, 1.3);
      ctx.stroke();
      ctx.fillStyle = '#9C6B3F';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 60, 44, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Steam.
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + L * 0.6})`;
      ctx.lineWidth = 4;
      for (const s of [-14, 14]) {
        ctx.beginPath();
        for (let k = 0; k < 12; k++) {
          const yy = c.y - 74 - k * 8;
          const xx = c.x + s + Math.sin(k * 0.8 + j.time * 3 + i) * 7;
          if (k) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = INK;
      fxText(ctx, String(i + 1), c.x, c.y - 28, 30, INK, 0.75);
    });
  },
};

/** Mama plays the next phrase on the cups. @param {J} j */
function call(j) {
  const st = j.st;
  const pat = PATTERNS[st.round];
  st.phase = 'call';
  st.callBar = j.bar;
  st.answer = [];
  st.shown = 0;
  const t0 = j.barTime(j.bar);
  pat.forEach((cup, n) => {
    const pos = 2 + n * 2;
    const bar = j.bar + Math.floor(pos / (j.bpb * 2));
    const at = t0 + pos * j.e8;
    j.play('keys', cupMidi(j, cup, bar), { at, vel: 0.95, dur: j.e8 * 2 });
    j.later(at, () => {
      st.light[cup] = 1;
      st.shown = n + 1;
      bob(st.mama, 1);
      j.fx.note(CUPS[cup].x, CUPS[cup].y - 110, CUPS[cup].color);
      if (n === pat.length - 1) {
        st.phase = 'answer';
        j.say('Your turn!', st.mama.x, st.mama.y - 250, '#C0587A', 40);
      }
    });
  });
}

/** @param {J} j @param {number} i */
function press(j, i) {
  const st = j.st;
  j.play('keys', cupMidi(j, i), { vel: 0.95 });
  st.light[i] = 1;
  j.fx.note(CUPS[i].x, CUPS[i].y - 110, CUPS[i].color);
  if (st.phase !== 'answer') return;
  const pat = PATTERNS[st.round];
  st.answer.push(i);
  const n = st.answer.length - 1;
  if (st.answer[n] !== pat[n]) {
    st.answer = [];
    j.say('Again!', st.mama.x, st.mama.y - 250, '#C0587A', 40);
    /** @type {any} */ (st.mama.rig).setExpression('smug');
    return;
  }
  if (st.answer.length === pat.length) {
    st.round++;
    st.phase = 'wait';
    st.nextCall = j.bar + 2;
    j.stats.purrfect++;
    j.say('Purrfect!', 940, 820, '#E0A100', 52);
    j.fx.burst(940, 860, '#FFE27A', 22, 320);
    /** @type {any} */ (st.mama.rig).setExpression('happy');
    for (const k of st.kits) /** @type {any} */ (k.rig).setExpression('celebrate');
    j.later(j.barTime(j.bar + 2), () => {
      for (const k of st.kits) /** @type {any} */ (k.rig).setExpression('idle');
    });
    if (st.round === 1) j.drive(true);
    j.gain();
  }
}

// ---------------------------------------------------------------- 3 · Lantern alley

/** Light up one lantern near this pitch (one at a time, so you follow the tune). @param {J} j @param {number} midi */
function flickFor(j, midi) {
  const st = j.st;
  if (st.flick.some((/** @type {number} */ f, /** @type {number} */ i) => !st.lit[i] && f > j.now)) return;
  const want = clamp(Math.round(((midi - 62) / 19) * 7), 0, 7);
  for (let d = 0; d < 8; d++) {
    for (const i of [want - d, want + d]) {
      if (i < 0 || i > 7 || st.lit[i]) continue;
      st.flick[i] = j.now + Math.max(0.9, j.beatDur * 1.3);
      st.swing[i] = 1;
      st.lastFlick = j.now;
      return;
    }
  }
}

const LANTERNS = Array.from({ length: 8 }, (_, i) => {
  const x = 330 + i * 180;
  const y = 70 + Math.sin(((x - 240) / 1440) * Math.PI) * 55;
  return { x, y: y + 64, top: y };
});
const LANTERN_NOTES = [62, 65, 67, 69, 72, 74, 77, 79];

/** @type {Chapter} */
const lanterns = {
  id: 'lanterns',
  num: 'Chapter III',
  title: 'Lantern Alley in the Rain',
  place: 'Rainy Bathhouse Town, evening',
  icon: '\u{1F3EE}',
  song: 'bathhouse',
  scene: { world: 'bathhouse', layout: 0, light: 0.85, path: true },
  goal: 8,
  label: 'lanterns lit',
  hint: 'A lantern flickers on each note. Tap it before the glow fades.',
  story: ['Evening rain drew silver strings across Lantern Alley.', 'Each note of the koto wakes a lantern for a heartbeat.', 'Catch the glow before it fades.'],
  outro: 'Eight lanterns, eight notes, and not one cat got wet. Well. Almost.',
  enter(j) {
    j.st = { lit: LANTERNS.map(() => false), flick: LANTERNS.map(() => -9), swing: LANTERNS.map(() => 0), rain: [], ripples: [], lastFlick: j.now };
    for (let i = 0; i < (j.reduced ? 40 : 140); i++) j.st.rain.push({ x: rand(0, 1920), y: rand(0, 1080), v: rand(900, 1300) });
    j.st.mochi = j.actor('maneki-mochi', 960, 715, 180, 31);
    j.st.mochi.seat = '#D9B98C';
    j.st.ducks = [j.actor('rubber-duckie', 210, 1010, 150, 41), j.actor('rubber-duckie', 1760, 1010, 150, 42)];
    for (const d of j.st.ducks) /** @type {any} */ (d.rig).setMode('idle');
    j.st.ducks[1].flip = true;
  },
  onNote(j, m) {
    const st = j.st;
    if (m.part === 'lead' && m.midi) flickFor(j, m.midi);
    // The melody rests for half of every other pass; then the arpeggios keep the lanterns calling.
    if (m.part === 'arp' && m.midi && j.now - st.lastFlick > j.barDur * 2) flickFor(j, m.midi);
    if (m.part === 'arp' && m.midi) j.fx.add({ x: rand(200, 1720), y: rand(300, 900), vy: -30, life: 1.2, size: 6, color: hueOf(m.midi, 80), kind: 'spark' });
    if (m.part === 'drum' && m.kind === 'drip') st.ripples.push({ x: rand(150, 1770), y: rand(930, 1060), t: 0 });
    if (m.part === 'drum' && m.kind === 'tom') for (const d of st.ducks) bob(d, 1.4);
    if (m.part === 'bass') bob(st.mochi, 0.6);
  },
  tap(j, x, y) {
    const st = j.st;
    let i = -1;
    if (x == null || y == null) {
      let soon = Infinity;
      st.flick.forEach((/** @type {number} */ f, /** @type {number} */ k) => {
        if (!st.lit[k] && f > j.now && f < soon) {
          soon = f;
          i = k;
        }
      });
    } else i = LANTERNS.findIndex((l) => Math.abs(l.x - x) < 80 && Math.abs(l.y - y) < 100);
    if (i < 0) return;
    const L = LANTERNS[i];
    if (st.lit[i]) return void j.play('koto', LANTERN_NOTES[i] + 12, { vel: 0.4 });
    if (st.flick[i] > j.now) {
      st.lit[i] = true;
      j.play('koto', LANTERN_NOTES[i] + 12, { vel: 1 });
      j.fx.burst(L.x, L.y, '#FFB347', 16, 260);
      j.fx.ring(L.x, L.y + 40, '#FFD27A', 110);
      j.say('Caught!', L.x, L.y + 110, '#E0712C', 40);
      j.stats.purrfect++;
      if (st.lit.filter(Boolean).length === 3) j.drive(true);
      j.gain();
    } else {
      st.swing[i] = 0.6;
      j.play('koto', LANTERN_NOTES[i], { vel: 0.25 });
    }
  },
  onGoal(j) {
    const r = /** @type {any} */ (j.st.mochi.rig);
    r.play('attack');
  },
  update(j) {
    const st = j.st;
    for (const d of st.rain) {
      d.y += d.v * j.dt;
      d.x -= d.v * 0.18 * j.dt;
      if (d.y > 1090) {
        d.y = -20;
        d.x = rand(0, 2100);
      }
    }
    for (const r of st.ripples) r.t += j.dt;
    st.ripples = st.ripples.filter((/** @type {any} */ r) => r.t < 1.2);
    st.swing = st.swing.map((/** @type {number} */ v) => Math.max(0, v - j.dt * 1.5));
  },
  back(j, ctx) {
    const st = j.st;
    const litN = st.lit.filter(Boolean).length;
    ctx.fillStyle = `rgba(18,20,52,${0.42 * (1 - litN / 8)})`;
    ctx.fillRect(0, 0, 1920, 1080);
    for (const r of st.ripples) {
      const k = r.t / 1.2;
      ctx.strokeStyle = `rgba(200,230,255,${0.7 * (1 - k)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 10 + k * 70, 4 + k * 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  front(j, ctx) {
    const st = j.st;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,220,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const d of st.rain) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 7, d.y + 30);
    }
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = 240 + (i / 40) * 1440;
      const y = 70 + Math.sin((i / 40) * Math.PI) * 55;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    LANTERNS.forEach((L, i) => {
      const lit = st.lit[i];
      const f = st.flick[i] - j.now;
      const flicker = !lit && f > 0 ? (0.55 + 0.45 * Math.sin(j.time * 30 + i)) * Math.min(1, f / 0.4) : 0;
      const sw = Math.sin(j.time * 6 + i) * st.swing[i] * 0.25;
      ctx.save();
      ctx.translate(L.x, L.top);
      ctx.rotate(sw);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 30);
      ctx.stroke();
      const cy = 64;
      if (lit) glow(ctx, 0, cy, 170, 'rgba(255,190,90,0.9)', 0.75 + 0.1 * Math.sin(j.time * 2 + i));
      if (flicker) glow(ctx, 0, cy, 150, 'rgba(255,220,140,0.95)', flicker);
      ctx.fillStyle = lit ? '#FFB347' : flicker ? `rgba(255,${180 + 60 * flicker},120,1)` : '#C8553D';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, cy, 40, 50, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59,58,74,0.35)';
      for (const dy of [-28, 0, 28]) {
        ctx.beginPath();
        ctx.ellipse(0, cy + dy, 38 * Math.cos((dy / 50) * 1.2), 6, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = '#3B3A4A';
      ctx.fillRect(-22, cy - 56, 44, 10);
      ctx.fillRect(-22, cy + 46, 44, 10);
      ctx.restore();
    });
  },
};

// ---------------------------------------------------------------- 4 · Cloud whale waltz

const RIDER_X = 430;

/** @type {Chapter} */
const waltz = {
  id: 'waltz',
  num: 'Chapter IV',
  title: 'The Cloud Whale Waltz',
  place: 'Moonlit Sky Islands',
  icon: '\u{1F40B}',
  song: 'sky',
  scene: { world: 'sky', layout: 1, light: 0.55, path: false },
  goal: 16,
  narr: 'top',
  label: 'stars caught',
  hint: "Hold to float up, let go to drift down. Catch the melody's stars.",
  story: ['Above the clouds, a whale made of weather was waltzing.', 'Its song left stars behind it, like footprints.', 'Catch them, and they sing the tune back.'],
  outro: 'The whale sang one last low note, and the night grew very still.',
  enter(j) {
    j.st = { y: 600, vy: 0, stars: [], motes: [], whale: { x: 1500, flap: 0, spout: 0 }, lastStar: j.now };
    const p = j.actor('pudding', RIDER_X, 600, 150, 51);
    p.look = false;
    /** @type {any} */ (p.rig).setExpression('happy');
    j.st.pud = p;
  },
  onNote(j, m) {
    const st = j.st;
    if (m.part === 'lead' && m.midi) {
      const y = lerp(840, 210, clamp((m.midi - 62) / 18, 0, 1));
      st.stars.push({ x: 2000, y, midi: m.midi, speed: (2000 - RIDER_X) / (2 * j.barDur), got: false });
      st.lastStar = j.now;
    }
    // While the melody rests, the harp keeps leaving stars.
    if (m.part === 'arp' && m.midi && j.now - st.lastStar > j.barDur * 2 && (m.step ?? 0) % 2 === 0) {
      st.stars.push({ x: 2000, y: lerp(840, 210, clamp((m.midi - 62) / 18, 0, 1)), midi: m.midi, speed: (2000 - RIDER_X) / (2 * j.barDur), got: false });
    }
    if (m.part === 'arp' && m.midi) st.motes.push({ x: rand(900, 1900), y: rand(120, 900), t: 0, c: hueOf(m.midi, 85) });
    if (m.part === 'bass' && (m.step ?? 0) % (j.bpb * 2) === 0) st.whale.flap = 1;
    if (m.part === 'chime') st.whale.spout = 1;
  },
  tap(j) {
    // Holding does the steering (main.js tracks j.held); a tap just gives the cloud a little hop.
    j.st.vy -= 260;
    bob(j.st.pud, 0.8);
  },
  update(j) {
    const st = j.st;
    st.vy += (j.held ? -2300 : 1250) * j.dt;
    st.vy *= Math.exp(-3.2 * j.dt);
    st.y = clamp(st.y + st.vy * j.dt, 230, 900);
    if (st.y === 230 || st.y === 900) st.vy *= 0.3;
    st.pud.y = st.y;
    for (const s of st.stars) {
      s.x -= s.speed * j.dt;
      if (!s.got && Math.abs(s.x - RIDER_X) < 70 && Math.abs(s.y - (st.y - 70)) < 95) {
        s.got = true;
        j.play('bell', s.midi, { vel: 0.85 });
        j.fx.burst(s.x, s.y, hueOf(s.midi, 80), 12, 240);
        bob(st.pud, 1.4);
        j.stats.stars++;
        if (j.got + 1 === 6) j.drive(true);
        j.gain();
      }
    }
    st.stars = st.stars.filter((/** @type {any} */ s) => !s.got && s.x > -60);
    for (const m of st.motes) m.t += j.dt;
    st.motes = st.motes.filter((/** @type {any} */ m) => m.t < 1.4);
    const w = st.whale;
    w.x -= 18 * j.dt;
    if (w.x < -500) w.x = 2400;
    w.flap = Math.max(0, w.flap - j.dt * 2);
    w.spout = Math.max(0, w.spout - j.dt * 0.9);
  },
  back(j, ctx) {
    const st = j.st;
    drawWhale(ctx, st.whale, j.time);
    for (const m of st.motes) {
      const a = Math.sin((m.t / 1.4) * Math.PI);
      glow(ctx, m.x, m.y, 30, m.c, a * 0.7);
    }
    for (const s of st.stars) {
      glow(ctx, s.x, s.y, 70, hueOf(s.midi, 80), 0.7);
      star(ctx, s.x, s.y, 20, j.time * 2, '#FFF6CF', 1, true);
    }
    // Pudding's little cloud.
    const y = st.y + 6;
    ctx.fillStyle = '#FFFDF6';
    ctx.strokeStyle = 'rgba(59,58,74,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [dx, dy, r] of [[-70, 8, 34], [-30, -6, 44], [20, -4, 46], [64, 8, 34]]) ctx.ellipse(RIDER_X + dx, y + dy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (j.held) for (let i = 0; i < 2; i++) j.fx.add({ x: RIDER_X + rand(-60, 60), y: y + 30, vy: 120, life: 0.5, size: 5, color: '#CFE8FF', kind: 'spark' });
  },
};

/** @param {CanvasRenderingContext2D} ctx @param {{x:number, flap:number, spout:number}} w @param {number} t */
function drawWhale(ctx, w, t) {
  const y = 470 + Math.sin(t * 0.8) * 22;
  ctx.save();
  ctx.translate(w.x, y);
  ctx.globalAlpha = 0.9;
  const g = ctx.createLinearGradient(0, -120, 0, 120);
  g.addColorStop(0, '#F3F8FF');
  g.addColorStop(1, '#AFC6EE');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(59,58,74,0.45)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 330, 115, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const ft = Math.sin(t * 3) * 0.15 + w.flap * 0.4;
  ctx.save();
  ctx.translate(310, -10);
  ctx.rotate(-ft);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(110, -120, 170, -80);
  ctx.quadraticCurveTo(120, -10, 170, 60);
  ctx.quadraticCurveTo(110, 70, 0, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(-30, 70, 90, 26, 0.3 + w.flap * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-220, -18, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59,58,74,0.55)';
  ctx.beginPath();
  ctx.arc(-250, 18, 34, 0.3, 1.4);
  ctx.stroke();
  ctx.restore();
  if (w.spout > 0) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.3;
      const r = 40 + (1 - w.spout) * 110;
      glow(ctx, w.x - 150 + Math.cos(a) * r, y - 120 + Math.sin(a) * r, 26, 'rgba(200,230,255,0.9)', w.spout);
    }
  }
}

// ---------------------------------------------------------------- 5 · Here comes trouble

/** @type {Chapter} */
const trouble = {
  id: 'trouble',
  num: 'Chapter V',
  title: 'Here Comes Trouble',
  place: 'The Eclipse',
  icon: '\u{1F963}',
  song: 'boss',
  scene: { world: 'sky', layout: 2, light: 1, path: false, night: 0.45 },
  goal: 24,
  narr: 'top',
  label: 'snacks served',
  hint: 'Tap on the snap (beats 2 and 4) to toss a snack into the bowl.',
  story: ['Then the moon went dark, and something enormous and empty rose.', 'The Great Empty Bowl. It had been waiting since dinner.', 'Toss in a snack on every snap of the drum.'],
  outro: 'It was never angry. It was only hungry. Most villains are.',
  enter(j) {
    const bowl = j.actor('great-bowl', 1700, 900, 360, 61);
    bowl.flip = true;
    j.st = { bowl, bx: 1700, ring: 0, flash: 0, full: false };
    const cats = [j.actor('pudding', 290, 700, 160, 62), j.actor('sriracha', 470, 830, 160, 63), j.actor('granny-purl', 270, 960, 160, 64)];
    cats.forEach((c, i) => (c.seat = ['#F4B7C2', '#F8C99B', '#BFE0F2'][i]));
    j.st.cats = cats;
  },
  onNote(j, m) {
    const st = j.st;
    if (st.full) return;
    if (m.part === 'lead') {
      st.bx = Math.max(860, st.bx - 9);
      bob(st.bowl, 0.6);
    }
    if (m.part === 'drum' && m.kind === 'snare') st.ring = 1;
    if (m.part === 'drum' && m.kind === 'tom' && !j.reduced) j.shake = Math.max(j.shake, 5);
    if (m.part === 'pad' && !j.reduced) st.flash = 0.22;
  },
  tap(j) {
    const st = j.st;
    if (st.full) return;
    const res = j.judge('back');
    const cat = st.cats[Math.floor(Math.random() * st.cats.length)];
    if (!res.score) {
      j.play('reed', j.tone(0, 0), { vel: 0.3, dur: 0.12 });
      j.say('wait for the snap', cat.x + 60, cat.y - 200, '#8A7CC0', 30);
      return;
    }
    bob(cat, 1.5);
    j.play('pluck', j.tone(res.score === 2 ? 2 : 1, 24), { vel: 1 });
    j.say(res.label, cat.x + 40, cat.y - 210, res.score === 2 ? '#E0A100' : '#7A6CC0');
    const T = 0.62;
    const x0 = cat.x + 30;
    const y0 = cat.y - 120;
    const x1 = st.bowl.x - 30;
    const y1 = st.bowl.y - 250;
    const g = 1500;
    j.fx.add({ kind: 'snack', x: x0, y: y0, vx: (x1 - x0) / T, vy: (y1 - y0) / T - 0.5 * g * T, g, life: T, size: 26, spin: 7 });
    j.later(j.now + T, () => {
      /** @type {any} */ (st.bowl.rig).hit();
      st.bx = Math.min(1700, st.bx + 26 * res.score);
      j.fx.add({ kind: 'heart', x: st.bowl.x - 30, y: st.bowl.y - 300, vy: -80, life: 1.2, size: 48, color: '#E07D95' });
      j.gain(res.score);
    });
  },
  onGoal(j) {
    const st = j.st;
    st.full = true;
    /** @type {any} */ (st.bowl.rig).setMode('idle');
    for (let i = 0; i < 12; i++) j.fx.add({ kind: 'heart', x: st.bowl.x + rand(-160, 120), y: st.bowl.y - rand(200, 380), vy: -rand(40, 120), life: 2.2, size: rand(30, 60), color: '#E07D95' });
    for (const c of st.cats) /** @type {any} */ (c.rig).setExpression('celebrate');
  },
  update(j) {
    const st = j.st;
    st.bowl.x += (st.bx - st.bowl.x) * Math.min(1, j.dt * 6);
    st.ring = Math.max(0, st.ring - j.dt * 3);
    st.flash = Math.max(0, st.flash - j.dt);
  },
  back(j, ctx) {
    const st = j.st;
    if (st.ring > 0 && !st.full) {
      ctx.save();
      ctx.globalAlpha = st.ring;
      ctx.strokeStyle = '#FFE27A';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(st.bowl.x - 20, st.bowl.y - 170, 215 + (1 - st.ring) * 50, 195 + (1 - st.ring) * 45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  front(j, ctx) {
    const st = j.st;
    if (st.flash > 0) {
      ctx.fillStyle = `rgba(150,110,230,${st.flash * 0.5})`;
      ctx.fillRect(0, 0, 1920, 1080);
    }
    // Hunger meter over the bowl.
    const k = clamp(j.got / j.goal, 0, 1);
    const x = st.bowl.x - 140;
    const y = st.bowl.y - 400;
    ctx.fillStyle = 'rgba(255,253,246,0.9)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, 240, 30, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#E07D95';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, 232 * k, 22, 11);
    ctx.fill();
    fxText(ctx, st.full ? 'full!' : 'hungry', x + 120, y - 26, 30, INK, 0.9);
  },
};

// ---------------------------------------------------------------- 6 · Finale

const NAPPERS = ['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton', 'maneki-mochi', 'chonkington', 'dr-nip'];
const SEATS = ['#F4B7C2', '#BFE0F2', '#F8D7A8', '#F8C99B', '#C9C2EE', '#D9B98C', '#B9E2C8', '#F6D2E6'];

/** @type {Chapter} */
const finale = {
  id: 'finale',
  num: 'Finale',
  title: 'Everyone Naps',
  place: 'Home, under the fish of light',
  icon: '\u{1F4A4}',
  song: 'title',
  scene: { world: 'countryside', layout: 2, light: 1, path: true, night: 0.9 },
  goal: 8,
  narr: 'mid',
  label: 'cats tucked in',
  hint: 'Tap each cat to tuck it in for the night.',
  story: ['Home again, under the fish of light.', 'One by one, the cats remembered how to nap.'],
  outro: 'The end. (The cats are asleep. Please lower your voice.)',
  enter(j) {
    j.st = { tw: [], moon: 0, cats: [] };
    NAPPERS.forEach((id, i) => {
      const a = j.actor(id, 230 + i * 210, 950 - (i % 2) * 40, 150, 70 + i);
      a.seat = SEATS[i];
      /** @type {any} */ (a.rig).setExpression('happy');
      j.st.cats.push({ a, asleep: false, i });
    });
  },
  onNote(j, m) {
    if (m.part === 'lead' && m.midi) twinkle(j, m.midi, 500);
    if (m.part === 'pad') j.st.moon = 1;
    if (m.part === 'bass') {
      const sleepers = j.st.cats.filter((/** @type {any} */ c) => c.asleep);
      const c = sleepers[Math.floor(Math.random() * sleepers.length)];
      if (c) j.fx.add({ kind: 'z', x: c.a.x + 40, y: c.a.y - 140, vx: 12, vy: -36, life: 2.2, size: 34 });
    }
  },
  tap(j, x, y) {
    const awake = j.st.cats.filter((/** @type {any} */ c) => !c.asleep);
    /** @type {any} */
    let pick = null;
    if (x == null || y == null) pick = awake[0];
    else for (const c of awake) if (Math.abs(c.a.x - x) < 100 && y > c.a.y - 230 && y < c.a.y + 40) pick = c;
    if (!pick) return;
    pick.asleep = true;
    const at = j.play('bell', j.tone(pick.i, 24), { quant: '8', vel: 0.8 });
    j.later(at, () => {
      /** @type {any} */ (pick.a.rig).setExpression('sleepy');
      j.fx.burst(pick.a.x, pick.a.y - 120, '#C9C2EE', 8, 120);
      j.gain();
    });
  },
  update(j) {
    j.st.moon = Math.max(0, j.st.moon - j.dt * 0.8);
  },
  back(j, ctx) {
    moon(ctx, 1640, 160, j.st.moon);
    drawTwinkles(j, ctx);
    drawFish(ctx, FISH.map(() => true), j.time, 1);
  },
};

/** @type {Chapter[]} */
export const CHAPTERS = [overture, meadow, lounge, lanterns, waltz, trouble, finale];
/** Where each chapter sits on the travel map. */
export const MAP_STOPS = [
  { x: 300, y: 800 },
  { x: 560, y: 480 },
  { x: 880, y: 720 },
  { x: 1150, y: 420 },
  { x: 1460, y: 300 },
  { x: 1660, y: 600 },
  { x: 1340, y: 860 },
];
