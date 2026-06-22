const { indexSchema } = require("./wire-schemas");

// `playerIndex` is the seat Hitler clicked to assassinate; it indexes game.private.seatedPlayers and
// game.publicPlayersState. Requiring a non-negative integer (see wire-schemas) stops a forged value
// from reaching `seatedPlayers[playerIndex].role` — an undefined deref that would crash the process.
// Range/validity stays in the handler.
const assassinateSchema = indexSchema("playerIndex");

module.exports = { assassinateSchema };
