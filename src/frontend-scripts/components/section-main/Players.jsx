import React from 'react';
// import $ from 'jquery';

export default class Players extends React.Component {
	// constructor() {
	// 	super();
	// 	this.handlePlayerClick = this.handlePlayerClick.bind(this);
	// }

	// componentDidMount() {

	// }

	render() {
		return (
			<section className="players">
					{(() => {
						return this.props.gameInfo.seatedPlayers.map((player, i) => {
							return (
								<div key={i} className="player-container">
									<div
										// onClick={this.handlePlayerClick}
										className={
										(() => {
											return 'player-name';
										})()
									}
									>{player.userName}</div>
								</div>
							);
						});
					})()}
				<div className="ui left pointing label">
					Take a seat
				</div>
			</section>
		);
	}
}

Players.propTypes = {
	roles: React.PropTypes.array,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	roleState: React.PropTypes.string,
	selectedGamerole: React.PropTypes.func
};