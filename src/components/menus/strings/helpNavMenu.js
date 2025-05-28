const { MessageFlags, ContainerBuilder, ActionRowBuilder, StringSelectMenuBuilder, resolveColor } = require('discord.js');
const helpSections = require('../../../helpSections.js');

module.exports = {
  customId: 'help',
  /**
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    if (args[1] !== interaction.user.id) {
      return interaction.reply({ content: 'This is not your menu!', flags: MessageFlags.Ephemeral });
    }
    const selected = interaction.values[0]; // e.g., 'fishing_smoker'
    const container = interaction.message.components[0];

    // Build the updated container
    container.components[2] = helpSections[selected]();

    await interaction.update({
      components: [container],
    });
  }
};