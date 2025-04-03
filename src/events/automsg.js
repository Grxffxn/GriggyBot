const config = require('../config.js');
const { EmbedBuilder } = require('discord.js');

// Function to generate a random integer between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Function to create an embed with default values unless overridden
function createEmbed(options = {}) {
    const defaultValues = {
        title: 'The Legend Continues | AutoMsg',
        color: `${config.defaultColor}`,
        thumbnail: `${config.logoImageUrl}`,
        description: '',
        footer: null
    };

    const values = { ...defaultValues, ...options };

    const embed = new EmbedBuilder()
        .setTitle(values.title)
        .setColor(values.color)
        .setDescription(values.description)
        .setThumbnail(values.thumbnail);

    if (values.footer) {
        embed.setFooter(values.footer);
    }

    return embed;
}

// Function to send auto messages
async function AutoMsg(client) {
    const channel = client.channels.cache.get(`${config.automsgchannelid}`);

    const messages = [
        createEmbed({
            description:
				'**Have you voted yet today?**\nRun the command `/vote` to vote for rewards in-game!'
        }),
        createEmbed({
            description:
                '**Profile Customization**\nPlayers who have linked their Discord and Minecraft accounts now have access to custom profiles with `/profile`.\nSet a custom profile color and use Discord text formatting to create something unique.\n\nView your profile with `/info <username>`'
        }),
        createEmbed({
            description:
                '**Automated Rank Applications**\nGriggyBot is now capable of tracking earned rank points in-game, recording vouches received by other players, and automatically granting ranks in-game and on Discord.\n\nCreate an application with `/apply`!',
            footer: { text: 'Check #rank-applications for more info.' }
        }),
        createEmbed({
            description:
                '**Proximity Voice Chat**\nExperience the fun of proximity chat with just one mod! TLC supports the [Simple Voice Chat](https://modrinth.com/plugin/simple-voice-chat) mod for reliable in-game location tracking. Not interested? No problem! TLC does not require that you have this mod installed before joining.'
        }),
        createEmbed({
            description:
                '**Silk Spawners**\nFound a mob spawner, but it\'s too far from your base? You can now pick up mob spawners with a silk touch pickaxe! I wonder how much they\'ll sell for?'
        }),
		createEmbed({
			description:
				'**Improved /jobs**\nThe Jobs shop has been improved with special, somewhat-overpowered tools once you reach level 50 in the related job!\nThe rate at which you gain XP has also been improved, making it more realistic to reach the max level of 200.'
		}),
		createEmbed({
			description:
				'**Custom Dungeons**\nWe\'ve placed some custom dungeons around the map with chests that *every* player can loot. It might be helpful to use `/bmap` to locate them before setting out!'
		}),
		createEmbed({
			description:
				'**Dragon Drops**\nDo you ever feel underwhelmed by the Ender Dragon\'s loot after the first defeat? With the Ender Dragon plugin, we\'ve created stronger dragons with more difficult attacks and improved rewards. Donors can even create a dragon of their own!'
		}),
		createEmbed({
			description:
				'**Battlepass**\nReceive tons of rewards just by playing the game! With a mix of daily and weekly rewards, you can earn tons of XP towards raising your Battlepass tier. There\'s a special season exclusive at tier 30!'
		}),
		createEmbed({
			description:
				'**BlueMap 3D**\nThanks to the surprisingly-free plugin BlueMap, you can now view the *entire* world map as if you\'re actually in-game, all from your web browser! Click [here](http://mc.thelegendcontinues.info:8123/) for the link, or run `/bmap` in-game or on Discord'
		})
    ];

    // Choose a random message to send
    const randomIndex = getRandomInt(0, messages.length);
    const selectedMessage = messages[randomIndex];

    try {
        await channel.send({ embeds: [selectedMessage] });
    } catch (error) {
        console.error('Error sending AutoMsg:', error);
    }
}

module.exports = AutoMsg;