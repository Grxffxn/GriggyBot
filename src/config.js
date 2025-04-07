module.exports = {
    // The prefix for bot commands (e.g., "/help" or "!help")
    prefix: '/',

    // The ID of the channel where automated messages should be sent
    automsgchannelid: 'YOUR_CHANNEL_ID_HERE',

    // The bot token from the Discord Developer Portal
    token: 'YOUR_DISCORD_BOT_TOKEN_HERE',

    // The client ID of your bot from the Discord Developer Portal
    clientId: 'YOUR_CLIENT_ID_HERE',

    // The guild (server) ID where your bot is primarily used
    guildId: 'YOUR_GUILD_ID_HERE',

    // RCON connection details for your Minecraft server
    rconIp: 'YOUR_RCON_SERVER_IP_HERE',
    rconPwd: 'YOUR_RCON_PASSWORD_HERE',
    rconPort: 25575, // Default RCON port; replace if different

    // Delay for automated messages in milliseconds (e.g., 7200000 = 2 hours)
    automsgdelay: 7200000,

    // Default color for embeds (hexadecimal format, e.g., "9c89ff")
    defaultColor: 'YOUR_DEFAULT_EMBED_COLOR_HERE',

    // The ID of the channel where bot logs or console messages should be sent
	// GriggyBot uses DiscordSRV's console channel on Discord feature to handle
	// some events. Paste that channel ID here
    consoleChannelId: 'YOUR_CONSOLE_CHANNEL_ID_HERE',

    // Enable or disable gambling features
    gamblingEnabled: true,

    // Cooldown for gambling wins in milliseconds (e.g., 300000 = 5 minutes)
	// This cooldown applies when a user wins from a specific gambling command
	// The user must wait this amount of milliseconds before playing the same game again
    gamblingWinCooldown: 300000,

    // Global cooldown for gambling commands in milliseconds (e.g., 15000 = 15 seconds)
	// This cooldown applies when a user runs /blackjack and then /roulette - the user
	// must wait this amount of milliseconds between running different gambling commands
    gamblingGlobalCooldown: 15000,

    // URL for your server logo
    logoImageUrl: 'YOUR_LOGO_IMAGE_URL_HERE',

    // Base URL for rendering Minecraft player skins
    baseRenderUrl: 'https://visage.surgeplay.com/',

    // URL for the BlueMap 3D map of your Minecraft server
    bluemapUrl: 'YOUR_BLUEMAP_URL_HERE',

    // Array of automated messages to be sent periodically
    autoMessages: [
        {
            description: 'YOUR_FIRST_AUTOMATED_MESSAGE_HERE',
			footer: { text: 'You can add a footer, too' },
        },
        {
            description: 'YOUR_SECOND_AUTOMATED_MESSAGE_HERE',
        },
        // Add more messages as needed
    ],

    // Links for donations (e.g., Patreon, PayPal)
    donateLinks: {
        Patreon: 'YOUR_PATREON_LINK_HERE',
        PayPal: 'YOUR_PAYPAL_LINK_HERE',
    },

    // Links for voting on Minecraft server lists
    voteSites: {
        'PlanetMinecraft': 'YOUR_PLANET_MINECRAFT_VOTE_LINK_HERE',
        'Minecraft Servers': 'YOUR_MINECRAFT_SERVERS_VOTE_LINK_HERE',
		// Add as many as you like
    },

    // Description and fields for VIP perks
    vipPerksDescription: 'YOUR_VIP_PERKS_DESCRIPTION_HERE',
    vipPerksFields: [
        {
            name: 'VIP Perks',
            value: 'YOUR_VIP_PERKS_DETAILS_HERE',
        },
    ],

    // Description and fields for VIP+ perks
    vipPlusPerksDescription: 'YOUR_VIP_PLUS_PERKS_DESCRIPTION_HERE',
    vipPlusPerksFields: [
        {
            name: 'VIP+ Perks',
            value: 'YOUR_VIP_PLUS_PERKS_DETAILS_HERE',
        },
    ],

    // Description and fields for VIP++ perks
    vipPlusPlusPerksDescription: 'YOUR_VIP_PLUS_PLUS_PERKS_DESCRIPTION_HERE',
    vipPlusPlusPerksFields: [
        {
            name: 'VIP++ Perks',
            value: 'YOUR_VIP_PLUS_PLUS_PERKS_DETAILS_HERE',
        },
    ],

    // List of commands with their names and descriptions (shown in /help)
    commands: [
        {
            name: 'apply',
            description: 'Description for the apply command',
        },
        {
            name: 'blackjack',
            description: 'Description for the blackjack command',
        },
        {
            name: 'bmap',
            description: 'Description for the bmap command',
        },
        {
            name: 'deleteapplication',
            description: 'Description for the deleteapplication command',
        },
        {
            name: 'donate',
            description: 'Description for the donate command',
        },
        {
            name: 'info',
            description: 'Description for the info command',
        },
        {
            name: 'leaderboard',
            description: 'Description for the leaderboard command',
        },
        {
            name: 'link',
            description: 'Description for the link command',
        },
        {
            name: 'notstaff',
            description: 'Description for the notstaff command',
        },
        {
            name: 'profile',
            description: 'Description for the profile command',
        },
        {
            name: 'render',
            description: 'Description for the render command',
        },
        {
            name: 'roulette',
            description: 'Description for the roulette command',
        },
        {
            name: 'rps',
            description: 'Description for the rps command',
        },
        {
            name: 'server',
            description: 'Description for the server command',
        },
        {
            name: 'slots',
            description: 'Description for the slots command',
        },
        {
            name: 'vipperks',
            description: 'Description for the vipperks command',
        },
        {
            name: 'vote',
            description: 'Description for the vote command',
        },
    ],
};