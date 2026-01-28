const {
  SlashCommandBuilder,
  ButtonBuilder,
  MessageFlags,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
  ActionRowBuilder,
} = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const {
  getFishermanData,
  addToInventory,
  checkForRandomEvent,
  parseFishInventory,
  getPrestigeFishXP,
  getPrestigeFishWorth,
  canUserEarn,
  getRandomMessage,
  getRandomFish,
  getHighestAvailablePond
} = require('../../utils/fishingUtils.js');
const {
  isUserInEvent,
  startEvent,
  endEvent,
} = require('../../utils/trackActiveEvents.js');
const {
  fishData,
  fishingRodData,
  herbList,
  treasureRewards,
  TREASURE_EARNINGS_LIMIT
} = require('../../fishingConfig.js');
const { UserDenyError } = require('../../utils/errors.js');

const pondChoices = Object.entries(fishData).map(([pondKey, pondObj]) => ({
  name: pondObj.name,
  value: pondKey,
}));

module.exports = {
  data: new SlashCommandBuilder().setName('fish').setDescription('Go fishing!')
    .addStringOption(option =>
      option.setName('pond').setDescription('Pond to fish in').addChoices(...pondChoices)
    ),
  async run(interaction) {
    function denyInteraction(message, denialEndsEvent = true) {
      if (denialEndsEvent) endEvent(interaction.user.id, 'fishing');
      throw new UserDenyError(message);
    }

    /**
     * Checks if the user is eligible to fish, including checking their experience and inventory.
     * @param {Object} fishermanRow - The fisherman's data row from the database.
     * @param {Object} pondConfig - The configuration for the pond the user is fishing in.
     */
    function preGameCheck(fishermanRow, pondConfig) {
      if (isUserInEvent(interaction.user.id, 'fishing')) {
        denyInteraction('You\'re already fishing! Unless you have four arms, I\'d recommend using one fishing rod at a time.\n-# If you believe this is an error, ask an admin to run the command `/admin userevents`', false);
      }
      const parsedFishInventory = parseFishInventory(fishermanRow.inventory);
      if (Object.keys(parsedFishInventory.regular).length > 24) {
        denyInteraction('Your fish bucket is too heavy! You need to sell or smoke some fish before you can catch more. -# "How d\'you expect me to carry all these back home?"', false);
      }
      if (fishermanRow.xp < pondConfig.xpRequired) {
        denyInteraction(`❌ You need some more experience before fishing in ${pondConfig.name} (${fishermanRow.xp}/${pondConfig.xpRequired})\n-# "I'm not sure I can handle these fish yet."`, false);
      }
    }

    /**
     * Prompts the user to confirm fishing while a smoker is running, with a chance of a fire event.
     * @returns {Promise<boolean>} Resolves to true if the user confirms, false if they cancel. Throws if a smoker fire occurs.
     */
    async function handleSmokerCheck() {
      const smokerWarningText = `⚠️ ${playerName}, you have a smoker running! If you go fishing now, there's a chance it could catch fire and burn your fish. Do you want to continue?`;
      const smokerWarningConfirmActionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`smokerWarningConfirm:${interaction.user.id}`)
            .setLabel('Take the risk!')
            .setEmoji('🔥')
            .setStyle(ButtonStyle.Danger));
      const confirmationInteractionFilter = (buttonInteraction) =>
        buttonInteraction.customId === `smokerWarningConfirm:${interaction.user.id}` &&
        buttonInteraction.user.id === interaction.user.id;
      const confirmationCollector = interaction.channel.createMessageComponentCollector({ filter: confirmationInteractionFilter, time: 15000, max: 1 });
      await interaction.editReply({ content: smokerWarningText, components: [smokerWarningConfirmActionRow] });

      return new Promise((resolve, reject) => {
        let confirmed = false;
        confirmationCollector.on('collect', async (buttonInteraction) => {
          confirmed = true;
          confirmationCollector.stop('confirmed');
          await buttonInteraction.deferUpdate();
        });
        confirmationCollector.on('end', async (collected, reason) => {
          if (reason === 'time') {
            endEvent(interaction.user.id, 'fishing');
            await interaction.editReply({
              content: `🛶 ${playerName} decided not to risk leaving the smoker unattended.`,
              components: [],
            });
            resolve(false);
          } else if (reason === 'confirmed' && confirmed) {
            // Check for fire event
            const randomEvent = checkForRandomEvent('smokerUnattended');
            if (randomEvent === 'smokerFire') {
              const randomEventContainer = new ContainerBuilder()
                .setAccentColor(resolveColor('DarkRed'))
                .addSectionComponents(
                  new SectionBuilder()
                    .addTextDisplayComponents([
                      new TextDisplayBuilder().setContent(`# 🔥 ${interaction.member.displayName}'s Smoker Caught Fire!`),
                      new TextDisplayBuilder().setContent(`${interaction.member.displayName} took a chance and went fishing while their smoker was running. Unfortunately, their smoker caught fire and all of their fish were lost!`),
                      new TextDisplayBuilder().setContent('-# "Did I leave the stove on?"'),
                    ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Fire.gif' } }))
                );
              await queryDB(griggyDatabaseDir, 'UPDATE fishing SET smoker = ? WHERE discord_id = ?', [null, interaction.user.id]);
              endEvent(interaction.user.id, 'fishing');
              await interaction.editReply('You notice a large cloud of smoke in the distance. You rush back to your camp to find your smoker engulfed in flames!\n-# "I really wish the developer let me use curse words right now."');
              await interaction.channel.send({ content: '', components: [randomEventContainer], flags: MessageFlags.IsComponentsV2 });
              reject(new Error('smokerFire'));
            } else {
              resolve(true);
            }
          }
        });
      });
    }

    /**
     * Starts the fishing minigame, handles the fishing logic, and manages the interaction flow.
     * @param {Object} fishermanRow - The fisherman's data row from the database.
     * @param {string} pond - The pond the user is fishing in.
     * @param {Object} pondConfig - The configuration for the pond.
     */
    async function startFishingMinigame(fishermanRow, pond, pondConfig) {
      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET last_fish_time = ? WHERE discord_id = ?', [currentTime, interaction.user.id]);

      await interaction.editReply({ content: `🎣 ${playerName} cast their line. ${getRandomMessage("cast")}`, components: [] });
      const fishingRod = fishermanRow.selected_rod;
      const fishingRodInfo = fishingRodData[fishingRod];

      const baseCatchTime = Math.floor(Math.random() * (30 - 15 + 1) + 15) * 1000;
      const catchTime = Math.floor(baseCatchTime / fishingRodInfo.catchSpeed);
      const hookTime = fishingRodInfo.hookTime * 3000;

      await new Promise(resolve => setTimeout(resolve, catchTime));
      try {
        const checkSmokerStartWhileFishing = await queryDB(griggyDatabaseDir, 'SELECT smoker FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
        if (checkSmokerStartWhileFishing.smoker && !fishermanRow.smoker) denyInteraction(`🛶 ${playerName} stopped fishing and decided to fire up the smoker.\n-# "I can\'t take it anymore, I\'m starvin'!"`);

        const catchEventData = {
          caughtFish: getRandomFish(pond),
          xpGained: 0,
          worth: 0,
          doubleCatch: false,
          randomEvent: checkForRandomEvent('fishing'),
          caught: false,
        };
        catchEventData.xpGained = getPrestigeFishXP(catchEventData.caughtFish.xp, fishermanRow.prestige_level);
        catchEventData.worth = getPrestigeFishWorth(catchEventData.caughtFish.worth, fishermanRow.prestige_level);
        catchEventData.doubleCatch = Math.random() < fishingRodInfo.doubleCatchChance;

        const fishingMinigameActionRow = new ActionRowBuilder()
          .addComponents(new ButtonBuilder()
            .setCustomId(`catch:${interaction.user.id}`)
            .setLabel('Reel \'em in!')
            .setEmoji('🎣')
            .setStyle(ButtonStyle.Success));

        await interaction.editReply({
          content: `🎣 ${interaction.member}, you've got a bite! ${getRandomMessage("hook")}`,
          components: [fishingMinigameActionRow]
        });

        const filter = (buttonInteraction) => buttonInteraction.customId === `catch:${interaction.user.id}`;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: hookTime, max: 1 });

        collector.on('collect', async (buttonInteraction) => {
          catchEventData.caught = true;
          collector.stop('caught');
          await buttonInteraction.deferUpdate();
          await handlePlayerCatchEvent(fishermanRow, fishingRodInfo, catchEventData, pondConfig);
        });

        collector.on('end', async (collected, reason) => {
          if (catchEventData.caught) {
            endEvent(interaction.user.id, 'fishing');
            return;
          } else {
            endEvent(interaction.user.id, 'fishing');
            return interaction.editReply({
              content: `🎣 ${playerName}, you lost the fish!`,
              components: [],
            });
          }
        });
      } catch (err) {
        interaction.client.log('Error during fishing minigame:', 'ERROR', err);
        denyInteraction('The fishin\' line snapped! Try again later.\n-# ⚠️ This is an error, please report it to an admin.');
      }
    }

    /**
     * Handles the player's catch event, updating their inventory and sending the appropriate response.
     * @param {Object} fishermanRow - The fisherman's data row from the database.
     * @param {Object} fishingRodInfo - Information about the fishing rod used.
     * @param {Object} catchEventData - Data about the catch event, including the caught fish, XP gained, worth, and random events.
     * @param {Object} pondConfig - Configuration for the pond where the fishing took place.
     */
    async function handlePlayerCatchEvent(fishermanRow, fishingRodInfo, catchEventData, pondConfig) {
      const { caughtFish, xpGained, worth, doubleCatch, randomEvent } = catchEventData;
      const caughtFishAmount = doubleCatch ? 2 : 1;
      let fishInventory = fishermanRow.inventory;
      fishInventory = addToInventory(caughtFish.id, caughtFishAmount, fishInventory);

      const container = buildCatchContainer(caughtFish, xpGained, worth, pondConfig, doubleCatch, fishingRodInfo);

      switch (randomEvent) {
        case 'treasure': {
          await handleTreasureEvent(container, fishInventory, xpGained, caughtFishAmount);
          break;
        }
        case 'herb':
          let spiceInventory = fishermanRow.spices;
          await handleHerbEvent(container, fishInventory, spiceInventory, xpGained, caughtFishAmount);
          break;
        default:
          await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
          await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, xp = xp + ?, lifetime_fish_caught = lifetime_fish_caught + ? WHERE discord_id = ?', [fishInventory, xpGained, caughtFishAmount, interaction.user.id]);
          break;
      }
    }

    /**
     * Builds the container for the catch event, including the caught fish details and any additional information.
     * @param {Object} caughtFish - The fish that was caught.
     * @param {number} xpGained - The amount of XP gained from the catch.
     * @param {number} worth - The worth of the caught fish.
     * @param {Object} pondConfig - Configuration for the pond where the fishing took place.
     * @param {boolean} doubleCatch - Whether the player caught a second fish.
     * @param {Object} fishingRodInfo - Information about the fishing rod used.
     * @returns {ContainerBuilder} - The container with the catch details.
     */
    function buildCatchContainer(caughtFish, xpGained, worth, pondConfig, doubleCatch, fishingRodInfo) {
      const container = new ContainerBuilder()
        .setAccentColor(
          caughtFish.rarity === 'common'
            ? resolveColor('00FF00')
            : caughtFish.rarity === 'uncommon'
              ? resolveColor('FFFF00')
              : resolveColor('FF0000')
        );

      container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`## 🎣 ${playerName} caught a ${caughtFish.rarity} ${caughtFish.name}! ${getRandomMessage('catch')}`),
          new TextDisplayBuilder().setContent(`**XP Gained:** ${xpGained}\n**Worth:** $${worth.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n**Pond:** ${pondConfig.name}`)
        ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png' } }))
      );

      if (doubleCatch) {
        container.addSeparatorComponents(new SeparatorBuilder())
          .addSectionComponents(
            new SectionBuilder().addTextDisplayComponents([
              new TextDisplayBuilder().setContent(`## 🎉 ${playerName} caught another ${caughtFish.name}!\n**Fishing Rod:** ${fishingRodInfo.name} ${getRandomMessage('doubleCatch')}`)
            ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Luck_JE3.png' } }))
          );
      }
      return container;
    }

    /**
     * Modifies the container to handle treasure events, allowing the user to collect rewards.
     * @param {ContainerBuilder} container - The container to modify.
     * @param {string} fishInventory - The user's current fish inventory.
     * @param {number} xpGained - The amount of XP gained from the catch.
     * @param {number} caughtFishAmount - The amount of fish caught.
     */
    async function handleTreasureEvent(container, fishInventory, xpGained, caughtFishAmount) {
      const canCollectTreasureMoney = await canUserEarn(griggyDatabaseDir, interaction.user.id, 'collectedTreasureMoney', TREASURE_EARNINGS_LIMIT);
      container.addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder().addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`## 🎁 ${playerName} found a treasure chest! ${getRandomMessage('treasure')}`)
          ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Chest_%28S%29_JE2.png' } }))
        ).addActionRowComponents(
          new ActionRowBuilder().addComponents(
            ...Object.entries(treasureRewards).map(([key, reward]) =>
              new ButtonBuilder()
                .setCustomId(`fishingTreasure:${key}/${interaction.user.id}`)
                .setLabel(reward.displayName)
                .setEmoji(reward.emoji)
                .setStyle(reward.buttonStyle)
                .setDisabled(key === "money" && !canCollectTreasureMoney)
            )
          )
        )
      await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, xp = xp + ?, lifetime_fish_caught = lifetime_fish_caught + ? WHERE discord_id = ?', [fishInventory, xpGained, caughtFishAmount, interaction.user.id]);
    }

    /**
     * Modifies the container to handle herb events, communicating to the user if they found an herb.
     * @param {ContainerBuilder} container - The container to modify.
     * @param {string} fishInventory - The user's current fish inventory.
     * @param {string} spiceInventory - The user's current spice inventory.
     * @param {number} xpGained - The amount of XP gained from the catch.
     * @param {number} caughtFishAmount - The amount of fish caught.
     */
    async function handleHerbEvent(container, fishInventory, spiceInventory, xpGained, caughtFishAmount) {
      const herb = herbList[Math.floor(Math.random() * herbList.length)];
      container.addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(
          new SectionBuilder().addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`## 🌿 ${playerName} found ${herb.name}! ${getRandomMessage('herb')}`)
          ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Seagrass_JE1_BE2.gif' } }))
        );
      await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
      spiceInventory = addToInventory(herb.id, 1, spiceInventory);
      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, spices = ?, xp = xp + ?, lifetime_fish_caught = lifetime_fish_caught + ? WHERE discord_id = ?', [fishInventory, spiceInventory, xpGained, caughtFishAmount, interaction.user.id]);
    }

    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const playerName = interaction.member.displayName;
    const currentTime = Date.now();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const fishermanRow = await getFishermanData(interaction.user.id, griggyDatabaseDir, true);
      let pond = interaction.options.getString('pond');
      if (!pond) pond = getHighestAvailablePond(fishermanRow.xp);
      const pondConfig = fishData[pond];
      preGameCheck(fishermanRow, pondConfig);
      startEvent(interaction.user.id, 'fishing');

      if (fishermanRow.smoker) {
        try {
          const confirmed = await handleSmokerCheck();
          if (!confirmed) return;
        } catch (err) {
          if (err.message === 'smokerFire') return;
          throw err;
        }
      }

      await startFishingMinigame(fishermanRow, pond, pondConfig);
    } catch (err) {
      if (err.name !== 'UserDenyError') {
        interaction.client.log('Unexpected error in /fish command:', 'ERROR', err);
      }
      return interaction.editReply({ content: err.message || 'The fish aren\'t bitin\' today. Come back later.\n-# ⚠️ This is an error, please report it to an admin.', flags: MessageFlags.Ephemeral });
    }
  },
};