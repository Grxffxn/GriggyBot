const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleButton',
  /**
   *
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Button clicked:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: 'You clicked the example button!',
      flags: MessageFlags.Ephemeral
    });
  }
};
