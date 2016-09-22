import {extendObservable} from 'mobx';

export default class GeneralChats {
	constructor() {
		extendObservable(this, {
			generalChats: []
		});
	}

	updateGeneralChats(generalChats) {
		this.generalChats = generalChats;
	}
}