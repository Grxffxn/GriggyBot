const sqlite3 = require('sqlite3').verbose();
const { MessageFlags } = require('discord.js');

function queryDB(dbPath, query, params = [], single = false) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return reject(err);
    });

    if (single) {
      db.get(query, params, (err, row) => {
        if (err) {
          db.close();
          return reject(err);
        }
        db.close();
        resolve(row);
      });
    } else {
      db.all(query, params, (err, rows) => {
        if (err) {
          db.close();
          return reject(err);
        }
        db.close();
        resolve(rows);
      });
    }
  });
}

async function addTodoItem(interaction) {
  await interaction.deferUpdate();
  const griggyDatabaseDir = interaction.client.config.griggyDbPath;
  let todoItem = interaction.fields.getTextInputValue('todo');
  const hyperlink = interaction.fields.getTextInputValue('link');
  const priority = interaction.fields.getTextInputValue('priority');

  if (hyperlink) todoItem = `${todoItem} [Info](${hyperlink})`;

  await queryDB(griggyDatabaseDir, 'INSERT INTO todo (todo, status) VALUES (?, ?)', [todoItem, priority]);

  return interaction.followUp({ content: `TODO item '${todoItem}' added to '${priority}' list.`, flags: MessageFlags.Ephemeral });
}

async function updateTodoItem(interaction, todoId) {
  await interaction.deferUpdate();
  const griggyDatabaseDir = interaction.client.config.griggyDbPath;

  if (!interaction.fields.getTextInputValue('todo') &&
    !interaction.fields.getTextInputValue('priority') &&
    !interaction.fields.getTextInputValue('link')) {
    return interaction.followUp({ content: 'Didn\'t get any changes from your submission.', flags: MessageFlags.Ephemeral });
  }

  const originalTodoItem = queryDB(griggyDatabaseDir, 'SELECT * FROM todo WHERE id = ?', [todoId], true);
  if (!originalTodoItem) return interaction.followUp({ content: 'Something went wrong...', flags: MessageFlags.Ephemeral });

  let todoText = originalTodoItem.todo;
  const hyperlink = todoItem.includes(' [Info](') ? todoText.split(' [Info](')[1].split(')')[0] : null;
  todoText = todoText.includes(' [Info](') ? todoText.split(' [Info](')[0].trim() : todoText;
  let updatedTodoItem = interaction.fields.getTextInputValue('todo') || todoText;
  let updatedPriority = interaction.fields.getTextInputValue('priority') || originalTodoItem.status;
  const updatedHyperlink = interaction.fields.getTextInputValue('link');

  updatedTodoItem += updatedHyperlink ? ` [Info](${updatedHyperlink})` : (hyperlink ? ` [Info](${hyperlink})` : '');

  await queryDB(griggyDatabaseDir, 'UPDATE todo SET todo = ?, status = ? WHERE id = ?', [updatedTodoItem, updatedPriority, todoId]);

  return interaction.followUp({ content: `TODO item '${originalTodoItem.todo}' updated to '${updatedTodoItem}' in '${updatedPriority}' list.`, flags: MessageFlags.Ephemeral });
}

async function setupUserMetaTracking(dbPath, force = false) {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);

  return new Promise((resolve, reject) => {
    db.all('SELECT id, UserMeta FROM users', async (err, rows) => {
      if (err) {
        db.close();
        return reject(err);
      }

      let updatedCount = 0;
      for (const row of rows) {
        let usermetaObj = {};
        let needsUpdate = false;

        if (!row.usermeta || row.usermeta.trim() === '') {
          usermetaObj = { griggypoints: "0" };
          needsUpdate = true;
        } else {
          try {
            usermetaObj = JSON.parse(row.usermeta);
            if (!usermetaObj.hasOwnProperty('griggypoints')) {
              usermetaObj.griggypoints = "0";
              needsUpdate = true;
            }
          } catch (err) {
            // If parsing fails and force is true, reset to just griggypoints
            if (force) {
              usermetaObj = { griggypoints: "0" };
              needsUpdate = true;
            } else {
              console.error(`Error parsing usermeta for row ID ${row.id}:`, err);
              continue;
            }
          }
        }

        if (needsUpdate) {
          await new Promise((res, rej) => {
            db.run(
              'UPDATE users SET UserMeta = ? WHERE id = ?',
              [JSON.stringify(usermetaObj), row.id],
              function (updateErr) {
                if (updateErr) return rej(updateErr);
                updatedCount++;
                res();
              }
            );
          });
        }
      }

      db.close();
      resolve(updatedCount);
    });
  });
}

module.exports = { queryDB, addTodoItem, updateTodoItem, setupUserMetaTracking };