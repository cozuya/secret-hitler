import React from 'react'; // eslint-disable-line no-unused-vars
import { fromNullable } from 'option';
/**
 * @param {object} segment - todo
 * @return {jsx}
 */
const Segment = ({ segment }) => {
	const isSpace = fromNullable(segment.space).valueOrElse(true);
	const isComma = fromNullable(segment.comma).valueOrElse(false);

	const space = isSpace && !isComma ? ' ' : '';

	return (
		<React.Fragment>
			<span className={segment.type}>{segment.text + space}</span>
			{isComma ? <span className={'normal'}>, </span> : <React.Fragment></React.Fragment>}
		</React.Fragment>
	);
};

/**
 * @param {object} text
 * @return {jsx}
 */
const GameText = ({ text }) => (
	<span className="game-text">
		{text.map((segment, i) => (
			<Segment key={i} segment={segment} />
		))}
	</span>
);

export default GameText;
