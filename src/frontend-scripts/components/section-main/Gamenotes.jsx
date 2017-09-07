import React from 'react';
import $ from 'jquery';
import classnames from 'classnames';
import PropTypes from 'prop-types';

class Gamenotes extends React.Component {
	constructor() {
		super();

		this.clearNotes = this.clearNotes.bind(this);
		this.noteDragStart = this.noteDragStart.bind(this);
		this.noteDrop = this.noteDrop.bind(this);
		this.noteDragOver = this.noteDragOver.bind(this);

		this.state = {
			top: '10px',
			left: '10px',
			value: ''
		};
	}

	clearNotes() {
		this.setState({ value: '' });
	}

	componentDidMount() {
		// const dragStart = event => {
		// 		console.log('Hello, World!');
		// 		const style = window.getComputedStyle(event.target, null);
		// 		event.dataTransfer.setData(
		// 			'text/plain',
		// 			parseInt(style.getPropertyValue('left'), 10) - event.clientX + ',' + (parseInt(style.getPropertyValue('top'), 10) - event.clientY)
		// 		);
		// 	},
		// 	dragOver = event => {
		// 		event.preventDefault();
		// 		return false;
		// 	},
		// 	drop = event => {
		// 		const offset = event.dataTransfer.getData('text/plain').split(','),
		// 			dm = document.getElementById('dragme');
		// 		dm.style.left = event.clientX + parseInt(offset[0], 10) + 'px';
		// 		dm.style.top = event.clientY + parseInt(offset[1], 10) + 'px';
		// 		event.preventDefault();
		// 		return false;
		// 	},
		// 	dm = document.getElementById('notes-container');
		// console.log('hi');
		// dm.addEventListener('dragstart', dragStart, false);
		// document.body.addEventListener('dragover', dragOver, false);
		// document.body.addEventListener('drop', drop, false);
	}

	componentWillUnmount() {}

	noteDragStart(e) {
		// console.log('Hello, World!');
		// console.log(e);
	}

	noteDrop(e) {
		console.log(e.target);
		console.log(e.screenX);
	}

	noteDragOver(e) {
		e.preventDefault();
	}

	render() {
		const notesChange = e => {
			this.setState({ value: `${e.target.value}` });
		};

		return (
			<section
				draggable="true"
				onDragStart={this.noteDragStart}
				onDragOver={this.noteDragOver}
				onDrop={this.noteDrop}
				className="notes-container"
				style={{ top: this.state.top, left: this.state.left }}
			>
				<div className="notes-header">
					<p>Game notes</p>
					<div className="icon-container">
						<i className="large ban icon" onClick={this.clearNotes} title="Click here to collapse notes" />
						<i className="large window minimize icon" onClick={this.props.dismissNotes} title="Click here to clear your notes" />
					</div>
				</div>
				<textarea autoFocus spellCheck="false" value={this.state.value} onChange={notesChange} />
			</section>
		);
	}
}

Gamenotes.propTypes = {
	dimissNotes: PropTypes.func,
	enabled: PropTypes.bool
};

export default Gamenotes;
