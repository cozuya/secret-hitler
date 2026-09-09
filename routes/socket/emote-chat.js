const filterEmoteChat = (chat, emoteList) => {
  const emotes = Object.keys(emoteList);
  return chat
    .toLowerCase()
    .split(/(:[a-z]*?:)/g)
    .map((block) => {
      if (block.length <= 2 || !block.startsWith(":") || !block.endsWith(":")) {
        return block.replace(/[^0-9]/g, "");
      }
      if (emotes.includes(block)) {
        return ` ${block} `;
      }
    })
    .join("");
};

module.exports = { filterEmoteChat };
