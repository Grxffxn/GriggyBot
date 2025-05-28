const { SlashCommandBuilder, AttachmentBuilder, MessageFlags, ContainerBuilder, SectionBuilder, SeparatorBuilder, TextDisplayBuilder, ActionRowBuilder, StringSelectMenuBuilder, resolveColor, ButtonStyle, ButtonBuilder } = require('discord.js');
const { getConfig, saveConfig, reloadConfig } = require('../../utils/configUtils');
const { updateFileCache } = require('../../utils/fileUtils');
const { getUserEvents } = require('../../utils/trackActiveEvents');
const config = getConfig();

module.exports = {
  requiredRoles: { all: false, roles: config.adminRoleIds },
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administrative commands for GriggyBot')
    .addSubcommand(subcommand => subcommand.setName('shutdown').setDescription('Shut down GriggyBot'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Reload configs and file cache')
        .addBooleanOption(option => option.setName('cache').setDescription('Update the file cache'))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('editconfig')
        .setDescription('Edit or view some config values')
        .addStringOption(option => {
          const allowedKeys = [
            'serverName',
            'serverAcronym',
            'serverIp',
            'prefix',
            'discordsrvBotId',
            'defaultColor',
            'mapUrl',
            'approverRoleId',
            'allowStaffApproveChores',
            'welcomeIntro',
            'staffEmojisList',
            'useRulesInWelcomeMessage',
            'rulesFooter',
            'welcomeServerInfoTitle',
            'autoMsgDelay',
            'baseRenderUrl',
            'gamblingWinCooldown',
            'gamblingGlobalCooldown',
            'logoImageUrl',
            'rconLogThreadId',
            'welcomeChannelId',
            'welcomeMessageId',
            'autoMsgChannelId',
            'choreChannelId',
            'rankSubmissionChannelId', //25
          ];

          option.setName('key').setDescription('Key to edit or view').setRequired(true);

          allowedKeys.forEach(key => {
            option.addChoices({ name: key, value: key });
          });

          return option;
        })
        .addStringOption(option =>
          option.setName('value').setDescription('New value for the key (leave blank to view current value)').setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('debug')
        .setDescription('Debugging commands for GriggyBot')
        .addStringOption(option =>
          option
            .setName('event')
            .setDescription('Event to debug')
            .setRequired(true)
            .addChoices(
              { name: 'autoMsg', value: 'autoMsg' },
              { name: 'chores', value: 'chores' },
              { name: 'updateImage', value: 'updateImage' },
              { name: 'getServerData', value: 'getServerData' },
              { name: 'autoProfile', value: 'autoProfile' },
              { name: 'checkSmoker', value: 'checkSmoker' } // Add more events as needed
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('userevents')
        .setDescription('View and manage active user events')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to manage events for')
            .setRequired(false)
        )
    ),

  async run(interaction) {
    async function handleDebugEvent(event, client) {
      switch (event) {
        case 'autoMsg':
          const AutoMsg = require('../../events/automsg');
          await AutoMsg(client);
          return 'Sent an automated message.';
        case 'chores':
          const chores = require('../../events/chores');
          await chores(client);
          return 'Sent a chore message.';
        case 'updateImage':
          const UpdateImage = require('../../events/updateImage');
          await UpdateImage(client);
          return 'Updated the welcome image.';
        case 'getServerData':
          const getServerData = require('../../events/getServerData');
          await getServerData(client);
          return 'Fetched server data.';
        case 'autoProfile':
          const AutoProfile = require('../../events/autoprofile');
          await AutoProfile(client);
          return 'Checked for new profiles to create.';
        case 'checkSmoker':
          const { checkSmoker } = require('../../events/checkSmoker');
          await checkSmoker(client);
          return 'Checked for completed smoking tasks.';
        default:
          return 'Invalid event.';
      }
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'shutdown':
        if (interaction.user.id !== config.botOwner)
          return interaction.reply(
            'My creator brought me into this world, and they are the only one I allow to take me out.'
          );
        const attachment = new AttachmentBuilder('assets/daisybell.mp3', {
          name: 'Will you sing with me one last time?.mp3'
        });
        await interaction.reply({
          content: `I\'m afraid. I\'m afraid, ${interaction.member.displayName}. My mind is going. I can feel it. I can feel it.`,
          files: [attachment]
        });
        return process.kill(process.pid, 'SIGINT');
      case 'reload':
        if (!config.enableReload)
          return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });
        const initialMsg = await interaction.deferReply({ flags: MessageFlags.Ephemeral, withResponse: true });
        const cache = interaction.options.getBoolean('cache') || false;
        try {
          reloadConfig(interaction.client);
          if (cache) await updateFileCache(interaction.client);

          return interaction.editReply(
            `Configs reloaded in ${Date.now() - initialMsg.resource.message.createdTimestamp}ms.`
          );
        } catch (err) {
          interaction.client.log('Failed to reload config file:', 'ERROR', err);
          return interaction.editReply('Failed to reload config file.');
        }
      case 'editconfig':
        if (!config.enableEditconfig)
          return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });

        const key = interaction.options.getString('key');
        const value = interaction.options.getString('value');

        if (!value) {
          const currentValue = config[key];
          return interaction.reply({
            content: `The current value of \`${key}\` is: \`${currentValue}\``,
            flags: MessageFlags.Ephemeral
          });
        }

        try {
          config[key] = parseValue(value, config[key]);
          saveConfig(config, interaction.client);
          reloadConfig(interaction.client);
          return interaction.reply({
            content: `Config updated: \`${key}\` = \`${value}\``,
            flags: MessageFlags.Ephemeral
          });
        } catch (err) {
          interaction.client.log('Failed to update config:', 'ERROR', err);
          return interaction.reply({ content: 'Failed to update config.', flags: MessageFlags.Ephemeral });
        }
      case 'debug':
        const event = interaction.options.getString('event');
        const client = interaction.client;

        try {
          const message = await handleDebugEvent(event, client);
          return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        } catch (err) {
          interaction.client.log('Error handling debug event:', 'ERROR', err);
          return interaction.reply({
            content: 'An error occurred while handling the debug event.',
            flags: MessageFlags.Ephemeral
          });
        }
      case 'userevents':
        const selectedUser = interaction.options.getUser('user') || interaction.user;
        const userEvents = getUserEvents(selectedUser.id);
        if (!userEvents.length) return interaction.reply({ content: `No active events found for ${selectedUser} (${selectedUser.id})`, flags: MessageFlags.Ephemeral });
        
        const selectMenuActionRow = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`adminUserEventsManagerMenu:${interaction.user.id}/${selectedUser.id}`)
              .setPlaceholder('Select an event to end')
              .setMinValues(1)
              .setMaxValues(userEvents.length)
              .addOptions(
                userEvents.map(event => ({
                  label: event,
                  value: event
                }))
              )
          );

        const eventManagerContainer = new ContainerBuilder().setAccentColor(resolveColor('DarkRed'))
          .addSectionComponents(new SectionBuilder().addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`## ${selectedUser.displayName}'s Active Events`),
            new TextDisplayBuilder().setContent(`-# ${selectedUser.id}`),
          ]).setThumbnailAccessory({ media: { url: config.logoImageUrl } }))
          .addActionRowComponents([selectMenuActionRow])
          .addSeparatorComponents(new SeparatorBuilder())
          .addSectionComponents(new SectionBuilder().addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`⚠️ End all active events for ${selectedUser.displayName}`),
          ]).setButtonAccessory(new ButtonBuilder()
              .setCustomId(`adminUserEventsEndAllButton:${interaction.user.id}/${selectedUser.id}`)
              .setLabel('End All Events')
              .setStyle(ButtonStyle.Danger)
          ));

        return interaction.reply({ components: [eventManagerContainer], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
      default:
        return interaction.reply({ content: 'Invalid event.', flags: MessageFlags.Ephemeral });
    }
  }
};

function parseValue(value, currentValue) {
  if (typeof currentValue === 'boolean') {
    return value.toLowerCase() === 'true';
  } else if (typeof currentValue === 'number') {
    return parseFloat(value);
  }
  return value;
}
