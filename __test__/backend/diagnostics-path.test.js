import path from "path";
import fs from "fs";
import isPublicDiagnosticsDir from "../../bin/diagnostics-path";

describe("diagnostics path privacy", () => {
  const root = path.resolve("public-test-root");
  const hiddenMount = path.join(root, ".mount", "cardbacks");
  const roots = [root, hiddenMount];

  it("rejects the served root and visible descendants", () => {
    expect(isPublicDiagnosticsDir(root, roots)).toBe(true);
    expect(isPublicDiagnosticsDir(path.join(root, "diagnostics"), roots)).toBe(true);
    expect(isPublicDiagnosticsDir(path.join(root, ".private", "..", "diagnostics"), roots)).toBe(true);
  });

  it("accepts a dot-prefixed component inside the mount or a directory outside it", () => {
    expect(isPublicDiagnosticsDir(path.join(root, ".diagnostics", "heap"), roots)).toBe(false);
    expect(isPublicDiagnosticsDir(path.join(hiddenMount, ".diagnostics"), roots)).toBe(false);
    expect(isPublicDiagnosticsDir(root + "-sibling", roots)).toBe(false);
    expect(isPublicDiagnosticsDir(path.dirname(root), roots)).toBe(false);
  });

  it("does not rely on hidden components outside the cardback mount", () => {
    expect(isPublicDiagnosticsDir(hiddenMount, roots)).toBe(true);
    expect(isPublicDiagnosticsDir(path.join(hiddenMount, "diagnostics"), roots)).toBe(true);
  });
});

describe("diagnostics directory selection", () => {
  it("skips an unsafe override and writes to the protected fallback", () => {
    const previousCardbacks = process.env.CARDBACK_DIR;
    const previousDiagnostics = process.env.DIAGNOSTICS_DIR;
    const root = path.resolve("cardbacks-test-root");
    process.env.CARDBACK_DIR = root;
    process.env.DIAGNOSTICS_DIR = path.join(root, "visible-diagnostics");
    const mkdir = jest.spyOn(fs, "mkdirSync").mockImplementation(() => {});
    const append = jest.spyOn(fs, "appendFileSync").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      jest.isolateModules(() => {
        const diagnostics = require("../../bin/diagnostics");
        diagnostics.logCrash("test", new Error("test"));
        expect(diagnostics.baseDir).toBe(path.join(root, ".diagnostics"));
        expect(mkdir).not.toHaveBeenCalledWith(process.env.DIAGNOSTICS_DIR, expect.anything());
        expect(mkdir).toHaveBeenCalledWith(path.join(root, ".diagnostics"), { recursive: true });
        expect(append).toHaveBeenCalledWith(path.join(root, ".diagnostics", "crashes.log"), expect.any(String));
      });
    } finally {
      if (previousCardbacks === undefined) delete process.env.CARDBACK_DIR;
      else process.env.CARDBACK_DIR = previousCardbacks;
      if (previousDiagnostics === undefined) delete process.env.DIAGNOSTICS_DIR;
      else process.env.DIAGNOSTICS_DIR = previousDiagnostics;
      jest.restoreAllMocks();
    }
  });
});
