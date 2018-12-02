const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account');
const VerifyAccount = require('../models/verifyAccount');
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

module.exports.setVerifyRoutes = () => {
	const now = new Date();

	app.get('/verify-account/:username/:token', ensureAuthenticated, (req, res, next) => {
		const { username, token } = req.params;

		VerifyAccount.findOneAndDelete({ username, token, expirationDate: { $gte: now } }, (err, verify) => {
			if (err) {
				console.log(err, 'error in verifyaccount');
				return next();
			}

			if (verify) {
				Account.findOne({ username }, (err, account) => {
					if (err) {
						console.log(err, 'error in account in verify');
					}

					if (err || !account) {
						return next();
					}

					account.verified = true;
					account.save(() => {
						res.redirect('/account');
					});
				});
			}
		});
	});

	VerifyAccount.deleteMany({ expirationDate: { $lt: now } }, err => {
		if (err) {
			console.log(err, 'err deleting verify accounts');
		}
	});
};

module.exports.sendVerifyToken = (username, email, res) => {
	const token = `${Math.random()
		.toString(36)
		.substring(2)}${Math.random()
		.toString(36)
		.substring(2)}`;
	const verify = new VerifyAccount({
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

	verify.save(() => {
		nmMailgun.sendMail({
			from: 'SH.io accounts <donotreply@secrethitler.io>',
			html: template({ username, token }),
			text: `Hello ${username}, an account has been created with this email address - go to the address below to verify your account. You will need to be logged in for verification. https://secrethitler.io/verify-account/${username}/${token}.`,
			to: email,
			subject: 'SH.io - verify your account'
		});

		if (res) {
			res.send();
		}
	});
};
