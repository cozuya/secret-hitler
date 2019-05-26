import React, { useEffect } from 'react';
// import PropTypes from 'prop-types';

const Flappy = props => {
	const cb = new Image(70, 95);

	cb.src = 'https://secrethitler.io/images/default_cardback.png';
	// let horz = 5;
	// let vert = 5;

	const flap = () => {
		// vert = vert + 10;
	};

	const draw = () => {
		const ctx = document.getElementById('flappy-canvas-1').getContext('2d');
		ctx.clearRect(0, 0, 650, 220);

		// ctx.drawImage(cb, horz * 1.5, vert);

		// horz++;
		// if (horz < 600) {
		// window.requestAnimationFrame(draw);
		// }
	};

	useEffect(() => {
		setTimeout(() => {
			window.requestAnimationFrame(draw);
			document.getElementById('flappy-canvas-1').addEventListener('click', flap);
		}, 0);
	}, []);

	return <canvas width="750" height="220" id="flappy-canvas-1" />;
};

Flappy.propTypes = {};

export default Flappy;
