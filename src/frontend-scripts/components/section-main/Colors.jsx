import React, { useEffect, useRef } from 'react';

const additionalRoles = [
	['contributor', 'contributor'],
	['veteran aem', 'veteran'],
	['moderator', 'moderatorcolor'],
	['editor', 'editorcolor'],
	['admin', 'admin'],
	['moira', 'moira'],
	['godhemzelve', 'godhemzelve'],
	['vig', 'vig']
];

const Colors = props => {
	const refs = useRef([]);

	useEffect(() => {
		refs.current.forEach(ref => {
			const r = parseInt(
				window
					.getComputedStyle(ref)
					.color.slice(4, -1)
					.split(', ')[0]
			)
				.toString(16)
				.padStart(2, '0');
			const g = parseInt(
				window
					.getComputedStyle(ref)
					.color.slice(4, -1)
					.split(', ')[1]
			)
				.toString(16)
				.padStart(2, '0');
			const b = parseInt(
				window
					.getComputedStyle(ref)
					.color.slice(4, -1)
					.split(', ')[2]
			)
				.toString(16)
				.padStart(2, '0');
			ref.innerText = '#' + (r + g + b).toUpperCase();
		});
	}, []);

	return (
		<section className="colors">
			<a className="back" href="#">
				Back
			</a>
			<h2 className="ui header">Site Colors Reference</h2>
			<ul>
				{[...Array(121).keys()].map(id => (
					<li key={id}>
						<p className={'elo' + id}>
							{1500 + id * 5} - <span ref={r => (refs.current[refs.current.length] = r)}></span>
						</p>
					</li>
				))}

				{additionalRoles.map(data => (
					<li key={data[0]}>
						<p className={data[1]}>
							{data[0]} - <span ref={r => (refs.current[refs.current.length] = r)}></span>
						</p>
					</li>
				))}
			</ul>
		</section>
	);
};

export default Colors;
