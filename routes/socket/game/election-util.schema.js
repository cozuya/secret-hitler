const { indexSchema } = require("./wire-schemas");

// `chancellorIndex` is the nominated seat; requiring a non-negative integer (see wire-schemas) keeps a
// forged non-integer from slipping past the handler's `chancellorIndex >= playerCount || < 0` check and
// reaching publicPlayersState[chancellorIndex].isDead — an undefined deref that crashes the process. The
// range check stays in the handler.
const selectChancellorSchema = indexSchema("chancellorIndex");

module.exports = { selectChancellorSchema };
