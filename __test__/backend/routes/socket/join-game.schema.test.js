import { updateSeatedUserSchema } from "../../../../routes/socket/user-events/join-game.schema";

describe("updateSeatedUserSchema", () => {
  describe("rejects malformed payloads", () => {
    it("rejects non-objects", () => {
      expect(updateSeatedUserSchema.safeParse(undefined).success).toBe(false);
      expect(updateSeatedUserSchema.safeParse(null).success).toBe(false);
    });

    it("rejects a missing or non-string uid", () => {
      expect(updateSeatedUserSchema.safeParse({}).success).toBe(false);
      expect(updateSeatedUserSchema.safeParse({ uid: 123 }).success).toBe(false);
    });

    it("rejects a non-string password when present", () => {
      expect(updateSeatedUserSchema.safeParse({ uid: "g1", password: { evil: true } }).success).toBe(false);
    });
  });

  describe("accepts real payloads", () => {
    it("accepts a public-game seat (no password)", () => {
      expect(updateSeatedUserSchema.safeParse({ uid: "g1" }).success).toBe(true);
    });

    it("accepts a private-game seat with a password", () => {
      expect(updateSeatedUserSchema.safeParse({ uid: "g1", password: "hunter2" }).success).toBe(true);
    });
  });
});
