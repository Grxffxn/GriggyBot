const { MessageFlags } = require('discord.js');
const { fishingRodData } = require('../../../fishingConfig.js');
const { queryDB } = require('../../../utils/databaseUtils.js');

module.exports = {
  customId: 'setFishingRod',
  /**
   *
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    if (args[0] !== interaction.user.id) {
      return interaction.reply({ content: 'This is not your menu!', flags: MessageFlags.Ephemeral });
    }
    const rodId = interaction.values[0].split(':')[0];
    if (rodId === 'none') return interaction.deferUpdate();
    await queryDB(interaction.client.config.griggyDbPath, 'UPDATE fishing SET selected_rod = ? WHERE discord_id = ?', [rodId, interaction.user.id]);
    return interaction.reply({
      content: `🎣 You have set your fishing rod to **${fishingRodData[rodId].name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
};
