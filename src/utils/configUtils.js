const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const CONFIG_PATH = path.resolve(__dirname, '../config.yml');

let config = null;

function loadInitialConfig() {
    try {
        const file = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = yaml.parse(file);
        console.log('Configuration loaded.');
    } catch (err) {
        console.error('Failed to load config.yml:', err);
        config = {};
    }
}

function getConfig() {
    if (!config) loadInitialConfig();
    return config;
}

function reloadConfig(client) {
    try {
        const file = fs.readFileSync(CONFIG_PATH, 'utf8');
        config = yaml.parse(file);
        client.log('Configuration reloaded.', 'SUCCESS');
    } catch (err) {
        client.log('Failed to reload config.yml:', 'ERROR', err);
    }
}

function saveConfig(updatedValuesArray, client) {
    try {
        const file = fs.readFileSync(CONFIG_PATH, 'utf8');
        const doc = yaml.parseDocument(file);

        for (const [key, value] of Object.entries(updatedValuesArray)) {
            doc.set(key, value);
        }

        fs.writeFileSync(CONFIG_PATH, doc.toString(), 'utf8');
        client.log('Config saved.', 'SUCCESS');
    } catch (err) {
        client.log('Failed to save config.yml:', 'ERROR', err);
    }
}

loadInitialConfig();

module.exports = {
    getConfig,
    reloadConfig,
    saveConfig,
};