import React from 'react'; // eslint-disable-line
import { Button, Popup } from 'semantic-ui-react';
import Linkify from 'react-linkify';

export function renderEmotesButton(handleInsertEmote, allEmotes) {
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

export function processEmotes(input, isMod, allEmotes) {
	if (typeof input !== 'string') {
		return input;
	}

	const message = input.split(' ');
	const formatedMsg = [];

	message.forEach((word, index) => {
		const validSiteURL = /^http[s]?:\/\/(secrethitler\.io|localhost:8080|github\.com\/cozuya\/secret-hitler)\/([a-zA-Z0-9#?=&\/\._]*)$/i;
		if (allEmotes.includes(word)) {
			formatedMsg.push(
				<span key={index} data-tooltip={word} data-inverted>
					<img src={`/images/emotes/${word}.png`} />{' '}
				</span>
			);
		} else if (validSiteURL.test(word)) {
			const data = validSiteURL.exec(word);
			const isGithub = data[1] == 'github.com/cozuya/secret-hitler';
			formatedMsg.push(
				<a
					key={index}
					href={isGithub ? 'https://github.com/cozuya/secret-hitler/' + data[2] : data[2]}
					className="shio-link"
					title={isGithub ? "link to sh.io's github page" : 'link to something inside of sh.io'}
				>
					{isGithub ? `SH.IO github: ${data[2]}` : data[2]}
				</a>
			);
		} else if (word.substr(0, 2) === '**' && word.substr(word.length - 2, word.length) === '**') {
			formatedMsg.push(<b key={index}>{word.slice(2).slice(0, word.length - 4) + ' '}</b>);
		} else if (word.substr(0, 2) === '~~' && word.substr(word.length - 2, word.length) === '~~') {
			formatedMsg.push(
				<span key={index} style={{ textDecoration: 'line-through' }}>
					{word.slice(2).slice(0, word.length - 4) + ' '}
				</span>
			);
		} else if (word.substr(0, 1) === '*' && word.substr(word.length - 1, word.length) === '*') {
			formatedMsg.push(
				<span key={index} style={{ fontStyle: 'italic' }}>
					{word.slice(1).slice(0, word.length - 2) + ' '}
				</span>
			);
		} else if (word.substr(0, 2) === '__' && word.substr(word.length - 2, word.length) === '__') {
			formatedMsg.push(
				<span key={index} style={{ textDecoration: 'underline' }}>
					{word.slice(2).slice(0, word.length - 4) + ' '}
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
