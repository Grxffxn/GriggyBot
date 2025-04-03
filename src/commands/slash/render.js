const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { baseRenderUrl } = require('../../config.js');

const defaultSkinType = 'wide';

module.exports = {
	data : new SlashCommandBuilder()
		.setName('render')
		.setDescription('Player Renders')
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
			return interaction.reply('Sorry, Bedrock renders are not supported.')
		}
		try {
			const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);

			if (!response.data) {
				return interaction.reply('That player either doesn\'t exist or hasn\'t been on TLC before. :(');
			}

			const playerUUID = response.data.id;
			const trimmedUUID = playerUUID.replace(/-/g, '');

			let renderUrl = '';
			if (rendertype === 'body') renderUrl = `${baseRenderUrl}full/384/${trimmedUUID}?${skintype}`;
			if (rendertype === 'head') renderUrl = `${baseRenderUrl}head/256/${trimmedUUID}?${skintype}`;
			if (rendertype === 'avatar') renderUrl = `${baseRenderUrl}face/256/${trimmedUUID}?${skintype}`;
			if (rendertype === 'bust') renderUrl = `${baseRenderUrl}bust/256/${trimmedUUID}?${skintype}`;

			interaction.reply({ content: renderUrl });
		} catch (error) {
			console.error(error);
			interaction.reply('An error occurred while fetching player data.');
		}
	},
};
