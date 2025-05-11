const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../utils/databaseUtils.js');
const axios = require('axios');

let applicantInfo = {
  answers: [],
  row: {},
  vouches: 0,
  userPoints: 0,
  thumbnailUrl: '',
  playerUUID: '',
  playerName: '',
  rank: '',
};

function createElements(type, interaction) {
  const config = interaction.client.config;
  const ranks = config.ranks;
  const rankConfig = ranks.find(r => r.name === applicantInfo.rank);
  switch (type) {
    case 'submissionButtons':
      const buttonRow = new ActionRowBuilder();
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`approveApplication:${interaction.user.id}/${applicantInfo.rank}`)
          .setLabel(`Approve (0/${rankConfig.requiredStaffApprovals})`)
          .setStyle('Primary')
      );
      if (config.enableVouch) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`vouchButton:${interaction.user.id}`)
            .setLabel(`Vouch (${applicantInfo.vouches} Received)`)
            .setStyle('Success')
        );
      }
      if (config.enableRankPoints) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId('accumulatedPts')
            .setLabel(`Points: ${applicantInfo.userPoints}/${rankConfig.requiredPoints}`)
            .setStyle('Secondary')
            .setDisabled()
        );
      }
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`refreshApplication:${interaction.user.id}/${applicantInfo.rank}`)
          .setLabel('Refresh')
          .setStyle('Secondary')
      );
      return buttonRow;
    case 'submissionEmbeds':
      const questions = config.applicationQuestions;
      const applicationEmbed = new EmbedBuilder()
        .setTitle(`📌 ${applicantInfo.playerName}'s ${applicantInfo.rank.replace(/^./, char => char.toUpperCase())} Application`)
        .setColor(rankConfig.color)
        .setThumbnail(applicantInfo.thumbnailUrl)
        .addFields({ name: '📄 Application Form', value: questions.map((q, i) => `**${q}**\n${applicantInfo.answers[i]}`).join('\n-=+=- -=+=- -=+=-\n') })
        .setFooter({ text: `Application submitted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
      const profileEmbed = new EmbedBuilder()
        .setTitle(applicantInfo.row.profile_title || applicantInfo.playerName)
        .setColor(applicantInfo.row.profile_color)
        .setDescription(applicantInfo.row.profile_description)
        .setThumbnail(applicantInfo.row.profile_image)
        .addFields({ name: 'Favorite Game', value: applicantInfo.row.favorite_game });
      return [applicationEmbed, profileEmbed];
  }
}

async function fetchPlayerData(interaction, playerName, rank, answers) {
  const config = interaction.client.config;
  applicantInfo.answers = answers;
  applicantInfo.playerName = playerName;
  applicantInfo.rank = rank;

  // Fetch player UUID
  try {
    const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${playerName}?prefix=.`);
    if (!data) throw new Error('Player not found.');

    applicantInfo.playerUUID = data.id.replace(/-/g, '');
    applicantInfo.thumbnailUrl = `https://visage.surgeplay.com/bust/256/${applicantInfo.playerUUID}`;
  } catch (err) {
    if (err.response?.status === 404) {
      return interaction.followUp({ content: `Player "${playerName}" not found.\n-# Note: Usernames are case-sensitive.`, flags: MessageFlags.Ephemeral });
    } else {
      return interaction.followUp({ content: 'An error occurred while fetching player data. Please try again later.', flags: MessageFlags.Ephemeral });
    }
  }

  // Retrieve data from the databases
  try {
    applicantInfo.row = await queryDB(config.griggyDbPath, 'SELECT * FROM users WHERE minecraft_uuid = ?', [applicantInfo.playerUUID], true);
    if (!applicantInfo.row) {
      return interaction.followUp({ content: `Player "${playerName}" not found in the database. Have you \`/link\`ed your accounts?\n-# Note: Usernames are case-sensitive.`, flags: MessageFlags.Ephemeral });
    }
    // Check if the interaction user's id matches the Minecraft UUID in the database
    if (applicantInfo.row.discord_id !== interaction.user.id) {
      return interaction.followUp({ content: `Wait! Your Discord account is not linked to ${playerName}. An impostor is among us...\n-# Contact an Admin for help resolving this.`, flags: MessageFlags.Ephemeral });
    }
    applicantInfo.userPoints = await queryDB(config.cmi_sqlite_db, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [playerName], true)
      .then(row => parseFloat((row?.UserMeta || '').split('%%')[1], 10) || 0);
  } catch (err) {
    interaction.client.log('An error occurred while fetching player data from the database:', 'ERROR', err);
    return interaction.followUp({ content: 'An error occurred while fetching player data from the database. Please try again later.', flags: MessageFlags.Ephemeral });
  }

  applicantInfo.vouches = parseInt(applicantInfo.row.vouches || 0, 10);
  await finalizeApplicationProcess(interaction);
}

async function finalizeApplicationProcess(interaction) {
  const config = interaction.client.config;
  const mcChatChannel = interaction.guild.channels.cache.find(c => c.id === config.mcChatChannelId);
  const submissionChannel = interaction.guild.channels.cache.get(config.rankSubmissionChannelId);
  // Create buttons dynamically based on config
  const buttonRow = createElements('submissionButtons', interaction);

  // Send application to submission channel
  const thread = await submissionChannel.threads.create({
    name: `${applicantInfo.playerName}'s ${applicantInfo.rank.replace(/^./, char => char.toUpperCase())} Application`,
    autoArchiveDuration: 4320,
  });
  if (thread.joinable && interaction.guild.members.me.permission.has('MANAGE_THREADS')) await thread.join();

  const [applicationEmbed, profileEmbed] = createElements('submissionEmbeds', interaction);
  const sentMessage = await thread.send({ content: `${interaction.user}`, embeds: [applicationEmbed, profileEmbed], components: [buttonRow] });

  // Save application to database
  await queryDB(config.griggyDbPath, 'INSERT INTO applications (message_id, player_name, role, answers, status, discord_id, approvals, thread_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [
    sentMessage.id,
    applicantInfo.playerName,
    applicantInfo.rank,
    JSON.stringify(applicantInfo.answers),
    'active',
    interaction.user.id,
    thread.id,
  ]);

  // Notify in-game chat about a new application
  if (mcChatChannel && config.enableApplicationNotifications) await mcChatChannel.send(`${applicantInfo.playerName} just submitted a ${applicantInfo.rank.replace(/^./, char => char.toUpperCase())} application!`);
  await interaction.followUp({ content: `Your **${applicantInfo.rank}** application has been submitted!`, flags: MessageFlags.Ephemeral });
}

module.exports = { fetchPlayerData };