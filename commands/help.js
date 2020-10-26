const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
const { prefix } = require('../config.json');

module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	aliases: ['commands'],
	usage: '[command name]',
	cooldown: 5,
  execute(message, args) {
		const data = [];
		const { commands } = message.client;
		const helpembed = new MessageEmbed().setTitle('The Legend Continues | Help')
      .setColor(0x000080)
      .setDescription('Use the prefix `$` to interact with this bot\n\n**Shortcuts**\n`site` - links directly to TLCs website\n`vote` - list all voting sites\n`dynmap` - view the live map\n`forum` - link directly to our forums\n`stats` - view server & website stats\n`help` - view this message again (why not?)\n\n**Fun Commands**\n`notstaff` - see who is NOT TLC staff\n`karrrot` - personal message from Karrrot')
      .setFooter('Bot created by @Grxffxn#6666 | $donate')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');

		if(!args.length) {
	    return message.channel.send(helpembed);
		}

		const name = args[0].toLowerCase();
		const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

		if(!command) {
			return message.reply('Uhhh, I didn\'t recognize that command. `$help`');
		}

		message.channel.send(`**Name:** ${command.name}`);

		if(command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
		if(command.description) data.push(`**Description:** ${command.description}`);
		if(command.usage) data.push(`**Usage** ${prefix}${command.name} ${command.usage}`);
		data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);

		message.channel.send(data, {split: true});
	},
};
