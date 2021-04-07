const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account'); // eslint-disable-line no-unused-vars
const { getProfile } = require('../models/profile/utils');
const GameSummary = require('../models/game-summary');
const ModThread = require('../models/modThread');
const Profile = require('../models/profile');
const { socketRoutes } = require('./socket/routes');
const _ = require('lodash');
const { accounts } = require('./accounts');
const version = require('../version');
const { expandAndSimplify, obfIP } = require('./socket/ip-obf');
const { ProcessImage } = require('./image-processor');
const savedTorIps = require('../utils/savedtorips');
const fetch = require('node-fetch');
const prodCacheBustToken = require('./prodCacheBustToken');
const { DEFAULTTHEMECOLORS } = require('../src/frontend-scripts/node-constants');

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

	app.post('/', (req, res) => {
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

	const getHSLcolors = hsl => [
		parseInt(hsl.split(',')[0].split('hsl(')[1], 10),
		parseInt(
			hsl
				.split(',')[1]
				.trim()
				.split('%')[0],
			10
		),
		parseInt(
			hsl
				.split(',')[2]
				.trim()
				.split('%)')[0],
			10
		)
	];

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

				const backgroundColor = account.backgroundColor || DEFAULTTHEMECOLORS.baseBackgroundColor;
				const textColor = account.textColor || DEFAULTTHEMECOLORS.baseTextColor;
				const [backgroundHue, backgroundSaturation, backgroundLightness] = getHSLcolors(backgroundColor);
				const [textHue, textSaturation, textLightness] = getHSLcolors(textColor);

				const gameObj = {
					game: true,
					staffRole: account.staffRole || '',
					isContributor: account.isContributor || false,
					isTournamentMod: account.isTournamentMod || false,
					verified: req.user.verified,
					hasNotDismissedSignupModal: account.hasNotDismissedSignupModal,
					username,
					gameSettings: account.gameSettings,
					blacklist,
					primaryColor: account.primaryColor || DEFAULTTHEMECOLORS.primaryColor,
					secondaryColor: account.secondaryColor || DEFAULTTHEMECOLORS.secondaryColor,
					tertiaryColor: account.tertiaryColor || DEFAULTTHEMECOLORS.tertiaryColor,
					backgroundColor,
					secondaryBackgroundColor: `hsl(${backgroundHue}, ${backgroundSaturation}%, ${
						backgroundLightness > 50 ? backgroundLightness - 7 : backgroundLightness + 7
					}%)`,
					tertiaryBackgroundColor: `hsl(${backgroundHue}, ${backgroundSaturation}%, ${
						backgroundLightness > 50 ? backgroundLightness - 14 : backgroundLightness + 14
					}%)`,
					textColor,
					secondaryTextColor: `hsl(${textHue}, ${textSaturation}%, ${textLightness > 50 ? textLightness - 7 : textLightness + 7}%)`,
					tertiaryTextColor: `hsl(${textHue}, ${textSaturation}%, ${textLightness > 50 ? textLightness - 14 : textLightness + 14}%)`
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

		renderPage(req, res, '403', '403');
		return;

		const backgroundColor = DEFAULTTHEMECOLORS.baseBackgroundColor;
		const textColor = DEFAULTTHEMECOLORS.baseTextColor;
		const [backgroundHue, backgroundSaturation, backgroundLightness] = getHSLcolors(backgroundColor);
		const [textHue, textSaturation, textLightness] = getHSLcolors(textColor);

		const secondaryBackgroundColor = `hsl(${backgroundHue}, ${backgroundSaturation}%, ${
			backgroundLightness > 50 ? backgroundLightness - 5 : backgroundLightness + 5
		}%)`;
		const tertiaryBackgroundColor = `hsl(${backgroundHue}, ${backgroundSaturation}%, ${
			backgroundLightness > 50 ? backgroundLightness - 10 : backgroundLightness + 10
		}%)`;
		const secondaryTextColor = `hsl(${textHue}, ${textSaturation}%, ${textLightness > 50 ? textLightness - 7 : textLightness + 7}%)`;
		const tertiaryTextColor = `hsl(${textHue}, ${textSaturation}%, ${textLightness > 50 ? textLightness - 14 : textLightness + 14}%)`;

		const gameObj = {
			game: true,
			primaryColor: DEFAULTTHEMECOLORS.primaryColor,
			secondaryColor: DEFAULTTHEMECOLORS.secondaryColor,
			tertiaryColor: DEFAULTTHEMECOLORS.tertiaryColor,
			backgroundColor,
			secondaryBackgroundColor,
			tertiaryBackgroundColor,
			textColor,
			secondaryTextColor,
			tertiaryTextColor
		};

		if (process.env.NODE_ENV === 'production') {
			gameObj.prodCacheBustToken = prodCacheBustToken.prodCacheBustToken;
		}

		res.render('game', gameObj);
	});

	app.get('/profile', (req, res) => {
		const authedUser = req.session && req.session.passport && req.session.passport.user;
		const username = req.query.username;

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

						Account.findOne({ username: authedUser }).then(acc => {
							if (
								acc &&
								acc.staffRole &&
								(acc.staffRole === 'moderator' || acc.staffRole === 'editor' || acc.staffRole === 'admin' || acc.staffRole === 'trialmod')
							) {
								try {
									_profile.lastConnectedIP = '-' + obfIP(_profile.lastConnectedIP);
								} catch (e) {
									_profile.lastConnectedIP = "Couldn't find IP";
									console.log(e);
								}
							} else {
								_profile.lastConnectedIP = undefined;
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

	app.get('/modThread', (req, res) => {
		const id = req.query.id;

		if (!req.session.passport) {
			return;
		}

		const username = req.session.passport.user;

		const mangle = chat =>
			chat
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');

		Account.findOne({ username }).then(account => {
			if (account.staffRole === 'moderator' || account.staffRole === 'editor' || account.staffRole === 'admin') {
				ModThread.findById(id)
					.lean()
					.exec()
					.then(dm => {
						if (!dm) {
							res.status(404).send('Mod thread not found');
						} else {
							const chatLog = [];

							for (const message of dm.messages) {
								chatLog.push(
									`${message.userName}${message.userName ? (message.type === 'leave' || message.type === 'join' ? ' ' : ': ') : ''}${mangle(message.chat)}`
								);
							}

							res.send(chatLog.join('<br>'));
						}
					})
					.catch(err => debug(err));
			} else {
				res.status(401).send('You cannot access this resource. Ensure you are logged in.');
			}
		});
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
