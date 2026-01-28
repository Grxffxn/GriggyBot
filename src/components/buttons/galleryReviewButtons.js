const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const { checkStaff } = require('../../utils/roleCheckUtils.js');
const { updateGalleryCache } = require('../../events/buildGalleryContainers.js');

const GALLERY_PATH = path.join(__dirname, '../../../assets/gallery');

module.exports = {
  customId: 'galleryReview',
  run: async (interaction, args) => {
    const isStaff = checkStaff(interaction.member);
    if (!isStaff) {
      return interaction.followUp({ content: 'You do not have permission to approve gallery images.', flags: MessageFlags.Ephemeral });
    }
    const action = args[0];
    const disabledFilename = args[1];
    const filePath = path.join(GALLERY_PATH, disabledFilename);

    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: 'File not found. It may have already been processed.', flags: MessageFlags.Ephemeral });
    }

    if (action === 'approve') {
      // Remove the .disabled extension
      const approvedFilename = disabledFilename.replace(/\.disabled$/, '');
      const approvedPath = path.join(GALLERY_PATH, approvedFilename);
      fs.renameSync(filePath, approvedPath);
      updateGalleryCache();
      await interaction.update({
        content: `✅ Image approved and added to the gallery!\nApproved by ${interaction.member}`,
        components: []
      });
    } else if (action === 'reject') {
      // Delete the file
      fs.unlinkSync(filePath);
      updateGalleryCache();
      await interaction.update({
        content: `❌ Image rejected and deleted.\nRejected by ${interaction.member}`,
        components: []
      });
    } else {
      await interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
    }
  }
};