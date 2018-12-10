const passport = require('passport');
const Account = require('../models/account');
const Profile = require('../models/profile/index');
const BannedIP = require('../models/bannedIP');
const EightEightCounter = require('../models/eightEightCounter');
const { accountCreationDisabled, verifyBypass, consumeBypass, testIP } = require('./socket/models');
const { verifyRoutes, setVerify } = require('./verification');
const blacklistedWords = require('../iso/blacklistwords');
const bannedEmails = require('../utils/disposibleEmails');
const { expandAndSimplify } = require('./socket/ip-obf');
const { TOU_CHANGES } = require('../src/frontend-scripts/constants.js');
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

const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

module.exports = () => {
	verifyRoutes();

	app.get('/account', ensureAuthenticated, (req, res) => {
		res.render('page-account', {
			isLocal: req.user.isLocal,
			username: req.user.username,
			verified: req.user.verified,
			email: req.user.verification ? req.user.verification.email : '',
			discordUsername: req.user.discordUsername,
			discordDiscriminator: req.user.discordDiscriminator
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
		const { username, password, password2, email, isPrivate, bypassKey } = req.body;
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
		const signupIP = expandAndSimplify(
			req.headers['x-real-ip'] || req.headers['X-Real-IP'] || req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
		);
		const save = {
			username,
			isLocal: true,
			gameSettings: {
				disablePopups: false,
				enableTimestamps: false,
				disableRightSidebarInGame: false,
				enableDarkTheme: false,
				soundStatus: 'Pack2',
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
			signupIP
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
		} else if (accountCreationDisabled.status && !hasBypass) {
			res.status(403).json({
				message:
					'Creating new accounts is temporarily disabled most likely due to a spam/bot/griefing attack.  If you need an exception, please contact our moderators on discord.'
			});
		} else {
			let doesContainBadWord = false;

			blacklistedWords.forEach(word => {
				if (new RegExp(word, 'i').test(username)) {
					doesContainBadWord = true;
				}
			});

			if (email && !emailRegex.test(email)) {
				res.status(401).json({
					message: `That doesn't look like a valid email address.`
				});
			} else if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
				res.status(401).json({
					message: 'Only non-disposible email providers are allowed to create verified accounts.'
				});
			} else if (doesContainBadWord) {
				res.status(401).json({
					message: 'Your username contains a naughty word or part of a naughty word.'
				});
			} else {
				const queryObj = email
					? { $or: [{ username: new RegExp(`\\b${username}\\b`, 'i') }, { 'verification.email': email }] }
					: { username: new RegExp(`\\b${username}\\b`, 'i') };

				Account.find(queryObj, (err, accounts) => {
					if (err) {
						return next(err);
					}

					if (accounts.length && process.env.NODE_ENV === 'production') {
						const usernames = accounts.map(acc => acc.username.toLowerCase());

						if (usernames.includes(username.toLowerCase())) {
							res.status(401).json({ message: 'That account already exists.' });
						} else {
							res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
						}
						return next();
					}

					testIP(signupIP, banType => {
						if (hasBypass && banType == 'new') banType = null;
						if (banType) {
							if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
							else if (banType == 'small' || banType == 'tiny') {
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
							Account.register(new Account(save), password, err => {
								if (err) {
									return next();
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

									newPlayerBan.save(() => {
										res.send();
									});
								});
							});
						}
					});
				});
			}
		}
	});

	app.post(
		'/account/signin',
		(req, res, next) => {
			testIP(
				expandAndSimplify(
					req.headers['x-real-ip'] ||
						req.headers['X-Real-IP'] ||
						req.headers['X-Forwarded-For'] ||
						req.headers['x-forwarded-for'] ||
						req.connection.remoteAddress
				),
				banType => {
					if (banType && banType != 'new') {
						if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
						else if (banType == 'small' || banType == 'tiny') {
							res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
						} else {
							console.log(`Unhandled IP ban type: ${banType}`);
							res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
						}
					} else return next();
				}
			);
		},
		passport.authenticate('local'),
		(req, res, next) => {
			Account.findOne({
				username: req.user.username
			}).then(player => {
				if (player.isBanned) {
					res.status(403).json({
						message: 'You can not access this service.  If you believe this is in error, contact the moderators.'
						// TODO: include the reason moderators provided for the account ban, if it exists
					});
					return next();
				}

				let ip =
					req.headers['x-real-ip'] ||
					req.headers['X-Real-IP'] ||
					req.headers['X-Forwarded-For'] ||
					req.headers['x-forwarded-for'] ||
					req.connection.remoteAddress;

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
					(player.isTimeout && new Date().getTime() - new Date(player.isTimeout).getTime() < 64800000) ||
					(player.isTimeout6Hour && new Date().getTime() - new Date(player.isTimeout6Hour).getTime() < 21600000)
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

	app.get('/discord/login-callback', (req, res, next) => {
		passport.authenticate('discord', profile => {
			if (!profile) {
				return next();
			}

			// if user is signed in already, associate the discord account with their sh account
			if (req.user) {
				req.user.discordUsername = profile.username;
				req.user.discordDiscriminator = profile.discriminator;
				req.user.discordMfa_enabled = profile.mfa_enabled;
				req.user.verified = true;
				req.user.save(() => {
					res.redirect('/account');
				});
			} else {
				// see if their discord information matches an account, if so sign them in
				Account.findOne({ discordUsername: profile.username, discordDiscriminator: profile.discriminator })
					.then(account => {
						if (account) {
							req.logIn(account, () => res.redirect('/account'));
						} else {
							// see if there's an existing sh account with their discord name, if so have them select a new username, if not make an account.
							Account.findOne({ username: profile.username })
								.then(account => {
									if (/88$/i.test(profile.username)) {
										const new88 = new EightEightCounter({
											date: new Date(),
											username
										});
										new88.save(() => {
											req.session.discordProfile = profile;
											res.redirect('/discord-select-username');
										});
									} else if (
										!/^[a-z0-9]+$/i.test(profile.username) ||
										!profile.username ||
										profile.username.length < 3 ||
										profile.username.length > 12 ||
										accountCreationDisabled.status
									) {
										req.session.discordProfile = profile;
										res.redirect('/discord-select-username');
									}

									if (!account) {
										const ip = expandAndSimplify(
											req.headers['x-real-ip'] ||
												req.headers['X-Real-IP'] ||
												req.headers['X-Forwarded-For'] ||
												req.headers['x-forwarded-for'] ||
												req.connection.remoteAddress
										);

										Account.register(
											new Account({
												username: profile.username,
												gameSettings: {
													soundStatus: 'Pack2'
												},
												verified: true,
												wins: 0,
												losses: 0,
												created: new Date(),
												touLastAgreed: TOU_CHANGES[0].changeVer,
												signupIP: ip,
												discordUsername: profile.username,
												discordDiscriminator: profile.discriminator,
												discordMfa_enabled: profile.mfa_enabled,
												verification: {
													email: profile.email
												},
												lastConnectedIP: ip
											}),
											Math.random()
												.toString(36)
												.substring(2),
											(err, account) => {
												if (err) {
													console.log(err, 'err in creating discord account');
													return next();
												}

												passport.authenticate('discord')(req, res, () => {
													const newPlayerBan = new BannedIP({
														bannedDate: new Date(),
														type: 'new',
														ip
													});

													newPlayerBan.save(() => {
														req.logIn(account, () => res.redirect('/account'));
													});
												});
											}
										);
									} else {
										req.session.discordProfile = profile;
										res.redirect('/discord-select-username');
									}
								})
								.catch(err => {
									console.log(err, 'err in discord oauth');
								});
						}
					})
					.catch(err => {
						console.log(err, 'err in discord oauth');
					});
			}
		})(req, res, next);
	});

	app.get('/discord-select-username', (req, res, next) => {
		if (!req.session.discordProfile) {
			return next();
		}

		res.render('page-new-username');
	});

	app.post('/discord-select-username', (req, res, next) => {
		const { username } = req.body;
		const { discordProfile } = req.session;

		if (
			!req.session.discordProfile ||
			!username ||
			!/^[a-z0-9]+$/i.test(username) ||
			username.length < 3 ||
			username.length > 12 ||
			accountCreationDisabled.status
		) {
			res.status(401).send();
			return;
		}

		const ip = expandAndSimplify(
			req.headers['x-real-ip'] || req.headers['X-Real-IP'] || req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
		);

		Account.create(
			{
				username,
				gameSettings: {
					soundStatus: 'Pack2'
				},
				verified: true,
				wins: 0,
				losses: 0,
				created: new Date(),
				touLastAgreed: TOU_CHANGES[0].changeVer,
				signupIP: ip,
				discordUsername: discordProfile.username,
				discordDiscriminator: discordProfile.discriminator,
				discordMfa_enabled: discordProfile.mfa_enabled,
				verification: {
					email: discordProfile.email
				},
				lastConnectedIP: ip
			},
			(err, acc) => {
				if (err) {
					return next();
				}

				req.session.discordProfile = null;
				req.logIn(acc, () => res.redirect('/account'));
			}
		);
	});

	app.get('/revoke-discord', ensureAuthenticated, (req, res) => {
		req.user.discordUsername = req.user.discordDiscriminator = '';
		req.user.save(() => {
			res.redirect('/account');
		});
	});
};
