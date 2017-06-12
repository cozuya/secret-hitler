import React from 'react';
import $ from 'jquery';
import Policies from './Policies.jsx';

export default class Players extends React.Component {
	constructor() {
		super();
		this.clickedTakeSeat = this.clickedTakeSeat.bind(this);
		this.handlePlayerClick = this.handlePlayerClick.bind(this);
		this.handlePasswordSubmit = this.handlePasswordSubmit.bind(this);
		this.state = {
			passwordValue: ''
		};
	}

	handlePlayerClick(e) {
		const {userInfo, gameInfo, socket} = this.props,
			{gameState} = gameInfo,
			{phase, clickActionInfo} = gameState,
			index = parseInt($(e.currentTarget).attr('data-index'), 10);

		if (phase === 'selectingChancellor' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('presidentSelectedChancellor', {
					chancellorIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'selectPartyMembershipInvestigate' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectPartyMembershipInvestigate', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'execution' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectedPlayerToExecute', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}

		if (phase === 'specialElection' && userInfo.userName) {
			if (clickActionInfo[0] === userInfo.userName && clickActionInfo[1].includes(index)) {
				socket.emit('selectedSpecialElection', {
					playerIndex: index,
					uid: gameInfo.general.uid
				});
			}
		}
	}

	renderPreviousGovtToken(i) {
		const {publicPlayersState} = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].previousGovernmentStatus) {
			return <div	className={`government-token previous-government-token ${publicPlayersState[i].previousGovernmentStatus}`} />;
		}
	}

	renderGovtToken(i) {
		const {publicPlayersState} = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].governmentStatus) {
			return <div	className={`government-token ${publicPlayersState[i].governmentStatus}`} />;
		}
	}

	renderLoader(i) {
		const {publicPlayersState} = this.props.gameInfo;

		if (publicPlayersState && publicPlayersState[i].isLoader) {
			return <div className="ui active tiny inverted loader" />;
		}
	}

	renderPlayers() {
		const {gameInfo, userInfo} = this.props,
			{playersState, gameState, publicPlayersState} = gameInfo;

		return publicPlayersState.map((player, i) => {
			return (
				<div key={i}
					data-index={i}
					onClick={this.handlePlayerClick}
					className={
						(() => {
							let classes = 'player-container';

							if (playersState && Object.keys(playersState).length && playersState[i] && playersState[i].notificationStatus) {
								classes = `${classes} notifier ${playersState[i].notificationStatus}`;
							} else if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].notificationStatus) {
								classes = `${classes} notifier ${publicPlayersState[i].notificationStatus}`;
							}

							if (publicPlayersState && Object.keys(publicPlayersState).length && publicPlayersState[i].isDead) {
								classes = `${classes} isDead`;
							}

							return classes;
						})()
					}>
					<div className={
						(() => {
							let classes = 'player-number';

							if (userInfo.userName && publicPlayersState.findIndex(player => player.userName === userInfo.userName) === i) {
								classes = `${classes} seated-user`;
							} else if (playersState && Object.keys(playersState).length && playersState[i] && playersState[i].nameStatus) {
								classes = `${classes} ${playersState[i].nameStatus}`;
							} else if (Object.keys(publicPlayersState).length && publicPlayersState[i].nameStatus) {
								classes = `${classes} ${publicPlayersState[i].nameStatus}`;
							}

							if (!publicPlayersState[i].connected || publicPlayersState[i].leftGame) {
								classes = `${classes} disconnected`;
							}

							return classes;
						})()
					}>{gameState.isTracksFlipped ? `${i + 1}. ${player.userName}` : player.userName}
					</div>
					{this.renderPreviousGovtToken(i)}
					{this.renderLoader(i)}
					{this.renderGovtToken(i)}
					<div
						className={
						(() => {
							let classes = 'card-container';

							if (playersState && Object.keys(playersState).length && playersState[i].cardStatus.cardDisplayed || (publicPlayersState && publicPlayersState[i].cardStatus.cardDisplayed)) {
								classes += ' showing';
							}

							if (playersState && Object.keys(playersState).length && playersState[i].cardStatus.isFlipped || (publicPlayersState && publicPlayersState[i].cardStatus.isFlipped)) {
								classes += ' flipped';
							}
							return classes;
						})()
					}>
						<div
							className={
							(() => {
								let classes = 'card card-front';

								if (Object.keys(publicPlayersState[i]).length && publicPlayersState[i].cardStatus.cardFront) {
									classes = `${classes} ${publicPlayersState[i].cardStatus.cardFront}`;
								}

								return classes;
							})()
						} />
						<div
							className={
							(() => {
								let classes = 'card card-back';

								if (playersState && playersState.length && Object.keys(playersState[i]).length && Object.keys(playersState[i].cardStatus).length && Object.keys(playersState[i].cardStatus.cardBack).length) {
									if (playersState[i].cardStatus.cardBack.icon || playersState[i].cardStatus.cardBack.icon === 0) {
										classes = `${classes} ${playersState[i].cardStatus.cardBack.cardName}${playersState[i].cardStatus.cardBack.icon.toString()}`;
									} else {
										classes = `${classes} ${playersState[i].cardStatus.cardBack.cardName}`;
									}
								} else if (publicPlayersState && Object.keys(publicPlayersState[i].cardStatus.cardBack).length) {
									if (publicPlayersState[i].cardStatus.cardBack.icon || publicPlayersState[i].cardStatus.cardBack.icon === 0) {
										classes = `${classes} ${publicPlayersState[i].cardStatus.cardBack.cardName}${publicPlayersState[i].cardStatus.cardBack.icon.toString()}`;
									} else {
										classes = `${classes} ${publicPlayersState[i].cardStatus.cardBack.cardName}`;
									}
								}

								return classes;
							})()
						} />
					</div>
				</div>
			);
		});
	}

	renderTakeSeat() {
		const {userInfo, gameInfo, userList} = this.props;

		if ((!userInfo.isSeated && userInfo.userName)
			&& !gameInfo.gameState.isTracksFlipped
			&& (!userInfo.userName || !gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName))
			&& (!gameInfo.general.rainbowgame || userList.list.find(user => user.userName === userInfo.userName).wins + userList.list.find(user => user.userName === userInfo.userName).losses > 49)) {
			return <div className="ui left pointing label" onClick={this.clickedTakeSeat}>Take a seat</div>;
		}
	}

	handlePasswordSubmit(e) {
		e.preventDefault();

		this.props.onClickedTakeSeat(this.state.passwordValue);
		$(this.passwordModal).modal('hide');
	}

	clickedTakeSeat() {
		const {gameInfo, userInfo, onClickedTakeSeat} = this.props;

		if (userInfo.userName) {
			if (userInfo.gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
				window.alert('Sorry, this service is currently unavailable.');
			} else if (gameInfo.general.private && !(gameInfo.general.whitelistedPlayers.includes(userInfo.userName))) {
				$(this.passwordModal).modal('show');
			} else {
				onClickedTakeSeat();
			}
		} else {
			$(this.signinModal).modal('show');
		}
	}

	render() {
		const handlePasswordInputChange = (e) => {
			this.setState({passwordValue: `${e.target.value}`});
		};

		return (
			<section className="players">
				{this.renderPlayers()}
				{this.renderTakeSeat()}

				<div className="ui basic small modal signinnag" ref={c => {
					this.signinModal = c;
				}}>
					<div className="ui header">You will need to sign in or sign up for an account to play.</div>
				</div>
				<div className="ui basic small modal passwordmodal" ref={c => {
					this.passwordModal = c;
				}}>
					<div className="ui header">Private game password:</div>
					<div className="ui input">
						<form onSubmit={this.handlePasswordSubmit}>
							<input maxLength="20" placeholder="Password" onChange={handlePasswordInputChange} value={this.state.passwordValue} autoFocus ref={c => {
								this.privategamepassword = c;
							}} />
							<div onClick={this.handlePasswordSubmit} className="ui button primary">Submit</div>
						</form>
					</div>
				</div>
				<Policies
					gameInfo={this.props.gameInfo}
					userInfo={this.props.userInfo}
					socket={this.props.socket}
				/>
			</section>
		);
	}
}

Players.propTypes = {
	roles: React.PropTypes.array,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	roleState: React.PropTypes.string,
	userList: React.PropTypes.object,
	selectedGamerole: React.PropTypes.func
};