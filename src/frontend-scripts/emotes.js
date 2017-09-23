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
		// map better but harder to get the extra spaces in
		formatedMsg.push(allEmotes.includes(word) ? <img src={`images/emotes/${word}.png`} key={index} /> : word, ' ');
	});
	return formatedMsg;
}
