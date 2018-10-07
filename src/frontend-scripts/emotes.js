import React from 'react'; // eslint-disable-line
import { Button, Popup } from 'semantic-ui-react';
import Linkify from 'react-linkify';

export const allEmotes = [
	'BangBang',
	'BigNose',
	'BlueLizard',
	'Brick',
	'CNH',
	'CODER',
	'CantBeBothered',
	'CardBack',
	'CucuMeta',
	'DISCORD',
	'DOUBT',
	'ExpressionlessFace',
	'FasCroc',
	'FasEvil',
	'FasFace',
	'FasFrog',
	'FasFrown',
	'FasGlory',
	'FasGoofy',
	'FasGrin',
	'FasHitler',
	'FasLizard',
	'FasPolicy',
	'FasPolicy2',
	'FasPolicy3',
	'FasSkull',
	'FasSnake',
	'FascistSkull',
	'GitHub',
	'HeyFas',
	'HeyLibs',
	'IllAllowIt',
	'JaCard',
	'LibBird',
	'LibCool',
	'LibFrown',
	'LibGlory',
	'LibHat',
	'LibHmm',
	'LibPipe',
	'LibPolicy',
	'LibPolicy2',
	'LibPolicy3',
	'LibSeething',
	'LibSmile',
	'LibTash',
	'LiberalBird',
	'Lizard',
	'Meow',
	'NeinCard',
	'NotHitler',
	'PBullet',
	'PDraw',
	'PIZZA',
	'PInvest',
	'PPres',
	'PopCorn',
	'RIP',
	'RainBow',
	'RedFace',
	'RedHeart',
	'Salty',
	'SantaHitler',
	'SecretHitler',
	'Sheeped',
	'Shepherd',
	'Shrug',
	'SillyLib',
	'SmallNose',
	'ThinkFace',
	'ThumbsDown',
	'ThumbsUp',
	'TopDeck',
	'VetoPower',
	'VoteJa',
	'VoteNein',
	'YellowLizard'
];

export function renderEmotesButton(handleInsertEmote) {
	return (
		<Popup on="click" className="emotes-popup" trigger={<Button type="button" icon="smile" primary className="emotes-button" />}>
			<Popup.Content>
				<div className="emotes-popup-content">
					{allEmotes.map((el, index) => (
						<div key={index} data-tooltip={el} data-inverted onClick={() => handleInsertEmote(el)}>
							<img src={`../images/emotes/${el}.png`} />
						</div>
					))}
				</div>
			</Popup.Content>
		</Popup>
	);
}

export function processEmotes(input, isMod) {
	if (typeof input !== 'string') {
		return input;
	}

	const message = input.split(' ');
	const formatedMsg = [];

	message.forEach((word, index) => {
		if (allEmotes.includes(word)) {
			formatedMsg.push(
				<span key={index} data-tooltip={word} data-inverted>
					<img src={`/images/emotes/${word}.png`} />{' '}
				</span>
			);
		} else if (/^https:\/\/secrethitler.io/.test(word)) {
			const hash = word.split('https://secrethitler.io')[1];
			// } else if (/^http:\/\/localhost:8080/.test(word)) {
			//	const hash = word.split('http://localhost:8080')[1];

			formatedMsg.push(
				<a key={index} href={hash} className="shio-link" title="link to something inside of sh.io">
					{hash}
				</a>
			);
		} else if (/^https:\/\/github.com\/cozuya\/secret-hitler\/issues/.test(word)) {
			const endLink = word.split('https://github.com/cozuya/secret-hitler')[1];

			formatedMsg.push(
				<a key={index} target="_blank" className="shio-link" title="link to sh.io's github page" href={`https://github.com/cozuya/secret-hitler${endLink}`}>
					SH.IO github link to {endLink}
				</a>
			);
		} else if (word.substr(0, 2) === '**' && word.substr(word.length - 2, word.length) === '**') {
			formatedMsg.push(<b key={index}>{word.slice(2).slice(0, word.length - 4)}</b>);
		} else if (word.substr(0, 2) === '~~' && word.substr(word.length - 2, word.length) === '~~') {
			formatedMsg.push(
				<span key={index} style={{ textDecoration: 'line-through' }}>
					{word.slice(2).slice(0, word.length - 4)}
				</span>
			);
		} else if (word.substr(0, 1) === '*' && word.substr(word.length - 1, word.length) === '*') {
			formatedMsg.push(
				<span key={index} style={{ fontStyle: 'italic' }}>
					{word.slice(1).slice(0, word.length - 2)}
				</span>
			);
		} else if (word.substr(0, 2) === '__' && word.substr(word.length - 2, word.length) === '__') {
			formatedMsg.push(
				<span key={index} style={{ textDecoration: 'underline' }}>
					{word.slice(2).slice(0, word.length - 4)}
				</span>
			);
		} else {
			formatedMsg.push(word, ' ');
		}
	});
	if (isMod) {
		return <Linkify properties={{ target: '_blank', title: 'External Link', style: { color: 'inherit', textDecoration: 'underline' } }}>{formatedMsg}</Linkify>;
	}
	return formatedMsg;
}
