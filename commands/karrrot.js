const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'karrrot',
	description: 'TLC | Karrrot',
	execute(message, args) {
    const embed = new MessageEmbed().setTitle('The Legend Continues | Karrrot')
      .setColor(0x000080)
      .setDescription('I am a poo poo stinkyhead buttface')
      .setThumbnail('https://static.wikia.nocookie.net/minecraft/images/6/63/Carrot_Updated.png/revision/latest?cb=20190721134506');
    message.channel.send(embed);
  }
};
