const fs = require("fs");
const path = require("path");
const vm = require("vm");
const privacy = require("../../routes/socket/neighbor-chat");

it.each([
  "apiDump.js",
  "dumpGamesAnon.js",
])("%s excludes restricted chat from public download files", async (script) => {
  const legacy = { gameChat: true, chat: [{ text: "Neighbor: " }, { text: "legacy-secret", type: "neighbor-chat" }] };
  const game = {
    uid: "table",
    winningPlayers: [{ userName: "Alice" }],
    losingPlayers: [{ userName: "Bob" }],
    chats: [{ chat: "public message" }, legacy],
    hiddenInfoChat: [{ chat: "hidden-secret" }],
    neighborChats: [{ ...legacy, neighborChat: { id: "message-id", sender: "Alice", recipient: "Bob" } }],
  };
  const summary = { _id: "table", players: [{ username: "Alice" }, { username: "Bob" }], logs: [] };
  const pending = [];
  const cursor = (record) => ({
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return this;
    },
    cursor() {
      return this;
    },
    eachAsync(callback) {
      const work = Promise.resolve(callback(record));
      pending.push(work);
      return work;
    },
  });
  const output = [];
  const files = {
    constants: { W_OK: 2 },
    existsSync: () => true,
    mkdirSync: jest.fn(),
    accessSync: jest.fn(),
    writeFileSync: (file, text) => output.push(JSON.parse(text)),
  };
  const modules = {
    fs: files,
    path,
    child_process: { execSync: jest.fn() },
    mongoose: { connect: jest.fn(), connection: { close: jest.fn() } },
    "../models/game": { find: () => cursor(game) },
    "../models/game-summary": { find: () => cursor(summary) },
    "../models/account": { find: () => cursor({ username: "Alice", hashUid: "anonymous-alice" }) },
    "../routes/socket/neighbor-chat": privacy,
  };
  // Execute the actual export transform with all database, filesystem and process effects replaced.
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../scripts", script), "utf8"), {
    require: (name) => {
      if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
      return modules[name];
    },
    process: { argv: ["node", script, "5", "0", "{}"] },
    console: { log: jest.fn() },
    global: { Promise },
  });
  await Promise.all(pending);
  // The scripts write their file in a completion continuation.
  await Promise.resolve();
  expect(output).toHaveLength(1);
  expect(JSON.stringify(output)).not.toMatch(/legacy-secret|hidden-secret|neighborChats|hiddenInfoChat/);
  const exported = script === "apiDump.js" ? output[0].gameOverview : output[0];
  if (script === "dumpGamesAnon.js") expect(exported.chats).toEqual([{ chat: "public message" }]);
  else expect(exported).not.toHaveProperty("chats");
});
