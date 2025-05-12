const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
} = require('discord.js');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function createComponents(message, config) {
  const container = new ContainerBuilder();
  container.setAccentColor(message.color ? resolveColor(message.color) : resolveColor(config.defaultColor));
  const titleText = new TextDisplayBuilder().setContent(
    message.title ? `## ${message.title}` : `## ${config.serverName} | AutoMsg`
  );

  const contentText = new TextDisplayBuilder().setContent(
    `${message.description}`
  );
  const thumbnailComponent = new ThumbnailBuilder({
    media: {
      url: message.imageUrl || config.logoImageUrl,
    }
  })
  const buttonAttachment = new ButtonBuilder()
    .setCustomId(`tryMeButton:${message.event}`)
    .setLabel(message.buttonLabel || 'Try Me!')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(message.emoji || '🔗');

  const sectionComponent = new SectionBuilder()
    .addTextDisplayComponents([titleText, contentText])
    .setThumbnailAccessory(thumbnailComponent);

  const buttonSectionComponent = new SectionBuilder()
    .addTextDisplayComponents([new TextDisplayBuilder().setContent(
      `${message.footer?.text ? `\n-# ${message.footer.text}` : '-# Run `/help` to see what I can do!'}`
    )])
    .setButtonAccessory(buttonAttachment);

  if (message.event) {
    container.addSectionComponents([sectionComponent, buttonSectionComponent]);
  } else {
    container.addSectionComponents([sectionComponent]);
  }
  
  return container;
}

// OLD
function createEmbed(message, config) {
  const embed = new EmbedBuilder()
    .setTitle(`${config.serverName} | AutoMsg`)
    .setColor(config.defaultColor)
    .setDescription(message.description)
    .setThumbnail(config.logoImageUrl);

  if (message.footer) embed.setFooter(message.footer);

  return embed;
}

async function AutoMsg(client) {
  const config = client.config;
  const channel = client.channels.cache.get(config.autoMsgChannelId);

  if (!channel) return client.log('AutoMsg Error: Channel not found.', 'ERROR');

  // Get a random message from config.autoMessages
  const randomIndex = getRandomInt(0, config.autoMessages.length);
  const selectedMessage = config.autoMessages[randomIndex];

  const container = createComponents(selectedMessage, config);

  channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  })
    .catch(err => {
      client.log('Error sending AutoMsg:', 'ERROR', err);
    });
}

module.exports = AutoMsg;