import { idQuerySchema, usernameQuerySchema, cardbackBodySchema } from "../../../routes/index.schema";
import {
  signupBodySchema,
  changePasswordBodySchema,
  emailBodySchema,
  usernameBodySchema,
} from "../../../routes/accounts.schema";

// Express/qs turns `?id[$ne]=` into an object, which is NoSQL operator injection when it
// reaches a Mongoose query (and a CastError for findById). These schemas require a plain
// string so the route early-returns its not-found / error response instead.

describe.each([
  ["idQuerySchema", idQuerySchema, "id"],
  ["usernameQuerySchema", usernameQuerySchema, "username"],
  ["cardbackBodySchema", cardbackBodySchema, "image"],
])("%s (string field, passthrough)", (_name, schema, field) => {
  it("accepts a plain string and keeps other keys", () => {
    const res = schema.safeParse({ [field]: "abc", extra: 1 });
    expect(res.success).toBe(true);
    expect(res.data[field]).toBe("abc");
    expect(res.data.extra).toBe(1);
  });

  it("rejects operator-injection objects, arrays, and a missing field", () => {
    expect(schema.safeParse({ [field]: { $ne: null } }).success).toBe(false);
    expect(schema.safeParse({ [field]: ["a"] }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});

describe("signupBodySchema", () => {
  it("accepts a real signup body and passes through unknown flags (isPrivate)", () => {
    const res = signupBodySchema.safeParse({
      username: "alice",
      password: "hunter2",
      password2: "hunter2",
      email: "a@b.com",
      isPrivate: true,
    });
    expect(res.success).toBe(true);
    expect(res.data.isPrivate).toBe(true);
  });

  it("allows absent/null email and bypass (handlers treat them as absent)", () => {
    expect(signupBodySchema.safeParse({ username: "a", password: "p", password2: "p" }).success).toBe(true);
    expect(signupBodySchema.safeParse({ username: "a", password: "p", password2: "p", email: null }).success).toBe(
      true
    );
  });

  it("rejects empty or non-string username/password (reproduces the old empty check + type safety)", () => {
    expect(signupBodySchema.safeParse({ username: "", password: "p", password2: "p" }).success).toBe(false);
    expect(signupBodySchema.safeParse({ username: { $ne: 1 }, password: "p", password2: "p" }).success).toBe(false);
    expect(signupBodySchema.safeParse({ password: "p", password2: "p" }).success).toBe(false);
  });
});

describe("changePasswordBodySchema / emailBodySchema / usernameBodySchema", () => {
  it("changePassword requires both fields as strings", () => {
    expect(changePasswordBodySchema.safeParse({ newPassword: "x", newPasswordConfirm: "x" }).success).toBe(true);
    expect(changePasswordBodySchema.safeParse({ newPassword: "x" }).success).toBe(false);
    expect(changePasswordBodySchema.safeParse({ newPassword: ["x"], newPasswordConfirm: "x" }).success).toBe(false);
  });

  it("email is optional but must be a string when present", () => {
    expect(emailBodySchema.safeParse({}).success).toBe(true);
    expect(emailBodySchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(emailBodySchema.safeParse({ email: { $ne: null } }).success).toBe(false);
  });

  it("username body must be a string", () => {
    expect(usernameBodySchema.safeParse({ username: "bob" }).success).toBe(true);
    expect(usernameBodySchema.safeParse({ username: ["bob"] }).success).toBe(false);
  });
});
