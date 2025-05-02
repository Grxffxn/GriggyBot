const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { formatNumber, hyphenateUUID } = require('../../utils/formattingUtils.js');
const { checkLinked } = require('../../utils/roleCheckUtils.js');
const { updateBalance } = require('../../utils/gamblingUtils.js');
const { getConfig } = require('../../utils/configUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Daily reward'),
    async run(interaction) {
        try {
            const config = getConfig();
            const griggyDatabaseDir = config.griggyDbPath;
            const cmiDatabaseDir = config.cmi_sqlite_db;
            const userId = interaction.user.id;
            const now = Math.floor(Date.now() / 1000);
            const dailyReward = 1000;
            const streakBonus = 50;
            if (!checkLinked(interaction.member)) {
                return interaction.reply(`Sorry, you must link your accounts to receive daily rewards. \`/link\``);
            }
            // GET & FORMAT UUID
            const userRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], true);
            if (!userRow || !userRow.minecraft_uuid) {
                return interaction.reply({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
            }
            const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);
            // QUERY CMI DB FOR USERNAME
            const cmiUserRow = await queryDB(cmiDatabaseDir, 'SELECT username FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
            if (!cmiUserRow || !cmiUserRow.username) {
                return interaction.reply({ content: 'Error: Username retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
            }
            const username = cmiUserRow.username;

            let userStreakData = await queryDB(
                griggyDatabaseDir,
                'SELECT streak, last_claimed FROM daily_streaks WHERE user_id = ?',
                [userId],
                true
            );

            if (!userStreakData) {
                await queryDB(
                    griggyDatabaseDir,
                    'INSERT INTO daily_streaks (user_id, streak, last_claimed) VALUES (?, ?, ?)',
                    [userId, 1, now]
                );

                const command = `cmi money add ${username} ${dailyReward}`;
                await updateBalance(interaction, command);

                return interaction.reply({
                    content: `Congrats on your first daily reward of **$${formatNumber(dailyReward)}**! Start building your streak for increased rewards!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const { streak, last_claimed } = userStreakData;
            const timeSinceLastClaim = now - last_claimed;

            if (timeSinceLastClaim < 86400) {
                const timeUntilNextAvailable = 86400 - timeSinceLastClaim;
                const hours = Math.floor(timeUntilNextAvailable / 3600);
                const minutes = Math.floor((timeUntilNextAvailable % 3600) / 60);
                return interaction.reply({
                    content: `You can claim your next daily reward in **${hours}h${minutes}m**\n-# What? Too soon?`,
                    flags: MessageFlags.Ephemeral
                });
            }

            let newStreak = streak;
            if (timeSinceLastClaim > 172800) {
                newStreak = 1;
            } else {
                newStreak += 1;
            }

            const reward = Math.min(dailyReward + (newStreak * streakBonus), 5000);

            await queryDB(
                griggyDatabaseDir,
                'UPDATE daily_streaks SET streak = ?, last_claimed = ? WHERE user_id = ?',
                [newStreak, now, userId]
            );

            const command = `cmi money add ${username} ${reward}`;
            await updateBalance(interaction, command);

            return interaction.reply({
                content: `EZ **$${formatNumber(reward)}**\nYour current streak is **${newStreak}** days.\n-# How long can you keep it up?`,
                flags: MessageFlags.Ephemeral
            });
        } catch (err) {
            interaction.client.log('Error processing /daily command:', 'ERROR', err);
            return interaction.reply({
                content: 'An error occurred while processing your daily reward. Please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};