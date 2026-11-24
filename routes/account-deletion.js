const crypto = require("crypto");

const AUTH_PASSWORD = "password";
const AUTH_OAUTH = "oauth";
const OAUTH_CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_PREFIX = "delete-account-";

const linkedProviderId = (account, provider) => {
  if (!account || account.oauthSignupProvider !== provider) return undefined;
  if (provider === "discord") return account.discordUID;
  if (provider === "github") return account.githubUID;
};

// Legacy signup history cannot establish whether the player later set a password.
// Use the recorded signup provider for accounts explicitly marked passwordless.
const accountDeletionAuthMode = (account) => {
  return account?.isLocal === false && linkedProviderId(account, account.oauthSignupProvider) ? AUTH_OAUTH : AUTH_PASSWORD;
};

const safeEqual = (actual, expected) => {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const newDeleteAccountCsrfToken = () => crypto.randomBytes(32).toString("hex");

const validDeleteAccountCsrf = (session, token) => Boolean(session) && safeEqual(token, session.deleteAccountCsrf);

const isDeleteAccountOAuthState = (state) => typeof state === "string" && state.startsWith(OAUTH_STATE_PREFIX);

const newDeleteAccountOAuthRequest = (session, account, provider, now = Date.now()) => {
  const state = OAUTH_STATE_PREFIX + crypto.randomBytes(32).toString("hex");
  delete session.deleteAccountConfirmation;
  session.deleteAccountOAuth = {
    state,
    accountId: String(account._id),
    provider,
    providerId: linkedProviderId(account, provider),
    expiresAt: now + OAUTH_STATE_TTL_MS,
  };
  return state;
};

const takeDeleteAccountOAuthRequest = (session, account, provider, state, now = Date.now()) => {
  const request = session && session.deleteAccountOAuth;
  if (!request || !safeEqual(state, request.state)) return null;
  delete session.deleteAccountOAuth;
  if (!account || request.accountId !== String(account._id) || request.provider !== provider) return null;
  if (!request.providerId || request.providerId !== linkedProviderId(account, provider)) return null;
  if (!(request.expiresAt >= now)) return null;
  return request;
};

const confirmAccountDeletion = (session, { accountId, provider, providerId }, now = Date.now()) => {
  session.deleteAccountConfirmation = { accountId, provider, providerId, expiresAt: now + OAUTH_CONFIRMATION_TTL_MS };
};

const hasFreshOAuthConfirmation = (session, account, now = Date.now()) => {
  const confirmation = session?.deleteAccountConfirmation;
  return Boolean(
    confirmation &&
      confirmation.accountId === String(account._id) &&
      confirmation.providerId &&
      confirmation.providerId === linkedProviderId(account, confirmation.provider) &&
      confirmation.expiresAt >= now
  );
};

module.exports = {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  linkedProviderId,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  isDeleteAccountOAuthState,
  newDeleteAccountOAuthRequest,
  takeDeleteAccountOAuthRequest,
  confirmAccountDeletion,
  hasFreshOAuthConfirmation,
};
