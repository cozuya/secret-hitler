const ipv4 = require('./ip-obfuscator-v4').obfIP;
const ipv6 = require('./ip-obfuscator-v6').obfIP;

const is0to255 = val => {
	const num = parseInt(val);
	if (isNaN(num)) return false;
	return num >= 0 && num <= 255;
};
const isIPv4 = ip => {
	const data = ip.split('.');
	if (data.length != 4) return false;
	return is0to255(data[0]) && is0to255(data[1]) && is0to255(data[2]) && is0to255(data[3]);
};
const expandAndSimplify = ip => {
	if (ip.includes(':')) {
		if (ip.startsWith('::ffff:')) {
			const shortened = ip.substring(7);
			if (isIPv4(shortened)) return shortened; // IPv4 embedded in IPv6
		}
		// IPv6
		const data = ip.split(':');
		const output = ['0000', '0000', '0000', '0000', '0000', '0000', '0000', '0000'];
		const missing = 8 - data.length;
		let hitExpander = false;
		const pad = val => {
			while (val.length < 4) val = '0' + val;
			return val;
		};
		for (let a = 0; a < data.length; a++) {
			if (data[a] === '') hitExpander = true;
			else if (hitExpander) output[a + missing] = pad(data[a]);
			else output[a] = pad(data[a]);
		}
		return output.join(':');
	}
	return ip; // IPv4
};

module.exports.checkIPEquality = (ip1, ip2) => {
	const first = expandAndSimplify(ip1);
	const second = expandAndSimplify(ip2);
	return first === second;
};

module.exports.obfIP = ip => {
	const ip2 = expandAndSimplify(ip);
	if (isIPv4(ip2)) return ipv4(ip2);
	return ipv6(ip2);
};
