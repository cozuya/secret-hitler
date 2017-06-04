let passport = require('passport'), // eslint-disable-line no-unused-vars
	Account = require('../models/account'), // eslint-disable-line no-unused-vars
	Game = require('../models/game'),
	moment = require('moment'),
	_ = require('lodash'),
	socketRoutes = require('./socket/routes'),
	accounts = require('./accounts'),
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
							const dates = data.map(game => moment(new Date(game.date)).format('l')).filter(date => date !== '5/13/2017'),  // no idea what happened on that date but the db is messed up and shows 3x more than usual which can't be right.
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

	app.get('/game', ensureAuthenticated, (req, res) => {
		res.render('game', {
			user: req.user.username,
			game: true,
			isLight: req.user.gameSettings.enableLightTheme
		});
	});

	app.get('/observe', (req, res) => {
		if (req.user) {
			req.session.destroy();
			req.logout();
		}
		res.render('game', {game: true});
	});

	app.get('/data', (req, res) => {
		res.json(gamesData);
	});
};