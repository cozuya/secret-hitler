const { filterEmoteChat } = require("../../../../routes/socket/emote-chat");

describe("emote-game chat filter", () => {
  const emotes = { ":smile:": "/smile.png", ":wave:": "/wave.png" };

  it.each([
    ["Words 12 and 3!", "123"],
    [":smile:", " :smile: "],
    ["HELLO :SMILE: 12 :unknown:", " :smile: 12"],
    [":smile::wave:", " :smile:  :wave: "],
    [":unknown:", ""],
    ["plain text", ""],
    ["", ""],
    ["::", ""],
    [":smile1:", ""],
    ["text :smile1: text", "1"],
    ["1.2\n-3", "123"],
  ])("preserves the existing filtered output for %j", (input, expected) => {
    expect(filterEmoteChat(input, emotes)).toBe(expected);
  });

  it("only preserves emotes in the supplied whitelist", () => {
    expect(filterEmoteChat(":smile: 7", {})).toBe("7");
  });
});
