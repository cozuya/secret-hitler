import {extendObservable} from 'mobx';

export default class Midsection {
	constructor() {
		extendObservable(this, {
			midsection: 'default'
		});
	}

	changeMidsection(midsection) {
		this.midsection = midsection;
	}
}