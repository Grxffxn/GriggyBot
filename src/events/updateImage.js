const { getConfig } = require('../utils/configUtils');
const { parseServerData } = require('../utils/serverDataUtils.js');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const nodeHtmlToImage = require('node-html-to-image');
const path = require('path');
const fs = require('fs');
const base64Image = fs.readFileSync('assets/16-9-logo.png').toString('base64');
const base64DataUrl = `data:image/png;base64,${base64Image}`;

const fontPath = path.resolve(__dirname, '../../assets/fonts/Minecraft.ttf');

async function UpdateImage(client) {
    const config = getConfig();
    const imageChannel = client.channels.cache.get(config.welcomeMessageId);
    const messageToEdit = await imageChannel.messages.fetch(config.welcomeMessageId);

    async function generateImage(sanitizedNumberOnline, sanitizedServerVersion, tps, formattedSchedule) {
        try {
            const fontData = fs.readFileSync(fontPath).toString('base64');
            const fontBase64 = `data:font/ttf;base64,${fontData}`;
            const htmlTemplatePath = path.resolve(__dirname, '../welcomeImage.html');
            let htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');
    
            htmlTemplate = htmlTemplate
                .replace('{{fontBase64}}', fontBase64)
                .replace('{{backgroundImage}}', base64DataUrl)
                .replace('{{numberOnline}}', sanitizedNumberOnline)
                .replace('{{serverVersion}}', sanitizedServerVersion)
                .replace('{{tps}}', tps)
                .replace('{{tpsColor}}', tps >= 17 ? 'green' : tps >= 13 ? 'yellow' : 'red')
                .replace('{{formattedSchedule}}', formattedSchedule)
                .replace('{{serverIp}}', config.serverIp);
    
            await nodeHtmlToImage({
                output: 'assets/dynamicserverinfo.png',
                html: htmlTemplate,
                transparent: true,
            });
        } catch (err) {
            client.log('Error processing welcome image:', 'ERROR', err);
        }
    }

    try {
        const serverData = parseServerData();
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
    } catch (err) {
        client.log('Error updating welcome image or message:', 'ERROR', err);
    }
}

module.exports = UpdateImage;