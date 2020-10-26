const fs = require('fs');
const Discord = require("discord.js");
const { Client, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const cooldowns = new Discord.Collection();
const prefix = '$';

//MySQL Setup
//const { createConnection } = require('mysql');

//const database = createConnection({
//  host: '127.0.0.1',
//  user: '${config.database-username}',
//  password: '${config.database-password}',
//  database: '${config.database-name}',
//});

for(const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once('ready', () => {
  console.log('GriggyBot ready!')
});

function getRandomInt(max) {
  return Math.round(Math.random() * Math.floor(max));
}

//botspam channel id "407425882928578561"

function AutoMsg() {
  var channel = client.channels.cache.get("407425882928578561");
  if(!channel) return console.log("Not a channel.");
  const automsg1 = new MessageEmbed().setTitle('The Legend Continues | AutoMsg')
    .setColor(0x000080)
    .setDescription('**Have you voted yet today?**\nRun the command `$vote` to vote for rewards\nin-game! Access /fly, /god & more!')
    .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
  const automsg2 = new MessageEmbed().setTitle('The Legend Continues | AutoMsg')
    .setColor(0x000080)
    .setDescription('**What is this bot?**\nI am a Discord Bot created to help you!\nI can provide you with helpful links, fun commands,\nand more coming soon!')
    .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png')
    .setFooter('Use the command `$help` to see what I can do!');
  const automsg3 = new MessageEmbed().setTitle('The Legend Continues | AutoMsg')
    .setColor(0x000080)
    .setDescription('**Have you checked stats lately?**\nNathanacus maintains our stats on our website!\nRun the command $stats to see more.')
    .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png')
    .setFooter('Use the command `stats` to see various stats!');
// SWITCH STATEMENT
  switch(getRandomInt(4)) {
    case 0:
      channel.send(automsg3);
      break;
    case 1:
      channel.send(automsg1);
      break;
    case 2:
      channel.send(automsg2);
      break;
    case 3:
      channel.send(automsg3);
      break;
  }
}

setInterval(AutoMsg,3600000);
//1 hour: 3600000

// COMMANDS
client.on("message", function(message) {
  if(!message.content.startsWith(prefix) || message.author.bot) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const commandName = args.shift().toLowerCase();
  //const user = message.author.username;

  const command = client.commands.get(commandName)
    || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if(!command) return;

  if(command.args && !args.length) {
    let reply = `You didn't provide any arguments, ${message.author}!`;
    if(command.usage) {
      reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
    }
    return message.channel.send(reply);
  }

  if(!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if(timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if(now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(`it hasn\'t been 24 hours since you last used this command. You have ${timeLeft.toFixed(1)} seconds left until you can vote again.`);
    }
  } else if(!timestamps.has(message.author.id)) {
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('I couldn\'t run that command. @Grxffxn, your bot is broken!');
  }

//  database.connect(function(err) {
//    if(err) {
//      message.reply('can\'t connect to tlc database... tell grx');
//      console.error('error connecting: ' + err.stack);
//      return;
//    }
//    console.log('connected as id ' + database.threadId);
//  });
});

client.login(config.token);
