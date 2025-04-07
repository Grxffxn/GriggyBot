const {
    SlashCommandBuilder, ButtonBuilder, TextInputBuilder,
    ActionRowBuilder, TextInputStyle, ModalBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const axios = require('axios');
const { queryDB } = require('../../utils/databaseUtils.js');

// Database file paths
const databaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';

// Constants
const questions = [
    'IN-GAME HOURS (/PLAYTIME)',
    'COMMUNITY INVOLVEMENT',
    'WHY DO YOU WANT TO RANK UP?'
];
const requiredStaffReactions = { fabled: 1, heroic: 1, mythical: 2, apocryphal: 3, legend: 4 };
const requiredPoints = { fabled: 5, heroic: 10, mythical: 15, apocryphal: 20, legend: 25 };

// Utility function: Create buttons
function createButtons(discordId, role, vouches, userPoints, approvals = 0) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve-${discordId}-${role}`)
            .setLabel(`Approve (${approvals}/${requiredStaffReactions[role]})`)
            .setStyle('Primary'),
        new ButtonBuilder()
            .setCustomId(`vouchButton-${discordId}`)
            .setLabel(`Vouch (${vouches} Received)`)
            .setStyle('Success'),
        new ButtonBuilder()
            .setCustomId(`accumulatedPts-${discordId}-${role}`)
            .setLabel(`Points: ${userPoints}/${requiredPoints[role]}`)
            .setStyle('Secondary')
            .setDisabled(),
        new ButtonBuilder()
            .setCustomId(`refresh-${discordId}-${role}`)
            .setLabel('Refresh')
            .setStyle('Secondary')
    );
}

// Utility function: Create embed
function createEmbed(title, thumbnail, fields, footerText, footerIcon) {
    return new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(title)
        .setThumbnail(thumbnail)
        .addFields(...fields)
        .setTimestamp()
        .setFooter({ text: footerText, iconURL: footerIcon });
}

// Active modal handlers tracking
const activeModalHandlers = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Apply for a specific rank.')
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank you want to apply for.')
                .setRequired(true)
                .addChoices(
                    { name: 'I. Fabled', value: 'fabled' },
                    { name: 'II. Heroic', value: 'heroic' },
                    { name: 'III. Mythical', value: 'mythical' },
                    { name: 'IV. Apocryphal', value: 'apocryphal' },
                    { name: 'V. Legend', value: 'legend' },
                ))
        .addStringOption(option =>
            option.setName('playername')
                .setDescription('Your in-game Minecraft username.')
                .setRequired(true)),

    async run(interaction) {
        const rank = interaction.options.getString('rank');
        const playerName = interaction.options.getString('playername');
        await startApplicationProcess(interaction, rank, playerName);
    },
};

async function startApplicationProcess(interaction, rank, playerName) {
    const userId = interaction.user.id;

    // Check if there's an active process and block the new one if needed
    if (activeModalHandlers.has(userId)) {
        await interaction.reply({
            content: 'Please wait 5 minutes before starting a new application. Sorry, blame Discord!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const user = interaction.member; // Get the user who initiated the command
    const roleHierarchy = ['fabled', 'heroic', 'mythical', 'apocryphal', 'legend']; // Rank tiers in order

    // Find the index of the rank the user is applying for
    const currentRankIndex = roleHierarchy.indexOf(rank);

    // If the rank is not valid, skip the check
    if (currentRankIndex === -1) {
        await interaction.reply(`You can't apply for rank ${rank}.`);
        return;
    }

    // Determine the previous rank that the user must have (only if not the first rank)
    if (currentRankIndex > 0) {
        const requiredRank = roleHierarchy[currentRankIndex - 1];

        // Check if the user has the role for the previous rank
        const requiredRole = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === requiredRank);

        if (!requiredRole) {
            await interaction.reply(`The required role (${requiredRank}) does not exist in this server.`);
            return;
        }

        if (!user.roles.cache.has(requiredRole.id)) {
            await interaction.reply(`You must have the **${requiredRank}** role before applying for **${rank}**.`);
            return;
        }
    }

    // Mark the user as having an active process
    activeModalHandlers.set(userId, true);

    // Generate a unique ID for the modal
    const uniqueId = Date.now();
    const modalCustomId = `applicationModal-${userId}-${uniqueId}`;

    // Show the modal to the user
    const modal = new ModalBuilder()
        .setTitle(`${rank.charAt(0).toUpperCase() + rank.slice(1)} Application`)
        .setCustomId(modalCustomId);
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
            filter: i => i.customId === modalCustomId,
            time: 300000, // 5 minutes
        });

        // Process the modal submission
        modalInteraction.deferUpdate();
        const answers = [];
        questions.forEach((_, index) => {
            answers.push(modalInteraction.fields.getTextInputValue(`question_${index}`));
        });

        const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${playerName}?prefix=.`);
        if (!data) throw new Error('Player not found on Mojang API.');

        const playerUUID = data.id.replace(/-/g, '');
        const thumbnailUrl = `https://visage.surgeplay.com/bust/256/${playerUUID}`;

        // Retrieve data from the databases
        const row = await queryDB(databaseDir, 'SELECT * FROM users WHERE minecraft_uuid = ?', [playerUUID], true);
        const userPoints = await queryDB(cmiDatabaseDir, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [playerName], true)
            .then(row => parseFloat((row.UserMeta || '').split('%%')[1], 10) || 0);

        const vouches = parseInt(row.vouches || 0, 10);

        // Create embeds and buttons
        const submissionEmbed = createEmbed(
            `📌 ${playerName}'s ${rank.charAt(0).toUpperCase() + rank.slice(1)} Application`,
            thumbnailUrl,
            [{ name: '📄 Application Form\n-=+=- -=+=- -=+=-', value: questions.map((q, i) => `**${q}**\n${answers[i]}`).join('\n\n') }],
            `Application submitted by ${interaction.user.username}`,
            interaction.user.displayAvatarURL()
        );
        const profileColor = `#${row.profile_color}`;
        const profileEmbed = new EmbedBuilder()
            .setColor(profileColor)
            .setTitle(row.profile_title || playerName)
            .setThumbnail(row.profile_image || thumbnailUrl)
            .setDescription(row.profile_description || 'No bio yet.')
            .addFields({ name: 'Favorite Game', value: row.favorite_game || 'No favorite game set.' });
        const buttonRow = createButtons(row.discord_id, rank, vouches, userPoints);
        // Send application to submission channel
        const submissionChannel = interaction.guild.channels.cache.find(c => c.name === 'rank-applications');
        if (!submissionChannel) throw new Error('Submission channel not found.');
        const thread = await submissionChannel.threads.create({
            name: `${playerName}'s ${rank.charAt(0).toUpperCase() + rank.slice(1)} Application`,
            autoArchiveDuration: 4320,
        });
        if (thread.joinable) await thread.join();

        const sentMessage = await thread.send({
            content: `<@${interaction.user.id}>`,
            embeds: [submissionEmbed, profileEmbed],
            components: [buttonRow],
        });

        // Notify in-game chat about a new application
        const minecraftDiscordLinkChannel = interaction.guild.channels.cache.get('477937408520749067');
        if (!minecraftDiscordLinkChannel) throw new Error('Griggyyyy, what happened to the #minecraft channel???');
        await minecraftDiscordLinkChannel.send(`<@${interaction.user.id}> (${playerName}) just submitted a ${rank.charAt(0).toUpperCase() + rank.slice(1)} application! Check it out in <#1346992109491847272>`);

        // Save application to database
        await queryDB(databaseDir, 'INSERT INTO applications (message_id, player_name, role, answers, status, discord_id, approvals, thread_id) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', [sentMessage.id, playerName, rank, JSON.stringify(answers), 'active', interaction.user.id, thread.id]);
    } catch (error) {
        if (error.name === 'TimeoutError') {
            await interaction.followUp({
                content: 'Your application process timed out. Please try again.',
                flags: MessageFlags.Ephemeral,
            });
        } else {
            console.error('An error occurred:', error.message);
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