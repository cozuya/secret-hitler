import {extendObservable} from 'mobx';

export default class GameList {
	constructor() {
		extendObservable(this, {
			gameList: []
		});
	}

	updateGameList(gameList) {
		this.gameList = gameList;
	}
}