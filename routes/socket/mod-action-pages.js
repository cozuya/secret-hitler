const { z } = require("zod");
const Account = require("../../models/account");
const ModAction = require("../../models/modAction");
const { obfIP } = require("./ip-obf");

const PAGE_SIZE = 500;
const requestSchema = z
  .object({
    before: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .nullable()
      .optional(),
  })
  .strict();
const requests = new WeakMap();
const roles = new Set(["admin", "editor", "moderator", "trialmod"]);

// Use Mongo's existing _id index rather than scanning/skipping every preceding page.
// Only one bounded query may run for this socket; refresh and pagination share the guard.
const loadModActionPage = async (socket, request = {}) => {
  const parsed = requestSchema.safeParse(request);
  const username = socket.handshake?.session?.passport?.user;
  if (!parsed.success || typeof username !== "string" || socket.disconnected || socket._replacedBySocketId) {
    throw new Error("Invalid moderation log request.");
  }
  const state = requests.get(socket);
  if (state?.pending || (state && Date.now() - state.started < 1000)) {
    throw new Error("Please wait before requesting another moderation log page.");
  }
  const current = { pending: true, started: Date.now() };
  requests.set(socket, current);
  try {
    // Re-check current persisted permissions rather than a connection-time staff flag.
    const account = await Account.findOne({ username }).select("staffRole").maxTimeMS(2000).lean();
    if (!roles.has(account?.staffRole)) throw new Error("You do not have access to the moderation log.");
    const query = parsed.data.before ? { _id: { $lt: parsed.data.before } } : {};
    const records = await ModAction.find(query)
      .sort({ _id: -1 })
      .limit(PAGE_SIZE + 1)
      .select("date modUserName ip userActedOn modNotes actionTaken")
      .maxTimeMS(2000)
      .lean();
    if (socket.disconnected || socket._replacedBySocketId) throw new Error("The connection changed. Please try again.");
    const actions = records.slice(0, PAGE_SIZE).map((action) => {
      let ip = action.ip;
      if (ip) {
        try {
          ip = ip.startsWith("-") ? "ERROR" : `-${obfIP(ip)}`;
        } catch {
          ip = "ERROR";
        }
      }
      return { ...action, ip };
    });
    return {
      actions,
      hasMore: records.length > PAGE_SIZE,
      nextCursor: actions.length ? String(actions[actions.length - 1]._id) : null,
      showActions: account.staffRole !== "trialmod",
    };
  } finally {
    current.pending = false;
  }
};

const sendModActionPage = async (socket, request, callback) => {
  if (typeof callback !== "function") return;
  try {
    callback({ success: true, ...(await loadModActionPage(socket, request)) });
  } catch (error) {
    console.log(error, "err retrieving moderation log page");
    callback({ success: false, error: error.message });
  }
};

module.exports = { loadModActionPage, sendModActionPage, PAGE_SIZE };
