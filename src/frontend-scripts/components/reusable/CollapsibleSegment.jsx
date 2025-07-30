import React, { useState, useRef, useEffect } from 'react';

const useCollapse = ({ defaultExpanded = false }) => {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const contentRef = useRef(null);
	const [height, setHeight] = useState(defaultExpanded ? 'auto' : '0px');

	useEffect(() => {
		if (isExpanded && contentRef.current) {
			const content = contentRef.current;
			const scrollHeight = content.scrollHeight;
			setHeight(scrollHeight + 'px');
		} else {
			setHeight('0px');
		}
	}, [isExpanded]);

	const getToggleProps = () => ({
		onClick: () => setIsExpanded(prev => !prev),
		role: 'button',
		style: { cursor: 'pointer' }
	});

	const getCollapseProps = () => ({
		ref: contentRef,
		style: {
			overflow: 'hidden',
			transition: 'height 300ms ease',
			height
		}
	});

	return { getToggleProps, getCollapseProps, isExpanded };
};

const CollapsibleSegment = props => {
	const { getCollapseProps, getToggleProps, isExpanded } = useCollapse({
		defaultExpanded: props.defaultExpanded || false
	});

	return (
		<div style={props.style || {}}>
			<div className="column-name">
				<h2 className={`ui header ${props.titleClass || ''}`}>
					<i className={'fas fa-chevron-circle-' + (isExpanded ? 'down' : 'right')} {...getToggleProps()} /> {props.title}
				</h2>
			</div>
			<div className="collapsable" {...getCollapseProps()}>
				{props.children}
			</div>
		</div>
	);
};

export default CollapsibleSegment;
