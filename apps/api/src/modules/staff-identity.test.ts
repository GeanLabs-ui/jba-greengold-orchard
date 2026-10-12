import { describe, expect, it } from "vitest";
import { generateEmployeeCode } from "./staff-identity.js";

describe("staff identity", () => {
  it("builds an employee code from the joining date and time", () => {
    expect(generateEmployeeCode("2026-08-13T14:05:09.000Z", "abcd-1234"))
      .toBe("JBA-20260813-140509-ABCD");
  });

  it("generates distinct codes for staff joining at the same time", () => {
    const joiningAt = "2026-08-13T14:05:09.000Z";
    expect(generateEmployeeCode(joiningAt, "1111-one"))
      .not.toBe(generateEmployeeCode(joiningAt, "2222-two"));
  });
});
