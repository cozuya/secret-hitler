import React from 'react';
import { connect } from 'react-redux';
import { toggleNotes } from '../actions/actions';
import PropTypes from 'prop-types';

const mapDispatchToProps = dispatch => ({
		toggleNotes: notesStatus => dispatch(toggleNotes(notesStatus))
	});

class Gamenotes extends React.Component {
	constructor() {
		super();

		this.clearNotes = this.clearNotes.bind(this);
		this.noteDragStart = this.noteDragStart.bind(this);
		this.dismissNotes = this.dismissNotes.bind(this);
		this.noteEnd = this.noteEnd.bind(this);
		this.resizeDragStart = this.resizeDragStart.bind(this);
		this.dragOver = this.dragOver.bind(this);

		this.state = {
			top: 110,
			left: 690,
			width: 400,
			height: 320,
			isResizing: false
		};

		this.dragOffX = 0;
		this.dragOffY = 0;
		this.lastValidX = 0;
		this.lastValidY = 0;
	}

	clearNotes() {
		this.props.changeNotesValue('');
	}

	dismissNotes() {
		const { toggleNotes } = this.props;

		toggleNotes(false);
	}

	resizeDragStart() {}

	noteEnd(e) {
		e.preventDefault();
		e.dataTransfer.effectAllowed = 'drag';
		if (!this.state.isResizing) {
			this.setState({
				top: this.lastValidY + this.dragOffY,
				left: this.lastValidX + this.dragOffX
			});
		}
	}

	dragOver(e) {
		e.preventDefault();
		e.dataTransfer.effectAllowed = 'none';
		this.lastValidX = e.clientX;
		this.lastValidY = e.clientY;
	}

	componentDidMount() {
		document.body.addEventListener('dragover', this.dragOver);
		document.body.addEventListener('dragend', this.noteEnd);
	}

	componentWillUnmount() {
		document.body.removeEventListener('dragover', this.dragOver);
		document.body.removeEventListener('dragend', this.noteEnd);
	}

	noteDragStart(e) {
		const style = window.getComputedStyle(e.target, null);

		this.dragOffX = parseInt(style.getPropertyValue('left'), 10) - e.clientX;
		this.dragOffY = parseInt(style.getPropertyValue('top'), 10) - e.clientY;
		e.dataTransfer.effectAllowed = 'drag';
	}

	render() {
		const notesChange = e => {
			this.props.changeNotesValue(`${e.target.value}`);
		};

		return (
			<section
				draggable="true"
				onDragStart={this.noteDragStart}
				className="notes-container"
				style={{ top: `${this.state.top}px`, left: `${this.state.left}px`, height: `${this.state.height}px`, width: `${this.state.width}px`, zIndex:9999999 }}
			>
				<div className="notes-header">
					<div className="drag-boundry 1d top" onDragStart={this.resizeDragStart} draggable="true" style={{ width: `${this.state.width - 30}px` }} />
					<div className="drag-boundry 2d top-left" />
					<div className="drag-boundry 2d top-right" />
					<p>Game Notes</p>
					<div className="icon-container">
						<i className="large ban icon" onClick={this.clearNotes} title="Click here to clear notes" />
						<i className="large window minus icon" onClick={this.dismissNotes} title="Click here to collapse notes" />
					</div>
				</div>
				<textarea style={{ height: this.state.height }} autoFocus spellCheck="false" value={this.props.value} onChange={notesChange} />
			</section>
		);
	}
}

Gamenotes.propTypes = {
	toggleNotes: PropTypes.func,
	value: PropTypes.string
};

export default connect(null, mapDispatchToProps)(Gamenotes);
