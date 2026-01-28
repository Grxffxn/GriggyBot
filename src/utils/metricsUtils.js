const { queryDB } = require('./databaseUtils.js');

async function logInteractionCreate(interaction, { userId, username, interactionType, commandName, customId, timestamp }) {
  const client = interaction.client;
  const griggyDatabaseDir = client.config.griggyDbPath;
  const isOptedOut = await isUserOptedOut(client, griggyDatabaseDir, userId);
  if (isOptedOut) {
    userId = null;
    username = 'Anonymous';
  }
  const sql = `
    INSERT INTO usage_metrics (user_id, username, type, command_name, custom_id, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [userId, username, interactionType, commandName, customId, timestamp];

  try {
    await queryDB(griggyDatabaseDir, sql, params);
  } catch (error) {
    client.log(`Failed to log interaction: ${error.message}`, 'ERROR');
  }
}

async function logMessageCreate(message, { userId, username, commandName, content, timestamp }) {
  const client = message.client;
  const griggyDatabaseDir = client.config.griggyDbPath;
  const isOptedOut = await isUserOptedOut(client, griggyDatabaseDir, userId);
  if (isOptedOut) {
    userId = null;
    username = 'Anonymous';
  }
  const sql = `
    INSERT INTO usage_metrics (user_id, username, type, command_name, content, timestamp)
    VALUES (?, ?, 'message', ?, ?, ?)
  `;
  const params = [userId, username, commandName, content, timestamp];

  try {
    await queryDB(griggyDatabaseDir, sql, params);
  } catch (error) {
    client.log(`Failed to log message: ${error.message}`, 'ERROR');
  }
}

/**
 * Retrieves usage metrics from the usage_metrics database table.
 *
 * This function supports flexible querying for analytics, including filtering by type,
 * user, date, and limiting results. It can also aggregate and return the top-used commands.
 *
 * @async
 * @param {object} client - The Discord client object (must have config.griggyDbPath).
 * @param {object} [options] - Query options.
 * @param {string} [options.type='all'] - The type of metric to filter by (e.g., 'command', 'message'). Use 'all' for no filter.
 * @param {string|null} [options.userId=null] - The user ID to filter by. If null, includes all users.
 * @param {number|null} [options.limit=null] - The maximum number of results to return. If null, returns all.
 * @param {boolean} [options.topCommands=false] - If true, returns aggregated usage counts for each command.
 * @param {string|null} [options.since=null] - An ISO date string to filter results since this timestamp.
 * @returns {Promise<Array>} Resolves to an array of metric objects or aggregated results.
 *
 * @example
 * // Get all usage metrics
 * const allMetrics = await getUsageMetrics(client);
 *
 * @example
 * // Get top 5 commands used by a specific user in the last 30 days
 * const topUserCommands = await getUsageMetrics(client, {
 *   userId: '123456789012345678',
 *   topCommands: true,
 *   limit: 5,
 *   since: new Date(Date.now() - 30*24*60*60*1000).toISOString()
 * });
 *
 * @example
 * // Get the last 10 message events
 * const recentMessages = await getUsageMetrics(client, {
 *   type: 'message',
 *   limit: 10
 * });
 */
async function getUsageMetrics(
  client,
  {
    type = 'all',
    userId = null,
    limit = null,
    topCommands = false,
    since = null,
  } = {}
) {
  const griggyDatabaseDir = client.config.griggyDbPath;
  let sql;
  const params = [];

  if (topCommands) {
    sql = `
      SELECT command_name, COUNT(*) as uses
      FROM usage_metrics
      WHERE command_name IS NOT NULL
    `;
    if (type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    if (since) {
      sql += ' AND timestamp >= ?';
      params.push(since);
    }
    sql += `
      GROUP BY command_name
      ORDER BY uses DESC
    `;
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
  } else {
    sql = 'SELECT * FROM usage_metrics WHERE 1=1';
    if (type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    if (since) {
      sql += ' AND timestamp >= ?';
      params.push(since);
    }
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
  }

  try {
    return await queryDB(griggyDatabaseDir, sql, params);
  } catch (error) {
    client.log(`Failed to retrieve usage metrics: ${error.message}`, 'ERROR');
    return [];
  }
}

async function getTopUsers(client, { limit = 10, since = null } = {}) {
  const griggyDatabaseDir = client.config.griggyDbPath;
  let sql = `
    SELECT user_id, username, COUNT(*) as uses
    FROM usage_metrics
    WHERE user_id IS NOT NULL
  `;
  const params = [];
  if (since) {
    sql += ' AND timestamp >= ?';
    params.push(since);
  }
  sql += `
    GROUP BY user_id, username
    ORDER BY uses DESC
    LIMIT ?
  `;
  params.push(limit);

  try {
    return await queryDB(griggyDatabaseDir, sql, params);
  } catch (error) {
    client.log(`Failed to retrieve top users: ${error.message}`, 'ERROR');
    return [];
  }
}

async function archiveUsageMetrics(client) {
  const griggyDatabaseDir = client.config.griggyDbPath;
  const sql = `
    DELETE FROM usage_metrics
    WHERE timestamp < datetime('now', '-30 days')
  `;
  try {
    await queryDB(griggyDatabaseDir, sql);
    client.log('Archived usage metrics older than 30 days.', 'INFO');
  } catch (error) {
    client.log(`Failed to archive usage metrics: ${error.message}`, 'ERROR');
  }
}

async function isUserOptedOut(client, databaseDir, userId) {
  const sql = 'SELECT 1 FROM metrics_opt_out WHERE user_id = ? LIMIT 1';
  try {
    const result = await queryDB(databaseDir, sql, [userId], true);
    return !!result;
  } catch (error) {
    client.log(`Failed to check opt-out status: ${error.message}`, 'ERROR');
    return true;
  }
}

module.exports = {
  logInteractionCreate,
  logMessageCreate,
  getUsageMetrics,
  getTopUsers,
  archiveUsageMetrics,
  isUserOptedOut,
};