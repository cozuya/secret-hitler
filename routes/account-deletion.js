const crypto = require("crypto");

const AUTH_PASSWORD = "password";
const AUTH_OAUTH = "oauth";
const OAUTH_CONFIRMATION_TTL_MS = 5 * 60 * 1000;

// A missing isLocal flag is not proof that an account has no password. Only
// accounts explicitly marked non-local and linked to a provider are OAuth-only.
const accountDeletionAuthMode = (account) => {
  if (account.isLocal === true) return AUTH_PASSWORD;
  if (account.isLocal === false && (account.discordUID || account.githubUsername)) return AUTH_OAUTH;
  return AUTH_PASSWORD;
};

const newDeleteAccountCsrfToken = () => crypto.randomBytes(32).toString("hex");

const validDeleteAccountCsrf = (session, token) => {
  const expected = session && session.deleteAccountCsrf;
  if (typeof token !== "string" || typeof expected !== "string") return false;
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const hasFreshOAuthConfirmation = (session, username, now = Date.now()) =>
  Boolean(
    session &&
      session.deleteAccountConfirmedUser === username &&
      typeof session.deleteAccountConfirmedAt === "number" &&
      now - session.deleteAccountConfirmedAt <= OAUTH_CONFIRMATION_TTL_MS
  );

module.exports = {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  hasFreshOAuthConfirmation,
};
