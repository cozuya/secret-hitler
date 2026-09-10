const { z } = require("zod");

const replayUidSchema = z.string().min(1).max(200);

module.exports = { replayUidSchema };
