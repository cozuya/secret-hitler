const { obfIP } = require('../ip-obf');
const Account = require('../../../models/account');
const {
	newStaff,
	userList,
	generalChats,
	games,
	createNewBypass,
	userListEmitter,
	accountCreationDisabled,
	bypassVPNCheck,
	ipbansNotEnforced,
	gameCreationDisabled,
	limitNewPlayers,
	currentSeasonNumber
} = require('../models');
const PlayerReport = require('../../../models/playerReport');
const { sendUserReports, getModInfo, sendGameList, sendUserList } = require('../user-requests');
const ModAction = require('../../../models/modAction');
const BannedIP = require('../../../models/bannedIP');
const { handleDefaultIPv6Range } = require('../util.js');
const { completeGame, saveAndDeleteGame } = require('../game/end-game');
const Profile = require('../../../models/profile/index');
const fs = require('fs');
const https = require('https');
const { sendCommandChatsUpdate } = require('../util');
const { removeBadge, checkBadgesAccount } = require('../badges');
let lagTest = [];

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 * @param {boolean} skipCheck - true if there was an account lookup to find the IP
 * @param {array} modUserNames - list of usernames that are mods
 * @param {array} superModUserNames - list of usernames that are editors and admins
 */
module.exports.handleModerationAction = (socket, passport, data, skipCheck, modUserNames, superModUserNames) => {
	if (data.userName) {
		data.userName = data.userName.trim();
	}

	if (!skipCheck && !data.isReportResolveChange) {
		if (!data.ip || data.ip === '') {
			if (data.userName && data.userName !== '') {
				if (data.userName.startsWith('-')) {
					try {
						data.ip = obfIP(data.userName.substring(1));
					} catch (e) {
						data.ip = '';
						console.log(e);
					}
				} else {
					// Try to find the IP from the account specified if possible.
					Account.findOne({ username: data.userName }, (err, account) => {
						if (err) console.log(err, 'err finding user');
						else if (account) data.ip = account.lastConnectedIP || account.signupIP;
						module.exports.handleModerationAction(socket, passport, data, true, modUserNames, superModUserNames);
					});
					return;
				}
			}
		} else {
			if (data.ip.startsWith('-')) {
				try {
					data.ip = obfIP(data.ip.substring(1));
				} catch (e) {
					data.ip = '';
					console.log(e);
				}
			} else {
				// Should never happen, so pass it back in with no IP.
				data.ip = '';
				module.exports.handleModerationAction(socket, passport, data, false, modUserNames, superModUserNames); // Note: Check is not skipped here, we want to still check the username.
				return;
			}
		}
	}

	if (
		(!data.ip || data.ip === '') &&
		(data.action === 'timeOut' ||
			data.action === 'ipban' ||
			data.action === 'getIP' ||
			data.action === 'clearTimeoutIP' ||
			data.action === 'clearTimeoutAndTimeoutIP')
	) {
		// Failed to get a relevant IP, abort the action since it needs one.
		socket.emit('sendAlert', 'That action requires a valid IP.');
		return;
	}

	const isSuperMod = superModUserNames.includes(passport.user) || newStaff.editorUserNames.includes(passport.user);

	const affectedSocketId = Object.keys(io.sockets.sockets).find(
		socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
	);

	if (
		modUserNames.includes(passport.user) ||
		superModUserNames.includes(passport.user) ||
		newStaff.modUserNames.includes(passport.user) ||
		newStaff.editorUserNames.includes(passport.user) ||
		newStaff.trialmodUserNames.includes(passport.user)
	) {
		if (data.isReportResolveChange) {
			PlayerReport.findOne({ _id: data._id })
				.then(report => {
					if (report) {
						report.isActive = !report.isActive;
						report.save(() => {
							sendUserReports(socket);
						});
					}
				})
				.catch(err => {
					console.log(err, 'err in finding player report');
				});
		} else if (data.action === 'getFilteredData') {
			return;
			let queryObj;

			if (data.comment && (data.comment.split('.').length > 1 || data.comment.split(':').length > 1)) {
				queryObj = {
					ip: new RegExp(`^${obfIP(data.comment.substring(1))}`)
				};
			} else {
				queryObj = {
					userActedOn: data.comment
				};
			}
			const userNames = userList.map(user => user.userName);

			Account.find({ username: userNames, 'gameSettings.isPrivate': { $ne: true } })
				.then(users => {
					getModInfo(users, socket, queryObj);
				})
				.catch(err => {
					console.log(err, 'err in sending mod info');
				});
		} else {
			const modaction = new ModAction({
				date: new Date(),
				modUserName: passport.user,
				userActedOn: data.userName,
				modNotes: data.comment,
				ip: data.ip,
				actionTaken: typeof data.action === 'string' ? data.action : data.action.type
			});

			/**
			 * @param {string} username - name of user.
			 */
			const logOutUser = username => {
				const bannedUserlistIndex = userList.findIndex(user => user.userName === username);

				if (io.sockets.sockets[affectedSocketId]) {
					io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
					io.sockets.sockets[affectedSocketId].disconnect();
				}

				if (bannedUserlistIndex >= 0) {
					userList.splice(bannedUserlistIndex, 1);
				}

				// destroySession(username);
			};

			/**
			 * @param {string} username - name of user.
			 */
			const banAccount = username => {
				Account.findOne({ username })
					.then(account => {
						if (account) {
							// account.hash = crypto.randomBytes(20).toString('hex');
							// account.salt = crypto.randomBytes(20).toString('hex');
							account.isBanned = true;
							account.save(() => {
								const bannedAccountGeneralChats = generalChats.list.filter(chat => chat.userName === username);

								bannedAccountGeneralChats.reverse().forEach(chat => {
									generalChats.list.splice(generalChats.list.indexOf(chat), 1);
								});
								logOutUser(username);
								io.sockets.emit('generalChats', generalChats);
							});
						}
					})
					.catch(err => {
						console.log(err, 'ban user err');
					});
			};

			switch (data.action) {
				case 'lagMeter':
					lagTest.push(Date.now() - data.frontEndTime);

					if (lagTest.length === 5) {
						socket.emit('lagTestResults', (lagTest.reduce((acc, curr) => acc + curr, 0) / 5).toFixed(2));
						lagTest = [];
					}
					return;
				case 'clearTimeout':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date(0);
								account.isBanned = false;
								account.save();
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'clearTimeout user err');
						});
					break;
				case 'warn':
					const warning = {
						time: new Date(),
						text: data.comment,
						moderator: passport.user,
						acknowledged: false
					};

					Account.findOne({ username: data.userName }).then(user => {
						if (user) {
							if (user.warnings && user.warnings.length > 0) {
								user.warnings.push(warning);
							} else {
								user.warnings = [warning];
							}
							user.save(() => {
								if (io.sockets.sockets[affectedSocketId]) {
									io.sockets.sockets[affectedSocketId].emit('checkRestrictions');
								}
							});
						} else {
							socket.emit('sendAlert', `That user doesn't exist`);
							return;
						}
					});
					break;
				case 'removeWarning':
					Account.findOne({ username: data.userName }).then(user => {
						if (user) {
							if (user.warnings && user.warnings.length > 0) {
								socket.emit('sendAlert', `Warning with the message: "${user.warnings.pop().text}" deleted.`);
							} else {
								socket.emit('sendAlert', `That user doesn't have any warnings.`);
								return;
							}
							user.markModified('warnings');
							user.save(() => {
								if (io.sockets.sockets[affectedSocketId]) {
									io.sockets.sockets[affectedSocketId].emit('checkRestrictions');
								}
							});
						} else {
							socket.emit('sendAlert', `That user doesn't exist`);
							return;
						}
					});
					break;
				case 'clearTimeoutIP':
					BannedIP.deleteMany({ ip: handleDefaultIPv6Range(data.ip), type: { $in: ['tiny', 'small'] }, permanent: { $ne: true } }, (err, res) => {
						if (err) socket.emit('sendAlert', `IP clear failed:\n${err}`);
					});
					console.log(handleDefaultIPv6Range(data.ip));
					break;
				case 'clearTimeoutAndTimeoutIP':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date(0);
								account.isBanned = false;
								account.save();
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}

							BannedIP.deleteMany({ ip: handleDefaultIPv6Range(data.ip), type: { $in: ['tiny', 'small'] }, permanent: { $ne: true } }, (err, res) => {
								if (err) socket.emit('sendAlert', `IP clear failed:\n${err}`);
							});
						})
						.catch(err => {
							console.log(err, 'clearTimeout user err');
						});
					break;
				case 'modEndGame':
					const gameToEnd = games[data.uid];

					if (gameToEnd && gameToEnd.private && gameToEnd.private.seatedPlayers) {
						for (const player of gameToEnd.private.seatedPlayers) {
							if (data.modName === player.userName) {
								socket.emit('sendAlert', 'You cannot end a game whilst playing in it.');
								return;
							}
						}
					}

					if (gameToEnd && gameToEnd.private && gameToEnd.private.seatedPlayers) {
						gameToEnd.chats.push({
							userName: data.modName,
							chat: 'This game has been ended by a moderator, game deletes in 5 seconds.',
							isBroadcast: true,
							timestamp: new Date()
						});
						completeGame(gameToEnd, data.winningTeamName);
						setTimeout(() => {
							gameToEnd.publicPlayersState.forEach(player => (player.leftGame = true));
							saveAndDeleteGame(gameToEnd.general.uid);
							sendGameList();
						}, 5000);
					}
					break;
				case 'setVerified':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.verified = true;
							account.verification.email = account.username + '@verified.secrethitler.io';
							account.save();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;
				case 'makeBypass':
					const key = createNewBypass();
					if (modaction.modNotes.length) modaction.modNotes += '\n';
					modaction.modNotes += `Created bypass key: ${key}`;
					socket.emit('sendAlert', `Created bypass key: ${key}`);
					break;
				case 'getIP':
					if (isSuperMod) {
						console.log(data, 'd');
						socket.emit('sendAlert', `Requested IP: ${data.ip}`);
					} else {
						socket.emit('sendAlert', 'Only editors and admins can request a raw IP.');
						return;
					}
					break;
				case 'rainbowUser':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isRainbowOverall = true;
									account.dateRainbowOverall = new Date();
									account.save();
									logOutUser(data.userName);
								} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							})
							.catch(err => {
								console.log(err, 'rainbow user error');
							});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can rainbow a user.');
						return;
					}
					break;
				case 'deleteUser':
					if (isSuperMod) {
						// let account, profile;
						Account.findOne({ username: data.userName }).then(acc => {
							account = acc;
							acc.delete();
							Profile.findOne({ _id: data.userName }).then(prof => {
								if (!prof) return;
								profile = prof;
								prof.delete();
							});
						});
						// TODO: Add Account and Profile Backups (for accidental deletions)
					} else {
						socket.emit('sendAlert', 'Only editors and admins can delete users.');
						return;
					}
					break;
				case 'renameUser':
					if (isSuperMod) {
						let success = false;
						Account.findOne({ username: data.comment }).then(account => {
							Profile.findOne({ _id: data.comment }).then(profile => {
								if (profile) {
									socket.emit('sendAlert', `Profile of ${data.comment} already exists`);
									// TODO: Add Profile Backup (for accidental/bugged renames)
								} else {
									if (account) {
										socket.emit('sendAlert', `User ${data.comment} already exists`);
									} else {
										Account.findOne({ username: data.userName }).then(account => {
											if (io.sockets.sockets[affectedSocketId]) {
												io.sockets.sockets[affectedSocketId].emit('manualDisconnection');
											}
											if (account) {
												account.username = data.comment;
												account.save();
												success = true;
												logOutUser(data.userName);
											} else {
												socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
											}
											if (!success) {
												return;
											}
											success = false;
											Profile.findOne({ _id: data.userName }).then(profile => {
												if (profile) {
													const newProfile = JSON.parse(JSON.stringify(profile));
													newProfile._id = data.comment;
													const renamedProfile = new Profile(newProfile);
													renamedProfile.save();
												}
												Profile.remove({ _id: data.userName }, () => {
													success = true;
												});
											});

											fs.copyFile(`public/images/custom-cardbacks/${data.userName}.png`, `public/images/custom-cardbacks/${data.comment}.png`, () => {});
											fs.unlink(`public/images/custom-cardbacks/${data.userName}.png`, () => {});
										});
									}
								}
							});
						});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can rename users.');
						return;
					}
					break;
				case 'ban':
					banAccount(data.userName);
					break;
				case 'deleteBio':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.bio = '';
							account.save();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;
				case 'setPlayerPronouns':
					Account.findOne({ username: data.userName }).then(account => {
						if (account) {
							account.gameSettings.playerPronouns = data.comment;
							account.save();
							const userListUser = userList.find(user => user.userName === data.userName);
							if (userListUser) userListUser.playerPronouns = data.comment;
							sendUserList();
						} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
					});
					break;
				case 'logoutUser':
					logOutUser(data.username);
					break;
				case 'setSticky':
					generalChats.sticky = data.comment.trim().length ? `(${passport.user}) ${data.comment.trim()}` : '';
					io.sockets.emit('generalChats', generalChats);
					break;
				case 'broadcast':
					const discordBroadcastBody = JSON.stringify({
						content: `Text: ${data.comment}\nMod: ${passport.user}`
					});
					const discordBroadcastOptions = {
						hostname: 'discordapp.com',
						path: process.env.DISCORDBROADCASTURL,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Content-Length': Buffer.byteLength(discordBroadcastBody)
						}
					};
					try {
						const broadcastReq = https.request(discordBroadcastOptions);
						broadcastReq.end(discordBroadcastBody);
					} catch (e) {
						console.log(e, 'err in broadcast');
					}

					Object.keys(games).forEach(gameName => {
						games[gameName].chats.push({
							userName: `[BROADCAST] ${data.modName}`,
							chat: data.comment,
							isBroadcast: true,
							timestamp: new Date()
						});
					});

					generalChats.list.push({
						userName: `[BROADCAST] ${data.modName}`,
						time: new Date(),
						chat: data.comment,
						isBroadcast: true
					});

					if (data.isSticky) {
						generalChats.sticky = data.comment.trim().length ? `(${passport.user}) ${data.comment.trim()}` : '';
					}

					io.sockets.emit('generalChats', generalChats);
					break;
				case 'ipban':
					if (isSuperMod) {
						const ipban = new BannedIP({
							bannedDate: new Date(),
							type: 'small',
							ip: handleDefaultIPv6Range(data.ip),
							permanent: false
						});

						ipban.save(() => {
							Account.find({ lastConnectedIP: data.ip }, function(err, users) {
								if (users && users.length > 0) {
									users.forEach(user => {
										banAccount(user.username);
									});
								}
							});
						});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can perform IP bans.');
						return;
					}
					break;
				case 'fragbanSmall':
					if (isSuperMod) {
						const fragbans = new BannedIP({
							bannedDate: new Date(Date.now() + 64800000),
							type: 'fragbanSmall',
							ip: data.userName,
							permanent: false
						});
						modaction.ip = modaction.userActedOn;
						modaction.userActedOn = 'RAW IP FRAGMENT';
						fragbans.save();
					} else {
						socket.emit('sendAlert', 'Only editors and admins can perform fragment IP bans.');
						return;
					}
					break;
				case 'fragbanLarge':
					if (isSuperMod) {
						const fragbanl = new BannedIP({
							bannedDate: new Date(Date.now() + 604800000),
							type: 'fragbanLarge',
							ip: data.userName,
							permanent: false
						});
						modaction.ip = modaction.userActedOn;
						modaction.userActedOn = 'RAW IP FRAGMENT';
						fragbanl.save();
					} else {
						socket.emit('sendAlert', 'Only editors and admins can perform fragment IP bans.');
						return;
					}
					break;
				case 'timeOut':
					const timeout = new BannedIP({
						bannedDate: new Date(),
						type: 'small',
						ip: handleDefaultIPv6Range(data.ip),
						permanent: false
					});
					timeout.save(() => {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isTimeout = new Date(Date.now() + 18 * 60 * 60 * 1000);
									account.save(() => {
										logOutUser(data.userName);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err, 'timeout user err');
							});
					});
					break;
				case 'timeOut2':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date(Date.now() + 18 * 60 * 60 * 1000);
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'timeout2 user err');
						});
					break;
				case 'timeOut3':
					const timeout3 = new BannedIP({
						bannedDate: new Date(),
						type: 'tiny',
						ip: handleDefaultIPv6Range(data.ip)
					});
					timeout3.save(() => {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isTimeout = new Date(Date.now() + 60 * 60 * 1000);
									account.save(() => {
										logOutUser(data.userName);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err, 'timeout3 user err');
							});
					});
					break;
				case 'timeOut4':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.isTimeout = new Date(Date.now() + 6 * 60 * 60 * 1000);
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'timeout4 user err');
						});
					break;
				case 'togglePrivate':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								const { isPrivate } = account.gameSettings;

								account.gameSettings.isPrivate = !isPrivate;
								account.gameSettings.privateToggleTime = !isPrivate ? new Date('2099-01-01 00:00:00.000') : Date.now();
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'private convert user err');
						});
					break;
				case 'togglePrivateEighteen':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								const { isPrivate } = account.gameSettings;

								account.gameSettings.isPrivate = !isPrivate;
								account.gameSettings.privateToggleTime = Date.now();
								account.save(() => {
									logOutUser(data.userName);
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err, 'private convert user err');
						});
					break;
				case 'clearGenchat':
					if (data.userName && data.userName.length > 0) {
						generalChats.list = generalChats.list.filter(chat => chat.userName !== data.userName);

						// clearedGeneralChats.reverse().forEach(chat => {
						// 	generalChats.list.splice(generalChats.list.indexOf(chat), 1);
						// });
						io.sockets.emit('generalChats', generalChats);
					} else {
						generalChats.list = [];
						io.sockets.emit('generalChats', generalChats);
					}

					break;
				case 'deleteProfile':
					if (isSuperMod) {
						// TODO: Add Profile Backup (for accidental/bugged deletions)
						Profile.findOne({ _id: data.userName })
							.remove(() => {
								logOutUser(data.userName);
							})
							.catch(err => {
								console.log(err);
							});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can delete profiles.');
						return;
					}
					break;
				case 'ipbanlarge':
					const ipbanl = new BannedIP({
						bannedDate: new Date(),
						type: 'big',
						ip: handleDefaultIPv6Range(data.ip),
						permanent: false
					});

					if (isSuperMod) {
						ipbanl.save(() => {
							Account.find({ lastConnectedIP: data.ip }, function(err, users) {
								if (users && users.length > 0) {
									users.forEach(user => {
										banAccount(user.username);
									});
								}
							});
						});
					} else {
						socket.emit('sendAlert', 'Only editors and admins can perform large IP bans.');
						return;
					}
					break;
				case 'deleteCardback':
					Account.findOne({ username: data.userName })
						.then(account => {
							if (account) {
								account.gameSettings.customCardback = '';
								const user = userList.find(u => u.userName === data.userName);
								if (user) {
									user.customCardback = '';
									userListEmitter.send = true;
								}
								Object.keys(games).forEach(uid => {
									const game = games[uid];
									const foundUser = game.publicPlayersState.find(user => user.userName === data.userName);
									if (foundUser) {
										foundUser.customCardback = '';
										sendCommandChatsUpdate(game);
										sendGameList();
									}
								});
								account.save(() => {
									if (io.sockets.sockets[affectedSocketId]) {
										io.sockets.sockets[affectedSocketId].emit('gameSettings', account.gameSettings);
									}
								});
							} else {
								socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
							}
						})
						.catch(err => {
							console.log(err);
						});
					break;
				case 'disableAccountCreation':
					accountCreationDisabled.status = true;
					break;
				case 'enableAccountCreation':
					accountCreationDisabled.status = false;
					break;
				case 'disableVPNCheck':
					bypassVPNCheck.status = true;
					break;
				case 'enableVPNCheck':
					bypassVPNCheck.status = false;
					break;
				case 'disableIpbans':
					ipbansNotEnforced.status = true;
					break;
				case 'enableIpbans':
					ipbansNotEnforced.status = false;
					break;
				case 'disableGameCreation':
					gameCreationDisabled.status = true;
					break;
				case 'enableGameCreation':
					gameCreationDisabled.status = false;
					break;
				case 'enableLimitNewPlayers':
					limitNewPlayers.status = true;
					break;
				case 'disableLimitNewPlayers':
					limitNewPlayers.status = false;
					break;
				case 'removeContributor':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isContributor = false;
									removeBadge(account, 'contributor');
									account.save(() => {
										const idx = newStaff.contributorUserNames.indexOf(account.username);
										if (idx != -1) newStaff.contributorUserNames.splice(idx, 1);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'removeStaffRole':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									const staffRole = account.staffRole;
									if (staffRole === 'moderator' || staffRole === 'editor') {
										removeBadge(account, staffRole);
									}
									account.staffRole = '';
									account.save(() => {
										let idx = newStaff.modUserNames.indexOf(account.username);
										if (idx != -1) newStaff.modUserNames.splice(idx, 1);
										idx = newStaff.editorUserNames.indexOf(account.username);
										if (idx != -1) newStaff.editorUserNames.splice(idx, 1);
										idx = newStaff.trialmodUserNames.indexOf(account.username);
										if (idx != -1) newStaff.trialmodUserNames.splice(idx, 1);
										idx = newStaff.altmodUserNames.indexOf(account.username);
										if (idx != -1) newStaff.altmodUserNames.splice(idx, 1);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'toggleContributor':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isContributor = true;
									checkBadgesAccount(account);
									account.save(() => {
										newStaff.contributorUserNames.push(account.username);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'toggleTourneyMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.isTournamentMod = true;
									account.save(() => {
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToTrialMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'trialmod';
									account.save(() => {
										newStaff.trialmodUserNames.push(account.username);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToAltMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'altmod';
									account.save(() => {
										newStaff.altmodUserNames.push(account.username);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToMod':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'moderator';
									checkBadgesAccount(account);
									account.save(() => {
										newStaff.modUserNames.push(account.username);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToEditor':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'editor';
									checkBadgesAccount(account);
									account.save(() => {
										newStaff.editorUserNames.push(account.username);
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'promoteToVeteran':
					if (isSuperMod) {
						Account.findOne({ username: data.userName })
							.then(account => {
								if (account) {
									account.staffRole = 'veteran';
									checkBadgesAccount(account);
									account.save(() => {
										logOutUser(account.username);
									});
								} else {
									socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								}
							})
							.catch(err => {
								console.log(err);
							});
					}
					break;
				case 'regatherAEMList':
					if (!isSuperMod) {
						socket.emit('sendAlert', 'Only editors and admins can refresh the staff usernames list.');
						return;
					}
					break;
				case 'resetServer':
					if (isSuperMod) {
						console.log('server crashing manually via mod action');
						const crashReport = JSON.stringify({
							content: `${process.env.DISCORDADMINPING} the site was just reset manually by an admin.`
						});

						const crashOptions = {
							hostname: 'discordapp.com',
							path: process.env.DISCORDCRASHURL,
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Content-Length': Buffer.byteLength(crashReport)
							}
						};

						if (process.env.NODE_ENV === 'production') {
							const crashReq = https.request(crashOptions);

							crashReq.end(crashReport);
						}
						setTimeout(() => {
							crashServer();
						}, 1000);
					} else {
						socket.emit('sendAlert', 'Only editors and admins can restart the server.');
						return;
					}
					break;
				default:
					if (data.userName.substr(0, 7) === 'DELGAME') {
						const game = games[data.userName.slice(7)];

						if (game && game.general) {
							saveAndDeleteGame(game.general.uid);
							game.publicPlayersState.forEach(player => (player.leftGame = true)); // Causes timed games to stop.
							sendGameList();
						}
					} else if (data.userName.substr(0, 13) === 'RESETGAMENAME') {
						const game = games[data.userName.slice(13)];
						if (game && game.general) {
							if (modaction.modNotes.length > 0) {
								modaction.modNotes += ` - Name: "${game.general.name}" - Creator: "${game.private.gameCreatorName}"`;
							} else {
								modaction.modNotes = `Name: "${game.general.name}" - Creator: "${game.private.gameCreatorName}"`;
							}
							games[game.general.uid].general.name = 'New Game';
							sendGameList();
						}
					} else if (isSuperMod && data.action.type) {
						const setType = /setRWins/.test(data.action.type)
							? 'rainbowWins'
							: /setRLosses/.test(data.action.type)
							? 'rainbowLosses'
							: /setWins/.test(data.action.type)
							? 'wins'
							: 'losses';
						const number =
							setType === 'wins'
								? data.action.type.substr(7)
								: setType === 'losses'
								? data.action.type.substr(9)
								: setType === 'rainbowWins'
								? data.action.type.substr(8)
								: data.action.type.substr(10);
						const isPlusOrMinus = number.charAt(0) === '+' || number.charAt(0) === '-';

						if (!isNaN(parseInt(number, 10)) || isPlusOrMinus) {
							Account.findOne({ username: data.userName })
								.then(account => {
									if (account) {
										account[setType] = isPlusOrMinus
											? number.charAt(0) === '+'
												? account[setType] + parseInt(number.substr(1, number.length))
												: account[setType] - parseInt(number.substr(1, number.length))
											: parseInt(number);

										if (!data.action.isNonSeason) {
											account[`${setType}Season${currentSeasonNumber}`] = isPlusOrMinus
												? account[`${setType}Season${currentSeasonNumber}`]
													? number.charAt(0) === '+'
														? account[`${setType}Season${currentSeasonNumber}`] + parseInt(number.substr(1, number.length))
														: account[`${setType}Season${currentSeasonNumber}`] - parseInt(number.substr(1, number.length))
													: parseInt(number.substr(1, number.length))
												: parseInt(number);
										}
										account.save();
									} else socket.emit('sendAlert', `No account found with a matching username: ${data.userName}`);
								})
								.catch(err => {
									console.log(err, 'set wins/losses error');
								});
						}
					}
			}

			const niceAction = {
				comment: 'Comment',
				warn: 'Issue Warning',
				removeWarning: 'Delete Warning',
				getIP: 'Get IP',
				ban: 'Ban',
				setSticky: 'Set Sticky',
				ipbanlarge: '1 Week IP Ban',
				ipban: '18 Hour IP Ban',
				enableAccountCreation: 'Enable Account Creation',
				disableAccountCreation: 'Disable Account Creation',
				enableVPNCheck: 'Enable VPN Check',
				disableVPNCheck: 'Disable VPN Check',
				togglePrivate: 'Toggle Private (Permanent)',
				togglePrivateEighteen: 'Toggle Private (Temporary)',
				timeOut: 'Timeout and IP Timeout 18 Hours',
				timeOut2: 'Timeout 18 Hours',
				timeOut3: 'Timeout and IP Timeout 1 Hour',
				timeOut4: 'Timeout 6 Hours',
				clearTimeout: 'Clear Timeout',
				clearTimeoutIP: 'Clear IP Ban',
				clearTimeoutAndTimeoutIP: 'Clear Timeout and IP Timeout',
				modEndGame: 'End Game',
				deleteGame: 'Delete Game',
				enableIpBans: 'Enable IP Bans',
				disableIpBans: 'Disable IP Bans',
				disableGameCreation: 'Disable Game Creation',
				enableGameCreation: 'Enable Game Creation',
				disableIpbans: 'Disable IP Bans',
				enableIpbans: 'Enable IP Bans',
				broadcast: 'Broadcast',
				fragBanLarge: '1 Week Fragment Ban',
				fragBanSmall: '18 Hour Fragment Ban',
				clearGenchat: 'Clear General Chat',
				deleteUser: 'Delete User',
				deleteBio: 'Delete Bio',
				deleteProfile: 'Delete Profile',
				deleteCardback: 'Delete Cardback',
				setPlayerPronouns: 'Set Player Pronouns',
				resetGameName: 'Reset Game Name',
				rainbowUser: 'Grant Rainbow',
				removeStaffRole: 'Remove Staff Role',
				toggleContributor: 'Add/Remove Role (Contributor)',
				toggleTourneyMod: 'Add/Remove Role (Tourney Mod)',
				promoteToAltMod: 'Promote (Staff Alt)',
				promoteToTrialMod: 'Promote (Trial Mod)',
				promoteToVeteran: 'Promote (Veteran Staff)',
				promoteToMod: 'Promote (Mod)',
				promoteToEditor: 'Promote (Editor)',
				makeBypass: 'Create Bypass Key',
				bypassKeyUsed: 'Consume Bypass Key',
				resetServer: 'Server Restart',
				regatherAEMList: 'Refresh Staff List'
			};

			const modAction = JSON.stringify({
				content: `Date: *${new Date()}*\nStaff member: **${modaction.modUserName}**\nAction: **${niceAction[modaction.actionTaken] ||
					modaction.actionTaken}**\nUser: **${modaction.userActedOn} **\nComment: **${modaction.modNotes}**.`
			});

			const modOptions = {
				hostname: 'discordapp.com',
				path: process.env.DISCORDMODLOGURL,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(modAction)
				}
			};

			if (process.env.NODE_ENV === 'production') {
				try {
					const modReq = https.request(modOptions);

					modReq.end(modAction);
				} catch (error) {}
			}

			modaction.save();
		}
	}
};
