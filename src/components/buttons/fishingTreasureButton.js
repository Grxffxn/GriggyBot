const { MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { hyphenateUUID } = require('../../utils/formattingUtils.js');
const { updateBalance } = require('../../utils/gamblingUtils.js');
const { treasureRewards } = require('../../fishingConfig.js');
const { addUserDailyEarnings } = require('../../utils/fishingUtils.js');

module.exports = {
  customId: 'fishingTreasure',
  run: async (interaction, args) => {
    const config = interaction.client.config;
    const selectedReward = args[0];
    const userId = args[1];

    const containerComponent = interaction.message.components[0];
    const filteredComponents = containerComponent.components.filter(
      comp => comp.constructor.name !== 'ActionRow'
    );
    containerComponent.components = filteredComponents;
    await interaction.update({ components: [containerComponent] });

    // Generate reward value
    const rewardConfig = treasureRewards[selectedReward];
    if (!rewardConfig) return interaction.followUp({ content: `Fishing treasure reward ${selectedReward} has not been properly setup yet!`, flags: MessageFlags.Ephemeral });
    const rewardValue = Math.floor(Math.random() * (rewardConfig.maxValue - rewardConfig.minValue + 1)) + rewardConfig.minValue;

    let username;
    // Get username from CMI database
    try {
      const userRow = await queryDB(config.griggyDbPath, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], true);
      if (!userRow || !userRow.minecraft_uuid) {
        return interaction.followUp({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
      }
      const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);
      const playerData = await queryDB(config.cmi_sqlite_db, 'SELECT username FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
      if (!playerData || !playerData.username) {
        return interaction.followUp({ content: 'Error: Username retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
      }
      username = playerData.username;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return interaction.followUp({ content: 'Error: User data retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
    }

    let command;
    if (rewardConfig.command) {
      if (selectedReward === 'money') {
        await addUserDailyEarnings(interaction.client.config.griggyDbPath, userId, "collectedTreasureMoney", rewardValue);
      }
      command = rewardConfig.command
        .replace('{{username}}', username)
        .replace('{{rewardValue}}', rewardValue);
      await updateBalance(interaction, command);
    } else if (selectedReward === 'fishxp') {
      await queryDB(config.griggyDbPath, 'UPDATE fishing SET xp = xp + ? WHERE discord_id = ?', [rewardValue, userId]);
    }

    await interaction.followUp({
      content: `You have received **${rewardConfig.emoji} ${rewardValue} ${rewardConfig.displayName}**!`,
      flags: MessageFlags.Ephemeral
    });
  }
}