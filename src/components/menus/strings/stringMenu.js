const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleStringMenu',
  /**
   *
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Menu Selected:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: `You selected example string option: ${interaction.values[0]}!`,
      flags: MessageFlags.Ephemeral
    });
  }
};
