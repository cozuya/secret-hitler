import React, { useEffect } from 'react';
// import PropTypes from 'prop-types';

const Flappy = props => {
	const cb = new Image();

	cb.src = '/images/default_cardback.png';

	// for some unknown reason useState doesn't work here - it never updates inside of draw
	let vert = 50;
	let lastFlapTime = Date.now() - 1000;

	const flap = () => {
		lastFlapTime = Date.now();
	};

	const draw = () => {
		const ctx = document.getElementById('flappy-canvas-1').getContext('2d');
		const timeDiff = Date.now() - lastFlapTime;

		vert = vert - (1000 - timeDiff) * 0.002;

		ctx.clearRect(0, 0, 650, 220);
		ctx.drawImage(cb, 10, vert, 42, 57);

		window.requestAnimationFrame(draw);
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
