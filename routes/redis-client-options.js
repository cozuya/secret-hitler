const getRedisClientOptions = (db) => {
  const { REDIS_URL } = process.env;
  const invalidRedisUrlMessage = "Invalid REDIS_URL. Expected a full Redis URL with a redis:// or rediss:// scheme.";

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
  const isTls = url.protocol === "rediss:";
  if (url.protocol !== "redis:" && !isTls) {
    throw new Error(invalidRedisUrlMessage);
  }
  // node_redis 2.x lets a URL path override options.db. Keep the connection details from REDIS_URL,
  // but make the selected database come only from this load-bearing option.
  url.pathname = "/";
  url.search = "";
  url.hash = "";

  // node_redis 2.x doesn't enable TLS from the rediss:// scheme on its own. Normalize the scheme to
  // redis:// (so its URL parser handles host/port/auth) and turn on encryption with an explicit
  // `tls` option — managed Redis/Valkey (e.g. Render's external endpoint) hands out rediss:// URLs.
  // If a provider ever uses self-signed certs, set tls.rejectUnauthorized = false here.
  if (isTls) {
    url.protocol = "redis:";
  }

  const options = {
    url: url.toString(),
    db,
  };
  if (isTls) {
    // node_redis 2.x passes this straight to tls.connect and does NOT derive the SNI servername from
    // the parsed host. Managed rediss endpoints commonly require SNI, so set it explicitly from the
    // URL host or the handshake can get the provider's default cert / a refusal. (url.hostname is
    // untouched by the scheme normalization above — only protocol/path/query/hash were changed.)
    options.tls = { servername: url.hostname };
  }
  return options;
};

module.exports = { getRedisClientOptions };
