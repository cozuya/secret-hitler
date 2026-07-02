import { generalChatSchema, gameChatSchema } from "../../../../routes/socket/user-events/chat.schema";

describe("generalChatSchema", () => {
  it("rejects payloads that would crash the async handler", () => {
    expect(generalChatSchema.safeParse(undefined).success).toBe(false);
    expect(generalChatSchema.safeParse(null).success).toBe(false);
    expect(generalChatSchema.safeParse({}).success).toBe(false); // missing chat
    expect(generalChatSchema.safeParse({ chat: 123 }).success).toBe(false);
    expect(generalChatSchema.safeParse({ chat: ["x"] }).success).toBe(false);
  });

  it("accepts a string chat and keeps unknown keys", () => {
    expect(generalChatSchema.safeParse({ chat: "hello" }).success).toBe(true);
    const res = generalChatSchema.safeParse({ chat: "hello", extra: 1 });
    expect(res.success).toBe(true);
    expect(res.data.extra).toBe(1);
  });

  it("accepts an empty string (handler owns the empty/length rules)", () => {
    expect(generalChatSchema.safeParse({ chat: "" }).success).toBe(true);
  });
});

describe("gameChatSchema", () => {
  it("rejects payloads that would crash the async handler", () => {
    expect(gameChatSchema.safeParse(undefined).success).toBe(false);
    expect(gameChatSchema.safeParse({}).success).toBe(false); // missing chat
    expect(gameChatSchema.safeParse({ chat: 123 }).success).toBe(false);
  });

  it("rejects a non-string uid when present", () => {
    expect(gameChatSchema.safeParse({ chat: "rrb", uid: 99 }).success).toBe(false);
  });

  it("accepts chat with and without uid", () => {
    expect(gameChatSchema.safeParse({ chat: "rrb" }).success).toBe(true);
    expect(gameChatSchema.safeParse({ chat: "rrb", uid: "game1" }).success).toBe(true);
  });
});
