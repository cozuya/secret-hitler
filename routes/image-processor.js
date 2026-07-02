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
      const finish = (resp, err) => {
        if (done) return;
        done = true;
        clearTimeout(pipeTimeout);
        callback(resp, err);
      };
      const cleanupTempFile = () => {
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
        clearTimeout(pipeTimeout);
        Account.findOne({ username: username })
          .then((account) => {
            if (!account) {
              cleanupTempFile();
              finish(null, new Error("Account not found."));
              return;
            }
            fs.rename(tempCardbackPath, finalCardbackPath, (renameErr) => {
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
                  finish(null, err3);
                  return;
                }
                const user = userList.find((u) => u.userName === username);
                if (user) {
                  user.customCardback = "png";
                  user.customCardbackUid = account.gameSettings.customCardbackUid;
                  userListEmitter.send = true;
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
