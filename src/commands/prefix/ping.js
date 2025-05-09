const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Ping the bot to check if it is alive.',
  /**
   *
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  run: async (client, message, args) => {
    await message.reply({
      content: 'Pong! 🏓',
      components: [
        new ActionRowBuilder({
          components: [
            new ButtonBuilder().setCustomId('exampleButton').setLabel('Click me!').setStyle(ButtonStyle.Primary)
          ]
        }),
        new ActionRowBuilder({
          components: [
            new StringSelectMenuBuilder()
              .setCustomId('exampleStringMenu')
              .setPlaceholder('Select an option')
              .addOptions([
                {
                  label: 'Option 1',
                  value: 'option1'
                },
                {
                  label: 'Option 2',
                  value: 'option2'
                }
              ])
          ]
        })
      ]
    });
  }
};
