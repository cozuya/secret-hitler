const https = require("https");
const { games } = require("../models");
const Game = require("../../../models/game");
const PlayerReport = require("../../../models/playerReport");
const { sendInProgressGameUpdate } = require("../util");
const { muteNeighborChatSchema, reportNeighborChatSchema } = require("./neighbor-chat.schema");

const reply = (callback, success, error) => {
  if (typeof callback === "function") callback({ success, ...(error ? { error } : {}) });
};

const handleMuteNeighborChat = (passport, data, callback) => {
  const parsed = muteNeighborChatSchema.safeParse(data);
  if (!parsed.success || typeof passport?.user !== "string")
    return reply(callback, false, "Invalid Neighbor Chat setting.");
  data = parsed.data;
  const game = games[data.gameUid];
  const player = game?.private?.seatedPlayers?.find((player) => player.userName === passport?.user);
  if (!player || !game.general.neighborChat) return reply(callback, false, "You must be seated in this game.");
  if (Boolean(player.neighborChatMuted) === data.muted) return reply(callback, true);
  player.neighborChatMuted = data.muted;
  sendInProgressGameUpdate(game, true);
  reply(callback, true);
};

const pendingReports = new Set();
const notifyReport = (gameUid) => {
  if (process.env.NODE_ENV !== "production" || !process.env.DISCORDURL) return;
  // Keep private conversation text in the access-controlled report, not in the webhook message.
  const body = JSON.stringify({
    content: `Neighbor Chat abuse report submitted for <https://secrethitler.io/game/#/table/${encodeURIComponent(gameUid)}>. Review it in Player Reports; chat evidence is available after the game.`,
    allowed_mentions: { parse: [] },
  });
  try {
    const req = https.request({
      hostname: "discordapp.com",
      path: process.env.DISCORDURL,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    });
    req.on("error", (err) => console.log(err, "err notifying Neighbor Chat report"));
    req.end(body);
  } catch (err) {
    console.log(err, "err notifying Neighbor Chat report");
  }
};

const handleReportNeighborChat = async (passport, data, callback) => {
  const parsed = reportNeighborChatSchema.safeParse(data);
  const username = passport?.user;
  if (!parsed.success || typeof username !== "string") return reply(callback, false, "Invalid Neighbor Chat report.");
  data = parsed.data;
  const key = JSON.stringify([username, data.gameUid]);
  if (pendingReports.has(key)) return reply(callback, false, "Please wait for your previous report.");
  pendingReports.add(key);
  try {
    const live = games[data.gameUid];
    const history =
      live?.private?.neighborChats ||
      (await Game.findOne({ uid: data.gameUid }).select("neighborChats").lean())?.neighborChats ||
      [];
    const message = history.find((chat) => chat.neighborChat?.id === data.messageId);
    // Identity and evidence come from the server. A caller cannot report someone else's private conversation.
    if (!message || message.neighborChat.recipient !== username)
      return reply(callback, false, "That received message is unavailable.");
    const previous = await PlayerReport.find({
      gameUid: data.gameUid,
      reportingPlayer: username,
      neighborMessageId: { $exists: true },
    })
      .select("neighborMessageId")
      .limit(4)
      .lean();
    if (previous.some((report) => report.neighborMessageId === data.messageId)) return reply(callback, true);
    if (previous.length >= 4) return reply(callback, false, "You have reached the report limit for this game.");
    const sender = message.neighborChat.sender;
    const conversation = history.filter(
      (chat) =>
        (chat.neighborChat?.sender === sender && chat.neighborChat.recipient === username) ||
        (chat.neighborChat?.sender === username && chat.neighborChat.recipient === sender)
    );
    const index = conversation.indexOf(message);
    await new PlayerReport({
      date: new Date(),
      gameUid: data.gameUid,
      reportingPlayer: username,
      reportedPlayer: sender,
      reason: "Abusive Chat",
      gameType: "Neighbor Chat",
      comment: data.comment,
      isActive: true,
      neighborMessageId: data.messageId,
      neighborChatContext: conversation.slice(Math.max(0, index - 5), index + 6),
    }).save();
    notifyReport(data.gameUid);
    reply(callback, true);
  } catch (err) {
    console.log(err, "err saving Neighbor Chat report");
    reply(callback, false, "Unable to save the report right now. Please try again.");
  } finally {
    pendingReports.delete(key);
  }
};

module.exports = { handleMuteNeighborChat, handleReportNeighborChat };
