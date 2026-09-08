import Account from "../../../../models/account";
import BannedIP from "../../../../models/bannedIP";
import { userList, userListEmitter, ipbansNotEnforced } from "../../../../routes/socket/models";
import { checkUserStatus } from "../../../../routes/socket/user-events/util";
import { handleSocketDisconnect } from "../../../../routes/socket/user-events/leave-game";
import { sendUserGameSettings } from "../../../../routes/socket/user-requests";

describe("connection initialization", () => {
  let socket;
  let accountLookup;
  let ipLookup;
  const account = { username: "Ada", lastConnectedIP: "127.0.0.1", gameSettings: {} };
  const previousIO = global.io;
  const previousIPBypass = ipbansNotEnforced.status;

  beforeEach(() => {
    userList.length = 0;
    ipbansNotEnforced.status = false;
    global.io = { sockets: { sockets: {} } };
    socket = {
      id: "current",
      disconnected: false,
      handshake: { session: { passport: { user: "Ada" } } },
      emit: jest.fn(),
      disconnect: jest.fn(() => {
        socket.disconnected = true;
        handleSocketDisconnect(socket);
      }),
    };
    global.io.sockets.sockets[socket.id] = socket;
    jest.spyOn(Account, "findOne").mockImplementation((query, callback) => {
      accountLookup = callback;
    });
    jest.spyOn(BannedIP, "find").mockImplementation((query, callback) => {
      ipLookup = callback;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    userList.length = 0;
    userListEmitter.send = false;
    ipbansNotEnforced.status = previousIPBypass;
    global.io = previousIO;
  });

  it("rejects a failed account lookup without logging out the session or authorizing setup", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    const ready = jest.fn();
    checkUserStatus(socket, ready);
    accountLookup(new Error("database unavailable"));
    expect(ready).not.toHaveBeenCalled();
    expect(BannedIP.find).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
    expect(socket.emit).not.toHaveBeenCalledWith("manualDisconnection");
  });

  it.each([null, { ...account, isBanned: true }])("cleans up a rejected account only once (%p)", (result) => {
    userList.push({ userName: "Ada" }, { userName: "Grace" });
    const ready = jest.fn();
    checkUserStatus(socket, ready);
    accountLookup(null, result);
    expect(ready).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("manualDisconnection");
    expect(userList).toEqual([{ userName: "Grace" }]);
  });

  it.each(["account", "ip"])("does not resurrect presence after disconnect during the %s lookup", async (stage) => {
    userList.push({ userName: "Ada" });
    const ready = jest.fn((loaded) => sendUserGameSettings(socket, loaded));
    checkUserStatus(socket, ready);
    if (stage === "ip") accountLookup(null, account);
    socket.disconnect(true);
    if (stage === "account") accountLookup(null, account);
    else ipLookup(null, []);
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();
    expect(userList).toEqual([]);
  });

  it("ignores a replaced socket's delayed rejection without removing its replacement's presence", () => {
    userList.push({ userName: "Ada" });
    const ready = jest.fn();
    checkUserStatus(socket, ready);
    socket._replacedBySocketId = "replacement";
    accountLookup(null, { ...account, isBanned: true });
    expect(ready).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
    handleSocketDisconnect(socket);
    expect(userList).toEqual([{ userName: "Ada" }]);
  });

  it.each([
    "disconnected",
    "_replacedBySocketId",
  ])("skips a settings refresh that becomes stale via %s", async (flag) => {
    let resolveAccount;
    Account.findOne.mockReturnValue(new Promise((resolve) => (resolveAccount = resolve)));
    const pending = sendUserGameSettings(socket);
    socket[flag] = true;
    resolveAccount(account);
    await pending;
    expect(userList).toEqual([]);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("initializes a live socket only after both account and IP validation", async () => {
    const ready = jest.fn((loaded) => sendUserGameSettings(socket, loaded));
    checkUserStatus(socket, ready);
    accountLookup(null, account);
    expect(ready).not.toHaveBeenCalled();
    ipLookup(null, []);
    await Promise.resolve();
    expect(ready).toHaveBeenCalledWith(account);
    expect(userList.map((user) => user.userName)).toEqual(["Ada"]);
  });
});
