const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleRole',
  /**
   *
   * @param {import('discord.js').RoleSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Menu Selected:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: 'You selected an example role!',
      flags: MessageFlags.Ephemeral
    });
  }
};
