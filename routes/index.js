let passport = require('passport'), // eslint-disable-line no-unused-vars
	Account = require('../models/account'), // eslint-disable-line no-unused-vars
	Profile = require('../models/profile'),
	socketRoutes = require('./socket/routes'),
	accounts = require('./accounts'),
	ensureAuthenticated = (req, res, next) => {
		if (req.isAuthenticated()) {
			return next();
		}

		res.redirect('/observe');
	};

module.exports = () => {
	accounts();
	socketRoutes();

	const renderPage = (req, res, pageName, varName) => {
		const renderObj = {};

		renderObj[varName] = true;

		if (req.user) {
			renderObj.username = req.user.username;
		}

		res.render(pageName, renderObj);
	};

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

	app.get('/profile', (req, res) => {
		const username = req.query.username;

		Profile.findById(username, (err, profile) => {
			res.json(profile);
		});
	});

	app.get('/googleccea3bf80b28ed88.html', (req, res) => {
		res.send('google-site-verification: googleccea3bf80b28ed88.html');
	});

	app.get('*', (req, res) => {
		res.render('404');
	});
};