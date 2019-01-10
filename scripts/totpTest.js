const crypto = require('crypto');

// must be 16 long and Base32, randomly generated for any given user
const key = 'ORSXG5BSGM2DK5DF';

function leftPad(str, len, pad) {
	if (str.length >= len) return str;
	return Array(len+1-str.length).join(pad) + str;
}

function base32to16(base32) {
	let base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = '';
	let hex = '';
	for (let i = 0; i < base32.length; i++) {
		let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
		bits += leftPad(val.toString(2), 5, '0');
	}
	for (let i = 0; i+4 <= bits.length; i+=4) {
		hex = hex + parseInt(bits.substr(i, 4), 2).toString(16);
	}
	return hex;
}

const getTime = () => {
	// 8 bytes time value in base16
	return Math.floor(Date.now() / 30000.0);
};

const doHmac = (key, time) => {
	// key must be 10 bytes
	return crypto.createHmac('sha1', Buffer.from(key, 'hex')).update(Buffer.from(time, 'hex')).digest('hex');
};

const hmacToTotp = (hmac) => {
	let off = parseInt(hmac.substring(hmac.length-1), 16);
	let part = hmac.substring(off*2, off*2+8);
	let code = (parseInt(part, 16) & parseInt('7fffffff', 16)) % 1000000;
	return leftPad(`${code}`, 6, '0');
};

const getCodes = (key, before, after) => {
	const keyHex = base32to16(key);
	const t = getTime();
	const keys = [];
	for (let i = -before; i <= after; i++) {
		keys[i+before] = hmacToTotp(doHmac(keyHex, leftPad((t+i).toString(16), 16, '0')));
	}
	return keys;
};

console.log(getCodes(key, 2, 1));