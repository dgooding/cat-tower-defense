// Tests for the written score: every bar adds up, every note parses, every song compiles. Run: node --test tools/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, WORLD_SONG, barLength, parseBar, parseChord, noteToMidi, midiToHz } from '../../js/audio/songs.js';
import { compile } from '../../js/audio/music.js';
import { LEVELS } from '../../js/data/levels.js';

test('note names map to MIDI and Hz', () => {
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('C#4'), 61);
  assert.equal(noteToMidi('Bb2'), 46);
  assert.equal(Math.round(midiToHz(69)), 440);
  assert.throws(() => noteToMidi('H2'));
});

for (const [id, s] of Object.entries(SONGS)) {
  test(`song "${id}" is well formed`, () => {
    assert.equal(s.melody.length, s.chords.length, 'one melody bar per chord');
    s.melody.forEach((bar, i) => {
      assert.equal(barLength(bar), s.beats * 2, `bar ${i + 1} of ${id} is ${barLength(bar)} eighths`);
      for (const n of parseBar(bar)) {
        const m = n.midi + (s.shift ?? 0);
        assert.ok(m >= 48 && m <= 96, `melody note out of range in ${id} bar ${i + 1}`);
      }
    });
    for (const c of s.chords) {
      const { bass, notes } = parseChord(c);
      assert.ok(bass >= 33 && bass <= 52, `bass ${c}`);
      assert.ok(notes.length >= 3 && notes.every((n) => n > bass), `voicing ${c}`);
    }
    assert.ok(s.bpm >= 60 && s.bpm <= 140);
    if (s.breathe) assert.equal(s.chords.length % 2, 0);
  });

  test(`song "${id}" compiles into a sorted loop`, () => {
    const { evs, steps } = compile(s);
    assert.equal(steps, s.chords.length * s.beats * 2);
    assert.ok(evs.length > s.chords.length * 3);
    for (let i = 1; i < evs.length; i++) assert.ok(evs[i].step >= evs[i - 1].step);
    assert.ok(evs.every((e) => e.step >= 0 && e.step < steps));
    assert.equal(evs.some((e) => e.layer === 1), !!(s.kit || s.arp));
  });
}

test('every world in the level list has a theme', () => {
  for (const l of LEVELS) assert.ok(SONGS[WORLD_SONG[l.world]], `no song for ${l.world}`);
});
