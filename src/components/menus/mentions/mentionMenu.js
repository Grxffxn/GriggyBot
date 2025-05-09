const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'exampleMentionable',
  /**
   *
   * @param {import('discord.js').MentionableSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    console.log('Menu Selected:', interaction.customId);
    console.log('Arguments:', args);
    await interaction.reply({
      content: 'You selected an example mentionable!',
      flags: MessageFlags.Ephemeral
    });
  }
};
