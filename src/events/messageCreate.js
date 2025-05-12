const { ChannelType, Collection, Events } = require('discord.js');
const { getConfig } = require('../utils/configUtils');
const ms = require('ms');
const cooldown = new Collection();

module.exports = {
  name: Events.MessageCreate,
  execute: async message => {
    const client = message.client;
    const config = client.config;
    if (message.author.bot) return;
    if (message.channel.type === ChannelType.DM)
      message.reply(
        `Did you mean to DM the code to ${
          config.discordsrvBotId ? `<@${config.discordsrvBotId}>.` : 'the DiscordSRV linking bot'
        }?`
      );

    const prefix = config.prefix;
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    if (cmd.length == 0) return;
    let command = client.commands.get(cmd);
    if (!command) command = client.commands.get(client.commandaliases.get(cmd));

    if (command) {
      if (command.cooldown) {
        if (cooldown.has(`${command.name}${message.author.id}`))
          return message
            .reply({
              content: `Cooldown: \`${ms(cooldown.get(`${command.name}${message.author.id}`) - Date.now(), {
                long: true
              })}`
            })
            .then(msg =>
              setTimeout(() => msg.delete(), cooldown.get(`${command.name}${message.author.id}`) - Date.now())
            );
        command.run(client, message, args);
        cooldown.set(`${command.name}${message.author.id}`, Date.now() + command.cooldown);
        setTimeout(() => {
          cooldown.delete(`${command.name}${message.author.id}`);
        }, command.cooldown);
      } else {
        if (command.requiredRoles) {
          const { all, roles } = command.requiredRoles;
          let msg;
          if (all === true) {
            if (!message.member.roles.cache.hasAll(...roles)) {
              msg = await message.reply({
                content: `⚠️ You do not have the required roles to use this command!`
              });
            }
          } else {
            if (!message.member.roles.cache.hasAny(...roles)) {
              msg = await message.reply({
                content: `⚠️ You do not have any of the required roles to use this command!`
              });
            }
          }
          if (msg) {
            setTimeout(async () => {
              await msg.delete();
            }, 5000);
            return;
          }
        }
        await command.run(client, message, args);
      }
    }
  }
};
