import React from 'react'; // eslint-disable-line
import DisplayLobbies from './DisplayLobbies.jsx';
import PropTypes from 'prop-types';
import { Checkbox } from 'semantic-ui-react';
import moment from 'moment';
import { CURRENTSEASONNUMBER } from '../../constants';

export class GamesList extends React.Component {
	constructor() {
		super();

		this.toggleFilter = this.toggleFilter.bind(this);
		this.state = {
			filtersVisible: false
		};
	}

	toggleFilter(value) {
		const { gameFilter, changeGameFilter } = this.props;

		gameFilter[value] = !gameFilter[value];
		changeGameFilter(gameFilter);
	}

	renderFilters() {
		const { gameFilter } = this.props;

		return (
			<div className="browser-filters ui grid">
				<div className="one wide column">
					<h4 className="ui header">Public</h4>
					<Checkbox
						toggle
						checked={!gameFilter.pub}
						onChange={() => {
							this.toggleFilter('pub');
						}}
					/>
				</div>
				<div className="one wide column">
					<h4 className="ui header">Private</h4>
					<Checkbox
						toggle
						checked={!gameFilter.priv}
						onChange={() => {
							this.toggleFilter('priv');
						}}
					/>
				</div>
				<div className="one wide column">
					<h4 className="ui header">Unstarted</h4>
					<Checkbox
						toggle
						checked={!gameFilter.unstarted}
						onChange={() => {
							this.toggleFilter('unstarted');
						}}
					/>
				</div>
				<div className="one wide column">
					<h4 className="ui header">Progress</h4>
					<Checkbox
						toggle
						checked={!gameFilter.inprogress}
						onChange={() => {
							this.toggleFilter('inprogress');
						}}
					/>
				</div>
				<div className="one wide column">
					<h4 className="ui header">Completed</h4>
					<Checkbox
						toggle
						checked={!gameFilter.completed}
						onChange={() => {
							this.toggleFilter('completed');
						}}
					/>
				</div>
				<div className="one wide column">
					<i title="Filter by casual games" className="handshake icon" />
					<Checkbox
						toggle
						checked={!gameFilter.casualgame}
						onChange={() => {
							this.toggleFilter('casualgame');
						}}
					/>
				</div>
				<div className="one wide column">
					<i title="Filter by custom games" className="setting icon" />
					<Checkbox
						toggle
						checked={!gameFilter.customgame}
						onChange={() => {
							this.toggleFilter('customgame');
						}}
					/>
				</div>
				<div className="one wide column">
					<i title="Filter by timed mode games" className="hourglass half icon" />
					<Checkbox
						toggle
						checked={!gameFilter.timedMode}
						onChange={() => {
							this.toggleFilter('timedMode');
						}}
					/>
				</div>
				<div className="one wide column iconcolumn">
					<i title="Filter by standard games" className="standard-icon" />
					<Checkbox
						toggle
						checked={!gameFilter.standard}
						onChange={() => {
							this.toggleFilter('standard');
						}}
					/>
				</div>
				<div className="one wide column iconcolumn">
					<i title="Filter by experienced-player-only games" className="rainbow-icon" />
					<Checkbox
						toggle
						checked={!gameFilter.rainbow}
						onChange={() => {
							this.toggleFilter('rainbow');
						}}
					/>
				</div>
			</div>
		);
	}

	renderGameList() {
		const { gameList, userInfo, userList } = this.props;

		const compareGames = (a, b) => {
			if (a.seatedCount !== b.seatedCount) return b.seatedCount - a.seatedCount;
			const aName = a.name.toLowerCase();
			const bName = b.name.toLowerCase();
			if (aName === bName) {
				return a.uid < b.uid ? 1 : -1;
			} else {
				return aName > bName ? 1 : -1;
			}
		};

		const thisUser = userInfo.userName && userList.list && userList.list.find(u => u.userName == userInfo.userName);
		const sortTypeThenName = (a, b) => {
			const isRainbow = thisUser && !thisUser.isPrivate && thisUser.wins + thisUser.losses >= 50;
			const isPrivate = thisUser && thisUser.isPrivate;

			let aType;
			if (a.private) aType = 'private';
			else if (a.rainbowgame) aType = 'rainbow';
			else aType = 'regular';

			let bType;
			if (b.private) bType = 'private';
			else if (b.rainbowgame) bType = 'rainbow';
			else bType = 'regular';

			let sortOrder;
			if (isRainbow || !thisUser) sortOrder = ['rainbow', 'regular', 'private'];
			else if (isPrivate) sortOrder = ['private', 'rainbow', 'regular'];
			else sortOrder = ['regular', 'rainbow', 'private'];

			const diff = sortOrder.indexOf(aType) - sortOrder.indexOf(bType);
			return diff || compareGames(a, b);
		};

		if (gameList.length) {
			return gameList
				.filter(game => {
					const { pub, priv, unstarted, inprogress, completed, timedMode, rainbow, standard, customgame, casualgame } = this.props.gameFilter;

					return !(
						(game.private && priv) ||
						(!game.private && pub) ||
						(game.rainbowgame && rainbow) ||
						(!game.rainbowgame && standard) ||
						(game.timedMode && timedMode) ||
						(game.gameStatus === 'notStarted' && unstarted) ||
						(game.gameStatus === 'isStarted' && inprogress) ||
						((game.gameStatus === 'fascist' || game.gameStatus === 'liberal') && completed) ||
						(game.isCustomGame && customgame) ||
						(game.casualGame && casualgame)
					);
				})
				.sort((a, b) => {
					const statusSortOrder = ['notStarted', 'isStarted', 'fascist', 'liberal'];
					const diff = Math.min(2, statusSortOrder.indexOf(b.gameStatus)) - Math.min(2, statusSortOrder.indexOf(a.gameStatus));
					return diff || sortTypeThenName(a, b);
				})
				.map((game, index) => (
					<DisplayLobbies key={game.uid} game={game} socket={this.props.socket} userList={this.props.userList} userInfo={this.props.userInfo} />
				));
		}
	}

	render() {
		const toggleFilter = () => {
			this.setState(state => ({
				filtersVisible: !state.filtersVisible
			}));
		};

		return (
			<section className={this.state.filtersVisible ? 'browser-container' : 'browser-container filters-hidden'}>
				<a href="#/changelog">
					<h5 title="A season is an optional new tier of wins and losses that is reset after 3 months.">
						{new Date().getTime() < new Date('4-1-2019').getTime()
							? `Season ends ${moment(new Date('4-1-2019')).fromNow()}`
							: `Welcome to season ${CURRENTSEASONNUMBER + 1}`}
						.
					</h5>
				</a>
				<h3>Game filters</h3>
				{this.renderFilters()}
				<div className="browser-header">
					{(() => {
						const { userName } = this.props.userInfo;
						const gameBeingCreated = this.props.midSection === 'createGame';

						return userName && !gameBeingCreated ? (
							<a className="fluid ui button primary create-game-button" href="#/creategame">
								Create a new game
							</a>
						) : (
							<span className="disabled-create-game-button">
								<button className="fluid ui button primary disabled">{gameBeingCreated ? 'Creating a new game..' : 'Log in to make games'}</button>
							</span>
						);
					})()}
					<span className={this.state.filtersVisible ? 'enabled' : 'disabled'} onClick={toggleFilter}>
						<i className="large filter icon" title="Game filters" />
					</span>
				</div>
				<a href="#/leaderboards" className="leaderboard">
					Leaderboards
				</a>
				<div className="browser-body">{this.renderGameList()}</div>
			</section>
		);
	}
}

GamesList.defaultProps = {
	gameFilter: {},
	userInfo: {},
	gameList: []
};

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
