const { SlashCommandBuilder } = require('@discordjs/builders');
const { Rcon } = require('rcon-client');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Various Server Info'),

    async run(interaction) {
        // Open RCON Connection
        const rcon = new Rcon({
            host: config.rconIp,
            port: config.rconPort,
            password: config.rconPwd
        });

        function sanitizeInput(input) {
            return input.replace(/\n/g, '').trim(); // Removes \n and excess whitespace
        }

        // Function to convert Minecraft color codes (§) to Discord-compatible ANSI codes for TPS
        function convertMinecraftToANSI(input) {
            const colorMap = {
                '§0': '\u001b[2;30m', // Gray
                '§1': '\u001b[2;34m', // Light Blue
                '§2': '\u001b[2;32m', // Yellow-green
                '§3': '\u001b[2;36m', // Teal
                '§4': '\u001b[2;31m', // Red
                '§5': '\u001b[2;35m', // Pink
                '§6': '\u001b[2;33m', // Gold
                '§7': '\u001b[2;37m', // White
                '§8': '\u001b[2;30m', // Dark Gray
                '§9': '\u001b[2;34m', // Light Blue
                '§a': '\u001b[2;32m', // Yellow-green
                '§b': '\u001b[2;36m', // Teal
                '§c': '\u001b[2;31m', // Red
                '§d': '\u001b[2;35m', // Pink
                '§e': '\u001b[2;33m', // Gold
                '§f': '\u001b[2;37m', // White
                '§r': '\u001b[0m'    // Reset
            };

            // Replace Minecraft color codes with their ANSI counterparts
            return input.replace(/§[0-9a-fr]/g, match => colorMap[match] || '\u001b[2;37m').replace(/\n/g, '').trim();
        }

        function stripMinecraftColorCodes(input) {
            // Regex to match standard Minecraft color codes and extended hex codes
            const strippedText = input.replace(/§(?:[0-9a-fr]|x(?:§[0-9a-f]){6})/g, '').replace(/\n/g, '').trim();

            // Wrap the stripped text in white ANSI formatting
            return `\u001b[2;37m${strippedText}\u001b[0m`;
        }

        // Get TPS and Top Voter placeholders
        try {
            await rcon.connect();

            // Retrieve data from Minecraft server
            const tpsParsed = await rcon.send('papi parse Grxffxn %cmi_tps_300_colored%');
            const topVoterParsed = await rcon.send('papi parse Grxffxn %cmi_votetop_1%');
            const topVoterCount = await rcon.send('papi parse Grxffxn %cmi_votetopcount_1%')
            const topPlaytimeUser = await rcon.send('papi parse Grxffxn %cmi_playtimetop_name_1%');
            const topPlaytimeTime = await rcon.send('papi parse Grxffxn %cmi_playtimetop_time_1%');
            const serverUptime = await rcon.send('papi parse Grxffxn %cmi_server_uptime%');
            const onlinePlayerList = await rcon.send('papi parse Grxffxn %cmi_onlineplayers_names%');
            const numberOnline = await rcon.send('papi parse Grxffxn %cmi_server_online%')

            // Reply with formatted output
            return interaction.reply(
                `\`\`\`ansi\n\u001b[2;34mTPS (last 5 minutes): ${convertMinecraftToANSI(tpsParsed)}\u001b[0m\n\u001b[2;34mTop Voter: ${stripMinecraftColorCodes(topVoterParsed)} \u001b[2;35m${sanitizeInput(topVoterCount)}\u001b[0m\n\u001b[2;34mTop Playtime: ${stripMinecraftColorCodes(topPlaytimeUser)} \u001b[2;33m${sanitizeInput(topPlaytimeTime)}\u001b[0m\n\u001b[2;34mServer Uptime: ${convertMinecraftToANSI(serverUptime)}\u001b[0m\n\u001b[2;34mOnline Players (${sanitizeInput(numberOnline)}/20):\n\u001b[2;31m${sanitizeInput(onlinePlayerList)}\`\`\``
            );
        } catch (error) {
            console.error('Error parsing placeholder:', error);

            // Send an error reply
            return interaction.reply(`\`\`\`Error occurred: ${error.message}\`\`\``);
        } finally {
            rcon.end();
        }
    },
};