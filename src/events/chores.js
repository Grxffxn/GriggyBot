const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
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