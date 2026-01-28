const { getGalleryPage, getGalleryPageCount } = require('../../events/buildGalleryContainers');
const { ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');

module.exports = {
  customId: 'galleryPage',
  run: async (interaction, args) => {
    const [userId, currentIndex, action] = args;
    let index = parseInt(currentIndex, 10);
    const pageCount = getGalleryPageCount();

    switch (action) {
      case 'first': index = 0; break;
      case 'prev': index = Math.max(0, index - 1); break;
      case 'next': index = Math.min(pageCount - 1, index + 1); break;
      case 'last': index = pageCount - 1; break;
    }

    const { container, files } = getGalleryPage(index);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/first`).setEmoji('⏪').setStyle('Primary').setDisabled(index === 0),
      new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/prev`).setEmoji('⬅️').setStyle('Primary').setDisabled(index === 0),
      new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/count`).setLabel(`${index + 1}/${pageCount}`).setStyle('Secondary').setDisabled(true),
      new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/next`).setEmoji('➡️').setStyle('Primary').setDisabled(index === pageCount - 1),
      new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/last`).setEmoji('⏩').setStyle('Primary').setDisabled(index === pageCount - 1)
    );
    await interaction.update({
      components: [container.addActionRowComponents(buttons)],
      files,
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
    });
  }
};