const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'notstaff',
	description: 'TLC Not Staff',
	execute(message, args) {
    const embed = new MessageEmbed().setTitle('The Legend Continues | Not Staff')
      .setColor(0x000080)
      .setDescription('**1.** Glitch')
      .setThumbnail('https://static.wikia.nocookie.net/minecraft/images/c/c7/GuardianNew.png/revision/latest?cb=20190927024703');
    message.channel.send(embed);
  }
};
