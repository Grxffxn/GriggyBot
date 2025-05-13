const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const { queryDB } = require('../../utils/databaseUtils.js');

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
		const config = interaction.client.config;
		const griggyDatabaseDir = config.griggyDbPath;

		// Get the user's Discord ID
		const discordId = interaction.user.id;

		// Read the contents of the accounts.aof file
    const accountsFilePath = config.accounts_aof;
		const linkedAccountsData = fs.readFileSync(accountsFilePath, 'utf8');


		// Parse the AOF data into a JavaScript object
		const linkedAccounts = {};
		const linkedAccountsLines = linkedAccountsData.split('\n');
		for (const line of linkedAccountsLines) {
			const [discordId, minecraftUUID] = line.trim().split(' ');
			if (discordId && minecraftUUID) linkedAccounts[discordId] = minecraftUUID;
		}

		// Check if the user has linked their Discord account
		const minecraftUUID = linkedAccounts[discordId];

		if (!minecraftUUID) return interaction.reply({ content: 'You must link your Discord account to your Minecraft account before you can customize your profile.', flags: MessageFlags.Ephemeral });

		const trimmedUUID = minecraftUUID.replace(/-/g, '');

		// Check for existing profile in griggydb
		const row = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [discordId], true);
		if (!row) await queryDB(griggyDatabaseDir, 'INSERT INTO users(discord_id, minecraft_uuid, profile_color, profile_image, profile_description, vouches) VALUES(?, ?, ?, ?, ?, ?)', [discordId, trimmedUUID, '000000', `https://visage.surgeplay.com/bust/256/${trimmedUUID}`, 'This user has not set a profile description.', '0']);
		
		// Show modal and await response

		const profileModal = new ModalBuilder()
			.setCustomId(`profileModal:${trimmedUUID}`)
			.setTitle('Profile Customization - ' + interaction.member.displayName)
			.addComponents(profileColorActionRow, profileImageActionRow, profileDescriptionActionRow, profileTitleActionRow, favoriteGameActionRow);

		await interaction.showModal(profileModal);
	},
};