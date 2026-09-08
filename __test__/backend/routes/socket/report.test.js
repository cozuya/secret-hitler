import { makeReport } from "../../../../routes/socket/report";
import Account from "../../../../models/account";
import https from "https";
import { EventEmitter } from "events";

describe("util", () => {
  it("has a makeReport function", () => {
    expect(typeof makeReport).toBe("function");
  });
});

describe("report delivery failures", () => {
  const originalEnvironment = process.env.NODE_ENV;
  const data = { player: "Ada", role: "liberal", situation: "test", uid: "game", gameType: "ranked" };
  const game = () => ({
    general: { uid: "game" },
    customGameSettings: { enabled: false },
    private: { seatedPlayers: [] },
    publicPlayersState: [],
  });

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment;
    jest.restoreAllMocks();
  });

  it("handles a rejected staff query", async () => {
    const error = new Error("database unavailable");
    jest.spyOn(Account, "find").mockReturnValue({ lean: () => Promise.reject(error) });
    await expect(makeReport(data, game(), "modchat")).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalledWith(error, "err preparing Discord report");
  });

  it.each(["modchat", "ping"])("handles an asynchronous Discord request error for %s", async (type) => {
    jest.spyOn(Account, "find").mockReturnValue({ lean: () => Promise.resolve([]) });
    const req = new EventEmitter();
    req.end = jest.fn();
    jest.spyOn(https, "request").mockReturnValue(req);
    await makeReport(data, game(), type);
    const error = new Error("DNS unavailable");
    expect(() => req.emit("error", error)).not.toThrow();
    expect(console.log).toHaveBeenCalledWith(error, expect.stringContaining("err sending Discord"));
  });

  it("handles a rejected IP-match query in an auto-report", async () => {
    const error = new Error("database unavailable");
    jest.spyOn(Account, "findOne").mockImplementation((query, callback) => callback(null, { signupIP: "127.0.0.1" }));
    jest.spyOn(Account, "find").mockRejectedValue(error);
    makeReport(data, game());
    // makeReport's callback API starts this chain without returning it to the socket caller.
    await new Promise((resolve) => setImmediate(resolve));
    expect(console.log).toHaveBeenCalledWith(error, "err preparing report IP matches");
  });
});
