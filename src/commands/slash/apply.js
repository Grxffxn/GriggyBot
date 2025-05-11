const {
    SlashCommandBuilder, TextInputBuilder,
    ActionRowBuilder, TextInputStyle, ModalBuilder, MessageFlags
} = require('discord.js');
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
        const config = interaction.client.config;
        const rank = interaction.options.getString('rank');
        const playerName = interaction.options.getString('playername');
        const questions = config.applicationQuestions;
        const submissionChannel = interaction.guild.channels.cache.get(config.rankSubmissionChannelId);

        function createModal() {
            if (!questions || questions.length === 0) return interaction.reply({ content: `No application questions have been configured. I don't know what to ask you!`, flags: MessageFlags.Ephemeral });
            const modal = new ModalBuilder()
                .setTitle(`${rank.replace(/^./, char => char.toUpperCase())} Application`)
                .setCustomId(`rankApplicationModal:${playerName}/${rank}`);
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
        }

        async function startApplicationProcess() {
            if (!submissionChannel) return interaction.reply({ content: `The submission channel is not configured.`, flags: MessageFlags.Ephemeral });

            // Check if the user has already applied for this rank
            const existingApplication = await queryDB(config.griggyDbPath, 'SELECT * FROM applications WHERE discord_id = ? AND role = ?', [interaction.user.id, rank], true);
            if (existingApplication) return interaction.reply({ content: `You have already applied for the **${rank.replace(/^./, char => char.toUpperCase())}** rank. Need to make a new application? Delete your active application with \`/deleteapplication rank:${rank} playername:${playerName}\``, flags: MessageFlags.Ephemeral });

            // Check if the user has the required previous rank
            const rankIndex = ranks.findIndex(r => r.name === rank);
            if (rankIndex > 0) {
                const requiredRank = ranks[rankIndex - 1];
                const requiredRole = (await interaction.guild.roles.fetch()).find(role => role.name.toLowerCase() === requiredRank.name.toLowerCase());

                if (!requiredRole || !interaction.member.roles.cache.has(requiredRole.id)) return interaction.reply({ content: `You must have the **${requiredRank.name}** role before applying for **${rank}**.`, flags: MessageFlags.Ephemeral });
            }

            // Show the modal
            const modal = createModal();
            await interaction.showModal(modal);
        }

        await startApplicationProcess();

    },
};