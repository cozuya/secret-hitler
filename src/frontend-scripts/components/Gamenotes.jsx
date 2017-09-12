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

		this.state = {
			top: '110px',
			left: '690px',
			value: ''
		};
	}

	clearNotes() {
		this.setState({ value: '' });
	}

	dismissNotes() {
		const { toggleNotes } = this.props;

		toggleNotes(false);
	}

	noteDrop(e) {
		const offset = e.dataTransfer.getData('text/plain').split(',');

		this.setState({
			top: `${e.clientY + parseInt(offset[1], 10)}px`,
			left: `${e.clientX + parseInt(offset[0], 10)}px`
		});
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

	render() {
		const notesChange = e => {
			this.props.changeNotesValue(`${e.target.value}`);
		};

		return (
			<section
				draggable="true"
				onDragStart={this.noteDragStart}
				onDragOver={this.noteDragOver}
				className="notes-container"
				style={{ top: this.state.top, left: this.state.left }}
			>
				<div className="notes-header">
					<p>Game Notes</p>
					<div className="icon-container">
						<i className="large ban icon" onClick={this.clearNotes} title="Click here to clear notes" />
						<i className="large window minimize icon" onClick={this.dismissNotes} title="Click here to collapse notes" />
					</div>
				</div>
				<textarea autoFocus spellCheck="false" value={this.props.value} onChange={notesChange} />
			</section>
		);
	}
}

Gamenotes.propTypes = {
	toggleNotes: PropTypes.func,
	value: PropTypes.string
};

export default connect(null, mapDispatchToProps)(Gamenotes);
