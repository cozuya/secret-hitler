const map = [];
const avail = [];
const convertToHex = num => num.toString(16).padStart(4, '0');

for (let a = 0; a < 16 * 16 * 16 * 16; a++) avail[a] = convertToHex(a);

// Taken from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
const shuffleArray = array => {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		let temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
};
shuffleArray(avail);

for (let i = 0; i < avail.length; i += 2) {
	const val1 = avail[i];
	const val2 = avail[i + 1];
	map[val1] = val2;
	map[val2] = val1;
}

const obfBlock = number => {
	if (map[number] === undefined) throw new Error(`Invalid IP: ${number}`);
	return map[number];
};
module.exports.obfBlock = obfBlock; // For testing purposes, should not be used in production.

module.exports.obfIP = ip => {
	const data = ip.split(':');
	return data
		.slice(0, 8)
		.map(obfBlock)
		.join(':');
};
