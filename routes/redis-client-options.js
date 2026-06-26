const getRedisClientOptions = (db) => {
  const { REDIS_URL } = process.env;
  const invalidRedisUrlMessage = "Invalid REDIS_URL. Expected a full Redis URL including a redis:// scheme.";

  if (!REDIS_URL) {
    return { db };
  }

  let url;
  try {
    url = new URL(REDIS_URL);
  } catch (err) {
    throw new Error(invalidRedisUrlMessage, {
      cause: err,
    });
  }
  if (url.protocol !== "redis:") {
    throw new Error(invalidRedisUrlMessage);
  }
  // node_redis 2.x lets a URL path override options.db. Keep the connection details from REDIS_URL,
  // but make the selected database come only from this load-bearing option.
  url.pathname = "/";
  url.search = "";
  url.hash = "";

  return {
    url: url.toString(),
    db,
  };
};

module.exports = { getRedisClientOptions };
