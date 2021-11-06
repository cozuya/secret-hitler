const { LineGuess } = require('./util');

test('parseLineGuess', done => {
	const data = [
		['123', new LineGuess({ hit: null, regs: [1, 2, 3] })],
		['56h7', new LineGuess({ hit: 6, regs: [5, 6, 7] })],
		['123456789', new LineGuess({ hit: null, regs: [1, 2, 3, 4, 5, 6, 7, 8, 9] })],
		['0987h', new LineGuess({ hit: 7, regs: [7, 8, 9, 10] })],

		['', null],
		['aaaaaaaaaa', null],
		['1h2h3h4h5h6h', null],
		['h', null],
		['1/2/3/10', null]
	];

	for (const [input, expected] of data) {
		const x = LineGuess.parse(input);

		console.log(x, expected);

		if (x !== expected && !x.equals(expected)) {
			done.fail(`Unexpected`);
		}
	}

	done();
});
