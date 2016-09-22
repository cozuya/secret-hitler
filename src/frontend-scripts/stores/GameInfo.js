import {extendObservable} from 'mobx';

export default class GameInfo {
	constructor() {
		extendObservable(this, {
			gameInfo: {}
		});
	}

	updateGameInfo(gameInfo) {
		this.gameInfo = gameInfo;
	}
}