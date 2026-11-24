import { verifyRoutes, setVerify } from "../../../routes/verification";
import Account from "../../../models/account";
import ResetPassword from "../../../models/resetPassword";
import VerifyAccount from "../../../models/verifyAccount";

describe("verifyRoutes", () => {
  it("is a function", () => {
    expect(typeof verifyRoutes).toBe("function");
  });
});

describe("setVerify", () => {
  it("is a function", () => {
    expect(typeof setVerify).toBe("function");
  });
});

describe("password reset links", () => {
  const OriginalDate = Date;
  const startupTime = OriginalDate.parse("2026-01-01T12:00:00Z");
  const requestTime = OriginalDate.parse("2026-01-03T12:00:00Z");
  const params = { username: "fixture", token: "test-token" };
  const body = { username: params.username, tok: params.token, password: "new-password", password2: "new-password" };
  let getReset;
  let submitReset;

  beforeEach(() => {
    const date = jest.spyOn(global, "Date").mockImplementation(() => new OriginalDate(startupTime));
    jest.spyOn(VerifyAccount, "deleteMany").mockImplementation(() => {});
    jest.spyOn(ResetPassword, "deleteMany").mockImplementation(() => {});
    const originalApp = global.app;
    global.app = {
      get(path, handler) {
        if (path === "/password-reset/:username/:token") getReset = handler;
      },
      post(path, handler) {
        if (path === "/password-reset") submitReset = handler;
      },
    };
    try {
      verifyRoutes();
    } finally {
      global.app = originalApp;
    }
    date.mockImplementation(() => new OriginalDate(requestTime));
  });

  afterEach(() => jest.restoreAllMocks());

  test("checks the page link at the time it is opened", async () => {
    const findReset = jest.spyOn(ResetPassword, "findOne").mockResolvedValue(params);
    const res = { render: jest.fn() };
    await getReset({ params }, res, jest.fn());

    expect(findReset).toHaveBeenCalledWith({ ...params, expirationDate: { $gt: new OriginalDate(requestTime) } });
    expect(res.render).toHaveBeenCalledWith("page-resetpassword", {});
  });

  test("checks expiry again when consuming a link and reloads the verified account", async () => {
    const consumeReset = jest.spyOn(ResetPassword, "findOneAndDelete").mockResolvedValue(params);
    const account = { username: params.username, verified: true, setLocalPassword: jest.fn().mockResolvedValue() };
    const findAccount = jest.spyOn(Account, "findOne").mockResolvedValue(account);
    const req = { body, logIn: jest.fn((_account, done) => done()) };
    const res = { send: jest.fn() };

    await submitReset(req, res, jest.fn());

    expect(consumeReset).toHaveBeenCalledWith({ ...params, expirationDate: { $gt: new OriginalDate(requestTime) } });
    expect(findAccount).toHaveBeenCalledWith({ username: params.username, verified: true });
    expect(account.setLocalPassword).toHaveBeenCalledWith(body.password);
    expect(req.logIn).toHaveBeenCalledWith(account, expect.any(Function));
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  test("refuses a submitted link when the account is no longer verified", async () => {
    jest.spyOn(ResetPassword, "findOneAndDelete").mockResolvedValue(params);
    jest.spyOn(Account, "findOne").mockResolvedValue(null);
    const req = { body, logIn: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await submitReset(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(req.logIn).not.toHaveBeenCalled();
  });
});
