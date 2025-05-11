const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const { queryDB } = require('../../utils/databaseUtils.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('View Minecraft player information')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Minecraft Username')
        .setRequired(true)),

  async run(interaction) {

    function formatDuration(milliseconds) {
      const totalMinutes = Math.floor(milliseconds / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours} hours ${minutes} minutes`;
    }

    await interaction.deferReply();

    try {
      const config = interaction.client.config;
      const griggyDatabaseDir = config.griggyDbPath;
      const cmiDatabasePath = config.cmi_sqlite_db;
      const luckPermsDatabasePath = config.luckperms_sqlite_db;

      const username = interaction.options.getString('username');
      const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${username}?prefix=.`);

      if (!data) return interaction.reply({ content: 'Invalid username, or Mojang\'s API is down.', flags: MessageFlags.Ephemeral });

      const trimmedUUID = data.id;

      const query = `
                SELECT users.*, daily_streaks.streak 
                FROM users 
                LEFT JOIN daily_streaks ON users.discord_id = daily_streaks.user_id 
                WHERE users.minecraft_uuid = ?
            `;
      const [row, result1, result2] = await Promise.all([
        queryDB(griggyDatabaseDir, query, [trimmedUUID], true),
        queryDB(cmiDatabasePath, 'SELECT * FROM `users` WHERE LOWER(`username`) = LOWER(?)', [username], true),
        queryDB(luckPermsDatabasePath, 'SELECT `primary_group` FROM `luckperms_players` WHERE LOWER(`username`) = LOWER(?)', [username], true)
      ]);

      let vouchButton;
      if (row) {
        vouchButton = new ButtonBuilder()
          .setCustomId(`vouchButton:${row.discord_id}`)
          .setLabel('Vouch')
          .setStyle('Success');
      } else {
        vouchButton = new ButtonBuilder()
          .setCustomId('unlinkedVouchButton')
          .setLabel('Cannot Vouch')
          .setStyle('Secondary')
          .setDisabled(true);
      }

      const vouchRow = new ActionRowBuilder().addComponents(vouchButton);

      const streak = row?.streak || 0;
      const primary_group = result2?.primary_group?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown';
      const balance = result1?.Balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'Unknown';
      const finalPlayTime = result1 ? formatDuration(result1.TotalPlayTime) : 'Unknown';
      const userMetaValue = (result1?.UserMeta || '').split('%%')[1] || '0';
      const points = parseFloat(userMetaValue || '0');
      const vouches = parseFloat(row?.vouches || '0');
      const rankPoints = points - vouches;

      const embed = new EmbedBuilder()
        .setTitle(row?.profile_title || `${username}'s Profile`)
        .setDescription(`**Username:** ${username}\n**Current Rank:** ${primary_group}\n**Total Playtime:** ${finalPlayTime}\n**Current Balance:** $${balance}\n\n${row?.profile_description || 'No bio.'}\n-+--+---+---+--+-`)
        .setColor(row?.profile_color || '391991')
        .setThumbnail(row?.profile_image || `https://visage.surgeplay.com/bust/256/${trimmedUUID}`);

      const fields = [
        ...(config.enableVouch ? [{ name: 'Vouches', value: vouches.toString(), inline: true }] : []),
        ...(config.enableRankPoints ? [{ name: 'Rank Points', value: rankPoints.toString(), inline: true }] : []),
        ...(config.enableVouch && config.enableRankPoints ? [{ name: 'Total Points', value: points.toString(), inline: true }] : []),
        ...(config.enableDaily && streak ? [{ name: 'Daily Streak', value: streak.toString(), inline: true }] : []),
        { name: 'Discord Account', value: row?.discord_id ? `<@${row.discord_id}>` : 'Not Linked', inline: true },
        { name: 'Favorite Game', value: row?.favorite_game || 'Minecraft', inline: true }
      ];

      embed.addFields(fields);

      if (config.enableVouch) {
        await interaction.editReply({ embeds: [embed], components: [vouchRow] });
      } else {
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      interaction.client.log('/info command failure:', 'ERROR', err);
      interaction.editReply({ content: 'Command failed. Try again or contact an admin.', flags: MessageFlags.Ephemeral });
    }
  }
};