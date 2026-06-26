const fs = require("fs");
const path = require("path");

// Single source of truth for where user-uploaded custom cardbacks live on disk.
//
// Custom cardbacks are PNGs uploaded at runtime by rainbow users and must survive deploys.
// On Render the service filesystem is ephemeral (wiped on every deploy/restart) AND the built
// `public/` tree isn't writable by the runtime user — overwriting an existing cardback there
// throws EACCES, which (via an unhandled stream error) used to crash the whole process. So in
// production CARDBACK_DIR points at a mounted Persistent Disk (see render.yaml). Locally it
// defaults to the in-repo public/ path, so dev behavior is unchanged.
//
// The write path (image-processor.js), the static serve route (app.js), and the rename
// copy/unlink (moderation.js) all import this so they can never drift out of sync — a mismatch
// would silently 404 every cardback.
const CARDBACK_DIR = process.env.CARDBACK_DIR || path.join(__dirname, "..", "public", "images", "custom-cardbacks");
const cardbackPath = (username) => path.join(CARDBACK_DIR, `${username}.png`);

// A freshly-mounted disk starts empty; make sure the dir exists before the first upload writes
// to it (and so the static route has something to serve). Synchronous + at require time so it's
// done before any request is handled.
fs.mkdirSync(CARDBACK_DIR, { recursive: true });

module.exports = { CARDBACK_DIR, cardbackPath };
