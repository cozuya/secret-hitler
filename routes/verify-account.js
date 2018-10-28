const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const _ = require('lodash');
const fs = require('fs');
const template = _.template(
	fs.readFileSync('./routes/account-verification-email.template', {
		encoding: 'UTF-8'
	})
);

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
			const nmMailgun = nodemailer.createTransport(
				mg({
					auth: {
						api_key: process.env.MGKEY,
						domain: process.env.MGDOMAIN
					}
				})
			);

			tomorrow.setDate(tomorrow.getDate() + 1);
			account.verification.email = email;
			account.verification.verificationToken = token;
			account.verification.verificationTokenExpiration = tomorrow;
			tokens.push({
				username,
				token,
				expires: tomorrow
			});

			nmMailgun.sendMail({
				from: 'SH.io accounts <donotreply@secrethitler.io>',
				html: template({ username, token }),
				text: `Hello ${username}, an account has been created with this email address - go to the address below to verify your account. You will need to be logged in for verification. https://secrethitler.io/verify-account/${username}/${token}.`,
				to: email,
				subject: 'SH.io - verify your account'
			});

			account.save(() => {
				if (res) {
					res.send();
				}
			});
		});
	}
};
