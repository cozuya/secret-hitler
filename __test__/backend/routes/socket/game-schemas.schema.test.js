import { assassinateSchema } from "../../../../routes/socket/game/assassination.schema";
import { selectChancellorSchema } from "../../../../routes/socket/game/election-util.schema";
import { voteSchema, policySelectionSchema } from "../../../../routes/socket/game/election.schema";
import { playerIndexSchema, voteSchema as ppVoteSchema } from "../../../../routes/socket/game/policy-powers.schema";

// Each game handler used to deref a wire field directly (seatedPlayers[data.playerIndex],
// publicPlayersState[data.chancellorIndex], currentElectionPolicies[data.selection]).
// A forged non-numeric / non-boolean / missing value crashed the whole process. These
// schemas reject those payloads (early-return in the handler) while accepting every real
// client emit, which always carries a numeric index/selection or boolean vote plus `uid`.

describe.each([
  ["assassinateSchema", assassinateSchema, "playerIndex"],
  ["selectChancellorSchema", selectChancellorSchema, "chancellorIndex"],
  ["policy-powers playerIndexSchema", playerIndexSchema, "playerIndex"],
])("%s (integer index field)", (_name, schema, field) => {
  it("accepts a real client payload (numeric index + uid passthrough)", () => {
    const res = schema.safeParse({ [field]: 3, uid: "abc" });
    expect(res.success).toBe(true);
    expect(res.data[field]).toBe(3);
    expect(res.data.uid).toBe("abc");
  });

  it("accepts seat 0", () => {
    expect(schema.safeParse({ [field]: 0, uid: "g" }).success).toBe(true);
  });

  it("rejects the known crashers: string, object, float, missing, and non-object data", () => {
    expect(schema.safeParse({ [field]: "2" }).success).toBe(false);
    expect(schema.safeParse({ [field]: {} }).success).toBe(false);
    expect(schema.safeParse({ [field]: 2.5 }).success).toBe(false);
    expect(schema.safeParse({ uid: "g" }).success).toBe(false); // field absent
    expect(schema.safeParse(undefined).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });
});

describe.each([
  ["election voteSchema", voteSchema],
  ["policy-powers voteSchema", ppVoteSchema],
])("%s (boolean vote field)", (_name, schema) => {
  it("accepts boolean votes from the client and the timer", () => {
    expect(schema.safeParse({ vote: true, uid: "g" }).success).toBe(true);
    expect(schema.safeParse({ vote: false, uid: "g" }).success).toBe(true);
  });

  it("rejects non-boolean / missing vote and non-object data", () => {
    expect(schema.safeParse({ vote: "yes" }).success).toBe(false);
    expect(schema.safeParse({ vote: 1 }).success).toBe(false);
    expect(schema.safeParse({ uid: "g" }).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });
});

describe("policySelectionSchema (integer selection field)", () => {
  it("accepts the real client/timer selections (0–3)", () => {
    for (const selection of [0, 1, 2, 3]) {
      expect(policySelectionSchema.safeParse({ selection, uid: "g" }).success).toBe(true);
    }
  });

  it("rejects string/object/float/missing selection", () => {
    expect(policySelectionSchema.safeParse({ selection: "1" }).success).toBe(false);
    expect(policySelectionSchema.safeParse({ selection: {} }).success).toBe(false);
    expect(policySelectionSchema.safeParse({ selection: 1.5 }).success).toBe(false);
    expect(policySelectionSchema.safeParse({ uid: "g" }).success).toBe(false);
  });
});
