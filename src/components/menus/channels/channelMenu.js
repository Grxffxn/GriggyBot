const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleChannel',
  /**
   *
   * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Menu Selected:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: 'You selected an example channel!',
      flags: MessageFlags.Ephemeral
    });
  }
};
