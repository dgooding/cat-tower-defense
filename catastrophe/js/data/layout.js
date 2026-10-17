// @ts-check
// Level → room geometry, read at runtime from the art registry (never copied).
import { ROOM_ART } from '../art/registry.js';

/** @param {import('./levels.js').LevelDef} level @returns {import('../art/rooms/common.js').Layout} */
export function getLayout(level) {
  const room = ROOM_ART[level.world]?.room;
  if (!room) throw new Error('Unknown world ' + level.world);
  const layouts = room.layouts;
  return layouts[Math.min(level.layout, layouts.length - 1)];
}

/** @param {import('./levels.js').LevelDef} level */
export function getRoom(level) {
  return ROOM_ART[level.world].room;
}
