const { z } = require("zod");

// These routes look a record up by a query-string value that flows straight into a Mongoose
// query (or, for the cardback, a string `.split`). Express/qs hands us an object or array for
// `?id[$ne]=`-style input — that's NoSQL operator injection, and for `findById` it also
// produces a CastError that previously crashed the (broken) `debug` catch. Requiring a plain
// string defuses both; the route's existing not-found response covers the rejection.
const idQuerySchema = z.object({ id: z.string() }).passthrough();
const usernameQuerySchema = z.object({ username: z.string() }).passthrough();
const cardbackBodySchema = z.object({ image: z.string() }).passthrough();

module.exports = { idQuerySchema, usernameQuerySchema, cardbackBodySchema };
