const Account = require("../../models/account");
const Profile = require("../../models/profile");
const { accounts } = require("../../routes/accounts");
const {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  isDeleteAccountOAuthState,
  newDeleteAccountOAuthRequest,
  takeDeleteAccountOAuthRequest,
  confirmAccountDeletion,
  hasFreshOAuthConfirmation,
} = require("../../routes/account-deletion");

const discordAccount = { _id: "account-id", username: "alice", discordUID: "discord-id" };

describe("account deletion authorization", () => {
  test("keeps password verification for older accounts with unknown password history", () => {
    expect(accountDeletionAuthMode({ username: "legacy", hash: "old-hash" })).toBe(AUTH_PASSWORD);
    expect(
      accountDeletionAuthMode({
        ...discordAccount,
        created: "2019-01-01T00:00:00Z",
        hash: "old-hash",
      })
    ).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode({ githubUsername: "octocat" })).toBe(AUTH_PASSWORD);
  });

  test("requires a password for a password account linked to a provider", () => {
    expect(accountDeletionAuthMode({ ...discordAccount, isLocal: true })).toBe(AUTH_PASSWORD);
  });

  test("uses the provider for a linked account known to have no user-set password", () => {
    expect(accountDeletionAuthMode(discordAccount)).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ ...discordAccount, isLocal: false, hash: "generated" })).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ isLocal: false, githubUID: "42" })).toBe(AUTH_OAUTH);
    expect(accountDeletionAuthMode({ isLocal: false, githubUsername: "octocat" })).toBe(AUTH_PASSWORD);
    expect(accountDeletionAuthMode({})).toBe(AUTH_PASSWORD);
  });

  test("records a chosen password and then requires it for deletion", async () => {
    const account = new Account({ ...discordAccount, _id: undefined, isLocal: false });
    const save = jest.spyOn(account, "save").mockResolvedValue(account);
    await account.setLocalPassword("user-chosen-password");
    expect(account.hash).toBeTruthy();
    expect(account.isLocal).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(accountDeletionAuthMode(account)).toBe(AUTH_PASSWORD);
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

describe("OAuth state for account deletion", () => {
  test("a normal sign-in callback cannot confirm deletion", () => {
    const session = {};
    const state = newDeleteAccountOAuthRequest(session, discordAccount, "discord");
    expect(isDeleteAccountOAuthState(state)).toBe(true);
    expect(isDeleteAccountOAuthState(undefined)).toBe(false);
    expect(takeDeleteAccountOAuthRequest(session, discordAccount, "discord", undefined)).toBeNull();
    expect(hasFreshOAuthConfirmation(session, discordAccount)).toBe(false);
  });

  test("accepts only the matching request and consumes the state once", () => {
    const session = {};
    const state = newDeleteAccountOAuthRequest(session, discordAccount, "discord", 1000);

    expect(takeDeleteAccountOAuthRequest(session, discordAccount, "discord", state, 2000)).toMatchObject({
      accountId: discordAccount._id,
      provider: "discord",
      providerId: discordAccount.discordUID,
    });
    expect(takeDeleteAccountOAuthRequest(session, discordAccount, "discord", state, 2000)).toBeNull();
  });

  test.each([
    ["expired state", discordAccount, "discord", 1000 + 11 * 60 * 1000],
    ["a reused username", { ...discordAccount, _id: "different-account" }, "discord", 2000],
    ["a changed provider link", { ...discordAccount, discordUID: "different-link" }, "discord", 2000],
    ["a different provider", discordAccount, "github", 2000],
  ])("rejects %s", (_message, account, provider, now) => {
    const session = {};
    const state = newDeleteAccountOAuthRequest(session, discordAccount, "discord", 1000);
    expect(takeDeleteAccountOAuthRequest(session, account, provider, state, now)).toBeNull();
  });
});

describe("fresh OAuth deletion confirmation", () => {
  test("accepts a recent confirmation tied to the account and current provider link", () => {
    const session = {};
    const state = newDeleteAccountOAuthRequest(session, discordAccount, "discord", 1000);
    const request = takeDeleteAccountOAuthRequest(session, discordAccount, "discord", state, 2000);
    confirmAccountDeletion(session, request, 2000);

    expect(hasFreshOAuthConfirmation(session, discordAccount, 2000 + 60 * 1000)).toBe(true);
    expect(hasFreshOAuthConfirmation(session, { ...discordAccount, _id: "replacement" }, 2000)).toBe(false);
    expect(hasFreshOAuthConfirmation(session, { ...discordAccount, discordUID: "different-link" }, 2000)).toBe(false);
    expect(hasFreshOAuthConfirmation(session, discordAccount, 2000 + 6 * 60 * 1000)).toBe(false);
    newDeleteAccountOAuthRequest(session, discordAccount, "discord", 3000);
    expect(hasFreshOAuthConfirmation(session, discordAccount, 3000)).toBe(false);
  });
});

describe("account deletion route", () => {
  const routes = new Map();

  beforeAll(() => {
    const originalApp = global.app;
    global.app = {
      get: jest.fn(),
      post: (path, ...handlers) => {
        routes.set(path, handlers);
      },
    };
    try {
      accounts([]);
    } finally {
      global.app = originalApp;
    }
  });

  afterEach(() => jest.restoreAllMocks());

  const submit = (session, data, path = "/account/delete-account", signedIn = true) =>
    new Promise((resolve, reject) => {
      const req = {
        user: signedIn ? { _id: discordAccount._id } : undefined,
        isAuthenticated: () => signedIn,
        session,
        get: () => undefined,
        body: data,
        logOut: jest.fn(),
      };
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(message) {
          resolve({ statusCode: this.statusCode, message, loggedOut: req.logOut.mock.calls.length === 1 });
        },
        send() {
          this.json(undefined);
        },
      };
      const [authenticate, handleRequest] = routes.get(path);
      authenticate(req, res, () => handleRequest(req, res, reject));
    });

  test("an expired session returns an error for an AJAX deletion", async () => {
    expect(await submit({}, {}, "/account/delete-account", false)).toMatchObject({ statusCode: 401 });
  });

  test("a session alone cannot set the password for a provider-only account", async () => {
    const account = { ...discordAccount, isLocal: false, setLocalPassword: jest.fn() };
    jest.spyOn(Account, "findById").mockReturnValue({ select: () => Promise.resolve(account) });
    const data = { newPassword: "new-password", newPasswordConfirm: "new-password" };

    expect(await submit({}, data, "/account/change-password")).toMatchObject({ statusCode: 400 });
    expect(await submit({}, { ...data, currentPassword: "unverified" }, "/account/change-password")).toMatchObject({
      statusCode: 403,
    });
    expect(account.setLocalPassword).not.toHaveBeenCalled();
  });

  test("a password change verifies the current password before saving", async () => {
    const account = {
      ...discordAccount,
      isLocal: true,
      authenticate: jest.fn().mockResolvedValueOnce({ user: false }).mockResolvedValueOnce({ user: discordAccount }),
      setLocalPassword: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(Account, "findById").mockReturnValue({ select: () => Promise.resolve(account) });
    const data = { currentPassword: "current-password", newPassword: "new-password", newPasswordConfirm: "new-password" };

    expect(await submit({}, data, "/account/change-password")).toMatchObject({ statusCode: 401 });
    expect(account.setLocalPassword).not.toHaveBeenCalled();
    expect(await submit({}, data, "/account/change-password")).toMatchObject({ statusCode: 200 });
    expect(account.setLocalPassword).toHaveBeenCalledWith("new-password");
  });

  test("a password account with a linked provider still verifies its own password", async () => {
    const account = {
      ...discordAccount,
      hash: "stored-hash",
      salt: "stored-salt",
      authenticate: jest.fn().mockResolvedValue({ user: discordAccount }),
    };
    jest.spyOn(Account, "findById").mockReturnValue({ select: () => Promise.resolve(account) });
    const deleteAccount = jest.spyOn(Account, "deleteOne").mockResolvedValue({ deletedCount: 1 });
    const deleteProfile = jest.spyOn(Profile, "deleteOne").mockResolvedValue({ deletedCount: 1 });
    const session = { deleteAccountCsrf: "csrf" };

    expect(await submit(session, { csrfToken: "csrf" })).toMatchObject({ statusCode: 401 });
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(await submit(session, { csrfToken: "csrf", password: "chosen-password" })).toEqual({
      statusCode: 200,
      message: undefined,
      loggedOut: true,
    });
    expect(account.authenticate).toHaveBeenCalledWith("chosen-password");
    expect(deleteAccount).toHaveBeenCalledWith(expect.objectContaining({ _id: account._id, hash: account.hash }));
    expect(deleteProfile).toHaveBeenCalledWith({ _id: account.username });
  });

  test("a provider-confirmed account can delete without a password", async () => {
    const account = { ...discordAccount, isLocal: false };
    jest.spyOn(Account, "findById").mockReturnValue({ select: () => Promise.resolve(account) });
    const deleteAccount = jest.spyOn(Account, "deleteOne").mockResolvedValue({ deletedCount: 1 });
    jest.spyOn(Profile, "deleteOne").mockResolvedValue({ deletedCount: 1 });
    const session = { deleteAccountCsrf: "csrf" };
    const state = newDeleteAccountOAuthRequest(session, account, "discord");
    confirmAccountDeletion(session, takeDeleteAccountOAuthRequest(session, account, "discord", state));

    expect(await submit(session, {})).toMatchObject({ statusCode: 403 });
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(await submit(session, { csrfToken: "csrf" })).toMatchObject({ statusCode: 200, loggedOut: true });
    expect(session.deleteAccountConfirmation).toBeUndefined();
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });
});
