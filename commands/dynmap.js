const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'dynmap',
	description: 'TLC Dynmap',
	execute(message, args) {
    const embed = new MessageEmbed().setTitle('The Legend Continues | Dynmap')
        .setColor(0x000080)
        .setURL('https://map.thelegendcontinues.org/')
        .setDescription('View a live map of all of our worlds,\nand even send messages to Minecraft\nfrom the website!')
        .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
  	message.channel.send(embed);
  }
};
