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
  xpBonusPerLevel: 0.1,      // 10% more XP per prestige
  worthBonusPerLevel: 100,   // +100 worth per prestige
  worthCap: 4000,            // Max possible worth after bonuses
  maxPrestige: 10,           // Optional: cap prestige levels
};

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
const SMOKED_EARNINGS_LIMIT = 15000;
const TREASURE_EARNINGS_LIMIT = 10000;
const SMOKED_FISH_MULTIPLIER = 1.5;

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

module.exports = {
  RAW_EARNINGS_LIMIT,
  SMOKED_EARNINGS_LIMIT,
  TREASURE_EARNINGS_LIMIT,
  SMOKED_FISH_MULTIPLIER,
  XP_FORMULA,
  FISH_XP_FORMULA,
  FISH_WORTH_FORMULA,
  PRESTIGE_CONFIG,
  fishData,
  fishingRodData,
  herbList,
  treasureRewards,
};