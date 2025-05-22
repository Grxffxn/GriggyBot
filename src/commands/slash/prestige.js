// Once a user reaches the last configured pond in fishingConfig.js, they have the ability to prestige. This will reset their fishing level and give them a new pond to fish in. The user will also receive a reward for prestiging, which is configurable in the config file. The user can only prestige once every 24 hours.
// The user will be asked to select 1 fishing rod and 1 type of herb to keep. They will lose all other rods, herbs, and saved fish.
// Once the user selects their items and confirms, the bot will update the database to remove their inventory column, set the fishing_rod and selected_rod columns to their selected rod,
// and set the "spices" column to their selected herb's id and quantity. ex. "1:16" for 16 of herb id 1.
// In the prestige_level column, the bot will increment the value by 1.
const {
  SlashCommandBuilder,
  ButtonBuilder,
  MessageFlags,
  ButtonStyle,
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
const {
  getFlatFishIdMap,
  parseFishInventory,
  parseHerbInventory,
  addToInventory,
  deleteFromInventory,
} = require('../../utils/fishingUtils.js');
const {
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
} = require('../../fishingConfig.js');
const {
  isUserInEvent,
  startEvent,
  endEvent,
} = require('../../utils/trackActiveEvents.js');
const { queryDB } = require('../../utils/databaseUtils.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prestige')
    .setDescription(`Reset fishing XP and increase rewards`),
  async run(interaction) {
    async function denyInteraction(message = `Come back once you've got some more experience!`) {
      endEvent(interaction.user.id, 'prestige');
      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = interaction.client.config;
    const log = interaction.client.log;
    const griggyDatabaseDir = config.griggyDbPath;
    // get the required xp for the highest level pond in fishData
    const pondKeys = Object.keys(fishData);
    const lastPondKey = pondKeys[pondKeys.length - 1];
    const requiredXp = fishData[lastPondKey].xpRequired;
    // retrieve user data from fishing table
    const userRow = await queryDB(
      griggyDatabaseDir,
      'SELECT * FROM fishing WHERE discord_id = ?',
      [interaction.user.id],
      true
    );
    if (!userRow || (userRow.xp < requiredXp)) return denyInteraction();
    const activePrestigeMenu = isUserInEvent(interaction.user.id, 'prestige');
    if (activePrestigeMenu) return denyInteraction('You can only have one menu open at a time!');

    // user passes check, create the container for string option menus to select fishing rod and herb
    startEvent(interaction.user.id, 'prestige');

    const userHerbs = parseHerbInventory(userRow.spices);
    const userRods = (userRow.fishing_rod || '').split(',').map(r => r.trim()).filter(Boolean);

    const herbSelectOptions = Object.entries(userHerbs)
      .filter(([herbId, quantity]) => quantity > 0)
      .map(([herbId, quantity]) => {
        const herb = herbList.find(h => h.id === Number(herbId));
        if (!herb) return null;
        return {
          label: `${herb.name} (${quantity})`,
          value: `${herbId}:${quantity}`,
          description: herb.boostDescription,
          emoji: { name: '🌿' },
        };
      })
      .filter(Boolean);

    const herbSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(`prestige:herb/${interaction.user.id}`)
      .setPlaceholder('Choose one herb type to keep')
      .addOptions(
        herbSelectOptions.length > 0
          ? herbSelectOptions
          : [{ label: 'No herbs available', value: 'none:0', description: 'You have no herbs to keep.', emoji: { name: '❌' } }]
      );

    const herbSelectSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder().setContent('### Select a herb to keep:')
      ])
      .setThumbnailAccessory(new ThumbnailBuilder({
        media: { url: 'https://minecraft.wiki/images/Seagrass_JE1_BE2.gif' }
      }));

    const herbActionRow = new ActionRowBuilder().setComponents(herbSelectMenu);

    const fishingRodSelectOptions = userRods
      .map(rodId => {
        const rod = fishingRodData[rodId];
        if (!rod) return null;
        return {
          label: rod.name,
          value: rodId,
          description: rod.description,
          emoji: { name: '🎣' },
        };
      })
      .filter(Boolean);

    const fishingRodSelectMenu = new StringSelectMenuBuilder()
      .setCustomId(`prestige:rod/${interaction.user.id}`)
      .setPlaceholder('Choose one fishing rod to keep')
      .addOptions(
        fishingRodSelectOptions.length > 0
          ? fishingRodSelectOptions
          : [{ label: 'Training Rod', value: 'training_rod', description: `This is all you've got!`, emoji: { name: '🎣' } }]
      );

    const fishingRodSelectSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder().setContent('### Select a fishing rod to keep:')
      ])
      .setThumbnailAccessory(new ThumbnailBuilder({
        media: { url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png' }
      }));

    const fishingRodActionRow = new ActionRowBuilder().setComponents(fishingRodSelectMenu);

    const descriptionSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder().setContent(`# 🏅 Prestige`),
        new TextDisplayBuilder().setContent(`You've unlocked all available ponds! You can now prestige to reset your fishing XP and increase the worth of caught fish! Earning XP will also be faster.`),
        new TextDisplayBuilder().setContent(`Please select one fishing rod and one herb type to keep. **You will lose all other rods, herbs, and saved fish.**`),
      ]).setThumbnailAccessory(new ThumbnailBuilder({
        media: { url: 'https://minecraft.wiki/images/Hero_of_the_Village_JE1_BE2.png' }
      }));
    const separatorComponent = new SeparatorBuilder();
    const confirmationSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder().setContent(`🚨 **Careful!** You will lose all other rods, herbs, and saved fish.`)
      ]).setButtonAccessory(new ButtonBuilder()
        .setCustomId(`prestigeConfirm:${interaction.user.id}`)
        .setLabel('Prestige')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️')
      );

    const selectionContainer = new ContainerBuilder()
      .setAccentColor(resolveColor('Red'))
      .addSectionComponents(descriptionSection)
      .addSectionComponents(herbSelectSection)
      .addActionRowComponents(herbActionRow)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents(fishingRodSelectSection)
      .addActionRowComponents(fishingRodActionRow)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents(confirmationSection);

    return interaction.reply({
      components: [selectionContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  }
}