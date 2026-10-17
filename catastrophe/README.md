# Catastrophe! — The Great Snack Defense

A cozy, silly cat tower defense game. All art and sound are drawn/synthesized in code — no image or audio files, no build step, no dependencies.

## Status: complete — Quick Play + Interactive Mode

Live at <https://cat-tower-defense.com/catastrophe/>.

| Page | What it is |
|---|---|
| `index.html` | Hub page with a live Pudding, an upper-right **KatNip** quick-play button, **▶ Play**, **🗺 Interactive Mode** and **✨ New Feature Page** buttons |
| `play.html` | The game (Quick Play) |
| `interactive.html` | Interactive Mode: storybook, world map, briefings, heroes, challenges, Cat-alog, Wardrobe, Cat-chievements, credits |
| `journey.html` | The Snack Symphony: an interactive musical journey through the worlds, driven by the score |
| `gallery.html` | Design Gallery: review cats, enemies, bosses and rooms with 👍/✏️ + notes, then **📋 Copy all feedback** |
| `dev/sheet.html` | Dev contact sheet of every expression and upgrade look |

Gallery presets are shareable, e.g. `gallery.html?expr=wet&tier=4A&bg=night`.

## ▶ Quick Play (`play.html`)

Open `play.html` (or click **▶ Play** on the hub), click **PLAY**, pick a level, and defend the Snack Stash.

| Route | Screen |
|---|---|
| `play.html#/` | Title (live napping-cat diorama) |
| `play.html#/play` | Level grid: 12 levels (4 worlds × 3) + Endless, stars and locks |
| `play.html#/play/1-1` | A level (`1-1` … `4-3`) |
| `play.html#/play/endless` | Endless (unlocks after 1-1; local high score) |

**How to play:** the first visit to 1-1 is a **guided level**: a sticky note walks you through it in five steps, and a pulsing 🐾 marks a good spot (`js/ui/coach.js`, stored as `seen['tutorial:place']`; "Skip tutorial" ends it). Pick a cat from the **tray** at the bottom (click it, drag it, or press its number), then click **anywhere off the path** to seat it. Placement is free, like Bloons: a ghost cat shows its range ring in green (OK) or red with the reason (on the path, too close to the Snack Stash or another cat, behind the buttons, a sock is lying there). Each cat has a job, so position matters: slows at the bends, lasers down long straights, belly flops where the path doubles back, Maneki Mochi safe at the back. Hold `Shift` to keep seating the same cat. Each level has a **cat limit** (🐱 on the HUD: 8 on 1-1, up to 12 later; Nap Time 4; Endless 16), so choose what each seat is for. Click a seated cat to upgrade it (T1 → T2 → T3 → choose 4A or 4B), change its targeting, **↔ Move** it (free between waves, when the field is clear) or sell it (70% refund). Cats sit on a cushion; in the bathhouse it's on a little wooden deck, and in the sky world it's on a little cloud. Waves start 15 s after your first cat, or press **GO!**. **Call Early!** pays bonus treats. Kills give treats, leaks eat snacks (🍙). Stars: 3 for ≥18 snacks left, 2 for ≥10, else 1.

**Keys:** `1–8` pick up a cat (arrows nudge it, `Shift` = bigger steps, `Enter` seats it) · `Tab` next seated cat · `U` upgrade · `G` move · `S` sell · `Q` Zoomies · `W` Knock It Off The Table (drops at the cursor) · `E` 3 AM Yowl · `Space` pause · `F` speed 1×/2×/3× · `M` mute · `Esc` cancel/close/pause (right-click also cancels) · `` ` `` **Boss Key** (or the 👔 button): instant fake spreadsheet, paused and muted; press again to come back.

Progress lives in `localStorage` (`cata:save:v1`); an in-progress run autosaves at every wave boundary (`cata:run:v1`) and resumes when you reopen the level. The tab auto-pauses when it loses focus.

**Debug flags:** `?debug=1` (red error box, FPS, data/art self-check) · `?autoplay=1` (greedy bot builds and upgrades at 3×, for screenshots), e.g. `play.html?autoplay=1&debug=1#/play/1-1`.

**Level gimmicks:** 2-1 the shoji screens slide every 3 waves (only one route is open; a warning appears the wave before) · 2-2 enemies under the kotatsu quilt are hidden from cats · 2-3 a sock lands on the floor each wave (no seating on it; a cat it lands on naps at half speed) · 3-1 rain makes Spritz tougher, squirt more often and soak longer. **Endless** rolls a Cat Mood every 10 waves (Hangry, 3 AM Energy, Sunbeam, Bath Day, Mondays).

**Interactive Mode hooks** (used by `interactive.html`): `play.html?mode=interactive&hero=<ronin-biscuit|nebula|big-tom>&challenge=<iron|nap>#/play/1-1`. The hero spawns near the stash. Click it (or press `H`), then click the ground to walk there. It auto-attacks; `Z`/`X` (or the HUD buttons) use its abilities. It levels up to 10 and naps for 15 s when downed. Iron Cat = 1 snack and no Cat Powers; Nap Time = at most 4 cats. Results then offer **🗺 Back to Map** and record challenge stars. Equipped Wardrobe hats are worn by tower cats and the hero. Achievement counters are batched and flushed at wave and level boundaries; unlocks show a 🏆 toast.

**Settings** (title ⚙ button, pause menu, or `#/settings`): volume, music volume, mute, reduced motion, screen shake, colorblind status icons, reset progress.

**Music** is composed in code too (`js/audio/songs.js` is the score, `js/audio/music.js` plays it): a music-box lullaby on menus, a theme per world (porch guitar, kotatsu lounge, bathhouse koto, sky waltz) and a villain theme whenever a boss is on the field. Drums and arpeggios fade in during waves and out between them; pausing ducks the music. It is silent until the first click, stays under the sound effects, and goes quiet with mute, a hidden tab or the Boss Key. In Interactive Mode it only plays after you turn sound on (🔇 button). With `?debug=1`, `__cata.music()` shows what's playing.

**The Snack Symphony** (`journey.html`, `js/journey/`): an interactive musical journey in seven chapters (overture, meadow, kotatsu lounge, lantern alley, cloud whale waltz, the Great Empty Bowl, finale). Each chapter has a world, a song, narration lines on 4-bar phrases, and one way to play along. You wake a star constellation, plant flowers and bonk marching cucumbers on the beat, echo Mama's teacup tunes, catch flickering lanterns, ride a cloud to catch the melody's stars, toss snacks on the snare, and tuck the cats in. A parchment travel map connects the chapters. Everything runs on the audio clock: `Engine.onNote` reports every note the score plays (part, pitch, bar, step) and visuals fire as it's heard. Player taps snap to the next eighth and pick notes from the chord that's playing (`J.play`, `J.tone`, `J.toneY`). Rhythm taps are judged against the beat (`J.judge`). Progress is saved in `cata:journey:v1`, with chapter select on return. Controls: tap/click, Space, 1-4 for teacups, Esc pauses. Hidden tabs pause. Debug: `journey.html?debug=1` exposes `__journey` (`startTravel(i)` jumps to a chapter).

**On phones:** when the stage gets small, `Game.layout` adds `body.phone` and a HUD scale `--hz`, so buttons stay finger-sized (about 44 CSS px). Powers stack on the left edge, speed/pause/mute on the right, and the cat tray fills the bottom strip. On touch, the first tap shows the ghost (range, OK or not), and tapping the ghost seats the cat. When you drag a cat from the tray, the ghost floats above your fingertip. Starting a level from the menus goes full screen with landscape lock where the browser allows it (Android). **Offline / installable:** `sw.js` (scope: this folder only) precaches every versioned file after the first visit and keeps the Latin font files. Pages load network-first, so updates still arrive. "Add to Home Screen" gives an app icon and full screen. The service worker is skipped on localhost unless you add `?sw=1`.

**Checks (Node only, no installs):**

```
node --test tools/tests     # simulation + score unit tests
node tools/bot.mjs          # headless greedy bot plays all 12 levels (+ a zero-cat run)
node tools/bot.mjs --hero=all            # …again with each hero
node tools/bot.mjs --challenge=nap 1-1   # challenges
node tools/bot.mjs --free                # bot picks its own best spots anywhere (smart free placement)
node tools/stamp.mjs --check             # cache-busting stamps up to date (run without --check before publishing)
```

Gameplay code: `js/sim/` (pure deterministic 60 Hz simulation, no DOM: sim.js, extras.js for gimmicks/moods/hero, geometry.js, autobot.js) · `js/data/` (ids, cats, enemies, levels, waves, quips, layout lookup) · `js/game/` (game loop, Canvas2D renderer, sprite-cached rigs, effects, HUD icons) · `js/ui/` (routes, title/grid, HUD/menus/overlays, Boss Key, saves, debug) · `js/audio/` (sfx.js tiny Web Audio synth, music.js + songs.js procedural score). Level geometry is read at runtime from `ROOM_ART[world].room.layouts[i]`.

## Preview locally

ES modules don't run from `file://`, so use the zero-dependency server (Node is the only requirement):

```
node tools/serve.mjs
```

Then open <http://localhost:5173/>.

## Publish

Copy this whole `catastrophe/` folder into the repo your static host serves, commit, and push. **First run `node tools/stamp.mjs`** (`--check` only verifies): it writes an import map into each page that loads every module as `file.js?v=<content hash>`, stamps stylesheets and entry scripts the same way, and regenerates the offline precache list in `sw.js`. Returning visitors then re-download only the files that changed and never mix old and new modules, with no build step. All paths are relative, so it works at any URL. It is published in `dgooding/cat-tower-defense` (branch `main`) at `/catastrophe/`; Porkbun Static Hosting deploys every push.

## Layout

```
index.html · play.html · interactive.html · gallery.html · favicon.svg · jsconfig.json
css/          tokens.css (design tokens) · game.css · interactive.css · gallery.css
js/core/      rng.js (hash noise, seeded RNG) · spline.js
js/anim/      rig.js (springs, blink, twitch, look-at)
js/art/       registry.js (single source of truth) · palette.js · brush.js · props.js · hats.js · fallbacks.js
js/art/cats/      catrig.js (shared cat rig + expressions) · 8 cats · 4 kittens
js/art/enemies/   enemyrig.js · 20 enemies
js/art/bosses/    4 bosses
js/art/heroes/    3 heroes
js/art/rooms/     common.js · countryside · house · bathhouse · sky
js/audio/     meow.js · sfx.js (Web Audio synth) · songs.js (the score) · music.js (score player + director, onNote hook)
js/journey/   main.js (clock, input, travel map, HUD) · chapters.js (7 chapters) · kit.js (particles, glows, backdrops, actors)
js/data/      ids, cats, enemies, levels, waves, quips, moods, heroes, achievements, layout
js/sim/       sim.js · extras.js · geometry.js · autobot.js (pure, deterministic)
js/game/      game.js · renderer.js · fx.js · icons.js
js/ui/        main, screens, hud, settings, save, stats, bosskey, debug
js/interactive/   main, store, stage, ui, routes/, story/, tools/
js/gallery/   gallery.js · concepts.js · feedback.js
dev/          sheet.html
tools/        serve.mjs · bot.mjs · leaks.mjs · tests/
```
