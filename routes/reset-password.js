const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const _ = require('lodash');
const fs = require('fs');
const template = _.template(
	fs.readFileSync('./routes/reset-password-email.template', {
		encoding: 'UTF-8'
	})
);

let tokens = [];

module.exports = {
	setRoutes() {
		Account.find({ 'resetPassword.resetTokenExpiration': { $gte: new Date() } }, (err, accounts) => {
			if (err) {
				console.log(err);
			}

			tokens = accounts.map(account => ({
				username: account.username,
				token: account.verification.verificationToken,
				expires: account.verification.verificationTokenExpiration
			}));
		});

		app.get('/password-reset/:user/:token', (req, res, next) => {
			const token = tokens.find(toke => toke.token === req.params.token);

			if (token && token.expires >= new Date()) {
				Account.findOne({ username: token.username }, (err, account) => {
					if (err) {
						console.log(err);
					}

					account.resetPassword.resetTokenExpiration = null;
					account.save(() => {
						res.render('page-resetpassword', {});
						tokens.splice(tokens.findIndex(toke => toke.token === req.params.token), 1);
					});
				});
			} else {
				next();
			}
		});

		app.post('/password-reset/', (req, res, next) => {
			console.log(req.body, 'body');
			// const token = tokens.find(toke => toke.token === req.params.token);
		});
	},
	sendToken(email, res) {
		Account.findOne({ 'verification.email': email }, (err, account) => {
			if (err) {
				console.log(err);
			}

			if (account) {
				const tomorrow = new Date();
				const { username } = account;
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
				account.resetPassword.resetToken = token;
				account.resetPassword.resetTokenExpiration = tomorrow;
				tokens.push({
					username,
					token,
					expires: tomorrow
				});

				nmMailgun.sendMail({
					from: 'SH.io accounts <donotreply@secrethitler.io>',
					html: template({ username, token }),
					text: `Hello ${username}, a request has been made to change your password - go to the address below to change your password. https://secrethitler.io/reset-password/${username}/${token}.`,
					to: email,
					subject: 'SH.io - reset your password'
				});

				account.save(() => {
					res.send();
				});
			} else {
				res.status(401).send();
			}
		});
	}
};
