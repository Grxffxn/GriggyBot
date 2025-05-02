const { Events, InteractionType, MessageFlags } = require('discord.js');
const Vouch = require('./vouchEvent.js');
const handleApplication = require('./handleApplication.js');
const handleChoreApproval = require('./handleChoreApproval.js');

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
					interaction.client.log(`Command ${interaction.commandName} not found or does not have a run method.`, 'ERROR');
					interaction.reply({ content: ':no_entry_sign: Command is not valid.\nI think something just exploded...', flags: MessageFlags.Ephemeral });
				}
			} catch (err) {
				interaction.client.log('Error processing slash command:', 'ERROR', err);
				interaction.reply({ content: ':dizzy_face: Uh oh! There was an error processing your slash command.', flags: MessageFlags.Ephemeral });
			}
		} else if (interaction.type === InteractionType.MessageComponent) {
			if (interaction.customId.startsWith('vouchButton-')) {
				Vouch(interaction);
			}
			if (interaction.customId.startsWith('approve-') || interaction.customId.startsWith('deny-') || interaction.customId.startsWith('refresh-')) {
				handleApplication(interaction);
			}
			if (interaction.customId.startsWith('approve_')) {
				handleChoreApproval(interaction);
			}
		}
	},
};