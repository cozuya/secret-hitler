const fs = require('fs');

const obj = JSON.parse(fs.readFileSync('./out/data.json', 'utf8'));
const newObj = {};

Object.keys(obj).forEach((key) => {
	const newKey = obj[key][1].toFixed(2);
	if (newObj[newKey]) newObj[newKey] = [...newObj[newKey], key];
	else newObj[newKey] = [key];
});

const sortedList = [];

Object.keys(newObj)
	.sort()
	.reverse()
	.forEach((key) => {
		const list = newObj[key];
		list.forEach((user) => {
			sortedList.push([user, key]);
		});
	});

fs.writeFile('./out/dataNew.json', JSON.stringify(sortedList), function (err) {
	if (err) {
		return console.log(err);
	}
	console.log('The file was saved!');
});
