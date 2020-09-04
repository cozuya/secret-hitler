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
