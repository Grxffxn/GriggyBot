const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('List all of my commands'),

	async run(interaction) {

		const helpEmbed = new EmbedBuilder()
			.setTitle('The Legend Continues | Help')
			.setColor(`${config.defaultColor}`)
			.setDescription(`**GriggyCommands**`);

		const fields = config.commands.map(command => {
			return { name: `\`${config.prefix}${command.name}\``, value: command.description };
		});

		helpEmbed.addFields(...fields);

		helpEmbed.setFooter({ text: `Bot created by Griggy | ${config.prefix}donate` })
			.setThumbnail(`${config.logoImageUrl}`);

		await interaction.reply({ embeds: [helpEmbed] });

	},
};