const fs = require('fs');
const PNG = require('pngjs').PNG;

test('all emote images are 28x28', done => {
	fs.readdirSync(`public/images/emotes`, { withFileTypes: true }).forEach(file => {
		if (file.name.endsWith('.png')) {
			const img = PNG.sync.read(fs.readFileSync(`public/images/emotes/${file.name}`));
			if (img.width !== 28 || img.height !== 28) {
				done.fail(`Emote ${file.name} should be 28x28`);
			}
		}
	});
	done();
});

test('all emote filenames are valid', done => {
	fs.readdirSync(`public/images/emotes`, { withFileTypes: true }).forEach(file => {
		if (file.isFile()) {
			if (file.name.charAt(0) !== file.name.charAt(0).toUpperCase()) {
				done.fail(`Emote ${file.name} should begin with an uppercase letter`);
			}
			if (!file.name.endsWith('.png')) {
				done.fail(`Emote ${file.name} is an invalid file type. Only PNG files are allowed.`);
			}
		}
	});
	done();
});
