// This classifies only the rows the server has authorized for this viewer.
export const isReplayWhisper = (chat) =>
  Boolean(chat?.neighborChat) ||
  (Array.isArray(chat?.chat) && chat.chat.some((segment) => segment?.type === "neighbor-chat"));
