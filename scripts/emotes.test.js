const fs = require('fs');

test('all emote filenames are valid', done => {
	fs.readdirSync(`public/images/emotes`, { withFileTypes: true }).forEach(file => {
		if (file.isFile()) {
			if (file.name !== file.name.toLowerCase()) {
				done.fail(`Emote ${file.name} should have a lowercase name`);
			}
			if (!file.name.endsWith('.png')) {
				done.fail(`Emote ${file.name} is an invalid file type. Only PNG files are allowed.`);
			}
		}
	});
	done();
});
