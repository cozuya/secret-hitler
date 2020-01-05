const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account'); // eslint-disable-line no-unused-vars
const { getProfile } = require('../models/profile/utils');
const GameSummary = require('../models/game-summary');
const Profile = require('../models/profile');
const { socketRoutes } = require('./socket/routes');
const _ = require('lodash');
const accounts = require('./accounts');
const version = require('../version');
const { expandAndSimplify, obfIP } = require('./socket/ip-obf');
const { ProcessImage } = require('./image-processor');
const savedTorIps = require('../utils/savedtorips');
const fetch = require('node-fetch');
const prodCacheBustToken = require('./prodCacheBustToken');

/**
 * @param {object} req - express request object.
 * @param {object} res - express response object.
 * @param {function} next - express middleware function
 * @return {function} returns next() if user is authenticated.
 */
const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect('/observe/');
};

module.exports = () => {
	/**
	 * @param {object} req - express request object.
	 * @param {object} res - express response object.
	 * @param {string} pageName - name of the pug page to render
	 * @param {string} varName - name of the pug variable to insert.
	 */
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

	fetch('https://check.torproject.org/cgi-bin/TorBulkExitList.py?ip=1.1.1.1')
		.then(res => res.text())
		.then(text => {
			const gatheredTorIps = text.split('\n').slice(3);

			accounts(gatheredTorIps);
		})
		.catch(e => {
			console.log('error in getting tor ips', e);
			accounts(savedTorIps);
			console.log('Using Cached TOR IPs');
		});

	socketRoutes();

	app.get('/', (req, res) => {
		renderPage(req, res, 'page-home', 'home');
	});

	app.get('/rules', (req, res) => {
		renderPage(req, res, 'page-rules', 'rules');
	});

	app.get('/changelog', (req, res) => {
		renderPage(req, res, 'page-changelog', 'changelog');
	});

	app.get('/how-to-play', (req, res) => {
		renderPage(req, res, 'page-howtoplay', 'howtoplay');
	});

	app.get('/stats', (req, res) => {
		renderPage(req, res, 'page-stats', 'stats');
	});

	app.get('/stats-season', (req, res) => {
		renderPage(req, res, 'page-stats-season', 'stats-season');
	});

	app.get('/about', (req, res) => {
		renderPage(req, res, 'page-about', 'about');
	});

	app.get('/tou', (req, res) => {
		renderPage(req, res, 'page-tou', 'tou');
	});

	app.get('/polls', (req, res) => {
		renderPage(req, res, 'page-polls', 'polls');
	});

	app.get('/player-profiles', (req, res) => {
		renderPage(req, res, 'page-player-profiles', 'playerProfiles');
	});

	app.get('/game', ensureAuthenticated, (req, res) => {
		res.redirect('/game/');
	});

	app.get('/game/', ensureAuthenticated, (req, res) => {
		const { username } = req.user;

		if (req.user.isBanned) {
			res.redirect('/logout');
		} else {
			let ip = req.expandedIP;

			try {
				ip = expandAndSimplify(ip);
			} catch (e) {
				console.log(e);
			}

			Profile.findOne({ _id: username })
				.then(profile => {
					if (profile) {
						profile.lastConnectedIP = ip;
						profile.save();
					}
				})
				.catch(err => {
					console.log(err, 'profile find err');
				});

			Account.findOne({ username }, (err, account) => {
				if (err) {
					console.log(err);
					return;
				}
				const { blacklist } = account.gameSettings;
				const gameObj = {
					game: true,
					staffRole: account.staffRole || '',
					isContributor: account.isContributor || false,
					verified: req.user.verified,
					hasNotDismissedSignupModal: account.hasNotDismissedSignupModal,
					username,
					gameSettings: account.gameSettings,
					blacklist
				};

				if (process.env.NODE_ENV === 'production') {
					gameObj.prodCacheBustToken = prodCacheBustToken.prodCacheBustToken;
				}

				account.lastConnectedIP = ip;
				if (
					(account.ipHistory && account.ipHistory.length === 0) ||
					(account.ipHistory.length > 0 && account.ipHistory[account.ipHistory.length - 1].ip !== ip)
				) {
					account.ipHistory.push({
						date: new Date(),
						ip: ip
					});
				}
				account.save(() => {
					res.render('game', gameObj);
				});
				// account.gameSettings.blacklist = [];
			});
		}
	});

	app.get('/observe', (req, res) => {
		res.redirect('/observe/');
	});

	app.get('/logout', (req, res) => {
		if (req.user) {
			req.session.destroy();
			req.logout();
		}
		res.redirect('/observe/');
	});

	app.get('/observe/', (req, res) => {
		if (req.user) {
			res.redirect('/game/');
			return;
		}

		const gameObj = {
			game: true
		};

		if (process.env.NODE_ENV === 'production') {
			gameObj.prodCacheBustToken = prodCacheBustToken.prodCacheBustToken;
		}

		res.render('game', gameObj);
	});

	app.get('/profile', (req, res) => {
		const username = req.query.username;
		const requestingUser = req.query.requestingUser;
		if (req && req.user && requestingUser && requestingUser !== 'undefined' && req.user.username && requestingUser !== req.user.username) {
			res.status(401).send('You are not who you say you are. Please login again.');
			return;
		}
		getProfile(username).then(profile => {
			if (!profile) {
				res.status(404).send('Profile not found');
			} else {
				Account.findOne({ username }, (err, account) => {
					const _profile = _.cloneDeep(profile);

					if (err) {
						return new Error(err);
					}
					if (account) {
						_profile.customCardback = account.gameSettings.customCardback;
						_profile.bio = account.bio;

						Account.findOne({ username: requestingUser }).then(acc => {
							if (!acc || !acc.staffRole || acc.staffRole === 'altmod' || acc.staffRole === 'veteran') {
								_profile.lastConnectedIP = 'no looking';
							} else {
								try {
									_profile.lastConnectedIP = '-' + obfIP(_profile.lastConnectedIP);
								} catch (e) {
									_profile.lastConnectedIP = 'something went wrong';
									console.log(e);
								}
							}

							res.json(_profile);
						});
					}
				});
			}
		});
	});

	app.get('/gameSummary', (req, res) => {
		const id = req.query.id;

		GameSummary.findById(id)
			.lean()
			.exec()
			.then(gs => {
				if (!gs) {
					res.status(404).send('Game summary not found');
				} else {
					res.json(gs);
				}
			})
			.catch(err => debug(err));
	});

	app.get('/online-playercount', (req, res) => {
		const { userList } = require('./socket/models');

		res.json({
			count: userList.length
		});
	});

	app.get('/viewPatchNotes', ensureAuthenticated, (req, res) => {
		Account.updateOne({ username: req.user.username }, { lastVersionSeen: version.number }, err => {
			res.sendStatus(err ? 404 : 202);
		});
	});

	app.post('/upload-cardback', ensureAuthenticated, (req, res) => {
		try {
			if (!req.session.passport) {
				return;
			}

			const { image } = req.body;
			const raw = image.split(',')[1];
			const username = req.session.passport.user;

			Account.findOne({ username })
				.then(account => {
					if (account.wins + account.losses < 50) {
						res.json({
							message: 'You need to have played 50 games to upload a cardback.'
						});
					} else if (
						new Date(account.gameSettings.customCardbackSaveTime) &&
						Date.now() - new Date(account.gameSettings.customCardbackSaveTime).getTime() < 30000
					) {
						res.json({
							message: 'You can only change your cardback once every 30 seconds.'
						});
					} else {
						ProcessImage(username, raw, (resp, err) => {
							res.json({ message: err || resp });
						});
					}
				})
				.catch(err => {
					console.log(err, 'account err in cardbacks');
				});
		} catch (error) {
			console.log(err, 'upload cardback crash error');
		}
	});
};
