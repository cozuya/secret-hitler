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
const { expandAndSimplify } = require('./routes/socket/ip-obf');

// This rate limits IPs to bursts of 5 requests, and replenishes the buffer at a rate of 2 per second.
// This limiter applies to ALL requests, so 429 handling should be added to the client.
// It also assigns req.expandedIP for anything that gets through, which can be used to get the IP in a simpler fashion.
// For ordinary players, this should hopefully never be tripped. For malicious users, it should start to throttle them.
// Note: The data cache is currently not cleared, there should be something running on a 1 minute timer clearing out old entries.

const burstLimit = 5; // Number of requests before throttling.
const negativeLimit = -10; // Number of throttled requests before it stops being counted.
const replenishRate = 2; // How many requests per second are added back.

const errorPage = `
<html>
	<meta http-equiv="refresh" content="5">
	<head>
		<title>Too Many Requests</title>
	</head>
	<body>
		Too many requests are being sent by your connection.
		<br>
		This page will auto-refresh in 5 seconds.
	</body>
</html>
`;

const rateLimitInfo = {};
const incrementRateLimit = (IP, str) => {
	const now = Date.now();
	if (!rateLimitInfo[IP]) rateLimitInfo[IP] = [burstLimit, now];
	const data = rateLimitInfo[IP];

	const since = now - data[1];
	data[1] = now;

	// replenish buffer
	data[0] += (since / 1000) * replenishRate;
	if (data[0] > burstLimit) data[0] = burstLimit;

	// apply penalty
	data[0] -= str;
	if (data[0] < negativeLimit) data[0] = negativeLimit;

	return data[0];
};
app.use(function(req, res, next) {
	const IP = expandAndSimplify(
		req.headers['x-real-ip'] || req.headers['X-Real-IP'] || req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
	);
	let str = 1; // default allowance - allow a burst of 5
	if (req.originalUrl.startsWith('/images/emotes/') || req.originalUrl.startsWith('/images/custom-cardbacks/')) str = 0.05; // cardbacks and emotes - allow a burst of 100
	if (req.originalUrl.startsWith('/public/images/') || req.originalUrl.startsWith('/images/')) str = 0.25; // tracks and such - allow a burst of 20
	const val = incrementRateLimit(IP, str);
	if (val < 0) {
		res.status(429);
		res.setHeader('Retry-After', negativeLimit / replenishRate);
		res.send(errorPage);
	} else {
		req.expandedIP = IP;
		next();
	}
});

app.setMaxListeners(0);
io.setMaxListeners(0);
// require('events').EventEmitter.defaultMaxListeners = 0;

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
		ttl: 260
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
mongoose.connect(
	`mongodb://localhost:27017/secret-hitler-app`,
	{ useNewUrlParser: true }
);
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

routesIndex();
