const fs = require('fs');
const path = require('path');

const serverDataPath = path.resolve(__dirname, '../serverData.json');

function parseServerData() {
    return JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
}

function updateServerData(key, value) {
    const serverData = parseServerData();
    serverData[key] = value;
    fs.writeFileSync(serverDataPath, JSON.stringify(serverData, null, 2));
}

module.exports = { parseServerData, updateServerData };