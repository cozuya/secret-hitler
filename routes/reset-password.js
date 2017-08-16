const passport = require('passport'), // eslint-disable-line no-unused-vars
	Account = require('../models/account'),
	nodemailer = require('nodemailer'),
	mg = require('nodemailer-mailgun-transport'),
	_ = require('lodash'),
	fs = require('fs'),
	template = _.template(
		fs.readFileSync('./routes/reset-password-email.template', {
			encoding: 'UTF-8'
		})
	);

let tokens = [];

module.exports = {
	setRoutes() {
		Account.find(
			{ 'resetPassword.resetTokenExpiration': { $gte: new Date() } },
			(err, accounts) => {
				if (err) {
					console.log(err);
				}

				tokens = accounts.map(account => ({
					username: account.username,
					token: account.verification.verificationToken,
					expires: account.verification.verificationTokenExpiration
				}));
			}
		);

		app.get('/reset-password/:user/:token', (req, res, next) => {
			const token = tokens.find(toke => toke.token === req.params.token);

			if (token && token.expires >= new Date()) {
				res.render('');

				Account.findOne({ username: token.username }, (err, account) => {
					if (err) {
						console.log(err);
					}

					account.resetPassword.resetTokenExpiration = null;
					account.save(() => {
						res.render('/reset-password', { username: token.username });
						tokens.splice(
							tokens.findIndex(toke => toke.token === req.params.token),
							1
						);
					});
				});
			} else {
				next();
			}
		});
	},
	sendToken(email, res) {
		Account.findOne({ 'verification.email': email }, (err, account) => {
			if (err) {
				console.log(err);
			}

			if (account) {
				const tomorrow = new Date(),
					{ username } = account,
					token = `${Math.random()
						.toString(36)
						.substring(2)}${Math.random().toString(36).substring(2)}`,
					nmMailgun = nodemailer.createTransport(
						mg({
							auth: {
								api_key: process.env.MGKEY,
								domain: 'todo'
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

				nmMailgun.sendMail(
					{
						from: 'Secret Hitler <admin@todo>',
						// to: account.verification.email,
						to: 'todo@mailinator.com',
						subject: 'Secret Hitler - reset your password',
						'h:Reply-To': 'chris.v.ozols@gmail.com',
						html: template({ username, token })
					},
					err => {
						if (err) {
							console.log(err);
						}
					}
				);

				account.save(() => {
					res.send();
				});
			} else {
				res.status(401).send();
			}
		});
	}
};
