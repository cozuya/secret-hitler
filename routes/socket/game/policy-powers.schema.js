const { indexSchema, voteSchema } = require("./wire-schemas");

// `playerIndex` is the clicked seat for a presidential power (investigate, execute, special election,
// reverse-investigate); it indexes seatedPlayers/publicPlayersState. Requiring a non-negative integer
// (see wire-schemas) stops a forged value from crashing via an undefined-seat deref; the per-power
// range/validity checks stay in the handlers. `voteSchema` is the president's discard-the-peek ballot.
const playerIndexSchema = indexSchema("playerIndex");

module.exports = { playerIndexSchema, voteSchema };
