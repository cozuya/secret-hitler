const Crusher = require("pngcrush");
const Jimp = require("jimp");
const Stream = require("stream");
const Account = require("../models/account");
const fs = require("fs");
const { cardbackPath } = require("./cardback-store");
const { userList, userListEmitter, games } = require("./socket/models");
const { sendCommandChatsUpdate } = require("./socket/util");
const { sendGameList } = require("./socket/user-requests");

const CARD_BACK_UPLOAD_PIPE_TIMEOUT_MS = 15000;

module.exports.ProcessImage = (username, raw, callback) => {
  Jimp.read(Buffer.from(raw, "base64"), (err, img) => {
    if (err) {
      callback(null, err);
      return;
    }
    img.resize(70, 95).getBuffer(Jimp.MIME_PNG, (err2, buff) => {
      if (err2) {
        callback(null, err2);
        return;
      }
      const streamPass = new Stream.PassThrough();
      streamPass.end(buff);
      const crusher = new Crusher(["-brute", "-rem", "alla", "-c", "2", "-force", "-fix"]);
      const finalCardbackPath = cardbackPath(username);
      const tempCardbackPath = `${finalCardbackPath}.${process.pid}.${Date.now()}.tmp`;
      const writeStream = fs.createWriteStream(tempCardbackPath);

      // The pipe chain emits 'error' asynchronously — e.g. EACCES when the runtime user can't
      // overwrite an existing cardback on disk. With no 'error' listener Node re-throws it as an
      // uncaughtException, which crashes the whole process and ends every live game. Guard every
      // stage, report the failure through the existing callback, and only mutate the DB / notify
      // clients once the temp file is fully written and closed. `done` makes callback fire exactly
      // once so a write error can't race the success path into a double res.json.
      let done = false;
      // Once the temp file is being renamed onto the live path it must NOT be unlinked: a timeout
      // firing mid-rename would otherwise delete the source, the rename would fail with ENOENT, and the
      // upload would silently not apply. Guards cleanupTempFile below.
      let renameStarted = false;
      const finish = (resp, err) => {
        if (done) return;
        done = true;
        clearTimeout(pipeTimeout);
        callback(resp, err);
      };
      const cleanupTempFile = () => {
        if (renameStarted) return;
        fs.unlink(tempCardbackPath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.log(unlinkErr, "Failed to remove temporary cardback upload");
          }
        });
      };
      const failPipe = (err) => {
        if (done) return;
        streamPass.destroy();
        if (typeof crusher.destroy === "function") crusher.destroy();
        writeStream.destroy();
        cleanupTempFile();
        finish(null, err);
      };
      const pipeTimeout = setTimeout(() => {
        failPipe(new Error("Timed out while processing cardback upload."));
      }, CARD_BACK_UPLOAD_PIPE_TIMEOUT_MS);
      streamPass.on("error", failPipe);
      crusher.on("error", failPipe);
      writeStream.on("error", failPipe);

      writeStream.on("close", () => {
        if (done) return;
        // Don't clear the timeout here — the findOne -> rename -> save stage below is still async, and
        // a hung network-disk fs.rename or stalled Mongo op would otherwise leave the request hanging
        // forever. finish() (called by every terminal path, incl. the timeout) owns clearing the timer.
        // Trade-off: a >15s stall after the rename reports "Timed out" even though the PNG is already
        // live (the renameStarted guard above keeps the timeout from unlinking it mid-rename, so it
        // really does land) — accepted, because a bounded false-failure the user can retry beats an
        // unbounded hang, and a slow save self-heals on the next upload.
        Account.findOne({ username: username })
          .then((account) => {
            if (!account) {
              cleanupTempFile();
              finish(null, new Error("Account not found."));
              return;
            }
            renameStarted = true;
            fs.rename(tempCardbackPath, finalCardbackPath, (renameErr) => {
              renameStarted = false; // rename resolved (ok or err) — temp is safe to clean up again
              if (renameErr) {
                cleanupTempFile();
                finish(null, renameErr);
                return;
              }
              account.gameSettings.customCardback = "png";
              account.gameSettings.customCardbackSaveTime = Date.now().toString();
              account.gameSettings.customCardbackUid = Math.random().toString(36).substring(2);
              account.save((err3) => {
                if (err3) {
                  // Partial-failure edge: the temp file was already renamed onto the live path, so the
                  // new image is on disk but the cache-busting customCardbackUid never persisted —
                  // clients keep serving the old UID's (now stale) URL. Rare, and self-heals on the
                  // next successful upload; left as-is rather than reordering the write for one edge.
                  finish(null, err3);
                  return;
                }
                const user = userList.find((u) => u.userName === username);
                if (user) {
                  user.customCardback = "png";
                  user.customCardbackUid = account.gameSettings.customCardbackUid;
                  userListEmitter.markDirty();
                }
                Object.keys(games).forEach((uid) => {
                  const game = games[uid];
                  const foundUser = game.publicPlayersState.find((user) => user.userName === username);
                  if (foundUser) {
                    foundUser.customCardback = "";
                    sendCommandChatsUpdate(game);
                    sendGameList();
                  }
                });
                const socketId = Object.keys(io.sockets.sockets).find(
                  (socketId) =>
                    io.sockets.sockets[socketId].handshake.session.passport &&
                    io.sockets.sockets[socketId].handshake.session.passport.user === username
                );
                if (socketId && io.sockets.sockets[socketId]) {
                  io.sockets.sockets[socketId].emit("gameSettings", account.gameSettings);
                }
                finish("Image uploaded successfully.");
              });
            });
          })
          .catch((err3) => {
            cleanupTempFile();
            finish(null, err3);
          });
      });

      streamPass.pipe(crusher).pipe(writeStream);
    });
  });
};
