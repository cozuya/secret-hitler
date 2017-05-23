import React from 'react'; // eslint-disable-line no-unused-vars

const ReplayControls = ({ gameDate, turnNum, phase, description, onNextTickClick, onPrevTickClick }) => (
	<section className="replay-controls">
		<div className="replay-deets info">
			<h1>Replay</h1>
			<span>Game played on </span>
			<span>{gameDate}</span>
		</div>
		<div className="turn info">
			<h1>Turn</h1>
			<span>{turnNum}</span>
		</div>
		<div className="phase info">
			<h1>Phase</h1>
			<span>{phase}</span>
		</div>
		<div className="description info">
			<h1>Description</h1>
			<span>{description}</span>
		</div>
		<div className="playback">
			<h1>Playback Controls</h1>
			<div className="ui horizontal segments">
				<button
					className="ui icon button segment"
					onClick={onPrevTickClick}>
					<i className="flipped play icon" />
				</button>
				<button
					className="ui icon button segment"
					onClick={onNextTickClick}>
					<i className="play icon" />
				</button>
			</div>
		</div>
	</section>
);

export default ReplayControls;