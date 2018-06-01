function main() {
	const { obfIP, obfBlock } = require('../routes/socket/ip-obfuscator-v4');

	// Basic functionality test, doubles as a collision test due to how it works
	for (let a = 0; a <= 255; a++) {
		for (let b = 1; b <= 4; b++) {
			const obf = obfBlock('' + a, b);
			if (a !== obfBlock(obf, b)) {
				console.log('OBF FAILURE');
				console.log('Input: ' + a + ', Obf: ' + obf + ', Deobf: ' + obfBlock(obf, b) + ', Block: ' + b);
				return;
			}
		}
	}

	// Everything works - manual IP entry
	let stdin = process.openStdin();
	stdin.addListener('data', function(IP) {
		try {
			console.log(obfIP(IP.toString().trim()));
		} catch (e) {
			console.log(e);
		}
		console.log();
	});
}
main();
