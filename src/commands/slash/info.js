const {
  SlashCommandBuilder,
  ButtonBuilder,
  MessageFlags,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
} = require('discord.js');
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
      let data;
      try {
        const response = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${username}?prefix=.`);
        data = response.data;
      } catch (err) {
        return interaction.editReply({ content: 'Invalid username, or Mojang\'s API is down.', flags: MessageFlags.Ephemeral });
      }

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

      const customizeProfileButtonComponent = new ButtonBuilder()
        .setCustomId(`tryMeButton:profile`)
        .setLabel('Edit Profile')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎨');

      const streak = row?.streak || 0;
      const primary_group = result2?.primary_group?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown';
      const balance = result1?.Balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'Unknown';
      const finalPlayTime = result1 ? formatDuration(result1.TotalPlayTime) : 'Unknown';
      const userMetaValue = (result1?.UserMeta || '').split('%%')[1] || '0';
      const points = parseFloat(userMetaValue || '0');
      const vouches = parseFloat(row?.vouches || '0');

      const container = new ContainerBuilder()
        .setAccentColor(row?.profile_color ? resolveColor(row.profile_color) : resolveColor('391991'));
      const titleText = new TextDisplayBuilder()
        .setContent(row?.profile_title || `${username}'s Profile`);
      const contentText = new TextDisplayBuilder();
      const rankPointsText = new TextDisplayBuilder();
      const extraInfoText = new TextDisplayBuilder();
      const vouchButton = new ButtonBuilder();
      const playerDataSectionComponent = new SectionBuilder();
      const rankPointsSectionComponent = new SectionBuilder();
      const extraInfoSectionComponent = new SectionBuilder();
      const thumbnailComponent = new ThumbnailBuilder({
        media: {
          url: row?.profile_image || `https://visage.surgeplay.com/bust/256/${trimmedUUID}`,
        }
      });
      const separatorComponent = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);
      if (row) {
        contentText.setContent(`**Username:** ${username}\n**Current Rank:** ${primary_group}\n**Total Playtime:** ${finalPlayTime}\n**Current Balance:** $${balance}\n\n${row?.profile_description || 'No bio.'}`);
        rankPointsText.setContent(`**Rank Points:** ${points.toString()}${config.enableVouch ? ` (${vouches.toString()} ${vouches === 1 ? 'Vouch' : 'Vouches'})` : ''}`);
        extraInfoText.setContent(`**Discord Account:** <@${row.discord_id}>\n**Favorite Game:** ${row.favorite_game || 'Minecraft'}${(config.enableDaily && row?.streak) ? `\n**Daily Streak:** ${streak.toString()}` : ''}`);
        vouchButton.setCustomId(`vouchButton:${row.discord_id}`)
          .setLabel('Vouch')
          .setStyle('Success');
        playerDataSectionComponent.addTextDisplayComponents([titleText, contentText])
          .setThumbnailAccessory(thumbnailComponent);
        rankPointsSectionComponent.addTextDisplayComponents([rankPointsText])
          .setButtonAccessory(vouchButton);
        extraInfoSectionComponent.addTextDisplayComponents([extraInfoText])
          .setButtonAccessory(customizeProfileButtonComponent);
        if (config.enableRankPoints) {
          container.addSectionComponents([playerDataSectionComponent]);
          container.addSeparatorComponents([separatorComponent]);
          container.addSectionComponents([rankPointsSectionComponent]);
          container.addSeparatorComponents([separatorComponent]);
          container.addSectionComponents([extraInfoSectionComponent]);
        } else {
          container.addSectionComponents([playerDataSectionComponent]);
          container.addSeparatorComponents([separatorComponent]);
          container.addSectionComponents([extraInfoSectionComponent]);
        }
      } else {
        contentText.setContent(`**Username:** ${username}`);
        playerDataSectionComponent.addTextDisplayComponents([titleText, contentText])
          .setThumbnailAccessory(thumbnailComponent);
        container.addSectionComponents([playerDataSectionComponent]);
      }

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      interaction.client.log('/info command failure:', 'ERROR', err);
      interaction.editReply({ content: 'Command failed. Try again or contact an admin.', flags: MessageFlags.Ephemeral });
    }
  }
};