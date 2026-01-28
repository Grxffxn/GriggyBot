const { fishData, randomMessages, PRESTIGE_CONFIG, RAW_EARNINGS_LIMIT, SMOKED_EARNINGS_LIMIT, SMOKED_FISH_MULTIPLIER, fishingRodData, herbList } = require('../fishingConfig.js');
const {
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { queryDB } = require('./databaseUtils.js');

/**
 * Retrieves a fisherman's data from the database.
 * @param {string} discordId - The Discord ID of the fisherman.
 * @param {string} dbPath - The path to the database.
 * @param {boolean} createRowIfNoneExists - Whether to create a new row if none exists.
 * @returns {Promise<Object>} The fisherman's data row.
 */
async function getFishermanData(discordId, dbPath, createRowIfNoneExists = false) {
  let fishermanRow = await queryDB(dbPath, 'SELECT * FROM fishing WHERE discord_id = ?', [discordId], true);
  if (!fishermanRow && createRowIfNoneExists) {
    await queryDB(griggyDatabaseDir, `
      INSERT INTO fishing (discord_id, inventory, spices, fishing_rod, selected_rod, xp, prestige_level, smoker, last_fish_time)
      VALUES (?, '', '', 'training_rod', 'training_rod', 0, 0, NULL, 0)
    `, [discordId]);
    fishermanRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [discordId], true);
  }
  return fishermanRow;
}

/**
 * Flattens the fishData object into a map of fish ID to fish object.
 * @param {Object} fishDataObj - The fishData object from fishingConfig.js
 * @returns {Object} A flat map of fish IDs to fish objects.
 */
function getFlatFishIdMap(fishDataObj) {
  const flatMap = {};
  Object.values(fishDataObj).forEach(pond => {
    Object.values(pond.fish).forEach(fish => {
      flatMap[fish.id] = fish;
    });
  });
  return flatMap;
}

/**
 * Parses a player's inventory string into regular and smoked fish objects.
 * @param {string} fishInventory - The inventory string (e.g., "1:5;s2:3").
 * @returns {Object} An object with `regular` and `smoked` fish inventories.
 */
function parseFishInventory(fishInventory) {
  if (!fishInventory) return { regular: {}, smoked: {} };

  const regular = {};
  const smoked = {};

  fishInventory.split(';')
    .filter(Boolean)
    .forEach(entry => {
      const [id, quantity] = entry.split(':');
      if (id.startsWith('s')) {
        smoked[id.slice(1)] = Number(quantity); // Remove the 's' prefix for smoked fish
      } else {
        regular[id] = Number(quantity);
      }
    });

  return { regular, smoked };
}

/**
 * Parses a player's herb inventory string into an object.
 * @param {string} herbInventory - The inventory string (e.g., "1:3;2:5").
 * @returns {Object} An object mapping herb IDs to quantities.
 */
function parseHerbInventory(herbInventory) {
  if (!herbInventory) return {};

  const herbs = {};
  herbInventory.split(';')
    .filter(Boolean)
    .forEach(entry => {
      const [id, quantity] = entry.split(':');
      herbs[id] = Number(quantity);
    });

  return herbs;
}

/**
 * Calculates the XP for a fish, including prestige bonus.
 * @param {number} baseXP - The base XP for the fish.
 * @param {number} prestigeLevel - The user's prestige level.
 * @param {number} xpBonusPerLevel - The XP bonus per prestige level (e.g., 0.1 for 10%).
 * @returns {number} The final XP.
 */
function getPrestigeFishXP(baseXP, prestigeLevel) {
  return Math.round(baseXP * (1 + prestigeLevel * PRESTIGE_CONFIG.xpBonusPerLevel));
}

/**
 * Calculates the worth for a fish, including additive prestige bonus and cap.
 * @param {number} baseWorth - The base worth for the fish.
 * @param {number} prestigeLevel - The user's prestige level.
 * @returns {number} The final worth.
 */
function getPrestigeFishWorth(baseWorth, prestigeLevel) {
  const percentBonus = baseWorth * (PRESTIGE_CONFIG.percentWorthBonusPerLevel * prestigeLevel);
  const flatBonus = PRESTIGE_CONFIG.flatWorthBonusPerLevel * prestigeLevel;
  const bonus = Math.min(percentBonus, flatBonus);
  return Math.min(PRESTIGE_CONFIG.worthCap, Math.round(baseWorth + bonus));
}

/**
 * Adds an item to the inventory.
 * @param {string} itemId - The ID of the item to add.
 * @param {number} quantity - The quantity to add.
 * @param {string} inventory - The current inventory string.
 * @param {boolean} isSmoked - Whether the item is smoked.
 * @returns {string} The updated inventory string.
 */
function addToInventory(itemId, quantity, inventory, isSmoked = false) {
  const itemMap = inventory
    ? Object.fromEntries(inventory.split(';').filter(Boolean).map(entry => entry.split(':')))
    : {};

  const id = isSmoked ? `s${itemId}` : `${itemId}`;
  itemMap[id] = (Number(itemMap[id]) || 0) + Number(quantity);

  return Object.entries(itemMap).map(([id, qty]) => `${id}:${qty}`).join(';');
}

/**
 * Deletes an item from the inventory.
 * @param {string} itemId - The ID of the item to delete.
 * @param {number} quantity - The quantity to delete.
 * @param {string} inventory - The current inventory string.
 * @param {boolean} isSmoked - Whether the item is smoked.
 * @returns {string} The updated inventory string.
 */
function deleteFromInventory(itemId, quantity, inventory, isSmoked = false) {

  const itemMap = inventory
    ? Object.fromEntries(inventory.split(';').filter(Boolean).map(entry => entry.split(':')))
    : {};

  const id = isSmoked ? `s${itemId}` : `${itemId}`;
  if (itemMap[id]) {
    itemMap[id] = Math.max(0, Number(itemMap[id]) - Number(quantity));
    if (itemMap[id] === 0) {
      delete itemMap[id];
    }
  }
  return Object.entries(itemMap).map(([id, qty]) => `${id}:${qty}`).join(';');
}

/**
 * Checks for a random event based on the provided event type.
 * @param {string} eventType - The type of event to check for (e.g., "fishing", "selling", "smoker").
 * @param {boolean} fishIsSmoked - Whether the fish is smoked (for selling events).
 * @param {string|null} fallbackEvent - A fallback event type if no random event occurs.
 * @returns {string|null} The type of event triggered or null if no event occurs.
 */
function checkForRandomEvent(eventType, fishIsSmoked = false, fallbackEvent = null) {
  const eventPools = {
    fishing: [
      { type: 'treasure', chance: 0.05 },
      { type: 'herb', chance: 0.15 },
    ],
    selling: [
      { type: 'charity', chance: 0.05 }, // Low sale: fish sell for less
      { type: 'contest', chance: 0.10 }, // Bonus sale: fish sell for more
    ],
    smokerUnattended: [
      { type: 'smokerFire', chance: 0.02 }, // Smoker catches fire, fish are lost
    ],
  };

  let events = eventPools[eventType] || [];
  // If selling smoked fish, remove 'charity' event
  if (eventType === 'selling' && fishIsSmoked) {
    events = events.filter(event => event.type !== 'charity');
  }
  for (const event of events) {
    if (Math.random() < event.chance) {
      return event.type;
    }
  }
  return fallbackEvent;
}

/**
 * Generates a random event description and multiplier for selling fish.
 * @param {string|null} eventType - The type of event (e.g., "charity", "contest").
 * @param {number} amount - The amount of fish being sold.
 * @param {number} worthPerFish - The worth of each fish.
 * @param {string} memberName - The display name of the member selling the fish.
 * @param {string} displayName - The display name of the fish.
 * @returns {Object} An object containing the event description and sell multiplier.
*/

function executeSellEvent(eventType, amount, worthPerFish, memberName, displayName) {
  switch (eventType) {
    case 'charity': {
      const recipient = ['old woman', 'unhoused person', 'young child'][Math.floor(Math.random() * 3)];
      return {
        description: `${memberName} saw a starving ${recipient} begging for something to eat. The ${recipient} could only offer 50% of the usual price. They reluctantly sell the ${amount}x ${displayName} for $${((worthPerFish * amount) / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}, but feel good about themselves afterward.\n-# "I can't just let 'em go hungry.. and who knows, maybe they'll buy from me in the future."`,
        multiplier: 0.5,
      };
    }
    case 'contest':
      return {
        description: `${memberName} stumbles upon a fishing contest, and the fish of the day is ${displayName}! ${memberName} enters their ${amount}x ${displayName} for judging, and is given the award for largest ${displayName}! The judges keep the fish, but ${memberName} is awarded $${((worthPerFish * amount) * 1.5).toLocaleString('en-US', { minimumFractionDigits: 2 })} for their submission.\n-# "I don't remember the rules sayin' that the judges keep the fish..."`,
        multiplier: 1.5,
      };
    default: {
      const shopper = ['woman', 'man', 'person'][Math.floor(Math.random() * 3)];
      const normalScenarios = [
        `${memberName} finds an empty stall and sets up shop. A ${shopper} stops by and takes a look at their ${amount}x ${displayName}, and likes what they see. The ${shopper} offers the full price of $${(worthPerFish * amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} and ${memberName} happily accepts.\n-# "One.. two.. skip a few... $${(worthPerFish * amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}! They didn't short me!"`,
        `A ${shopper} eyes ${memberName}'s ${amount}x ${displayName} a little *too* enthusiastically. They offer full price, but ${memberName} double-checks the $${(worthPerFish * amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} before handing it over.\n-# "This ${shopper} is freakin' me out. I don't know if I should be happy or scared."`,
        `Shortly after ${memberName} sets up shop, a ${shopper} approaches who looks very well off. They offer the standard price of $${(worthPerFish * amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${memberName}'s ${amount}x ${displayName}, and ${memberName} accepts. The interaction is nothing to write home about.\n-# "I probably could've gotten more, but I'm no good at hagglin'."`,

      ]
      const description = normalScenarios[Math.floor(Math.random() * normalScenarios.length)];
      return {
        description,
        multiplier: 1,
      };
    }
  }
}

/**
 * Gets the user's daily earnings object, or initializes it if missing.
 * @param {string} dbPath - The path to the database.
 * @param {string} discordId - The user's Discord ID.
 * @returns {Object} The user's daily earnings object.
  * @throws {Error} If the database query fails.
  * @example
  * const earnings = await getUserDailyEarnings(dbPath, discordId);
  * console.log(earnings);
  * // Output: { collectedTreasureMoney: 0, collectedRawFishMarketMoney: 0, collectedSmokedFishMarketMoney: 0 }
 */
async function getUserDailyEarnings(dbPath, discordId) {
  const row = await queryDB(dbPath, 'SELECT daily_earnings FROM fishing WHERE discord_id = ?', [discordId], true);
  let earnings = {};
  if (row && row.daily_earnings) {
    try {
      earnings = JSON.parse(row.daily_earnings);
    } catch {
      earnings = {};
    }
  }
  // Ensure all keys exist
  return {
    collectedTreasureMoney: earnings.collectedTreasureMoney || 0,
    collectedRawFishMarketMoney: earnings.collectedRawFishMarketMoney || 0,
    collectedSmokedFishMarketMoney: earnings.collectedSmokedFishMarketMoney || 0,
  };
}

/**
 * Updates the user's daily earnings for a given key.
 * @param {string} dbPath - The path to the database.
 * @param {string} discordId - The user's Discord ID.
 * @param {string} key - The key to update in the daily earnings object.
 * @param {number} amount - The amount to add to the daily earnings.
 */
async function addUserDailyEarnings(dbPath, discordId, key, amount) {
  const earnings = await getUserDailyEarnings(dbPath, discordId);
  earnings[key] = (earnings[key] || 0) + amount;
  await queryDB(dbPath, 'UPDATE fishing SET daily_earnings = ? WHERE discord_id = ?', [JSON.stringify(earnings), discordId]);
}

/**
 * Checks if the user can earn more from a given source today.
 * @param {string} dbPath - The path to the database.
 * @param {string} discordId - The user's Discord ID.
 * @param {string} key - The key to check in the daily earnings object.
 * @param {number} limit - The maximum amount the user can earn from this source today.
 * @returns {boolean} True if the user can earn more, false otherwise.
 */
async function canUserEarn(dbPath, discordId, key, limit) {
  const earnings = await getUserDailyEarnings(dbPath, discordId);
  return (earnings[key] || 0) < limit;
}

/**
 * Resets all users' daily earnings (call this at midnight).
 * @param {string} dbPath - The path to the database.
 */
async function resetAllDailyEarnings(dbPath) {
  await queryDB(dbPath, 'UPDATE fishing SET daily_earnings = ?', [JSON.stringify({
    collectedTreasureMoney: 0,
    collectedRawFishMarketMoney: 0,
    collectedSmokedFishMarketMoney: 0,
  })]);
}

/**
 * Returns a random message for a given type.
 * @param {string} type
 * @returns {string}
 */
function getRandomMessage(type) {
  const messages = randomMessages[type];
  if (!messages) return '';
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Returns a random fish object from a pond.
 * @param {string} pond
 * @returns {Object}
 */
function getRandomFish(pond) {
  const fishInPond = Object.values(fishData[pond].fish);
  const totalWeight = fishInPond.reduce((sum, fish) => sum + fish.weight, 0);
  const randomWeight = Math.random() * totalWeight;

  let cumulativeWeight = 0;
  for (const fish of fishInPond) {
    cumulativeWeight += fish.weight;
    if (randomWeight < cumulativeWeight) {
      return fish;
    }
  }
  // fallback in case of rounding error
  return fishInPond[fishInPond.length - 1];
}

/**
 * Returns the highest available pond key for a user's XP.
 * @param {number} userXp
 * @returns {string}
 */
function getHighestAvailablePond(userXp) {
  const pondEntries = Object.entries(fishData);
  pondEntries.sort((a, b) => a[1].xpRequired - b[1].xpRequired);
  let highestPondKey = pondEntries[0][0];
  for (const [pondKey, pondObj] of pondEntries) {
    if (userXp >= pondObj.xpRequired) {
      highestPondKey = pondKey;
    } else {
      break;
    }
  }
  return highestPondKey;
}

async function buildFishMarketMenu(interaction, playerData) {
  const log = interaction.client.log;
  const flatFishMap = getFlatFishIdMap(fishData);
  const dailyEarnings = await getUserDailyEarnings(interaction.client.config.griggyDbPath, interaction.user.id);
  const rawEarned = dailyEarnings.collectedRawFishMarketMoney || 0;
  const smokedEarned = dailyEarnings.collectedSmokedFishMarketMoney || 0;
  const rawRemaining = Math.max(0, RAW_EARNINGS_LIMIT - rawEarned);
  const smokedRemaining = Math.max(0, SMOKED_EARNINGS_LIMIT - smokedEarned);
  const canSellRaw = rawEarned < RAW_EARNINGS_LIMIT;
  const canSellSmoked = smokedEarned < SMOKED_EARNINGS_LIMIT;
  const fishInventory = parseFishInventory(playerData.inventory);

  // RAW
  const fishOptions = Object.entries(fishInventory.regular)
    .filter(([fishId, quantity]) => quantity > 0)
    .map(([fishId, quantity]) => {
      const fish = flatFishMap[fishId];
      if (!fish) {
        log(`Fish with ID ${fishId} not found in fishData.`, 'WARN');
        return null;
      }
      const fishWorth = getPrestigeFishWorth(fish.worth, playerData.prestige_level);
      const maxSellable = Math.min(quantity, Math.ceil(rawRemaining / fishWorth));
      if (maxSellable < 1) return null;
      return {
        label: `${fish.name} (${maxSellable === quantity ? quantity : `${maxSellable}/${quantity}`})`,
        value: `${fishId}:${fishWorth}:${maxSellable}`,
        description: `Rarity: ${fish.rarity}, Worth: $${fishWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        emoji: { name: '🐟' },
      };
    })
    .filter(Boolean)
    .slice(0, 25);

  // SMOKED
  const smokedFishOptions = Object.entries(fishInventory.smoked)
    .filter(([fishId, quantity]) => quantity > 0)
    .map(([fishId, quantity]) => {
      const fish = flatFishMap[fishId];
      if (!fish) {
        console.warn(`Fish with ID ${fishId} not found in fishData.`);
        return null;
      }
      const fishWorth = getPrestigeFishWorth(fish.worth, playerData.prestige_level);
      const worthPerFish = fishWorth * SMOKED_FISH_MULTIPLIER;
      const maxSellable = Math.min(quantity, Math.ceil(smokedRemaining / worthPerFish));
      if (maxSellable < 1) return null;
      return {
        label: `Smoked ${fish.name} (${maxSellable}/${quantity})`,
        value: `s${fishId}:${worthPerFish}:${maxSellable}`,
        description: `Rarity: ${fish.rarity}, Worth: $${worthPerFish.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        emoji: { name: '🔥' },
      };
    })
    .filter(Boolean)
    .slice(0, 25);

  const fishSelectMenu = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`fishMarket:sellRaw/${interaction.user.id}`)
        .setPlaceholder(
          canSellRaw
            ? 'Select a fish to sell'
            : 'Shop out of money for today'
        )
        .setDisabled(!canSellRaw)
        .addOptions(
          canSellRaw
            ? (fishOptions.length > 0
              ? fishOptions
              : [{ label: 'No fish available', value: 'none', description: 'You have no fish to sell.', emoji: { name: '❌' }, default: true }]
            )
            : [{ label: 'Shop out of money', value: 'none', description: 'Come back tomorrow!', emoji: { name: '❌' }, default: true }]
        )
    );

  const smokedFishSelectMenu = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`fishMarket:sellSmoked/${interaction.user.id}`)
        .setPlaceholder(
          canSellSmoked
            ? 'Select a smoked fish to sell'
            : 'Shop out of money for today'
        )
        .setDisabled(!canSellSmoked)
        .addOptions(
          canSellSmoked
            ? (smokedFishOptions.length > 0
              ? smokedFishOptions
              : [{ label: 'No smoked fish available', value: 'none', description: 'You have no smoked fish to sell.', emoji: { name: '❌' }, default: true }]
            )
            : [{ label: 'Shop out of money', value: 'none', description: 'Come back tomorrow!', emoji: { name: '❌' }, default: true }]
        )
    );

  const ownedRods = (playerData.fishing_rod || '').split(',').map(rod => rod.trim()).filter(Boolean);

  const availableRodOptions = Object.entries(fishingRodData)
    .filter(([key]) => !ownedRods.includes(key))
    .map(([key, value]) => ({
      label: `${value.name} ($${value.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
      value: `${key}:${value.cost}`,
      description: value.description,
      emoji: { name: '🎣' },
    }));

  const rodSelectOptions = availableRodOptions.length > 0
    ? availableRodOptions
    : [{
      label: 'All Fishing Rods Unlocked',
      value: 'none',
      description: 'Doesn\'t get better than this!',
      emoji: { name: '🎉' },
      default: true,
    }]

  const fishingRodSelectMenu = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`fishMarket:buyRod/${interaction.user.id}`)
        .setPlaceholder('Select a fishing rod to purchase')
        .addOptions(rodSelectOptions)
    );

  // Main UI container declaration
  const separatorComponent = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .setAccentColor(resolveColor(interaction.client.config.defaultColor))
    .addSectionComponents([
      new SectionBuilder()
        .addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`# 🐡 ${interaction.client.config.serverAcronym || interaction.client.config.serverName} Fish Market`),
          new TextDisplayBuilder().setContent(`${interaction.member.displayName} ventures into the fish market, where the smell of fresh fish fills the air. The market is bustling with activity, and you can see various stalls selling different types of fish and fishing rods. You can sell your fish, sell your smoked fish, or buy a new fishing rod.`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Taiga_Small_House_3.png',
          }
        }))
    ])
    .addSeparatorComponents(separatorComponent)
    .addSectionComponents([
      new SectionBuilder()
        .addTextDisplayComponents([
          new TextDisplayBuilder().setContent('### 🍣 Pond to Plate'),
          new TextDisplayBuilder().setContent(
            canSellRaw
              ? `The owner of 'Pond to Plate' looks at you with a smile. She tells you that she's always looking for fresh fish to sell in her shop. She offers to buy your fish for a fair price.\n-# "These fish look perfect, ${interaction.member.displayName}. I'll give you a good deal for them!"`
              : `The owner of 'Pond to Plate' looks at you with a slight frown. She tells you that she's out of money for the day and can't buy any more fish.\n-# "Sorry, ${interaction.member.displayName}. I can't buy any more fish today."`
          ),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Raw_Salmon_JE2_BE2.png',
          }
        }))
    ])
    .addActionRowComponents(fishSelectMenu)
    .addSeparatorComponents(separatorComponent)
    .addSectionComponents([
      new SectionBuilder()
        .addTextDisplayComponents([
          new TextDisplayBuilder().setContent('### 🐦‍🔥 Charred & Delicious'),
          new TextDisplayBuilder().setContent(
            canSellSmoked
              ? `The owner of 'Charred & Delicious' looks worried. He tells you that his usual supplier is running behind on orders, and his shop is almost out of stock. He offers to buy your fish for a fair price.\n-# "I'm kinda desperate here, ${interaction.member.displayName}. You won't find a better deal anywhere else!"`
              : `The owner of 'Charred & Delicious' looks at you with a slight frown. He tells you that he's out of money for the day and can't buy any more fish.\n-# "Sorry, ${interaction.member.displayName}. I can't buy any more fish today."`
          ),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Cooked_Cod_JE4_BE3.png',
          }
        }))
    ])
    .addActionRowComponents(smokedFishSelectMenu)
    .addSeparatorComponents(separatorComponent)
    .addSectionComponents([
      new SectionBuilder()
        .addTextDisplayComponents([
          new TextDisplayBuilder().setContent('### 📦 Reel Improvements'),
          new TextDisplayBuilder().setContent(`You notice a small shop selling fishing rods and accessories. The owner is stood outside the shop shouting about his wares. You make eye contact and he waves you over.\n-# "You look like a fisherman, and a good one at that! Have you considered an upgrade?"`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png',
          }
        }))
    ])
    .addActionRowComponents(fishingRodSelectMenu);

  return container;
}

module.exports = {
  getFishermanData,
  getFlatFishIdMap,
  parseFishInventory,
  parseHerbInventory,
  getPrestigeFishXP,
  getPrestigeFishWorth,
  addToInventory,
  deleteFromInventory,
  checkForRandomEvent,
  executeSellEvent,
  getUserDailyEarnings,
  addUserDailyEarnings,
  canUserEarn,
  resetAllDailyEarnings,
  getRandomMessage,
  getRandomFish,
  getHighestAvailablePond,
  buildFishMarketMenu,
};