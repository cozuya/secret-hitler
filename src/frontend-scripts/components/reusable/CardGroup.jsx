import React from 'react'; // eslint-disable-line
import classnames from 'classnames';

const CardGroup = ({ title, cards, className }) => {
	const renderedTitle = title ? <h1>{title}</h1> : null;

	return (
		<div className={classnames(className, 'card-group')}>
			{renderedTitle}
			{cards}
		</div>
	);
};

export default CardGroup;