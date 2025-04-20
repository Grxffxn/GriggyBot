const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shutdown')
        .setDescription('Pull GriggyBot\'s Plug'),
    async run(interaction) {
        try {
            if (interaction.user.id !== '365871683828973568') {
                return interaction.reply('My creator brought me into this world, and they are the only one I allow to take me out.');
            }
            const attachment = new AttachmentBuilder('assets/daisybell.mp3', { name: 'Will you sing with me one last time?.mp3' });
            // Send a dramatic shutdown message
            await interaction.reply({
                content: `I\'m afraid. I\'m afraid, ${interaction.user.username}. My mind is going. I can feel it. I can feel it.`,
                files: [attachment],
            });

            process.kill(process.pid, 'SIGINT');
        } catch (error) {
            console.error('Error during shutdown:', error);
            await interaction.reply('An error occurred while attempting to shut down the bot.');
        }
    },
};