import {extendObservable} from 'mobx';

export default class UserInfo {
	constructor() {
		extendObservable(this, {
			userName: '',
			gameSettings: {}
		});
	}

	updateUserName(userName) {
		this.userName = userName;
	}

	updateUserGameSettings(settings) {
		this.gameSettings = settings;
	}
}