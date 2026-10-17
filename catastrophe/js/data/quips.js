// @ts-check
// Short, clean quips (≤70 chars). Cats speak when placed/upgraded/idle; enemies on spawn/defeat.

/** @type {Record<string, string[]>} */
export const QUIPS = {
  // Cats
  pudding: ["I'd like to speak to the cucumber's manager.", 'Hrk… hrk… PTOO!', 'That one had extra fluff in it.', 'I regret nothing. I regret lunch.', 'Bonk is a love language.'],
  'granny-purl': ['Back in my day we fought vacuums uphill. Both ways.', 'Knit one, slow two.', 'Wear a sweater, dear.', 'zzz… I was resting my eyes.', 'Purl two together, then bonk.'],
  'mama-mittens': ['Noodle, I did not raise you to lose to a duck.', 'BEANS! WHAT DID I SAY!', 'Everyone hold paws.', "Don't make me get the spoon.", 'Biscuit, that is not a snack.'],
  sriracha: ['HSSSS. (That means hello.)', 'HSS! HSS! HSSSS!', 'I am small but my rage is large.', 'Hissed at the UI. Felt good.', 'Spicy mode: always.'],
  whiskerton: ['I hold a Dot-orate in Dot.', 'Field research. Obviously.', 'Observe the dot. Respect the dot.', 'Peer review: you are toast.', 'Please hold questions until the end.'],
  'maneki-mochi': ['Every wave is a business opportunity.', 'Accepts tips. Mostly tips.', 'Fortune favors the fluffy.', 'Compound interest is purr-fect.', 'Wave, wave, wave. Profit.'],
  chonkington: ['I am not lazy. I am conserving greatness.', 'Behold: the flop.', 'Third try is the charm.', 'One does not simply jump.', 'Absolute. Unit.'],
  'dr-nip': ['Purely for science. Mostly.', "It's for research purposes. Strictly.", 'Hypothesis: you will vibe.', 'Results are… groovy.', 'Do not lick the flask.'],
  // Kittens
  beans: ['I GOT IT! (does not have it)', 'Mama look!', 'Pounce!'],
  biscuit: ['Is it snack time? It feels like snack time.', 'Rolling in!', 'Oof.'],
  noodle: ['I can fit. I can always fit.', 'Stretchy attack!', 'Wiggle wiggle.'],
  tofu: ['…mew.', '…', '*falls over*'],
  // Enemies
  'cucumber-cadet': ['Reporting for sneaking, sir.', 'Left, right, left…', 'Permission to be scary?', 'Salute!'],
  'sneaky-pickle': ['You saw nothing.', 'Tiptoe, tiptoe.', 'I am a shrub.'],
  vroomba: ['Recalculating…', 'Bonk. Turning left.', 'Apex predator mode.', 'Low battery. High ambition.'],
  'empty-bowl': ['…', '*single tear*', 'Nobody fills me anymore.'],
  spritz: ['Off the counter.', 'Pssht!', 'Consider yourself spritzed.'],
  'cone-of-shame': ["Please don't look at me.", "I can't see my feet.", 'This is fine.'],
  'rubber-duckie': ['Squeak.', 'Squeak?', 'SQUEAK!'],
  'tubby-mcsoak': ['Who wants a bath?', 'Bubbles for everyone!', 'Rub-a-dub-dub.'],
  'snip-snap': ['Clack clack!', 'Snip!', 'Snap!', 'Trim time!'],
  'party-pooper': ['This party is mandatory.', 'Team building!', 'Pop quiz!'],
  monday: ['Per my last email…', 'Did you get my last email?', 'Quick sync?', 'Circling back.'],
  'closed-door': ['*creak*', 'Knock knock.', 'What is behind me? Nobody knows.'],
  'fancy-bed': ['I am premium memory foam!', '$89.99, plus tax.', "Why won't you sleep in me?"],
  'lint-roller': ['Mmm, fluff.', 'Sticky situation.', 'So much fur. So little time.'],
  carrier: ['(ominous cello)', 'Next stop: the vet.', 'Just a quick checkup…'],
  'hose-snek': ['Ssspray time.', 'Hossssse.', 'Water you doing?'],
  'umbrella-uncles': ['Looks like rain, old chap.', 'Splendid weather.', 'Brolly up!'],
  thunderclap: ['BOOM.', 'Rumble rumble.', 'Forecast: grumpy.'],
  'overdue-bill': ['Final notice!', 'Thought you could ignore me?', 'Payment due upon receipt.'],
  'good-boy': ['FRIEND? FRIEND!! FRIEND!!!', 'Ball? BALL!', 'Who is a good boy? ME!', 'Belly rubs, please.'],
  // Bosses
  cucumberto: ['I vant to… be a pickle.', 'Brine for centuries!', 'Into ze jar!', 'Bleh. Bleh!'],
  sucktator: ['ALL WILL BE TIDY.', 'SUCK MODE: ENGAGED.', 'Do not touch my cord.', 'OVERHEATING. OH NO.'],
  bathzilla: ['BATH. TIME.', 'Rubber duckie, you are the one!', 'Drain… pulling… me…'],
  'great-bowl': ['Dinner… is… late.', 'Diet food. Forever.', 'It is 4 AM. Feed me.', 'The bowl… is… FULL?'],
};

export const VICTORY_LINES = [
  'The cats will now nap for 14 hours to recover.',
  'Snack Stash secured. Synergy achieved.',
];
export const DEFEAT_LINES = [
  "They will remember this. (They won't. They'll want treats in 5 minutes.)",
];
export const TIPS = [
  'Tip: Cats cannot be bribed. Except with treats.',
  'Tip: The Fancy Bed costs $89.99. The cats prefer the box it came in.',
  'Tip: Press ` if your manager walks by. We won\'t tell.',
  'Tip: Call waves early for bonus treats.',
  'Tip: Lasers pierce the Cone of Shame. Science!',
  'Tip: Maneki Mochi reveals sneaky pickles without the screaming.',
];

/** @param {string} id @param {number} k @returns {string} */
export function quip(id, k) {
  const list = QUIPS[id];
  if (!list || !list.length) return '';
  return list[Math.abs(Math.floor(k)) % list.length];
}
