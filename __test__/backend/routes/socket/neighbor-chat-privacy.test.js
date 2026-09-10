jest.mock("../../../../routes/socket/models", () => ({ games: {} }));
jest.mock("../../../../routes/socket/util", () => ({ sendInProgressGameUpdate: jest.fn() }));
jest.mock("../../../../models/account", () => ({ findOne: jest.fn() }));
jest.mock("../../../../models/game", () => ({ findOne: jest.fn() }));
jest.mock("../../../../models/playerReport", () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this.save = Model.save;
  });
  Model.save = jest.fn();
  Model.find = jest.fn();
  return Model;
});

const { randomUUID } = require("crypto");
const Account = require("../../../../models/account");
const Game = require("../../../../models/game");
const PlayerReport = require("../../../../models/playerReport");
const { games } = require("../../../../routes/socket/models");
const { sendInProgressGameUpdate } = require("../../../../routes/socket/util");
const { replayForViewer } = require("../../../../routes/socket/neighbor-chat");
const { sendReplayGameData, sendUserReports } = require("../../../../routes/socket/user-requests");
const {
  handleMuteNeighborChat,
  handleReportNeighborChat,
} = require("../../../../routes/socket/user-events/neighbor-chat");

const query = (value) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});
const message = (sender, recipient, text = "private message") => ({
  gameChat: true,
  timestamp: new Date(),
  chat: [{ text: `${sender} to ${recipient}: ` }, { text, type: "neighbor-chat" }],
  neighborChat: { id: randomUUID(), sender, recipient },
});
const makeSocket = (user) => ({ handshake: { session: { passport: user ? { user } : undefined } }, emit: jest.fn() });
let archive, incoming, outgoing, unrelated;
beforeEach(() => {
  jest.clearAllMocks();
  for (const uid of Object.keys(games)) delete games[uid];
  incoming = message("Alice", "Bob");
  outgoing = message("Bob", "Alice", "reply");
  unrelated = message("Carol", "Dave", "unrelated secret");
  archive = {
    uid: "table",
    chats: [{ chat: "public" }],
    neighborChats: [incoming, outgoing, unrelated],
    hiddenInfoChat: [{ chat: "hidden role" }, incoming, outgoing, unrelated],
  };
  Account.findOne.mockReturnValue(query({ username: "Bob", staffRole: "" }));
  Game.findOne.mockReturnValue(query(archive));
  PlayerReport.find.mockReturnValue(query([]));
  PlayerReport.save.mockResolvedValue({});
});

describe("restricted replay transcripts", () => {
  it.each([undefined, "Stranger", "Carol"])("does not expose another pair's messages to %s", (username) => {
    const result = replayForViewer(archive, username, false);
    expect(result).not.toHaveProperty("neighborChats");
    expect(result).not.toHaveProperty("hiddenInfoChat");
    expect(result.chats).not.toContain(incoming);
    expect(result.chats).not.toContain(outgoing);
    expect(result.chats).toEqual(username === "Carol" ? [archive.chats[0], unrelated] : [archive.chats[0]]);
  });

  it("returns both directions to a participant exactly once, without modifying the stored record", () => {
    archive.chats.push(incoming); // Also cover records written by the earlier public-replay implementation.
    const before = JSON.stringify(archive);
    expect(replayForViewer(archive, "Bob", false).chats).toEqual([archive.chats[0], incoming, outgoing]);
    expect(JSON.stringify(archive)).toBe(before);
  });

  it("withholds legacy neighbor rows without trustworthy identities from ordinary viewers", () => {
    const legacy = { gameChat: true, chat: [{ text: "Alice to Bob" }, { type: "neighbor-chat", text: "legacy" }] };
    archive.chats.push(legacy);
    expect(replayForViewer(archive, "Bob", false).chats).not.toContain(legacy);
    expect(replayForViewer(archive, "Reviewer", true).chats).toContain(legacy);
  });

  it.each([
    "admin",
    "editor",
    "moderator",
    "trialmod",
  ])("allows a current %s to review all archived conversations", async (staffRole) => {
    Account.findOne.mockReturnValue(query({ username: "Reviewer", staffRole }));
    const socket = makeSocket("Reviewer");
    await sendReplayGameData(socket, "table");
    expect(Account.findOne).toHaveBeenCalledWith({ username: "Reviewer" });
    expect(socket.emit).toHaveBeenCalledWith(
      "replayGameData",
      expect.objectContaining({
        chats: [archive.chats[0], incoming, outgoing, unrelated],
        hiddenInfoChat: archive.hiddenInfoChat,
      })
    );
  });

  it.each([
    "",
    "altmod",
    "veteran",
  ])("ignores stale socket moderator claims for a current '%s' account", async (staffRole) => {
    Account.findOne.mockReturnValue(query({ username: "Stranger", staffRole }));
    const socket = makeSocket("Stranger");
    socket.handshake.session.passport.staffRole = "admin";
    await sendReplayGameData(socket, "table");
    expect(socket.emit).toHaveBeenCalledWith("replayGameData", { uid: "table", chats: [archive.chats[0]] });
  });

  it("serves anonymous viewers only public chats and deleted accounts no participant access", async () => {
    const anonymous = makeSocket();
    await sendReplayGameData(anonymous, "table");
    expect(Account.findOne).not.toHaveBeenCalled();
    expect(anonymous.emit.mock.calls[0][1].chats).toEqual([archive.chats[0]]);
    Account.findOne.mockReturnValue(query(null));
    const deleted = makeSocket("Bob");
    await sendReplayGameData(deleted, "table");
    expect(deleted.emit.mock.calls[0][1].chats).toEqual([archive.chats[0]]);
  });

  it("uses authenticated account identity for participant history", async () => {
    const socket = makeSocket("Bob");
    await sendReplayGameData(socket, "table");
    expect(socket.emit.mock.calls[0][1].chats).toEqual([archive.chats[0], incoming, outgoing]);
  });

  it("does not expose a saved snapshot while the table is still running", async () => {
    games.table = { gameState: { isCompleted: false } };
    Account.findOne.mockReturnValue(query({ username: "Bob", staffRole: "admin" }));
    const socket = makeSocket("Bob");
    await sendReplayGameData(socket, "table");
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    [],
    { $ne: null },
    "",
    12,
  ])("rejects malformed replay identifiers %j before querying", async (uid) => {
    await sendReplayGameData(makeSocket("Bob"), uid);
    expect(Game.findOne).not.toHaveBeenCalled();
  });

  it("fails closed when the account lookup fails", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    Account.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.reject(new Error("offline")) }) });
    const socket = makeSocket("Bob");
    await expect(sendReplayGameData(socket, "table")).resolves.toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith("sendAlert", expect.any(String));
    expect(socket.emit).not.toHaveBeenCalledWith("replayGameData", expect.anything());
    log.mockRestore();
  });
});

describe("Neighbor Chat mute", () => {
  beforeEach(() => {
    games.table = {
      general: { neighborChat: true },
      private: { seatedPlayers: [{ userName: "Bob" }, { userName: "Alice" }] },
    };
  });

  it.each([true, false])("sets only the requesting player's mute preference to %s", (muted) => {
    const callback = jest.fn();
    games.table.private.seatedPlayers[0].neighborChatMuted = !muted;
    handleMuteNeighborChat({ user: "Bob" }, { gameUid: "table", muted, username: "Alice" }, callback);
    expect(games.table.private.seatedPlayers).toEqual([
      { userName: "Bob", neighborChatMuted: muted },
      { userName: "Alice" },
    ]);
    expect(sendInProgressGameUpdate).toHaveBeenCalledWith(games.table, true);
    expect(callback).toHaveBeenCalledWith({ success: true });
  });

  it.each([undefined, { user: "Observer", staffRole: "admin" }])("rejects an unseated caller %j", (passport) => {
    const before = JSON.stringify(games.table);
    handleMuteNeighborChat(passport, { gameUid: "table", muted: true }, jest.fn());
    expect(JSON.stringify(games.table)).toBe(before);
    expect(sendInProgressGameUpdate).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { gameUid: "table", muted: "false" },
    { gameUid: "missing", muted: true },
  ])("rejects invalid mute payload %j", (data) => {
    const callback = jest.fn();
    handleMuteNeighborChat({ user: "Bob" }, data, callback);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(sendInProgressGameUpdate).not.toHaveBeenCalled();
  });
});

describe("reports with server-held evidence", () => {
  const report = (callback = jest.fn(), extra = {}) =>
    handleReportNeighborChat(
      { user: "Bob" },
      {
        gameUid: "table",
        messageId: incoming.neighborChat.id,
        comment: " harassment ",
        ...extra,
      },
      callback
    );

  it.each([true, false])("saves only the reported pair's conversation, from the %s live source", async (live) => {
    if (live) games.table = { private: { neighborChats: archive.neighborChats } };
    const callback = jest.fn();
    await report(callback, { reportedPlayer: "Innocent", chat: "forged evidence" });
    expect(PlayerReport.mock.calls[0][0]).toMatchObject({
      gameUid: "table",
      reportingPlayer: "Bob",
      reportedPlayer: "Alice",
      comment: "harassment",
      neighborMessageId: incoming.neighborChat.id,
      neighborChatContext: [incoming, outgoing],
    });
    expect(JSON.stringify(PlayerReport.mock.calls)).not.toMatch(/unrelated secret|forged evidence|Innocent/);
    expect(callback).toHaveBeenCalledWith({ success: true });
    if (live) expect(Game.findOne).not.toHaveBeenCalled();
  });

  it("bounds context to nearby messages from the same pair", async () => {
    archive.neighborChats = Array.from({ length: 30 }, () => message("Alice", "Bob"));
    archive.neighborChats[15] = incoming;
    await report();
    expect(PlayerReport.mock.calls[0][0].neighborChatContext).toEqual(archive.neighborChats.slice(10, 21));
  });

  it.each([
    "Alice",
    "Carol",
    "Moderator",
  ])("does not let %s report someone else's received message", async (username) => {
    const callback = jest.fn();
    await handleReportNeighborChat(
      { user: username },
      { gameUid: "table", messageId: incoming.neighborChat.id, comment: "bad" },
      callback
    );
    expect(PlayerReport).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it.each([
    null,
    {},
    { messageId: "forged" },
    { comment: " " },
    { comment: "x".repeat(141) },
  ])("rejects malformed report %j without saving", async (data) => {
    const callback = jest.fn();
    if (data === null) await handleReportNeighborChat({ user: "Bob" }, null, callback);
    else await report(callback, Object.keys(data).length ? data : { gameUid: {} });
    expect(PlayerReport).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("acknowledges duplicates and enforces the per-game report limit", async () => {
    PlayerReport.find.mockReturnValue(query([{ neighborMessageId: incoming.neighborChat.id }]));
    const duplicate = jest.fn();
    await report(duplicate);
    expect(duplicate).toHaveBeenCalledWith({ success: true });
    expect(PlayerReport).not.toHaveBeenCalled();
    PlayerReport.find.mockReturnValue(query(Array.from({ length: 4 }, () => ({ neighborMessageId: randomUUID() }))));
    const limited = jest.fn();
    await report(limited);
    expect(limited).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(PlayerReport).not.toHaveBeenCalled();
  });

  it("does not race two concurrent submissions past the per-game limit", async () => {
    let finish;
    PlayerReport.save.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const first = report();
    const callback = jest.fn();
    await report(callback);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    finish({});
    await first;
    expect(PlayerReport).toHaveBeenCalledTimes(1);
  });

  it("catches storage failure and allows a later retry", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    PlayerReport.save.mockRejectedValueOnce(new Error("offline"));
    const failed = jest.fn();
    await report(failed);
    expect(failed).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    const retried = jest.fn();
    await report(retried);
    expect(retried).toHaveBeenCalledWith({ success: true });
    log.mockRestore();
  });
});

describe("moderator evidence access", () => {
  it.each([undefined, "", "altmod", "veteran"])("denies non-reviewer role %s", async (staffRole) => {
    Account.findOne.mockReturnValue(query({ staffRole }));
    await sendUserReports(makeSocket("Reviewer"));
    expect(PlayerReport.find).not.toHaveBeenCalled();
  });

  it("shows retained evidence after the game, while hiding evidence and free text during play", async () => {
    Account.findOne.mockReturnValue(query({ staffRole: "moderator" }));
    const evidence = {
      gameUid: "table",
      neighborMessageId: incoming.neighborChat.id,
      neighborChatContext: [incoming],
      comment: "quoted private text",
      reportedPlayer: "Alice",
      reportingPlayer: "Bob",
    };
    PlayerReport.find.mockReturnValue(query([evidence]));
    const socket = makeSocket("Reviewer");
    games.table = { gameState: {} };
    await sendUserReports(socket);
    const liveReport = socket.emit.mock.calls[0][1][0];
    expect(liveReport).not.toHaveProperty("neighborChatContext");
    expect(JSON.stringify(liveReport)).not.toMatch(/quoted private text|Alice|Bob/);
    delete games.table;
    socket.emit.mockClear();
    await sendUserReports(socket);
    expect(socket.emit).toHaveBeenCalledWith("reportInfo", [evidence]);
  });
});
