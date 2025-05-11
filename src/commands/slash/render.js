const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

const MESSAGES = {
  BEDROCK_NOT_SUPPORTED: 'Sorry, Bedrock renders are not supported.',
  PLAYER_NOT_FOUND: 'That player doesn\'t exist :(',
  FETCH_ERROR: 'An error occurred while fetching player data.',
  INVALID_RENDER_TYPE: 'Invalid render type.',
};

const renderPaths = {
  body: 'full/384',
  head: 'head/256',
  avatar: 'face/256',
  bust: 'bust/256',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('render')
    .setDescription('Player renders')
    .addStringOption(option =>
      option.setName('render_type')
        .setDescription('Type of render')
        .setRequired(true)
        .addChoices(
          { name: 'Full Body', value: 'body' },
          { name: '3D Skull', value: 'head' },
          { name: '2D Avatar', value: 'avatar' },
          { name: '3D Bust', value: 'bust' },
        ),
    )
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Minecraft username')
        .setRequired(true),
    )
    .addStringOption(option =>
      option.setName('skintype')
        .setDescription('Skin type')
        .setRequired(false)
        .addChoices(
          { name: 'Steve', value: 'wide' },
          { name: 'Alex', value: 'slim' },
        ),
    ),
  async run(interaction) {
    const username = interaction.options.getString('username');
    const rendertype = interaction.options.getString('render_type');
    const skintype = interaction.options.getString('skintype') || 'wide';

    if (username.startsWith('.')) return interaction.reply({ content: MESSAGES.BEDROCK_NOT_SUPPORTED, flags: MessageFlags.Ephemeral });

    const renderPath = renderPaths[rendertype];

    try {
      const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);

      if (!response.data) return interaction.reply({ content: MESSAGES.PLAYER_NOT_FOUND, flags: MessageFlags.Ephemeral });

      const playerUUID = response.data.id.replace(/-/g, '');
      const config = interaction.client.config;

      const renderUrl = `${config.baseRenderUrl}${renderPath}/${playerUUID}?${skintype}`;

      await interaction.reply({ content: renderUrl })
        .catch(err => {
          interaction.client.log('Error sending render URL:', 'ERROR', err);
        });
    } catch (err) {
      interaction.client.log('Error fetching player data:', 'ERROR', err);
      return interaction.reply({ content: MESSAGES.FETCH_ERROR, flags: MessageFlags.Ephemeral });
    }
  },
};