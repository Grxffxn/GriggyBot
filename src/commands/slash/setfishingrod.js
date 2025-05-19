const { ActionRowBuilder, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { fishingRodData } = require('../../fishingConfig.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setfishingrod')
    .setDescription('Set your fishing rod'),
  run: async (interaction) => {
    const fishermanRow = await queryDB(interaction.client.config.griggyDbPath, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
    if (!fishermanRow) return interaction.reply({ content: 'You haven\'t gone fishin\' yet! Use `/fish` to start.', flags: MessageFlags.Ephemeral });

    const ownedRods = (fishermanRow.fishing_rod || '').split(',').map(rod => rod.trim()).filter(Boolean);
    const availableRodOptions = Object.entries(fishingRodData)
      .filter(([key]) => ownedRods.includes(key))
      .map(([key, value]) => ({
        label: value.name,
        value: `${key}:${interaction.user.id}`,
        description: value.description,
        emoji: { name: '🎣' },
      }));
    const rodSelectOptions = availableRodOptions.length > 1
      ? availableRodOptions
      : [
          {
            label: 'You\'ve only got one!',
            value: 'none',
            description: 'No other fishing rods available.',
            emoji: { name: '❌' },
            default: true,
          },
        ];
    const fishingRodSelectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`setFishingRod:${interaction.user.id}`)
          .setPlaceholder('Select a fishing rod to use')
          .addOptions(rodSelectOptions)
      );

    await interaction.reply({
      components: [fishingRodSelectMenu],
      flags: MessageFlags.Ephemeral,
    })

  },
};