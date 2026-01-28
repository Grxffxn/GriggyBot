const { ButtonStyle } = require('discord.js');

// === CONFIGURABLE FORMULAS ===
const XP_FORMULA = {
  baseXPRequired: 100,
  pondTierMultiplier: 2.7,
};
const FISH_XP_FORMULA = {
  base: { common: 2, uncommon: 4, rare: 8, legendary: 16, mythical: 32 },
  multiplier: 1.7,
};
const FISH_WORTH_FORMULA = {
  base: { common: 100, uncommon: 200, rare: 400, legendary: 800, mythical: 1500 },
  multiplier: 1.6,
  cap: 2500,
};

// === PRESTIGE CONFIG ===
const PRESTIGE_CONFIG = {
  xpBonusPerLevel: 0.1,           // 10% more XP per prestige
  flatWorthBonusPerLevel: 100,    // +100 worth per prestige*
  percentWorthBonusPerLevel: 0.1, // +10% worth per prestige*
  worthCap: 4000,                 // Max possible worth after bonuses
  maxPrestige: 10,                // Optional: cap prestige levels
};
// * NOTE: The worth bonuses are calculated based on whichever is lower: the flat bonus or the percentage bonus.
// This helps prevent the worth from exceeding the cap too quickly, and prevents common fish from becoming too valuable.

// === POND/FISH DEFINITIONS ===
const rarityOrder = ['common', 'uncommon', 'rare', 'legendary', 'mythical'];
const pondNames = [
  "Beginner's Pond",
  "Starfell Shore",
  "Shadow Lagoon",
  "Mystic Waters",
  "Celestial Springs"
];

// Fish names per pond and rarity (edit as needed)
const pondFishNames = [
  // Pond 1
  [
    { name: 'Goldfish', id: 1 },
    { name: 'Trout', id: 2 },
    { name: 'Salmon', id: 3 }
  ],
  // Pond 2
  [
    { name: 'Catfish', id: 4 },
    { name: 'Bass', id: 5 },
    { name: 'Pike', id: 6 }
  ],
  // Pond 3
  [
    { name: 'Shark', id: 7 },
    { name: 'Whale', id: 8 },
    { name: 'Kraken', id: 9 }
  ],
  // Pond 4
  [
    { name: 'Dragonfish', id: 10 },
    { name: 'Leviathan', id: 11 },
    { name: 'Phoenixfish', id: 12 },
    { name: 'Angelfish', id: 13 }
  ],
  // Pond 5
  [
    { name: 'Stardustfish', id: 14 },
    { name: 'Moonlitfish', id: 15 },
    { name: 'Sunblaze', id: 16 },
    { name: 'Cometfish', id: 17 },
    { name: 'Voidfish', id: 18 }
  ]
];

// Fish weights per rarity (edit as needed, must match number of fish per pond)
const pondFishWeights = [
  [75, 20, 5],           // Pond 1
  [75, 20, 5],           // Pond 2
  [75, 20, 5],           // Pond 3
  [74, 20, 5, 1],        // Pond 4
  [70, 19, 7, 3, 1],     // Pond 5
];

// === DYNAMIC GENERATION ===
function getXPRequiredForPond(tier) {
  return Math.round(XP_FORMULA.baseXPRequired * Math.pow(XP_FORMULA.pondTierMultiplier, tier - 1));
}
function getFishXP(rarity, pondTier) {
  return Math.round(FISH_XP_FORMULA.base[rarity] * Math.pow(FISH_XP_FORMULA.multiplier, pondTier - 1));
}
function getFishWorth(rarity, pondTier) {
  return Math.min(
    FISH_WORTH_FORMULA.cap,
    Math.round(FISH_WORTH_FORMULA.base[rarity] * Math.pow(FISH_WORTH_FORMULA.multiplier, pondTier - 1))
  );
}

// Build fishData dynamically
const fishData = {};
for (let pondIdx = 0; pondIdx < pondNames.length; pondIdx++) {
  const pondKey = `pond${pondIdx + 1}`;
  const fishArr = pondFishNames[pondIdx];
  const weights = pondFishWeights[pondIdx];
  const pondFish = {};
  for (let i = 0; i < fishArr.length; i++) {
    // Assign rarity by order (if more fish than rarities, use last rarity)
    const rarity = rarityOrder[i] || rarityOrder[rarityOrder.length - 1];
    pondFish[fishArr[i].name.toLowerCase().replace(/ /g, '')] = {
      name: fishArr[i].name,
      rarity,
      xp: getFishXP(rarity, pondIdx + 1),
      weight: weights[i],
      worth: getFishWorth(rarity, pondIdx + 1),
      id: fishArr[i].id,
    };
  }
  fishData[pondKey] = {
    name: pondNames[pondIdx],
    xpRequired: pondIdx === 0 ? 0 : getXPRequiredForPond(pondIdx + 1),
    fish: pondFish,
  };
}

// === REST OF CONFIG ===
const RAW_EARNINGS_LIMIT = 15000;
const SMOKED_EARNINGS_LIMIT = 35000;
const TREASURE_EARNINGS_LIMIT = 10000;
const SMOKED_FISH_MULTIPLIER = 1.5;
const DEFAULT_SMOKING_TIME_PER_FISH = 900_000 // 15 minutes
const MAX_TOTAL_SMOKING_TIME = 28_800_000; // 8 hours (set to -1 to disable)

const fishingRodData = {
  training_rod: {
    name: 'Training Rod',
    description: 'A basic fishing rod for beginners.',
    catchSpeed: 1,
    hookTime: 1,
    doubleCatchChance: 0,
    cost: 0,
    apiName: 'Training..Rod',
    apiItem: 'fishing_rod',
  },
  quick_rod: {
    name: 'Quick Rod',
    description: 'A fishing rod that catches fish quickly.',
    catchSpeed: 2,
    hookTime: 1,
    doubleCatchChance: 0,
    cost: 5000,
    apiName: 'Quick..Rod',
    apiItem: 'fishing_rod',
  },
  sharp_rod: {
    name: 'Sharp Rod',
    description: 'A fishing rod that keeps fish on the line longer.',
    catchSpeed: 1,
    hookTime: 2,
    doubleCatchChance: 0,
    cost: 5000,
    apiName: 'Sharp..Rod',
    apiItem: 'fishing_rod',
  },
  twin_rod: {
    name: 'Twin Rod',
    description: 'A fishing rod that increases the chance of catching two fish at once.',
    catchSpeed: 1,
    hookTime: 1,
    doubleCatchChance: 0.33,
    cost: 15000,
    apiName: 'Twin..Rod',
    apiItem: 'fishing_rod',
  },
  golden_rod: {
    name: 'Golden Rod',
    description: 'The last fishing rod you will ever need.',
    catchSpeed: 2,
    hookTime: 2,
    doubleCatchChance: 0.5,
    cost: 50000,
    apiName: 'Golden..Rod',
    apiItem: 'gold_ingot',
  }
};

const herbList = [
  { name: 'Rosemary', id: 1, boost: 'doublesmokeroutput', boostValue: 0.2, boostDescription: '20% chance of doubling' },
  { name: 'Thyme', id: 2, boost: 'speed', boostValue: 2, boostDescription: 'Smoker is 2x faster' },
  { name: 'Sage', id: 3, boost: 'xpgain', boostValue: 3, boostDescription: 'Earn 3x the fish\'s XP' },
];

const treasureRewards = {
  money: {
    displayName: 'In-Game Currency',
    emoji: '💰',
    buttonStyle: ButtonStyle.Success,
    command: 'cmi money give {{username}} {{rewardValue}}',
    minValue: 1000,
    maxValue: 2500,
  },
  battlepass: {
    displayName: 'Battlepass XP',
    emoji: '🏅',
    buttonStyle: ButtonStyle.Primary,
    command: 'bpa give points {{username}} {{rewardValue}}',
    minValue: 20,
    maxValue: 100,
  },
  fishxp: {
    displayName: 'Fishing XP',
    emoji: '🐟',
    buttonStyle: ButtonStyle.Secondary,
    command: null,
    minValue: 50,
    maxValue: 250,
  }
};

const randomMessages = {
  'cast': [
    '\n-# "Hope I catch somethin\' worth more than the bait this time."',
    '\n-# "Maybe the fish are just shy. Or maybe they know I\'m hungry."',
    '\n-# "Reckon the fish are laughin\' at me down there... \'Look at this fool!\'"',
    '\n-# "Betcha the fish are havin\' a meetin\' about avoidin\' my hook."',
    '\n-# "This rod\'s seen more naps than fish, but I ain\'t complainin\'."',
    '\n-# "If I don\'t catch somethin\' soon, I might just jump in there and join \'em."',
    '\n-# "I swear, if I catch another boot, I\'m gonna start a shoe store."',
    '\n-# "I ain\'t in a hurry. The fish ain\'t either. Guess we\'re on the same page."',
    '\n-# "Fishin\' teaches ya patience... and how to talk to yourself without feelin\' weird."',
    '\n-# "Surely they won\'t mind if I take a little nap... Zzzzz..."',
  ],
  'hook': [
    '\n-# "Finally, some action on the line!"',
    '\n-# "Reckon this one\'s gonna put up a fight."',
    '\n-# "Well, well, looks like somethin\'s bitin\'!"',
    '\n-# "Got somethin\' on the line! Hope it ain\'t a boot again."',
    '\n-# "This better not be one of \'em prank fish."',
    '\n-# "Alright fishy, it\'s you or me now."',
    '\n-# "Gotcha! Now don\'t go wrigglin\' off the line."',
    '\n-# "Feels like a big\'un... or maybe just a determined little guy."',
    '\n-# "This one\'s got some fight in \'em. I like that."',
    '\n-# "Finally.. Thought the fish were on vacation or somethin\'."',
  ],
  'catch': [
    '\n-# "This one\'s goin straight to the fryin\' pan."',
    '\n-# "Well, ain\'t you a beauty. Betcha the other fish are jealous."',
    '\n-# "Well, look at that. Guess I ain\'t as unlucky as I thought."',
    '\n-# "Guess the fish decided to take pity on me today."',
    '\n-# "Not the biggest fish in the pond, but I\'ll take it."',
    '\n-# "Finally caught somethin\' worth talkin\' about. Maybe."',
    '\n-# "This one\'s goin\' straight to the braggin\' board."',
    '\n-# "Not bad for a day\'s work. Or, well, a day\'s sittin\'."',
    '\n-# "This one\'s got a story to tell... too bad it ain\'t gonna get the chance."',
    '\n-# "Guess the fish decided to stop playin\' hard to get."',
  ],
  'treasure': [
    '\n-# "Hope there\'s no crab hidin\' in here. Got pinched last time and I\'m still sore."',
    '\n-# "A chest? Out here? Either I\'m dreamin\' or the fish are gettin\' generous."',
    '\n-# "Hope this ain\'t one of those chests full of sand. I got enough of that in my boots already."',
    '\n-# "If there\'s a genie in here, I\'m wishin\' for a fish that don\'t wriggle so much."',
    '\n-# "Maybe it\'s pirate loot. Or maybe it\'s just someone\'s lost lunchbox."',
    '\n-# "I ain\'t sayin\' no to free stuff, even if it smells a little fishy."',
  ],
  'herb': [
    '\n-# "Ain\'t this a nice surprise? A little somethin\' to spice up my day."',
    '\n-# "Well, look at that. A little green friend to keep me company."',
    '\n-# "Guess the fish ain\'t the only ones with good taste."',
    '\n-# "This herb might just be the secret ingredient I was lookin\' for."',
    '\n-# "A little herb never hurt nobody. Unless you eat too much, then it gets weird."',
    '\n-# "I reckon this will make my fish taste a whole lot better."',
  ],
  'doubleCatch': [
    '\n-# "Two fish? Now that\'s what I call a good day!"',
    '\n-# "This fishin\' rod\'s finally payin\' off! Two fish in one go!"',
    '\n-# "Guess the fish are feelin\' generous today. Can\'t say I blame \'em."',
    '\n-# "Two fish in one go? I must be doin\' somethin\' right."',
    '\n-# "I ain\'t complainin\'! Double the fish means double the braggin\' rights."',
    '\n-# "Two fish? Now that\'s a catch worth showin\' off!"',
  ],
};

module.exports = {
  RAW_EARNINGS_LIMIT,
  SMOKED_EARNINGS_LIMIT,
  TREASURE_EARNINGS_LIMIT,
  SMOKED_FISH_MULTIPLIER,
  DEFAULT_SMOKING_TIME_PER_FISH,
  MAX_TOTAL_SMOKING_TIME,
  XP_FORMULA,
  FISH_XP_FORMULA,
  FISH_WORTH_FORMULA,
  PRESTIGE_CONFIG,
  fishData,
  fishingRodData,
  herbList,
  treasureRewards,
  randomMessages,
};