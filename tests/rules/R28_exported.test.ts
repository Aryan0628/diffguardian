import { describe, it, expect } from "vitest";
import { exportedRule } from "../../src/classifier/rules/R28_exported";

describe("R28 - Exported Rule", () => {
  const baseSig = {
    name: "foo",
    line: 1,
    params: [],
    returnType: "void",
    exported: false,
    isDefaultExport: false,
    async: false,
  };

  it("returns a warning when a function becomes exported", () => {
    const oldSig = baseSig;

    const newSig = {
      ...baseSig,
      exported: true,
    };

    const result = exportedRule.check(oldSig, newSig);

    expect(result).toEqual({
      severity: "warning",
      changeType: "visibility_changed",
      message:
        "Warning: Function is now exported. This expands the public API surface area and introduces a new backward-compatibility contract.",
    });
  });

  it("returns null when the function was already exported", () => {
    const oldSig = {
      ...baseSig,
      exported: true,
    };

    const newSig = {
      ...baseSig,
      exported: true,
    };

    expect(exportedRule.check(oldSig, newSig)).toBeNull();
  });

  it("returns null when the function remains internal", () => {
    expect(exportedRule.check(baseSig, baseSig)).toBeNull();
  });
});