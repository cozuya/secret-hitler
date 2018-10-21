import React from 'react';
import { connect } from 'react-redux';
import { toggleNotes } from '../actions/actions';
import PropTypes from 'prop-types';

const mapDispatchToProps = dispatch => ({
	dismissNotes: () => dispatch(toggleNotes(false))
});

class Gamenotes extends React.Component {
	constructor() {
		super();

		this.noteDragStart = this.noteDragStart.bind(this);
		this.noteDragOver = this.noteDragOver.bind(this);
		this.noteDragDrop = this.noteDragDrop.bind(this);

		this.state = {
			top: 110,
			left: 690,
			width: 400,
			height: 320
		};
	}

	componentDidMount() {
		document.body.addEventListener('dragover', this.noteDragOver);
		document.body.addEventListener('drop', this.noteDragDrop);
	}

	componentWillUnmount() {
		document.body.removeEventListener('dragover', this.noteDragOver);
		document.body.removeEventListener('drop', this.noteDragDrop);
	}

	noteDragStart(e) {
		const style = window.getComputedStyle(e.target, null);

		e.dataTransfer.setData(
			'coordinates/text',
			parseInt(style.getPropertyValue('left'), 10) - e.clientX + ',' + (parseInt(style.getPropertyValue('top'), 10) - e.clientY)
		);
	}

	noteDragOver(e) {
		e.preventDefault();
	}

	noteDragDrop(e) {
		e.preventDefault();
		const offset = e.dataTransfer.getData('coordinates/text').split(',');

		this.setState({
			top: e.clientY + parseInt(offset[1], 10),
			left: e.clientX + parseInt(offset[0], 10)
		});
	}

	render() {
		const { changeNotesValue, dismissNotes, value } = this.props;
		const { left: sectionLeft, top: sectionTop, height: sectionHeight, width: sectionWidth } = this.state;

		return (
			<section
				draggable="true"
				onDragStart={this.noteDragStart}
				className="notes-container"
				style={{ top: `${sectionTop}px`, left: `${sectionLeft}px`, height: `${sectionHeight}px`, width: `${sectionWidth}px` }}
			>
				<div className="notes-header">
					<p>Game Notes</p>
					<div className="icon-container">
						<i className="large ban icon" onClick={() => changeNotesValue('')} title="Click here to clear notes" />
						<i className="large window minus icon" onClick={() => dismissNotes(false)} title="Click here to collapse notes" />
					</div>
				</div>
				<textarea style={{ height: this.state.height }} autoFocus spellCheck="false" value={value}
									onChange={(e) => changeNotesValue(e.target.value)} />
			</section>
		);
	}
}

Gamenotes.defaultProps = {
	value: '',
};

Gamenotes.propTypes = {
	changeNotesValue: PropTypes.func.isRequired,
	dismissNotes: PropTypes.func.isRequired,
	value: PropTypes.string
};

export default connect(
	() => ({}),
	mapDispatchToProps
)(Gamenotes);
