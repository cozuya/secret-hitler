const twofac = require('../routes/twofac');

// must be 16 long and base32 (A-Z,2-7), will be randomly generated for any given user
// note: implementation assumes uppercase
const key = 'ORSXG5BSGM2DK5DF';

// returns codes for the key above
console.log(twofac.getCodes(key));

// generate a random key
twofac.genQR('testuser', (err, data) => {
	if (err) console.log(err);
	else {
		// base32 key
		console.log(data[0]);

		// get codes for the key
		const codes = twofac.getCodes(data[0]);
		console.log(codes);

		// should always return true
		console.log(`Valid: ${twofac.checkCode(data[0], codes[2])}`);

		// the QR code data url
		console.log(data[1]);
	}
});
