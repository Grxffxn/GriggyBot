const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
	intents: [GatewayIntentBits.AutoModerationConfiguration, GatewayIntentBits.AutoModerationExecution, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildEmojisAndStickers, GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildScheduledEvents, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
	partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.GuildScheduledEvent, Partials.User, Partials.ThreadMember],
	shards: 'auto',
});
const config = require('./src/config.js');
const { readdirSync } = require('node:fs');
const moment = require('moment');

const token = config.token;

client.commandaliases = new Collection();
client.commands = new Collection();
client.slashcommands = new Collection();
client.slashdatas = [];


function log(message) {
	console.log(`[${moment().format('DD-MM-YYYY HH:mm:ss')}] ${message}`);
}
client.log = log;

// Read prefix commands
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
// eslint-disable-next-line no-unused-vars
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

client.login(token);

// Periodically check for linked accounts and create profiles
const AutoProfile = require('./src/events/autoprofile');
setInterval(() => {
    AutoProfile(client);
}, 180000); // Runs every 3 minutes