const { games, limitNewPlayers } = require('../models');
const Account = require('../../../models/account');
const { updateUserStatus, sendGameList } = require('../user-requests');
const { sendCommandChatsUpdate } = require('../util');
const { checkStartConditions } = require('./leave-game'); // this used to be a separate game-countdown.js but that isn't really helpful tbh
const { userInBlacklist } = require('../../../utils');

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
const updateSeatedUser = (socket, passport, data) => {
	// Authentication Assured in routes.js
	// In-game Assured in routes.js
	const game = games[data?.uid];

	if (!data?.uid) {
		console.log('BAD DATA');
		console.log(data);
		console.log(socket);
		console.log(passport);
	}
	// prevents race condition between 1) taking a seat and 2) the game starting

	if (!game || !game.gameState || game.gameState.isTracksFlipped) {
		return; // Game already started
	}

	const isBlacklistSafe = !game.private.gameCreatorBlacklist || !userInBlacklist(passport.user, game.private.gameCreatorBlacklist); // we can check blacklist before hitting mongo

	if (!isBlacklistSafe) {
		socket.emit('gameJoinStatusUpdate', {
			status: 'blacklisted'
		});
		return;
	}

	Account.findOne({ username: passport.user }).then(account => {
		const isNotMaxedOut = game.publicPlayersState.length < game.general.maxPlayersCount;
		const isNotInGame = !game.publicPlayersState.find(player => player.userName === passport.user);
		const isRainbowSafe = !game.general.rainbowgame || (game.general.rainbowgame && account.isRainbowOverall);
		const isPrivateSafe =
			!game.general.private ||
			(game.general.private && (data.password === game.private.privatePassword || game.general.whitelistedPlayers.includes(passport.user)));
		const isMeetingEloMinimum = !game.general.eloMinimum || game.general.eloMinimum <= account.eloSeason || game.general.eloMinimum <= account.eloOverall;
		const isMeetingXPMinimum = !game.general.xpMinimum || game.general.xpMinimum <= account.xpOverall;

		if (account.wins + account.losses < 3 && limitNewPlayers.status && !game.general.private) {
			return;
		}

		if (isNotMaxedOut && isNotInGame && isRainbowSafe && isPrivateSafe && isBlacklistSafe && isMeetingEloMinimum && isMeetingXPMinimum) {
			const { publicPlayersState } = game;
			const player = {
				userName: passport.user,
				connected: true,
				isDead: false,
				customCardback: account.gameSettings.customCardback,
				customCardbackUid: account.gameSettings.customCardbackUid,
				isPrivate: account.gameSettings.isPrivate,
				tournyWins: account.gameSettings.tournyWins,
				previousSeasonAward: account.gameSettings.previousSeasonAward,
				specialTournamentStatus: account.gameSettings.specialTournamentStatus,
				staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
				staffDisableVisibleXP: account.gameSettings.staffDisableVisibleXP,
				staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {}
				}
			};

			if (game.general.isTourny) {
				if (
					game.general.tournyInfo.queuedPlayers.map(player => player.userName).includes(player.userName) ||
					game.general.tournyInfo.queuedPlayers.length >= game.general.maxPlayersCount
				) {
					return;
				}
				game.general.tournyInfo.queuedPlayers.push(player);
				game.chats.push({
					timestamp: new Date(),
					gameChat: true,
					chat: [
						{
							text: `${passport.user}`,
							type: 'player'
						},
						{
							text: ` (${game.general.tournyInfo.queuedPlayers.length}/${game.general.maxPlayersCount}) has entered the tournament queue.`
						}
					]
				});
			} else {
				publicPlayersState.unshift(player);
			}

			socket.emit('updateSeatForUser', true);
			checkStartConditions(game);
			updateUserStatus(passport, game);
			sendCommandChatsUpdate(game);
			sendGameList();
		}
	});
};

module.exports.updateSeatedUser = updateSeatedUser;
