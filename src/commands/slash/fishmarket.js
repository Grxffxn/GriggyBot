const {
  SlashCommandBuilder,
  MessageFlags,
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
const { queryDB } = require('../../utils/databaseUtils.js');
const { RAW_EARNINGS_LIMIT, SMOKED_EARNINGS_LIMIT, SMOKED_FISH_MULTIPLIER, fishData, fishingRodData, herbList } = require('../../fishingConfig.js');
const {
  getFlatFishIdMap,
  getUserDailyEarnings,
  parseFishInventory,
  checkForRandomEvent,
  getPrestigeFishWorth,
  canUserEarn,
  buildFishMarketMenu,
} = require('../../utils/fishingUtils.js');
const flatFishMap = getFlatFishIdMap(fishData);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fishmarket')
    .setDescription('Visit the town fish market.'),

  async run(interaction) {
    const griggyDatabaseDir = interaction.client.config.griggyDbPath;
    const playerData = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
    if (!playerData) return interaction.reply({
      content: '🪣 You should `/fish` a little before takin\' a trip to the market.',
      flags: MessageFlags.Ephemeral
    })

    let randomEventContainer = null;
    // Chance of a random event occurring while smoker is on and 'unattended'
    if (playerData.smoker) {
      const randomEvent = checkForRandomEvent('smokerUnattended');
      if (randomEvent) {
        switch (randomEvent) {
          case 'smokerFire':
            randomEventContainer = new ContainerBuilder()
              .setAccentColor(resolveColor('DarkRed'))
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents([
                    new TextDisplayBuilder().setContent(`# 🔥 ${interaction.member.displayName}'s Smoker Caught Fire!`),
                    new TextDisplayBuilder().setContent(`${interaction.member.displayName} took a chance and went to the fish market while their smoker was running. Unfortunately, their smoker caught fire and all of their fish were lost!`),
                    new TextDisplayBuilder().setContent('-# "Did I leave the stove on?"'),
                  ]).setThumbnailAccessory(
                    new ThumbnailBuilder({
                      media: {
                        url: 'https://minecraft.wiki/images/Fire.gif',
                      }
                    })
                  )
              );
            await queryDB(griggyDatabaseDir, 'UPDATE fishing SET smoker = ? WHERE discord_id = ?', [
              null,
              interaction.user.id
            ]);
            break;
          default:
            interaction.client.log(`Random event '${randomEvent}' has not been setup in fishmarket.js`, 'WARN');
            break;
        }
      }
    }

    const container = await buildFishMarketMenu(interaction, playerData);

    await interaction.reply({
      components: [container, randomEventContainer].filter(Boolean),
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  }
};