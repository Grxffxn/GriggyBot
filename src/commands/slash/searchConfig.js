const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { updateFileCache, searchConfigFiles } = require('../../utils/fileUtils.js');
const { getConfig } = require('../../utils/configUtils.js');
const config = getConfig();

const MAX_ENTRIES_MENU_OPTIONS = 25;

module.exports = {
  requiredRoles: { all: false, roles: config.adminRoleIds },
  data: new SlashCommandBuilder()
    .setName('searchconfig')
    .setDescription('Search the config for a specific keyword')
    .addStringOption(option => option.setName('keyword').setDescription('The keyword to search for').setRequired(true))
    .addStringOption(option => option.setName('directory').setDescription('The folder to search in'))
    .addStringOption(option => option.setName('replyto').setDescription('Link to a message to reply to'))
    .addBooleanOption(option => option.setName('includebackups').setDescription('Include backup files')),

  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (Object.keys(interaction.client.fileCache).length === 0) {
      await interaction.editReply('File cache is empty. Updating...');

      const success = await updateFileCache(interaction.client);
      if (!success) return interaction.editReply('Failed to update file cache. See logs for more info.');
    }

    const keyword = interaction.options.getString('keyword');
    const directory = interaction.options.getString('directory');
    const includeBackups = interaction.options.getBoolean('includebackups') || false;
    const replyTo = interaction.options.getString('replyto');
    const validReplyLink = replyTo && replyTo.startsWith('https://discord.com/channels/');

    if (replyTo && !validReplyLink) return interaction.editReply({ content: 'Invalid message link. Please provide a valid link.', flags: MessageFlags.Ephemeral });

    const matches = await searchConfigFiles(keyword, directory, interaction.client.fileCache, includeBackups);
    let selectedIndex = 0;

    let state = {
      draftMsg: '',
      currentLine: null,
      highestLine: null,
      fileName: null,
      allLines: null,
    }

    let currentIndex = 0;

    if (matches.length === 0) return interaction.editReply(`No matches found for **${keyword}**.`);
    if (matches.length === 1) await initializeState();

    async function initializeState() {
      const selectedMatch = matches[selectedIndex];
      state.currentLine = selectedMatch.line;
      state.highestLine = state.currentLine;
      state.fileName = selectedMatch.file;
      state.allLines = interaction.client.fileCache[state.fileName];
      state.draftMsg = `**File:** ${state.fileName}\n**Line ${state.currentLine}**\n\`\`\`yaml\n${selectedMatch.content}\n\`\`\``;
      const { addRow, deleteRow, postRow } = createElements('edit');
      await interaction.editReply({ content: state.draftMsg, components: [addRow, deleteRow, postRow] });
    }

    const updateSearchResults = async (currentIndex = 0) => {
      const totalMatches = matches.length;
      const start = currentIndex + 1;
      const end = Math.min(currentIndex + MAX_ENTRIES_MENU_OPTIONS, totalMatches);

      const { selectMenuRow, navigationRow } = createElements('select', matches, currentIndex);

      await interaction.editReply({
        content: `Found ${totalMatches} matches for **${keyword}**. Showing matches ${start}-${end}.`,
        components: totalMatches > MAX_ENTRIES_MENU_OPTIONS ? [selectMenuRow, navigationRow] : [selectMenuRow],
      });
    };

    function createElements(event, matches, currentIndex = 0) {

      function createButtonRow(buttons) {
        return new ActionRowBuilder().addComponents(buttons);
      }

      if (event === 'edit') {
        const addRow = createButtonRow([
          new ButtonBuilder().setCustomId(`upLine-sc-${interaction.id}`).setLabel('Add Line Above').setEmoji('⬆️').setStyle('Primary'),
          new ButtonBuilder().setCustomId(`downLine-sc-${interaction.id}`).setLabel('Add Line Below').setEmoji('⬇️').setStyle('Primary'),
          new ButtonBuilder().setCustomId(`up5Lines-sc-${interaction.id}`).setLabel('Add 5 Lines Above').setEmoji('⏫').setStyle('Primary'),
          new ButtonBuilder().setCustomId(`down5Lines-sc-${interaction.id}`).setLabel('Add 5 Lines Below').setEmoji('⏬').setStyle('Primary')
        ]);
        const deleteRow = createButtonRow([
          new ButtonBuilder().setCustomId(`removeTopLine-sc-${interaction.id}`).setLabel('Remove Top Line').setStyle('Danger'),
          new ButtonBuilder().setCustomId(`removeBottomLine-sc-${interaction.id}`).setLabel('Remove Bottom Line').setStyle('Danger')
        ]);
        const postRow = createButtonRow([
          new ButtonBuilder().setCustomId(`post-sc-${interaction.id}`).setLabel('Post to Channel').setEmoji('📢').setStyle('Success')
        ]);

        return { addRow, deleteRow, postRow };
      } else if (event === 'select') {
        const selectMenuRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`selectMatch-sc-${interaction.id}`)
            .setPlaceholder('Select a match')
            .addOptions(
              matches.slice(currentIndex, currentIndex + MAX_ENTRIES_MENU_OPTIONS).map((match, i) => {
                const lineInfo = `(Line ${match.line})`;
                const maxFileLength = 100 - lineInfo.length - 1;
                const truncatedFile = match.file.length > maxFileLength
                  ? `${match.file.slice(0, maxFileLength - 3)}...`
                  : match.file;

                return {
                  label: match.content.length > 100
                    ? `${match.content.slice(0, 97)}...`
                    : match.content,
                  description: `${truncatedFile} ${lineInfo}`,
                  value: `${currentIndex + i}`,
                };
              })
            )
        );
        const navigationRow = createButtonRow([
          new ButtonBuilder().setCustomId(`previousPage-sc-${interaction.id}`).setLabel('Previous').setStyle('Primary').setDisabled(currentIndex === 0),
          new ButtonBuilder().setCustomId(`nextPage-sc-${interaction.id}`).setLabel('Next').setStyle('Primary').setDisabled(currentIndex + MAX_ENTRIES_MENU_OPTIONS >= matches.length)
        ]);

        return { selectMenuRow, navigationRow };
      }
    }

    async function modifyDraftMessage(action, state, i) {
      const lines = {
        above: state.currentLine > 1 ? (state.allLines[state.currentLine - 2] || '\u200B') : null,
        below: state.highestLine < state.allLines.length ? (state.allLines[state.highestLine] || '\u200B') : null,
      };

      const yamlContent = state.draftMsg.split('```yaml\n')[1]?.split('\n```')[0] || '';
      const yamlLines = yamlContent.split('\n');

      let simulatedCurrentLine = state.currentLine;
      let simulatedHighestLine = state.highestLine;
      let simulatedYamlLines = [...yamlLines];

      switch (action) {
        case 'upLine':
          if (lines.above) {
            simulatedYamlLines.unshift(lines.above);
            simulatedCurrentLine--;
          }
          break;
        case 'up5Lines': {
          const start = Math.max(0, simulatedCurrentLine - 6);
          const end = simulatedCurrentLine - 2;
          const linesToAdd = state.allLines.slice(start, end + 1).map(line => line || '\u200B');
          simulatedYamlLines.unshift(...linesToAdd);
          simulatedCurrentLine -= linesToAdd.length;
          break;
        }
        case 'downLine':
          if (lines.below) {
            simulatedYamlLines.push(lines.below);
            simulatedHighestLine++;
          }
          break;
        case 'down5Lines': {
          const start = simulatedHighestLine;
          const end = Math.min(state.allLines.length - 1, simulatedHighestLine + 4);
          const linesToAdd = state.allLines.slice(start, end + 1).map(line => line || '\u200B');
          simulatedYamlLines.push(...linesToAdd);
          simulatedHighestLine += linesToAdd.length;
          break;
        }
        case 'removeTopLine':
          if (simulatedYamlLines.length > 0) {
            simulatedYamlLines.shift();
            simulatedCurrentLine++;
          }
          break;
        case 'removeBottomLine':
          if (simulatedYamlLines.length > 0) {
            simulatedYamlLines.pop();
            simulatedHighestLine--;
          }
          break;
      }

      const newEndLine = simulatedCurrentLine + simulatedYamlLines.length - 1;
      const newDraftMsg = `**File:** ${state.fileName}\n**Lines ${simulatedCurrentLine}-${newEndLine}**\n\`\`\`yaml\n${simulatedYamlLines.join('\n')}\n\`\`\``;

      if (newDraftMsg.length > 2000) return i.reply({ content: '⚠️ Adding this content would exceed the 2000-character limit. Please reduce the content.', flags: MessageFlags.Ephemeral });

      state.currentLine = simulatedCurrentLine;
      state.highestLine = simulatedHighestLine;
      state.draftMsg = newDraftMsg;

      const { addRow, deleteRow, postRow } = createElements('edit');
      await i.update({ content: state.draftMsg, components: [addRow, deleteRow, postRow] });
    }

    if (matches.length > 1) await updateSearchResults();

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 });

    collector.on('collect', async i => {
      const [action, , interactionId] = i.customId.split('-');
      if (interactionId !== interaction.id) return;

      switch (action) {
        case 'upLine':
        case 'downLine':
        case 'up5Lines':
        case 'down5Lines':
        case 'removeTopLine':
        case 'removeBottomLine':
          if (!state.allLines) return i.reply({ content: 'Unable to fetch file content. Please try again.', flags: MessageFlags.Ephemeral });
          await modifyDraftMessage(action, state, i);
          break;

        case 'nextPage':
          currentIndex += MAX_ENTRIES_MENU_OPTIONS;
          await updateSearchResults(currentIndex);
          await i.deferUpdate();
          break;

        case 'previousPage':
          currentIndex -= MAX_ENTRIES_MENU_OPTIONS;
          await updateSearchResults(currentIndex);
          await i.deferUpdate();
          break;

        case 'selectMatch':
          selectedIndex = parseInt(i.values[0]);
          i.deferUpdate();
          await initializeState();
          break;

        case 'post':
          await i.deferUpdate();
          if (replyTo) {
            const messageId = replyTo.split('/').pop();
            const channelId = replyTo.split('/')[5];
            const channel = await interaction.client.channels.fetch(channelId);
            const message = await channel.messages.fetch(messageId);
            await message.reply({ content: state.draftMsg });
          } else {
            await interaction.channel.send({ content: state.draftMsg });
          }
          collector.stop('success');

        default:
          break;
      }
    });

    collector.on('end', async (collected, reason) => {
      switch (reason) {
        case 'time':
          return interaction.editReply({ content: 'Search timed out.', components: [] });

        case 'success':
          return interaction.deleteReply();

        default:
          return interaction.editReply({ content: 'Search ended unexpectedly.', components: [] });
      }
    });
  }
}