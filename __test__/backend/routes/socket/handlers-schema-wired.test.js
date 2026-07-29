// Guard against the "undefined.safeParse" class of crash: a handler that imports a schema by a
// name its *.schema.js doesn't export gets `undefined`, and the first matching socket event throws
// `Cannot read properties of undefined (reading 'safeParse')` — which socket.io 2.4.1 re-emits as an
// unhandled 'error', taking the whole process (every live game) down. The per-schema unit tests
// don't catch it because they import the schema directly; only the *handler's* import is wrong.
//
// This test calls every schema-guarded handler with a dummy payload and asserts it does NOT throw a
// `safeParse` TypeError. (Any other error — bad dummy game state, missing socket — is fine; it means
// the schema resolved and validation ran.) If a future edit mis-wires a schema import, CI fails here
// instead of prod.

global.io = { sockets: { sockets: {}, in: () => ({ emit() {} }) }, on() {}, to: () => ({ emit() {} }) };
global.app = {};
global.crashServer = () => {};

const P = { user: "x" };
const game = () => ({
  general: { tournyInfo: {}, uid: "g" },
  gameState: {},
  publicPlayersState: [],
  remakeData: [],
  private: { seatedPlayers: [], lock: {} },
  trackState: {},
  chats: [],
});
const D = {};

// Returns the thrown error (if any) from invoking the handler, awaiting it if it's async.
async function invoke(fn, args) {
  try {
    const r = fn(...args);
    if (r && typeof r.then === "function") await r;
    return null;
  } catch (e) {
    return e;
  }
}

const expectWired = async (fn, args) => {
  expect(typeof fn).toBe("function");
  const err = await invoke(fn, args);
  if (err && String(err.message).includes("safeParse")) {
    throw new Error(`schema import is undefined (handler not wired to its *.schema.js): ${err.message}`);
  }
};

describe("every schema-guarded socket handler has its schema wired", () => {
  const ue = require("../../../../routes/socket/user-events");
  const election = require("../../../../routes/socket/game/election");
  const electionUtil = require("../../../../routes/socket/game/election-util");
  const powers = require("../../../../routes/socket/game/policy-powers");
  const assassination = require("../../../../routes/socket/game/assassination");

  // game/ handlers
  it.each([
    ["selectVoting", () => election.selectVoting(P, game(), D, null, false)],
    ["selectTdOut", () => election.selectTdOut(P, game(), D, null)],
    ["selectPresidentVoteOnVeto", () => election.selectPresidentVoteOnVeto(P, game(), D, null)],
    ["selectChancellorVoteOnVeto", () => election.selectChancellorVoteOnVeto(P, game(), D, null)],
    ["selectChancellorPolicy", () => election.selectChancellorPolicy(P, game(), D, false, null)],
    ["selectPresidentPolicy", () => election.selectPresidentPolicy(P, game(), D, false, null)],
    ["selectChancellor", () => electionUtil.selectChancellor(null, P, game(), D, false)],
    ["selectBurnCard", () => powers.selectBurnCard(P, game(), D, null)],
    ["selectPartyMembershipInvestigate", () => powers.selectPartyMembershipInvestigate(P, game(), D, null)],
    [
      "selectPartyMembershipInvestigateReverse",
      () => powers.selectPartyMembershipInvestigateReverse(P, game(), D, null),
    ],
    ["selectSpecialElection", () => powers.selectSpecialElection(P, game(), D, null)],
    ["selectPlayerToExecute", () => powers.selectPlayerToExecute(P, game(), D, null)],
    ["selectPlayerToAssassinate", () => assassination.selectPlayerToAssassinate(P, game(), D, null)],
  ])("%s", async (_name, call) => {
    await expectWired(call, []);
  });

  // user-events handlers
  it.each([
    ["handleAddNewClaim", () => ue.handleAddNewClaim(null, P, game(), D)],
    ["handleUpdateWhitelist", () => ue.handleUpdateWhitelist(P, game(), D)],
    ["updateSeatedUser", () => ue.updateSeatedUser(null, P, D)],
    ["handleUserLeaveGame", () => ue.handleUserLeaveGame(null, game(), D, P)],
    ["handleOpenChat", () => ue.handleOpenChat(null, D, [], [], [])],
    ["handleAddNewModDMChat", () => ue.handleAddNewModDMChat(null, P, D, [], [], [])],
    ["handleModerationAction", () => ue.handleModerationAction(null, P, D, false, [], [])],
    ["handlePlayerReport", () => ue.handlePlayerReport(P, D, () => {})],
    ["handleUpdatedRemakeGame", () => ue.handleUpdatedRemakeGame(P, game(), D, null)],
    ["handleUpdatedTheme", () => ue.handleUpdatedTheme(null, P, D)],
    ["handleUpdatedGameSettings", () => ue.handleUpdatedGameSettings(null, P, D)],
    ["handleUpdatedBio", () => ue.handleUpdatedBio(null, P, D)],
    ["handleNewGeneralChat", () => ue.handleNewGeneralChat(null, P, D, [], [], [])],
    ["handleAddNewGameChat", () => ue.handleAddNewGameChat(null, P, D, game(), [], [], [], () => {}, false)],
    ["handleAddNewGame", () => ue.handleAddNewGame(null, P, D)],
  ])("%s", async (_name, call) => {
    await expectWired(call, []);
  });
});
