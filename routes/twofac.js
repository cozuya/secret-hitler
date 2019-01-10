const crypto = require('crypto');
const qr = require('qrcode');
const mask = parseInt('7fffffff', 16);

function leftPad(str, len, pad) {
	if (str.length >= len) return str;
	return Array(len+1-str.length).join(pad) + str;
}

const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32to16(base32) {
	let bits = '';
	let hex = '';
	for (let i = 0; i < base32.length; i++) {
		let val = base32chars.indexOf(base32.charAt(i));
		if (val === -1) return 'bad char';
		bits += leftPad(val.toString(2), 5, '0');
	}
	for (let i = 0; i+4 <= bits.length; i+=4) {
		hex = hex + parseInt(bits.substr(i, 4), 2).toString(16);
	}
	return hex;
}

// given a base32 key, get four time-based codes (uses default totp options: 30s inverval, SHA1 algorithm, 6 digits)
module.exports.getCodes = (key) => {
	if (key.length != 16) return 'bad key';
	const key16 = base32to16(key);
	if (key16 === 'bad char') return 'bad key';
	const now = Math.floor(Date.now() / 30000.0);
	const keys = [];
	for (let i = -2; i < 2; i++) {
		const hmac = crypto.createHmac('sha1', Buffer.from(key16, 'hex')).update(Buffer.from(leftPad((now+i).toString(16), 16, '0'), 'hex')).digest('hex');
		const off = parseInt(hmac.substring(hmac.length-1), 16);
		keys[i+2] = (parseInt(hmac.substring(off*2, off*2+8), 16) & mask) % 1000000;
	}
	return keys;
};

// create a new base32 key, and a QR code for it
module.exports.genQR = (user, callback) => {
	let key = '';
	for (let i = 0; i < 16; i++) key += base32chars.charAt(Math.floor(Math.random() * 32));
	qr.toDataURL(`otpauth://totp/${user}?secret=${key}&issuer=secrethitler.io`, { errorCorrectionLevel: 'L' }, (err, data) => {
		if (err) callback(err);
		else callback(null, [key, data]);
	});
};

// verify a code for a given base32 key
module.exports.checkCode = (key, code) => {
	if (code.length !== 6) return false;
	const codeInt = parseInt(code);
	if (isNaN(codeInt) || codeInt < 0 || codeInt > 999999) return false;
	const codes = module.exports.getCodes(key);
	if (codes == 'bad key') return false;
	return codes[0] === codeInt || codes[1] === codeInt || codes[2] === codeInt || codes[3] === codeInt;
};
