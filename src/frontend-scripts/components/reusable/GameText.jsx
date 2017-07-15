import React from 'react'; // eslint-disable-line no-unused-vars
import { fromNullable } from 'option';

const Segment = ({ segment }) => {
	const isSpace = fromNullable(segment.space).valueOrElse(true);
	const space = isSpace ? ' ' : '';

	return <span className={segment.type}>{segment.text + space}</span>;
};

const GameText = ({ text }) => (
	<span className="game-text">
		{text.map((segment, i) => (
			<Segment key={i} segment={segment} />
		))}
	</span>
);

export default GameText;
