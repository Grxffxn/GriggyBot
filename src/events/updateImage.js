const config = require('../config.js');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const nodeHtmlToImage = require('node-html-to-image');
const path = require('path');
const fs = require('fs');
const base64Image = fs.readFileSync('assets/16-9-tlclogo.png').toString('base64');
const base64DataUrl = `data:image/png;base64,${base64Image}`;
const fontPath = path.resolve(__dirname, '../../assets/fonts/Minecraft.ttf');

async function UpdateImage(client) {
    const imageChannel = client.channels.cache.get('763692491374723132');
    const messageToEdit = await imageChannel.messages.fetch('1355513787196768400');

    async function generateImage(sanitizedNumberOnline, sanitizedServerVersion, tps, formattedSchedule) {
        try {
            const fontData = fs.readFileSync(fontPath).toString('base64');
            const fontBase64 = `data:font/ttf;base64,${fontData}`;
            // Generate the image
            await nodeHtmlToImage({
                output: 'assets/dynamicserverinfo.png',
                html: `
<html>
    <head>
        <style>
            @font-face {
                font-family: 'Minecraft';
                src: url("${fontBase64}") format('truetype');
            }
            body {
                font-family: 'Minecraft', Arial, sans-serif;
                letter-spacing: 2px;
                margin: 0;
                padding: 0;
                width: 800px;
                height: 600px;
            }
            .container {
                position: absolute;
                top: 10px;
                right: 10px;
                text-align: right;
                color: white;
            }
            .online-count {
                font-size: 32px;
                margin: 0;
            }
            .server-version {
                font-size: 24px;
                margin: 0;
                margin-top: 5px;
            }
            .tps-field {
                position: absolute;
                top: 10px; /* Align to top */
                left: 10px; /* Align to left */
                font-size: 30px;
                font-weight: bold;
                color: ${tps >= 17
                        ? 'green'
                        : tps >= 13
                            ? 'yellow'
                            : 'red'
                    }; /* Color formatting logic for TPS value */
            }
            .restart-schedule {
                position: absolute;
                top: 50px; /* Adjust positioning below the TPS field */
                left: 10px; /* Align to left */
                font-size: 20px;
                color: white; /* Static white color, no formatting */
            }
            .footer-text {
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                font-size: 30px;
                color: white;
            }
        </style>
    </head>
    <body style="background: url('${base64DataUrl}') no-repeat center center; background-size: cover;">
        <!-- TPS Field (top-left corner) -->
        <div class="tps-field">
            TPS: ${tps}
        </div>
        <!-- Restart Schedule Field (below TPS) -->
        <div class="restart-schedule">
            Restart in ${formattedSchedule}
        </div>
        
        <!-- Main Container (top-right corner) -->
        <div class="container">
            <div class="online-count">
                Players Online: ${sanitizedNumberOnline}
            </div>
            <div class="server-version">
                Server Version: ${sanitizedServerVersion}
            </div>
        </div>
        
        <!-- Footer (center-bottom) -->
        <div class="footer-text">
            mc.thelegendcontinues.info
        </div>
    </body>
</html>
                `,
                transparent: true
            });
        } catch (error) {
            console.error('Error generating image:', error);
        }
    }

    function getServerData() {
        try {
            const data = fs.readFileSync('./src/serverData.json');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading server data:', error);
            return null;
        }
    }

    try {
        const serverData = getServerData();
        const sanitizedNumberOnline = serverData.numberOnline;
        const sanitizedServerVersion = serverData.serverVersion;
        const tps = serverData.tps;
        const formattedSchedule = serverData.restartSchedule;

        await generateImage(sanitizedNumberOnline, sanitizedServerVersion, tps, formattedSchedule); // Generate the image

        const attachment = new AttachmentBuilder('assets/dynamicserverinfo.png', { name: 'dynamicserverinfo.png' });
        // default rules embed
        const rulesEmbed = new EmbedBuilder()
            .setTitle('📖 TLC Rules')
            .setColor(0xef5327)
            .addFields(
                { name: '**1. Be nice.**', value: 'We do not tolerate harassment of any kind at The Legend Continues, and you will be banned if you engage in this behavior. Keep chat respectful and take other players\' feelings into account when chatting.' },
                { name: '**2. Discrimination of any kind is not allowed.**', value: 'The Legend Continues is inclusive of all races, genders, ethnicities, and orientations. We expect ALL of our players to also be inclusive of all individuals. Breaking this rule will result in a ban.' },
                { name: '**3. Hacked clients are not allowed.**', value: 'Any client that gives players an unfair advantage is banned, and if you are caught using hacks such as KillAura, AutoAnything, etc. you will be banned.' },
            )
            .setFooter({ text: '❗ Please also read the rules at spawn when you join for the first time.' });
        const dynamicEmbed = new EmbedBuilder()
            .setTitle('<:_:1342069188931485707> Server Info')
            .setColor(config.defaultColor)
            .addFields(
                { name: '🧭 View the 3D Map', value: '🗺️ [BlueMap](http://mc.thelegendcontinues.info:8123/)', inline: true },
                { name: '<a:_:1162277213090107472> Become a donor', value: '💵 [Patreon](https://www.patreon.com/TheLegendContinues11)', inline: true },
            )
            .setImage('attachment://dynamicserverinfo.png');

        await messageToEdit.edit({ content: `# <:_:1342069188931485707> Welcome to The Legend Continues!\n-# <:_:1355510503140753518> Founded in 2013. Co-owned by Nathanacus and Grxffxn.\n-# Maintained by our incredible staff team <a:_:762492571523219466>\n-# ${config.staffEmojisList}`, embeds: [rulesEmbed, dynamicEmbed], files: [attachment] });
    } catch (error) {
        console.error('Error updating image or message:', error);
    }
}

module.exports = UpdateImage;