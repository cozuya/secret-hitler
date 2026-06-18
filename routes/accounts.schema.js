const { z } = require("zod");

// Express/qs lets a client send objects/arrays for body fields; several of these reach a
// Mongoose query or a string method (`.trim`/`.split`) unguarded, so a forged shape could
// inject a query operator or throw a TypeError into the request. Require plain strings.
// Optional fields are `.nullable().optional()` because forms/JSON may legitimately send an
// empty or null value, which the handlers already treat as "absent".

// username/password are required non-empty strings — this also reproduces the old
// `!username || !password || !password2` empty check. Unknown flags (isPrivate, …) pass through.
const signupBodySchema = z
  .object({
    username: z.string().min(1),
    password: z.string().min(1),
    password2: z.string().min(1),
    email: z.string().nullable().optional(),
    bypass: z.string().nullable().optional(),
    bypassKey: z.string().nullable().optional(),
  })
  .passthrough();

const changePasswordBodySchema = z.object({ newPassword: z.string(), newPasswordConfirm: z.string() }).passthrough();

// add-email / change-email both allow an absent email (clearing it); reject only non-string shapes.
const emailBodySchema = z.object({ email: z.string().nullable().optional() }).passthrough();

const usernameBodySchema = z.object({ username: z.string() }).passthrough();

module.exports = { signupBodySchema, changePasswordBodySchema, emailBodySchema, usernameBodySchema };
