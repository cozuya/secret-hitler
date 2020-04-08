const EMAIL_USER = 'REDACT';
const EMAIL_PASS = 'REDACT';
const EMAIL_TARGET = 'REDACT';

const _ = require('lodash');
const fs = require('fs');
const emailjs = require('emailjs');
const template = _.template(
	fs.readFileSync('../routes/account-verification-email.template', {
		encoding: 'UTF-8',
	})
);
// Keep one reference of the server, so that send calls are async.
const email_server = emailjs.server.connect({
	host: 'smtp.gmail.com',
	ssl: true,
	user: `${EMAIL_USER}`,
	password: `${EMAIL_PASS}`,
});

const tomorrow = new Date();
const token = `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

tomorrow.setDate(tomorrow.getDate() + 1);

const message = emailjs.message.create({
	from: `secrethitler.io <${EMAIL_USER}>`,
	to: `${EMAIL_TARGET} <${EMAIL_TARGET}>`,
	subject: 'Secret Hitler IO - verify your account',
	attachment: [{ data: template({ username: 'TestUser', token }), alternative: true }],
});
email_server.send(message, function (err, message) {
	if (err) console.log(err);
	else console.log('ok');
});
