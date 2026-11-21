const {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  newDeleteAccountOAuthRequest,
  takeDeleteAccountOAuthRequest,
  hasFreshOAuthConfirmation,
} = require("../../routes/account-deletion");

describe("account deletion authorization", () => {
  test("requires a password for an older local account without an isLocal flag", () => {
    expect(accountDeletionAuthMode({ username: "legacy", hash: "old-hash" })).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode({ username: "legacy", discordUID: "123", hash: "old-hash" })).toBe(AUTH_PASSWORD);
  });

  test("requires a password for a local account linked to a provider", () => {
    expect(accountDeletionAuthMode({ isLocal: true, discordUID: "123" })).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode({ isLocal: true, githubUsername: "octocat", hash: "old-hash" })).toBe(AUTH_PASSWORD);
  });

  test("recognizes an existing OAuth-only account without an isLocal flag", () => {
    expect(accountDeletionAuthMode({ username: "legacy-oauth", discordUID: "123" })).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ username: "legacy-oauth", githubUsername: "octocat" })).toBe(AUTH_OAUTH);
  });

  test("uses confirmed OAuth signup history for legacy OAuth accounts with a random local password", () => {
    const legacyOAuth = { username: "legacy-oauth", discordUID: "123", hash: "random-internal-password" };

    expect(accountDeletionAuthMode(legacyOAuth, ["discord"])).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode(legacyOAuth, ["local"])).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode(legacyOAuth, ["local", "discord"])).toBe(AUTH_PASSWORD);
  });

  test("uses the account creation date when the OAuth signup predates the signup log", () => {
    const legacyOAuth = { username: "legacy-oauth", githubUsername: "octocat", hash: "random-internal-password" };

    expect(accountDeletionAuthMode({ ...legacyOAuth, created: "2019-01-01T00:00:00Z" }, [])).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ ...legacyOAuth, created: "2018-01-01T00:00:00Z" }, [])).toBe(AUTH_PASSWORD);
  });

  test("uses provider confirmation only for an explicitly non-local linked account", () => {
    expect(accountDeletionAuthMode({ isLocal: false, discordUID: "123" })).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ isLocal: false, githubUsername: "octocat" })).toBe(AUTH_OAUTH);
  });

  test("defaults to password verification when the account type is unknown", () => {
    expect(accountDeletionAuthMode({})).toBe(AUTH_PASSWORD);
  });
});

describe("account deletion CSRF token", () => {
  test("accepts only the token stored in the session", () => {
    const token = newDeleteAccountCsrfToken();
    const session = { deleteAccountCsrf: token };

    expect(validDeleteAccountCsrf(session, token)).toBe(true);
    expect(validDeleteAccountCsrf(session, token.slice(0, -1))).toBe(false);
    expect(validDeleteAccountCsrf(session, undefined)).toBe(false);
    expect(validDeleteAccountCsrf({}, token)).toBe(false);
  });
});

describe("fresh OAuth deletion confirmation", () => {
  test("accepts a recent confirmation for the same account", () => {
    const session = {
      deleteAccountConfirmedUser: "alice",
      deleteAccountConfirmedAt: 1000,
    };

    expect(hasFreshOAuthConfirmation(session, "alice", 1000 + 60 * 1000)).toBe(true);
  });

  test("rejects an expired, missing, or different-account confirmation", () => {
    const session = {
      deleteAccountConfirmedUser: "alice",
      deleteAccountConfirmedAt: 1000,
    };
    const expired = 1000 + 6 * 60 * 1000;

    expect(hasFreshOAuthConfirmation(session, "alice", expired)).toBe(false);
    expect(hasFreshOAuthConfirmation(session, "bob", 1000 + 60 * 1000)).toBe(false);
    expect(hasFreshOAuthConfirmation({}, "alice", 1000)).toBe(false);
  });
});

describe("OAuth state for account deletion", () => {
  test("a normal sign-in callback cannot confirm deletion", () => {
    const session = {};

    expect(takeDeleteAccountOAuthRequest(session, "alice", "discord", undefined)).toBeNull();
    expect(takeDeleteAccountOAuthRequest(session, "alice", "discord", "not-issued")).toBeNull();
    expect(session.deleteAccountConfirmedUser).toBeUndefined();
  });

  test("accepts only the matching request and consumes the state once", () => {
    const session = {};
    const state = newDeleteAccountOAuthRequest(session, "alice", "discord", 1000);

    expect(takeDeleteAccountOAuthRequest(session, "alice", "discord", state, 2000)).not.toBeNull();
    expect(takeDeleteAccountOAuthRequest(session, "alice", "discord", state, 2000)).toBeNull();
  });

  test("rejects expired state and state issued for another account or provider", () => {
    const expiredSession = {};
    const expiredState = newDeleteAccountOAuthRequest(expiredSession, "alice", "discord", 1000);
    expect(
      takeDeleteAccountOAuthRequest(expiredSession, "alice", "discord", expiredState, 1000 + 11 * 60 * 1000)
    ).toBeNull();

    const wrongAccountSession = {};
    const wrongAccountState = newDeleteAccountOAuthRequest(wrongAccountSession, "alice", "discord", 1000);
    expect(takeDeleteAccountOAuthRequest(wrongAccountSession, "bob", "discord", wrongAccountState, 2000)).toBeNull();

    const wrongProviderSession = {};
    const wrongProviderState = newDeleteAccountOAuthRequest(wrongProviderSession, "alice", "discord", 1000);
    expect(takeDeleteAccountOAuthRequest(wrongProviderSession, "alice", "github", wrongProviderState, 2000)).toBeNull();
  });
});
