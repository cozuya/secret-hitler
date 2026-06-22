import { moderationActionSchema } from "../../../../routes/socket/user-events/moderation.schema";

describe("moderationActionSchema", () => {
  describe("rejects malformed payloads that previously crashed the process", () => {
    it("rejects a non-object", () => {
      expect(moderationActionSchema.safeParse("nope").success).toBe(false);
      expect(moderationActionSchema.safeParse(null).success).toBe(false);
      expect(moderationActionSchema.safeParse(undefined).success).toBe(false);
    });

    it("rejects wrong types on string fields", () => {
      expect(moderationActionSchema.safeParse({ userName: 123 }).success).toBe(false);
      expect(moderationActionSchema.safeParse({ ip: { evil: true } }).success).toBe(false);
      expect(moderationActionSchema.safeParse({ comment: ["x"] }).success).toBe(false);
    });

    it("rejects an action object without a string type", () => {
      expect(moderationActionSchema.safeParse({ userName: "x", action: { foo: 1 } }).success).toBe(false);
      expect(moderationActionSchema.safeParse({ userName: "x", action: { type: 5 } }).success).toBe(false);
    });

    it("rejects an actionless non-report payload (would crash on data.action.type)", () => {
      expect(moderationActionSchema.safeParse({ userName: "someone" }).success).toBe(false);
    });

    it("rejects wrong types on flag/number fields", () => {
      expect(moderationActionSchema.safeParse({ isReportResolveChange: "yes" }).success).toBe(false);
      expect(moderationActionSchema.safeParse({ frontEndTime: "soon" }).success).toBe(false);
    });
  });

  describe("accepts representative real payloads", () => {
    it("accepts a string action", () => {
      expect(moderationActionSchema.safeParse({ userName: "x", action: "ban" }).success).toBe(true);
    });

    it("accepts an object action with isNonSeason", () => {
      const res = moderationActionSchema.safeParse({ userName: "x", action: { type: "setWins10", isNonSeason: true } });
      expect(res.success).toBe(true);
    });

    it("accepts the report-resolve payload", () => {
      expect(moderationActionSchema.safeParse({ isReportResolveChange: true, _id: "abc123" }).success).toBe(true);
    });

    it("accepts the lagMeter payload", () => {
      expect(moderationActionSchema.safeParse({ action: "lagMeter", frontEndTime: 1700000000000 }).success).toBe(true);
    });

    it("keeps unknown keys (passthrough during initial rollout)", () => {
      const res = moderationActionSchema.safeParse({ userName: "x", action: "ban", somethingNew: 42 });
      expect(res.success).toBe(true);
      expect(res.data.somethingNew).toBe(42);
    });
  });

  describe("coerces string defaults so the handler cannot throw on missing fields", () => {
    it("defaults userName, ip, and comment to empty strings", () => {
      const res = moderationActionSchema.safeParse({ action: "broadcast" });
      expect(res.success).toBe(true);
      expect(res.data.userName).toBe("");
      expect(res.data.ip).toBe("");
      expect(res.data.comment).toBe("");
    });
  });
});
