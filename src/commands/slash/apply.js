const {
    SlashCommandBuilder, ButtonBuilder, TextInputBuilder,
    ActionRowBuilder, TextInputStyle, ModalBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const axios = require('axios');
const { getConfig } = require('../../utils/configUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');

const initialConfig = getConfig();
const ranks = initialConfig.ranks || [];

module.exports = {
    data: (() => {
        const command = new SlashCommandBuilder()
            .setName('apply')
            .setDescription('Apply for ranks')
            .addStringOption(option => {
                option.setName('rank')
                    .setDescription('The rank you want to apply for.')
                    .setRequired(true);

                ranks.forEach(rank => {
                    option.addChoices({ name: rank.displayName, value: rank.name });
                });

                return option;
            })
            .addStringOption(option =>
                option.setName('playername')
                    .setDescription('Your in-game Minecraft username.')
                    .setRequired(true)
            );

        return command;
    })(),

    async run(interaction) {
        const config = getConfig();
        const rank = interaction.options.getString('rank');
        const playerName = interaction.options.getString('playername');
        const questions = config.applicationQuestions || [];
        const cmiDatabasePath = config.cmi_sqlite_db;
        const griggyDatabasePath = config.griggyDbPath;
        const rankConfig = ranks.find(r => r.name === rank);
        const mcChatChannel = interaction.guild.channels.cache.find(c => c.id === config.mcChatChannelId);
        const submissionChannel = interaction.guild.channels.cache.get(config.rankSubmissionChannelId);

        let applicantInfo = {
            answers: [],
            row: {},
            vouches: 0,
            userPoints: 0,
            thumbnailUrl: '',
            playerUUID: '',
        };

        function createElements(type, applicantInfo) {
            switch (type) {
                case 'applicationModal':
                    const modal = new ModalBuilder()
                        .setTitle(`${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`)
                        .setCustomId(`applicationModal-${interaction.id}`);
                    questions.forEach((question, index) => {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setLabel(question)
                                    .setCustomId(`question_${index}`)
                                    .setStyle(index < 2 ? TextInputStyle.Short : TextInputStyle.Paragraph)
                                    .setPlaceholder('Type your answer here...')
                            )
                        );
                    });
                    return modal;
                case 'submissionButtons':
                    const buttonRow = new ActionRowBuilder();
                    buttonRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve-${interaction.user.id}-${rank}`)
                            .setLabel(`Approve (0/${rankConfig.requiredStaffApprovals})`)
                            .setStyle('Primary')
                    );
                    if (config.enableVouch) {
                        buttonRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`vouchButton-${interaction.user.id}`)
                                .setLabel(`Vouch (${applicantInfo.vouches} Received)`)
                                .setStyle('Success')
                        );
                    }
                    if (config.enableRankPoints) {
                        buttonRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`accumulatedPts-${interaction.user.id}-${rank}`)
                                .setLabel(`Points: ${applicantInfo.userPoints}/${rankConfig.requiredPoints}`)
                                .setStyle('Secondary')
                                .setDisabled()
                        );
                    }
                    buttonRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`refresh-${interaction.user.id}-${rank}`)
                            .setLabel('Refresh')
                            .setStyle('Secondary')
                    );
                    return buttonRow;
                case 'submissionEmbeds':
                    const applicationEmbed = new EmbedBuilder()
                        .setTitle(`📌 ${playerName}'s ${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`)
                        .setColor(rankConfig.color)
                        .setThumbnail(applicantInfo.thumbnailUrl)
                        .addFields({ name: '📄 Application Form', value: questions.map((q, i) => `**${q}**\n${applicantInfo.answers[i]}`).join('\n-=+=- -=+=- -=+=-\n') })
                        .setFooter({ text: `Application submitted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
                    const profileEmbed = new EmbedBuilder()
                        .setTitle(applicantInfo.row.profile_title || playerName)
                        .setColor(applicantInfo.row.profile_color)
                        .setDescription(applicantInfo.row.profile_description)
                        .setThumbnail(applicantInfo.row.profile_image)
                        .addFields({ name: 'Favorite Game', value: applicantInfo.row.favorite_game });
                    return [applicationEmbed, profileEmbed];
            }
        }

        async function startApplicationProcess() {
            if (!rankConfig) return interaction.reply({ content: `The rank "${rank}" is not configured.`, flags: MessageFlags.Ephemeral });
            if (!submissionChannel) return interaction.reply({ content: `The submission channel is not configured.`, flags: MessageFlags.Ephemeral });

            // Check if the user has already applied for this rank
            const existingApplication = await queryDB(griggyDatabasePath, 'SELECT * FROM applications WHERE discord_id = ? AND role = ?', [interaction.user.id, rank], true);
            if (existingApplication) return interaction.reply({ content: `You have already applied for the **${rankConfig.name.replace(/^./, char => char.toUpperCase())}** rank. Need to make a new application? Delete your active application with \`/deleteapplication rank:${rankConfig.displayName} playername:${playerName}\``, flags: MessageFlags.Ephemeral });

            // Check if the user has the required previous rank
            const rankIndex = ranks.findIndex(r => r.name === rank);
            if (rankIndex > 0) {
                const requiredRank = ranks[rankIndex - 1];
                const requiredRole = (await interaction.guild.roles.fetch()).find(role => role.name.toLowerCase() === requiredRank.name.toLowerCase());

                if (!requiredRole || !interaction.member.roles.cache.has(requiredRole.id)) return interaction.reply({ content: `You must have the **${requiredRank.name}** role before applying for **${rankConfig.name}**.`, flags: MessageFlags.Ephemeral });
            }

            // Show the modal
            const modal = createElements('applicationModal');
            await interaction.showModal(modal);

            try {
                // Wait for modal submission
                const modalInteraction = await interaction.awaitModalSubmit({
                    filter: i => i.customId.startsWith(`applicationModal-${interaction.id}`),
                    time: 300000, // 5 minutes
                });

                modalInteraction.deferUpdate();
                applicantInfo.answers = questions.map((_, index) => modalInteraction.fields.getTextInputValue(`question_${index}`));
            } catch (err) {
                if (err.name === 'TimeoutError') {
                    return interaction.followUp({ content: 'Your application process timed out. Please try again.', flags: MessageFlags.Ephemeral });
                } else {
                    interaction.client.log('An error occurred:', 'ERROR', err);
                    return interaction.followUp({ content: 'An error occurred during the application process. Please try again.', flags: MessageFlags.Ephemeral });
                }
            }
            await fetchPlayerData();
        }

        async function fetchPlayerData() {
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
                applicantInfo.row = await queryDB(griggyDatabasePath, 'SELECT * FROM users WHERE minecraft_uuid = ?', [applicantInfo.playerUUID], true);
                if (!applicantInfo.row) {
                    return interaction.followUp({ content: `Player "${playerName}" not found in the database. Have you \`/link\`ed your accounts?\n-# Note: Usernames are case-sensitive.`, flags: MessageFlags.Ephemeral });
                }
                // Check if the interaction user's id matches the Minecraft UUID in the database
                if (applicantInfo.row.discord_id !== interaction.user.id) {
                    return interaction.followUp({ content: `Wait! Your Discord account is not linked to ${playerName}. An impostor is among us...\n-# Contact an Admin for help resolving this.`, flags: MessageFlags.Ephemeral });
                }
                applicantInfo.userPoints = await queryDB(cmiDatabasePath, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [playerName], true)
                    .then(row => parseFloat((row?.UserMeta || '').split('%%')[1], 10) || 0);
            } catch (err) {
                interaction.client.log('An error occurred while fetching player data from the database:', 'ERROR', err);
                return interaction.followUp({ content: 'An error occurred while fetching player data from the database. Please try again later.', flags: MessageFlags.Ephemeral });
            }

            applicantInfo.vouches = parseInt(applicantInfo.row.vouches || 0, 10);
            await finalizeApplicationProcess();
        }

        async function finalizeApplicationProcess() {
            // Create buttons dynamically based on config
            const buttonRow = createElements('submissionButtons', applicantInfo);


            // Send application to submission channel
            const thread = await submissionChannel.threads.create({
                name: `${playerName}'s ${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`,
                autoArchiveDuration: 4320,
            });
            if (thread.joinable && interaction.guild.members.me.permission.has('MANAGE_THREADS')) await thread.join();

            const [applicationEmbed, profileEmbed] = createElements('submissionEmbeds', applicantInfo);
            const sentMessage = await thread.send({ content: `${interaction.user}`, embeds: [applicationEmbed, profileEmbed], components: [buttonRow] });

            // Save application to database
            await queryDB(griggyDatabasePath, 'INSERT INTO applications (message_id, player_name, role, answers, status, discord_id, approvals, thread_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [
                sentMessage.id,
                playerName,
                rank,
                JSON.stringify(applicantInfo.answers),
                'active',
                interaction.user.id,
                thread.id,
            ]);

            // Notify in-game chat about a new application
            if (mcChatChannel && config.enableApplicationNotifications) await mcChatChannel.send(`${playerName} just submitted a ${rankConfig.name.replace(/^./, char => char.toUpperCase())} application!`);
            await interaction.followUp({ content: `Your **${rankConfig.name}** application has been submitted!`, flags: MessageFlags.Ephemeral });
        }

        await startApplicationProcess();
        
    },
};