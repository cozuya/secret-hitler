import { List, Map, isCollection } from 'immutable';
import { some, none, isOption } from 'option';

expect.extend({
	toBeTypeOf: (received, argument) => ({
		pass: typeof received === argument,
		message: `Expected ${received} to be typeof ${argument}`
	}),
	toBeAList: received => ({
		pass: List.isList(received),
		message: `Expected ${received} to be a List`
	}),
	toBeAMap: received => ({
		pass: Map.isMap(received),
		message: `Expected ${received} to be a Map`
	}),
	toBeAnOption: received => ({
		pass: isOption(received),
		message: `Expected ${received} to be an Option`
	}),
	toImmutableEqual: (received, argument) => ({
		pass: isCollection(received) && received.equals(argument),
		message: `Expected ${received} to equal ${argument}`
	}),
	toListOptionEqual: (received, argument) => ({
		pass: isCollection(received) && received.reduce((b, r, i) => b && r._value === argument.get(i)._value, true),
		message: `Expected ${received} to equal ${argument}`
	})
});
