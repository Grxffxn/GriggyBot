const { addTodoItem, updateTodoItem } = require('../../utils/databaseUtils.js');

module.exports = {
  customId: 'todoModal',
  run: async (interaction, args) => {
    const action = args[0];
    const todoId = args[1] || null;
    if (action === 'add') {
      await addTodoItem(interaction);
    } else if (action === 'update') {
      await updateTodoItem(interaction, todoId);
    }
  }
};
