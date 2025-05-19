const { MessageFlags } = require('discord.js');
const {
  fishData,
  fishingRodData,
  herbList,
} = require('../../../fishingConfig.js');
const { queryDB } = require('../../../utils/databaseUtils.js');
const { hyphenateUUID } = require('../../../utils/formattingUtils.js');
const { updateBalance } = require('../../../utils/gamblingUtils.js');
const {
  getFlatFishIdMap,
  parseFishInventory,
  deleteFromInventory,
  checkForRandomEvent,
  executeSellEvent,
  addUserDailyEarnings
} = require('../../../utils/fishingUtils.js');
const flatFishMap = getFlatFishIdMap(fishData);

module.exports = {
  customId: 'fishMarket',
  /**
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    if (args[1] !== interaction.user.id) {
      return interaction.reply({ content: 'This is not your menu!', flags: MessageFlags.Ephemeral });
    }
    await interaction.message.delete();

    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;

    // Get player data
    const griggyPlayerData = await queryDB(
      griggyDatabaseDir,
      'SELECT users.*, fishing.* FROM users INNER JOIN fishing ON users.discord_id = fishing.discord_id WHERE users.discord_id = ?',
      [interaction.user.id],
      true
    );
    if (!griggyPlayerData) {
      return interaction.reply({ content: 'You must `/link` your accounts to do this!', flags: MessageFlags.Ephemeral });
    }

    const hyphenatedUUID = hyphenateUUID(griggyPlayerData.minecraft_uuid);
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const cmiPlayerData = await queryDB(
      cmiDatabaseDir,
      'SELECT * FROM users WHERE player_uuid = ?',
      [hyphenatedUUID],
      true
    );
    if (!cmiPlayerData) {
      return interaction.reply({ content: 'Something went wrong... Have you played on the server before?\n-# Error: Couldn\'t find user data in CMI database', flags: MessageFlags.Ephemeral });
    }

    const username = cmiPlayerData.username;
    const action = args[0]; // sellRaw, sellSmoked, buyRod

    // Parse menu value
    const [rawItemId, rawItemWorth, rawItemQuantity] = interaction.values[0].split(':');
    let itemId = rawItemId;
    const itemWorth = parseInt(rawItemWorth);
    const itemQuantity = parseInt(rawItemQuantity) || 1;

    if (action === 'sellRaw' || action === 'sellSmoked') {
      const rawDataFishInventory = griggyPlayerData.inventory;
      const fishInventory = parseFishInventory(rawDataFishInventory);

      const fishIsSmoked = action === 'sellSmoked' || itemId.startsWith('s');
      if (itemId.startsWith('s')) itemId = itemId.slice(1);

      const fish = flatFishMap[itemId];
      if (!fish) {
        console.warn(`Fish with ID ${itemId} not found in fishData.`);
        return interaction.reply({ content: 'Fish not found.', flags: MessageFlags.Ephemeral });
      }

      // Calculate worth and display name
      const worthPerFish = fishIsSmoked ? Math.round(fish.worth * 1.5) : fish.worth;
      const totalWorth = worthPerFish * itemQuantity;
      const displayName = fishIsSmoked ? `Smoked ${fish.name}` : fish.name;

      // Check inventory
      const userHasEnough =
        fishIsSmoked
          ? (fishInventory.smoked[itemId] || 0) >= itemQuantity
          : (fishInventory.regular[itemId] || 0) >= itemQuantity;

      if (!userHasEnough) {
        return interaction.reply({
          content: `You don't have enough ${displayName} to sell.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Remove fish from inventory
      const updatedInventory = deleteFromInventory(itemId, itemQuantity, rawDataFishInventory, fishIsSmoked);
      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ? WHERE discord_id = ?', [updatedInventory, interaction.user.id]);

      // Random event
      const randomEvent = checkForRandomEvent('selling', fishIsSmoked);
      const eventResult = executeSellEvent(randomEvent, itemQuantity, worthPerFish, interaction.member.displayName, displayName);

      // Update daily earnings
      const earningsKey = fishIsSmoked ? "collectedSmokedFishMarketMoney" : "collectedRawFishMarketMoney";
      await addUserDailyEarnings(griggyDatabaseDir, interaction.user.id, earningsKey, totalWorth * eventResult.multiplier);

      // Update balance
      const payout = totalWorth * eventResult.multiplier;
      const sellFishCommand = `cmi money give ${username} ${payout}`;
      await updateBalance(interaction, sellFishCommand);

      return interaction.reply(eventResult.description);

    } else if (action === 'buyRod') {
      // Rod purchase
      const rodId = itemId;
      const rodCost = itemWorth;
      const userBalance = cmiPlayerData.Balance;

      if (userBalance < rodCost) {
        return interaction.reply({ content: `You do not have enough money to buy this rod.`, flags: MessageFlags.Ephemeral });
      }

      const buyFishingRodCommand = `cmi money take ${username} ${rodCost}`;
      await updateBalance(interaction, buyFishingRodCommand);

      const selectedFishingRodData = fishingRodData[rodId];
      const updatedFishingRodColumn = griggyPlayerData.fishing_rod
        ? `${griggyPlayerData.fishing_rod},${rodId}`
        : rodId;
      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET fishing_rod = ? WHERE discord_id = ?', [updatedFishingRodColumn, interaction.user.id]);

      return interaction.reply(`https://minecraft-api.com/api/achivements/${selectedFishingRodData.apiItem}/New..Fishing..Rod..Unlocked/${selectedFishingRodData.apiName}/`);
    }
  }
};