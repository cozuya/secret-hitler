const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account');
const _ = require('lodash');
const fs = require('fs');
const emailjs = require('emailjs');
const template = _.template(
	fs.readFileSync('./routes/account-verification-email.template', {
		encoding: 'UTF-8'
	})
);
// Keep one reference of the server, so that send calls are async.
const email_server = emailjs.server.connect({
	host: 'smtp.gmail.com',
	ssl: true,
	user: `${process.env.EMAIL_USER}`,
	password: `${process.env.EMAIL_PASS}`
});

const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
};

let tokens = [];

module.exports = {
	setRoutes() {
		Account.find({ 'verification.verificationTokenExpiration': { $gte: new Date() } }, (err, accounts) => {
			if (err) {
				console.log(err);
			}

			tokens = accounts.map(account => ({
				username: account.username,
				token: account.verification.verificationToken,
				expires: account.verification.verificationTokenExpiration
			}));
		});

		app.get('/verify-account/:user/:token', ensureAuthenticated, (req, res, next) => {
			const token = tokens.find(toke => toke.token === req.params.token);

			if (token && token.expires >= new Date() && req.user.username === req.params.user) {
				Account.findOne({ username: token.username }, (err, account) => {
					if (err) {
						console.log(err);
					}

					account.verified = true;
					account.verification.verificationTokenExpiration = null;
					account.save(() => {
						res.redirect('/account');
						tokens.splice(tokens.findIndex(toke => toke.token === req.params.token), 1);
					});
				});
			} else {
				next();
			}
		});
	},
	sendToken(username, email, res) {
		Account.findOne({ username }, (err, account) => {
			if (err) {
				console.log(err);
			}

			const tomorrow = new Date();
			const token = `${Math.random()
				.toString(36)
				.substring(2)}${Math.random()
				.toString(36)
				.substring(2)}`;

			tomorrow.setDate(tomorrow.getDate() + 1);
			account.verification.email = email;
			account.verification.verificationToken = token;
			account.verification.verificationTokenExpiration = tomorrow;
			tokens.push({
				username,
				token,
				expires: tomorrow
			});

			const message = emailjs.message.create({
				from: `secrethitler.io <${process.env.EMAIL_USER}>`,
				to: email,
				subject: 'Secret Hitler IO - verify your account',
				attachment: [{ data: template({ username, token }), alternative: true }]
			});
			email_server.send(message, function(err, message) {
				if (err) console.log(err);
				else {
					if (res) res.send('ok');
					account.save(() => {
						if (res) {
							res.send();
						}
					});
				}
			});
		});
	}
};
