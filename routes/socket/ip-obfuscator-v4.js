const createObfuscationData = () => {
	const block = [];
	const avail = [];
	for (let a = 256; a <= 999; a++) avail[a - 256] = a;
	for (let a = 0; a <= 255; a++) {
		const idx = Math.floor(Math.random() * avail.length);
		block[a] = avail[idx];
		block[block[a]] = a;
		avail.splice(idx, 1);
	}
	return block;
};

const blocks = [createObfuscationData(), createObfuscationData(), createObfuscationData(), createObfuscationData()];

const obfBlock = (number, blockID) => {
	if (!blocks[blockID] || blocks[blockID][number] === undefined) throw new Error(`Invalid IP: ${blockID} ${number}`);
	return blocks[blockID][number];
};

module.exports.obfBlock = obfBlock; // For testing purposes, should not be used in production.

module.exports.obfIP = (ip) => {
	return ip.split('.').map(Number).map(obfBlock).join('.');
};
