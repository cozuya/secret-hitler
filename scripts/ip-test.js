function main() {
	const obfBlock = require('../routes/socket/ip-obfuscator-v4').obfBlock;
	const obfBlock2 = require('../routes/socket/ip-obfuscator-v6').obfBlock;
	const obfTrue = require('../routes/socket/ip-obf').obfIP;
	const convertToHex = val => {
		let output = '';
		for (let a = 0; a < 4; a++) {
			let sub = val % 16;
			val = Math.floor(val / 16);
			if (sub === 10) sub = 'a';
			if (sub === 11) sub = 'b';
			if (sub === 12) sub = 'c';
			if (sub === 13) sub = 'd';
			if (sub === 14) sub = 'e';
			if (sub === 15) sub = 'f';
			output = sub + output;
		}
		return output;
	};

	// Basic functionality test, doubles as a collision test due to how it works (IPv4)
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

	// Basic functionality test, doubles as a collision test due to how it works (IPv6)
	for (let a = 0; a <= 16 * 16 * 16 * 16; a++) {
		const val = convertToHex(a);
		const obf = obfBlock2(val);
		if (val !== obfBlock2(obf)) {
			console.log('OBF FAILURE');
			console.log('Input: ' + val + ', Obf: ' + obf + ', Deobf: ' + obfBlock2(obf));
			return;
		}
	}

	// Everything works - manual IP entry
	console.log('Passed tests, enter IPs to see results.\n');
	const stdin = process.openStdin();
	stdin.addListener('data', function(IP) {
		try {
			console.log(obfTrue(IP.toString().trim()));
		} catch (e) {
			console.log(e);
		}
		console.log();
	});
}
main();
