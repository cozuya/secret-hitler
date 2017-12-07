import React from 'react'; // eslint-disable-line
import DisplayLobbies from './DisplayLobbies.jsx';
import PropTypes from 'prop-types';
import $ from 'jquery';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

export class GamesList extends React.Component {
	constructor() {
		super();

		this.state = {
			priv: true,
			pub: true,
			unstarted: true,
			inprogress: true,
			completed: true
		};
	}

	componentDidMount() {
		const self = this;

		$(this.private).checkbox({
			onChecked() {
				self.setState({ priv: true });
			},
			onUnchecked() {
				self.setState({ priv: false });
			}
		});

		$(this.public).checkbox({
			onChecked() {
				self.setState({ pub: true });
			},
			onUnchecked() {
				self.setState({ pub: false });
			}
		});

		$(this.unstarted).checkbox({
			onChecked() {
				self.setState({ unstarted: true });
			},
			onUnchecked() {
				self.setState({ unstarted: false });
			}
		});

		$(this.inprogress).checkbox({
			onChecked() {
				self.setState({ inprogress: true });
			},
			onUnchecked() {
				self.setState({ inprogress: false });
			}
		});

		$(this.completed).checkbox({
			onChecked() {
				self.setState({ completed: true });
			},
			onUnchecked() {
				self.setState({ completed: false });
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
		const { gameList } = this.props;

		if (gameList.length) {
			return gameList
				.filter(game => {
					const { pub, priv, unstarted, inprogress, completed } = this.state;

					return !(
						(game.private && !priv) ||
						(!game.private && !pub) ||
						(game.gameStatus === 'notStarted' && !unstarted) ||
						(game.gameStatus === 'isStarted' && !inprogress) ||
						((game.gameStatus === 'fascist' || game.gameStatus === 'liberal') && !completed)
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
	userList: PropTypes.object
};

export default GamesList;
