let map;

const block = [];
const avail = [];
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
for (let a = 0; a < 16 * 16 * 16 * 16; a++) avail[a] = convertToHex(a);

const doWork = () => {
	let counter = 0;
	while (avail.length > 0) {
		const idx1 = Math.floor(Math.random() * avail.length);
		const val1 = avail[idx1];
		avail.splice(idx1, 1);
		const idx2 = Math.floor(Math.random() * avail.length);
		const val2 = avail[idx2];
		avail.splice(idx2, 1);
		block[val1] = val2;
		block[val2] = val1;
		counter++;
		if (counter == 100) {
			setTimeout(() => doWork(), 25);
			return;
		}
	}
	console.log('IPv6 ready!');
	map = block;
};
doWork();

const obfBlock = number => {
	if (map[number] === undefined) throw new Error(`Invalid IP: ${number}`);
	return map[number];
};
module.exports.obfBlock = obfBlock; // For testing purposes, should not be used in production.

module.exports.obfIP = ip => {
	if (!map) return null;
	const data = ip.split(':');
	return (
		obfBlock(data[0]) +
		':' +
		obfBlock(data[1]) +
		':' +
		obfBlock(data[2]) +
		':' +
		obfBlock(data[3]) +
		':' +
		obfBlock(data[4]) +
		':' +
		obfBlock(data[5]) +
		':' +
		obfBlock(data[6]) +
		':' +
		obfBlock(data[7])
	);
};
