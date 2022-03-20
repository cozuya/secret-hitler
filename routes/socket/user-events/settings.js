const Account = require('../../../models/account');
const { userList, currentSeasonNumber } = require('../models');
const { sendUserList, sendUserGameSettings } = require('../user-requests');

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedTheme = (socket, passport, data) => {
	const fields = ['primaryColor', 'secondaryColor', 'tertiaryColor', 'backgroundColor', 'textColor'];

	Account.findOne({ username: passport && passport.user }).then(account => {
		if (!account) {
			return;
		}

		for (const field of fields) {
			if (data[field]) account[field] = data[field];
		}

		account.save();
	});
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedPlayerPronouns = (socket, passport, data) => {
	// Authentication is assured in routes.js
	Account.findOne({ username: passport.user }).then(account => {
		account.gameSettings.playerPronouns = data.playerPronouns;
		account.save();
		const userListUser = userList.find(user => user.userName === passport.user);
		if (userListUser) userListUser.playerPronouns = data.playerPronouns;
		sendUserList();
		sendUserGameSettings(socket);
	});
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedGameSettings = (socket, passport, data) => {
	// Authentication Assured in routes.js

	Account.findOne({ username: passport.user })
		.then(account => {
			const currentPrivate = account.gameSettings.isPrivate;
			const userIdx = userList.findIndex(user => user.userName === passport.user);
			const aem = account.staffRole && (account.staffRole === 'moderator' || account.staffRole === 'editor' || account.staffRole === 'admin');
			const veteran = account.staffRole && account.staffRole === 'veteran';
			for (const setting in data) {
				if (setting == 'blacklist') {
					data[setting].splice(0, data[setting].length - 30);
				}

				const restrictedSettings = [
					'blacklist',
					'staffDisableVisibleElo',
					'staffDisableVisibleXP',
					'staffDisableStaffColor',
					'staffIncognito',
					'newReport',
					'previousSeasonAward',
					'specialTournamentStatus',
					'ignoreIPBans',
					'tournyWins',
					'__proto__',
					'prototype',
					'constructor'
				];

				if (
					!restrictedSettings.includes(setting) ||
					(setting === 'blacklist' && data[setting].length <= 30) ||
					(setting === 'staffDisableVisibleElo' && (aem || veteran)) ||
					(setting === 'staffDisableVisibleXP' && (aem || veteran)) ||
					(setting === 'staffIncognito' && aem) ||
					(setting === 'staffDisableStaffColor' && (aem || veteran))
				) {
					account.gameSettings[setting] = data[setting];
				}

				if (setting === 'staffIncognito' && aem) {
					const userListInfo = {
						userName: passport.user,
						playerPronouns: account.gameSettings.playerPronouns,
						staffRole: account.staffRole || '',
						isContributor: account.isContributor || false,
						staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
						staffDisableVisibleXP: account.gameSettings.staffDisableVisibleXP,
						staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
						staffIncognito: account.gameSettings.staffIncognito,
						wins: account.wins,
						losses: account.losses,
						rainbowWins: account.rainbowWins,
						rainbowLosses: account.rainbowLosses,
						isRainbowOverall: account.isRainbowOverall,
						isRainbowSeason: account.isRainbowSeason,
						isPrivate: account.gameSettings.isPrivate,
						tournyWins: account.gameSettings.tournyWins,
						blacklist: account.gameSettings.blacklist,
						customCardback: account.gameSettings.customCardback,
						customCardbackUid: account.gameSettings.customCardbackUid,
						previousSeasonAward: account.gameSettings.previousSeasonAward,
						specialTournamentStatus: account.gameSettings.specialTournamentStatus,
						eloOverall: account.eloOverall,
						xpOverall: account.xpOverall,
						eloSeason: account.eloSeason,
						xpSeason: account.xpSeason,
						status: {
							type: 'none',
							gameId: null
						}
					};

					userListInfo[`winsSeason${currentSeasonNumber}`] = account[`winsSeason${currentSeasonNumber}`];
					userListInfo[`lossesSeason${currentSeasonNumber}`] = account[`lossesSeason${currentSeasonNumber}`];
					userListInfo[`rainbowWinsSeason${currentSeasonNumber}`] = account[`rainbowWinsSeason${currentSeasonNumber}`];
					userListInfo[`rainbowLossesSeason${currentSeasonNumber}`] = account[`rainbowLossesSeason${currentSeasonNumber}`];
					if (userIdx !== -1) userList.splice(userIdx, 1);
					userList.push(userListInfo);
					sendUserList();
				}
			}

			const user = userList.find(u => u.userName === passport.user);
			if (user) user.blacklist = account.gameSettings.blacklist;

			if (
				((data.isPrivate && !currentPrivate) || (!data.isPrivate && currentPrivate)) &&
				(!account.gameSettings.privateToggleTime || account.gameSettings.privateToggleTime < Date.now() - 64800000)
			) {
				account.gameSettings.privateToggleTime = Date.now();
				account.save(() => {
					socket.emit('manualDisconnection');
				});
			} else {
				account.gameSettings.isPrivate = currentPrivate;
				account.save(() => {
					socket.emit('gameSettings', account.gameSettings);
				});
			}
		})
		.catch(err => {
			console.log(err);
		});
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedBio = (socket, passport, data) => {
	// Authentication Assured in routes.js
	if (typeof data !== 'string') return; // otherwise the server will crash if you forge the request
	Account.findOne({ username: passport.user }).then(account => {
		account.bio = data;
		account.save();
	});
};
