const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { checkLinked } = require('../../utils/roleCheckUtils');
const { queryDB } = require('../../utils/databaseUtils');
const { sendMCCommand, logRCON } = require('../../utils/rconUtils');

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
    const config = interaction.client.config;

    const user = interaction.options.getUser('user');
    if (user.bot) return interaction.reply({ content: 'You cannot vouch for a bot.', flags: MessageFlags.Ephemeral });

    const VoucherIsLinked = checkLinked(interaction.user);
    const VoucheeIsLinked = checkLinked(user);

    if (!VoucherIsLinked || !VoucheeIsLinked) return interaction.reply({ content: `Both users must link their accounts to vouch.`, flags: MessageFlags.Ephemeral });

    const vouchingAccount = interaction.user.id;
    const vouchingFor = user.id;

    if (vouchingAccount === vouchingFor) return interaction.reply({ content: 'Nice try! You cannot vouch for yourself.', flags: MessageFlags.Ephemeral });

    try {
      const griggyDatabaseDir = config.griggyDbPath;
      const cmiDatabaseDir = config.cmi_sqlite_db;

      const vouchingAccountRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingAccount], true);
      if (!vouchingAccountRow) return interaction.reply({ content: `Please wait up to 5 minutes and try again. User profile not setup yet.`, flags: MessageFlags.Ephemeral });

      const vouchedPlayerRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor], true);
      if (!vouchedPlayerRow) return interaction.reply({ content: `Please wait up to 5 minutes and try again. User profile not setup yet.`, flags: MessageFlags.Ephemeral });

      const vouchingForUUID = vouchedPlayerRow.minecraft_uuid;
      const hyphenatedVouchingForUUID = vouchingForUUID.replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        '$1-$2-$3-$4-$5'
      );

      const cmiQuery = 'SELECT username FROM users WHERE player_uuid = ?';
      const cmiRow = await queryDB(cmiDatabaseDir, cmiQuery, [hyphenatedVouchingForUUID], true);
      const vouchingForMCUsername = cmiRow ? cmiRow.username : null;

      if (!vouchingForMCUsername) return interaction.reply({ content: `Minecraft username not found for UUID: ${hyphenatedVouchingForUUID}.`, flags: MessageFlags.Ephemeral });

      if (vouchingAccountRow.vouchedIds && vouchingAccountRow.vouchedIds.includes(vouchingForUUID)) return interaction.reply({ content: `You have already vouched for <@${vouchingFor}>.`, flags: MessageFlags.Ephemeral });

      const updatedVouches = parseInt(vouchedPlayerRow.vouches) + 1;
      await queryDB(griggyDatabaseDir, 'UPDATE users SET vouches = ? WHERE minecraft_uuid = ?', [updatedVouches, vouchingForUUID]);

      const updatedVouchedIds = vouchingAccountRow.vouchedIds
        ? `${vouchingAccountRow.vouchedIds},${vouchingForUUID}`
        : vouchingForUUID;
      await queryDB(griggyDatabaseDir, 'UPDATE users SET vouchedIds = ? WHERE discord_id = ?', [updatedVouchedIds, vouchingAccount]);

      const vouchingForUser = await interaction.guild.members.fetch({ user: vouchingFor, force: true });
      const vouchingForUsername = vouchingForUser.displayName;
      const vouchingAccountUser = await interaction.guild.members.fetch({ user: vouchingAccount, force: true });
      const vouchingAccountUsername = vouchingAccountUser.displayName;

      const vouchEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Vouch')
        .setDescription(`${vouchingAccountUsername} has vouched for ${vouchingForUsername}!`)
        .setTimestamp()
        .setFooter({ text: 'GriggyBot' });

      await interaction.reply({ content: 'Success! Your vouch has been recorded.', flags: MessageFlags.Ephemeral });
      await interaction.channel.send({ embeds: [vouchEmbed] });

      const command = `cmi usermeta ${vouchingForMCUsername} increment points 1`;
      const response = await sendMCCommand(command);
      logRCON(command, response);
    } catch (err) {
      interaction.client.log('Error processing vouch:', 'ERROR', err);
      return interaction.reply({ content: 'An error occurred while processing your vouch. Please try again later.', flags: MessageFlags.Ephemeral });
    }
  }
};