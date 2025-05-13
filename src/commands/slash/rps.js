const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { formatNumber, hyphenateUUID } = require('../../utils/formattingUtils.js');
const { checkEnoughBalance, checkCooldown, setCooldown, updateBalance } = require('../../utils/gamblingUtils.js');
const { checkLinked } = require('../../utils/roleCheckUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');

const choices = [
  { name: 'Rock', emoji: '🪨', beats: 'Scissors' },
  { name: 'Paper', emoji: '📄', beats: 'Rock' },
  { name: 'Scissors', emoji: '✂️', beats: 'Paper' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Challenge a user to Rock Paper Scissors')
    .addIntegerOption(option =>
      option.setName('wager')
        .setDescription('The amount of money you want to wager')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50000))
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('The user you want to challenge')
        .setRequired(true)),
  async run(interaction) {
    const config = interaction.client.config;
    const serverData = require('../../serverData.json');
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const griggyDatabaseDir = config.griggyDbPath;
    // Check if server is online
    if (!serverData.online) return interaction.reply({ content: 'Gambling disabled while server is offline.', flags: MessageFlags.Ephemeral, });
    const userId = interaction.user.id;
    // Check if the targeted user is the same as the user OR is a bot
    const targetedUser = interaction.options.getUser('opponent');
    if (targetedUser.id === userId || targetedUser.bot) return interaction.reply({ content: 'You cannot challenge yourself or a bot.', flags: MessageFlags.Ephemeral });

    // CHECK COOLDOWNS
    if (checkCooldown(userId, 'global', config.gamblingGlobalCooldown) || checkCooldown(targetedUser.id, 'global', config.gamblingGlobalCooldown)) {
      return interaction.reply({
        content: 'You or your opponent are on cooldown! Please wait 30 seconds before playing again.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const wager = interaction.options.getInteger('wager');
    // Check if the users are linked
    const targetedMember = interaction.guild.members.cache.get(targetedUser.id) || await interaction.guild.members.fetch(targetedUser.id);
    if (!checkLinked(interaction.member) || !checkLinked(targetedMember)) {
      return interaction.reply({ content: 'You must both link your accounts to play rock paper scissors.\n`/link`', flags: MessageFlags.Ephemeral });
    }

    try {
      // Get UUIDs, hyphenate them, and get player data (balances and usernames) then check if they have enough balance
      const hyphenatedUUID = hyphenateUUID((await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], true)).minecraft_uuid);
      const hyphenatedTargetedUUID = hyphenateUUID((await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [targetedUser.id], true)).minecraft_uuid);
      const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
      const targetedPlayerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedTargetedUUID], true);
      if (!checkEnoughBalance(playerData.Balance, wager) || !checkEnoughBalance(targetedPlayerData.Balance, wager)) return interaction.reply({ content: 'You or your opponent do not have enough money to support your wager.', flags: MessageFlags.Ephemeral });

      // Create default embed and buttons from the choices array
      const embed = new EmbedBuilder()
        .setColor(config.defaultColor)
        .setTitle('⚔️ Rock Paper Scissors Duel ⚔️')
        .setDescription(`**${interaction.member.displayName}** vs **${targetedUser.displayName}**\nWager: $${formatNumber(wager)}\n\n**${targetedUser.displayName}**, choose your weapon!`)
        .setFooter({ text: 'Choose your weapon!' })
        .setTimestamp();
      const buttons = choices.map(choice => {
        return new ButtonBuilder()
          .setCustomId(choice.name)
          .setLabel(choice.name)
          .setEmoji(choice.emoji)
          .setStyle(ButtonStyle.Primary);
      });
      const row = new ActionRowBuilder().addComponents(buttons);
      const message = await interaction.reply({
        content: `${targetedUser}, ${interaction.user} has challenged you to a duel!`,
        embeds: [embed],
        components: [row]
      });
      // GAME START
      const targetedUserInteraction = await message.awaitMessageComponent({
        filter: (i) => i.user.id === targetedUser.id,
        time: 30000,
      }).catch(async (error) => {
        embed.setDescription(`**${interaction.member.displayName}** vs **${targetedUser.displayName}**\nWager: $${formatNumber(wager)}\n\n**${targetedUser.displayName}** took too long to respond!`);
        await message.edit({ embeds: [embed], components: [] });
      })

      if (!targetedUserInteraction) return;

      const targetedUserChoice = choices.find((choice) => choice.name === targetedUserInteraction.customId);
      await targetedUserInteraction.deferUpdate();

      // Initial user's turn
      embed.setDescription(`**${interaction.member.displayName}** vs **${targetedUser.displayName}**\nWager: $${formatNumber(wager)}\n\n**${interaction.member.displayName}**, choose your weapon!`);
      await message.edit({ embeds: [embed], components: [row] });

      const initialUserInteraction = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30000,
      }).catch(async (error) => {
        embed.setDescription(`**${interaction.member.displayName}** vs **${targetedUser.displayName}**\nWager: $${formatNumber(wager)}\n\n**${interaction.member.displayName}** took too long to respond!`);
        await message.edit({ embeds: [embed], components: [] });
      })

      if (!initialUserInteraction) return;

      // Set cooldown for both users after a successful game
      setCooldown(userId, 'global');
      setCooldown(targetedUser.id, 'global');

      const initialUserChoice = choices.find((choice) => choice.name === initialUserInteraction.customId);

      let result;

      if (targetedUserChoice.beats === initialUserChoice.name) {
        result = `**${targetedUser} wins!** *+${formatNumber(wager)}*`;
        const command1 = `cmi money set ${targetedPlayerData.username} ${targetedPlayerData.Balance + wager}`;
        const command2 = `cmi money set ${playerData.username} ${playerData.Balance - wager}`;
        await updateBalance(interaction, command1);
        await updateBalance(interaction, command2);
      } else if (initialUserChoice.beats === targetedUserChoice.name) {
        result = `**${interaction.user} wins!** *+${formatNumber(wager)}*`;
        const command1 = `cmi money set ${playerData.username} ${playerData.Balance + wager}`;
        const command2 = `cmi money set ${targetedPlayerData.username} ${targetedPlayerData.Balance - wager}`;
        await updateBalance(interaction, command1);
        await updateBalance(interaction, command2);
      } else {
        result = 'It\'s a tie!';
      }

      embed.setDescription(
        `${targetedUser} picked ${targetedUserChoice.name + ' ' + targetedUserChoice.emoji}\n` +
        `${interaction.user} picked ${initialUserChoice.name + ' ' + initialUserChoice.emoji}\n\n` +
        `${result}\n`
      );

      message.edit({ embeds: [embed], components: [] });
    } catch (err) {
      interaction.client.log('Error within /rps:', 'ERROR', err);
      interaction.reply({ content: 'An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
    }
  }
}