const { EmbedBuilder } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');

module.exports = {
  customId: 'profileModal',
  run: async (interaction, args) => {

    function sanitizeProfileColor(profileColor) {
			// Remove # if it's present
			if (profileColor.startsWith("#")) return profileColor.substring(1);
			return profileColor;
		}

    await interaction.deferUpdate();

    const trimmedUUID = args[0];
    const discordId = interaction.user.id;
    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;

		// Try to update user profile with values from modal
		const profileColorRaw = interaction.fields.getTextInputValue('profileColorTextInput');
		const profileColor = sanitizeProfileColor(profileColorRaw);
		const profileImage = interaction.fields.getTextInputValue('profileImageTextInput');
		const profileDescription = interaction.fields.getTextInputValue('profileDescriptionTextInput');
		const profileTitle = interaction.fields.getTextInputValue('profileTitleTextInput');
		const favoriteGame = interaction.fields.getTextInputValue('favoriteGameTextInput');

		// Build the SQL query based on the non-empty variables
		let sql = 'UPDATE users SET minecraft_uuid = ?';
		const params = [trimmedUUID];
		if (profileColor !== '') {
			sql += ', profile_color = ?';
			params.push(profileColor);
		}
		if (profileImage !== '') {
			sql += ', profile_image = ?';
			params.push(profileImage);
		}
		if (profileDescription !== '') {
			sql += ', profile_description = ?';
			params.push(profileDescription);
		}
		if (profileTitle !== '') {
			sql += ', profile_title = ?';
			params.push(profileTitle);
		}
		if (favoriteGame !== '') {
			sql += ', favorite_game = ?';
			params.push(favoriteGame);
		}
		sql += ' WHERE discord_id = ?';
		params.push(discordId);

		await queryDB(griggyDatabaseDir, sql, params);

		// Send confirmation message
		const confirmationEmbed = new EmbedBuilder()
			.setTitle('Profile Customization')
			.setDescription('Your profile has been updated!')
			.setColor('77dd77');

		return interaction.followUp({ embeds: [confirmationEmbed] });
  }
};