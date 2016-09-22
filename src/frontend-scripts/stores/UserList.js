import {extendObservable} from 'mobx';

export default class UserList {
	constructor() {
		extendObservable(this, {
			list: []
		});
	}

	updateUserList(list) {
		this.list = list;
	}
}