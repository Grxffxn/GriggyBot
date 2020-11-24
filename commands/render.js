const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
const { createConnection } = require('mysql');
const mysql = require('mysql');

const database = mysql.createPool({
    connectionLimit: 10,
    host: "127.0.0.1",
    user: "minecraft",
    password: "HydraBadgers",
    database: "tlc_custom",
    post: "3306",
  });

module.exports = {
	name: 'render',
	description: 'Player Renders',
//	args: true,
//	usage: '<example>'
    execute(message, args) {
        var getUUID = mysql.format("SELECT playerUUID FROM players_rankPoints WHERE playerName = ?", [args[1]]);
        const embed = new MessageEmbed().setTitle('The Legend Continues | Render')
         .setColor(0x000080)
         .setDescription('**Render Commands**\n\n`render` - bring up this great menu!\n`render body` - full body 3d render\n`render head` - 3d skull render\n`render avatar` - 2d avatar skull render\n\nThank you to [Crafatar](https://crafatar.com) for providing avatars.')
         .setFooter('Run $help for more commands')
         .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
        if(!args[0]) {
            message.channel.send(embed);
        } else if(!args[1]) {
            message.reply('you must specify a username.');
        } else if(args[1]) {
            database.getConnection(function(err, database) {
            database.query(getUUID,
                function(err, result, fields) {
                    if(!result[0]) return message.reply('That player either doesn\'t exist, or hasn\'t been on TLC before. :(');
                    var trimmedUUID = (result[0].playerUUID).toString().replace(/-/g, "");
                    if(err) throw err;
                    if(args[0] === 'body') message.channel.send(`https://crafatar.com/renders/body/${trimmedUUID}`);
                    if(args[0] === 'head') message.channel.send(`https://crafatar.com/renders/head/${trimmedUUID}`);
                    if(args[0] === 'avatar') message.channel.send(`https://crafatar.com/avatars/${trimmedUUID}`);
                    database.destroy;
                });
            });
        }
    }
}