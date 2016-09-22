import {extendObservable} from 'mobx';

export default class GameList {
	constructor() {
		extendObservable(this, {
			list: []
		});
	}

	updateGameList(list) {
		this.list = list;
	}
}