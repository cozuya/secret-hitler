const CHAT_REVIEW_ROLES = new Set(["admin", "editor", "moderator", "trialmod"]);
// Bound memory and saved documents without silently deleting evidence from an accepted conversation.
const MAX_NEIGHBOR_MESSAGES = 1000;
const isChatReviewer = (account) => Boolean(account && CHAT_REVIEW_ROLES.has(account.staffRole));
const isNeighborChat = (chat) =>
  Boolean(chat?.neighborChat) ||
  (Array.isArray(chat?.chat) && chat.chat.some((segment) => segment?.type === "neighbor-chat"));
const publicChats = (chats) => (Array.isArray(chats) ? chats.filter((chat) => !isNeighborChat(chat)) : []);
const isChatParticipant = (chat, username) =>
  typeof username === "string" &&
  (chat?.neighborChat?.sender === username || chat?.neighborChat?.recipient === username);

const archivedNeighborChats = (game) => {
  const seen = new Set();
  return [game.neighborChats, game.chats, game.hiddenInfoChat]
    .flatMap((chats) => (Array.isArray(chats) ? chats.filter(isNeighborChat) : []))
    .filter((chat) => {
      const key = chat.neighborChat?.id || JSON.stringify([chat.timestamp, chat.chat]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const replayForViewer = (game, username, canReview) => {
  const result = { ...game, chats: publicChats(game.chats) };
  delete result.neighborChats;
  delete result.hiddenInfoChat;
  // Older rows have no trustworthy participant metadata. Only reviewers may read those rows.
  result.chats.push(...archivedNeighborChats(game).filter((chat) => canReview || isChatParticipant(chat, username)));
  if (canReview) result.hiddenInfoChat = game.hiddenInfoChat || [];
  return result;
};

module.exports = {
  MAX_NEIGHBOR_MESSAGES,
  isChatReviewer,
  isNeighborChat,
  publicChats,
  isChatParticipant,
  archivedNeighborChats,
  replayForViewer,
};
