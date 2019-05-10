const passport = require('passport');
const Account = require('../models/account');
const Profile = require('../models/profile/index');
const BannedIP = require('../models/bannedIP');
const Signups = require('../models/signups');
const https = require('https');
const EightEightCounter = require('../models/eightEightCounter');
const { accountCreationDisabled, verifyBypass, consumeBypass, testIP } = require('./socket/models');
const { verifyRoutes, setVerify } = require('./verification');
const blacklistedWords = require('../iso/blacklistwords');
const bannedEmails = require('../utils/disposibleEmails');
const { expandAndSimplify, obfIP } = require('./socket/ip-obf');
const { TOU_CHANGES } = require('../src/frontend-scripts/node-constants.js');
const prodCacheBustToken = require('./prodCacheBustToken');

/**
 * @param {object} req - express request object.
 * @param {object} res - express response object.
 * @param {function} next - express middleware function.
 * @return {function} returns next() if user is authenticated.
 */
const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
};
const VPNCache = {};
let torIps;
const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const renderPage = (req, res, pageName, varName) => {
	const renderObj = {};

	renderObj[varName] = true;

	if (req.user) {
		renderObj.username = req.user.username;
	}

	if (process.env.NODE_ENV === 'production') {
		renderObj.prodCacheBustToken = prodCacheBustToken.prodCacheBustToken;
	}

	res.render(pageName, renderObj);
};

const checkIP = config => {
	const { res, username, email, signupIP, hasBypass, next } = config;
	if (accountCreationDisabled.status && !hasBypass) {
		const creationDisabledSignup = new Signups({
			date: new Date(),
			userName: username,
			type: 'Failed - ACD',
			ip: obfIP(signupIP),
			email: Boolean(email),
			unobfuscatedIP: signupIP
		});
		creationDisabledSignup.save(() => {
			res.status(403).json({
				message:
					'Creating new accounts is temporarily disabled most likely due to a spam/bot/griefing attack.  If you need an exception, please contact our moderators on discord.'
			});
		});
	} else if (torIps.includes(signupIP)) {
		const torSignup = new Signups({
			date: new Date(),
			userName: username,
			type: 'Failed - TOR',
			ip: obfIP(signupIP),
			email: config.isOAuth ? `${config.type} ${config.profile.username}#${config.profile.discriminator}` : Boolean(email),
			unobfuscatedIP: signupIP
		});
		torSignup.save(() => {
			res.status(403).json({
				message: 'Use of TOR is not allowed on this site.'
			});
		});
	} else if (VPNCache[signupIP]) {
		vpnScore = VPNCache[signupIP];
		next(config);
	} else {
		try {
			https.get(
				`https://check.getipintel.net/check.php?ip=${signupIP}&contact=${process.env.GETIPINTELAPIEMAIL}&flags=f&format=json`,
				vpnRes => {
					let vpnScore = 0;
					vpnRes.on('data', score => {
						vpnScore = parseFloat(JSON.parse(score.toString('utf8')).result);
					});

					vpnRes.on('end', () => {
						if (vpnScore < 0) {
							res.status(501).json({ message: 'There was an error processing your request. Please contact our moderators on Discord.' });
							console.log('Error in Get IP Intel, score given: ', vpnScore);
							return;
						}
						config.vpnScore = VPNCache[signupIP] = vpnScore;
						next(config);
					});
				}
			);
		} catch (error) {
			res.status(503).json({ message: 'There was an error processing your request. Please try again later.' });
			console.log('Error in Get IP Intel', error);
		}
	}
};

const continueSignup = config => {
	const { req, res, username, password, email, signupIP, save, hasBypass, vpnScore, bypassKey, isOAuth, type, profile } = config;
	BannedIP.find({
		type: ['fragbanSmall', 'fragbanLarge'],
		ip: [
			new RegExp(
				`^${signupIP
					.split('.')
					.slice(0, 2)
					.join('.')}$`
			),
			new RegExp(
				`^${signupIP
					.split('.')
					.slice(0, 3)
					.join('.')}$`
			)
		]
	}).then(bans => {
		if (bans.some(ban => new Date() < ban.bannedDate) && !hasBypass) {
			const fragSignup = new Signups({
				date: new Date(),
				userName: username,
				type: 'Failed - FragBanned',
				ip: obfIP(signupIP),
				email: isOAuth ? `${type} ${profile.username}#${profile.discriminator}` : Boolean(email),
				unobfuscatedIP: signupIP
			});
			fragSignup.save(() => {
				res.status(401).json({
					message:
						'Creating new accounts is temporarily disabled most likely due to a spam/bot/griefing attack.  If you need an exception, please contact our moderators on Discord.'
				});
			});
		} else {
			testIP(signupIP, banType => {
				if (hasBypass && banType == 'new') banType = null;
				if (banType) {
					if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
					else if (banType == 'small' || banType == 'tiny') {
						res.status(403).json({
							message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.'
						});
					} else if (banType == 'new') {
						res.status(403).json({
							message: 'You can only make accounts once per day.  If you need an exception to this rule, contact the moderators on our discord channel.'
						});
					} else {
						console.log(`Unhandled IP ban type: ${banType}`);
						res.status(403).json({
							message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.'
						});
					}
				} else if (vpnScore >= 0.95 && !hasBypass) {
					const vpnSignup = new Signups({
						date: new Date(),
						userName: username,
						type: 'Failed - VPN',
						ip: obfIP(signupIP),
						email: isOAuth ? `${type} ${profile.username}#${profile.discriminator}` : Boolean(email),
						unobfuscatedIP: signupIP
					});
					vpnSignup.save(() => {
						res.status(403).json({
							message: 'Use of a VPN is currently not allowed on this site. Contact the moderators on Discord for an exception.'
						});
					});
				} else {
					if (isOAuth) {
						const accountObj = {
							username: username,
							gameSettings: {
								soundStatus: 'pack2',
								disableTyping: true
							},
							verified: true,
							wins: 0,
							losses: 0,
							created: new Date(),
							touLastAgreed: TOU_CHANGES[0].changeVer,
							signupIP: signupIP,
							hasNotDismissedSignupModal: true,
							verification: {
								email: type === 'discord' ? profile.email : profile._json.email
							},
							lastConnectedIP: signupIP
						};

						if (type === 'discord') {
							accountObj.discordDiscriminator = profile.discriminator;
							accountObj.discordMfa_enabled = profile.mfa_enabled;
							accountObj.discordUsername = profile.username;
						} else {
							accountObj.githubUsername = profile.username;
							accountObj.github2FA = profile._json.two_factor_authentication;
							accountObj.bio = profile._json.bio;
						}

						const oauthSignup = new Signups({
							date: new Date(),
							userName: username,
							type,
							ip: obfIP(signupIP),
							email: `${profile.username}#${profile.discriminator}`,
							unobfuscatedIP: signupIP
						});

						oauthSignup.save();

						Account.register(
							new Account(accountObj),
							Math.random()
								.toString(36)
								.substring(2),
							(err, account) => {
								if (err) {
									console.log(err, 'err in creating oauth account');
									return next();
								} else {
									passport.authenticate(type)(req, res, () => {
										const newPlayerBan = new BannedIP({
											bannedDate: new Date(),
											type: 'new',
											signupIP
										});

										newPlayerBan.save(() => req.login(account, () => res.redirect('/account')));
									});
								}
							}
						);
					} else {
						Account.register(new Account(save), password, err => {
							if (err) {
								console.log(err);
								res.status(500).json({ message: err.toString() });
								return;
							}
							if (hasBypass) consumeBypass(bypassKey, username, signupIP);
							if (email) {
								setVerify({ username, email });
							}
							passport.authenticate('local')(req, res, () => {
								const newPlayerBan = new BannedIP({
									bannedDate: new Date(),
									type: 'new',
									ip: signupIP
								});
								newPlayerBan.save();
								if (!save.gameSettings.isPrivate) {
									const newSignup = new Signups({
										date: new Date(),
										userName: username,
										type: 'local',
										ip: obfIP(signupIP),
										email: Boolean(email),
										unobfuscatedIP: signupIP
									});
									newSignup.save(() => {
										res.send();
									});
								} else {
									const privSignup = new Signups({
										date: new Date(),
										userName: username,
										type: 'private',
										ip: obfIP(signupIP),
										email: Boolean(email),
										unobfuscatedIP: signupIP
									});

									privSignup.save(() => {
										res.send();
									});
								}
							});
						});
					}
				}
			});
		}
	});
};

module.exports = torIpsParam => {
	verifyRoutes();
	torIps = torIpsParam;

	app.get('/account', ensureAuthenticated, (req, res) => {
		res.render('page-account', {
			isLocal: req.user.isLocal,
			username: req.user.username,
			verified: req.user.verified,
			email: req.user.verification ? req.user.verification.email : '',
			discordUsername: req.user.discordUsername,
			discordDiscriminator: req.user.discordDiscriminator,
			githubUsername: req.user.githubUsername
		});
	});

	app.post('/account/change-password', ensureAuthenticated, (req, res, next) => {
		const { newPassword, newPasswordConfirm } = req.body;
		const { user } = req;

		if (newPassword !== newPasswordConfirm) {
			res.status(401).json({ message: 'not equal' });
		} else if (newPassword.length > 255 || newPassword.length < 7) {
			res.status(400);
		} else {
			user.setPassword(newPassword, () => {
				user.save();
				res.send();
			});
		}
	});

	app.post('/account/delete-account', passport.authenticate('local'), (req, res) => {
		Account.deleteOne({ username: req.user.username }).then(() => {
			Profile.deleteOne({ _id: req.user.username }).then(() => {
				res.send();
			});
		});
	});

	app.post('/account/reset-password', (req, res, next) => {
		if (!req.body.email) {
			return next();
		}

		Account.findOne({
			'verification.email': req.body.email
		})
			.then(account => {
				if (!account) {
					res.status(401).json({ message: 'There is no verified account associated with that email.' });
				} else {
					setVerify({ username: account.username, email: req.body.email, res, isResetPassword: true });
				}
			})
			.catch(err => console.log(err, 'account err'));
	});

	app.post('/account/signup', (req, res, next) => {
		const { username, password, password2, email, isPrivate } = req.body;
		let { bypassKey, bypass } = req.body;
		bypassKey = bypass || bypassKey;
		let hasBypass = false;
		if (bypassKey) {
			bypassKey = bypassKey.trim();
			if (bypassKey.length) {
				if (!verifyBypass(bypassKey)) {
					res.status(401).json({ message: 'Restriction bypass key invalid, leave that field empty if it is not needed.' });
					return;
				}
				hasBypass = true;
			}
		}
		const signupIP = req.expandedIP;
		const save = {
			username,
			isLocal: true,
			hasNotDismissedSignupModal: true,
			gameSettings: {
				soundStatus: 'pack2',
				disableTyping: true,
				isPrivate
			},
			verification: {
				email: email || ''
			},
			verified: false,
			games: [],
			wins: 0,
			losses: 0,
			created: new Date(),
			touLastAgreed: TOU_CHANGES[0].changeVer,
			signupIP,
			lastConnectedIP: signupIP
		};

		if (!/^[a-z0-9]+$/i.test(username)) {
			res.status(401).json({ message: 'Your username can only be alphanumeric.' });
		} else if (username.length < 3) {
			res.status(401).json({ message: 'Your username is too short.' });
		} else if (username.length > 12) {
			res.status(401).json({ message: 'Your username is too long.' });
		} else if (password.length < 6) {
			res.status(401).json({ message: 'Your password is too short.' });
		} else if (password.length > 255) {
			res.status(401).json({ message: 'Your password is too long.' });
		} else if (password !== password2) {
			res.status(401).json({ message: 'Your passwords did not match.' });
		} else if (email && !emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
		} else if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
			res.status(401).json({
				message: 'Only non-disposable email providers are allowed to create verified accounts.'
			});
		} else if (blacklistedWords.some(word => new RegExp(word, 'i').test(username))) {
			res.status(401).json({
				message: 'Your username contains a naughty word or part of a naughty word.'
			});
		} else if (/88$/i.test(username)) {
			const new88 = new EightEightCounter({
				date: new Date(),
				username
			});
			new88.save(() => {
				res.status(401).json({
					message: 'Usernames that end with 88 are not allowed.'
				});
			});
		} else {
			const continueSignupConfig = { req, res, username, password, email, signupIP, save, hasBypass, bypassKey, next: continueSignup };
			const queryObj = email
				? { $or: [{ username: new RegExp(`\\b${username}\\b`, 'i') }, { 'verification.email': email }] }
				: { username: new RegExp(`\\b${username}\\b`, 'i') };
			Account.find(queryObj, (err, accounts) => {
				if (err) {
					console.log(err);
					res.status(500).json({ message: err.toString() });
					return;
				}
				if (accounts.length) {
					if (accounts.some(acc => acc.username.toLowerCase() === username.toLowerCase())) {
						res.status(401).json({ message: 'That account already exists.' });
						return;
					} else {
						res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
						return;
					}
				}

				checkIP(continueSignupConfig);
			});
		}
	});

	app.post(
		'/account/signin',
		(req, res, next) => {
			testIP(req.expandedIP, banType => {
				if (banType && banType != 'new') {
					if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
					else if (banType == 'small' || banType == 'tiny') {
						res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
					} else {
						console.log(`Unhandled IP ban type: ${banType}`);
						res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
					}
				} else return next();
			});
		},
		passport.authenticate('local'),
		(req, res, next) => {
			Account.findOne({
				username: req.user.username
			}).then(player => {
				if (!player) {
					res.status(403).json({
						message: 'There is no account with that username.'
					});
					return next();
				}
				if (player.isBanned) {
					res.status(403).json({
						message: 'You can not access this service.  If you believe this is in error, contact the moderators.'
						// TODO: include the reason moderators provided for the account ban, if it exists
					});
					return next();
				}

				if (torIps.includes(req.expandedIP)) {
					const torSignup = new Signups({
						date: new Date(),
						userName: req.user.username,
						type: 'Failed Login - TOR',
						ip: obfIP(req.expandedIP),
						email: '',
						unobfuscatedIP: req.expandedIP
					});

					torSignup.save();

					res.status(403).json({
						message: 'Use of TOR is not allowed on this site.'
					});

					return next();
				}

				let ip = req.expandedIP;

				try {
					ip = expandAndSimplify(ip);
				} catch (e) {
					console.log(e);
				}

				player.lastConnectedIP = ip;
				player.save(() => {
					res.send();
				});

				Profile.findOne({ _id: req.user.username })
					.then(profile => {
						if (profile) {
							profile.lastConnectedIP = ip;
							profile.save();
						}
					})
					.catch(err => {
						console.log(err, 'profile find err');
					});

				if (
					(player.isTimeout && Date.now() - new Date(player.isTimeout).getTime() < 64800000) ||
					(player.isTimeout6Hour && Date.now() - new Date(player.isTimeout6Hour).getTime() < 21600000)
				) {
					req.logOut();
					res.send();
				}
				const email = player.verification.email;
				if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1])) {
					player.verified = false;
					player.verification.email = '';
				}
			});
		}
	);

	app.post('/account/add-email', ensureAuthenticated, (req, res, next) => {
		const { email } = req.body;
		const { username } = req.user;

		if (!email) {
			return next();
		}

		if (email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
		} else if (!emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
		} else {
			Account.findOne({ 'verification.email': email }, (err, account) => {
				if (err) {
					return next();
				}

				if (account && process.env.NODE_ENV === 'production') {
					res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
				} else {
					Account.findOne({ username })
						.then(account => {
							account.verification.email = email;
							account.save(() => {
								setVerify({ username: req.user.username, email, res });
							});
						})
						.catch(err => {
							console.log(err, 'err in account in add email');
						});
				}
			});
		}
	});

	app.post('/account/change-email', ensureAuthenticated, (req, res, next) => {
		const { email } = req.body;
		const { verified, username } = req.user;

		if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
		} else if (email && !emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
		} else {
			Account.findOne({ 'verification.email': email }, (err, account) => {
				if (err) {
					return next();
				}

				if (account && process.env.NODE_ENV === 'production') {
					res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
				} else {
					Account.findOne({ username }, (err, account) => {
						if (err) {
							return next();
						}

						account.verification.email = email;
						account.save(() => {
							if (!verified) {
								setVerify({ username, email, res });
							} else {
								res.send();
							}
						});
					});
				}
			});
		}
	});

	app.post('/account/request-verification', ensureAuthenticated, (req, res, next) => {
		const { verification } = req.user;
		const { email } = verification;

		if (verification && email) {
			Account.findOne({ 'verification.email': email }, (err, account) => {
				if (err) {
					return next();
				}

				if (account && process.env.NODE_ENV === 'production') {
					res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
				} else {
					setVerify({ username: req.user.username, email, res });
				}
			});
		}
	});

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});

	app.get('/discord-login', passport.authenticate('discord'));

	app.get('/github-login', passport.authenticate('github', { scope: ['read:user', 'user:email'] }));

	const oAuthAuthentication = (req, res, next, type) => {
		const ip = req.expandedIP;
		testIP(ip, banType => {
			if (banType && banType !== 'new') {
				if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
				else if (banType == 'small' || banType == 'tiny') {
					res
						.status(403)
						.json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.' });
				} else {
					console.log(`Unhandled IP ban type: ${banType}`);
					res
						.status(403)
						.json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.' });
				}
			} else {
				passport.authenticate(type, profile => {
					if (!profile || !profile.username) {
						return next();
					}

					if (req.user) {
						if (type === 'discord') {
							req.user.discordUsername = profile.username;
							req.user.discordDiscriminator = profile.discriminator;
							req.user.discordMfa_enabled = profile.mfa_enabled;
						} else {
							req.user.githubUsername = profile.username;
							req.user.github2FA = profile.two_factor_authentication;
						}
						req.user.verified = true;
						req.user.save(() => {
							res.redirect('/account');
						});
					} else {
						// see if their oauth information matches an account, if so sign them in
						const queryObj =
							type === 'discord' ? { discordUsername: profile.username, discordDiscriminator: profile.discriminator } : { githubUsername: profile.username };

						Account.findOne(queryObj)
							.then(account => {
								if (account) {
									req.login(account, () => res.redirect('/account'));
								} else {
									// TODO: bypass option
									if (banType === 'new') {
										console.log(account, 'oath err 472: account');
										console.log(profile, 'oath err 473: profile');
										res.status(403).json({
											message:
												'You can only make accounts once per day.  If you feel you need an exception to this rule, contact the moderators on our discord server.'
										});
									} else if (accountCreationDisabled.status) {
										res.status(403).json({
											message:
												'Creating new accounts is temporarily disabled most likely due to a spam/bot/griefing attack.  If you need an exception, please contact our moderators on discord.'
										});
									} else {
										// see if there's an existing sh account with their oauth name, if so have them select a new username, if not make an account.

										Account.findOne({ username: profile.username })
											.then(account => {
												req.session.oauthType = type;
												if (account) {
													req.session.oauthProfile = profile;
													res.redirect('/oauth-select-username');
												} else if (/88$/i.test(profile.username)) {
													const new88 = new EightEightCounter({
														date: new Date(),
														username
													});
													new88.save(() => {
														req.session.oauthProfile = profile;
														res.redirect('/oauth-select-username');
													});
												} else if (
													!/^[a-z0-9]+$/i.test(profile.username) ||
													!profile.username ||
													profile.username.length < 3 ||
													profile.username.length > 12 ||
													accountCreationDisabled.status
												) {
													req.session.oauthProfile = profile;
													res.redirect('/oauth-select-username');
												} else {
													const continueSignupConfig = {
														req,
														res,
														username: profile.username,
														email: type === 'discord' ? profile.email : profile._json.email,
														signupIP: ip,
														next: continueSignup,
														isOAuth: true,
														type,
														profile
													};
													checkIP(continueSignupConfig);
												}
											})
											.catch(err => {
												console.log(err, 'err in oauth1');
											});
									}
								}
							})
							.catch(err => {
								console.log(err, 'err in oauth2');
							});
					}
				})(req, res, next);
			}
		});
	};

	app.get('/github/login-callback', (req, res, next) => {
		oAuthAuthentication(req, res, next, 'github');
	});

	app.get('/discord/login-callback', (req, res, next) => {
		oAuthAuthentication(req, res, next, 'discord');
	});

	app.get('/oauth-select-username', (req, res, next) => {
		if (!req.session.oauthProfile) {
			return next();
		}

		res.render('page-new-username');
	});

	app.post('/oauth-select-username', (req, res, next) => {
		const { username } = req.body;
		const { oauthProfile, oauthType } = req.session;

		if (
			!req.session.oauthProfile ||
			!username ||
			!/^[a-z0-9]+$/i.test(username) ||
			username.length < 3 ||
			username.length > 12 ||
			accountCreationDisabled.status
		) {
			res.status(401).send();
			return;
		}
		const ip = req.expandedIP;
		testIP(ip, banType => {
			if (banType) {
				if (banType == 'new') {
					res.status(403).json({
						message: 'You can only make accounts once per day. If you feel you need an exception to this rule, contact the moderators on our discord server.'
					});
				} else if (banType == 'nocache') {
					res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
				} else if (banType == 'small' || banType == 'tiny') {
					res
						.status(403)
						.json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.' });
				} else if (banType == 'new') {
					res.status(403).json({
						message: 'You can only make accounts once per day.  If you need an exception to this rule, contact the moderators on our discord channel.'
					});
				} else {
					console.log(`Unhandled IP ban type: ${banType}`);
					res
						.status(403)
						.json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.' });
				}
			} else {
				const continueSignupConfig = {
					req,
					res,
					username,
					email: oauthType === 'discord' ? oauthProfile.email : oauthProfile._json.email,
					signupIP: ip,
					next: continueSignup,
					isOAuth: true,
					type: oauthType,
					profile: oauthProfile
				};
				checkIP(continueSignupConfig);
			}
		});
	});

	app.get('/revoke-discord', ensureAuthenticated, (req, res) => {
		req.user.discordUsername = req.user.discordDiscriminator = '';
		req.user.save(() => {
			res.redirect('/account');
		});
	});

	app.get('/revoke-github', ensureAuthenticated, (req, res) => {
		req.user.githubUsername = '';
		req.user.github2FA = false;
		req.user.save(() => {
			res.redirect('/account');
		});
	});

	app.get('*', (req, res) => {
		renderPage(req, res, '404', '404');
	});
};
