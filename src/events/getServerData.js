const fs = require('fs');
const { Rcon } = require('rcon-client');
const config = require('../config.js');

async function UpdateServerData() {
    try {
        const rcon = new Rcon({
            host: config.rconIp,
            port: config.rconPort,
            password: config.rconPwd
        });
        await rcon.connect();

        // Fetch data via RCON
        let bmapStatus;
        const bluemapStatusRaw = await rcon.send('bluemap');
        const bluemapStatusSanitized = bluemapStatusRaw.replace(/\n/g, '').trim(); // Remove newlines and clean up
        // Check if render-threads are stopped
        const isRenderingStopped = bluemapStatusSanitized.includes('❌ render-threads are §fstopped');
        if (isRenderingStopped) {
            bmapStatus = "off"
        } else {
            bmapStatus = "on"
        }

        const numberOnline = await rcon.send('papi parse --null %cmi_server_online%');
        const sanitizedNumberOnline = numberOnline.replace(/\n/g, '').trim();

        const serverVersion = await rcon.send('papi parse --null %server_version%');
        const sanitizedServerVersion = serverVersion.replace(/\n/g, '').trim();

        const tpsRaw = await rcon.send('papi parse --null %cmi_tps_300%');
        const tps = tpsRaw.replace(/\n/g, '').trim();

        const restartScheduleRaw = await rcon.send('papi parse --null %cmi_schedule_nextin_StopServer%');
        const restartScheduleSanitized = restartScheduleRaw
            .replace(/§(?:[0-9a-fr]|x(?:§[0-9a-f]){6})/g, '')
            .replace(/\n/g, '')
            .trim();

        const formattedSchedule = formatRestartSchedule(restartScheduleSanitized);

        // Prepare data to write
        const serverData = {
            online: true,
            bmapStatus,
            numberOnline: sanitizedNumberOnline,
            serverVersion: sanitizedServerVersion,
            tps,
            restartSchedule: formattedSchedule
        };

        // Write to serverData.json
        fs.writeFileSync('./src/serverData.json', JSON.stringify(serverData, null, 4));

        rcon.end();
    } catch (error) {
        console.error('Error updating server data:', error);

        const serverData = {
            online: false
        };
        fs.writeFileSync('./src/serverData.json', JSON.stringify(serverData, null, 4));
    }
}

function formatRestartSchedule(restartScheduleSanitized) {
    const parts = restartScheduleSanitized.split(' ');
    const hours = parts.includes('hours') ? parts[parts.indexOf('hours') - 1] : '0';
    const minutes = parts.includes('min') ? parts[parts.indexOf('min') - 1] : '0';
    return `${hours}h${minutes}m`;
}

module.exports = UpdateServerData;