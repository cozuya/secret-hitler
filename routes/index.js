const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account'); // eslint-disable-line no-unused-vars
const { getProfile } = require('../models/profile/utils');
const GameSummary = require('../models/game-summary');
const socketRoutes = require('./socket/routes');
const _ = require('lodash');
const accounts = require('./accounts');
const version = require('../version');
const { MODERATORS, ADMINS, EDITORS } = require('../src/frontend-scripts/constants');
const fs = require('fs');
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

		res.render(pageName, renderObj);
	};

	accounts();
	socketRoutes();

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

	app.get('/about', (req, res) => {
		renderPage(req, res, 'page-about', 'about');
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
				const { blacklist } = account.gameSettings;

				account.gameSettings.blacklist = [];

				res.render('game', {
					game: true,
					username,
					gameSettings: account.gameSettings,
					blacklist
				});
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
		res.render('game', { game: true });
	});

	app.get('/profile', (req, res) => {
		const username = req.query.username;
		const requestingUser = req.query.requestingUser;

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
					}

					if (!(MODERATORS.includes(requestingUser) || ADMINS.includes(requestingUser) || EDITORS.includes(requestingUser))) {
						_profile.lastConnectedIP = 'no looking';
					}
					res.json(_profile);
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
			const extension = image.split(';base64')[0].split('/')[1];
			const raw = image.split(',')[1];
			const username = req.session.passport.user;
			const now = new Date();
			const socketId = Object.keys(io.sockets.sockets).find(
				socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === username
			);

			Account.findOne({ username }, (err, account) => {
				if (account.wins + account.losses < 50) {
					res.json({
						message: 'You need to have played 50 games to upload a cardback.'
					});
					// } else if (account.gameSettings.customCardbackSaveTime && (now.getTime() - new Date(account.gameSettings.customCardbackSaveTime).getTime() < 64800000)) {
				} else if (
					new Date(account.gameSettings.customCardbackSaveTime) &&
					now.getTime() - new Date(account.gameSettings.customCardbackSaveTime).getTime() < 30000
				) {
					res.json({
						message: 'You can only change your cardback once every 30 seconds.'
					});
				} else {
					fs.writeFile(`public/images/custom-cardbacks/${req.session.passport.user}.${extension}`, raw, 'base64', () => {
						account.gameSettings.customCardback = extension;
						account.gameSettings.customCardbackSaveTime = now.toString();
						account.gameSettings.customCardbackUid = Math.random()
							.toString(36)
							.substring(2);
						account.save(() => {
							res.json({ message: 'Cardback successfully uploaded.' });
							if (socketId && io.sockets.sockets[socketId]) {
								io.sockets.sockets[socketId].emit('gameSettings', account.gameSettings);
							}
						});
					});
				}
			}).catch(err => {
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
