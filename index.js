const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
	intents: [GatewayIntentBits.AutoModerationConfiguration, GatewayIntentBits.AutoModerationExecution, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
	partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.GuildScheduledEvent, Partials.User, Partials.ThreadMember],
	shards: 'auto',
});
const { getConfig } = require('./src/utils/configUtils.js');
const { readdirSync } = require('node:fs');
const { closeRCON } = require('./src/utils/rconUtils.js');

const config = getConfig();

const token = config.token;

client.commandaliases = new Collection();
client.commands = new Collection();
client.slashcommands = new Collection();
client.slashdatas = [];

function log(message, level = 'INFO', extra = null) {
	const now = new Date();
	const formattedDate = now.toLocaleString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).replace(',', '');

	const color = {
		INFO: '\x1b[36m',
		WARN: '\x1b[33m',
		DEBUG: '\x1b[34m',
		ERROR: '\x1b[31m',
		SUCCESS: '\x1b[32m'
	}[level.toUpperCase()] || '\x1b[0m';

	const label = `[${formattedDate}] [${level.toUpperCase()}]`;
	console.log(`${color}${label} ${message}\x1b[0m`);

	if (extra) {
		if (extra instanceof Error) {
			console.error(extra.stack);
		} else {
			console.log(extra);
		}
	}
}

client.log = log;

// prefix commands
readdirSync('./src/commands/prefix').forEach(async (file) => {
	const command = await require(`./src/commands/prefix/${file}`);
	if (command) {
		client.commands.set(command.name, command);
		if (command.aliases && Array.isArray(command.aliases)) {
			command.aliases.forEach((alias) => {
				client.commandaliases.set(alias, command.name);
			});
		}
	}
});

// Read slash commands
const slashcommands = [];
readdirSync('./src/commands/slash').forEach(async (file) => {
	const command = await require(`./src/commands/slash/${file}`);
	client.slashdatas.push(command.data.toJSON());
	client.slashcommands.set(command.data.name, command);
});

// Read event handlers
readdirSync('./src/events').forEach(async (file) => {
	const event = await require(`./src/events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
});

// Error listeners
process.on('unhandledRejection', (e) => {
	console.log(e);
});
process.on('uncaughtException', (e) => {
	console.log(e);
});
process.on('uncaughtExceptionMonitor', (e) => {
	console.log(e);
});

// Shutdown listener
process.on('SIGINT', async () => {
	console.log('Signal interrupted. Shutting down.');
	
	try {
        await closeRCON();
        console.log('RCON connection closed successfully.');
    } catch (error) {
        console.error('Error while closing RCON connection:', error);
    }

	process.exit(0);
});

client.login(token);