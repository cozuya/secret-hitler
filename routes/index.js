let passport = require('passport'), // eslint-disable-line no-unused-vars
	Account = require('../models/account'), // eslint-disable-line no-unused-vars
	{ getProfile } = require('../models/profile/utils'),
	Game = require('../models/game'),
	moment = require('moment'),
	_ = require('lodash'),
	socketRoutes = require('./socket/routes'),
	accounts = require('./accounts'),
	version = require('../version'),
	ensureAuthenticated = (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}

		res.redirect('/observe');
	};

module.exports = () => {
	let gamesData;
	const renderPage = (req, res, pageName, varName) => {
			const renderObj = {};

			renderObj[varName] = true;

			if (req.user) {
				renderObj.username = req.user.username;
			}

			res.render(pageName, renderObj);
		},
		getData = () => {
			Game.find({})
				.then(data => {
					const completedGames = (() => {
							const dates = data.map(game => moment(new Date(game.date)).format('l')).filter(date => date !== '5/13/2017' && date !== moment(new Date()).format('l')),  // no idea what happened on that date but the db is messed up and shows 3x more than usual which can't be right.
								labels = _.uniq(dates),
								series = new Array(labels.length).fill(0);

							dates.forEach(date => {
								series[labels.indexOf(date)]++;
							});

							return {
								labels: (() => {
									return labels;
								})(),
								series
							};
						})(),
						getDataOnGameByPlayerCount = (count) => {
							const games = count ? data.filter(game => game.losingPlayers.length + game.winningPlayers.length === count) : data,
								fascistWinCount = games.filter(game => game.winningTeam === 'fascist').length,
								totalGameCount = games.length;

							return {
								fascistWinCount,
								totalGameCount,
								expectedFascistWinCount: (() => {
									if (games.length) {
										const game = games.find(game => game.winningTeam === 'fascist'),
											fascistCount = game.winningPlayers.length,
											{playerCount} = game;

										return (fascistCount / playerCount) * 100;
									}
								})()
							};
						};

					gamesData = {
						completedGames,
						allPlayerGameData: getDataOnGameByPlayerCount(),
						fivePlayerGameData: getDataOnGameByPlayerCount(5),
						sixPlayerGameData: getDataOnGameByPlayerCount(6),
						sevenPlayerGameData: getDataOnGameByPlayerCount(7),
						eightPlayerGameData: getDataOnGameByPlayerCount(8),
						ninePlayerGameData: getDataOnGameByPlayerCount(9),
						tenPlayerGameData: getDataOnGameByPlayerCount(10)
					};
				});
		// }
		// ,  // going to rethink this idea.
		// decrementKarma = () => {
		// 	Account.find({karmaCount: {$gt: 0}})
		// 		.then((err, accounts) => {
		// 			if (err) {
		// 				console.log(err, 'decrementKarma err');
		// 			}
		// 			accounts.map(account => {
		// 				account.karmaCount = account.karmaCount - 1;
		// 				return account;
		// 			});
		// 			accounts.save();
		// 		});
		};

	accounts();
	socketRoutes();
	getData();
	setInterval(getData, 86400000); // once every 24 hours refresh the chart data
	// setInterval(decrementKarma, 86400000); // once every 48 hours reduce players with karma karmaCount by 1

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

	app.get('/player-profiles', (req, res) => {
		renderPage(req, res, 'page-player-profiles', 'playerProfiles');
	});

	app.get('/game', ensureAuthenticated, (req, res) => { // naaaaaaaate.  Remove after IP bans go in.
		if ((req.headers['X-Real-IP'] && req.headers['X-Real-IP'] !== '60.241.181.49') || (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'] !== '60.241.181.49') || (req.headers['X-Forwarded-For'] && req.headers['X-Forwarded-For'] !== '60.241.181.49') || (req.connection.remoteAddress && req.connection.remoteAddress !== '60.241.181.49')) {
			res.render('game', {
				user: req.user.username,
				game: true,
				isLight: req.user.gameSettings.enableLightTheme
			});
		}
	});

	app.get('/observe', (req, res) => {
		if (req.user) {
			req.session.destroy();
			req.logout();
		}
		res.render('game', {game: true});
	});

	app.get('/profile', (req, res) => {
		const username = req.query.username;

		getProfile(username).then(profile => {
			if (!profile) res.status(404).send('Profile not found');
			else res.json(profile);
		});
	});

	app.get('/data', (req, res) => {
		res.json(gamesData);
	});

	app.get('/viewPatchNotes', ensureAuthenticated, (req, res) => {
		Account.updateOne(
			{ username: req.user.username },
			{ lastVersionSeen: version.number },
			(err) => {
				if (err) res.sendStatus(404);
				else res.sendStatus(200);
			}
		);
	});
};