const fs = require('fs');

function compare(a, b) {
	return b.elo - a.elo;
}

fs.exists('./out/data.json', function (exists) {
	if (exists) {
		fs.readFile('./out/data.json', function (err, data) {
			if (err) {
				console.log(err);
			} else {
				const obj = JSON.parse(data);
				const arr = [];
				Object.keys(obj).forEach(function (key, index) {
					arr.push({ name: key, elo: obj[key][1] });
				});
				arr.sort(compare);
				let counter = 1;
				arr.forEach((user) => {
					console.log(`[${counter}] ${user.name}: ${user.elo}`);
					counter++;
				});
			}
		});
	}
});
