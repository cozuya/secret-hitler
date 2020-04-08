const https = require('https');

const makeReport = () => {
	const report = JSON.stringify({
		username: 'Totally a real report',
		text: `Don't mind me, I'm just testing out slack formatting to have a nice table...\nSeriously, ignore this.`,
		attachments: [
			{
				fields: [
					{
						title: 'Seat 1',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 2',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 3',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 4',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 5',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 6',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 7',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 8',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 9',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
					{
						title: 'Seat 10',
						value: 'SomePlayer\nLiberal',
						short: true,
					},
				],
			},
		],
	});
	const options = {
		hostname: 'discordapp.com',
		path: process.env.DISCORDREPORTURL + '/slack',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(report),
		},
	};

	console.log('Sending...');
	try {
		const req = https.request(options, (res) => {
			console.log('statusCode:', res.statusCode);
			res.on('data', (d) => {
				process.stdout.write(d);
			});
		});
		req.on('error', (e) => {
			console.error(e);
		});
		req.end(report);
	} catch (e) {
		console.log(e);
	}
};

makeReport();
