import { secureGame, sendInProgressGameUpdate } from "../../../../routes/socket/util";

describe("util", () => {
  it("has a secureGame function", () => {
    expect(typeof secureGame).toBe("function");
  });

  it("has a sendInProgressGameUpdate function", () => {
    expect(typeof sendInProgressGameUpdate).toBe("function");
  });

  it("hydrates only the recipient's remake vote and keeps other votes private", () => {
    const previousIO = global.io;
    const socket = (user) => ({ handshake: { session: { passport: { user } } }, emit: jest.fn() });
    const ada = socket("Ada");
    const grace = socket("Grace");
    const observer = socket("Observer");
    global.io = {
      sockets: {
        adapter: { rooms: { game: { sockets: { ada: true, grace: true, observer: true } } } },
        connected: { ada, grace, observer },
      },
    };
    const game = {
      general: { uid: "game" },
      gameState: { isCompleted: true, isTracksFlipped: true },
      publicPlayersState: [{ userName: "Ada" }, { userName: "Grace" }],
      remakeData: [
        { userName: "Ada", isRemaking: true },
        { userName: "Grace", isRemaking: false },
      ],
      private: { commandChats: {} },
      chats: [],
    };
    try {
      sendInProgressGameUpdate(game, true);
      expect(ada.emit.mock.calls[0][1].remakeStatus).toBe(true);
      expect(grace.emit.mock.calls[0][1].remakeStatus).toBe(false);
      expect(observer.emit.mock.calls[0][1].remakeStatus).toBeUndefined();
      for (const recipient of [ada, grace, observer]) {
        expect(recipient.emit.mock.calls[0][1].remakeData).toBeUndefined();
      }
    } finally {
      global.io = previousIO;
    }
  });
});
