import React from 'react';
import { Header, Button } from 'semantic-ui-react';

class ConfrimPrompt extends React.Component {
	constructor() {
		super();
	}

	render() {
		return (
			<div className="host-confirm-prompt">
				<Header>{this.props.action}</Header>
				{this.props.userName && <Header className="player-name">{!this.props.gameInfo.general.blindMode && this.props.userName}</Header>}
				{this.props.message && <div className="message">{this.props.message}</div>}
				<Header className="confirm">Are you sure?</Header>
				<div className="button-container">
					<Button primary onClick={this.props.onConfirm}>
						{this.props.action}
					</Button>
					<Button negative onClick={this.props.onClose}>
						Cancel
					</Button>
				</div>
			</div>
		);
	}
}

export default ConfrimPrompt;
