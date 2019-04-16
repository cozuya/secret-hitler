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

const block1 = createObfuscationData();
const block2 = createObfuscationData();
const block3 = createObfuscationData();
const block4 = createObfuscationData();

const obfBlock = (number, blockID) => {
	let block;
	if (blockID === 1) block = block1;
	else if (blockID === 2) block = block2;
	else if (blockID === 3) block = block3;
	else block = block4;

	if (block[number] === undefined) throw new Error(`Invalid IP: ${blockID} ${number}`);
	return block[number];
};
module.exports.obfBlock = obfBlock; // For testing purposes, should not be used in production.

module.exports.obfIP = ip => {
	const data = ip.split('.').map(val => Number(val));
	return obfBlock(data[0], 1) + '.' + obfBlock(data[1], 2) + '.' + obfBlock(data[2], 3) + '.' + obfBlock(data[3], 4);
};

module.exports.obfFragment = ip => {
	const data = ip.split('.').map(val => Number(val));
	let obf = obfBlock(data[0], 1) + '.' + obfBlock(data[1], 2);
	if (data.length > 2) {
		obf += '.' + obfBlock(data[2], 3);
	}
	return obf;
};
