// const http = require('http');
// const express = require('express');
// const app = express();
// const server = http.createServer(app);
// const io = require('socket.io')(server);
// const redisAdapter = require('socket.io-redis');
// io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

const ipc = require('node-ipc');

ipc.config.id = 'cache';
// ipc.config.logger = null;
ipc.config.logDepth = 0;

const games = {};
const gameList = {};
const generalChats = {
	list: []
};
// let throttledLastGameListSentTime = Date.now();
/**
 * @param {string} socketId - user socket reference.
 * @param {boolean} isAEM - user AEM designation
 */
const sendGameList = async (socketId, isAEM) => {
	// const now = Date.now();

	// if (!socketId && now - throttledLastGameListSentTime < 2000) {
	// 	return;
	// }
	if (!socketId) {
		return;
	}

	const formattedGameList = Object.keys(games).reduce((curr, acc) => {
		if (isAEM || !games[curr].isUnlisted) {
			acc.push({
				name: game.general.name,
				flag: game.general.flag,
				userNames: game.publicPlayersState.map(val => val.userName),
				customCardback: game.publicPlayersState.map(val => val.customCardback),
				customCardbackUid: game.publicPlayersState.map(val => val.customCardbackUid),
				gameStatus: game.gameState.isCompleted ? game.gameState.isCompleted : game.gameState.isTracksFlipped ? 'isStarted' : 'notStarted',
				seatedCount: game.publicPlayersState.length,
				gameCreatorName: game.general.gameCreatorName,
				minPlayersCount: game.general.minPlayersCount,
				maxPlayersCount: game.general.maxPlayersCount || game.general.minPlayersCount,
				excludedPlayerCount: game.general.excludedPlayerCount,
				casualGame: game.general.casualGame || undefined,
				eloMinimum: game.general.eloMinimum || undefined,
				isVerifiedOnly: game.general.isVerifiedOnly || undefined,
				isTourny: game.general.isTourny || undefined,
				timedMode: game.general.timedMode || undefined,
				flappyMode: game.general.flappyMode || undefined,
				flappyOnlyMode: game.general.flappyOnlyMode || undefined,
				tournyStatus: game.general.isTourny && game.general.tournyInfo.queuedPlayers && game.general.tournyInfo.queuedPlayers.length,
				experiencedMode: game.general.experiencedMode || undefined,
				disableChat: game.general.disableChat || undefined,
				disableGamechat: game.general.disableGamechat || undefined,
				blindMode: game.general.blindMode || undefined,
				enactedLiberalPolicyCount: game.trackState.liberalPolicyCount,
				enactedFascistPolicyCount: game.trackState.fascistPolicyCount,
				electionCount: game.general.electionCount,
				rebalance6p: game.general.rebalance6p || undefined,
				rebalance7p: game.general.rebalance7p || undefined,
				rebalance9p: game.general.rerebalance9p || undefined,
				privateOnly: game.general.privateOnly || undefined,
				private: game.general.private || undefined,
				uid: game.general.uid,
				rainbowgame: game.general.rainbowgame || undefined,
				isCustomGame: game.customGameSettings.enabled,
				isUnlisted: game.general.unlisted || undefined
			});
		}

		return acc;
	});

	// redis todo isaem in leavegame is undef
	if (socketId) {
		// socket.emit(
		// 	'gameList',
		// 	formattedGameList.filter((game) => isAEM || (game && !game.isUnlisted))
		// );
	} else {
		io.to('gameListInfoSubscription').emit('gameList', formattedGameList);
		// throttledLastGameListSentTime = now;
	}
};

const ipcInit = () => {
	ipc.server.on('getGeneralChats', (data, socket) => {
		ipc.server.emit(socket, 'cachedGeneralChats', generalChats);
	});

	ipc.server.on('addGeneralChat', (data, socket) => {
		generalChats.list.push(data);
		ipc.server.emit(socket, 'cachedGeneralChats', generalChats);
	});

	// ipc.server.on('addNewGame', (uid, game) => {
	// 	games[uid] = game;
	// 	sendGameList();
	// });

	// ipc.server.on('getGame', (uid, socket) => {
	// 	console.log('Hello, World!');
	// 	ipc.server.emit(socket, 'receiveGame', games[uid]);
	// });
};

ipc.serve(ipcInit);
ipc.server.start();
