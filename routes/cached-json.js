// Share refreshes across concurrent requests and back off failures, including before the first
// successful load. A stale payload remains useful while Mongo is unavailable.
module.exports = (load, fallback, ttlMs = 60000, retryMs = 10000) => {
  let cached;
  let refreshAt = 0;
  let pending;

  return (req, res) => {
    if (!pending && Date.now() >= refreshAt) {
      pending = Promise.resolve()
        .then(load)
        .then((payload) => {
          cached = payload;
          refreshAt = Date.now() + ttlMs;
        })
        .catch(() => {
          refreshAt = Date.now() + retryMs;
        })
        .then(() => {
          pending = null;
        });
    }
    return Promise.resolve(pending).then(() => res.json(cached === undefined ? fallback() : cached));
  };
};
