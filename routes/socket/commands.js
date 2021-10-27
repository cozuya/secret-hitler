const { makeReport } = require('./report');
const { selectChancellor } = require('./game/election-util');
const { selectVoting } = require('./game/election');
const { sendInProgressGameUpdate, sendCommandChatsUpdate } = require('./util');
const { LineGuess } = require('./util');

const sendMessage = (game, user, s, date = new Date()) =>
	game.private.commandChats[user.userName].push({
		gameChat: true,
		timestamp: date,
		chat: [
			{
				text: s
			}
		]
	});

/**
 * @callback Run
 * @param {Object} socket - socket reference for the user who invoked the command.
 * @param {Object} passport - socket authentication.
 * @param {Object} user - user object who invoked the command.
 * @param {Object} game - game object.
 * @param {string[]} args - the parsed arguments used to invoke the command.
 * @param {boolean} [AEM=] - whether the user is AEM.
 * @param {boolean} [isSeated=] - whether the user is sat in the game.
 */

/**
 * @typedef {Object} Command - objects representing information about commands.
 * @property {string[]} name - the names that can be used to call the command.
 * @property {string} description - a short description of what the command does.
 * @property {string[]} examples - examples of how to use the command.
 * @property {RegExp} argumentsFormat - a regex that determines how the arguments are parsed.
 * @property {boolean} aemOnly - whether the command can only be used by AEM.
 * @property {boolean} observerOnly - whether the command can only be used by observers.
 * @property {boolean} seatedOnly - whether the command can only be used by seated players.
 * @property {boolean} gameStartedOnly - whether the command can only be used during a started game.
 * @property {Run} [run=] - the function called to run the command.
 */

/**
 * @type {Command[]}
 */
module.exports.commands = [
	{
		name: ['help'],
		description: 'Use your social deduction skills to figure it out',
		examples: ['/help'],
		argumentsFormat: /.*/,
		aemOnly: false,
		observerOnly: false,
		seatedOnly: false,
		gameStartedOnly: false
	},
	{
		name: ['g', 'gl', 'guessline', 'guesslines', 'guesslimes'],
		description: 'Submits a line guess',
		examples: ['/g 123', '/g 56h7', '/g 7890h'],
		argumentsFormat: /^((?:\dh?)+)$/i,
		aemOnly: false,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['pingmod', 'pingmods', 'pingmoderator', 'pingaem', 'pingeditor'],
		description: 'Pings a moderator with a message',
		examples: ['/pingmod Help me'],
		argumentsFormat: /(.*)/,
		aemOnly: false,
		observerOnly: false,
		seatedOnly: true,
		gameStartedOnly: false
	},
	{
		name: ['ping'],
		description: 'Pings a player',
		examples: ['/ping 5'],
		argumentsFormat: /^(\d{1,2})$/,
		aemOnly: false,
		observerOnly: false,
		seatedOnly: true,
		gameStartedOnly: true
	},
	{
		name: ['forcerigdeck'],
		description: 'Changes the deck in the current game, definitely not fake',
		examples: ['/forcerigdeck B', '/forcerigdeck rrrrrrrrrrrbbbbbb'],
		argumentsFormat: /^([RB]{1,27})$/i,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['forcevote', 'fv'],
		description: 'Forces a player to vote',
		examples: ['/forcevote 4 ja', '/forcevote 10 nein'],
		argumentsFormat: /^(\d{1,2})\s+(ya|ja|jah|nein|yes|no|true|false)$/i,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['forceskip', 'fs'],
		description: 'Forcibly skips a government',
		examples: ['/forceskip 3', '/forceskip'],
		argumentsFormat: /^(\d{1,2})?$/,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['forcepick'],
		description: 'Forcibly picks a chancellor',
		examples: ['/forcepick 3 5', '/forcepick 10'],
		argumentsFormat: /^(?:(\d{1,2})\s)?\s*(\d{1,2})$/,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['forceping'],
		description: 'Forcibly pings a player',
		examples: ['/forceping 7'],
		argumentsFormat: /^(\d{1,2})$/,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	},
	{
		name: ['forcerigrole'],
		description: 'Changes a players role, definitely not fake.',
		examples: ['/forcerigrole 1 fascist', '/forcerigrole 9 liberal'],
		argumentsFormat: /^(\d{1,2})\s+(hitler|fascist|liberal|h|f|l|hit|fas|lib)$/i,
		aemOnly: true,
		observerOnly: true,
		seatedOnly: false,
		gameStartedOnly: true
	}
];

/**
 * Finds a command in the commands array by name, case-insensitive.
 *
 * @param {string} name - the name of the command to find.
 *
 * @return {Command|null} - the command with that name or null if it is not found.
 */
module.exports.commands.getCommand = function(name) {
	return this.find(c => c.name.includes(name.toLowerCase())) || null;
};

/**
 * Parses a message into a command object.
 *
 * @param {string} msg - the message string.
 *
 * @return {{ name: string, args: (string[]|null), command: (Command|null) }} - the name of the invoked command, as well as the parsed arguments and command object.
 */
module.exports.parseCommand = msg => {
	const trimPrefix = (s, prefix) => (s.startsWith(prefix) ? s.slice(prefix.length) : s);
	const cmdRegex = /^\/(\w*)/i;

	const name = cmdRegex.exec(msg.trim());

	const cmd = module.exports.commands.getCommand(name[1]);
	if (!cmd) {
		return { name: name[1], args: null, command: null };
	}

	msg = trimPrefix(msg, name[0]).trim();
	const parsedArgs = cmd.argumentsFormat.exec(msg);

	return { name: name[1].toLowerCase(), args: parsedArgs && parsedArgs.slice(1), command: cmd };
};

/**
 * Runs a command given a user message.
 *
 * @param {Object} socket - socket reference for the user who invoked the command.
 * @param {Object} passport - socket authentication.
 * @param {Object} user - user object who invoked the command.
 * @param {Object} game - game object.
 * @param {string} msg - the message sent by the user.
 * @param {boolean} AEM - whether the user is AEM.
 * @param {boolean} isSeated - whether the user is sat in the game.
 */
module.exports.runCommand = (socket, passport, user, game, msg, AEM, isSeated) => {
	try {
		if (!game.private.commandChats[user.userName]) {
			game.private.commandChats[user.userName] = [];
		}

		const { name, command, args } = module.exports.parseCommand(msg);

		if (!command) {
			sendMessage(game, user, `Unknown command /${name}. Use /help for a list of commands.`);
			return;
		}

		if (command.aemOnly && !AEM) {
			sendMessage(game, user, 'You do not have permission to use this command.');
			return;
		}

		if (command.observerOnly && isSeated) {
			sendMessage(game, user, 'This command cannot be used by seated players.');
			return;
		}

		if (command.seatedOnly && !isSeated) {
			sendMessage(game, user, 'This command cannot be used by observers.');
			return;
		}

		if (command.gameStartedOnly && (!game.gameState.isStarted || game.gameState.isCompleted)) {
			sendMessage(game, user, 'This command can only be used during an in-progress game.');
			return;
		}

		if (!args) {
			sendMessage(game, user, `You're not doing this right. Some examples: ${command.examples.join(', ')}`);
			return;
		}

		command.run(socket, passport, user, game, args, AEM, isSeated);
	} finally {
		if (game.gameState.isTracksFlipped) {
			sendInProgressGameUpdate(game, false);
		} else {
			sendCommandChatsUpdate(game);
		}
	}
};

module.exports.commands.getCommand('help').run = (socket, passport, user, game, args, AEM, isSeated) => {
	let i = 1;
	sendMessage(game, user, 'List of Commands:');
	for (const command of module.exports.commands) {
		const isNotUsable =
			(command.aemOnly && !AEM) ||
			(command.observerOnly && isSeated) ||
			(command.seatedOnly && !isSeated) ||
			(command.gameStartedOnly && (!game.gameState.isStarted || game.gameState.isCompleted));

		if (!isNotUsable) {
			game.private.commandChats[user.userName].push({
				gameChat: true,
				timestamp: Date.now() + i++,
				chat: [
					{
						text: `/${command.name[0]}`,
						type: 'player'
					},
					{
						text: ` - ${command.description}`
					}
				]
			});
		}
	}
};

module.exports.commands.getCommand('g').run = (socket, passport, user, game, args) => {
	if (game.general.private || (game.customGameSettings && game.customGameSettings.enabled)) {
		sendMessage(game, user, 'Line guessing is only enabled in ranked and practice games.');
		return;
	}

	if (game.trackState.fascistPolicyCount >= 3 && !['specialElection', 'deckPeek'].includes(game.gameState.phase)) {
		sendMessage(game, user, 'Hitler zone has begun, so line guessing has closed.');
		return;
	}

	const guess = LineGuess.parse(args[0]);
	const playerCount = game.private.seatedPlayers.length;
	const fasCount = Math.trunc((playerCount - 1) / 2);

	if (!guess) {
		sendMessage(game, user, 'Invalid line guess. Examples of valid line guesses are 12h3, 567.');
		return;
	}

	if (guess.regs.length !== fasCount) {
		sendMessage(game, user, 'Incorrect number of fascists in guess.');
		return;
	}

	if (guess.regs.some(x => x > playerCount)) {
		sendMessage(game, user, 'Invalid seat number.');
		return;
	}

	if (game.guesses[user.userName]) {
		sendMessage(game, user, `Updated line guess. (${guess.toString()})`);
	} else {
		sendMessage(game, user, `Submitted line guess. (${guess.toString()})`);
	}

	game.guesses[user.userName] = guess;
};

module.exports.commands.getCommand('pingmod').run = (socket, passport, user, game, args) => {
	if (!game.lastModPing || Date.now() > game.lastModPing + 180000) {
		game.lastModPing = Date.now();
		sendMessage(game, user, 'Pinged a moderator successfully');
		makeReport(
			{
				player: passport.user,
				situation: `"${args[0]}".`,
				election: game.general.electionCount,
				title: game.general.name,
				uid: game.general.uid,
				gameType: game.general.casualGame ? 'Casual' : game.general.practiceGame ? 'Practice' : 'Ranked'
			},
			game,
			'ping'
		);
	} else {
		sendMessage(game, user, `You can't ping mods for another ${(game.lastModPing + 180000 - Date.now()) / 1000} seconds.`);
	}
};

module.exports.commands.getCommand('ping').run = (socket, passport, user, game, args) => {
	const player = game.publicPlayersState.find(player => player.userName === passport.user);
	const seat = parseInt(args[0]);

	if (seat <= game.publicPlayersState.length && (!player.pingTime || Date.now() - player.pingTime > 180000)) {
		try {
			const affectedPlayerIndex = seat - 1;
			const affectedSocketId = Object.keys(io.sockets.sockets).find(
				socketId =>
					io.sockets.sockets[socketId].handshake.session.passport &&
					io.sockets.sockets[socketId].handshake.session.passport.user === game.publicPlayersState[affectedPlayerIndex].userName
			);

			player.pingTime = Date.now();
			if (!io.sockets.sockets[affectedSocketId]) {
				return;
			}
			io.sockets.sockets[affectedSocketId].emit(
				'pingPlayer',
				game.general.blindMode || game.general.playerChats === 'disabled'
					? 'Secret Hitler IO: A player has pinged you.'
					: `Secret Hitler IO: Player ${user.userName} just pinged you.`
			);

			if (game.general.playerChats === 'disabled') {
				game.private.seatedPlayers
					.find(x => x.userName === player.userName)
					.gameChats.push({
						timestamp: new Date(),
						gameChat: true,
						chat: [
							{
								text: `${game.publicPlayersState[affectedPlayerIndex].userName} (${affectedPlayerIndex + 1})`,
								type: 'player'
							},
							{ text: ' has been successfully pinged.' }
						]
					});
				game.private.hiddenInfoChat.push({
					timestamp: new Date(),
					gameChat: true,
					chat: [{ text: `${player.userName} has pinged ${game.publicPlayersState[affectedPlayerIndex].userName}.` }]
				});
			} else {
				game.chats.push({
					gameChat: true,
					userName: passport.user,
					timestamp: new Date(),
					chat: [
						{
							text: game.general.blindMode
								? `A player has pinged player number ${affectedPlayerIndex + 1}.`
								: `${passport.user} has pinged ${game.publicPlayersState[affectedPlayerIndex].userName} (${affectedPlayerIndex + 1}).`
						}
					],
					previousSeasonAward: user.previousSeasonAward,
					uid: game.uid,
					inProgress: game.gameState.isStarted
				});
			}
		} catch (e) {
			console.log(e, 'caught exception in ping chat');
		}
	} else {
		sendMessage(game, user, 'Unable to ping that user right now');
	}
};

module.exports.commands.getCommand('forcerigdeck').run = (socket, passport, user, game, args) => {
	const changedChat = [
		{
			text: 'An AEM member has changed the deck to '
		}
	];

	for (let card of args[0]) {
		card = card.toUpperCase();
		if (card === 'R' || card === 'B') {
			changedChat.push({
				text: card,
				type: `${card === 'R' ? 'fascist' : 'liberal'}`
			});
		}
	}

	changedChat.push({
		text: '.'
	});

	game.chats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: changedChat
	});
};

module.exports.commands.getCommand('forcevote').run = (socket, passport, user, game, args) => {
	if (game.general.isRemade) {
		socket.emit('sendAlert', 'This game has been remade.');
		return;
	}

	const { blindMode, replacementNames } = game.general;

	const affectedPlayerIndex = parseInt(args[0]) - 1;
	const voteString = args[1].toLowerCase();
	if (game.private && game.private.seatedPlayers) {
		const affectedPlayer = game.private.seatedPlayers[affectedPlayerIndex];
		if (!affectedPlayer) {
			sendMessage(game, user, `There is no seat {${affectedPlayerIndex + 1}}.`);
			return;
		}
		const vote = ['ya', 'ja', 'jah', 'yes', 'true'].includes(voteString);

		if (affectedPlayer.voteStatus.hasVoted) {
			sendMessage(
				game,
				user,
				`${affectedPlayer.userName} {${affectedPlayerIndex + 1}} has already voted.\nThey were voting: ${
					affectedPlayer.voteStatus.didVoteYes ? 'ja' : 'nein'
				}\nYou have set them to vote: ${vote ? 'ja' : 'nein'}
				`
			);
		}

		game.chats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: 'An AEM member has forced '
				},
				{
					text: blindMode
						? `${replacementNames[affectedPlayerIndex]} {${affectedPlayerIndex + 1}} `
						: `${affectedPlayer.userName} {${affectedPlayerIndex + 1}}`,
					type: 'player'
				},
				{
					text: ' to vote.'
				}
			]
		});

		const modOnlyChat = {
			timestamp: new Date(),
			gameChat: true,
			chat: [
				{
					text: `${passport.user}`,
					type: 'player'
				},
				{
					text: ' has forced '
				},
				{
					text: `${affectedPlayer.userName} {${affectedPlayerIndex + 1}}`,
					type: 'player'
				},
				{
					text: ' to vote '
				},
				{
					text: `${vote ? 'ja' : 'nein'}`,
					type: 'player'
				},
				{
					text: ', '
				},
				{
					text: `${affectedPlayer.userName}`,
					type: 'player'
				},
				{
					text: `${affectedPlayer.voteStatus.hasVoted ? ' had originally voted ' : ' had not voted.'}`
				},
				{
					text: `${affectedPlayer.voteStatus.hasVoted ? (affectedPlayer.voteStatus.didVoteYes ? ' ja' : ' nein') : ''}`,
					type: 'player'
				}
			]
		};
		game.private.hiddenInfoChat.push(modOnlyChat);

		selectVoting({ user: affectedPlayer.userName }, game, { vote }, null, true);
	}
};

module.exports.commands.getCommand('forceskip').run = (socket, passport, user, game, args) => {
	const { blindMode, replacementNames } = game.general;

	if (game.general.isRemade) {
		socket.emit('sendAlert', 'This game has been remade.');
		return;
	}

	const affectedPlayerIndex = args[0] !== undefined ? parseInt(args[0]) - 1 : game.gameState.presidentIndex;
	const affectedPlayer = game.private.seatedPlayers[affectedPlayerIndex];
	if (!affectedPlayer) {
		sendMessage(game, user, `There is no seat ${affectedPlayerIndex + 1}.`);
		return;
	}
	if (affectedPlayerIndex !== game.gameState.presidentIndex) {
		sendMessage(game, user, `The player in seat ${affectedPlayerIndex + 1} is not president.`);
		return;
	}
	let chancellor = -1;
	const currentPlayers = [];
	for (let i = 0; i < game.private.seatedPlayers.length; i++) {
		currentPlayers[i] = !(
			game.private.seatedPlayers[i].isDead ||
			(i === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5) ||
			i === game.gameState.previousElectedGovernment[1]
		);
	}
	currentPlayers[affectedPlayerIndex] = false;
	let counter = affectedPlayerIndex + 1;
	while (chancellor === -1) {
		if (counter >= currentPlayers.length) {
			counter = 0;
		}
		if (currentPlayers[counter]) {
			chancellor = counter;
		}
		counter++;
	}

	game.chats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{
				text: 'An AEM member has force skipped the government with '
			},
			{
				text: blindMode ? `${replacementNames[affectedPlayerIndex]} {${affectedPlayerIndex + 1}} ` : `${affectedPlayer.userName} {${affectedPlayerIndex + 1}}`,
				type: 'player'
			},
			{
				text: ' as president.'
			}
		]
	});
	selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellor }, true);
	setTimeout(() => {
		for (const p of game.private.seatedPlayers.filter(player => !player.isDead)) {
			selectVoting({ user: p.userName }, game, { vote: false }, null, true);
		}
	}, 1000);
};

module.exports.commands.getCommand('forcepick').run = (socket, passport, user, game, args) => {
	const { blindMode, replacementNames } = game.general;

	if (game.general.isRemade) {
		socket.emit('sendAlert', 'This game has been remade.');
		return;
	}
	const affectedPlayerNumber = args[0] !== undefined ? parseInt(args[0]) - 1 : game.gameState.presidentIndex;
	const chancellorPick = parseInt(args[1]);

	if (game && game.private && game.private.seatedPlayers) {
		const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
		const affectedChancellor = game.private.seatedPlayers[chancellorPick - 1];
		if (!affectedPlayer) {
			sendMessage(game, user, `There is no seat ${affectedPlayerNumber + 1}.`);
			return;
		}
		if (!affectedChancellor) {
			sendMessage(game, user, `There is no seat ${chancellorPick}.`);
			return;
		}
		if (affectedPlayerNumber !== game.gameState.presidentIndex) {
			sendMessage(game, user, `The player in seat ${affectedPlayerNumber + 1} is not president.`);
			return;
		}
		if (
			game.publicPlayersState[chancellorPick - 1].isDead ||
			chancellorPick - 1 === affectedPlayerNumber ||
			chancellorPick - 1 === game.gameState.previousElectedGovernment[1] ||
			(chancellorPick - 1 === game.gameState.previousElectedGovernment[0] && game.general.livingPlayerCount > 5)
		) {
			sendMessage(game, user, `The player in seat ${chancellorPick} is not a valid chancellor. (Dead or TL)`);
			return;
		}

		game.chats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: [
				{
					text: 'An AEM member has forced '
				},
				{
					text: blindMode
						? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
						: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
					type: 'player'
				},
				{
					text: ' to pick '
				},
				{
					text: blindMode ? `${replacementNames[chancellorPick - 1]} {${chancellorPick}} ` : `${affectedChancellor.userName} {${chancellorPick}}`,
					type: 'player'
				},
				{
					text: ' as chancellor.'
				}
			]
		});
		selectChancellor(null, { user: affectedPlayer.userName }, game, { chancellorIndex: chancellorPick - 1 }, true);
	}
};

module.exports.commands.getCommand('forceping').run = (socket, passport, user, game, args) => {
	const { blindMode, replacementNames } = game.general;

	if (game.general.isRemade) {
		socket.emit('sendAlert', 'This game has been remade.');
		return;
	}

	const affectedPlayerNumber = parseInt(args[0]) - 1;
	const affectedPlayer = game.private.seatedPlayers[affectedPlayerNumber];
	if (!affectedPlayer) {
		sendMessage(game, user, `There is no seat ${affectedPlayerNumber + 1}.`);
		return;
	}

	game.chats.push({
		gameChat: true,
		timestamp: new Date(),
		chat: [
			{
				text: 'An AEM member has pinged '
			},
			{
				text: blindMode
					? `${replacementNames[affectedPlayerNumber]} {${affectedPlayerNumber + 1}} `
					: `${affectedPlayer.userName} {${affectedPlayerNumber + 1}}`,
				type: 'player'
			},
			{
				text: '.'
			}
		]
	});

	try {
		const affectedSocketId = Object.keys(io.sockets.sockets).find(
			socketId =>
				io.sockets.sockets[socketId].handshake.session.passport &&
				io.sockets.sockets[socketId].handshake.session.passport.user === game.publicPlayersState[affectedPlayerNumber].userName
		);
		if (!io.sockets.sockets[affectedSocketId]) {
			sendMessage(game, user, 'Unable to send ping.');
			return;
		}
		io.sockets.sockets[affectedSocketId].emit('pingPlayer', 'Secret Hitler IO: A moderator has pinged you.');
	} catch (e) {
		console.log(e, 'caught exception in ping chat');
	}
};

module.exports.commands.getCommand('forcerigrole').run = (socket, passport, user, game, args) => {
	if (game && game.private) {
		const seat = parseInt(args[0], 10);
		const role = (r => {
			if (['f', 'fas', 'fascist'].includes(r)) {
				return 'fascist';
			} else if (['l', 'lib', 'liberal'].includes(r)) {
				return 'liberal';
			} else {
				return 'hitler';
			}
		})(args[1]);

		if (seat >= game.publicPlayersState.length + 1 || seat === 0) {
			sendMessage(game, user, `There is no seat ${seat}.`);
			return;
		}

		const changedChat = [
			{
				text: 'An AEM member has changed the role of player '
			}
		];

		changedChat.push({
			text: `${game.publicPlayersState[seat - 1].userName} (${seat})`,
			type: 'player'
		});

		changedChat.push({
			text: ' to '
		});

		changedChat.push({
			text: role,
			type: role
		});

		changedChat.push({
			text: '.'
		});

		game.chats.push({
			gameChat: true,
			timestamp: new Date(),
			chat: changedChat
		});
	}
};
