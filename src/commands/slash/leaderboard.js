const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');

const MESSAGES = {
  NO_DATA: 'No data found in the leaderboard.',
  QUERY_ERROR: 'An error occurred while querying the leaderboard.',
};

async function getLeaderboardData(databasePath, query) {
  const rows = await queryDB(databasePath, query);
  if (!rows || rows.length === 0) {
    throw new Error(MESSAGES.NO_DATA);
  }
  return rows;
}

function createLeaderboardEmbed(config, type, description) {
  return new EmbedBuilder()
    .setTitle(`${config.serverAcronym || config.serverName} | ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
    .setColor(config.defaultColor)
    .setDescription(description)
    .setThumbnail(config.logoImageUrl);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the rank score leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The type of leaderboard to view')
        .addChoices(
          { name: 'Playtime', value: 'playtime' },
          { name: 'Money', value: 'money' },
          { name: 'Streak', value: 'streak' },
          { name: 'Fishing', value: 'fishing' },
        )
        .setRequired(false)),
  async run(interaction) {
    const config = interaction.client.config;
    const leaderboardType = interaction.options.getString('type') || 'playtime';
    const cmiDatabasePath = config.cmi_sqlite_db;
    const griggyDatabasePath = config.griggyDbPath;

    let leaderboardQuery;
    let databasePath;

    try {
      switch (leaderboardType) {
        case 'playtime':
          leaderboardQuery = `
            SELECT username, TotalPlayTime
            FROM users
            ORDER BY TotalPlayTime DESC
            LIMIT 10`;
          databasePath = cmiDatabasePath;
          break;

        case 'money':
          leaderboardQuery = `
            SELECT username, Balance
            FROM users
            WHERE username NOT LIKE 'town-%'
            ORDER BY Balance DESC
            LIMIT 10`;
          databasePath = cmiDatabasePath;
          break;

        case 'streak':
          leaderboardQuery = `
            SELECT user_id, streak
            FROM daily_streaks
            ORDER BY streak DESC
            LIMIT 10`;
          databasePath = griggyDatabasePath;
          break;
        
        case 'fishing':
          leaderboardQuery = `
            SELECT discord_id, xp
            FROM fishing
            ORDER BY xp DESC
            LIMIT 10`;
          databasePath = griggyDatabasePath;
          break;
      }

      const rows = await getLeaderboardData(databasePath, leaderboardQuery);

      const leaderboardDescription = rows
        .map((row, index) => {
          switch (leaderboardType) {
            case 'playtime':
              return `${index + 1}. ${row.username} - ${(row.TotalPlayTime / 3600000).toFixed(2)} hours`;
            case 'money':
              return `${index + 1}. ${row.username} - $${row.Balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            case 'streak':
              return `${index + 1}. <@${row.user_id}> - ${row.streak} days`;
            case 'fishing':
              return `${index + 1}. <@${row.discord_id}> - ${row.xp} XP`;
          }
        })
        .join('\n');

      const embed = createLeaderboardEmbed(config, leaderboardType, leaderboardDescription);

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      interaction.client.log(`An error occurred while querying the ${leaderboardType} leaderboard:`, 'ERROR', err);
      return interaction.reply({ content: MESSAGES.QUERY_ERROR, flags: MessageFlags.Ephemeral });
    }
  },
};