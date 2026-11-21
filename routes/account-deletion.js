const crypto = require("crypto");

const AUTH_PASSWORD = "password";
const AUTH_OAUTH = "oauth";
const OAUTH_CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_SIGNUP_TYPES = ["discord", "github"];
// OAuth shipped before provider signups were written to the Signups log, so an
// empty history still identifies accounts created after this rollout.
const OAUTH_SIGNUP_EPOCH_MS = Date.parse("2018-12-04T00:00:00Z");

const hasProviderLink = (account) => Boolean(account && (account.discordUID || account.githubUsername));

// OAuth signups used to receive an unusable random local password. Treat a
// provider-linked account as OAuth-only only without a local password or when
// its stored signup history proves it was created through a provider.
const accountDeletionAuthMode = (account, signupTypes) => {
  if (!account || account.isLocal === true) return AUTH_PASSWORD;
  if (!hasProviderLink(account)) return AUTH_PASSWORD;
  if (!account.hash && !account.salt && !account.password) return AUTH_OAUTH;
  if (account.isLocal === false) return AUTH_OAUTH;
  if (Array.isArray(signupTypes)) {
    if (signupTypes.length > 0 && signupTypes.every((type) => OAUTH_SIGNUP_TYPES.includes(type))) {
      return AUTH_OAUTH;
    }
    if (signupTypes.length === 0 && account.created) {
      return new Date(account.created).getTime() >= OAUTH_SIGNUP_EPOCH_MS ? AUTH_OAUTH : AUTH_PASSWORD;
    }
  }
  return AUTH_PASSWORD;
};

const safeEqual = (actual, expected) => {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const newDeleteAccountCsrfToken = () => crypto.randomBytes(32).toString("hex");

const validDeleteAccountCsrf = (session, token) => Boolean(session) && safeEqual(token, session.deleteAccountCsrf);

const newDeleteAccountOAuthRequest = (session, username, provider, now = Date.now()) => {
  const state = crypto.randomBytes(32).toString("hex");
  session.deleteAccountOAuth = {
    state,
    username,
    provider,
    expiresAt: now + OAUTH_STATE_TTL_MS,
  };
  return state;
};

const takeDeleteAccountOAuthRequest = (session, username, provider, state, now = Date.now()) => {
  const request = session && session.deleteAccountOAuth;
  if (!request || !safeEqual(state, request.state)) return null;
  delete session.deleteAccountOAuth;
  if (request.username !== username || request.provider !== provider) return null;
  if (typeof request.expiresAt !== "number" || now > request.expiresAt) return null;
  return request;
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
  newDeleteAccountOAuthRequest,
  takeDeleteAccountOAuthRequest,
  hasFreshOAuthConfirmation,
};
