import React from 'react'; // eslint-disable-line
import classnames from 'classnames';

const Card = ({ type, icon }) => {
	const renderedIcon = icon ? <i className={classnames(icon, 'icon')} /> : null;

	return (
		<div className={classnames(type, 'card')}>
			{renderedIcon}
		</div>
	);
};

export default Card;
