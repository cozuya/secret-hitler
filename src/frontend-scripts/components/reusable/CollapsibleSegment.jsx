import React, { useState, useRef, useEffect } from 'react';

const useCollapse = ({ defaultExpanded = false }) => {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const contentRef = useRef(null);
	const contentInnerRef = useRef(null);
	const [height, setHeight] = useState(defaultExpanded ? 'auto' : '0px');

	useEffect(() => {
		const content = contentRef.current;
		const contentInner = contentInnerRef.current;

		if (!isExpanded || !content || !contentInner) {
			setHeight('0px');
			return;
		}

		const syncHeight = () => setHeight(contentInner.offsetHeight + 'px');
		syncHeight();

		let resizeObserver;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => {
				syncHeight();
			});
			resizeObserver.observe(contentInner);
		} else {
			window.addEventListener('resize', syncHeight);
		}

		return () => {
			if (resizeObserver) {
				resizeObserver.disconnect();
			} else {
				window.removeEventListener('resize', syncHeight);
			}
		};
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
			height,
			visibility: isExpanded ? 'visible' : 'hidden'
		}
	});

	return { getToggleProps, getCollapseProps, isExpanded, contentInnerRef };
};

const CollapsibleSegment = props => {
	const { getCollapseProps, getToggleProps, isExpanded, contentInnerRef } = useCollapse({
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
				<div ref={contentInnerRef} style={{ display: 'flow-root' }}>
					{typeof props.children === 'function' ? props.children({ isExpanded }) : props.children}
				</div>
			</div>
		</div>
	);
};

export default CollapsibleSegment;
