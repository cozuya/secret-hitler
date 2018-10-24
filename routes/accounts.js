const passport = require('passport');
const Account = require('../models/account');
const Profile = require('../models/profile/index');
const BannedIP = require('../models/bannedIP');
const { ipbansNotEnforced, accountCreationDisabled } = require('./socket/models');
const verifyAccount = require('./verify-account');
const resetPassword = require('./reset-password');
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

let banCache = null;
setInterval(() => {
	// Fetches the list of banned IPs every 5 seconds, to prevent hammering the DB on restarts as people log in.
	BannedIP.find({}, (err, ips) => {
		if (err) console.log(err);
		else banCache = ips;
	});
}, 5000);
// There's a mountain of "new" type bans.
const unbanTime = new Date() - 64800000;
BannedIP.deleteMany({ type: 'new', bannedDate: { $lte: unbanTime } }, (err, r) => {
	if (err) throw err;
	BannedIP.find({}, (err, ips) => {
		if (err) throw err;
		banCache = ips;
	});
});
const testIP = (IP, callback) => {
	if (!IP) callback('Bad IP!');
	if (!banCache || !banCache.filter) callback('nocache');

	const ips = banCache.filter(i => i.ip == IP);
	let date;
	let unbannedTime;
	const ip = ips[ips.length - 1];

	if (ip) {
		date = new Date().getTime();
		unbannedTime =
			ip.type === 'small' || ip.type === 'new'
				? ip.bannedDate.getTime() + 64800000
				: ip.type === 'tiny'
					? ip.bannedDate.getTime() + 60000
					: ip.bannedDate.getTime() + 604800000;
	}

	if (ip && unbannedTime > date && !ipbansNotEnforced.status && process.env.NODE_ENV === 'production') {
		callback(ip.type);
	} else {
		callback(null);
	}
};

const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

module.exports = () => {
	verifyAccount.setRoutes();
	resetPassword.setRoutes();

	app.get('/account', ensureAuthenticated, (req, res) => {
		res.render('page-account', {
			username: req.user.username,
			verified: req.user.verified,
			email: req.user.verification.email
		});
	});

	app.post('/account/change-password', ensureAuthenticated, (req, res) => {
		const { newPassword, newPasswordConfirm } = req.body;
		const { user } = req;

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

	app.post('/account/delete-account', passport.authenticate('local'), (req, res) => {
		Account.deleteOne({ username: req.user.username }).then(() => {
			Profile.deleteOne({ _id: req.user.username }).then(() => {
				res.send();
			});
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

	// app.post('/account/reset-password', (req, res) => {
	// 	resetPassword.sendToken(req.body.email, res);
	// });

	app.post('/account/signup', (req, res, next) => {
		const { username, password, password2, email, isPrivate } = req.body;
		const signupIP =
			req.headers['x-real-ip'] || req.headers['X-Real-IP'] || req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		const save = {
			username,
			gameSettings: {
				disablePopups: false,
				enableTimestamps: false,
				disableRightSidebarInGame: false,
				enableDarkTheme: false,
				soundStatus: 'Pack2',
				isPrivate
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
			touLastAgreed: TOU_CHANGES[0].changeVer,
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
				message: 'Sorry, creating new accounts is temporarily disabled.  If you need an account created, please contact our moderators on discord.'
			});
		} else {
			let doesContainBadWord = false;

			blacklistedWords.forEach(word => {
				if (new RegExp(word, 'i').test(username)) {
					doesContainBadWord = true;
				}
			});

			if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1])) {
				res.status(401).json({
					message: 'Only non-disposible email providers are allowed to create verified accounts.'
				});
				return;
			}

			if (email && !emailRegex.test(email)) {
				res.status(401).json({
					message: `That doesn't look like a valid email address.`
				});

				return;
			}

			if (doesContainBadWord) {
				res.status(401).json({
					message: 'Sorry, your username contains a naughty word or part of a naughty word.'
				});
			} else {
				Account.findOne({ username }, (err, account) => {
					if (err) {
						return next(err);
					}
					if (account && account.username === username) {
						res.status(401).json({ message: 'Sorry, that account already exists.' });
					} else {
						testIP(signupIP, banType => {
							if (banType) {
								if (banType == 'nocache') res.status(403).json({ message: 'The server is still getting its bearings, try again in a few moments.' });
								else if (banType == 'small' || banType == 'tiny') {
									res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
								} else if (banType == 'new') {
									res.status(403).json({ message: 'You can only make accounts once per day.  If you need an exception to this rule, contact the moderators.' });
								} else {
									console.log(`Unhandled IP ban type: ${banType}`);
									res.status(403).json({ message: 'You can no longer access this service.  If you believe this is in error, contact the moderators.' });
								}
							} else {
								Account.register(new Account(save), password, err => {
									if (err) {
										return next(err);
									}
									if (email) {
										verifyAccount.sendToken(username, email);
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
			testIP(
				req.headers['x-real-ip'] ||
					req.headers['X-Real-IP'] ||
					req.headers['X-Forwarded-For'] ||
					req.headers['x-forwarded-for'] ||
					req.connection.remoteAddress,
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
		(req, res) => {
			Account.findOne({
				username: req.user.username
			}).then(player => {
				if (player.isBanned) {
					res.status(403).json({
						message: 'You can not access this service.  If you believe this is in error, contact the moderators.'
						// TODO: include the reason moderators provided for the account ban, if it exists
					});
					return;
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
					(player.isTimeout6Hour && new Date().getTime() - new Date(player.isTimeout).getTime() < 21600000)
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

		if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1])) {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
			return;
		}

		if (email && !emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
			return;
		}

		verifyAccount.sendToken(req.user.username, email, res);
	});

	app.post('/account/change-email', ensureAuthenticated, (req, res, next) => {
		const { email } = req.body;
		const { verified, username } = req.user;

		if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1])) {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
			return;
		}

		if (email && !emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
			return;
		}

		Account.findOne({ username }).then(account => {
			account.verification.email = email;
			account.save(() => {
				if (!verified) {
					verifyAccount.sendToken(username, email, res);
				} else {
					res.send();
				}
			});
		});
	});

	app.post('/account/request-verification', ensureAuthenticated, (req, res, next) => {
		if (req.user.verification.email) {
			verifyAccount.sendToken(req.user.username, req.user.verification.email, res);
		} else {
			return next();
		}
	});

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});
};
