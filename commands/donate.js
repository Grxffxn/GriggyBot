const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'donate',
	description: 'TLC Donation Info',
	execute(message, args) {
		const embed = new MessageEmbed().setTitle('The Legend Continues | Donate')
		  .setColor(0x000080)
		  .setDescription('Visit [our Patreon](https://www.patreon.com/thelegendcontinues) for VIP ranks\n\nFor one-time donations, visit [our PayPal](https://www.paypal.me/thelegendcontinues).')
		  .setFooter('Thank you for your interest in supporting TLC')
		  .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
		message.channel.send(embed);
  }
};
