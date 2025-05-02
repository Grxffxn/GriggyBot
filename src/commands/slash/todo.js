// Create an interactive TODO list for staff
// Any staff member can add, update, delete, view TODO items and update to different lists (To Do, In Progress, Completed)
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, EmbedBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils');
const { checkStaff } = require('../../utils/roleCheckUtils');
const { getConfig } = require('../../utils/configUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('todo')
		.setDescription('Modify the TODO list')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a TODO item.'),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('update')
				.setDescription('Update a TODO item.')
				.addStringOption(option =>
					option.setName('keyword')
						.setDescription('Keyword to search for.')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Delete a TODO item.')
				.addStringOption(option =>
					option.setName('keyword')
						.setDescription('Keyword to search for.')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('View a specific list.')
				.addStringOption(option =>
					option.setName('list')
						.setDescription('The list to view.')
						.setRequired(false)
						.addChoices(
							{ name: 'low', value: 'low' },
							{ name: 'todo', value: 'todo' },
							{ name: 'inprogress', value: 'inprogress' },
							{ name: 'completed', value: 'completed' },
							{ name: 'idea', value: 'idea' },
						))
				.addBooleanOption(option =>
					option.setName('post')
						.setDescription('Post to TODO channel?')
						.setRequired(false),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign')
				.setDescription('Assign a TODO item to a user.')
				.addStringOption(option =>
					option.setName('keyword')
						.setDescription('Keyword to search for.')
						.setRequired(true),
				)
				.addUserOption(option =>
					option.setName('user')
						.setDescription('User to assign the TODO item to.')
						.setRequired(true),
				),
		),

	async run(interaction) {
		// Check if the user is staff
		const isStaff = checkStaff(interaction.member);
		if (!isStaff) {
			return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
		}

		const config = getConfig();
		const griggyDatabaseDir = config.griggyDbPath;

		// If all options are empty, get the low priority, standard to-do items from the database and format the result
		if (interaction.options.getSubcommand() === 'view') {
			const post = interaction.options.getBoolean('post');
			const view = interaction.options.getString('list');

			const statuses = ['low', 'todo', 'inprogress', 'completed', 'idea'];
			const headers = {
				low: 'Low Priority',
				todo: 'To Do',
				inprogress: 'In Progress',
				completed: 'Completed',
				idea: 'Ideas'
			};
			const emojis = {
				low: '🐢',
				todo: '📋',
				inprogress: '🚧',
				completed: '✅',
				idea: '💡'
			};

			const fetchTodos = async (status, limit = null) => {
                let query = `SELECT * FROM todo WHERE status = ? ORDER BY id DESC`;
                if (limit) query += ` LIMIT ${limit}`;
                return queryDB(griggyDatabaseDir, query, [status]);
            };

			const lists = Object.fromEntries(
				await Promise.all(statuses.map(async status => [
					status, await fetchTodos(status, status === 'completed' ? 3 : null)
				]))
			);

			const formatTodoList = (header, emoji, items) => {
				return `## ${header} ${emoji}\n` + items.map(item =>
					item.assignee ? `- ${item.todo} - <@${item.assignee}>` : `- ${item.todo}`
				).join('\n');
			};

			let todoString = view ? formatTodoList(headers[view], emojis[view], lists[view]) : '';

			if (!view) {
				todoString += statuses.slice(0, 3).map(status =>
					`\n${formatTodoList(headers[status], emojis[status], lists[status])}`
				).join('');
			}

			const sendMessage = async (channelOrInteraction, content, isEphemeral) => {
				const flags = isEphemeral ? MessageFlags.Ephemeral : undefined;
				// If the length of content is over 2000 characters, split it into multiple messages
				if (content.length > 2000) {
					const lastHeaderIndex = content.lastIndexOf('##');
					const firstPart = content.substring(0, lastHeaderIndex);
					const secondPart = content.substring(lastHeaderIndex);
					if (typeof channelOrInteraction.reply === 'function') {
						await channelOrInteraction.reply({ content: firstPart, flags });
						await channelOrInteraction.followUp({ content: secondPart, flags });
					} else {
						await channelOrInteraction.send({ content: firstPart });
						await channelOrInteraction.send({ content: secondPart });
					}
				} else {
					if (typeof channelOrInteraction.reply === 'function') {
						await channelOrInteraction.reply({ content, flags });
					} else {
						await channelOrInteraction.send({ content });
					}
				}
			};

			if (post) {
				const todoChannel = interaction.guild.channels.cache.find(channel => channel.name === 'to-do');
				await sendMessage(todoChannel, todoString, false);
				return interaction.reply({ content: `TODO list posted to ${todoChannel}.`, flags: MessageFlags.Ephemeral });
			} else {
				await sendMessage(interaction, todoString, true);
			}
		}
		// Create Modals based on the provided subcommand
		const isNewItem = interaction.options.getSubcommand() === 'add';

		// Configure text inputs dynamically
		const priorityTextInput = new TextInputBuilder()
			.setLabel('Priority')
			.setStyle(TextInputStyle.Paragraph)
			.setCustomId('priority')
			.setPlaceholder('low|todo|inprogress|completed|idea')
			.setRequired(isNewItem);

		const todoTextInput = new TextInputBuilder()
			.setLabel('Title')
			.setStyle(TextInputStyle.Paragraph)
			.setCustomId('todo')
			.setRequired(isNewItem)
			.setPlaceholder('Title of the TODO item');

		const hyperlinkTextInput = new TextInputBuilder()
			.setLabel('Link')
			.setStyle(TextInputStyle.Paragraph)
			.setCustomId('link')
			.setRequired(false)
			.setPlaceholder('Link to any relevant information');

		const priorityActionRow = new ActionRowBuilder()
			.addComponents(priorityTextInput);

		const itemActionRow = new ActionRowBuilder()
			.addComponents(todoTextInput);

		const hyperlinkActionRow = new ActionRowBuilder()
			.addComponents(hyperlinkTextInput);

		// /todo add
		if (interaction.options.getSubcommand() === 'add') {
			const modal = new ModalBuilder()
				.setCustomId('todoModal-add')
				.setTitle('Add TODO Item')
				.setComponents(priorityActionRow, itemActionRow, hyperlinkActionRow);
			await interaction.showModal(modal);
			const modalResult = await interaction.awaitModalSubmit({ filter: i => i.customId === 'todoModal-add' && i.user.id === interaction.user.id, time: 60000 });
			modalResult.deferUpdate();
			if (!modalResult) {
				return interaction.followUp({ content: 'You did not provide a TODO item and priority within 60 seconds.', flags: MessageFlags.Ephemeral });
			}
			let todoItem = modalResult.fields.getTextInputValue('todo');
			const hyperlink = modalResult.fields.getTextInputValue('link');
			const priority = modalResult.fields.getTextInputValue('priority');
			// If link is not null, append to the end of the TODO item
			if (hyperlink) {
				todoItem = `${todoItem} [Info](${hyperlink})`;
			}
			await queryDB(griggyDatabaseDir, 'INSERT INTO todo (todo, status) VALUES (?, ?)', [todoItem, priority]);

			return interaction.followUp({ content: `TODO item '${todoItem}' added to '${priority}' list.`, flags: MessageFlags.Ephemeral });
		}

		// /todo update <keyword>
		if (interaction.options.getSubcommand() === 'update') {
			const keyword = interaction.options.getString('keyword');
			const todoItemResults = await queryDB(griggyDatabaseDir, 'SELECT * FROM todo WHERE todo LIKE ? AND status != ?', [`%${keyword}%`, 'completed']);
			if (todoItemResults.length === 0) {
				return interaction.reply({ content: `No TODO item found with keyword '${keyword}'.`, flags: MessageFlags.Ephemeral });
			}

			// set the title to the first 15 characters of the TODO item
			let todoItem = todoItemResults[0].todo;
			const hyperlink = todoItem.includes(' [Info](') ? todoItem.split(' [Info](')[1].split(')')[0] : null;
			todoItem = todoItem.includes(' [Info](') ? todoItem.split(' [Info](')[0].trim() : todoItem;
			const todoItemExcerpt = todoItem.substring(0, 32);
			const todoItemExcerptString = todoItem.length > 32 ? `${todoItemExcerpt}...` : todoItemExcerpt;
			const modal = new ModalBuilder()
				.setCustomId('todoModal-update')
				.setTitle(`${todoItemExcerptString}`)
				.setComponents(priorityActionRow, itemActionRow, hyperlinkActionRow);
			await interaction.showModal(modal);
			const modalResult = await interaction.awaitModalSubmit({ filter: i => i.customId === 'todoModal-update' && i.user.id === interaction.user.id, time: 60000 });
			modalResult.deferUpdate();
			if (!modalResult) {
				return interaction.followUp({ content: 'Didn\'t get a response to the form.', flags: MessageFlags.Ephemeral });
			}
			let updatedTodoItem = modalResult.fields.getTextInputValue('todo') || todoItem;
			let updatedPriority = modalResult.fields.getTextInputValue('priority') || todoItemResults[0].status;
			const updatedHyperlink = modalResult.fields.getTextInputValue('link');

			// If no fields were updated, return early
			if (!modalResult.fields.getTextInputValue('todo') && !modalResult.fields.getTextInputValue('priority') && !updatedHyperlink) {
				return interaction.followUp({ content: 'Didn\'t get any changes from your submission.', flags: MessageFlags.Ephemeral });
			}

			// Modify hyperlink if present, otherwise preserve original link
			updatedTodoItem += updatedHyperlink ? ` [Info](${updatedHyperlink})` : (hyperlink ? ` [Info](${hyperlink})` : '');

			// Update the TODO item in the database
			await queryDB(griggyDatabaseDir, 'UPDATE todo SET todo = ?, status = ? WHERE id = ?', [updatedTodoItem, updatedPriority, todoItemResults[0].id]);

			return interaction.followUp({ content: `TODO item '${todoItemResults[0].todo}' updated to '${updatedTodoItem}' in '${updatedPriority}' list.`, flags: MessageFlags.Ephemeral });
		}

		// /todo delete <keyword>
		if (interaction.options.getSubcommand() === 'delete') {
			const keyword = interaction.options.getString('keyword');
			// Query the database for the TODO item
			const todoItem = await queryDB(griggyDatabaseDir, 'SELECT * FROM todo WHERE todo LIKE ? AND status != ?', [`%${keyword}%`, 'completed'], true);
			// No item found
			if (!todoItem) {
				return interaction.reply({ content: `No TODO item found with keyword '${keyword}'.`, flags: MessageFlags.Ephemeral });
			}
			// Create an embed to confirm deletion
			const embed = new EmbedBuilder()
				.setTitle('Delete TODO Item')
				.setDescription(`Are you sure you want to delete the TODO item '${todoItem.todo}' from the '${todoItem.status}' list?`)
				.setColor(0xff4500);
			// Use a reaction collector to wait for a response
			const deletionReactionFilter = (reaction, user) => {
				return ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
			};
			await interaction.reply({ embeds: [embed] });
			const embedMessage = await interaction.fetchReply();
			const deletionReactionCollector = embedMessage.createReactionCollector({ filter: deletionReactionFilter, time: 60000 });
			deletionReactionCollector.on('collect', async (reaction, user) => {
				if (user.id !== interaction.user.id) return;
				if (reaction.emoji.name === '✅') {
					await queryDB(griggyDatabaseDir, 'DELETE FROM todo WHERE id = ?', [todoItem.id]);
					return interaction.editReply({ content: `TODO item '${todoItem.todo}' deleted from '${todoItem.status}' list.`, embeds: [], flags: MessageFlags.Ephemeral });
				} else {
					return interaction.editReply({ content: 'TODO item deletion cancelled.', embeds: [], flags: MessageFlags.Ephemeral });
				}
			});
			deletionReactionCollector.on('end', collected => {
				if (collected.size === 0) {
					return interaction.editReply({ content: 'TODO item deletion cancelled.', embeds: [], flags: MessageFlags.Ephemeral });
				}
			});
			// Send the embed and add the reactions
			await embedMessage.react('✅');
			await embedMessage.react('❌');

		}

		// /todo assign <keyword> <user>
		if (interaction.options.getSubcommand() === 'assign') {
			const keyword = interaction.options.getString('keyword');
			const assignedUser = interaction.options.getUser('user');
			// Query the database for the TODO item
			const todoItem = await queryDB(griggyDatabaseDir, 'SELECT * FROM todo WHERE todo LIKE ? AND status != ?', [`%${keyword}%`, 'completed'], true)
			if (!todoItem) {
				return interaction.reply({ content: `No TODO item found with keyword '${keyword}'.`, flags: MessageFlags.Ephemeral });
			}
			// If the TODO item is already assigned to the user, remove the assignment
			if (todoItem.assignee === assignedUser.id) {
				await queryDB(griggyDatabaseDir, 'UPDATE todo SET assignee = ? WHERE id = ?', [null, todoItem.id]);
				return interaction.reply({ content: `TODO item '${todoItem.todo}' unassigned from ${assignedUser}.`, flags: MessageFlags.Ephemeral });
			}
			// Create an embed to confirm assignment
			const embed = new EmbedBuilder()
				.setTitle('Assign TODO Item')
				.setDescription(`Are you sure you want to assign the TODO item '${todoItem.todo}' to <@${assignedUser.id}>?`)
				.setColor(0xff4500);
			// Reaction collector
			const assignmentReactionFilter = (reaction, user) => {
				return ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
			};
			await interaction.reply({ embeds: [embed] });
			const embedMessage = await interaction.fetchReply();
			const assignmentReactionCollector = embedMessage.createReactionCollector({ filter: assignmentReactionFilter, time: 60000 });
			assignmentReactionCollector.on('collect', async (reaction) => {
				if (reaction.emoji.name === '✅') {
					// If the TODO item is already assigned to a user, append the new user to the list of assigned users
					let assignee = null;
					if (todoItem.assignee) {
						assignee = `${todoItem.assignee},${assignedUser.id}`;
					} else {
						assignee = assignedUser.id;
					}
					await queryDB(griggyDatabaseDir, 'UPDATE todo SET assignee = ? WHERE id = ?', [assignee, todoItem.id]);
					return interaction.editReply({ content: `TODO item '${todoItem.todo}' assigned to ${assignedUser}.`, embeds: [], flags: MessageFlags.Ephemeral });
				}
				if (reaction.emoji.name === '❌') {
					return interaction.editReply({ content: 'TODO item assignment cancelled.', embeds: [], flags: MessageFlags.Ephemeral });
				}
			},
			);
			assignmentReactionCollector.on('end', collected => {
				if (collected.size === 0) {
					return interaction.editReply({ content: 'TODO item assignment cancelled.', embeds: [], flags: MessageFlags.Ephemeral });
				}
			});
			// Send the embed and add the reactions
			await embedMessage.react('✅');
			await embedMessage.react('❌');
		}
	},
};