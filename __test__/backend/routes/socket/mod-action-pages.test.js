const Account = require("../../../../models/account");
const ModAction = require("../../../../models/modAction");
const { loadModActionPage, sendModActionPage } = require("../../../../routes/socket/mod-action-pages");

const query = (result) => {
  const builder = {};
  for (const method of ["select", "maxTimeMS", "sort", "limit"]) builder[method] = jest.fn(() => builder);
  builder.lean = jest.fn(() => Promise.resolve(result));
  return builder;
};
let socket, accountQuery, actionsQuery;
beforeEach(() => {
  socket = { handshake: { session: { passport: { user: "Staff" } } } };
  accountQuery = query({ staffRole: "admin" });
  actionsQuery = query([]);
  jest.spyOn(Account, "findOne").mockReturnValue(accountQuery);
  jest.spyOn(ModAction, "find").mockReturnValue(actionsQuery);
});
afterEach(() => jest.restoreAllMocks());

it("returns at most 500 projected actions and an indexed cursor, even when more history exists", async () => {
  actionsQuery.lean.mockResolvedValue(
    Array.from({ length: 501 }, (_, index) => ({
      _id: (1000 - index).toString(16).padStart(24, "0"),
      modNotes: "Note",
    }))
  );
  const page = await loadModActionPage(socket);
  expect(page.actions).toHaveLength(500);
  expect(page.hasMore).toBe(true);
  expect(page.nextCursor).toBe(page.actions[499]._id);
  expect(actionsQuery.limit).toHaveBeenCalledWith(501);
  expect(actionsQuery.sort).toHaveBeenCalledWith({ _id: -1 });
  expect(actionsQuery.select).toHaveBeenCalledWith("date modUserName ip userActedOn modNotes actionTaken");
  expect(actionsQuery.maxTimeMS).toHaveBeenCalledWith(2000);
  const nextSocket = { ...socket };
  await loadModActionPage(nextSocket, { before: page.nextCursor });
  expect(ModAction.find).toHaveBeenLastCalledWith({ _id: { $lt: page.nextCursor } });
});

it.each([
  1,
  1000000,
  { before: { $gt: "" } },
  { before: "invalid" },
  { before: "0".repeat(24), count: 1000 },
])("rejects malformed or unbounded request %j before reading Mongo", async (request) => {
  await expect(loadModActionPage(socket, request)).rejects.toThrow("Invalid");
  expect(Account.findOne).not.toHaveBeenCalled();
  expect(ModAction.find).not.toHaveBeenCalled();
});

it.each([null, "contributor", "veteran", ""])("rechecks permissions before querying audits (%p)", async (role) => {
  accountQuery.lean.mockResolvedValue(role === null ? null : { staffRole: role });
  await expect(loadModActionPage(socket)).rejects.toThrow("access");
  expect(ModAction.find).not.toHaveBeenCalled();
});

it("rejects a burst while a query is pending, and recovers after a rejected query", async () => {
  let rejectQuery;
  actionsQuery.lean.mockReturnValueOnce(new Promise((_, reject) => (rejectQuery = reject)));
  const pending = loadModActionPage(socket);
  await Promise.resolve();
  await expect(loadModActionPage(socket)).rejects.toThrow("Please wait");
  expect(ModAction.find).toHaveBeenCalledTimes(1);
  rejectQuery(new Error("database unavailable"));
  await expect(pending).rejects.toThrow("database unavailable");
  const now = Date.now();
  jest.spyOn(Date, "now").mockReturnValue(now + 1100);
  await expect(loadModActionPage(socket)).resolves.toMatchObject({ actions: [], hasMore: false });
});

it("gives trial moderators the log without mutating action permissions", async () => {
  accountQuery.lean.mockResolvedValue({ staffRole: "trialmod" });
  expect((await loadModActionPage(socket)).showActions).toBe(false);
});

it("reports a bounded request error through the acknowledgement", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const ack = jest.fn();
  await sendModActionPage(socket, { before: "bad" }, ack);
  expect(ack).toHaveBeenCalledWith({ success: false, error: "Invalid moderation log request." });
  log.mockRestore();
});
