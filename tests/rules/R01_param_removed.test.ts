import { describe, it, expect } from "vitest";
import { parameterRemovedRule } from "../../src/classifier/rules/R01_param_removed";

describe("R01 - Parameter Removed", () => {
  const baseSig = {
    name: "foo",
    line: 1,
    params: [
      {
        name: "id",
        type: "string",
        optional: false,
        hasDefault: false,
      },
    ],
    returnType: "void",
    exported: true,
    isDefaultExport: false,
    async: false,
  };

  it("flags when a parameter is removed", () => {
    const oldSig = baseSig;

    const newSig = {
      ...baseSig,
      params: [],
    };

    const result = parameterRemovedRule.check(oldSig, newSig);

    
    expect(result).toEqual({
  severity: "breaking",
  changeType: "signature_change",
  message:
    "Parameter 'id' was removed. Callers providing this argument will fail.",
});
  });

  it("returns null when parameters are unchanged", () => {
    const result = parameterRemovedRule.check(baseSig, baseSig);

    expect(result).toBeNull();
  });
});