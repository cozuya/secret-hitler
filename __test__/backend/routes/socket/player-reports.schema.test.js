import { playerReportSchema, REPORT_REASONS } from "../../../../routes/socket/user-events/player-reports.schema";

const valid = () => ({ reason: "cheating", comment: "they were cheating", reportedPlayer: "bob", uid: "abc123" });

describe("playerReportSchema", () => {
  describe("rejects malformed payloads", () => {
    it("rejects non-objects", () => {
      expect(playerReportSchema.safeParse(undefined).success).toBe(false);
      expect(playerReportSchema.safeParse(null).success).toBe(false);
      expect(playerReportSchema.safeParse("x").success).toBe(false);
    });

    it("rejects an invalid reason (replaces the old regex guard)", () => {
      expect(playerReportSchema.safeParse({ ...valid(), reason: "not-a-reason" }).success).toBe(false);
      expect(playerReportSchema.safeParse({ ...valid(), reason: 5 }).success).toBe(false);
    });

    it("rejects an empty or over-long comment (replaces the routes.js length guard)", () => {
      expect(playerReportSchema.safeParse({ ...valid(), comment: "" }).success).toBe(false);
      expect(playerReportSchema.safeParse({ ...valid(), comment: "x".repeat(141) }).success).toBe(false);
      expect(playerReportSchema.safeParse({ ...valid(), comment: 123 }).success).toBe(false);
    });

    it("rejects a missing/non-string reportedPlayer (prevents the .split crash)", () => {
      const { reportedPlayer, ...noReported } = valid();
      expect(playerReportSchema.safeParse(noReported).success).toBe(false);
      expect(playerReportSchema.safeParse({ ...valid(), reportedPlayer: { evil: true } }).success).toBe(false);
    });
  });

  describe("accepts real payloads", () => {
    it("accepts an in-game report", () => {
      expect(playerReportSchema.safeParse(valid()).success).toBe(true);
    });

    it("accepts a homepage report (no uid)", () => {
      const { uid, ...noUid } = valid();
      expect(playerReportSchema.safeParse(noUid).success).toBe(true);
    });

    it("accepts every canonical reason", () => {
      for (const reason of REPORT_REASONS) {
        expect(playerReportSchema.safeParse({ ...valid(), reason }).success).toBe(true);
      }
    });

    it("accepts a comment of exactly 140 chars", () => {
      expect(playerReportSchema.safeParse({ ...valid(), comment: "x".repeat(140) }).success).toBe(true);
    });
  });
});
