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
