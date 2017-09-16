import React from 'react';
import { connect } from 'react-redux';
import { toggleNotes } from '../actions/actions';
import PropTypes from 'prop-types';

const mapDispatchToProps = dispatch => ({
		toggleNotes: notesStatus => dispatch(toggleNotes(notesStatus))
	}),
	dragOverFn = e => {
		e.preventDefault();
	};

class Gamenotes extends React.Component {
	constructor() {
		super();

		this.clearNotes = this.clearNotes.bind(this);
		this.noteDragStart = this.noteDragStart.bind(this);
		this.dismissNotes = this.dismissNotes.bind(this);
		this.noteDrop = this.noteDrop.bind(this);
		this.resizeMouseDown = this.resizeMouseDown.bind(this);

		this.state = {
			top: 110,
			left: 690,
			width: 400,
			height: 320,
			value: '',
			isResizing: false
		};
	}

	clearNotes() {
		this.setState({ value: '' });
	}

	dismissNotes() {
		this.props.toggleNotes(false);
	}

	noteDrop(e) {
		if (!this.state.isResizing) {
			const offset = e.dataTransfer.getData('text/plain').split(',');

			this.setState({
				top: e.clientY + parseInt(offset[1], 10),
				left: e.clientX + parseInt(offset[0], 10)
			});
		}
	}

	componentDidMount() {
		document.body.addEventListener('dragover', dragOverFn);
		document.body.addEventListener('drop', this.noteDrop);
	}

	componentWillUnmount() {
		document.body.removeEventListener('dragover', dragOverFn);
		document.body.removeEventListener('drop', this.noteDrop);
	}

	noteDragStart(e) {
		const style = window.getComputedStyle(e.target, null);
		e.dataTransfer.setData(
			'text/plain',
			parseInt(style.getPropertyValue('left'), 10) - e.clientX + ',' + (parseInt(style.getPropertyValue('top'), 10) - e.clientY)
		);
	}

	resizeMouseDown(e) {
		console.log(e.clientY, 'ecy');
		this.setState({ isResizing: true });
		document.body.addEventListener('mousemove', e => {
			console.log(e, 'e');
			console.log(e.clientY, 'cy');
		});
	}

	render() {
		const notesChange = e => {
			this.props.changeNotesValue(`${e.target.value}`);
		};

		return (
			<section
				className="notes-container"
				style={{ top: `${this.state.top}px`, left: `${this.state.left}px`, height: `${this.state.height}px`, width: `${this.state.width}px` }}
			>
				<div className="drag-boundry 1d top" onMouseDown={this.resizeMouseDown} style={{ width: `${this.state.width - 30}px` }} />
				<div className="drag-boundry 2d top-left" />
				<div className="drag-boundry 2d top-right" />
				<div className="notes-inner" draggable="true" onDragStart={this.noteDragStart}>
					<div className="notes-header">
						<p>Game Notes</p>
						<div className="icon-container">
							<i className="large ban icon" onClick={this.clearNotes} title="Click here to clear notes" />
							<i className="large window minimize icon" onClick={this.dismissNotes} title="Click here to collapse notes" />
						</div>
					</div>
					<textarea style={{ height: this.state.height }} autoFocus spellCheck="false" value={this.props.value} onChange={notesChange} />
				</div>
			</section>
		);
	}
}

Gamenotes.propTypes = {
	toggleNotes: PropTypes.func,
	value: PropTypes.string
};

export default connect(null, mapDispatchToProps)(Gamenotes);
