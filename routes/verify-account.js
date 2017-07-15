const passport = require('passport'),  // eslint-disable-line no-unused-vars
	Account = require('../models/account'),
	nodemailer = require('nodemailer'),
	mg = require('nodemailer-mailgun-transport'),
	_ = require('lodash'),
	fs = require('fs'),
	template = _.template(fs.readFileSync('./routes/account-verification-email.template', {encoding: 'UTF-8'}));

let tokens = [];

module.exports = {
	setRoutes() {
		Account.find({'verification.verificationTokenExpiration': {$gte: new Date()}}, (err, accounts) => {
			if (err) {
				console.log(err);
			}

			tokens = accounts.map(account => ({
				username: account.username,
				token: account.verification.verificationToken,
				expires: account.verification.verificationTokenExpiration
			}));
		});

		app.get('/verify-account/:user/:token', (req, res, next) => {
			const token = tokens.find(toke => toke.token === req.params.token);

			if (token && token.expires >= new Date() && req.user.username === req.params.user) {
				Account.findOne({username: token.username}, (err, account) => {
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
	sendToken(username, email) {
		Account.findOne({username}, (err, account) => {
			if (err) {
				console.log(err);
			}

			const tomorrow = new Date(),
				token = `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
				nmMailgun = nodemailer.createTransport(mg({
					auth: {
						api_key: process.env.MGKEY,
						domain: 'todo'
					}
				}));

			tomorrow.setDate(tomorrow.getDate() + 1);
			account.verification.verificationToken = token;
			account.verification.verificationTokenExpiration = tomorrow;
			tokens.push({
				username,
				token,
				expires: tomorrow
			});

			nmMailgun.sendMail({
				from: 'Secret Hitler <admin@todo>',
				html: template({username, token}),
				// to: email,
				// html: `<a href="https://todo/verify-account/${username}/${token}">click here</a>`
				to: 'todo@mailinator.com',
				subject: 'Secret Hitler - confirm your account',
				'h:Reply-To': 'chris.v.ozols@gmail.com'
			}, err => {
				if (err) {
					console.log(err);
				}
			});

			account.save();
		});
	}
};