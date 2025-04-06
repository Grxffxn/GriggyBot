const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const serverData = require('../../serverData.json');
const sqlite3 = require('sqlite3').verbose();
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const globalCooldowns = {};

const choices = [
    { name: 'Rock', emoji: '🪨', beats: 'Scissors' },
    { name: 'Paper', emoji: '📄', beats: 'Rock' },
    { name: 'Scissors', emoji: '✂️', beats: 'Paper' },
];

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Challenge another user to a game of Rock Paper Scissors')
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
        // Check if gambling is enabled and server is online
        if (!config.gamblingEnabled || !serverData.online) {
            return interaction.reply({
                content: 'Gambling is currently disabled, or TLC is offline.',
                flags: MessageFlags.Ephemeral,
            });
        }
        const userId = interaction.user.id;
        // Check if the targeted user is the same as the user OR is a bot
        const targetedUser = interaction.options.getUser('opponent');
        if (targetedUser.id === userId || targetedUser.bot) {
            return interaction.reply({ content: 'You cannot challenge yourself or a bot.', flags: MessageFlags.Ephemeral });
        }
        const now = Date.now();
        const globalCooldownTime = 30 * 1000; // 5 seconds in milliseconds

        // Check if the user is on the global 30-second cooldown
        if (globalCooldowns[userId] && now - globalCooldowns[userId] < globalCooldownTime) {
            const remainingTime = Math.ceil((globalCooldownTime - (now - globalCooldowns[userId])) / 1000);
            return interaction.reply({
                content: `Slow down! Please wait ${remainingTime} more second(s)!`,
                flags: MessageFlags.Ephemeral,
            });
        }

        globalCooldowns[userId] = now;

        function getUUIDFromDatabase(db, userId) {
            return new Promise((resolve, reject) => {
                db.get('SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        return reject(new Error('No linked account found.'));
                    }
                    resolve(row.minecraft_uuid);
                });
            });
        }

        function getDataFromDatabase(db, uuid) {
            return new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE player_uuid = ?', [uuid], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        return reject(new Error('No data found for this UUID.'));
                    }
                    resolve(row);
                });
            });
        }

        const wager = interaction.options.getInteger('wager');
        const consoleChannel = interaction.client.channels.cache.get(config.consoleChannelId);
        // Check if the users are linked
        const linkedRole = interaction.guild.roles.cache.find(role => role.name === 'Linked');
        const targetedMember = interaction.guild.members.cache.get(targetedUser.id) || await interaction.guild.members.fetch(targetedUser.id);
        if (!interaction.member.roles.cache.has(linkedRole.id) || !targetedMember.roles.cache.has(linkedRole.id)) {
            return interaction.reply({ content: 'You must both link your accounts to play rock paper scissors.\n`/link`', flags: MessageFlags.Ephemeral });
        }

        // Database connections
        const griggydb = new sqlite3.Database(griggyDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        const cmidb = new sqlite3.Database(cmiDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        try {
            const uuid = await getUUIDFromDatabase(griggydb, userId);
            const targetedUuid = await getUUIDFromDatabase(griggydb, targetedUser.id);
            griggydb.close();
            const hyphenatedUUID = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            const hyphenatedTargetedUUID = targetedUuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            const playerData = await getDataFromDatabase(cmidb, hyphenatedUUID);
            const targetedPlayerData = await getDataFromDatabase(cmidb, hyphenatedTargetedUUID);
            cmidb.close();
            const balance = playerData.Balance;
            const targetedBalance = targetedPlayerData.Balance;
            const username = playerData.username;
            const targetedUsername = targetedPlayerData.username;
            // Check users balances
            if (isNaN(balance || targetedBalance)) {
                return interaction.reply({ content: 'An error occurred while retrieving your balance.', flags: MessageFlags.Ephemeral });
            }
            if (balance < wager || targetedBalance < wager) {
                return interaction.reply({ content: 'You or your opponent do not have enough money to support your wager.', flags: MessageFlags.Ephemeral });
            }
            // Create default embed and buttons from the choices array
            const embed = new EmbedBuilder()
                .setColor(config.defaultColor)
                .setTitle('⚔️ Rock Paper Scissors Duel ⚔️')
                .setDescription(`**${interaction.user.username}** vs **${targetedUser.username}**\nWager: $${formatNumber(wager)}\n\n**${targetedUser.username}**, choose your weapon!`)
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
            // targetedUser should choose first
            const targetedUserInteraction = await message.awaitMessageComponent({
                filter: (i) => i.user.id === targetedUser.id,
                time: 30000,
            }).catch(async (error) => {
                embed.setDescription(`**${interaction.user.username}** vs **${targetedUser.username}**\nWager: $${formatNumber(wager)}\n\n**${targetedUser.username}** took too long to respond!`);
                await message.edit({ embeds: [embed], components: [] });
            })

            if (!targetedUserInteraction) return;

            const targetedUserChoice = choices.find(
                (choice) => choice.name === targetedUserInteraction.customId,
            );

            await targetedUserInteraction.reply({
                content: `You chose **${targetedUserChoice.name}**! ${targetedUserChoice.emoji}`,
                flags: MessageFlags.Ephemeral,
            });

            // Initial user's turn
            embed.setDescription(`**${interaction.user.username}** vs **${targetedUser.username}**\nWager: $${formatNumber(wager)}\n\n**${interaction.user.username}**, choose your weapon!`);
            await message.edit({ embeds: [embed], components: [row] });

            const initialUserInteraction = await message.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 30000,
            }).catch(async (error) => {
                embed.setDescription(`**${interaction.user.username}** vs **${targetedUser.username}**\nWager: $${formatNumber(wager)}\n\n**${interaction.user.username}** took too long to respond!`);
                await message.edit({ embeds: [embed], components: [] });
            })

            if (!initialUserInteraction) return;

            const initialUserChoice = choices.find(
                (choice) => choice.name === initialUserInteraction.customId,
            );

            let result;

            if (targetedUserChoice.beats === initialUserChoice.name) {
                result = `**${targetedUser}** wins!`;
                consoleChannel.send(`money set ${targetedUsername} ${targetedBalance + wager}`);
                consoleChannel.send(`money set ${username} ${balance - wager}`);
            } else if (initialUserChoice.beats === targetedUserChoice.name) {
                result = `**${interaction.user}** wins!`;
                consoleChannel.send(`money set ${username} ${balance + wager}`);
                consoleChannel.send(`money set ${targetedUsername} ${targetedBalance - wager}`);
            } else {
                result = 'It\'s a tie!';
            }

            embed.setDescription(
                `${targetedUser} picked ${targetedUserChoice.name + targetedUserChoice.emoji}\n` +
                `${interaction.user} picked ${initialUserChoice.name + initialUserChoice.emoji}\n\n` +
                `${result}\n`
            );

            message.edit({ embeds: [embed], components: [] });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
        }
    }
}