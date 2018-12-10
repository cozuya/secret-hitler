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
const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/secret-hitler-app',
	collection: 'sessions'
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
