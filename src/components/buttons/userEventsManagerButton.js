const { endEvent } = require('../../utils/trackActiveEvents.js');
const { MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, resolveColor } = require('discord.js');

module.exports = {
  customId: 'adminUserEventsEndAllButton',
  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    const targetedUserId = args[1];

    endEvent(targetedUserId, null);

    const confirmationContainer = new ContainerBuilder().setAccentColor(resolveColor('Green'))
      .addSectionComponents(new SectionBuilder().addTextDisplayComponents([
        new TextDisplayBuilder().setContent(`✅ Ended all events for <@${targetedUserId}>`),
        new TextDisplayBuilder().setContent('Typically, you shouldn\'t need to use this command. Please report any bugs with ending events to [my GitHub](https://github.com/Grxffxn/GriggyBot/issues) 🐛')
      ]).setThumbnailAccessory({ media: { url: interaction.client.config.logoImageUrl } }));
    return interaction.update({ components: [confirmationContainer] });
  }
}