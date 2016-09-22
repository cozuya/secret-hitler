import {extendObservable} from 'mobx';

export default class UserInfo {
	constructor() {
		extendObservable(this, {
			user: {}
		});
	}

	updateUserInfo(user) {
		this.user = user;
	}
}