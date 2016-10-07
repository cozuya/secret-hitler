import React from 'react';
import $ from 'jquery';
import Dropdown from 'semantic-ui-dropdown';

$.fn.dropdown = Dropdown;

export default class Creategame extends React.Component {
	constructor() {
		super();

		this.leaveCreateGame = this.leaveCreateGame.bind(this);
		this.createNewGame = this.createNewGame.bind(this);
	}

	componentDidMount() {
		$('div.ui.dropdown', 'section.creategame').dropdown({
			on: 'hover'
		});
	}

	leaveCreateGame() {
		this.props.onLeaveCreateGame('default');
	}

	createNewGame() {
		const $creategame = $('section.creategame');

		this.props.onCreateGameSubmit({
			gameState: {
				previousElectedGovernment: [],
				undrawnPolicyCount: 17,
				discardedPolicyCount: 0
			},
			chats: [],
			general: {
				uid: Math.random().toString(36).substring(6),
				name: $creategame.find('div.gamename input').val() || 'New Game',
				minPlayersCount: parseInt($creategame.find('div.minplayers div.dropdown > span').text(), 10),
				maxPlayersCount: parseInt($creategame.find('div.maxplayers div.dropdown > span').text(), 10),
				status: 'Waiting for more players..',
				private: false,
				electionCount: 0
			},
			seatedPlayers: [{
				userName: this.props.userInfo.userName,
				connected: true
			}],
			playersState: {},
			cardFlingerState: [],
			trackState: {
				liberalPolicyCount: 0,
				fascistPolicyCount: 0,
				electionTrackerCount: 0,
				enactedPolicies: []
			}
		});
	}

	render() {
		return (
			<section className="creategame">
				<i className="remove icon" onClick={this.leaveCreateGame} />
				<div className="ui header">
					<div className="content">
						Create a new game
					</div>
				</div>
				<div className="ui grid">
					<div className="four wide column gamename">
						<h4 className="ui header">Game name<small>*Optional</small></h4>
						<div className="ui input">
							<input maxLength="14" placeholder="New Game" />
						</div>
					</div>
					<div className="four wide column minplayers">
						<h4 className="ui header">Minimum players</h4>
						<div className="ui dropdown">
							<span className="text">5</span>
							<i className="dropdown icon">
								<div className="menu" />
							</i>
							<div className="menu">
								<div className="item">5</div>
								<div className="item">6</div>
								<div className="item">7</div>
								<div className="item">8</div>
								<div className="item">9</div>
								<div className="item">10</div>
							</div>
						</div>
					</div>
					<div className="four wide column maxplayers">
						<h4 className="ui header">Maximum players</h4>
						<div className="ui dropdown">
							<span className="text">5</span>
							<i className="dropdown icon">
								<div className="menu" />
							</i>
							<div className="menu">
								<div className="item">5</div>
								<div className="item">6</div>
								<div className="item">7</div>
								<div className="item">8</div>
								<div className="item">9</div>
								<div className="item">10</div>
							</div>
						</div>
					</div>
					<div className="four wide column privategame">
						<h4 className="ui header">Private game</h4>
						<h5 className="ui header">Coming soon!</h5>
						<div className="ui checkbox disabled" />
					</div>
				</div>
				<div className="ui grid footer">
					<div onClick={this.createNewGame} className="ui button primary">
							Create game
					</div>
				</div>
			</section>
		);
	}
}

Creategame.propTypes = {
	onCreateGameSubmit: React.PropTypes.func,
	onLeaveCreateGame: React.PropTypes.func,
	userInfo: React.PropTypes.object
};