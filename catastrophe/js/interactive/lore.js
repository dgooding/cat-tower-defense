// @ts-check
// Interactive-Mode-only writing: counter tips, briefing jokes, hero flavor and world blurbs.

/** Which cat beats which enemy (and vice versa). */
export const COUNTER_TIPS = {
  // cats → what they're good against
  pudding: 'Great vs. Cucumber Cadets and anything that walks in a tidy line. Umbrella Uncles block his lobs.',
  whiskerton: 'Lasers pierce the Cone of Shame and reach fliers. The ramp-up loves big slow tanks.',
  'granny-purl': 'Yarn slows Vroombas, Overdue Bills and both clipper twins. Pair her with a heavy hitter.',
  'mama-mittens': 'Kittens block walkers on the path. Fliers just float over them. Rude.',
  'dr-nip': 'Catnip clouds melt Rubber Duckie swarms and anything that bunches up.',
  chonkington: 'The only cat who will touch the Fancy Cat Bed. Huge area stun. Takes three tries.',
  sriracha: 'Shreds armor on Vroombas, Carriers and Tubby McSoak. Small. Furious. Effective.',
  'maneki-mochi': 'Reveals Sneaky Pickles and earns treats. Shrine Spirit keeps neighbors dry vs. Spritz.',
  // kittens
  beans: 'Blocks the path with enthusiasm, if not accuracy.',
  biscuit: 'Rolls into enemies. Counts as blocking. Counts as a snack break.',
  noodle: 'Long enough to block two lanes. Nobody knows how.',
  tofu: 'Joins at tier 3. Falls over in the way, which is technically a strategy.',
  // heroes
  'ronin-biscuit': 'Parks a cardboard Box Fort on the path. Every enemy stops to stare at it.',
  nebula: 'Gravity Nap freezes a whole cluster. Her Stargazer passive stretches nearby cats’ range.',
  'big-tom': 'Taunts the crowd so the towers can work. Day-Old Sushi dries Wet cats.',
  // enemies → who beats them
  'cucumber-cadet': 'Anyone. Pudding usually bonks them mid-salute.',
  'sneaky-pickle': 'Maneki Mochi reveals pickles without the screaming.',
  vroomba: 'Sriracha shreds the armor; Granny Purl slows the zoom.',
  'empty-bowl': 'Bonk it from far away: Chonkington or Pudding outside the sad radius.',
  spritz: 'Mochi’s Shrine Spirit makes nearby cats Wet-immune. Big Tom dries the rest.',
  'cone-of-shame': 'Lasers pierce the cone. Whiskerton, please.',
  'rubber-duckie': 'Dr. Nip’s catnip clouds. Squeak, squeak, gone.',
  'tubby-mcsoak': 'Sriracha shreds the tub; save a cloud for the six duckies inside.',
  'snip-snap': 'Slow both with Granny Purl’s yarn so neither gets to enrage.',
  'party-pooper': 'Fliers ignore kittens. Lasers and hairballs pop them just fine.',
  monday: 'Take Monday out first, or everyone speeds up. Relatable.',
  'closed-door': 'It taunts every cat nearby. Chonkington doesn’t mind; he was going to sit there anyway.',
  'fancy-bed': 'Only Chonkington, kittens and Cat Powers will touch it. Everyone else refuses on principle.',
  'lint-roller': 'Don’t feed it hairballs. Lasers and catnip ignore the fluff.',
  carrier: 'Sriracha shreds the armor. Keep a cloud ready for the three cadets inside.',
  'hose-snek': 'Spread your cats out and let Mochi’s shrine keep them dry.',
  'umbrella-uncles': 'Umbrellas block lobs. Use lasers, hisses or yarn instead.',
  thunderclap: 'A flier that spooks cats. Whiskerton’s laser reaches up and says hello.',
  'overdue-bill': 'Fast. Slow it down with yarn before the due date.',
  'good-boy': 'Don’t fight him. Pet him. Any cat will do; he just wants attention.',
  cucumberto: 'Slow him with yarn, then bonk with everything. Watch out for the jar.',
  sucktator: 'It inhales lobs and kittens. Lasers and hisses can’t be sucked up.',
  bathzilla: 'Bring Wet-immunity and something for the duck armada. Then pull the plug.',
  'great-bowl': 'Everything works. Mostly it needs a full team. And dinner.',
};

/** Hero style labels. */
export const STYLE_LABEL = { melee: '⚔️ Melee duelist', ranged: '✨ Ranged mage', tank: '🛡️ Tank / support' };

/** Short narrator one-liners for the briefing sticky note. */
export const BRIEFING_NOTES = [
  'The Narrator has reviewed the threat. The Narrator would like a nap.',
  'Remember: cats work best when nobody is watching. So, watch carefully.',
  'This briefing could have been an email. It is now a polaroid.',
  'Snack Stash status: currently stashed. Let’s keep it that way.',
  'Per the Narrator’s last email, please defend the snacks.',
  'Morale is high. Attention spans are low. Proceed.',
];

/** World labels for the map and briefing. */
export const WORLD_INFO = {
  countryside: { icon: '🌾', tag: 'Rice paddies, a giant tree, suspicious cucumbers.' },
  house: { icon: '🍵', tag: 'Tatami, tea, and a kotatsu with its own gravity.' },
  bathhouse: { icon: '🏮', tag: 'Lanterns in the rain. Cats indoors, ideally.' },
  sky: { icon: '🌙', tag: 'Floating islands, one large whale, one larger bowl.' },
};

/** Cute "not enough paw prints" lines. %n = paw prints short. */
export const POOR_LINES = [
  'Pudding checked under the couch. Still %n 🐾 short.',
  'Maneki Mochi ran the numbers: you need %n more 🐾. He accepts tips.',
  'Granny Purl says save up, dear. Only %n 🐾 to go.',
  'The hat budget is %n 🐾 short. Synergy not achieved.',
];
