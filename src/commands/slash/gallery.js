const fs = require('fs');
const path = require('path');
const { getGalleryPage, getGalleryPageCount, updateGalleryCache } = require('../../events/buildGalleryContainers.js');
const { ButtonBuilder, ActionRowBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');

function getNextAlphaKey(existingFiles) {
  // Extract the alphabetical key from each filename, regardless of format
  const keys = existingFiles
    .map(f => {
      // Remove extension(s)
      let base = f.split('.')[0];
      // Get the part before the first hyphen, or the whole base if no hyphen
      return base.split('-')[0];
    })
    .filter(k => /^[a-z]+$/.test(k));
  if (keys.length === 0) return 'aaaaa';
  keys.sort();
  let last = keys[keys.length - 1];
  // Increment the last key alphabetically
  let arr = last.split('');
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== 'z') {
      arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
      break;
    } else {
      arr[i] = 'a';
    }
  }
  return arr.join('');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gallery')
    .setDescription('View the server gallery')
    .addAttachmentOption(option =>
      option.setName('upload')
        .setDescription('Submit an image for review')
        .setRequired(false)
    ),
  async run(interaction) {
    const userId = interaction.user.id;
    const attachment = interaction.options.getAttachment('upload');
    if (attachment) {
      interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const galleryPath = path.join(__dirname, '../../../assets/gallery');
      if (!fs.existsSync(galleryPath)) {
        fs.mkdirSync(galleryPath, { recursive: true });
      }
      const allFiles = fs.readdirSync(galleryPath);
      const alphaKey = getNextAlphaKey(allFiles);
      const ext = path.extname(attachment.name);
      const filename = `${alphaKey}-${userId}${ext}`;
      const disabledFilename = `${filename}.disabled`;
      const filePath = path.join(galleryPath, filename);
      const disabledFilePath = path.join(galleryPath, disabledFilename);

      const res = await fetch(attachment.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      fs.copyFileSync(filePath, disabledFilePath);

      const modChannel = await interaction.client.channels.fetch(interaction.client.config.modChannelId);
      if (modChannel) {
        const approveBtn = new ButtonBuilder()
          .setCustomId(`galleryReview:approve/${disabledFilename}`)
          .setLabel('Approve')
          .setStyle('Success');
        const rejectBtn = new ButtonBuilder()
          .setCustomId(`galleryReview:reject/${disabledFilename}`)
          .setLabel('Reject')
          .setStyle('Danger');
        const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

        await modChannel.send({
          content: `New gallery submission from ${interaction.member}`,
          files: [{ attachment: filePath, name: filename }],
          components: [row]
        });
      }

      fs.unlinkSync(filePath);
      await interaction.editReply('Your image has been submitted for review!');
    } else {
      const index = 0;
      const pageCount = getGalleryPageCount();
      const { container, files } = getGalleryPage(index);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/first`).setEmoji('⏪').setStyle('Primary').setDisabled(true),
        new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/prev`).setEmoji('⬅️').setStyle('Primary').setDisabled(true),
        new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/count`).setLabel(`1/${pageCount}`).setStyle('Secondary').setDisabled(true),
        new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/next`).setEmoji('➡️').setStyle('Primary').setDisabled(pageCount <= 1),
        new ButtonBuilder().setCustomId(`galleryPage:${userId}/${index}/last`).setEmoji('⏩').setStyle('Primary').setDisabled(pageCount <= 1)
      );
      await interaction.reply({
        components: [container.addActionRowComponents(buttons)],
        files,
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
      });
    }
  }
};