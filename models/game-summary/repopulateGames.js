const GameSummary = require('/index');
const mockGameSummary = require('../../__test__/mocks/mockGameSummary');
// const claims = require('../../__test__/mocks/claims');
// const hitlerElected = require('../../__test__/mocks/hitlerElected');
// const hitlerKilled = require('../../__test__/mocks/hitlerKilled');
// const policyPeek = require('../../__test__/mocks/policyPeek');
const { List } = require('immutable');

export default () => {
    const mocks = List([
        mockGameSummary
    ]);

    mocks.forEach(mock => {
        new GameSummary(mock).save()
    })
}