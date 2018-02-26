import React from 'react'; // eslint-disable-line
import classnames from 'classnames';

/**
 * @param {object} type - todo
 * @param {object} icon - todo
 * @return {jsx}
 */
const Card = ({ type, icon }) => {
	const renderedIcon = icon ? <i className={classnames(icon, 'icon')} /> : null;

	return <div className={classnames(type, 'card')}>{renderedIcon}</div>;
};

export default Card;
