import {extendObservable} from 'mobx';

export default class UserInfo {
	constructor() {
		extendObservable(this, {
			userInfo: {}
		});
	}

	updateUserinfo(userInfo) {
		this.userInfo = userInfo;
	}
}