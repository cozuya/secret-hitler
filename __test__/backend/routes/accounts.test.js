import { accounts, vpnDetectionResult } from "../../../routes/accounts";

describe("accounts", () => {
  it("is a function", () => {
    expect(typeof accounts).toBe("function");
  });
});

describe("vpnDetectionResult", () => {
  it("scores a VPN or a Tor exit 1 and anything else 0", () => {
    expect(vpnDetectionResult({ is_vpn: true, is_tor: false })).toEqual({ result: 1 });
    expect(vpnDetectionResult({ is_vpn: false, is_tor: true })).toEqual({ result: 1 });
    expect(vpnDetectionResult({ is_vpn: false, is_tor: false })).toEqual({ result: 0 });
  });

  it("returns -1 with the message on an error", () => {
    expect(vpnDetectionResult({ error: "not a valid IP address" })).toEqual({
      result: -1,
      message: "not a valid IP address",
    });
  });
});
