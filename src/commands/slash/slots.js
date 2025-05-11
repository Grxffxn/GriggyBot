const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { formatNumber } = require('../../utils/formattingUtils.js');
const { setCooldown, preGameCheck, updateBalance } = require('../../utils/gamblingUtils.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play a game of slots')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('The amount to bet')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5000))
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('The theme to use')
        .addChoices(
          { name: 'Food', value: 'food' },
          { name: 'Animals', value: 'animals' },
          { name: 'Fruits', value: 'fruits' },
          { name: 'Vehicles', value: 'vehicles' },
          { name: 'Sports', value: 'sports' },
          { name: 'Nature', value: 'nature' },
        )),
  async run(interaction) {

    function getEmojisByTheme(theme) {
      const themes = {
        default: ['🍒', '🍋', '🍊', '🍉', '🍇', '🍓', '🍈', '🍍', '🍌', '🍑'],
        food: ['🍔', '🍕', '🌭', '🍟', '🍿', '🍩', '🍪', '🍰', '🎂', '🥪'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🦁', '🐨'],
        fruits: ['🍒', '🍋', '🍊', '🍉', '🍇', '🍓', '🍈', '🍍', '🍌', '🍑'],
        vehicles: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚜'],
        sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🏓', '🏸', '🥊'],
        nature: ['🌳', '🌲', '🌴', '🌵', '🌾', '🍂', '🍃', '🍁', '🌼', '🌺']
      };
      return themes[theme] || themes.default;
    }

    try {
      const { canProceed, playerData } = await preGameCheck(interaction, 'slots');
      if (!canProceed) return;

      const userId = interaction.user.id;
      const bet = interaction.options.getInteger('bet');
      const balance = playerData.Balance;

      // GAME START
      // SET GLOBAL COOLDOWN
      setCooldown(userId, 'global');
      const theme = interaction.options.getString('theme') || 'default';
      const emojis = getEmojisByTheme(theme);

      // CHOOSE 3 RANDOM EMOJIS
      const randomEmojis = [];
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * emojis.length);
        randomEmojis.push(emojis[randomIndex]);
      }
      // Result logic
      const allMatch = randomEmojis.every((val, i, arr) => val === arr[0]);
      const twoMatch = randomEmojis[0] === randomEmojis[1] || randomEmojis[1] === randomEmojis[2] || randomEmojis[0] === randomEmojis[2];
      let updatedBalance = balance - bet;
      let resultMsg = `# 😞 Better luck next time!\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYou lost **$${formatNumber(bet)}!**\nYour new balance is **$${formatNumber(updatedBalance)}**\n-# You may roll again with no cooldown!`;
      if (allMatch) { // WIN 10x
        updatedBalance = (balance + (bet * 10)) - bet;
        resultMsg = `# 💰 You hit the jackpot! 💸\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYou won **$${formatNumber(bet * 10)}!**\nYour new balance is **$${formatNumber(updatedBalance)}**`;
        setCooldown(userId, 'slots');
      } else if (twoMatch) { // WIN 2x
        updatedBalance = (balance + (bet * 2)) - bet;
        resultMsg = `# 🎉 You won **$${formatNumber(bet * 2)}!**\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYour new balance is **$${formatNumber(updatedBalance)}**`;
        setCooldown(userId, 'slots');
      }
      // UPDATE BALANCE
      const command = `cmi money set ${playerData.username} ${updatedBalance}`;
      await updateBalance(interaction, command);

      // REVEAL 1 EMOJI AT A TIME
      await interaction.reply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ❓ ❓\n-+-+-+-+-+-+-+-+-`);

      setTimeout(async () => {
        await interaction.editReply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ${randomEmojis[1]} ❓\n-+-+-+-+-+-+-+-+-`);
      }, 1000); // 1-second delay

      setTimeout(async () => {
        await interaction.editReply(resultMsg);
      }, 2000); // 2-second delay
    } catch (err) {
      interaction.client.log('Error within /slots:', 'ERROR', err);
      interaction.reply({ content: 'An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
    }
  }
}