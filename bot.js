const fs = require('fs');
const Discord = require("discord.js");
const auth = require("./auth.json");
const { Client, MessageEmbed } = require('discord.js');

const client = new Discord.Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const prefix = "$";
//botspam channel id "407425882928578561"

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
      console.log('Zero');
      break;
    case 1:
      channel.send(automsg1);
      console.log('First Msg');
      break;
    case 2:
      channel.send(automsg2);
      console.log('Second Msg');
      break;
    case 3:
      channel.send(automsg3);
      console.log('Third Msg')
      break;
  }
}

setInterval(AutoMsg,7200000);
//1 hour: 3600000

// COMMANDS
client.on("message", function(message) {
  if(message.author.bot) return;
  if(!message.content.startsWith(prefix)) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();
  //const user = message.author.username;

  if(!client.commands.has(command)) return;

  try {
    client.commands.get(command).execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('there was an error! tell Grxffxn');
  }
});

client.login(auth.token);
