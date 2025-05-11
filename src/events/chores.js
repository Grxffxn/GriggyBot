const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { checkLinked } = require('../utils/roleCheckUtils.js');
const { hyphenateUUID } = require('../utils/formattingUtils.js');
const { queryDB } = require('../utils/databaseUtils.js');
const { updateBalance } = require('../utils/gamblingUtils.js');
const fs = require('fs');
const path = require('path');

// This event will fire at 9AM server time once per day

// Function to choose a random chore and update the selected index in serverData.json
function chooseChore(client) {
  try {
    const filePath = path.join(__dirname, '../choreList.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const chores = fileContent.split('\n').filter(line => line.trim() !== '');

    // Read the existing serverData.json
    const serverDataPath = path.join(__dirname, '../serverData.json');
    let existingData = {};
    try {
      const rawData = fs.readFileSync(serverDataPath, 'utf8');
      existingData = JSON.parse(rawData);
    } catch (err) {
      client.log('No existing serverData.json found, starting fresh.', 'WARN');
    }

    const previousIndex = existingData.selectedChoreIndex ?? -1;

    // Select a new random chore index, ensuring it's not the same as the previous one
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * chores.length);
    } while (randomIndex === previousIndex && chores.length > 1);

    const randomChore = chores[randomIndex];
    const [description, reward] = randomChore.split(':');

    // Update the selected chore index in serverData.json
    existingData.selectedChoreIndex = randomIndex;
    fs.writeFileSync(serverDataPath, JSON.stringify(existingData, null, 4), 'utf8');

    return {
      description: description.trim(),
      reward: parseInt(reward.trim(), 10),
      index: randomIndex,
    };
  } catch (err) {
    client.log('Error reading or parsing choreList.txt:', 'ERROR', err);
    return null;
  }
}

function choreToEmbed(dailyChore, dailyReward, selectedIndex, client) {
  const config = client.config;
  try {
    const choreEmbed = new EmbedBuilder()
      .setTitle('Daily Chore')
      .setDescription(`Today's chore is **${dailyChore}**.\nComplete this chore and send proof to earn **$${dailyReward}** in-game.`)
      .setColor(config.defaultColor)
      .setFooter({ text: 'Use `!chore` to submit your proof' });

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`redrawChore:${selectedIndex}`)
        .setLabel('Redraw')
        .setStyle(ButtonStyle.Primary)
    );

    return { embed: choreEmbed, components: [actionRow] };
  } catch (err) {
    client.log('Error formatting chore message:', 'ERROR', err);
    return null;
  }
}

module.exports = async (client) => {
  const config = client.config;
  const choreChannel = client.channels.cache.get(config.choreChannelId);
  if (!choreChannel) return client.log('Chore channel not found >.<', 'ERROR');

  const { description, reward, selectedIndex } = chooseChore(client);
  if (!description || !reward) return client.log('Failed to select a daily chore/reward >.<', 'ERROR');

  const { embed, components } = choreToEmbed(description, reward, selectedIndex, client);
  if (!embed) return client.log('Failed to generate the chore embed >.<', 'ERROR');

  await choreChannel.send({ embeds: [embed], components })
    .catch(err => client.log('Failed to send the chore embed >.<', 'ERROR', err));
};

module.exports.handleRedraw = async (interaction, args) => {
  const client = interaction.client;
  try {
    const previousIndex = args[0];
    const { description, reward, index } = chooseChore(client);
    if (!description || !reward) {
      client.log('Failed to select a daily chore/reward >.<', 'ERROR');
      return interaction.reply({ content: 'Failed to select a daily chore/reward >.<', flags: MessageFlags.Ephemeral });
    }

    const { embed, components } = choreToEmbed(description, reward, index, client);
    if (!embed) {
      client.log('Failed to generate the chore embed >.<', 'ERROR');
      return interaction.reply({ content: 'Failed to generate the chore embed >.<', flags: MessageFlags.Ephemeral });
    }
    embed.setFooter({ text: `${interaction.member.nickname || interaction.user.globalName} reselected today's chore`, iconURL: interaction.member.displayAvatarURL() });

    await interaction.update({ embeds: [embed], components });
  } catch (err) {
    client.log('Error handling chore redraw:', 'ERROR', err);
    return interaction.reply({ content: 'An error occurred while redrawing the chore.', flags: MessageFlags.Ephemeral });
  }
}

module.exports.handleChoreApproval = async (interaction, submitterUserId, choreReward) => {
  try {
    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const approver = interaction.member;

    const message = await interaction.message.fetch();
    const embed = message.embeds[0];

    const updatedEmbed = EmbedBuilder.from(embed).setFooter({
      text: `Approved by ${interaction.member.nickname || interaction.user.globalName}`,
      iconURL: approver.user.displayAvatarURL()
    });

    await message.edit({ embeds: [updatedEmbed], components: [] });

    // Fetch submitter
    const submitter = await interaction.guild.members.fetch(submitterUserId)
    if (!submitter) {
      interaction.client.log(`Submitter ${submitterUserId} not found.`, 'ERROR');
      return interaction.reply({ content: 'Couldn\'t find the submitter. Did they leave the server?', flags: MessageFlags.Ephemeral });
    }

    // Get linked MC username
    const userRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [submitterUserId], true);
    if (!userRow || !userRow.minecraft_uuid) {
      interaction.client.log(`UUID retrieval failed for ${submitterUserId}`, 'ERROR');
      return interaction.reply({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
    }
    const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);

    const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
    if (!playerData) {
      interaction.client.log(`PlayerData retrieval failed for UUID ${hyphenateUUID}`, 'ERROR');
      return interaction.reply({ content: 'Error: PlayerData retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
    }

    const submitterUsername = playerData.username;

    // Check if the user is linked
    const isLinked = checkLinked(submitter);
    if (isLinked) {
      const command = `cmi money give ${submitterUsername} ${choreReward}`;
      await updateBalance(interaction, command);
      await interaction.reply({ content: `Successfully approved ${submitter}'s chore submission!`, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: `${submitter}, your submission was approved but you weren't rewarded any in-game currency because your accounts are not linked. For information on how to link, run \`/link\` on Discord.` });
    }
  } catch (err) {
    interaction.client.log('Error in handleChoreApproval:', 'ERROR', err);
    await interaction.reply({ content: 'An unexpected error occurred while processing the chore approval. Please contact an admin.', flags: MessageFlags.Ephemeral });
  }
}