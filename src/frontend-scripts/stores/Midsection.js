import {extendObservable} from 'mobx';

export default class Midsection {
	constructor() {
		extendObservable(this, {
			section: 'default'
		});
	}

	updateMidsection(section) {
		console.log(section);
		this.section = section;
	}
}