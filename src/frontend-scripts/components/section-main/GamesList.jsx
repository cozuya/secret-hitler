import React from 'react'; // eslint-disable-line
import DisplayLobbies from './DisplayLobbies.jsx';
import PropTypes from 'prop-types';
import $ from 'jquery';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

export class GamesList extends React.Component {
	componentDidMount() {
		const { changeGameFilter, gameFilter } = this.props;
		const self = this;

		$(this.private).checkbox({
			onChecked() {
				gameFilter.priv = true;
				changeGameFilter(gameFilter);
			},
			onUnchecked() {
				gameFilter.priv = false;
				changeGameFilter(gameFilter);
			}
		});

		$(this.public).checkbox({
			onChecked() {
				gameFilter.pub = true;
				changeGameFilter(gameFilter);
			},
			onUnchecked() {
				gameFilter.pub = false;
				changeGameFilter(gameFilter);
			}
		});

		$(this.unstarted).checkbox({
			onChecked() {
				gameFilter.unstarted = true;
				changeGameFilter(gameFilter);
			},
			onUnchecked() {
				gameFilter.unstarted = false;
				changeGameFilter(gameFilter);
			}
		});

		$(this.inprogress).checkbox({
			onChecked() {
				gameFilter.inprogress = true;
				changeGameFilter(gameFilter);
			},
			onUnchecked() {
				gameFilter.inprogress = false;
				changeGameFilter(gameFilter);
			}
		});

		$(this.completed).checkbox({
			onChecked() {
				gameFilter.completed = true;
				changeGameFilter(gameFilter);
			},
			onUnchecked() {
				gameFilter.completed = false;
				changeGameFilter(gameFilter);
			}
		});
	}

	renderFilters() {
		return (
			<div className="browser-filters ui grid">
				<div className="three wide column">
					<h4 className="ui header">Public</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.public = c;
						}}
					>
						<input type="checkbox" defaultChecked={true} />
					</div>
				</div>
				<div className="three wide column">
					<h4 className="ui header">Private</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.private = c;
						}}
					>
						<input type="checkbox" defaultChecked={true} />
					</div>
				</div>
				<div className="three wide column">
					<h4 className="ui header">Unstarted</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.unstarted = c;
						}}
					>
						<input type="checkbox" defaultChecked={true} />
					</div>
				</div>
				<div className="three wide column">
					<h4 className="ui header">In progress</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.inprogress = c;
						}}
					>
						<input type="checkbox" defaultChecked={true} />
					</div>
				</div>
				<div className="three wide column">
					<h4 className="ui header">Completed</h4>
					<div
						className="ui fitted toggle checkbox"
						ref={c => {
							this.completed = c;
						}}
					>
						<input type="checkbox" defaultChecked={true} />
					</div>
				</div>
			</div>
		);
	}

	renderGameList() {
		const { gameList, userInfo } = this.props;

		if (gameList.length) {
			return gameList
				.filter(game => {
					const { pub, priv, unstarted, inprogress, completed } = this.props.gameFilter;

					return !(
						(game.private && !priv) ||
						(!game.private && !pub) ||
						(game.gameStatus === 'notStarted' && !unstarted) ||
						(game.gameStatus === 'isStarted' && !inprogress) ||
						((game.gameStatus === 'fascist' || game.gameStatus === 'liberal') && !completed) ||
						!(game.privateOnly && userInfo.gameSettings && userInfo.gameSettings.isPrivate)
					);
				})
				.sort((a, b) => {
					const aGameStatus = a.gameStatus,
						bGameStatus = b.gameStatus,
						aName = a.name.toLowerCase(),
						bName = b.name.toLowerCase();

					if (aGameStatus === 'notStarted' && bGameStatus === 'notStarted') {
						if (a.seatedCount === b.seatedCount) {
							if (aName === bName) {
								return a.uid < b.uid ? 1 : -1;
							} else {
								return aName > bName ? 1 : -1;
							}
						} else {
							return b.seatedCount - a.seatedCount;
						}
					}

					if (aGameStatus === 'notStarted' && bGameStatus !== 'notStarted') {
						return -1;
					}

					if (aGameStatus !== 'notStated' && bGameStatus === 'notStarted') {
						return 1;
					}

					if (aGameStatus === 'isStarted' && bGameStatus !== 'isStarted') {
						return -1;
					}

					if (aGameStatus !== 'isStarted' && bGameStatus === 'isStarted') {
						return 1;
					}

					if (aGameStatus === 'isStarted' && bGameStatus === 'isStarted') {
						if (a.seatedCount === b.seatedCount) {
							if (aName === bName) {
								return a.uid < b.uid ? 1 : -1;
							} else {
								return aName > bName ? 1 : -1;
							}
						} else {
							return b.seatedCount - a.seatedCount;
						}
					}

					return aName === bName ? (a.uid < b.uid ? 1 : -1) : aName > bName ? 1 : -1;
				})
				.map((game, index) => {
					return <DisplayLobbies key={game.uid} game={game} socket={this.props.socket} userList={this.props.userList} userInfo={this.props.userInfo} />;
				});
		}
	}

	render() {
		return (
			<section className="browser-container">
				<h3>Game filters</h3>
				{this.renderFilters()}
				<div className="browser-header">
					{(() => {
						const { userName } = this.props.userInfo,
							gameBeingCreated = this.props.midSection === 'createGame';

						return userName && !gameBeingCreated ? (
							<a className="fluid ui button primary create-game-button" href="#/creategame">
								Create a new game
							</a>
						) : (
							<button className="fluid ui button primary disabled">{gameBeingCreated ? 'Creating a new game..' : 'Log in to make games'}</button>
						);
					})()}
				</div>
				<div className="browser-body">{this.renderGameList()}</div>
			</section>
		);
	}
}
GamesList.propTypes = {
	userInfo: PropTypes.object,
	midSection: PropTypes.string,
	gameList: PropTypes.array,
	socket: PropTypes.object,
	userList: PropTypes.object,
	gameFilter: PropTypes.object,
	changeGameFilter: PropTypes.func
};

export default GamesList;
