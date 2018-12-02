const passport = require('passport'); // eslint-disable-line no-unused-vars
const ResetPassword = require('../models/resetPassword');
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

module.exports.setResetRoutes = () => {
	const now = new Date();

	app.get('/password-reset/:username/:token', (req, res, next) => {
		const { username, token } = req.params;

		ResetPassword.findOneAndDelete({ username, token, expirationDate: { $gte: now } }, (err, reset) => {
			if (err) {
				console.log(err, 'err in reset password get');
				return next();
			}

			if (reset) {
				res.render('page-resetpassword', {});
			} else {
				return next();
			}
		});
	});

	ResetPassword.deleteMany({ expirationDate: { $lt: now } }, err => {
		if (err) {
			console.log(err, 'err deleting verify accounts');
		}
	});

	app.post('/password-reset', (req, res, next) => {
		const { username, password, password2, tok } = req.body;

		if (password !== password2 || !tok || password.length < 6 || password.length > 255) {
			res.status(400).send();
			return next();
		}

		ResetPassword.findOneAndDelete({ username, token: tok, expirationDate: { $gte: now } }, (err, reset) => {
			if (err) {
				console.log(err, 'err in reset password post');
			}

			if (err || !reset) {
				res.status(400).send();
				return next();
			}

			Account.findOne({ username: req.body.username }, (err, account) => {
				if (err || !account || account.staffRole) {
					res.status(404).send();
					return next();
				}

				account.setPassword(password, () => {
					account.save(() => {
						req.logIn(account, () => {
							res.send();
						});
					});
				});
			});
		});
	});
};

module.exports.sendResetToken = (username, email, res) => {
	const token = `${Math.random()
		.toString(36)
		.substring(2)}${Math.random()
		.toString(36)
		.substring(2)}`;
	const reset = new ResetPassword({
		username,
		token,
		expirationDate: new Date(new Date().setDate(new Date().getDate() + 1))
	});
	const nmMailgun = nodemailer.createTransport(
		mg({
			auth: {
				api_key: process.env.MGKEY,
				domain: process.env.MGDOMAIN
			}
		})
	);

	reset.save(() => {
		nmMailgun.sendMail({
			from: 'SH.io accounts <donotreply@secrethitler.io>',
			html: template({ username, token }),
			text: `Hello ${username}, a request has been made to change your password - go to the address below to change your password. https://secrethitler.io/reset-password/${username}/${token}.`,
			to: email,
			subject: 'SH.io - reset your password'
		});
		res.send();
	});
};
