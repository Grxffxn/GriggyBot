const { ButtonBuilder, ActionRowBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const databaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const requiredPoints = { fabled: 5, heroic: 10, mythical: 15, apocryphal: 20, legend: 30 };
const requiredStaffReactions = { fabled: 1, heroic: 1, mythical: 2, apocryphal: 3, legend: 4 };
const config = require('../config.js');
const { Rcon } = require('rcon-client');

function queryDatabase(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || {});
        });
    });
}
async function fetchUserPoints(cmiDb, username) {
    const sanitizedUsername = username.trim();
    const sql = 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE';
    try {
        const row = await queryDatabase(cmiDb, sql, [sanitizedUsername]);
        if (!row?.UserMeta?.includes('%%')) {
            console.warn(`Invalid or missing UserMeta for username: ${sanitizedUsername}`);
            return 0;
        }
        const [, points] = row.UserMeta.split('%%');
        return parseFloat(points) || 0;
    } catch (error) {
        console.error(`Error fetching points for ${sanitizedUsername}:`, error.message);
        return 0;
    }
}
function createButtons(vouchingFor, rank, data) {
    const buttons = [
        { id: `approve-${vouchingFor}-${rank}`, label: `Approve (${data.approvals}/${data.requiredApprovals})`, style: 'Primary' },
        { id: `vouchButton-${vouchingFor}`, label: `Vouch (${data.vouches} Received)`, style: 'Success' },
        { id: `accumulatedPts-${vouchingFor}-${rank}`, label: `Points: ${data.userPoints}/${data.requiredPts}`, style: 'Secondary', disabled: true },
        { id: `refresh-${vouchingFor}-${rank}`, label: 'Refresh', style: 'Secondary' },
    ];
    const row = new ActionRowBuilder();
    buttons.forEach(({ id, label, style, disabled = false }) => {
        row.addComponents(new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled));
    });
    return row;
}
async function handleApplication(interaction) {
    const rcon = new Rcon({
        host: config.rconIp,
        port: config.rconPort,
        password: config.rconPwd
    });
    const [action, vouchingFor, rank] = interaction.customId.split('-');
    const griggyDb = new sqlite3.Database(databaseDir, sqlite3.OPEN_READWRITE);
    const cmiDb = new sqlite3.Database(cmiDatabaseDir, sqlite3.OPEN_READWRITE);
    try {
        await interaction.deferReply({ ephemeral: true });
        if (action === 'refresh') {
            const application = await queryDatabase(griggyDb, 'SELECT * FROM applications WHERE discord_id = ? AND status = ?', [vouchingFor, 'active']);
            if (!application) {
                await interaction.editReply({ content: `No active application found for <@${vouchingFor}>` });
                return;
            }
            const { approvals = 0 } = application;
            const { vouches = 0 } = await queryDatabase(griggyDb, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor]);
            const userPoints = await fetchUserPoints(cmiDb, application.player_name);
            const buttonRow = createButtons(vouchingFor, rank, {
                approvals,
                requiredApprovals: requiredStaffReactions[rank],
                requiredPts: requiredPoints[rank],
                vouches,
                userPoints
            });
            try {
                const submissionMessage = await interaction.channel.messages.fetch(application.message_id);
                if (!submissionMessage) {
                    await interaction.editReply({ content: 'Error: The application message could not be found. It may have been deleted.' });
                    return;
                }
                if (approvals >= requiredStaffReactions[rank] && userPoints >= requiredPoints[rank]) {
                    const guild = interaction.guild;
                    const member = await guild.members.fetch(vouchingFor).catch(() => null);
                    if (member) {
                        const role = guild.roles.cache.find(r => r.name.toLowerCase() === rank.toLowerCase());
                        if (role) {
                            await rcon.connect();
                            await member.roles.add(role);
                            await interaction.followUp({ content: `<@${vouchingFor}> has met the criteria and has been granted the ${rank} role!` });
                            await interaction.channel.send(`Your application has been approved, congratulations <@${member.id}>! <a:_:774429683876888576>`);
                            await interaction.channel.setLocked(true);
                            await rcon.send(`lp user ${application.player_name} promote player`);
                            await new Promise((resolve, reject) => {
                                griggyDb.run(
                                    'UPDATE applications SET status = ? WHERE discord_id = ?',
                                    ['approved', vouchingFor],
                                    (err) => {
                                        if (err) reject(err);
                                        else resolve();
                                    }
                                );
                            });
                            rcon.end();
                        } else {
                            await interaction.followUp({ content: `Role "${rank}" not found in the server. Please check role setup.`, ephemeral: true });
                        }
                    } else {
                        await interaction.followUp({ content: `Could not fetch member <@${vouchingFor}>. They might not be in the server.`, ephemeral: true });
                    }
                }
                await submissionMessage.edit({ components: [buttonRow] });
                if (approvals < requiredStaffReactions[rank] || userPoints < requiredPoints[rank]) {
                    await interaction.editReply({ content: 'Buttons have been refreshed.' });
                }
            } catch (err) {
                console.error('Error editing submission message:', err);
                await interaction.editReply({ content: 'An error occurred while refreshing the buttons.' });
            }
        }
        if (action === 'approve') {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            const allowedRoles = ['Moderator', 'Engineer', 'Admin', 'Owner'];
            const hasPermission = member.roles.cache.some(role => allowedRoles.includes(role.name));
            if (!hasPermission) {
                await interaction.editReply({ content: 'You do not have the required permissions to approve applications.' });
                return;
            }
            const application = await queryDatabase(griggyDb, 'SELECT * FROM applications WHERE discord_id = ? AND status = ?', [vouchingFor, 'active']);
            if (!application) {
                await interaction.editReply({ content: `No active application found for <@${vouchingFor}>` });
                return;
            }
            const approvals = parseInt(application.approvals || 0, 10);
            const updatedApprovals = approvals + 1;
            await new Promise((resolve, reject) => {
                griggyDb.run('UPDATE applications SET approvals = ? WHERE discord_id = ?', [updatedApprovals, vouchingFor], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            await interaction.editReply({ content: 'Your reaction has been recorded.' });
            await interaction.channel.send({ content: `<@${interaction.user.id}> has approved this application. Multiple approvals may be required for higher ranks.` });
        }
    } catch (error) {
        console.error('Error processing interaction:', error.message);
        await interaction.editReply({ content: 'An error occurred while processing your request.' });
    } finally {
        griggyDb.close();
        cmiDb.close();
    }
}
module.exports = handleApplication;