import React from 'react'; // eslint-disable-line

const allEmotes = [
	'BangBang',
	'BigNose',
	'FasCroc',
	'FasEvil',
	'FasFace',
	'FasFrog',
	'FasGlory',
	'FasGoofy',
	'FasGrin',
	'FasHitler',
	'FascistSkull',
	'FasLizard',
	'FasPolicy',
	'FasPolicy2',
	'FasPolicy3',
	'FasSkull',
	'FasSnake',
	'HeyFas',
	'HeyLibs',
	'JaCard',
	'LibBird',
	'LiberalBird',
	'LibGlory',
	'LibHat',
	'LibHmm',
	'LibPipe',
	'LibPolicy',
	'LibPolicy2',
	'LibPolicy3',
	'LibSmile',
	'LibTash',
	'NeinCard',
	'NotHitler',
	'PBullet',
	'PDraw',
	'PInvest',
	'PPres',
	'RedFace',
	'RIP',
	'SecretHitler',
	'SillyLib',
	'TopDeck',
	'VetoPower',
	'VoteJa',
	'VoteNein'
];

export function processEmotes(input) {
	if (typeof input !== 'string') {
		return input;
	}

	const message = input.split(' '),
		formatedMsg = [];

	message.forEach((word, index) => {
		if (allEmotes.includes(word)) {
			formatedMsg.push(<img src={`images/emotes/${word}.png`} key={index} />);
		} else if (/^https:\/\/secrethitler.io/.test(word)) {
			const hash = word.split('https://secrethitler.io')[1];
			// } else if (/^http:\/\/localhost:8080/.test(word)) {
			// 	const hash = word.split('http://localhost:8080')[1];

			formatedMsg.push(
				<a key={index} href={hash} title="link to something inside of sh.io">
					{hash}
				</a>
			);
		} else if (/^https:\/\/github.com\/cozuya\/secret-hitler\/issues/.test(word)) {
			const endLink = word.split('https://github.com/cozuya/secret-hitler')[1];

			formatedMsg.push(
				<a key={index} target="_blank" title="link to sh.io's github page" href={`https://github.com/cozuya/secret-hitler${endLink}`}>
					SH.IO github link to {endLink}
				</a>
			);
		} else {
			formatedMsg.push(word, ' ');
		}
	});
	return formatedMsg;
}
