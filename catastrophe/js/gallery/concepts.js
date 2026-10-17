// @ts-check
// Concept sheet for every character and room. Cards render from this list;
// `round` says which design round draws the art (D0 = ready now).

/**
 * @typedef {Object} Concept
 * @property {string} id @property {string} name @property {string} [title]
 * @property {string} icon emoji placeholder until the art exists
 * @property {string} role @property {string} look @property {string} bio @property {string} quip
 * @property {'D0'|'D1'|'D2'|'D3'} round
 * @property {string[]} [swatches]
 */

/** @type {Concept[]} */
export const CATS = [
  { id: 'pudding', name: 'Pudding', title: 'Hairball Hurler', icon: '🍮', role: 'Reliable single-target damage', look: 'Round orange tabby, permanent blep, green-gold eyes.', bio: 'Has never once closed his mouth all the way. Coughs with the dramatic timing of a stage actor.', quip: "I'd like to speak to the cucumber's manager.", round: 'D0', swatches: ['#F2A65A', '#FFD6A3', '#C9692E', '#FFF1DA', '#97C455'] },
  { id: 'whiskerton', name: 'Professor Whiskerton', title: 'Laser Pointer', icon: '🔴', role: 'Piercing beam that ramps up damage', look: 'Slim Siamese, tiny mortarboard, monocle, chalk-dusted paws.', bio: 'Holds a doctorate in Dot. Occasionally chases his own laser, then claims it was field research.', quip: 'I hold a Dot-orate in Dot.', round: 'D1' },
  { id: 'granny-purl', name: 'Granny Purl', title: 'Yarn Slow', icon: '🧶', role: 'Slows enemies with yarn webs', look: 'Very fluffy grey elder, round spectacles, knitting needles, rocking cushion.', bio: 'Knits at 400 stitches per minute. Dozes off mid-row. Snores in tiny lowercase z’s.', quip: 'Back in my day we fought vacuums uphill. Both ways.', round: 'D1' },
  { id: 'mama-mittens', name: 'Mama Mittens', title: 'Kitten Barracks', icon: '🥄', role: 'Sends kittens to block the path', look: 'Tuxedo cat in a gingham apron, wooden spoon held high.', bio: 'Runs a tight ship. Knows exactly which kitten did it.', quip: 'Noodle, I did not raise you to lose to a duck.', round: 'D1' },
  { id: 'dr-nip', name: 'Dr. Nip', title: 'Catnip Alchemist', icon: '⚗️', role: 'Area clouds that make enemies "vibe" backwards', look: 'Black cat, brass goggles, lab coat, a little flask necklace, enormous pupils.', bio: 'Every experiment is “purely for science”. The lab smells suspiciously wonderful.', quip: 'Purely for science. Mostly.', round: 'D1' },
  { id: 'chonkington', name: 'Lord Chonkington III', title: 'Belly Flop', icon: '👑', role: 'Slow, huge area stun', look: 'Enormous blue-grey shorthair, tiny crown, velvet cushion, magnificent jowls.', bio: 'Takes three attempts to jump. When he lands, the earth remembers.', quip: 'I am not lazy. I am conserving greatness.', round: 'D1' },
  { id: 'sriracha', name: 'Sriracha', title: 'Hiss', icon: '🌶️', role: 'Rapid short-range armor shredder', look: 'Tiny black kitten, tail permanently poofed, furious little eyebrows.', bio: 'Hisses at enemies, allies, her own tail and the user interface. Very small. Very angry.', quip: 'HSSSS. (That means hello.)', round: 'D1' },
  { id: 'maneki-mochi', name: 'Maneki Mochi', title: 'Lucky Cat', icon: '🪙', role: 'Earns treats, buffs neighbors, reveals sneaky enemies', look: 'Calico with a gold coin, red collar bell, a paw that never stops waving.', bio: 'The paw waves even while asleep. Accepts tips. Also compliments. Mostly tips.', quip: 'Every wave is a business opportunity.', round: 'D1' },
];

/** @type {Concept[]} */
export const KITTENS = [
  { id: 'beans', name: 'Beans', icon: '🫘', role: 'Kitten (blocker)', look: 'Tiny tuxedo with mismatched socks.', bio: 'Always first into trouble.', quip: 'I GOT IT! (does not have it)', round: 'D1' },
  { id: 'biscuit', name: 'Biscuit', icon: '🍪', role: 'Kitten (blocker)', look: 'Cream kitten, extremely round.', bio: 'Rolls more than walks.', quip: 'Is it snack time? It feels like snack time.', round: 'D1' },
  { id: 'noodle', name: 'Noodle', icon: '🍜', role: 'Kitten (blocker)', look: 'Long, wiggly grey tabby kitten.', bio: 'Somehow longer every time you look.', quip: 'I can fit. I can always fit.', round: 'D1' },
  { id: 'tofu', name: 'Tofu', icon: '🧈', role: 'Kitten (joins at tier 3)', look: 'Fluffy white kitten with one black ear.', bio: 'Silent. Watchful. Falls over a lot.', quip: '…mew.', round: 'D1' },
];

/** @type {Concept[]} */
export const ENEMIES = [
  { id: 'cucumber-cadet', name: 'Cucumber Cadet', icon: '🥒', role: 'Grunt', look: 'Shifty side-eye, tiny legs, salutes on defeat.', bio: 'Appears silently behind you. That is the entire strategy.', quip: 'Reporting for sneaking, sir.', round: 'D2' },
  { id: 'sneaky-pickle', name: 'Sneaky Pickle', icon: '🫙', role: 'Stealth', look: 'Wrinkly pickle in a tiny trench coat.', bio: 'Invisible until close. Startles nearby cats when revealed.', quip: 'You saw nothing.', round: 'D2' },
  { id: 'vroomba', name: 'Vroomba', icon: '🤖', role: 'Fast + armored', look: 'Round robot vacuum with an LED face and a single antenna.', bio: 'Model V-9. Firmware outdated. Believes it is the apex predator.', quip: 'Recalculating…', round: 'D2' },
  { id: 'empty-bowl', name: 'The Empty Bowl', icon: '🥣', role: 'Despair aura (slows cat attacks)', look: 'Dry food bowl with one perfect tear.', bio: 'Nearby cats become too sad to function.', quip: '…', round: 'D2' },
  { id: 'spritz', name: 'Spritz', icon: '💦', role: 'Disabler (makes cats wet)', look: 'Smug spray bottle with a trigger-finger grin.', bio: 'Has never lost an argument with a cat on a counter.', quip: 'Off the counter.', round: 'D2' },
  { id: 'cone-of-shame', name: 'Cone of Shame', icon: '📯', role: 'Front shield', look: 'Walking lampshade collar, deeply embarrassed.', bio: 'Blocks attacks from the front. Cannot see its own feet.', quip: "Please don't look at me.", round: 'D2' },
  { id: 'rubber-duckie', name: 'Rubber Duckie', icon: '🦆', role: 'Swarm', look: 'Bright yellow, comes in dozens, squeaks when bonked.', bio: 'Individually harmless. Collectively, a problem.', quip: 'Squeak.', round: 'D2' },
  { id: 'tubby-mcsoak', name: 'Tubby McSoak', icon: '🛁', role: 'Tank, splits into duckies', look: 'Clawfoot bathtub in a shower cap, full of bubbles.', bio: 'Bath time is coming. Bath time is always coming.', quip: 'Who wants a bath?', round: 'D2' },
  { id: 'snip-snap', name: 'Snip & Snap', icon: '✂️', role: 'Fast pair, one enrages', look: 'Twin nail clippers with clacking mouths.', bio: 'Finish each other’s… clips.', quip: 'Clack clack!', round: 'D2' },
  { id: 'party-pooper', name: 'Party Pooper', icon: '🎈', role: 'Flier', look: 'Shiny balloon with a bored face, string dangling.', bio: 'Floats over kitten blockers. Pops into confetti.', quip: 'This party is mandatory.', round: 'D2' },
  { id: 'monday', name: 'Monday', icon: '⏰', role: 'Speeds up nearby enemies', look: 'Twin-bell alarm clock with dark eye bags.', bio: 'Nobody invited Monday. Monday came anyway.', quip: 'Per my last email…', round: 'D2' },
  { id: 'closed-door', name: 'The Closed Door', icon: '🚪', role: 'Taunt: cats must attack it', look: 'Walking door with a brass knob nose.', bio: 'What is on the other side? The cats MUST know.', quip: '*creak*', round: 'D2' },
  { id: 'fancy-bed', name: 'Fancy Cat Bed ($89.99)', icon: '🛏️', role: 'Ignored by most cats', look: 'Plush designer bed with the price tag still on.', bio: 'The cats refuse to acknowledge it. They prefer the box it came in.', quip: 'I am premium memory foam!', round: 'D2' },
  { id: 'lint-roller', name: 'Lint Roller', icon: '🧻', role: 'Shields allies with stolen fur', look: 'Sticky roller that gets furrier as it goes.', bio: 'Collects fur. Turns it into armor. Rude.', quip: 'Mmm, fluff.', round: 'D2' },
  { id: 'carrier', name: 'The Carrier', icon: '🧳', role: 'Armored, releases enemies when broken', look: 'Plastic travel carrier with an ominous grille.', bio: 'Means only one thing: the vet.', quip: '(ominous cello)', round: 'D2' },
  { id: 'hose-snek', name: 'Garden Hose Snek', icon: '🐍', role: 'Long body, sprays a line of cats', look: 'Coiled green hose with a nozzle head and googly eyes.', bio: 'Grandpa left it on again.', quip: 'Sssspray.', round: 'D2' },
  { id: 'umbrella-uncles', name: 'Umbrella Uncles', icon: '☂️', role: 'Blocks lobbed attacks', look: 'Pair of polite umbrellas in bow ties.', bio: 'Very proper. Always prepared for weather.', quip: 'Looks like rain, old chap.', round: 'D2' },
  { id: 'thunderclap', name: 'Thunderclap', icon: '⛈️', role: 'Flier, scares cats into hiding', look: 'Grumpy storm cloud with a zigzag mouth.', bio: 'BOOM. That is all it says.', quip: 'BOOM.', round: 'D2' },
  { id: 'overdue-bill', name: 'Overdue Bill', icon: '✉️', role: 'Steals treats if it gets through', look: 'Red envelope with a FINAL NOTICE stamp, tiny briefcase.', bio: 'Thought you could ignore it?', quip: 'Final notice!', round: 'D2' },
  { id: 'good-boy', name: 'Good Boy', icon: '🐕', role: 'Friendly: flops for belly rubs instead of losing', look: 'Fluffy golden retriever with a tennis ball and pure joy.', bio: 'Just wants to play. The cats are profoundly annoyed.', quip: 'FRIEND? FRIEND!! FRIEND!!!', round: 'D2' },
    { id: 'cucumber-ghost', name: 'Cucumber in a Sheet', icon: '👻', role: 'Seasonal stealth (The Haunted Hayride)', look: 'A cucumber under a bedsheet with lopsided eye holes, floating, holding a tiny pumpkin pail.', bio: 'Raided the linen closet for Halloween. Nobody has the heart to tell it.', quip: 'Boo? …Boo!', round: 'D2' },
  ];

/** @type {Concept[]} */
export const BOSSES = [
  { id: 'cucumberto', name: 'Count Cucumberto', title: 'the Pickled One', icon: '🧛', role: 'World 1 boss: summons pickles, hides in a jar', look: 'Tall vampire cucumber, high-collared cape, tiny fangs.', bio: 'Has been brining for centuries.', quip: 'I vant to… be a pickle.', round: 'D2' },
  { id: 'sucktator', name: 'The Sucktator 9000', icon: '🌪️', role: 'World 2 boss: inhales projectiles and kittens', look: 'Upright vacuum with a monobrow and a cord tail.', bio: 'Obsessed with cleanliness. Fears being unplugged.', quip: 'ALL WILL BE TIDY.', round: 'D2' },
  { id: 'bathzilla', name: 'Bathzilla', icon: '🦖', role: 'World 3 boss: shower sprays, duck armadas, drain phase', look: 'Kaiju-sized bathtub wading through the river, showerhead horn.', bio: 'Rose from the deep end.', quip: 'BATH. TIME.', round: 'D2' },
  { id: 'great-bowl', name: 'The Great Empty Bowl', icon: '🌑', role: 'Final boss: three phases of hunger', look: 'Cosmic bowl eclipsing the moon, stars in its rim.', bio: 'The source of all despair. Also, maybe, just hungry.', quip: 'Dinner… is… late.', round: 'D2' },
];

/** @type {Concept[]} */
export const ROOMS = [
  { id: 'countryside', name: 'Sunbeam Countryside', icon: '🌾', role: 'World 1 · Morning Zoomies Meadow · Grandpa’s Cucumber Patch · Shrine Steps at Sunset', look: 'Rice paddies, one giant old tree, cumulus clouds, a small stone shrine, dragonflies, fireflies at dusk.', bio: 'Warm greens and golds. Lighting drifts from morning to golden hour across the waves.', quip: 'A perfect day for a nap. Or a war.', round: 'D3', swatches: ['#BFE3F2', '#FFF8EC', '#8DBF6A', '#5E9A4E', '#E8D2A6', '#D9573B', '#F2C14E'] },
  { id: 'house', name: "Grandma's Cozy House", icon: '🍵', role: 'World 2 · Tatami Tango · Kotatsu Kingdom · Laundry Day Mountain', look: 'Tatami floors, sliding paper screens, a heated table with a blanket, steaming tea, dust motes in sunbeams.', bio: 'Warm woods and creams. Screens slide to change the route.', quip: 'Wipe your paws.', round: 'D3', swatches: ['#D8C38E', '#A0764F', '#F6EEDC', '#FBF7EE', '#9DB58A'] },
  { id: 'bathhouse', name: 'Rainy Bathhouse Town', icon: '🏮', role: 'World 3 · Lantern Alley in the Rain · Steam Bridge Crossing · The Grand Bathhouse', look: 'Lantern-lit alleys in the rain, steam, a stone bridge over a lily-pad river, cloth door curtains.', bio: 'Teal night, vermillion and lantern gold. Rain makes water enemies stronger.', quip: 'Cats. Hate. Rain.', round: 'D3', swatches: ['#24505E', '#6F9AAE', '#F29E4C', '#D2483C', '#E9F1F2'] },
  { id: 'sky', name: 'Moonlit Sky Islands', icon: '🌙', role: 'World 4 · Cloud Whale Crossing · Rooftop Moon Garden · Eclipse of the Empty Bowl', look: 'Floating islands, a gentle giant cloud whale, a huge moon, blinking constellations.', bio: 'Indigo, lavender and silver. The path rides on the whale’s back.', quip: 'Do not look down. Okay, look a little.', round: 'D3', swatches: ['#262A5C', '#8C84C9', '#FFF4CF', '#C9D3E8', '#FFE58A'] },
];
