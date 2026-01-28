const fs = require('fs');
const path = require('path');
const { ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, resolveColor } = require('discord.js');
const { getConfig } = require('../utils/configUtils');
const config = getConfig();

const GALLERY_PATH = path.join(__dirname, '../../assets/gallery');
const PAGE_SIZE = 4;

let galleryCache = null;

function updateGalleryCache() {
  galleryCache = fs.readdirSync(GALLERY_PATH).filter(f => /\.(png|jpe?g|gif)$/i.test(f));
}

function getGalleryPageCount() {
  if (!galleryCache) updateGalleryCache();
  const files = galleryCache;
  return Math.ceil(files.length / PAGE_SIZE);
}

function getGalleryPage(pageIndex) {
  if (!galleryCache) updateGalleryCache();
  const files = galleryCache;
  const images = files.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  const container = new ContainerBuilder();
  const mediaGallery = new MediaGalleryBuilder();

  const submitterLines = images.map((img, idx) => {
    const base = img.replace(/\.[^/.]+$/, '');
    const parts = base.split('-');
    let submitter;
    if (parts.length > 1 && /^\d+$/.test(parts[1])) {
      submitter = `<@${parts[1]}>`;
    } else {
      submitter = config.serverAcronym || config.serverName;
    }
    return `${idx + 1}. Submitted by ${submitter}`;
  });

  images.forEach(img => {
    mediaGallery.addItems(
      new MediaGalleryItemBuilder()
        .setURL(`attachment://${img}`)
    );
  });

  const section = new SectionBuilder().addTextDisplayComponents([
    new TextDisplayBuilder().setContent(
      `# ${config.serverAcronym || config.serverName} Community Gallery\n` +
      submitterLines.join('\n')
    )
  ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: config.logoImageUrl } }));

  container
    .setAccentColor(resolveColor(config.defaultColor))
    .addSectionComponents([section])
    .addMediaGalleryComponents([mediaGallery]);

  return {
    container,
    files: images.map(img => ({
      attachment: path.join(GALLERY_PATH, img),
      name: img
    }))
  };
}

module.exports = { updateGalleryCache, getGalleryPage, getGalleryPageCount };