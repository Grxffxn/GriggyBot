const { ButtonStyle } = require('discord.js');
// DISCORD LIMITS A LOT OF THINGS TO 25 ENTRIES

const RAW_EARNINGS_LIMIT = 15000; // MAXIMUM RAW FISH MARKET MONEY EARNED PER DAY
const SMOKED_EARNINGS_LIMIT = 15000; // MAXIMUM SMOKED FISH MARKET MONEY EARNED PER DAY
const TREASURE_EARNINGS_LIMIT = 10000; // MAXIMUM TREASURE MONEY EARNED PER DAY

// KEEP # OF POND TYPES, # OF FISH TYPES, # OF RODS, AND # OF HERBS TO 25 OR LESS
const fishData = {
  pond1: {
    name: "Beginner's Pond",
    xpRequired: 0,
    fish: {
      goldfish: { name: 'Goldfish', rarity: 'common', xp: 2, weight: 5, worth: 100, id: 1 },
      trout: { name: 'Trout', rarity: 'uncommon', xp: 5, weight: 3, worth: 200, id: 2 },
      salmon: { name: 'Salmon', rarity: 'rare', xp: 10, weight: 2, worth: 400, id: 3 },
    }
  },
  pond2: {
    name: "Starfell Shore",
    xpRequired: 300,
    fish: {
      catfish: { name: 'Catfish', rarity: 'common', xp: 10, weight: 5, worth: 200, id: 4 },
      bass: { name: 'Bass', rarity: 'uncommon', xp: 25, weight: 3, worth: 400, id: 5 },
      pike: { name: 'Pike', rarity: 'rare', xp: 50, weight: 2, worth: 800, id: 6 },
    }
  },
  pond3: {
    name: "Shadow Lagoon",
    xpRequired: 1000,
    fish: {
      shark: { name: 'Shark', rarity: 'common', xp: 50, weight: 5, worth: 300, id: 7 },
      whale: { name: 'Whale', rarity: 'uncommon', xp: 150, weight: 3, worth: 600, id: 8 },
      kraken: { name: 'Kraken', rarity: 'rare', xp: 300, weight: 2, worth: 1200, id: 9 },
    }
  }
};

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

// MAX 5 REWARDS
const treasureRewards = {
  money: {
    displayName: 'In-Game Currency',
    emoji: '💰',
    buttonStyle: ButtonStyle.Success,
    command: 'cmi money give {{username}} {{rewardValue}}',
    minValue: 1000,
    maxValue: 2500,
  },
  battlepass: { // BATTLEPASS DOES NOT CURRENTLY SUPPORT UPDATING PLAYER POINTS WHILE THEY ARE OFFLINE
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
    command: null, // handled directly in DB
    minValue: 50,
    maxValue: 250,
  }
};

module.exports = {
  RAW_EARNINGS_LIMIT,
  SMOKED_EARNINGS_LIMIT,
  TREASURE_EARNINGS_LIMIT,
  fishData,
  fishingRodData,
  herbList,
  treasureRewards,
};