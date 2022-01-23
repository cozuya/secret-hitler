import React from 'react';
import useCollapse from 'react-collapsed';

const CollapsibleSegment = props => {
	const { getCollapseProps, getToggleProps, isExpanded } = useCollapse({
		defaultExpanded: props.defaultExpanded || false
	});

	return (
		<div>
			<div className="column-name">
				<h2 className={`ui header ${props.titleClass || ''}`}>
					<i className={'fas fa-chevron-circle-' + (isExpanded ? 'down' : 'right')} {...getToggleProps()} />
					{props.title}
				</h2>
			</div>
			<div className={'collapsable'} {...getCollapseProps()}>
				{props.children}
			</div>
		</div>
	);
};

export default CollapsibleSegment;
