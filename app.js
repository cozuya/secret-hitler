const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const socketSession = require('express-socket.io-session');
const passport = require('passport');
const mongoose = require('mongoose');
const compression = require('compression');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const Account = require('./models/account');
const routesIndex = require('./routes/index');
const session = require('express-session');
const fs = require('fs');
const { games } = require('./routes/socket/models');

let store;

if (process.env.NODE_ENV !== 'production') {
	const MongoDBStore = require('connect-mongodb-session')(session);
	store = new MongoDBStore({
		uri: 'mongodb://localhost:27017/secret-hitler-app',
		collection: 'sessions'
	});
} else {
	const redis = require('redis').createClient();
	const RedisStore = require('connect-redis')(session);
	store = new RedisStore({
		host: '127.0.0.1',
		port: 6379,
		client: redis,
		ttl: 2 * 604800 // 2 weeks
	});
}

app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
app.locals.pretty = true;
app.use(compression());
app.use(bodyParser.json({ limit: '10kb' })); // limit can be lower since this should not have a lot of data per request (helps protect against json expansion attacks I guess)
app.use(bodyParser.urlencoded({ extended: false, limit: '200kb' })); // limit needs to be decently high to account for cardback uploads
app.use(favicon(`${__dirname}/public/favicon.ico`));
app.use(cookieParser());
app.use(express.static(`${__dirname}/public`, { maxAge: 86400000 * 28 }));

// nicer discord previews - detects discord preview agent and serves special pages to it
app.use((req, res, next) => {
	const data = req.originalUrl.split('?');
	let page = data[0];
	if (page.startsWith('/genimg/')) {
		if (req.query.prof) {
			// note: this needs checking to make sure its safe
			const img = fs.readFileSync(`public/images/custom-cardbacks/${req.query.prof}.png`);
			if (!img) return res.status(404).send();
			res.writeHead(200, {
				'Content-Type': 'image/png',
				'Content-Length': img.length
			});
			return res.end(img);
		}
		if (req.query.game) {
			const game = games[page.substring(6)];
			if (!game) return res.status(404).send();
			// TODO: make the image
			// TODO: fetch replay image if game ended?
			/* relevant data:
{
	"general": {
		// only useful pre-start
		"minPlayersCount": 7,
		"excludedPlayerCount": [],
		"maxPlayersCount": 7,
		
		"uid": "EmbarrassedAllegedWildcatRemakeRemake",
		"name": "New Game",
		"electionCount": 13,
		"playerCount": 7, // likely doesnt exist pre-start
		
		"experiencedMode": true,
		"disableChat": false,
		"isVerifiedOnly": false,
		"disableObserver": false,
		"isTourny": false,
		"rainbowgame": true,
		"blindMode": false,
		"timedMode": false,
		"casualGame": false,
		"rebalance6p": false,
		"rebalance7p": false,
		"rebalance9p2f": false,
		"private": false,
		"privateOnly": false,
		"eloMinimum": null
	},
	"customGameSettings": {
		"enabled": false, // all other data will not exist if false and game was not started
		"hitlerZone": 3,
		"vetoZone": 5,
		"trackState": {
			"lib": 0,
			"fas": 0
		},
		"deckState": {
			"lib": 6,
			"fas": 11
		},
		"fascistCount": 2,
		"hitKnowsFas": false,
		"powers": [null, "investigate", "election", "bullet", "bullet"]
	},
	"publicPlayersState": [{ // list of all players
		"userName": "Tomahawk",
		"isDead": false,
		"customCardback": "png" // does not exist if no cardback
	}],
	"trackState": {
		"liberalPolicyCount": 3,
		"fascistPolicyCount": 3,
		"electionTrackerCount": 0
	}
} */
		}
		if (req.query.repl) {
			// fetch basic replay data
		}
		return res.status(404).send();
	}
	if (req.header('user-agent').includes('Discordbot/2.0')) {
		if (page === '/') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="Home Page" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/rules') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="Board Game Rules & Mechanics" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/how-to-play') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="How To Play" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/stats') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="Game Statistics" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/polls') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="Polls" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/tou') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="Terms of Use" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page === '/about') {
			return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="About" property="og:title">
		<meta content="An online adaptation of the social deduction board game Secret Hitler." property="og:description">
		<meta content="secrethitler.io" property="og:site_name">
	</head>
</html>`);
		}
		if (page.startsWith('/game') || page.startsWith('/observe')) {
			if (page.startsWith('/game')) page = page.substring(5);
			else page = page.substring(8);
			if (page.startsWith('/')) page = page.substring(1);
			if (page.startsWith('profile/')) {
				Account.findOne({ username: page.substring(8) }, (err, acc) => {
					if (err) return res.status(500).send(err);
					if (!acc) return res.status(404);
					// account exists, make use of it
					let pCol = '';
					let type = '';
					if (acc.isBanned) {
						type = 'Banned';
						pCol = '444444';
					} else if (acc.staffRole && acc.staffRole.length && acc.staffRole !== 'trialmod' && acc.staffRole !== 'altmod') {
						type = acc.staffRole.substring(0, 1).toUpperCase() + acc.staffRole.substring(1);
						if (acc.staffRole === 'admin') pCol = 'ff0000';
						else if (acc.staffRole === 'editor') {
							if (acc.username === 'cbell') pCol = 'ff1a75';
							else if (acc.username === 'jdudle3') pCol = 'fbbc13';
							else if (acc.username === 'Max') pCol = 'b7ae0b';
							else if (acc.username === 'DFinn') pCol = '00ffd8';
							else if (acc.username === 'Invidia') pCol = 'ec7d04';
							else if (acc.username === 'TheJustStopO') pCol = 'dc143c';
							else if (acc.username === 'Faaiz1999') pCol = 'c7c1ff';
							else pCol = '05bba0';
						} else if (acc.staffRole === 'moderator') pCol = '007fff';
						else pCol = '000000';
					} else if (acc.isContributor) {
						type = 'Contributor';
						pCol = '008080';
					} else if (acc.wins + acc.losses > 50) {
						type = 'Experienced';
						pCol = 'ffffff'; // colFromElo(acc.eloOverall);
					} else {
						type = 'Inexperienced';
						pCol = '777777';
					}
					return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#${pCol}">
		<meta content="${acc.username}" property="og:title">
		<meta content="Games: ${acc.wins + acc.losses}
Overall Elo: ${acc.eloOverall.toFixed(0)}
Seasonal Elo: ${acc.eloSeason.toFixed(0)}
Win Rate: ${(acc.wins / (acc.wins + acc.losses) * 100).toFixed(0)}%" property="og:description">
		<meta content="${type}" property="og:site_name">
		<meta content="/genimg/?prof=${acc.username}&time=${Date.now()}" property="og:image">
	</head>
</html>`);
				});
				return;
			}
			if (page.startsWith('table/')) {
				const game = games[page.substring(6)];
				if (!game) return res.status(404).send();
				return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="${game.general.name}" property="og:title">
		<meta content="${game.general.uid}" property="og:site_name">
		<meta content="/genimg/?game=${game.general.uid}&time=${Date.now()}" property="og:image">
		<meta name="twitter:card" content="summary_large_image">
	</head>
</html>`);
			}
			if (page.startsWith('replay/')) {
				// fetch basic replay info
				return res.status(404).send();
				return res.status(200).send(`<!DOCTYPE HTML>
<html>
	<head>
		<meta name="theme-color" content="#ff6644">
		<meta content="${name}" property="og:title">
		<meta content="${uid}" property="og:site_name">
		<meta content="/genimg/?repl=${uid}&time=${Date.now()}" property="og:image">
		<meta name="twitter:card" content="summary_large_image">
	</head>
</html>`);
			}
			console.log(`Unknown game page: ${page}`);
			return res.status(404).send();
		}
		console.log(`Unknown page: ${page}`);
		return res.status(403).send();
	}
	next();
});

const sessionSettings = {
	secret: process.env.SECRETSESSIONKEY,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 28 // 4 weeks
	},
	store,
	resave: true,
	saveUninitialized: true
};

io.use(
	socketSession(session(sessionSettings), {
		autoSave: true
	})
);

app.use(session(sessionSettings));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(Account.authenticate()));

if (process.env.DISCORDCLIENTID) {
	passport.use(
		new DiscordStrategy(
			{
				clientID: process.env.DISCORDCLIENTID,
				clientSecret: process.env.DISCORDCLIENTSECRET,
				callbackURL: '/discord/login-callback',
				scope: ['identify', 'email']
			},
			(accessToken, refreshToken, profile, cb) => {
				cb(profile);
			}
		)
	);

	passport.use(
		new GithubStrategy(
			{
				clientID: process.env.GITHUBCLIENTID,
				clientSecret: process.env.GITHUBCLIENTSECRET,
				callbackURL: '/github/login-callback'
			},
			(accessToken, refreshToken, profile, cb) => {
				cb(profile);
			}
		)
	);
} else {
	console.error('WARN: No oauth client data in .env');
}

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

routesIndex();
