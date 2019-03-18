const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account'); // eslint-disable-line no-unused-vars
const { getProfile } = require('../models/profile/utils');
const GameSummary = require('../models/game-summary');
const socketRoutes = require('./socket/routes');
const _ = require('lodash');
const accounts = require('./accounts');
const version = require('../version');
const { obfIP } = require('./socket/ip-obf');
const { ProcessImage } = require('./image-processor');

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

	res.redirect('/observe');
};

const prodCacheBustToken = `${Math.random()
	.toString(36)
	.substring(2)}${Math.random()
	.toString(36)
	.substring(2)}`;

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
			renderObj.prodCacheBustToken = prodCacheBustToken;
		}

		res.render(pageName, renderObj);
	};

	accounts();

	Account.find({ $or: [{ staffRole: { $exists: true } }, { isContributor: true }] })
		.then(accounts => {
			const modUserNames = accounts.filter(account => account.staffRole === 'moderator').map(account => account.username);
			const editorUserNames = accounts.filter(account => account.staffRole === 'editor').map(account => account.username);
			const adminUserNames = accounts.filter(account => account.staffRole === 'admin').map(account => account.username);
			const altmodUserNames = accounts.filter(account => account.staffRole === 'altmod').map(account => account.username);
			const trialmodUserNames = accounts.filter(account => account.staffRole === 'trialmod').map(account => account.username);
			const contributorUserNames = accounts.filter(account => account.isContributor).map(account => account.username);

			socketRoutes(modUserNames, editorUserNames, adminUserNames, altmodUserNames, trialmodUserNames, contributorUserNames);
		})
		.catch(err => {
			console.log(err, 'err in finding staffroles');
		});

	app.get('/', (req, res) => {
		renderPage(req, res, 'page-home', 'home');
	});

	app.get('/rules', (req, res) => {
		renderPage(req, res, 'page-rules', 'rules');
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
			res.redirect('/observe/');
		} else {
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
					gameObj.prodCacheBustToken = prodCacheBustToken;
				}

				account.gameSettings.blacklist = [];
				res.render('game', gameObj);
			});
		}
	});

	app.get('/observe', (req, res) => {
		res.redirect('/observe/');
	});

	app.get('/observe/', (req, res) => {
		if (req.user) {
			req.session.destroy();
			req.logout();
		}

		const gameObj = {
			game: true
		};

		if (process.env.NODE_ENV === 'production') {
			gameObj.prodCacheBustToken = prodCacheBustToken;
		}

		res.render('game', gameObj);
	});

	app.get('/profile', (req, res) => {
		const username = req.query.username;
		const requestingUser = req.query.requestingUser;
		if (requestingUser !== req.user.username) {
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
							if (!acc || !acc.staffRole || acc.staffRole === 'altmod') {
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

	app.get('*', (req, res) => {
		renderPage(req, res, '404', '404');
	});
};
