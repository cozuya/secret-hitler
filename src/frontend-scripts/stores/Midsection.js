import {extendObservable} from 'mobx';

export default class Midsection {
	constructor() {
		extendObservable(this, {
			section: 'default'
		});
	}

	updateMidsection(section) {
		this.section = section;
	}
}