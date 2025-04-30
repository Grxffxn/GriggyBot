const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const { queryDB } = require('../../utils/databaseUtils.js');
const databaseDir = '/home/minecraft/GriggyBot/database.db';

// Define profile modal
const profileColorTextInput = new TextInputBuilder()
	.setCustomId('profileColorTextInput')
	.setStyle(TextInputStyle.Short)
	.setLabel('Profile Color')
	.setPlaceholder('Hex code (e.g. 0000ff)')
	.setRequired(false);

const profileImageTextInput = new TextInputBuilder()
	.setCustomId('profileImageTextInput')
	.setStyle(TextInputStyle.Short)
	.setLabel('Profile Image')
	.setPlaceholder('https://anywebsite.com/image.png')
	.setRequired(false);

const profileDescriptionTextInput = new TextInputBuilder()
	.setCustomId('profileDescriptionTextInput')
	.setStyle(TextInputStyle.Paragraph)
	.setLabel('Profile Description')
	.setPlaceholder('Fill this with anything you want to share.')
	.setRequired(false);

const profileTitleTextInput = new TextInputBuilder()
	.setCustomId('profileTitleTextInput')
	.setStyle(TextInputStyle.Short)
	.setLabel('Profile Title')
	.setPlaceholder('Profile Title')
	.setRequired(false);

const favoriteGameTextInput = new TextInputBuilder()
	.setCustomId('favoriteGameTextInput')
	.setStyle(TextInputStyle.Short)
	.setLabel('Favorite Game')
	.setPlaceholder('Favorite Game')
	.setRequired(false);

const profileColorActionRow = new ActionRowBuilder()
	.addComponents(profileColorTextInput);

const profileImageActionRow = new ActionRowBuilder()
	.addComponents(profileImageTextInput);

const profileDescriptionActionRow = new ActionRowBuilder()
	.addComponents(profileDescriptionTextInput);

const profileTitleActionRow = new ActionRowBuilder()
	.addComponents(profileTitleTextInput);

const favoriteGameActionRow = new ActionRowBuilder()
	.addComponents(favoriteGameTextInput);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Customize your profile'),
	async run(interaction) {
		function sanitizeProfileColor(profileColor) {
			// Remove # if it's present
			if (profileColor.startsWith("#")) {
				return profileColor.substring(1);
			}
			return profileColor;
		}

		// Get the user's Discord ID
		const discordId = interaction.user.id;

		// Read the contents of the accounts.aof file
		const linkedAccountsData = fs.readFileSync('/home/minecraft/Main/plugins/DiscordSRV/accounts.aof', 'utf8');


		// Parse the AOF data into a JavaScript object
		const linkedAccounts = {};
		const linkedAccountsLines = linkedAccountsData.split('\n');
		for (const line of linkedAccountsLines) {
			const [discordId, minecraftUUID] = line.trim().split(' ');
			if (discordId && minecraftUUID) {
				linkedAccounts[discordId] = minecraftUUID;
			}
		}

		// Check if the user has linked their Discord account
		const minecraftUUID = linkedAccounts[discordId];

		if (!minecraftUUID) {
			return interaction.reply({ content: 'You must link your Discord account to your Minecraft account before you can customize your profile.', flags: MessageFlags.Ephemeral });
		}

		const trimmedUUID = minecraftUUID.replace(/-/g, '');

		// Check for existing profile in griggydb
		const row = await queryDB(databaseDir, 'SELECT * FROM users WHERE discord_id = ?', [discordId], true);
		if (!row) {
			await queryDB(databaseDir, 'INSERT INTO users(discord_id, minecraft_uuid, profile_color, profile_image, profile_description, vouches) VALUES(?, ?, ?, ?, ?, ?)', [discordId, trimmedUUID, '000000', `https://visage.surgeplay.com/bust/256/${trimmedUUID}`, 'This user has not set a profile description.', '0']);
		}
		
		// Show modal and await response

		const profileModal = new ModalBuilder()
			.setCustomId('profileModal')
			.setTitle('Profile Customization - ' + interaction.user.username)
			.addComponents(profileColorActionRow, profileImageActionRow, profileDescriptionActionRow, profileTitleActionRow, favoriteGameActionRow);

		await interaction.showModal(profileModal);

		const modalInteraction = await interaction.awaitModalSubmit({ filter: i => i.customId === 'profileModal' && i.user.id === interaction.user.id, time: 300000 });
		modalInteraction.deferUpdate();

		// Try to update user profile with values from modal
		const profileColorRaw = modalInteraction.fields.getTextInputValue('profileColorTextInput');
		const profileColor = sanitizeProfileColor(profileColorRaw);
		const profileImage = modalInteraction.fields.getTextInputValue('profileImageTextInput');
		const profileDescription = modalInteraction.fields.getTextInputValue('profileDescriptionTextInput');
		const profileTitle = modalInteraction.fields.getTextInputValue('profileTitleTextInput');
		const favoriteGame = modalInteraction.fields.getTextInputValue('favoriteGameTextInput');

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

		await queryDB(databaseDir, sql, params);

		// Send confirmation message
		const confirmationEmbed = new EmbedBuilder()
			.setTitle('Profile Customization')
			.setDescription('Your profile has been updated!')
			.setColor('77dd77');

		return interaction.followUp({ embeds: [confirmationEmbed] });

	},
};