const { Events, InteractionType, MessageFlags } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  execute: async interaction => {
    const client = interaction.client;
    if (interaction.type == InteractionType.ApplicationCommand) {
      if (interaction.user.bot) return;
      try {
        const command = client.slashcommands.get(interaction.commandName);
        if (command && command.run) {
          if (command.requiredRoles) {
            const { all, roles } = command.requiredRoles;
            if (all === true) {
              if (!interaction.member.roles.cache.hasAll(...roles)) {
                return await interaction.reply({
                  content: `⚠️ You do not have the required roles to use this command!`,
                  ephemeral: true
                });
              }
            } else {
              if (!interaction.member.roles.cache.hasAny(...roles)) {
                return await interaction.reply({
                  content: `⚠️ You do not have any of the required roles to use this command!`,
                  ephemeral: true
                });
              }
            }
          }
          await command.run(interaction);
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
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isAnySelectMenu()) {
      const [baseId, args] = interaction.customId.split(':');
      const splitArgs = args.split('/');
      if (interaction.isButton()) {
        const button = client.components.buttons.get(baseId);
        if (!button) return;
        await button.run(interaction, splitArgs);
      }
      if (interaction.isModalSubmit()) {
        const modal = client.components.modals.get(baseId);
        if (!modal) return;
        await modal.run(interaction, splitArgs);
      }
      if (interaction.isRoleSelectMenu()) {
        const roleMenu = client.components.menus.roles.get(baseId);
        if (!roleMenu) return;
        await roleMenu.run(interaction, splitArgs);
      }
      if (interaction.isChannelSelectMenu()) {
        const channelMenu = client.components.menus.channels.get(baseId);
        if (!channelMenu) return;
        await channelMenu.run(interaction, splitArgs);
      }
      if (interaction.isMentionableSelectMenu()) {
        const mentionableMenu = client.components.menus.mentions.get(baseId);
        if (!mentionableMenu) return;
        await mentionableMenu.run(interaction, splitArgs);
      }
      if (interaction.isStringSelectMenu()) {
        const stringMenu = client.components.menus.strings.get(baseId);
        if (!stringMenu) return;
        await stringMenu.run(interaction, splitArgs);
      }
    }
  }
};
