import cachedJson from "../../../routes/cached-json";

describe("cached JSON responses", () => {
  let now;
  const response = () => ({ json: jest.fn() });

  beforeEach(() => {
    now = 1000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  it("coalesces simultaneous loads and caches successful results", async () => {
    let resolveLoad;
    const load = jest.fn(() => new Promise((resolve) => (resolveLoad = resolve)));
    const handler = cachedJson(load, () => ({}));
    const first = response();
    const second = response();
    const a = handler({}, first);
    const b = handler({}, second);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    resolveLoad({ board: ["Ada"] });
    await Promise.all([a, b]);
    expect(first.json).toHaveBeenCalledWith({ board: ["Ada"] });
    expect(second.json).toHaveBeenCalledWith({ board: ["Ada"] });
    await handler({}, response());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("backs off a failed refresh (previous payload: %s) and then recovers", async (warm) => {
    const load = jest.fn().mockResolvedValue({ board: ["Ada"] });
    const handler = cachedJson(load, () => ({ board: [] }));
    if (warm) await handler({}, response());
    load.mockRejectedValue(new Error("offline"));
    now += 60000;
    await handler({}, response());
    const requests = load.mock.calls.length;
    const stale = response();
    now += 9999;
    await handler({}, stale);
    expect(load).toHaveBeenCalledTimes(requests);
    expect(stale.json).toHaveBeenCalledWith({ board: warm ? ["Ada"] : [] });
    now++;
    load.mockResolvedValue({ board: ["Grace"] });
    const recovered = response();
    await handler({}, recovered);
    expect(load).toHaveBeenCalledTimes(requests + 1);
    expect(recovered.json).toHaveBeenCalledWith({ board: ["Grace"] });
  });
});
