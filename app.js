const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const socketSession = require('express-socket.io-session');
const passport = require('passport');
const mongoose = require('mongoose');
const compression = require('compression');
const Strategy = require('passport-local').Strategy;
const Account = require('./models/account');
const routesIndex = require('./routes/index');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
	uri: 'mongodb://localhost:27017/secret-hitler-app',
	collection: 'sessions'
});

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

io.use(
	socketSession(
		session({
			secret: process.env.SECRETSESSIONKEY,
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
			},
			store,
			resave: true,
			saveUninitialized: true
		}),
		{
			autoSave: true
		}
	)
);

app.use(
	require('express-session')({
		secret: process.env.SECRETSESSIONKEY,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 28 // 4 weeks
		},
		store,
		resave: true,
		saveUninitialized: true
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Strategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
mongoose.connect(
	`mongodb://localhost:27017/secret-hitler-app`,
	{ useNewUrlParser: true }
);
mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;

routesIndex();
