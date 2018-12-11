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
const Account = require('./models/account');
const routesIndex = require('./routes/index');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const { expandAndSimplify } = require('./routes/socket/ip-obf');
const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/secret-hitler-app',
	collection: 'sessions'
});

// This rate limits IPs to bursts of 5 requests, and replenishes the buffer at a rate of 2 per second.
// This limiter applies to ALL requests, so 429 handling should be added to the client.
// It also assigns req.expandedIP for anything that gets through, which can be used to get the IP in a simpler fashion.
// For ordinary players, this should hopefully never be tripped. For malicious users, it should start to throttle them.
// Note: The data cache is currently not cleared, there should be something running on a 1 minute timer clearing out old entries.
const rateLimitInfo = {};
const incrementRateLimit = (IP, str) => {
	const now = Date.now();
	if (!rateLimitInfo[IP]) rateLimitInfo[IP] = [5, now];
	const data = rateLimitInfo[IP];

	const since = now - data[1];
	data[1] = now;

	// replenish buffer
	data[0] += since / 500;
	if (data[0] > 5) data[0] = 5;

	// apply penalty
	data[0] -= str;
	if (data[0] < -10) data[0] = -10;

	return data[0];
};
app.use(function(req, res, next) {
	const IP = expandAndSimplify(
		req.headers['x-real-ip'] || req.headers['X-Real-IP'] || req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
	);
	let str = 1; // default allowance - allow a burst of 5
	if (req.originalUrl.startsWith('/images/custon-cardbacks/')) str = 0.05; // cardbacks - allow a burst of 100
	if (req.originalUrl.startsWith('/public/images/') || req.originalUrl.startsWith('/images/')) str = 0.25; // tracks and such - allow a burst of 20
	const val = incrementRateLimit(IP, str);
	if (val < 0) {
		res.status(429);
		res.setHeader('Retry-After', 5);
		res.end();
	} else {
		req.expandedIP = IP;
		next();
	}
});

app.setMaxListeners(0);
io.setMaxListeners(0);
// require('events').EventEmitter.defaultMaxListeners = 0;

process.on('warning', e => console.warn(e.stack));

store.on('error', err => {
	console.log(err, 'store session error');
});

app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
app.locals.pretty = true;
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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
} else console.error('WARN: No discord client data in .env');

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
mongoose.connect(
	`mongodb://localhost:27017/secret-hitler-app`,
	{ useNewUrlParser: true }
);
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

routesIndex();
