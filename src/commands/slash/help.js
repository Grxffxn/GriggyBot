const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  EmbedBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const helpSections = require('../../helpSections.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all of my commands')
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command to get help for')
        .setChoices(
          { name: 'Fishing', value: 'fishing' },
          { name: 'Applications', value: 'applications' },
          { name: 'Gambling', value: 'gambling' },
          { name: 'Profile', value: 'profile' },
        )
    ),

  async run(interaction) {
    const config = interaction.client.config;
    const commandName = interaction.options.getString('command');

    const helpContainer = new ContainerBuilder()
      .setAccentColor(resolveColor(config.defaultColor));

    const titleSection = new SectionBuilder();
    const commandSection = new SectionBuilder();
    const separatorComponent = new SeparatorBuilder();
    const selectMenu = new StringSelectMenuBuilder();
    const actionRow = new ActionRowBuilder();

    switch (commandName) {
      case 'fishing':
        titleSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`# 🐡 griggyGoneFishin' Help`),
          new TextDisplayBuilder().setContent(`'griggyGoneFishin' is a fishing minigame provided by GriggyBot. You can catch fish, smoke them to increase their value, and sell them for in-game currency.`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Pufferfish_%28item%29_JE5_BE2.png',
          },
        }));
        commandSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`### Fishing Commands`),
          new TextDisplayBuilder().setContent(`**/fish** - Start fishing\n**/smoker** - Smoke your fish\n**/fishmarket** - Visit the fish market\n**/inventory** - View your inventory\n**/prestige** - Prestige to reset XP and increase fish value`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: config.logoImageUrl,
          },
        }));
        selectMenu
          .setCustomId(`help:fishing/${interaction.user.id}`)
          .setPlaceholder('Select a topic')
          .addOptions([
            { label: 'Basics', value: 'fishing_basics', description: 'How to start fishing', emoji: { name: '🐡' } },
            { label: 'Smoker', value: 'fishing_smoker', description: 'How to smoke fish', emoji: { name: '🔥' } },
            { label: 'Fishing Rods', value: 'fishing_rods', description: 'Using fishing rods', emoji: { name: '🎣' } },
            { label: 'Prestige', value: 'fishing_prestige', description: 'How to prestige', emoji: { name: '🏅' } },
          ]);
        actionRow.addComponents(selectMenu);
        helpContainer.addSectionComponents(titleSection)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents([helpSections.fishing_basics()])
          .addActionRowComponents(actionRow)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents(commandSection)
        return interaction.reply({
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });
      case 'applications':
        titleSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`# 📝 Applications Help`),
          new TextDisplayBuilder().setContent(`Our server uses applications to manage ranking up on Discord and in-game. You can apply for a rank once you've linked your accounts. For more information on linking, please use the \`/link\` Discord command.`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: 'https://minecraft.wiki/images/Lectern_with_Book_%28S%29.png',
          },
        }));
        commandSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`### Application Commands`),
          new TextDisplayBuilder().setContent(`**/apply** - Start an application\n**/deleteapplication** - Delete your active application`),
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: {
            url: config.logoImageUrl,
          },
        }));
        selectMenu
          .setCustomId(`help:applications/${interaction.user.id}`)
          .setPlaceholder('Select a topic')
          .addOptions([
            { label: 'Rank Applications', value: 'rank_applications', description: 'How to Apply', emoji: { name: '📝' } },
            { label: 'Vouches', value: 'rank_vouches', description: 'What are Vouches?', emoji: { name: '✔️' } },
            { label: 'Rank Points', value: 'rank_points', description: 'What are Rank Points?', emoji: { name: '➕' } },
          ]);
        actionRow.addComponents(selectMenu);
        helpContainer.addSectionComponents(titleSection)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents([helpSections.rank_applications()])
          .addActionRowComponents(actionRow)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents(commandSection);
        return interaction.reply({
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });
      case 'gambling':
        titleSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`# 🎲 griggyGambling`),
          new TextDisplayBuilder().setContent(`GriggyBot offers a variety of gambling games to test your luck and win in-game currency. Play responsibly!`)
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: { url: 'https://minecraft.wiki/images/Totem_of_Undying_JE2_BE2.png' }
        }));
        commandSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`### Gambling Commands`),
          new TextDisplayBuilder().setContent(`**/slots** - Play slots\n**/roulette** - Spin the roulette wheel\n**/blackjack** - Play blackjack\n**/rps** - Challenge someone to Rock-Paper-Scissors`)
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: { url: config.logoImageUrl }
        }));
        selectMenu
          .setCustomId(`help:gambling/${interaction.user.id}`)
          .setPlaceholder('Select a topic')
          .addOptions([
            { label: 'Basics', value: 'gambling_basics', description: 'How gambling works', emoji: { name: '🎲' } },
            { label: 'Slots', value: 'gambling_slots', description: 'How to play slots', emoji: { name: '🎰' } },
            { label: 'Roulette', value: 'gambling_roulette', description: 'How to play roulette', emoji: { name: '🎡' } },
            { label: 'Blackjack', value: 'gambling_blackjack', description: 'How to play blackjack', emoji: { name: '🃏' } },
            { label: 'Rock-Paper-Scissors', value: 'gambling_rps', description: 'How to play RPS', emoji: { name: '✊' } },
          ]);
        actionRow.addComponents(selectMenu);
        helpContainer.addSectionComponents(titleSection)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents([helpSections.gambling_basics()])
          .addActionRowComponents(actionRow)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents(commandSection);
        return interaction.reply({
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });

      case 'profile':
        titleSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`# 👤 Profile Customization Help`),
          new TextDisplayBuilder().setContent(`Customize your profile to stand out! Change your color, image, and description using the profile commands.`)
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: { url: 'https://minecraft.wiki/images/Painting_JE2_BE2.png' }
        }));
        commandSection.addTextDisplayComponents([
          new TextDisplayBuilder().setContent(`### Profile Commands`),
          new TextDisplayBuilder().setContent(`**/profile** - Edit your profile\n**/info** - View your profile or another user's profile`)
        ]).setThumbnailAccessory(new ThumbnailBuilder({
          media: { url: config.logoImageUrl }
        }));
        selectMenu
          .setCustomId(`help:profile/${interaction.user.id}`)
          .setPlaceholder('Select a topic')
          .addOptions([
            { label: 'Basics', value: 'profile_basics', description: 'Profile overview', emoji: { name: '👤' } },
            { label: 'Color', value: 'profile_color', description: 'Change your profile color', emoji: { name: '🎨' } },
            { label: 'Image', value: 'profile_image', description: 'Change your profile image', emoji: { name: '🖼️' } },
            { label: 'Description', value: 'profile_description', description: 'Edit your profile description', emoji: { name: '📝' } },
          ]);
        actionRow.addComponents(selectMenu);
        helpContainer.addSectionComponents(titleSection)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents([helpSections.profile_basics()])
          .addActionRowComponents(actionRow)
          .addSeparatorComponents(separatorComponent)
          .addSectionComponents(commandSection);
        return interaction.reply({
          components: [helpContainer],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });

      default:
        const slashCommands = await interaction.client.application.commands.fetch();
        const prefixCommandsPath = path.join(__dirname, '../prefix');
        const prefixCommands = [];

        fs.readdirSync(prefixCommandsPath).forEach(file => {
          if (file.endsWith('.js')) {
            const command = require(path.join(prefixCommandsPath, file));
            if (command.name && command.description) {
              prefixCommands.push(command);
            }
          }
        });

        const enabledPrefixCommands = prefixCommands.filter(cmd => {
          const featureName = `enable${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}`;
          return config[featureName] !== false;
        });

        // Alphabetize commands
        const sortedSlashCommands = [...slashCommands.values()]
          .sort((a, b) => a.name.localeCompare(b.name));

        const sortedPrefixCommands = enabledPrefixCommands.sort((a, b) => a.name.localeCompare(b.name));

        // Create the help embed
        const helpEmbed = new EmbedBuilder()
          .setTitle(`${config.serverName} | Help`)
          .setColor(parseInt(config.defaultColor, 16))
          .setDescription('**Available Commands**')
          .setThumbnail(config.logoImageUrl)
          .setFooter({ text: 'Bot created by Griggy' });

        function splitField(name, value, max = 1024) {
          const lines = value.split('\n');
          const fields = [];
          let current = '';
          for (const line of lines) {
            if ((current + line + '\n').length > max) {
              fields.push({ name, value: current });
              current = '';
            }
            current += line + '\n';
          }
          if (current) fields.push({ name, value: current });
          return fields;
        }

        const slashFieldValue = sortedSlashCommands
          .map(cmd => `\`/${cmd.name}\` - ${cmd.description}`)
          .join('\n');

        const prefixFieldValue = sortedPrefixCommands
          .map(cmd => `\`${config.prefix}${cmd.name}\` - ${cmd.description}`)
          .join('\n');

        if (slashFieldValue) {
          const slashFields = splitField('Slash Commands', slashFieldValue);
          helpEmbed.addFields(slashFields);
        }

        if (prefixFieldValue) {
          const prefixFields = splitField('Prefix Commands', prefixFieldValue);
          helpEmbed.addFields(prefixFields);
        }

        await interaction.reply({
          embeds: [helpEmbed],
          flags: MessageFlags.Ephemeral,
        })
    }
  },
};