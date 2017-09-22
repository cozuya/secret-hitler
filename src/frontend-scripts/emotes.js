import React from 'react';

const allEmotes = [];

allEmotes.push({code: 'BangBang', img: <img src="images/emotes/BangBang.png" />});
allEmotes.push({code: 'BigNose', img: <img src="images/emotes/BigNose.png" />});
allEmotes.push({code: 'FasCroc', img: <img src="images/emotes/FasCroc.png" />});
allEmotes.push({code: 'FasEvil', img: <img src="images/emotes/FasEvil.png" />});
allEmotes.push({code: 'FasFace', img: <img src="images/emotes/FasFace.png" />});
allEmotes.push({code: 'FasFrog', img: <img src="images/emotes/FasFrog.png" />});
allEmotes.push({code: 'FasGlory', img: <img src="images/emotes/FasGlory.png" />});
allEmotes.push({code: 'FasGoofy', img: <img src="images/emotes/FasGoofy.png" />});
allEmotes.push({code: 'FasGrin', img: <img src="images/emotes/FasGrin.png" />});
allEmotes.push({code: 'FasHitler', img: <img src="images/emotes/FasHitler.png" />});
allEmotes.push({code: 'FascistSkull', img: <img src="images/emotes/FascistSkull.png" />});
allEmotes.push({code: 'FasLizard', img: <img src="images/emotes/FasLizard.png" />});
allEmotes.push({code: 'FasPolicy', img: <img src="images/emotes/FasPolicy.png" />});
allEmotes.push({code: 'FasPolicy2', img: <img src="images/emotes/FasPolicy2.png" />});
allEmotes.push({code: 'FasPolicy3', img: <img src="images/emotes/FasPolicy3.png" />});
allEmotes.push({code: 'FasSkull', img: <img src="images/emotes/FasSkull.png" />});
allEmotes.push({code: 'FasSnake', img: <img src="images/emotes/FasSnake.png" />});
allEmotes.push({code: 'HeyFas', img: <img src="images/emotes/HeyFas.png" />});
allEmotes.push({code: 'HeyLibs', img: <img src="images/emotes/HeyLibs.png" />});
allEmotes.push({code: 'JaCard', img: <img src="images/emotes/JaCard.png" />});
allEmotes.push({code: 'LibBird', img: <img src="images/emotes/LibBird.png" />});
allEmotes.push({code: 'LiberalBird', img: <img src="images/emotes/LiberalBird.png" />});
allEmotes.push({code: 'LibGlory', img: <img src="images/emotes/LibGlory.png" />});
allEmotes.push({code: 'LibHat', img: <img src="images/emotes/LibHat.png" />});
allEmotes.push({code: 'LibHmm', img: <img src="images/emotes/LibHmm.png" />});
allEmotes.push({code: 'LibPipe', img: <img src="images/emotes/LibPipe.png" />});
allEmotes.push({code: 'LibPolicy', img: <img src="images/emotes/LibPolicy.png" />});
allEmotes.push({code: 'LibPolicy2', img: <img src="images/emotes/LibPolicy2.png" />});
allEmotes.push({code: 'LibPolicy3', img: <img src="images/emotes/LibPolicy3.png" />});
allEmotes.push({code: 'LibSmile', img: <img src="images/emotes/LibSmile.png" />});
allEmotes.push({code: 'LibTash', img: <img src="images/emotes/LibTash.png" />});
allEmotes.push({code: 'NeinCard', img: <img src="images/emotes/NeinCard.png" />});
allEmotes.push({code: 'NotHitler', img: <img src="images/emotes/NotHitler.png" />});
allEmotes.push({code: 'PBullet', img: <img src="images/emotes/PBullet.png" />});
allEmotes.push({code: 'PDraw', img: <img src="images/emotes/PDraw.png" />});
allEmotes.push({code: 'PInvest', img: <img src="images/emotes/PInvest.png" />});
allEmotes.push({code: 'PPres', img: <img src="images/emotes/PPres.png" />});
allEmotes.push({code: 'RedFace', img: <img src="images/emotes/RedFace.png" />});
allEmotes.push({code: 'RIP', img: <img src="images/emotes/RIP.png" />});
allEmotes.push({code: 'SecretHitler', img: <img src="images/emotes/SecretHitler.png" />});
allEmotes.push({code: 'SillyLib', img: <img src="images/emotes/SillyLib.png" />});
allEmotes.push({code: 'TopDeck', img: <img src="images/emotes/TopDeck.png" />});
allEmotes.push({code: 'VetoPower', img: <img src="images/emotes/VetoPower.png" />});
allEmotes.push({code: 'VoteJa', img: <img src="images/emotes/VoteJa.png" />});
allEmotes.push({code: 'VoteNein', img: <img src="images/emotes/VoteNein.png" />});


export function processEmotes(input) {
	if (typeof input != 'string') return input;

	const message = input.split(' ');
	const formatedMsg = [];
	for (let word of message) {
		let emoteMatched = false;
		for (let emote of allEmotes) {
			if (word == emote['code']) {
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