const {
    SlashCommandBuilder, ButtonBuilder, TextInputBuilder,
    ActionRowBuilder, TextInputStyle, ModalBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const axios = require('axios');
const { getConfig } = require('../../utils/configUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');

const config = getConfig();
const questions = config.applicationQuestions || [];
const ranks = config.ranks || [];
const cmiDatabasePath = config.cmi_sqlite_db;
const griggyDatabasePath = config.griggyDbPath;

// Active modal handlers tracking
const activeModalHandlers = new Map();

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
        const rank = interaction.options.getString('rank');
        const playerName = interaction.options.getString('playername');
        await startApplicationProcess(interaction, rank, playerName);
    },
};

async function startApplicationProcess(interaction, rank, playerName) {
    const userId = interaction.user.id;

    // Check if there's an active process
    if (activeModalHandlers.has(userId)) {
        await interaction.reply({
            content: 'Please wait 5 minutes before starting a new application.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const user = interaction.member;
    const rankConfig = ranks.find(r => r.name === rank);

    if (!rankConfig) {
        await interaction.reply(`The rank "${rank}" is not configured.`);
        return;
    }

    // Check if the user has the required previous rank
    const rankIndex = ranks.findIndex(r => r.name === rank);
    if (rankIndex > 0) {
        const requiredRank = ranks[rankIndex - 1];
        const requiredRole = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === requiredRank.name);

        if (!requiredRole || !user.roles.cache.has(requiredRole.id)) {
            await interaction.reply(`You must have the **${requiredRank.name}** role before applying for **${rankConfig.name}**.`);
            return;
        }
    }

    // Mark the user as having an active process
    activeModalHandlers.set(userId, true);

    // Show the modal
    const modal = new ModalBuilder()
        .setTitle(`${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`)
        .setCustomId(`applicationModal-${userId}`);
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
    await interaction.showModal(modal);

    try {
        // Wait for modal submission
        const modalInteraction = await interaction.awaitModalSubmit({
            filter: i => i.customId.startsWith(`applicationModal-${userId}`),
            time: 300000, // 5 minutes
        });

        modalInteraction.deferUpdate();
        const answers = questions.map((_, index) => modalInteraction.fields.getTextInputValue(`question_${index}`));

        // Fetch player UUID
        const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${playerName}?prefix=.`);
        if (!data) throw new Error('Player not found on Mojang API.');

        const playerUUID = data.id.replace(/-/g, '');
        const thumbnailUrl = `https://visage.surgeplay.com/bust/256/${playerUUID}`;

        // Retrieve data from the databases
        const row = await queryDB(griggyDatabasePath, 'SELECT * FROM users WHERE minecraft_uuid = ?', [playerUUID], true);
        const userPoints = await queryDB(cmiDatabasePath, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [playerName], true)
            .then(row => parseFloat((row.UserMeta || '').split('%%')[1], 10) || 0);

        const vouches = parseInt(row.vouches || 0, 10);

        // Create buttons dynamically based on config
        const buttonRow = new ActionRowBuilder();
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`approve-${userId}-${rank}`)
                .setLabel(`Approve (0/${rankConfig.requiredStaffApprovals})`)
                .setStyle('Success')
        );
        if (config.enableVouch) {
            buttonRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`vouchButton-${userId}`)
                    .setLabel(`Vouch (${vouches} Received)`)
                    .setStyle('Success')
            );
        }
        if (config.enableRankPoints) {
            buttonRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`accumulatedPts-${userId}-${rank}`)
                    .setLabel(`Points: ${userPoints}/${rankConfig.requiredPoints}`)
                    .setStyle('Secondary')
                    .setDisabled()
            );
        }
        buttonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`refresh-${userId}-${rank}`)
                .setLabel('Refresh')
                .setStyle('Secondary')
        );


        // Send application to submission channel
        const submissionChannelId = config.rankSubmissionChannelId || 'rank-applications';
        const submissionChannel = interaction.guild.channels.cache.get(submissionChannelId);
        if (!submissionChannel) interaction.client.log(`Submission channel not found.`, 'ERROR');

        const thread = await submissionChannel.threads.create({
            name: `${playerName}'s ${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`,
            autoArchiveDuration: 4320,
        });
        if (thread.joinable) await thread.join();

        const embed = new EmbedBuilder()
            .setTitle(`📌 ${playerName}'s ${rankConfig.name.replace(/^./, char => char.toUpperCase())} Application`)
            .setThumbnail(thumbnailUrl)
            .addFields({ name: '📄 Application Form', value: questions.map((q, i) => `**${q}**\n${answers[i]}`).join('\n-=+=- -=+=- -=+=-\n') })
            .setFooter({ text: `Application submitted by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        const sentMessage = await thread.send({
            content: `${interaction.user}`,
            embeds: [embed],
            components: [buttonRow],
        });

        // Save application to database
        await queryDB(griggyDatabasePath, 'INSERT INTO applications (message_id, player_name, role, answers, status, discord_id, approvals, thread_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [
            sentMessage.id,
            playerName,
            rank,
            JSON.stringify(answers),
            'active',
            interaction.user.id,
            thread.id,
        ]);

        // Notify in-game chat about a new application
        const mcChatChannel = interaction.guild.channels.cache.find(c => c.id === config.mcChatChannelId);
        if (mcChatChannel && config.enableApplicationNotifications) {
            await mcChatChannel.send(`${playerName} just submitted a ${rankConfig.name.replace(/^./, char => char.toUpperCase())} application!`);
        }
    } catch (err) {
        if (err.name === 'TimeoutError') {
            await interaction.followUp({
                content: 'Your application process timed out. Please try again.',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            interaction.client.log('An error occurred:', 'ERROR', err);
            await interaction.followUp({
                content: 'An error occurred during the application process. Please try again.',
                flags: MessageFlags.Ephemeral,
            });
        }
    } finally {
        // Clean up the user's active process
        activeModalHandlers.delete(userId);
    }
}