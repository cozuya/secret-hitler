const Account = require("../../../../models/account");
const Game = require("../../../../models/game");
const { games, userList } = require("../../../../routes/socket/models");
const { handleAddNewGame } = require("../../../../routes/socket/user-events/create-game");

jest.mock("gfycat-style-urls", () => ({ generateCombination: () => "NeighborChatGame" }));
jest.mock("../../../../routes/socket/user-requests", () => ({
  updateUserStatus: jest.fn(),
  sendGameList: jest.fn(),
}));

describe("create-game Neighbor Chat", () => {
  const originalIo = global.io;
  let user;
  let socket;

  beforeEach(() => {
    user = { userName: "Creator", status: { type: "none" } };
    userList.push(user);
    socket = { join: jest.fn(), emit: jest.fn() };
    global.io = { sockets: { emit: jest.fn() } };
    jest.spyOn(Game, "findOne").mockResolvedValue(null);
    jest.spyOn(Account, "findOne").mockResolvedValue({ username: user.userName });
  });

  afterEach(() => {
    delete games.NeighborChatGame;
    userList.splice(userList.indexOf(user), 1);
    global.io = originalIo;
    jest.restoreAllMocks();
  });

  it.each([
    [{ neighborChat: true }, true],
    [{ neighborChat: false }, false],
    [{ neighborChat: true, playerChats: "enabled" }, true],
    [{ neighborChat: true, playerChats: "disabled" }, false],
    [{}, false],
  ])("stores and delivers the opt-in flag without forcing casual (%j)", async (options, expected) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      { gameName: "Neighbor Chat", gameType: "ranked", ...options }
    );

    expect(games.NeighborChatGame.general).toMatchObject({
      neighborChat: expected,
      casualGame: false,
      practiceGame: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      "gameUpdate",
      expect.objectContaining({ general: expect.objectContaining({ neighborChat: expected }) })
    );
  });

  it("keeps Neighbor Chat available in emote-only casual games", async () => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      {
        gameName: "Neighbor emotes",
        gameType: "casual",
        neighborChat: true,
        playerChats: "emotes",
      }
    );
    expect(games.NeighborChatGame.general).toMatchObject({ neighborChat: true, playerChats: "emotes" });
  });

  it.each(["blindMode", "avalonSH", "monarchistSH"])("keeps Neighbor Chat enabled with %s", async (mode) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      {
        gameName: "Neighbor Chat",
        gameType: "ranked",
        neighborChat: true,
        [mode]: true,
      }
    );

    expect(games.NeighborChatGame.general.neighborChat).toBe(true);
  });

  it.each([
    "false",
    "true",
    0,
    1,
    null,
    {},
    [],
  ])("rejects an invalid Neighbor Chat flag %j before creating anything", async (neighborChat) => {
    await handleAddNewGame(socket, { user: user.userName }, { gameName: "Neighbor Chat", neighborChat });
    expect(games.NeighborChatGame).toBeUndefined();
    expect(Game.findOne).not.toHaveBeenCalled();
    expect(Account.findOne).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(global.io.sockets.emit).not.toHaveBeenCalled();
    expect(user.status).toEqual({ type: "none" });
  });
});
