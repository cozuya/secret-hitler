import { accounts } from "../../../routes/accounts";
import Account from "../../../models/account";
import { setVerify } from "../../../routes/verification";

jest.mock("../../../routes/verification", () => ({ verifyRoutes: jest.fn(), setVerify: jest.fn() }));

describe("accounts", () => {
  it("is a function", () => {
    expect(typeof accounts).toBe("function");
  });
});

describe("password reset requests", () => {
  let requestReset;

  beforeAll(() => {
    const originalApp = global.app;
    global.app = {
      get: jest.fn(),
      post(path, handler) {
        if (path === "/account/reset-password") requestReset = handler;
      },
    };
    try {
      accounts([]);
    } finally {
      global.app = originalApp;
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setVerify.mockClear();
  });

  test.each([true, false])("only sends a reset link for a verified account, verified=%s", async (verified) => {
    const email = "fixture@example.test";
    const account = { username: "fixture", verified, verification: { email } };
    const findAccount = jest.spyOn(Account, "findOne").mockImplementation((query) => {
      return Promise.resolve(query.verified === account.verified ? account : null);
    });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await requestReset({ body: { email } }, res, jest.fn());

    expect(findAccount).toHaveBeenCalledWith({ "verification.email": email, verified: true });
    if (verified) {
      expect(setVerify).toHaveBeenCalledWith({ username: account.username, email, res, isResetPassword: true });
    } else {
      expect(res.status).toHaveBeenCalledWith(404);
      expect(setVerify).not.toHaveBeenCalled();
    }
  });
});
