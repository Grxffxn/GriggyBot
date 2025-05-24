const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { checkLinked } = require('../../utils/roleCheckUtils');
const { Vouch } = require('../../events/vouchEvent.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Vouch for a player')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to vouch for')
        .setRequired(true)
    ),
  async run(interaction) {
    const user = interaction.options.getUser('user');
    if (user.bot) return interaction.reply({ content: 'You cannot vouch for a bot.', flags: MessageFlags.Ephemeral });

    const VoucheeIsLinked = checkLinked(user);
    if (!VoucheeIsLinked) return interaction.reply({ content: `Both users must link their accounts to vouch.`, flags: MessageFlags.Ephemeral });

    const vouchingAccount = interaction.user.id;
    const vouchingFor = user.id;
    if (vouchingAccount === vouchingFor) return interaction.reply({ content: 'Nice try! You cannot vouch for yourself.', flags: MessageFlags.Ephemeral });

    await Vouch(interaction, vouchingFor);
  }
};