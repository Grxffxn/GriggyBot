const { Events, InteractionType, MessageFlags } = require('discord.js');
const Vouch = require('./vouchEvent.js');
const handleApplication = require('./handleApplication.js');
const handleChoreApproval = require('./handleChoreApproval.js');
const { getConfig } = require('../utils/configUtils.js');
const { checkMom, checkStaff } = require('../utils/roleCheckUtils.js');

module.exports = {
  name: Events.InteractionCreate,
  execute: async interaction => {
    const client = interaction.client;
    if (interaction.type == InteractionType.ApplicationCommand) {
      if (interaction.user.bot) return;
      try {
        const command = client.slashcommands.get(interaction.commandName);
        if (command && command.run) {
          command.run(interaction);
        } else {
          interaction.client.log(
            `Command ${interaction.commandName} not found or does not have a run method.`,
            'ERROR'
          );
          interaction.reply({
            content: ':no_entry_sign: Command is not valid.\nI think something just exploded...',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (err) {
        interaction.client.log('Error processing slash command:', 'ERROR', err);
        interaction.reply({
          content: ':dizzy_face: Uh oh! There was an error processing your slash command.',
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.customId.startsWith('vouchButton-')) {
        Vouch(interaction);
      }
      if (
        interaction.customId.startsWith('approve-') ||
        interaction.customId.startsWith('deny-') ||
        interaction.customId.startsWith('refresh-')
      ) {
        handleApplication(interaction);
      }
      if (interaction.customId.startsWith('approve_')) {
        handleChoreApproval(interaction);
      }
      if (interaction.customId === 'redraw_chore') {
        const config = getConfig();

        if (!checkMom(interaction.member) && (!checkStaff(interaction.member) || !config.allowStaffApproveChores)) {
          return interaction.reply({
            content: ':no_entry_sign: You do not have permission to redraw chores.',
            ephemeral: true
          });
        }

        const handleRedraw = require('./chores.js').handleRedraw;
        await handleRedraw(interaction);
      }
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isAnySelectMenu()) {
      const [baseId, args] = interaction.customId.split(':');
      const splitArgs = args.split('/');
      if (interaction.isButton()) {
        const button = client.components.buttons.get(baseId);
        await button.run(interaction, splitArgs);
      }
      if (interaction.isModalSubmit()) {
        const modal = client.components.modals.get(baseId);
        await modal.run(interaction, splitArgs);
      }
      if (interaction.isRoleSelectMenu()) {
        const roleMenu = client.components.menus.roles.get(baseId);
        await roleMenu.run(interaction, splitArgs);
      }
      if (interaction.isChannelSelectMenu()) {
        const channelMenu = client.components.menus.channels.get(baseId);
        await channelMenu.run(interaction, splitArgs);
      }
      if (interaction.isMentionableSelectMenu()) {
        const mentionableMenu = client.components.menus.mentions.get(baseId);
        await mentionableMenu.run(interaction, splitArgs);
      }
      if (interaction.isStringSelectMenu()) {
        const stringMenu = client.components.menus.strings.get(baseId);
        await stringMenu.run(interaction, splitArgs);
      }
    }
  }
};
