const {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  hasFreshOAuthConfirmation,
} = require("../../routes/account-deletion");

describe("account deletion authorization", () => {
  test("requires a password for an older local account without an isLocal flag", () => {
    expect(accountDeletionAuthMode({ username: "legacy", hash: "old-hash" })).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode({ username: "legacy", discordUID: "123" })).toBe(AUTH_PASSWORD);
  });

  test("requires a password for a local account linked to a provider", () => {
    expect(accountDeletionAuthMode({ isLocal: true, discordUID: "123" })).toBe(AUTH_PASSWORD);
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
