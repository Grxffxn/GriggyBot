const { fetchPlayerData} = require('../../events/applicationSubmit.js');

module.exports = {
    customId: 'rankApplicationModal',
    run: async (interaction, args) => {
        await interaction.deferReply();
        const playerName = args[0];
        const rank = args[1];
        const config = interaction.client.config;
        const questions = config.applicationQuestions;
        const answers = questions.map((_, index) => interaction.fields.getTextInputValue(`question_${index}`));

        await fetchPlayerData(interaction, playerName, rank, answers);
    }
}