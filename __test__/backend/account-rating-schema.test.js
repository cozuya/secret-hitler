const Account = require("../../models/account");
const { STARTING_PUBLIC_RATING } = require("../../routes/socket/rating/public-ladder");

afterEach(() => jest.restoreAllMocks());

it("admits only lifetime mu/sigma on construction, set and save", async () => {
  expect(Account.schema.options.strict).toBe(true);
  for (const path of [
    "rating.season",
    "rating.season.mu",
    "rating.season.sigma",
    "rating.season.display",
    "rating.overall.display",
  ]) {
    expect(Account.schema.path(path)).toBeUndefined();
  }
  for (const path of ["rating.overall.mu", "rating.overall.sigma"]) {
    expect(Account.schema.path(path).instance).toBe("Number");
    expect(Account.schema.path(path).defaultValue).toBeUndefined();
  }
  const account = new Account({
    username: "strict-rating",
    rating: { overall: { mu: 30, sigma: 2, display: 1720 }, season: { mu: 25, sigma: 8, display: 1600 } },
  });
  account.set("rating.overall.display", 9999);
  account.set("rating.season", { mu: 100, sigma: 1, display: 9999 });
  account.set("rating.season.mu", 100);
  const insert = jest.spyOn(Account.collection, "insertOne").mockImplementation((document, options, callback) => {
    callback(null, { insertedId: document._id });
  });
  await account.save();
  expect(account.toObject().rating).toEqual({ overall: { mu: 30, sigma: 2 } });
  expect(insert.mock.calls[0][0].rating).toEqual({ overall: { mu: 30, sigma: 2 } });
});

it("defaults absent maxElo to the public start while retaining explicit stored values", () => {
  expect(STARTING_PUBLIC_RATING).toBe(1500);
  expect(new Account({ username: "fresh" }).maxElo).toBe(1500);
  // Mongoose also applies defaults on hydration of missing paths; this is not creation-only.
  expect(Account.hydrate({ username: "old-without-max" }).maxElo).toBe(1500);
  for (const maxElo of [0, 1600, 2400, null]) {
    expect(Account.hydrate({ username: "stored-max", maxElo }).maxElo).toBe(maxElo);
  }
});

it("retains retired raw Mongo fields on hydration without writing them during a lifetime update", async () => {
  const raw = new Account({ username: "historical", maxElo: 1900 }).toObject();
  raw.rating = { overall: { mu: 30, sigma: 2, display: 1720 }, season: { mu: 25, sigma: 8, display: 1600 } };
  const account = Account.hydrate(raw);
  expect(account.toObject().rating).toEqual(raw.rating);
  expect(account.get("rating.overall.display")).toBe(1720);
  expect(account.get("rating.season")).toEqual(raw.rating.season);
  account.set("rating.overall.mu", 31);
  account.set("rating.overall.sigma", 1.9);
  const update = jest
    .spyOn(Account.collection, "updateOne")
    .mockImplementation((filter, changes, options, callback) => {
      callback(null, { n: 1, nModified: 1, ok: 1 });
    });
  await account.save();
  expect(update.mock.calls[0][1]).toEqual({ $set: { "rating.overall.mu": 31, "rating.overall.sigma": 1.9 } });
  expect(account.get("rating.season")).toEqual(raw.rating.season);
  expect(account.get("rating.overall.display")).toBe(1720);
});
