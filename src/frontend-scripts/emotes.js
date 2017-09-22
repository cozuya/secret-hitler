import React from 'react'; // eslint-disable-line

const allEmotes = [
	{ code: 'BangBang', img: <img src="images/emotes/BangBang.png" /> },
	{ code: 'BigNose', img: <img src="images/emotes/BigNose.png" /> },
	{ code: 'FasCroc', img: <img src="images/emotes/FasCroc.png" /> },
	{ code: 'FasEvil', img: <img src="images/emotes/FasEvil.png" /> },
	{ code: 'FasFace', img: <img src="images/emotes/FasFace.png" /> },
	{ code: 'FasFrog', img: <img src="images/emotes/FasFrog.png" /> },
	{ code: 'FasGlory', img: <img src="images/emotes/FasGlory.png" /> },
	{ code: 'FasGoofy', img: <img src="images/emotes/FasGoofy.png" /> },
	{ code: 'FasGrin', img: <img src="images/emotes/FasGrin.png" /> },
	{ code: 'FasHitler', img: <img src="images/emotes/FasHitler.png" /> },
	{ code: 'FascistSkull', img: <img src="images/emotes/FascistSkull.png" /> },
	{ code: 'FasLizard', img: <img src="images/emotes/FasLizard.png" /> },
	{ code: 'FasPolicy', img: <img src="images/emotes/FasPolicy.png" /> },
	{ code: 'FasPolicy2', img: <img src="images/emotes/FasPolicy2.png" /> },
	{ code: 'FasPolicy3', img: <img src="images/emotes/FasPolicy3.png" /> },
	{ code: 'FasSkull', img: <img src="images/emotes/FasSkull.png" /> },
	{ code: 'FasSnake', img: <img src="images/emotes/FasSnake.png" /> },
	{ code: 'HeyFas', img: <img src="images/emotes/HeyFas.png" /> },
	{ code: 'HeyLibs', img: <img src="images/emotes/HeyLibs.png" /> },
	{ code: 'JaCard', img: <img src="images/emotes/JaCard.png" /> },
	{ code: 'LibBird', img: <img src="images/emotes/LibBird.png" /> },
	{ code: 'LiberalBird', img: <img src="images/emotes/LiberalBird.png" /> },
	{ code: 'LibGlory', img: <img src="images/emotes/LibGlory.png" /> },
	{ code: 'LibHat', img: <img src="images/emotes/LibHat.png" /> },
	{ code: 'LibHmm', img: <img src="images/emotes/LibHmm.png" /> },
	{ code: 'LibPipe', img: <img src="images/emotes/LibPipe.png" /> },
	{ code: 'LibPolicy', img: <img src="images/emotes/LibPolicy.png" /> },
	{ code: 'LibPolicy2', img: <img src="images/emotes/LibPolicy2.png" /> },
	{ code: 'LibPolicy3', img: <img src="images/emotes/LibPolicy3.png" /> },
	{ code: 'LibSmile', img: <img src="images/emotes/LibSmile.png" /> },
	{ code: 'LibTash', img: <img src="images/emotes/LibTash.png" /> },
	{ code: 'NeinCard', img: <img src="images/emotes/NeinCard.png" /> },
	{ code: 'NotHiler', img: <img src="images/emotes/NotHitler.png" /> },
	{ code: 'PBullet', img: <img src="images/emotes/PBullet.png" /> },
	{ code: 'PDraw', img: <img src="images/emotes/PDraw.png" /> },
	{ code: 'PInvest', img: <img src="images/emotes/PInvest.png" /> },
	{ code: 'PPres', img: <img src="images/emotes/PPres.png" /> },
	{ code: 'RedFace', img: <img src="images/emotes/RedFace.png" /> },
	{ code: 'RIP', img: <img src="images/emotes/RIP.png" /> },
	{ code: 'SecretHitler', img: <img src="images/emotes/SecretHitler.png" /> },
	{ code: 'SillyLib', img: <img src="images/emotes/SillyLib.png" /> },
	{ code: 'TopDeck', img: <img src="images/emotes/TopDeck.png" /> },
	{ code: 'VetoPower', img: <img src="images/emotes/VetoPower.png" /> },
	{ code: 'VoteJa', img: <img src="images/emotes/VoteJa.png" /> },
	{ code: 'VoteNein', img: <img src="images/emotes/VoteNein.png" /> }
];

export function processEmotes(input) {
	if (typeof input !== 'string') {
		return input;
	}

	const message = input.split(' '),
		formatedMsg = [];

	for (let word of message) {
		let emoteMatched = false;
		for (let emote of allEmotes) {
			if (word === emote['code']) {
				formatedMsg.push(emote['img'], ' '); // remember to add the spaces back in
				emoteMatched = true;
				break;
			}
		}
		if (!emoteMatched) {
			formatedMsg.push(word, ' ');
		}
	}
	return formatedMsg;
}
