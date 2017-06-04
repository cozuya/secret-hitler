const passport = require('passport'),
	Account = require('../models/account'),
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
		const {newPassword, newPasswordConfirm} = req.body,
			{user} = req;

		// todo-release prevent tiny/huge new passwords

		if (newPassword !== newPasswordConfirm) {
			res.status(401).json({message: 'not equal'});
			return;
		}

		user.setPassword(newPassword, () => {
			user.save();
			res.send();
		});
	});

	app.post('/account/change-email', ensureAuthenticated, (req, res) => {
		const {newEmail, newEmailConfirm} = req.body,
			{user} = req;

		if (newEmail !== newEmailConfirm) {
			res.status(401).json({message: 'not equal'});
			return;
		}

		Account.findOne({username: user.username}, (err, account) => {
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
		const {username, password, password2, email} = req.body,
			signupIP = req.headers['X-Real-IP'],
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
			res.status(401).json({message: 'Sorry, your username can only be alphanumeric.'});
		} else if (username.length < 3) {
			res.status(401).json({message: 'Sorry, your username is too short.'});
		} else if (username.length > 12) {
			res.status(401).json({message: 'Sorry, your username is too long.'});
		} else if (password.length < 7) {
			res.status(401).json({message: 'Sorry, your password is too short.'});
		} else if (password.length > 255) {
			res.status(401).json({message: 'Sorry, your password is too long.'});
		} else if (password !== password2) {
			res.status(401).json({message: 'Sorry, your passwords did not match.'});
		} else if (/88$/i.test(username)) {
			res.status(401).json({message: 'Sorry, usernames that end with 88 are not allowed.'});
		} else {
			let doesContainBadWord = false;
			blacklistedWords.forEach(word => {
				if (new RegExp(word, 'i').test(username)) {
					doesContainBadWord = true;
				}
			});
			if (doesContainBadWord) {
				res.status(401).json({message: 'Sorry, your username contains a naughty word or part of a naughty word.'});
			} else {
				Account.findOne({username}, (err, account) => {
					if (err) {
						return next(err);
					}

					if (account) {
						res.status(401).json({message: 'Sorry, that account already exists.'});
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
	});

	app.post('/account/signin', passport.authenticate('local'), (req, res) => {
		res.send();
	});

	// todo-alpha, signed in on 404 page, nothing updated until moved page.

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});
};