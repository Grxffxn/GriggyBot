const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleModal',
  /**
   *
   * @param {import('discord.js').ModalSubmitInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Modal Submitted:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: 'You submitted the example modal!',
      flags: MessageFlags.Ephemeral
    });
  }
};
