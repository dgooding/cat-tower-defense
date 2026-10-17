// Sanity checks for the journey's chapters: every chapter has a real song, scene, goal and story. Run: node --test tools/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, MAP_STOPS } from '../../js/journey/chapters.js';
import { SONGS } from '../../js/audio/songs.js';
import { ROOM_ART } from '../../js/art/registry.js';

test('journey: one map stop per chapter, ids unique', () => {
  assert.equal(MAP_STOPS.length, CHAPTERS.length);
  assert.equal(new Set(CHAPTERS.map((c) => c.id)).size, CHAPTERS.length);
});

for (const c of CHAPTERS) {
  test(`journey chapter "${c.id}" is complete`, () => {
    assert.ok(SONGS[c.song], `song ${c.song}`);
    const room = ROOM_ART[c.scene.world]?.room;
    assert.ok(room, `world ${c.scene.world}`);
    assert.ok(room.layouts[c.scene.layout], `layout ${c.scene.layout}`);
    assert.ok(c.goal > 0 && c.label && c.hint && c.title && c.outro);
    assert.ok(c.story.length > 0);
    assert.equal(typeof c.enter, 'function');
    assert.ok(c.tap || c.key, 'a way to play along');
  });
}
