const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { fishData, fishingRodData, herbList } = require('../../fishingConfig.js');
const {
  getFlatFishIdMap,
  parseFishInventory,
  parseHerbInventory,
} = require('../../utils/fishingUtils.js');
const flatFishMap = getFlatFishIdMap(fishData);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your fishing inventory'),
  async run(interaction) {
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
      return interaction.reply({ content: 'You must `/link` your accounts and start fishing with `/fish` to do this!', flags: MessageFlags.Ephemeral });
    }

    const fishInventory = parseFishInventory(griggyPlayerData.inventory);

    const fishInventoryString = [
      ...Object.entries(fishInventory.regular)
        .map(([fishId, count]) => {
          const fish = flatFishMap[fishId];
          return fish ? `${fish.name}: ${count}` : `Unknown Fish (${fishId}): ${count}`;
        }),
      ...Object.entries(fishInventory.smoked)
        .map(([fishId, count]) => {
          const fish = flatFishMap[fishId];
          return fish ? `Smoked ${fish.name}: ${count}` : `Unknown Smoked Fish (${fishId}): ${count}`;
        })
    ].join('\n'); const herbInventory = parseHerbInventory(griggyPlayerData.spices);
    const herbInventoryString = Object.entries(herbInventory)
      .map(([herbId, count]) => {
        const herb = herbList.find(h => String(h.id) === String(herbId));
        return herb ? `${herb.name}: ${count}` : `Unknown Herb (${herbId}): ${count}`;
      })
      .join('\n');

    const ownedRods = (griggyPlayerData.fishing_rod || '').split(',').map(rod => rod.trim()).filter(Boolean);
    const availableRodOptions = Object.entries(fishingRodData)
      .filter(([key]) => ownedRods.includes(key))
      .map(([key, value]) => ({
        label: value.name,
        value: `${key}:${interaction.user.id}`,
        description: value.description,
        emoji: { name: '🎣' },
        default: key === griggyPlayerData.selected_rod,
      }));
    const rodSelectOptions = availableRodOptions.length > 1
      ? availableRodOptions
      : [
        {
          label: fishingRodData[griggyPlayerData.selected_rod].name,
          value: `none:${interaction.user.id}`,
          description: fishingRodData[griggyPlayerData.selected_rod].description,
          emoji: { name: '🎣' },
          default: true,
        },
      ];
    const fishingRodSelectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`setFishingRod:${interaction.user.id}`)
          .setPlaceholder('View your fishing rods')
          .addOptions(rodSelectOptions)
      );

    const inventoryContainer = new ContainerBuilder()
      .setAccentColor(resolveColor(griggyPlayerData.profile_color || config.defaultColor));

    const separatorComponent = new SeparatorBuilder();

    const titleSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder()
          .setContent(`### ${interaction.member.displayName}'s Fishing Inventory`),
        new TextDisplayBuilder()
          .setContent(`**Level:** ${griggyPlayerData.prestige_level}\n**XP:** ${griggyPlayerData.xp}\n**Total Fish Caught:** ${griggyPlayerData.lifetime_fish_caught}`),
      ]).setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: griggyPlayerData.profile_image || interaction.member.displayAvatarURL(),
          },
        })
      );

    const fishSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder()
          .setContent('### Fish Inventory'),
        new TextDisplayBuilder()
          .setContent(fishInventoryString || 'No fish in inventory.')
      ]).setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Raw_Salmon_JE2_BE2.png',
          },
        })
      );

    const herbSection = new SectionBuilder()
      .addTextDisplayComponents([
        new TextDisplayBuilder()
          .setContent('### Herb Inventory'),
        new TextDisplayBuilder()
          .setContent(herbInventoryString || 'No herbs in inventory.')
      ]).setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Seagrass_JE1_BE2.gif',
          },
        })
      );

    const fishingRodSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent('### Fishing Rods')
      ).setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png',
          },
        })
      );

    inventoryContainer.addSectionComponents(titleSection)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents(fishSection)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents(herbSection)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents(fishingRodSection)
      .addActionRowComponents(fishingRodSelectMenu);

    return interaction.reply({
      components: [inventoryContainer],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  },
}