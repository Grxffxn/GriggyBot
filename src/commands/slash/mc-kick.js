const { queryDB } = require('../../utils/databaseUtils.js');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { checkLinked, checkStaff } = require('../../utils/roleCheckUtils.js');
const { sendMCCommand, logRCON } = require('../../utils/rconUtils');
const { hyphenateUUID } = require('../../utils/formattingUtils.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mc-kick')
    .setDescription('Kick a player from the Minecraft server.')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for kicking the user')
        .setRequired(false)),

  async run(interaction) {
    const client = interaction.client;
    const config = client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const usernameToKick = interaction.options.getString('username');
    const reason = interaction.options.getString('reason') || `Kicked from Discord by ${interaction.member.displayName}`;
    const command = `kick ${usernameToKick} ${reason}`;
    
    // Check if the kickingUser is staff
    const isStaff = checkStaff(interaction.member);
    if (!isStaff) {
      // Check if the user is linked and is kicking themselves
      const isLinked = checkLinked(interaction.member);
      if (isLinked) {
        // Get their username from CMI's database via their linked uuid
        const griggyRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [interaction.user.id], true);
        if (!griggyRow || !griggyRow.minecraft_uuid) {
          return interaction.reply({ content: 'You must link your account to use this command.', flags: MessageFlags.Ephemeral });
        }
        const hyphenatedUUID = hyphenateUUID(griggyRow.minecraft_uuid);
        const cmiRow = await queryDB(cmiDatabaseDir, 'SELECT username FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
        if (!cmiRow || !cmiRow.username) {
          return interaction.reply({ content: 'Error retrieving your username. You may need to contact an admin for help resolving this.', flags: MessageFlags.Ephemeral });
        }
        if (cmiRow.username.toLowerCase() !== usernameToKick.toLowerCase()) {
          return interaction.reply({ content: `You can only kick yourself, not others. Your username is ${cmiRow.username}.`, flags: MessageFlags.Ephemeral });
        }
        // Passed checks, user is kicking themselves
        const response = await sendMCCommand(command);
        await logRCON(command, response);
        return interaction.reply({
          content: `You have kicked yourself from the Minecraft server for "${reason}"\n-# If you're not online, nothing will happen.`,
          flags: MessageFlags.Ephemeral
        });
      } else {
        return interaction.reply({ content: 'You must `/link` your account to use this command.', flags: MessageFlags.Ephemeral });
      }
    } else {
      // Staff do not need to be linked
      const response = await sendMCCommand(command);
      await logRCON(command, response);
      return interaction.reply({
        content: `Kicked ${usernameToKick} from the Minecraft server for "${reason}"\n-# If they're not online, nothing will happen.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};