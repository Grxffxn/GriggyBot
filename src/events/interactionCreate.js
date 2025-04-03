const { Events, InteractionType } = require('discord.js');
const Vouch = require('./vouch.js');
const handleApplication = require('./handleApplication.js');
const handleReports = require('./handleReports.js');

module.exports = {
	name: Events.InteractionCreate,
	execute: async (interaction) => {
		const client = interaction.client;
		if (interaction.type == InteractionType.ApplicationCommand) {
			if (interaction.user.bot) return;
			try {
				const command = client.slashcommands.get(interaction.commandName);
				if (command && command.run) {
					command.run(interaction);
				} else {
					console.error(`Command ${interaction.commandName} not found or does not have a run method.`);
					interaction.reply({ content: ':no_entry_sign: Command is not valid.\nI think something just exploded...', ephemeral: true });
				}
			} catch (e) {
				console.error(e);
				interaction.reply({ content: ':dizzy_face: Uh oh! There was an error processing your slash command.', ephemeral: true });
			}
		} else if (interaction.type === InteractionType.MessageComponent) {
			if (interaction.customId.startsWith('vouchButton-')) {
				Vouch(interaction);
			}
			if (interaction.customId.startsWith('approve-') || interaction.customId.startsWith('deny-') || interaction.customId.startsWith('refresh-')) {
				handleApplication(interaction);
			}
			if (interaction.customId.startsWith('reportButton-')) {
				handleReports(interaction);
			}
		}
	},
};