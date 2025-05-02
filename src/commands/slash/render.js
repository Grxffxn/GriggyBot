const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const { getConfig } = require('../../utils/configUtils');

const defaultSkinType = 'wide';

module.exports = {
	data : new SlashCommandBuilder()
		.setName('render')
		.setDescription('Player renders')
		.addStringOption(option =>
			option.setName('render_type')
				.setDescription('Type of render')
				.setRequired(true)
				.addChoices(
					{ name: 'Full Body', value: 'body' },
					{ name: '3D Skull', value: 'head' },
					{ name: '2D Avatar', value: 'avatar' },
					{ name: '3D Bust', value: 'bust' },
				),
		)
		.addStringOption(option =>
			option.setName('username')
				.setDescription('Minecraft username')
				.setRequired(true),
		)
		.addStringOption(option =>
			option.setName('skintype')
				.setDescription('Skin type')
				.setRequired(false)
				.addChoices(
					{ name: 'Steve', value: 'wide' },
					{ name: 'Alex', value: 'slim' },
				),
		),
	async run(interaction) {
		const username = interaction.options.getString('username');
		const rendertype = interaction.options.getString('render_type');
		const skintype = interaction.options.getString('skintype') || defaultSkinType;

		if (username.startsWith('.')) {
			return interaction.reply({ content: 'Sorry, Bedrock renders are not supported.', flags: MessageFlags.Ephemeral });
		}
		try {
			const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);

			if (!response.data) {
				return interaction.reply({content: 'That player doesn\'t exist :(', flags: MessageFlags.Ephemeral });
			}

			const playerUUID = response.data.id;
			const trimmedUUID = playerUUID.replace(/-/g, '');

			const config = getConfig();
			let renderUrl = '';
			if (rendertype === 'body') renderUrl = `${config.baseRenderUrl}full/384/${trimmedUUID}?${skintype}`;
			if (rendertype === 'head') renderUrl = `${config.baseRenderUrl}head/256/${trimmedUUID}?${skintype}`;
			if (rendertype === 'avatar') renderUrl = `${config.baseRenderUrl}face/256/${trimmedUUID}?${skintype}`;
			if (rendertype === 'bust') renderUrl = `${config.baseRenderUrl}bust/256/${trimmedUUID}?${skintype}`;

			interaction.reply({ content: renderUrl });
		} catch (err) {
			interaction.client.log('Error fetching player data:', 'ERROR', err);
			interaction.reply({ content: 'An error occurred while fetching player data.', flags: MessageFlags.Ephemeral });
		}
	},
};
