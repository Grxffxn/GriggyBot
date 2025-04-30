const { ChannelType, Collection, Events } = require('discord.js');
const { getConfig } = require('../utils/configUtils');
const ms = require('ms');
const cooldown = new Collection();

const emojiList = ['776295367036633117', '1162276681323642890', '774429683876888576']

module.exports = {
	name: Events.MessageCreate,
	execute: async (message) => {
		const config = getConfig();
		const client = message.client;
		if (message.author.bot) return;
		if (message.channel.type === ChannelType.DM) {
			message.reply(`Did you mean to DM the code to ${config.discordsrvBotId ? `<@${config.discordsrvBotId}>.` : 'the DiscordSRV linking bot'}?`);
		}
		// Auto react stuff
		if (message.content.toLowerCase().includes('yay')) {
			const randomEmojiId = emojiList[Math.floor(Math.random() * emojiList.length)];
			await message.react(message.guild.emojis.cache.get(randomEmojiId));
		}
		if (
			message.content.toLowerCase().includes('error') ||
			message.content.toLowerCase().includes('issue') ||
			message.content.toLowerCase().includes('uh oh')
		) {
			await message.react(message.guild.emojis.cache.get('1350727115015716865'));
		}
		if (
			message.content.toLowerCase().includes('griggy') ||
			message.content.toLowerCase().includes('grif') ||
			message.content.toLowerCase().includes('grx')
		) {
			await message.react(message.guild.emojis.cache.get('1353522852581605517'));
		}
		if (
			message.content.toLowerCase().includes('dante') ||
			message.content.toLowerCase().includes('misa')
		) {
			await message.react(message.guild.emojis.cache.get('1353523822401421392'));
		}
		if (message.content.toLowerCase().includes('nathan')) await message.react(message.guild.emojis.cache.get('776297828645470218'));
		if (message.content.toLowerCase().includes('ender')) await message.react(message.guild.emojis.cache.get('1353523579634843758'));
		if (message.content.toLowerCase().includes('flaught')) await message.react(message.guild.emojis.cache.get('776297828678369300'));
		if (message.content.toLowerCase().includes('john')) await message.react(message.guild.emojis.cache.get('1353524143177334846'));
		if (message.content.toLowerCase().includes('glitch')) await message.react(message.guild.emojis.cache.get('1353524396060442685'));
		if (message.content.toLowerCase().includes('abby')) await message.react(message.guild.emojis.cache.get('1355689894575472791'));
		if (message.content.toLowerCase().includes('oby')) await message.react(message.guild.emojis.cache.get('1353524874668408953'));
		if (message.content.toLowerCase().includes('lowryze')) await message.react(message.guild.emojis.cache.get('1354650114236350664'));
		if (message.content.toLowerCase().includes('lemon')) await message.react(message.guild.emojis.cache.get('1354987808477151292'));
		const prefix = config.prefix;
		if (!message.content.startsWith(prefix)) return;
		const args = message.content.slice(prefix.length).trim().split(/ +/g);
		const cmd = args.shift().toLowerCase();
		if (cmd.length == 0) return;
		let command = client.commands.get(cmd);
		if (!command) command = client.commands.get(client.commandaliases.get(cmd));

		if (command) {
			if (command.cooldown) {
				if (cooldown.has(`${command.name}${message.author.id}`)) return message.reply({ content: `Cooldown: \`${ms(cooldown.get(`${command.name}${message.author.id}`) - Date.now(), { long: true })}` }).then(msg => setTimeout(() => msg.delete(), cooldown.get(`${command.name}${message.author.id}`) - Date.now()));
				command.run(client, message, args);
				cooldown.set(`${command.name}${message.author.id}`, Date.now() + command.cooldown);
				setTimeout(() => {
					cooldown.delete(`${command.name}${message.author.id}`);
				}, command.cooldown);
			} else {
				command.run(client, message, args);
			}
		}
	},
};