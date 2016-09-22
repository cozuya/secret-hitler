import {extendObservable} from 'mobx';

export default class GeneralChats {
	constructor() {
		extendObservable(this, {
			chats: []
		});
	}

	updateGeneralChats(chats) {
		this.chats = chats;
	}
}