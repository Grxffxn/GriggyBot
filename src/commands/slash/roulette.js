const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const serverData = require('../../serverData.json');
const { formatNumber, hyphenateUUID } = require('../../utils/formattingUtils.js');
const { checkEnoughBalance, checkCooldown, setCooldown } = require('../../utils/gamblingUtils.js');
const { checkLinked } = require('../../utils/roleCheckUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a game of roulette')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color to bet on')
                .setRequired(true)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Black', value: 'black' },
                    { name: 'Green', value: 'green' },
                ))
        .addStringOption(option =>
            option.setName('range')
                .setDescription('Bet on high (19-36) or low (1-18)')
                .addChoices(
                    { name: 'High', value: 'high' },
                    { name: 'Low', value: 'low' },
                )),
    async run(interaction) {
        // CHECK IF GAMBLING IS ENABLED AND SERVER IS ONLINE
        if (!config.gamblingEnabled || !serverData.online) return interaction.reply({ content: 'Gambling is currently disabled, or TLC is offline.', flags: MessageFlags.Ephemeral, });
        const userId = interaction.user.id;
        const consoleChannel = interaction.client.channels.cache.get(config.consoleChannelId);
        const betAmount = interaction.options.getInteger('bet');
        const colorBet = interaction.options.getString('color');
        // Set rangeBet to null if colorBet is green
        const rangeBet = colorBet === 'green' ? null : interaction.options.getString('range');
        // If rangeBet is null and color is NOT green, cancel game and tell user to pick a range
        if (!rangeBet && colorBet !== 'green') {
            return interaction.reply({
                content: 'You must pick a range if you are not betting on green.',
                flags: MessageFlags.Ephemeral,
            });
        }
        // CHECK LINKED
        if (!checkLinked(interaction.member)) {
            return interaction.reply({ content: 'You must link your accounts to play slots.\n`/link`', flags: MessageFlags.Ephemeral });
        }
        // CHECK COOLDOWNS
        const slotsCooldown = checkCooldown(userId, 'roulette', config.gamblingWinCooldown);
        const globalCooldown = checkCooldown(userId, 'global', config.gamblingGlobalCooldown);
        if (slotsCooldown) return interaction.reply({ content: `You are on cooldown! Please wait ${Math.ceil(slotsCooldown / 60)} minutes before playing again.`, flags: MessageFlags.Ephemeral, });
        if (globalCooldown) return interaction.reply({ content: `Slow down! Please wait ${globalCooldown} seconds before playing again! The server needs time to update.`, flags: MessageFlags.Ephemeral, });

        function calculatePayout(betAmount, colorBet, rangeBet, winningColor, winningRange) {
            let payoutMultiplier = 0;

            // Handle color bet
            if (colorBet) {
                if (colorBet === 'green' && winningColor === 'green') {
                    payoutMultiplier += 5;
                } else if (colorBet === winningColor) {
                    payoutMultiplier += 1;
                }
            }

            // Handle range bet
            if (rangeBet && rangeBet === winningRange) {
                payoutMultiplier += 1;
            }

            // Calculate total winnings
            const totalWinnings = betAmount * payoutMultiplier;

            // Construct the final payout message
            let payoutMessage;
            if (payoutMultiplier === 0) {
                payoutMessage = `<:_:774859143495417867> You lost your bet of **$${formatNumber(betAmount)}**. Better luck next time!`;
            } else if (totalWinnings === betAmount) {
                payoutMessage = `<a:_:762492571523219466> You broke even with your bet of **$${formatNumber(betAmount)}**.`;
            } else {
                payoutMessage = `<a:_:774429683876888576> You won **$${formatNumber(totalWinnings)}**!`;
            }

            return { payoutMultiplier, payoutMessage };
        }

        try {
            // Get UUID, hyphenate it, and get player data (balance and username) then check if they have enough balance
            const hyphenatedUUID = hyphenateUUID((await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId])).minecraft_uuid);
            const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID]);
            const balance = playerData.Balance;
            if (!checkEnoughBalance(balance, betAmount)) return interaction.reply({ content: 'You do not have enough money to support your bet.', flags: MessageFlags.Ephemeral });

            // GAME START
            // SET GLOBAL COOLDOWN
            setCooldown(userId, 'global');
            const winningNumber = Math.floor(Math.random() * 37);
            const winningColor = winningNumber === 0 ? 'green' : (winningNumber % 2 === 0 ? 'red' : 'black');
            const winningRange = winningNumber <= 18 ? 'low' : 'high';

            const { payoutMultiplier, payoutMessage } = calculatePayout(betAmount, colorBet, rangeBet, winningColor, winningRange);
            let newBalance = balance - betAmount + (betAmount * payoutMultiplier);
            // If payoutMultiplier is not equal to 1, update balance, otherwise leave it alone
            if (payoutMultiplier !== 1) {
                await consoleChannel.send(`money set ${playerData.username} ${newBalance}`);
            }
            // If payoutMultiplier is greater than 0 (win), add user to cooldown. Otherwise do not.
            if (payoutMultiplier > 0) {
                setCooldown(userId, 'roulette');
            }
            const winningNumberEmoji = winningNumber === 0 ? '🟢' : (winningColor === 'red' ? '🔴' : '⚫');

            return interaction.reply({
                content: `# ${winningNumberEmoji} **${winningNumber}**\n${payoutMessage}\nYour new balance is **${formatNumber(newBalance)}**`,
            });
        } catch (error) {
            console.error('Error:', error);
            return interaction.reply({
                content: 'An error occurred while processing your request.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}