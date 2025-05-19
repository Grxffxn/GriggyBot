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
  console.log('fishInventory', fishInventory);
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
  console.log('herbInventory', herbInventory);
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
 * Adds an item to the inventory.
 * @param {string} itemId - The ID of the item to add.
 * @param {number} quantity - The quantity to add.
 * @param {string} inventory - The current inventory string.
 * @param {boolean} isSmoked - Whether the item is smoked.
 * @returns {string} The updated inventory string.
 */
function addToInventory(itemId, quantity, inventory, isSmoked = false) {
  console.log('addToInventory:');
  console.log('inventory', inventory);
  console.log('itemId', itemId);
  console.log('quantity', quantity);
  console.log('isSmoked', isSmoked);

  const itemMap = inventory
    ? Object.fromEntries(inventory.split(';').filter(Boolean).map(entry => entry.split(':')))
    : {};

  const id = isSmoked ? `s${itemId}` : `${itemId}`;
  itemMap[id] = (Number(itemMap[id]) || 0) + Number(quantity);

  console.log('returning', Object.entries(itemMap).map(([id, qty]) => `${id}:${qty}`).join(';'));
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
  console.log('deleteFromInventory:');
  console.log('inventory', inventory);
  console.log('itemId', itemId);
  console.log('quantity', quantity);
  console.log('isSmoked', isSmoked);

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
  console.log('returning', Object.entries(itemMap).map(([id, qty]) => `${id}:${qty}`).join(';'));
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

const { queryDB } = require('./databaseUtils.js');

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

module.exports = {
  getFlatFishIdMap,
  parseFishInventory,
  parseHerbInventory,
  addToInventory,
  deleteFromInventory,
  checkForRandomEvent,
  executeSellEvent,
  getUserDailyEarnings,
  addUserDailyEarnings,
  canUserEarn,
  resetAllDailyEarnings,
};