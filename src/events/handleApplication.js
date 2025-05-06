const { ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../utils/configUtils');
const { queryDB } = require('../utils/databaseUtils');
const { sendMCCommand, logRCON } = require('../utils/rconUtils.js');
const { checkStaff } = require('../utils/roleCheckUtils.js');

function createButtons(vouchingFor, rank, data, config) {
    const buttons = [{ id: `approve-${vouchingFor}-${rank}`, label: `Approve (${data.approvals}/${data.requiredApprovals})`, style: 'Primary' }];

    if (config.enableVouch) buttons.push({ id: `vouchButton-${vouchingFor}`, label: `Vouch (${data.vouches} Received)`, style: 'Success' });
    if (config.enableRankPoints) buttons.push({ id: `accumulatedPts-${vouchingFor}-${rank}`, label: `Points: ${data.userPoints}/${data.requiredPts}`, style: 'Secondary', disabled: true });

    buttons.push({ id: `refresh-${vouchingFor}-${rank}`, label: 'Refresh', style: 'Secondary' });

    const row = new ActionRowBuilder();
    buttons.forEach(({ id, label, style, disabled = false }) => {
        row.addComponents(new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled));
    });
    return row;
}

async function handleApplication(interaction) {
    const config = getConfig();
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const [action, vouchingFor, rank] = interaction.customId.split('-');
    const rankConfig = config.ranks.find(r => r.name === rank);

    if (!rankConfig) return interaction.reply({ content: `The rank "${rank}" is not configured.`, flags: MessageFlags.Ephemeral });

    try {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

        if (action === 'refresh') {
            const application = await queryDB(
                griggyDatabaseDir,
                `
                SELECT * FROM applications
                WHERE discord_id = ? AND status = ?
                ORDER BY rowid DESC
                LIMIT 1
                `,
                [vouchingFor, 'active'], true
            );

            if (!application)  return interaction.followUp({ content: `No active application found for <@${vouchingFor}>.`, flags: MessageFlags.Ephemeral });

            const { approvals = 0 } = application;
            const { vouches = 0 } = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor], true) || {};
            const userPoints = config.enableRankPoints
                ? await queryDB(cmiDatabaseDir, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [application.player_name], true)
                    .then(row => parseFloat((row.UserMeta || '').split('%%')[1], 10) || 0)
                : 0;

            const buttonRow = createButtons(vouchingFor, rank, {
                approvals,
                requiredApprovals: rankConfig.requiredStaffApprovals,
                requiredPts: rankConfig.requiredPoints,
                vouches,
                userPoints,
            }, config);

            const submissionMessage = await interaction.channel.messages.fetch(application.message_id).catch(() => null);
            if (!submissionMessage) return interaction.followUp({ content: 'Error: The application message could not be found. It may have been deleted.', flags: MessageFlags.Ephemeral });

            if (
                approvals >= rankConfig.requiredStaffApprovals &&
                (config.enableRankPoints ? userPoints >= rankConfig.requiredPoints : true)
            ) {
                const guild = interaction.guild;
                const member = await guild.members.fetch(vouchingFor).catch(() => null);
                if (member) {
                    const role = await guild.roles.cache.find(r => r.name.toLowerCase() === rank.toLowerCase());
                    if (role) {
                        const command = `lp user ${application.player_name} promote player`;
                        try {
                            const response = await sendMCCommand(command);
                            logRCON(command, response);
                            await member.roles.add(role);
                            await interaction.channel.send(`Your application has been approved, congratulations <@${member.id}>! 🎉`);
                            await interaction.channel.setLocked(true);
                            await queryDB(griggyDatabaseDir, 'UPDATE applications SET status = ? WHERE discord_id = ?', ['approved', vouchingFor]);
                        } catch (error) {
                            await interaction.followUp({ content: `An error occurred while promoting the user. Please try again later.`, flags: MessageFlags.Ephemeral });
                            interaction.client.log('Error promoting user:', 'ERROR', error);
                            return;
                        }
                    } else {
                        return interaction.followUp({ content: `Role "${rank}" not found in the server. Please check role setup.`, flags: MessageFlags.Ephemeral });
                    }
                } else {
                    return interaction.followUp({ content: `Could not fetch member <@${vouchingFor}>. They might not be in the server.`, flags: MessageFlags.Ephemeral });
                }
            }

            await submissionMessage.edit({ components: [buttonRow] });
            if (approvals < rankConfig.requiredStaffApprovals || (config.enableRankPoints && userPoints < rankConfig.requiredPoints)) return;
        }

        if (action === 'approve') {
            const isStaff = checkStaff(interaction.member);
            if (!isStaff) return interaction.followUp({ content: 'You do not have permission to approve applications.', flags: MessageFlags.Ephemeral });

            const application = await queryDB(griggyDatabaseDir, 'SELECT * FROM applications WHERE discord_id = ? AND status = ?', [vouchingFor, 'active'], true);
            if (!application) return interaction.followUp(`No active application found for <@${vouchingFor}>.`);

            const approvals = parseInt(application.approvals || 0, 10);
            const updatedApprovals = approvals + 1;
            await queryDB(griggyDatabaseDir, 'UPDATE applications SET approvals = ? WHERE discord_id = ?', [updatedApprovals, vouchingFor]);

            await interaction.channel.send(`<@${interaction.user.id}> has approved this application. Multiple approvals may be required for higher ranks.`);
        
            interaction.customId = `refresh-${vouchingFor}-${rank}`;
            await handleApplication(interaction);
        }
    } catch (err) {
        interaction.client.log('Error processing interaction:', 'ERROR', err);
        await interaction.followUp({ content: 'An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = handleApplication;