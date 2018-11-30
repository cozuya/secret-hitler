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
const banLength = {
	small: 18 * 60 * 60 * 1000, // 18 hours
	new: 18 * 60 * 60 * 1000, // 18 hours
	tiny: 1 * 60 * 60 * 1000, // 1 hour
	big: 7 * 24 * 60 * 60 * 1000 // 7 days
};
const testIP = (IP, callback) => {
	if (!IP) callback('Bad IP!');
	else if (!banCache || !banCache.filter) callback('nocache');
	else {
		const ips = banCache.filter(i => i.ip == IP);
		let date;
		let unbannedTime;
		const ip = ips[ips.length - 1];

		if (ip) {
			date = new Date().getTime();
			unbannedTime = ip.bannedDate.getTime() + (banLength[ip.type] || banLength.big);
		}

		if (ip && unbannedTime > date && !ipbansNotEnforced.status && process.env.NODE_ENV === 'production') {
			callback(ip.type);
		} else {
			callback(null);
		}
	}
};

const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

module.exports = () => {
	verifyAccount.setRoutes();
	resetPassword.setRoutes();

	app.get('/account', ensureAuthenticated, (req, res, next) => {
		res.render('page-account', {
			username: req.user.username,
			verified: req.user.verified,
			email: req.user.verification ? req.user.verification.email : ''
		});
	});

	app.post('/account/change-password', ensureAuthenticated, (req, res, next) => {
		const { newPassword, newPasswordConfirm } = req.body;
		const { user } = req;

		// todo-release prevent tiny/huge new passwords

		if (newPassword !== newPasswordConfirm) {
			res.status(401).json({ message: 'not equal' });
			return next();
		}

		user.setPassword(newPassword, () => {
			user.save();
			res.send();
		});
	});

	app.post('/account/delete-account', passport.authenticate('local'), (req, res, next) => {
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
					return next();
				}
				resetPassword.sendToken(req.body.email, res);
			})
			.catch(err => console.log(err, 'account err'));
	});

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
			res.status(401).json({
				message: 'Usernames that end with 88 are not allowed.'
			});
		} else if (accountCreationDisabled.status) {
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

			if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
				res.status(401).json({
					message: 'Only non-disposible email providers are allowed to create verified accounts.'
				});
				return next();
			}

			if (email && !emailRegex.test(email)) {
				res.status(401).json({
					message: `That doesn't look like a valid email address.`
				});
				return next();
			}

			if (doesContainBadWord) {
				res.status(401).json({
					message: 'Your username contains a naughty word or part of a naughty word.'
				});
				return next();
			}

			const queryObj = email
				? { $or: [{ username: new RegExp(`\\b${username}\\b`, 'i') }, { 'verification.email': email }] }
				: { username: new RegExp(`\\b${username}\\b`, 'i') };

			Account.find(queryObj, (err, accounts) => {
				if (err) {
					return next(err);
				}

				if (accounts.length) {
					const usernames = accounts.map(acc => acc.username.toLowerCase());

					if (usernames.includes(username.toLowerCase())) {
						res.status(401).json({ message: 'That account already exists.' });
					} else {
						res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
					}
					return next();
				}

				testIP(signupIP, banType => {
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
			});
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

		if (!email) {
			return next();
		}

		if (email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
			return next();
		}

		if (!emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
			return next();
		}

		Account.find({ 'verification.email': email }, (err, accounts) => {
			if (err) {
				return next(err);
			}

			if (accounts.length) {
				res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
			} else {
				verifyAccount.sendToken(req.user.username, email, res);
			}
		});
	});

	app.post('/account/change-email', ensureAuthenticated, (req, res, next) => {
		const { email } = req.body;
		const { verified, username } = req.user;

		if (email && email.split('@')[1] && bannedEmails.includes(email.split('@')[1]) && process.env.NODE_ENV === 'production') {
			res.status(401).json({
				message: 'Only non-disposible email providers are allowed to create verified accounts.'
			});
			return next();
		}

		if (email && !emailRegex.test(email)) {
			res.status(401).json({
				message: `That doesn't look like a valid email address.`
			});
			return next();
		}

		Account.find({ 'verification.email': email }, (err, accounts) => {
			if (err) {
				return next(err);
			}

			if (accounts.length) {
				res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
			} else {
				account.verification.email = email;
				account.save(() => {
					if (!verified) {
						verifyAccount.sendToken(username, email, res);
					} else {
						res.send();
					}
				});
			}
		});
	});

	app.post('/account/request-verification', ensureAuthenticated, (req, res, next) => {
		const { verification } = req.user;
		const { email } = verification;

		if (verification && email) {
			Account.find({ 'verification.email': email }, (err, accounts) => {
				if (err) {
					return next(err);
				}

				if (accounts.length) {
					res.status(401).json({ message: 'That email address is being used by another verified account, please change that or use another email.' });
					return next();
				} else {
					verifyAccount.sendToken(req.user.username, email, res);
				}
			});
		}
	});

	app.post('/account/logout', ensureAuthenticated, (req, res) => {
		req.logOut();
		res.send();
	});
};
