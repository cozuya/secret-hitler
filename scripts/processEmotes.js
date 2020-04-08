const fs = require('fs');
const PNG = require('pngjs').PNG;
const emotes = [];

// !!! Must be run from base directory !!!

fs.readdirSync(`public/images/emotes`, { withFileTypes: true }).forEach((file) => {
	if (file.name.endsWith('.png')) emotes[emotes.length] = [file.name.substring(0, file.name.length - 4), file];
});

// Ordered list of sizes, used for good packing of images with a fixed size.
// It will also not go over 10 in a given dimension (making 10x10 the max), to avoid sizes like 23x1 (resorting 6x4 instead).
// If multiple options exist, it will pick the more square option, and prefers images to be wider instead of taller.
// Sizes below 20 are also not included, as we should always have at least that many emotes.
const sizeMap = [
	[5, 4], // 20
	[6, 4], // 24
	[5, 5], // 25
	[9, 3], // 27
	[7, 4], // 28
	[6, 5], // 30
	[8, 4], // 32
	[7, 5], // 35
	[6, 6], // 36
	[8, 5], // 40
	[7, 6], // 42
	[9, 5], // 45
	[8, 6], // 48
	[10, 5], // 50
	[9, 6], // 54
	[8, 7], // 56
	[10, 6], // 60
	[9, 7], // 63
	[8, 8], // 64
	[10, 7], // 70
	[9, 8], // 72
	[10, 8], // 80
	[9, 9], // 81
	[10, 9], // 90
	[10, 10], // 100
];

const numEmotes = emotes.length;
let sheetSize = [10, 10];
sizeMap.forEach((size) => {
	const space = size[0] * size[1];
	if (space >= numEmotes && space < sheetSize[0] * sheetSize[1]) sheetSize = size;
});

let curCell = 0;
const result = new PNG({
	width: sheetSize[0] * 28,
	height: sheetSize[1] * 28,
	filter: -1,
});
let numDone = 0;
const incrementEmote = () => {
	numDone++;
	if (numDone == numEmotes) result.pack().pipe(fs.createWriteStream(`public/images/emotesheet.png`));
};
emotes.forEach((emote) => {
	const thisCell = curCell;
	curCell++;
	const loc = [thisCell % sheetSize[0], Math.floor(thisCell / sheetSize[0])];
	const img = new PNG();
	img.parse(fs.readFileSync(`public/images/emotes/${emote[1].name}`)).on('parsed', () => {
		PNG.bitblt(img, result, 0, 0, 28, 28, loc[0] * 28, loc[1] * 28);
		incrementEmote();
	});
	emote[1] = loc;
});

console.log('Emotesheet Generated.');
return 0;
