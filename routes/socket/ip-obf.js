const ipv4 = require('./ip-obfuscator-v4').obfIP;
const ipv6 = require('./ip-obfuscator-v6').obfIP;

const is0to999 = (val) => {
	const num = parseInt(val);
	if (isNaN(num)) return false;
	return num >= 0 && num <= 999;
};

const isValidBlockCount = (ip) => {
	const data = ip.split('.');
	return data.every(is0to999) && [2, 3, 4].indexOf(data.length) !== -1;
};

const isIPv4 = (ip) => {
	const data = ip.split('.');
	if (data.length !== 4) return false;
	return is0to999(data[0]) && is0to999(data[1]) && is0to999(data[2]) && is0to999(data[3]);
};

module.exports.expandAndSimplify = (ip) => {
	if (ip && ip.includes(':')) {
		if (ip.startsWith('::ffff:')) {
			const shortened = ip.substring(7);
			if (isIPv4(shortened)) return shortened; // IPv4 embedded in IPv6
		}
		// IPv6
		const data = ip.split(':');
		const output = ['0000', '0000', '0000', '0000', '0000', '0000', '0000', '0000'];
		const missing = 8 - data.length;
		let hitExpander = false;
		const pad = (val) => {
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

const obfCache = {};
module.exports.obfIP = (ip) => {
	if (obfCache[ip]) return obfCache[ip];
	const ip2 = module.exports.expandAndSimplify(ip);
	if (isValidBlockCount(ip2)) return (obfCache[ip] = ipv4(ip2));
	const res = ipv6(ip2);
	if (res == null) return '!!IPv6 NOT READY!!';
	return (obfCache[ip] = res);
};
