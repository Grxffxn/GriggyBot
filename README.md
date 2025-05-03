# GriggyBot
GriggyBot is a Discord bot originally designed for **The Legend Continues** Minecraft server. It integrates with the server to provide interactive features such as rank applications, chore submissions, gambling games, and more. The bot is tailored to work with plugins like **LuckPerms**, **DiscordSRV**, and **CMI**.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
![GitHub Created At](https://img.shields.io/github/created-at/Grxffxn/GriggyBot)
![Discord](https://img.shields.io/discord/202157448776253441)


## Features

**Minecraft Server Integration**
- **Dynamic Welcome Image**: Automatically updates the welcome message with server stats like TPS, player count, and restart schedule.
- **RCON Integration**: Executes server commands and logs responses directly in Discord.

**Player Interaction**
- **Rank Applications**: Players can apply for ranks using `/apply`. Staff can approve applications based on points and vouches.
- **Daily Rewards**: Players can claim daily rewards with `/daily`, with streak bonuses for consecutive claims.
- **Chore Submissions**: Submit proof of completed chores for in-game rewards using `!chore`.
- **Custom Profiles**: Players can customize their profiles with `/profile`, including colors, descriptions, and images.

**Gambling Games**
- **Slots, Blackjack, Roulette, and Rock-Paper-Scissors**: Players can wager in-game currency on fun games.
- **Cooldowns and Balances**: Ensures fair play with cooldowns and real-time balance updates.

**Automated Features**
- **Auto Messages**: Periodic messages to keep the community engaged.
- **Daily Chores**: Randomly selects a daily task for players to complete for rewards.

**Staff Tools**
- **Interactive TODO List**: Staff can manage tasks with `/todo` commands.
- **Easy Config Editing**: Modify some config values from Discord with `/admin editconfig`.
- **Reload or Shutdown**: `/admin reload` and `/admin shutdown` from Discord.

## Prerequisites

Before installing and running GriggyBot, ensure you have the following:

1. **Node.js**: Install the latest version of Node.js from [nodejs.org](https://nodejs.org/).
2. **Discord Bot Token**: Create a bot on the [Discord Developer Portal](https://discord.com/developers/applications) and obtain the token and client ID. [Help!](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
3. **Minecraft Server Plugins**:
   - **LuckPerms**
   - **DiscordSRV**
   - **CMI**
4. **RCON**: Enable RCON in your `server.properties` file and configure the IP, port, and password.

## Installation
**Setup the Bot in [Discord Developer Portal](https://discord.com/developers/applications)** - [more info](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)

**Save the clientId and token for `config.yml`!**
![gbotinstruct](https://github.com/user-attachments/assets/c85eb2a9-133b-4edf-8fd7-07fb30e7f531)
**Recommended Install Location**
```
├── GriggyBot <---- HERE
└── YourMainFolder/
    ├── world
    ├── world_nether
    ├── world_the_end
    └── plugins
```
**Ensure you've installed Node.js** - on Linux, run
`sudo apt install nodejs`

1. Clone the repository:
   ```bash
   git clone https://github.com/Grxffxn/GriggyBot.git
   cd GriggyBot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the bot:
   - Edit the [`src/config.yml`](src/config.yml) file with your server and bot details.
At minimum, configure these:
```yaml
# * The bot token and client ID from the Discord Developer Portal
token: "YOUR_DISCORD_BOT_TOKEN_HERE"
clientId: "YOUR_CLIENT_ID_HERE"

# * RCON connection details for your Minecraft server
# These values are found in your server.properties file
# You may need to manually add 'rcon.ip=127.0.0.1' to your server.properties
rconIp: "127.0.0.1"
rconPwd: "YOUR_RCON_PASSWORD_HERE"
rconPort: 25575  # Default RCON port, replace if different
```

4. Run the bot:
   ```bash
   node index.js
   ```

5. After first setup:
   - Shut down the bot (ctrl+c in terminal, or `/admin shutdown` on Discord)
   - Run the bot with `nohup node index.js &`
   - Type `exit` and press enter
   - Check `GriggyBot/nohup.out` for bot logs
