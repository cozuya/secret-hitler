const passport = require('passport'),
	_ = require('lodash'),
	Account = require('../models/account'),
	BannedIP = require('../models/bannedIP'),
	// verifyAccount = require('./verify-account'),
	// resetPassword = require('./reset-password'),
	blacklistedWords = require('../iso/blacklistwords'),
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

	app.post('/account/change-email', ensureAuthenticated, (req, res) => {
		const { newEmail, newEmailConfirm } = req.body,
			{ user } = req;

		if (newEmail !== newEmailConfirm) {
			res.status(401).json({ message: 'not equal' });
			return;
		}

		Account.findOne({ username: user.username }, (err, account) => {
			if (err) {
				console.log(err);
			}

			account.verification.email = newEmail;
			account.save(() => {
				res.send();
			});
		});
	});

	app.post('/account/request-verification', ensureAuthenticated, (req, res) => {
		verifyAccount.sendToken(req.user.username, req.user.verification.email);
		res.send();
	});

	app.post('/account/reset-password', (req, res) => {
		resetPassword.sendToken(req.body.email, res);
	});

	app.post('/account/signup', (req, res, next) => {
		const { username, password, password2, email } = req.body,
			signupIP =
				req.headers['X-Real-IP'] ||
				req.headers['x-forwarded-for'] ||
				req.headers['X-Forwarded-For'] ||
				req.connection.remoteAddress,
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
			res
				.status(401)
				.json({ message: 'Sorry, your username can only be alphanumeric.' });
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
		} else {
			let doesContainBadWord = false;
			blacklistedWords.forEach(word => {
				if (new RegExp(word, 'i').test(username)) {
					doesContainBadWord = true;
				}
			});
			if (doesContainBadWord) {
				res.status(401).json({
					message:
						'Sorry, your username contains a naughty word or part of a naughty word.'
				});
			} else {
				Account.findOne(
					{ username: new RegExp(_.escapeRegExp(username), 'i') },
					(err, account) => {
						if (err) {
							return next(err);
						}

						if (account) {
							res
								.status(401)
								.json({ message: 'Sorry, that account already exists.' });
						} else {
							BannedIP.findOne({ ip: signupIP }, (err, ip) => {
								let date, unbannedTime;

								if (err) {
									return next(err);
								}

								if (ip) {
									date = new Date().getTime();
									unbannedTime =
										ip.type === 'small'
											? ip.bannedDate.getTime() + 64800000
											: ip.bannedDate.getTime() + 604800000;
								}

								if (ip && unbannedTime > date) {
									res.status(403).json({
										message:
											'You can no longer access this service.  If you believe this is in error, contact the administrators.'
									});
								} else {
									Account.register(new Account(save), password, err => {
										if (err) {
											return next(err);
										}

										passport.authenticate('local')(req, res, () => {
											// if (email) {
											// 	verifyAccount.sendToken(req.body.username, req.body.email);
											// }
											res.send();
										});
									});
								}
							});
						}
					}
				);
			}
		}
	});

	app.post(
		'/account/signin',
		(req, res, next) => {
			BannedIP.findOne(
				{
					ip:
						req.headers['X-Real-IP'] ||
						req.headers['x-forwarded-for'] ||
						req.headers['X-Forwarded-For'] ||
						req.connection.remoteAddress
				},
				(err, ip) => {
					let date, unbannedTime;

					if (err) {
						return next(err);
					}

					if (ip) {
						date = new Date().getTime();
						unbannedTime =
							ip.type === 'small'
								? ip.bannedDate.getTime() + 64800000
								: ip.bannedDate.getTime() + 604800000;
					}

					if (ip && unbannedTime > date) {
						res.status(403).json({
							message:
								'You can no longer access this service.  If you believe this is in error, contact the administrators.'
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
				username: new RegExp(_.escapeRegExp(req.user.username), 'i')
			}).then(player => {
				player.lastConnectedIP =
					req.headers['X-Real-IP'] ||
					req.headers['x-forwarded-for'] ||
					req.headers['X-Forwarded-For'] ||
					req.connection.remoteAddress;
				player.save(() => {
					res.send();
				});
			});
		}
	);

	// todo-alpha, signed in on 404 page, nothing updated until moved page.

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});
};
