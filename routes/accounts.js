const passport = require('passport'),
	Account = require('../models/account'),
	BannedIP = require('../models/bannedIP'),
	{ ipbansNotEnforced, accountCreationDisabled } = require('./socket/models'),
	// verifyAccount = require('./verify-account'),
	// resetPassword = require('./reset-password'),
	blacklistedWords = require('../iso/blacklistwords'),
	{ torIps } = require('./socket/user-requests'),
	ensureAuthenticated = (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}
		res.redirect('/');
	};

module.exports = () => {
	// verifyAccount.setRoutes();
	// resetPassword.setRoutes();

	app.get('/account', ensureAuthenticated, (req, res) => {
		res.render('page-account', {
			username: req.user.username,
			verified: req.user.verified,
			email: req.user.verification.email
		});
	});

	app.post('/account/change-password', ensureAuthenticated, (req, res) => {
		const { newPassword, newPasswordConfirm } = req.body,
			{ user } = req;

		// todo-release prevent tiny/huge new passwords

		if (newPassword !== newPasswordConfirm) {
			res.status(401).json({ message: 'not equal' });
			return;
		}

		user.setPassword(newPassword, () => {
			user.save();
			res.send();
		});
	});

	// app.post('/account/change-email', ensureAuthenticated, (req, res) => {
	// 	const { newEmail, newEmailConfirm } = req.body,
	// 		{ user } = req;

	// 	if (newEmail !== newEmailConfirm) {
	// 		res.status(401).json({ message: 'not equal' });
	// 		return;
	// 	}

	// 	Account.findOne({ username: user.username }, (err, account) => {
	// 		if (err) {
	// 			console.log(err);
	// 		}

	// 		account.verification.email = newEmail;
	// 		account.save(() => {
	// 			res.send();
	// 		});
	// 	});
	// });

	// app.post('/account/request-verification', ensureAuthenticated, (req, res) => {
	// 	verifyAccount.sendToken(req.user.username, req.user.verification.email);
	// 	res.send();
	// });

	// app.post('/account/reset-password', (req, res) => {
	// 	resetPassword.sendToken(req.body.email, res);
	// });

	app.post('/account/signup', (req, res, next) => {
		const { username, password, password2, email } = req.body,
			signupIP = req.headers['X-Forwarded-For'] || req.headers['X-Real-IP'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
			save = {
				username,
				gameSettings: {
					disablePopups: false,
					enableTimestamps: false,
					disableRightSidebarInGame: false,
					enableDarkTheme: false
				},
				verification: {
					email: email || '',
					verificationToken: '',
					verificationTokenExpiration: null,
					passwordResetToken: '',
					passwordResetTokenExpiration: null
				},
				verified: false,
				games: [],
				wins: 0,
				losses: 0,
				created: new Date(),
				signupIP
			};

		if (!/^[a-z0-9]+$/i.test(username)) {
			res.status(401).json({ message: 'Sorry, your username can only be alphanumeric.' });
		} else if (username.length < 3) {
			res.status(401).json({ message: 'Sorry, your username is too short.' });
		} else if (username.length > 12) {
			res.status(401).json({ message: 'Sorry, your username is too long.' });
		} else if (password.length < 6) {
			res.status(401).json({ message: 'Sorry, your password is too short.' });
		} else if (password.length > 255) {
			res.status(401).json({ message: 'Sorry, your password is too long.' });
		} else if (password !== password2) {
			res.status(401).json({ message: 'Sorry, your passwords did not match.' });
		} else if (/88$/i.test(username)) {
			res.status(401).json({
				message: 'Sorry, usernames that end with 88 are not allowed.'
			});
		} else if (accountCreationDisabled.status) {
			res.status(403).json({
				message: 'Sorry, creating new accounts is temporarily disabled.'
			});
		} else if (torIps.includes(signupIP)) {
			res.status(401).json({
				message: 'TOR network users cannot play here.'
			});
		} else {
			let doesContainBadWord = false;
			blacklistedWords.forEach(word => {
				if (new RegExp(word, 'i').test(username)) {
					doesContainBadWord = true;
				}
			});
			if (doesContainBadWord) {
				res.status(401).json({
					message: 'Sorry, your username contains a naughty word or part of a naughty word.'
				});
			} else {
				Account.findOne({ username }, (err, account) => {
					if (err) {
						return next(err);
					}

					if (account && account.username.toLowerCase() === username.toLowerCase()) {
						res.status(401).json({ message: 'Sorry, that account already exists.' });
					} else {
						BannedIP.findOne({ ip: signupIP }, (err, ip) => {
							let date, unbannedTime;

							if (err) {
								return next(err);
							}

							if (ip) {
								date = new Date().getTime();
								unbannedTime = ip.type === 'small' || ip.type === 'new' ? ip.bannedDate.getTime() + 64800000 : ip.bannedDate.getTime() + 604800000;
							}

							if (ip && unbannedTime > date && !ipbansNotEnforced.status) {
								res.status(403).json({
									message:
										ip.type === 'small'
											? 'You can no longer access this service.  If you believe this is in error, contact the moderators.'
											: 'You can only make accounts once per day.  If you need an exception to this rule, contact the moderators.'
								});
							} else {
								Account.register(new Account(save), password, err => {
									if (err) {
										return next(err);
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
					}
				});
			}
		}
	});

	app.post(
		'/account/signin',
		(req, res, next) => {
			BannedIP.findOne(
				{
					ip: req.headers['X-Real-IP'] || req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'] || req.connection.remoteAddress
				},
				(err, ip) => {
					let date, unbannedTime;

					if (err) {
						return next(err);
					}

					if (ip) {
						date = new Date().getTime();
						unbannedTime = ip.type === 'small' ? ip.bannedDate.getTime() + 64800000 : ip.bannedDate.getTime() + 604800000;
					}

					if (ip && unbannedTime > date && ip.type !== 'new') {
						res.status(403).json({
							message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.'
						});
					} else if (torIps.includes(ip)) {
						res.status(401).json({
							message: 'TOR network users cannot play here.'
						});
					} else {
						return next();
					}
				}
			);
		},
		passport.authenticate('local'),
		(req, res) => {
			Account.findOne({
				username: req.user.username
			}).then(player => {
				player.lastConnectedIP = req.headers['X-Forwarded-For'] || req.headers['X-Real-IP'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
				player.save(() => {
					res.send();
				});
			});
		}
	);

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});
};
