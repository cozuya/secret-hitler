import React, { useEffect } from 'react';
// import PropTypes from 'prop-types';

const Flappy = props => {
	useEffect(() => {
		const canvas = document.getElementById('flappy-canvas-1');
		const ctx = canvas.getContext('2d');

		ctx.fillStyle = 'rgb(200, 0, 0)';
		ctx.fillRect(10, 10, 50, 50);
	}, []);

	return <canvas width="650" height="220" id="flappy-canvas-1" />;
};

Flappy.propTypes = {};

export default Flappy;
