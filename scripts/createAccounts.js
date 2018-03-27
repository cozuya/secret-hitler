const fs = require('fs');
const path = require('path');
const http = require('http');

const options = {
	method: 'POST',
	hostname: 'localhost',
	port: '8080',
	path: '/account/signup',
	headers: {
		'content-type': 'application/json; charset=UTF-8'
	}
};

const createUser = function(username) {
	const req = http.request(options, function(res) {
		var chunks = [];

		res.on('data', function(chunk) {
			chunks.push(chunk);
		});

		res.on('end', function() {
			var body = Buffer.concat(chunks);

			if (res.statusCode == 200) {
				console.log(`Successfully created ${username}`);
			} else if (res.statusCode == 401) {
				console.warn(`${username} already exists`);
			} else {
				console.error(`${username} returned error code ${res.statusCode}`);
			}
		});
	});
	req.write(`{\"username\":\"${username}\",\"password\":\"snipsnap\",\"password2\":\"snipsnap\",\"isPrivate\":false}`);
	req.end();
};

const filePath = path.join(__dirname, '..', 'src', 'frontend-scripts', 'components', 'section-main', 'Defaultmid.jsx');
const fileString = fs.readFileSync(filePath, 'utf8');

const nameRegex = /data-name="([A-z]+)" className="loginquick">/g;

console.log('Creating accounts in MongoDB.  May give errors for repeated runs.');
var m;
while ((m = nameRegex.exec(fileString))) {
	createUser(m[1]);
}
