const passport = require('passport'); // eslint-disable-line no-unused-vars
const Account = require('../models/account');
const VerifyAccount = require('../models/verifyAccount');
const ResetPassword = require('../models/resetPassword');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const _ = require('lodash');
const fs = require('fs');
const verifyTemplate = _.template(
	fs.readFileSync('./routes/account-verification-email.template', {
		encoding: 'UTF-8'
	})
);
const resetTemplate = _.template(
	fs.readFileSync('./routes/reset-password-email.template', {
		encoding: 'UTF-8'
	})
);

const ensureAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
};

module.exports.verifyRoutes = () => {
	const now = new Date();

	app.get('/verify-account/:username/:token', ensureAuthenticated, (req, res, next) => {
		const { username, token } = req.params;

		VerifyAccount.findOneAndDelete({ username, token, expirationDate: { $gte: now } })
			.then(verify => {
				Account.findOne({ username })
					.then(account => {
						if (!account) {
							return next();
						}

						account.verified = true;
						account.save(() => {
							res.redirect('/account');
						});
					})
					.catch(err => {
						console.log(err, 'error in account in verify');
						return next();
					});
			})
			.catch(err => {
				console.log(err, 'err in verify get');
				return next();
			});
	});

	app.get('/reset-password/:username/:token', (req, res, next) => {
		const { username, token } = req.params;

		ResetPassword.findOne({ username, token, expirationDate: { $gte: now } })
			.then(reset => {
				if (!reset) {
					return next();
				}
				res.render('page-resetpassword', {});
			})
			.catch(err => {
				console.log(err, 'err in reset password get');
				return next();
			});
	});

	app.post('/password-reset', (req, res, next) => {
		const { username, password, password2, tok } = req.body;

		if (password !== password2 || !tok || password.length < 6 || password.length > 255) {
			res.status(400).send();
			return next();
		}

		ResetPassword.findOneAndDelete({ username, token: tok, expirationDate: { $gte: now } })
			.then(reset => {
				if (!reset) {
					res.status(400).send();
				} else {
					Account.findOne({ username: req.body.username })
						.then(account => {
							if (!account || account.staffRole) {
								res.status(404).send();
							} else {
								account.setPassword(password, () => {
									account.save(() => {
										req.logIn(account, () => {
											res.send();
										});
									});
								});
							}
						})
						.catch(err => {
							console.log(err, 'err in reset password find');
						});
				}
			})
			.catch(err => {
				console.log(err, 'err in reset password post');
			});
	});

	VerifyAccount.deleteMany({ expirationDate: { $lt: now } }, err => {
		if (err) {
			console.log(err, 'err deleting verify accounts');
		}
	});

	ResetPassword.deleteMany({ expirationDate: { $lt: now } }, err => {
		if (err) {
			console.log(err, 'err deleting reset password');
		}
	});
};

module.exports.setVerify = ({ username, email, res, isResetPassword }) => {
	const token = `${Math.random()
		.toString(36)
		.substring(2)}${Math.random()
		.toString(36)
		.substring(2)}`;
	const modelData = {
		username,
		token,
		expirationDate: new Date(new Date().setDate(new Date().getDate() + 1))
	};
	const verify = isResetPassword ? new ResetPassword(modelData) : new VerifyAccount(modelData);
	const nmMailgun = nodemailer.createTransport(
		mg({
			auth: {
				api_key: process.env.MGKEY,
				domain: process.env.MGDOMAIN
			}
		})
	);

	verify.save(() => {
		// console.log(`localhost:8080/${isResetPassword ? 'reset-password' : 'verify-account'}/${username}/${token}`);

		nmMailgun.sendMail({
			from: 'SH.io accounts <donotreply@secrethitler.io>',
			html: isResetPassword ? resetTemplate({ username, token }) : verifyTemplate({ username, token }),
			text: isResetPassword
				? `Hello ${username}, a request has been made to change your password - go to the address below to change your password. https://secrethitler.io/reset-password/${username}/${token}.`
				: `Hello ${username}, a request has been made to verify your account - go to the address below to verify it. https://secrethitler.io/verify-account/${username}/${token}`,
			to: email,
			subject: isResetPassword ? 'SH.io - reset your password' : 'SH.io - verify your account'
		});

		// nmMailgun.sendMail({
		// 	from: 'Secret Hitler.io <donotreply@secrethitler.io>',
		// 	html: isResetPassword ? resetTemplate({ username, token }) : verifyTemplate({ username, token }),
		// 	to: email,
		// 	subject: 'Secret Hitler IO - verify your account',
		// 	'h:Reply-To': 'chris.v.ozols@gmail.com'
		// });

		if (res) {
			res.send();
		}
	});
};
