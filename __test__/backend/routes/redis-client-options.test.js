const { getRedisClientOptions } = require("../../../routes/redis-client-options");

describe("getRedisClientOptions", () => {
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it("uses the explicit db when REDIS_URL is unset", () => {
    delete process.env.REDIS_URL;

    expect(getRedisClientOptions(10)).toEqual({ db: 10 });
  });

  it("keeps REDIS_URL connection details but ignores its path/query/hash", () => {
    process.env.REDIS_URL = "redis://example.test:6379/4?ignored=true#ignored";

    expect(getRedisClientOptions(11)).toEqual({
      url: "redis://example.test:6379/",
      db: 11,
    });
  });

  it("wires TLS for rediss URLs and normalizes the scheme to redis", () => {
    process.env.REDIS_URL = "rediss://example.test:6379/4?ignored=true#ignored";

    expect(getRedisClientOptions(10)).toEqual({
      url: "redis://example.test:6379/",
      db: 10,
      tls: { servername: "example.test" },
    });
  });

  it("rejects non-redis schemes", () => {
    process.env.REDIS_URL = "http://example.test:6379";

    expect(() => getRedisClientOptions(10)).toThrow("rediss://");
  });
});
