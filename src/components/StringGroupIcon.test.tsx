import { describe, it, expect } from "vitest";
import { describeStringGroup } from "./stringGroups";

describe("describeStringGroup", () => {
  it("names the high E side", () => {
    expect(describeStringGroup([1, 2, 3])).toBe("Strings 1-2-3 (high E side)");
  });

  it("names the low E side", () => {
    expect(describeStringGroup([4, 5, 6])).toBe("Strings 4-5-6 (low E side)");
  });

  it("names middle strings", () => {
    expect(describeStringGroup([2, 3, 4])).toBe("Strings 2-3-4 (middle strings)");
  });

  it("names skipped strings", () => {
    expect(describeStringGroup([6, 4, 3, 2])).toBe("Strings 6-4-3-2 (skips string 5)");
    expect(describeStringGroup([6, 5, 3, 2])).toBe("Strings 6-5-3-2 (skips string 4)");
  });
});
