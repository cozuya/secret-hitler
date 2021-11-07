const { sendInProgressGameUpdate } = require('../util.js');
/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {object} data - from socket emit.
 * @return {bool} - Success of adding claim
 */
module.exports.handleAddNewClaim = (socket, passport, game, data) => {
	const playerIndex = game.publicPlayersState.findIndex(player => player.userName === passport.user);

	if (
		game &&
		game.private &&
		game.private.seatedPlayers &&
		game.private.seatedPlayers[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex] &&
		!/^(wasPresident|wasChancellor|didSinglePolicyPeek|didPolicyPeek|didInvestigateLoyalty)$/.exec(
			game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim
		)
	) {
		return;
	}

	if (!game.private || !game.private.summary || game.publicPlayersState[playerIndex].isDead) {
		return;
	}
	const { blindMode, replacementNames } = game.general;

	const chat = (() => {
		let text;
		let validClaim = false;

		switch (data.claim) {
			case 'wasPresident':
				switch (data.claimState) {
					case 'rrr':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: ['fascist', 'fascist', 'fascist']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rrb':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: ['fascist', 'fascist', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rbb':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: ['fascist', 'liberal', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'bbb':
						game.private.summary = game.private.summary.updateLog(
							{
								presidentClaim: ['liberal', 'liberal', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
				}
				if (validClaim) {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'claims '
						},
						{
							claim: data.claimState
						},
						{
							text: '.'
						}
					];
					return text;
				}
				return;

			case 'wasChancellor':
				switch (data.claimState) {
					case 'rr':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: ['fascist', 'fascist']
							},
							{ chancellorId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rb':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: ['fascist', 'liberal']
							},
							{ chancellorId: playerIndex }
						);
						validClaim = true;
						break;
					case 'bb':
						game.private.summary = game.private.summary.updateLog(
							{
								chancellorClaim: ['liberal', 'liberal']
							},
							{ chancellorId: playerIndex }
						);
						validClaim = true;
						break;
				}

				if (validClaim) {
					text = [
						{
							text: 'Chancellor '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'claims '
						},
						{
							claim: data.claimState
						},
						{
							text: '.'
						}
					];
					return text;
				}
				return;
			case 'didSinglePolicyPeek':
				if (data.claimState === 'liberal' || data.claimState === 'fascist') {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: ' claims to have peeked at a '
						},
						{
							text: data.claimState,
							type: data.claimState
						},
						{
							text: ' policy.'
						}
					];
					return text;
				}
			case 'didPolicyPeek':
				switch (data.claimState) {
					case 'rrr':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['fascist', 'fascist', 'fascist']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rbr':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['fascist', 'liberal', 'fascist']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'brr':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['liberal', 'fascist', 'fascist']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rrb':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['fascist', 'fascist', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'rbb':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['fascist', 'liberal', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'bbr':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['liberal', 'liberal', 'fascist']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'brb':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['liberal', 'fascist', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
					case 'bbb':
						game.private.summary = game.private.summary.updateLog(
							{
								policyPeekClaim: ['liberal', 'liberal', 'liberal']
							},
							{ presidentId: playerIndex }
						);
						validClaim = true;
						break;
				}
				if (validClaim) {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'claims to have peeked at '
						},
						{
							claim: data.claimState
						},
						{
							text: '.'
						}
					];
					return text;
				}
				return;
			case 'didInvestigateLoyalty':
				const { invIndex } = game.private;
				if (invIndex != -1 && invIndex < game.private.seatedPlayers.length) {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'sees the party membership of '
						},
						{
							text: blindMode
								? `${replacementNames[invIndex]} {${invIndex + 1}} `
								: `${game.private.seatedPlayers[invIndex] && game.private.seatedPlayers[invIndex].userName} {${invIndex + 1}} `,
							type: 'player'
						},
						{
							text: 'and claims to see a member of the '
						}
					];
				} else {
					text = [
						{
							text: 'President '
						},
						{
							text: blindMode ? `${replacementNames[playerIndex]} {${playerIndex + 1}} ` : `${passport.user} {${playerIndex + 1}} `,
							type: 'player'
						},
						{
							text: ' claims to see a member of the '
						}
					];
				}

				game.private.summary = game.private.summary.updateLog(
					{
						investigationClaim: data.claimState
					},
					{ investigatorId: playerIndex }
				);

				switch (data.claimState) {
					case 'fascist':
						text.push(
							{
								text: 'fascist ',
								type: 'fascist'
							},
							{
								text: 'team.'
							}
						);

						return text;
					case 'liberal':
						text.push(
							{
								text: 'liberal ',
								type: 'liberal'
							},
							{
								text: 'team.'
							}
						);
						return text;
				}
		}
	})();

	if (
		Number.isInteger(playerIndex) &&
		game.private.seatedPlayers[playerIndex] &&
		game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim !== ''
	) {
		const claimChat = {
			chat: chat,
			isClaim: true,
			timestamp: new Date(),
			uid: game.general.uid,
			userName: passport.user,
			claim: data.claim,
			claimState: data.claimState
		};
		if (claimChat && claimChat.chat) {
			if (game.private.seatedPlayers[playerIndex]) game.private.seatedPlayers[playerIndex].playersState[playerIndex].claim = '';
			game.chats.push(claimChat);
			socket.emit('removeClaim');
			sendInProgressGameUpdate(game);
			return true;
		}
		return false;
	}
};
